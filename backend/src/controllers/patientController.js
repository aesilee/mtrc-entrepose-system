import pool from "../config/db.js";
import { notifyIctAdmins, notifyRoles, notifyUser } from "../utils/notify.js";
import { ensureAttendanceCompletionSchema } from "../utils/attendanceSchema.js";
import { ensureCbteAndRiskSchema } from "../utils/cbteAndRiskSchema.js";
import { getBulkUnifiedPatientProgress } from "../utils/curriculumProgress.js";
import { getAttendanceRates } from "../utils/attendanceRate.js";
import {
  ensureProgramDurationSchema,
  evaluatePatientDuration,
  calculateExpectedCompletionDate,
  toDateOnlyString,
} from "../utils/programDuration.js";
import {
  ensureHistoricalReportSchema,
  recordCaseManagerAssignment,
  recordPatientStatusChange,
} from "../utils/historicalReportSchema.js";
import { isCompleterOutcome } from "../utils/classification.js";

function cleanText(value) {
  return typeof value === "string" ? value.trim() : value;
}

function validPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function ageFromBirthdate(birthdate) {
  const [year, month, day] = String(birthdate || "").split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() + 1 !== month
    || parsed.getUTCDate() !== day
  ) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  const birthdayHasPassed = today.getMonth() + 1 > month
    || (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!birthdayHasPassed) age -= 1;
  return age;
}

// Official 3-letter LGU codes for Albay/Bicol municipalities
const LGU_CODE_MAP = {
  "legazpi":       "LEG",
  "legazpi city":  "LEG",
  "tabaco":        "TAB",
  "tabaco city":   "TAB",
  "ligao":         "LIG",
  "ligao city":    "LIG",
  "daraga":        "DAR",
  "malinao":       "MAL",
  "guinobatan":    "GUI",
  "polangui":      "POL",
  "tiwi":          "TIW",
  "camalig":       "CAM",
  "oas":           "OAS",
  "bacacay":       "BAC",
  "santo domingo": "STO",
  "casiguran":     "CAS",
};

export function getLguCode(municipality) {
  if (!municipality) return "OTH";
  const key = String(municipality).trim().toLowerCase();
  return LGU_CODE_MAP[key] || "OTH";
}

export async function generatePatientCode(connection = pool) {
  const year = new Date().getFullYear();
  const prefix = `MTRC-${year}-`;
  const [rows] = await connection.query(
    `SELECT patient_code FROM patients WHERE patient_code LIKE ?`,
    [`${prefix}%`]
  );
  let maxSeq = 0;
  for (const row of rows) {
    const parts = (row.patient_code || "").split("-");
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }

  let candidateSeq = maxSeq + 1;
  while (true) {
    const candidateCode = `${prefix}${String(candidateSeq).padStart(4, "0")}`;
    const [[existing]] = await connection.query(
      `SELECT id FROM patients WHERE patient_code = ? LIMIT 1`,
      [candidateCode]
    );
    if (!existing) return candidateCode;
    candidateSeq++;
  }
}

export async function generatePwudCode(municipality, connection = pool) {
  const lguCode = getLguCode(municipality);
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `OP-${lguCode}-${year}-`;
  const [rows] = await connection.query(
    `SELECT pwud_code FROM patients WHERE pwud_code LIKE ?`,
    [`${prefix}%`]
  );
  let maxSeq = 0;
  for (const row of rows) {
    const parts = (row.pwud_code || "").split("-");
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }

  let candidateSeq = maxSeq + 1;
  while (true) {
    const candidateCode = `${prefix}${String(candidateSeq).padStart(3, "0")}`;
    const [[existing]] = await connection.query(
      `SELECT id FROM patients WHERE pwud_code = ? LIMIT 1`,
      [candidateCode]
    );
    if (!existing) return candidateCode;
    candidateSeq++;
  }
}

export async function listPatients(req, res) {
  await ensureAttendanceCompletionSchema();
  await ensureProgramDurationSchema();
  const clauses = ["p.is_archived = FALSE"];
  const params = [];

  const status = cleanText(req.query.status);
  const forAttendance = req.query.forAttendance === "true" || req.query.scope === "attendance";

  // Attendance roster must only include currently active, non-discharged clients
  if (forAttendance) {
    clauses.push("p.enrollment_status = 'active'");
    clauses.push("NOT EXISTS (SELECT 1 FROM discharges d WHERE d.patient_id = p.id)");
  } else if (status === "active") {
    // Only exclude discharged patients when specifically filtering for active clients
    clauses.push("p.enrollment_status = 'active'");
    clauses.push("NOT EXISTS (SELECT 1 FROM discharges d WHERE d.patient_id = p.id)");
  } else if (status === "completed") {
    clauses.push("(p.enrollment_status = 'completed' OR EXISTS (SELECT 1 FROM discharges d WHERE d.patient_id = p.id AND (d.outcome = 'COMPLETER' OR (d.outcome IS NULL AND d.discharge_type NOT LIKE '%Non%' AND d.discharge_type NOT LIKE '%non_%' AND d.discharge_type REGEXP 'complete|graduat'))))");
  } else if (status === "dropped") {
    clauses.push("(p.enrollment_status = 'dropped' OR EXISTS (SELECT 1 FROM discharges d WHERE d.patient_id = p.id AND (d.outcome = 'NON_COMPLETER' OR (d.outcome IS NULL AND (d.discharge_type LIKE '%Non%' OR d.discharge_type LIKE '%non_%' OR d.discharge_type NOT REGEXP 'complete|graduat')))))");
  } else if (status) {
    clauses.push("p.enrollment_status = ?");
    params.push(status);
  }

  // Case Manager scoping:
  // For group attendance, any facilitator can take attendance for all active outpatients.
  // For regular patient list, show assigned patients plus unassigned patients needing attention.
  const caseManagerId = req.query.caseManagerId;
  if (caseManagerId) {
    clauses.push("p.assigned_case_manager_id = ?");
    params.push(caseManagerId);
  } else if (req.user.role === "case_manager" && !forAttendance && req.query.showAll !== "true") {
    clauses.push("(p.assigned_case_manager_id = ? OR p.assigned_case_manager_id IS NULL)");
    params.push(req.user.id);
  }

  // Parse pagination params (attendance rosters can load full active cohort up to 500)
  const maxLimit = forAttendance ? 500 : 100;
  const defaultLimit = forAttendance ? 300 : 10;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, Math.min(maxLimit, parseInt(req.query.limit, 10) || defaultLimit));
  const offset = (page - 1) * limit;

  // Search filter
  const search = cleanText(req.query.search);
  if (search) {
    clauses.push("(p.full_name LIKE ? OR p.patient_code LIKE ? OR p.pwud_code LIKE ?)");
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern);
  }

  // Gender filter
  const gender = cleanText(req.query.gender);
  if (gender) {
    clauses.push("p.gender = ?");
    params.push(gender);
  }

  // Municipality filter
  const municipality = cleanText(req.query.municipality);
  if (municipality) {
    clauses.push("p.municipality = ?");
    params.push(municipality);
  }

  // Admission Date range
  const dateFrom = cleanText(req.query.dateFrom);
  if (dateFrom) {
    clauses.push("p.admission_date >= ?");
    params.push(dateFrom);
  }
  const dateTo = cleanText(req.query.dateTo);
  if (dateTo) {
    clauses.push("p.admission_date <= ?");
    params.push(dateTo);
  }

  // Clinical Flag filter (uses unified 28 CBT + 3 CBT-E + 12 PE = 43 Core AND patient-specific duration requirement for pdc_ready)
  const flag = cleanText(req.query.flag);
  if (flag === "pdc_ready" || flag === "any") {
    const [candRows] = await pool.query(
      `SELECT p.id, p.admission_date, p.rehab_start_date, p.required_duration_months,
              p.duration_basis, p.extension_months, p.expected_completion_date,
              (SELECT pm.date_pdc FROM patient_milestones pm WHERE pm.patient_id = p.id LIMIT 1) AS date_pdc
       FROM patients p
       LEFT JOIN patient_referrals r ON r.patient_id = p.id
       WHERE ${clauses.join(" AND ")}`,
      params
    );
    const candIds = candRows.filter((r) => !r.date_pdc).map((r) => r.id);
    const candProgMap = await getBulkUnifiedPatientProgress(pool, candIds);
    const candRowMap = new Map(candRows.map((r) => [Number(r.id), r]));
    const pdcReadyIds = candIds.filter((pid) => {
      const prog = candProgMap.get(Number(pid));
      const dur = evaluatePatientDuration(candRowMap.get(Number(pid)));
      return Boolean(prog?.isCoreComplete && dur?.isDurationMet);
    });

    if (flag === "pdc_ready") {
      if (pdcReadyIds.length > 0) {
        clauses.push(`p.id IN (${pdcReadyIds.map(() => "?").join(",")})`);
        params.push(...pdcReadyIds);
      } else {
        clauses.push("1 = 0");
      }
    } else if (flag === "any") {
      const pdcSubClause =
        pdcReadyIds.length > 0
          ? `p.id IN (${pdcReadyIds.map(() => "?").join(",")})`
          : "1 = 0";
      if (pdcReadyIds.length > 0) {
        params.push(...pdcReadyIds);
      }
      clauses.push(`(
        (${pdcSubClause})
        OR EXISTS (
          SELECT 1 FROM drug_test_logs dt
          WHERE dt.patient_id = p.id AND dt.result = 'POSITIVE' AND dt.test_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        )
        OR EXISTS (
          SELECT 1 FROM (
            SELECT patient_id, status, ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY session_date DESC, id DESC) as rn
            FROM attendance
            WHERE status != 'cancelled'
          ) sub
          WHERE sub.patient_id = p.id AND sub.rn <= 2
          GROUP BY sub.patient_id
          HAVING COUNT(*) = 2 AND SUM(sub.status = 'absent') = 2
        )
      )`);
    }
  } else if (flag === "positive_rdt") {
    clauses.push(`EXISTS (
      SELECT 1 FROM drug_test_logs dt
      WHERE dt.patient_id = p.id AND dt.result = 'POSITIVE' AND dt.test_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    )`);
  } else if (flag === "at_risk_absent") {
    clauses.push(`EXISTS (
      SELECT 1 FROM (
        SELECT patient_id, status, ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY session_date DESC, id DESC) as rn
        FROM attendance
        WHERE status != 'cancelled'
      ) sub
      WHERE sub.patient_id = p.id AND sub.rn <= 2
      GROUP BY sub.patient_id
      HAVING COUNT(*) = 2 AND SUM(sub.status = 'absent') = 2
    )`);
  }

  // Count total matching records
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total
     FROM patients p
     LEFT JOIN patient_referrals r ON r.patient_id = p.id
     WHERE ${clauses.join(" AND ")}`,
    params
  );

  // If requested for attendance modal, return lightweight roster without heavy photos and subqueries
  if (forAttendance) {
    const [chairCol] = await pool.query("SHOW COLUMNS FROM attendance LIKE 'is_chairperson'");
    const chairSql = chairCol.length > 0
      ? "(SELECT COUNT(*) FROM attendance a WHERE a.patient_id = p.id AND a.session_type = 'SHGM' AND a.is_chairperson = 1 AND a.status = 'present') AS shgm_chaired_count"
      : "0 AS shgm_chaired_count";

    const [attendanceRows] = await pool.query(
      `SELECT p.id, p.patient_code, p.pwud_code, p.full_name,
              p.assigned_case_manager_id AS case_manager_id,
              u.full_name AS case_manager_name,
              ${chairSql}
       FROM patients p
       LEFT JOIN users u ON u.id = p.assigned_case_manager_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY p.full_name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      patients: attendanceRows,
      pagination: { total, page: 1, limit, totalPages: 1 }
    });
  }

  const [chairCol] = await pool.query("SHOW COLUMNS FROM attendance LIKE 'is_chairperson'");
  const chairSql = chairCol.length > 0
    ? "(SELECT COUNT(*) FROM attendance a WHERE a.patient_id = p.id AND a.session_type = 'SHGM' AND a.is_chairperson = 1 AND a.status = 'present') AS shgm_chaired_count,"
    : "0 AS shgm_chaired_count,";

  const [rows] = await pool.query(
    `SELECT p.id, p.patient_code, p.pwud_code, p.full_name, p.photo_url, p.gender, p.municipality,
            p.admission_date, p.rehab_start_date, p.required_duration_months, p.duration_basis,
            p.duration_basis_detail, p.extension_months, p.expected_completion_date,
            p.enrollment_status, p.is_archived,
            p.assigned_case_manager_id AS case_manager_id,
            u.full_name AS case_manager_name,
            r.status AS referral_status,
            r.referral_priority,
            r.type_of_patient,
            p.admission_type,
            d.discharge_type,
            d.discharge_date,
            ${chairSql}
            (SELECT COUNT(*) FROM attendance a WHERE a.patient_id = p.id AND a.status != 'cancelled') AS total_sessions,
            (SELECT COUNT(*) FROM attendance a WHERE a.patient_id = p.id AND a.status IN ('present', 'late')) AS present_sessions,
            (SELECT COUNT(*) FROM attendance a WHERE a.patient_id = p.id AND a.status IN ('present', 'late') AND COALESCE(a.completion_status, CASE WHEN a.status = 'present' THEN 'CREDITED' ELSE 'NOT_CREDITED' END) = 'CREDITED' AND COALESCE(a.is_duplicate_topic, 0) = 0) AS credited_sessions,
            (SELECT COUNT(*) FROM attendance a WHERE a.patient_id = p.id AND a.status IN ('present', 'late') AND COALESCE(a.completion_status, CASE WHEN a.status = 'present' THEN 'CREDITED' ELSE 'NOT_CREDITED' END) = 'CREDITED' AND COALESCE(a.is_duplicate_topic, 0) = 0 AND a.session_type IN ('CBT_GROUP', 'PSYCHO_EDUCATION')) AS core_sessions,
            (SELECT COUNT(*) FROM attendance a WHERE a.patient_id = p.id AND a.completion_status = 'PENDING_REVIEW') AS pending_review_sessions,
            (SELECT COUNT(*) FROM drug_test_logs dt WHERE dt.patient_id = p.id AND dt.result = 'POSITIVE' AND dt.test_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS recent_positive_rdt,
            (SELECT pm.date_pdc FROM patient_milestones pm WHERE pm.patient_id = p.id LIMIT 1) AS date_pdc
     FROM patients p
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     LEFT JOIN patient_referrals r ON r.patient_id = p.id
     LEFT JOIN discharges d ON d.id = (
       SELECT d2.id FROM discharges d2 WHERE d2.patient_id = p.id ORDER BY d2.discharge_date DESC, d2.id DESC LIMIT 1
     )
     WHERE ${clauses.join(" AND ")}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  let recentAbsencesMap = {};
  let progressMap = new Map();
  let attendanceRateMap = new Map();
  if (rows.length > 0) {
    const patientIds = rows.map((r) => r.id);
    progressMap = await getBulkUnifiedPatientProgress(pool, patientIds);
    attendanceRateMap = await getAttendanceRates(pool, patientIds);
    const [recentAtt] = await pool.query(
      `SELECT patient_id, status FROM (
         SELECT patient_id, status,
                ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY session_date DESC, id DESC) as rn
         FROM attendance
         WHERE patient_id IN (?) AND status != 'cancelled'
       ) sub WHERE rn <= 2`,
      [patientIds]
    );
    const byPatient = {};
    for (const row of recentAtt) {
      if (!byPatient[row.patient_id]) byPatient[row.patient_id] = [];
      byPatient[row.patient_id].push(row.status);
    }
    for (const pid of patientIds) {
      const statuses = byPatient[pid] || [];
      if (statuses.length === 2 && statuses[0] === "absent" && statuses[1] === "absent") {
        recentAbsencesMap[pid] = true;
      }
    }
  }

  const patients = rows.map((p) => {
    const prog = progressMap.get(Number(p.id));
    const dur = evaluatePatientDuration(p);
    const coreCompleted = prog ? prog.attendedCore : Number(p.core_sessions || 0);
    const cbtCompleted = prog ? prog.cbtGroup : 0;
    const cbteCompleted = prog ? prog.cbteCompleted : 0;
    const peCompleted = prog ? prog.psychoEd : 0;
    const isCoreComplete = prog ? prog.isCoreComplete : false;
    const isDurationMet = dur ? dur.isDurationMet : true;

    const flags = [];
    if (isCoreComplete && isDurationMet && !p.date_pdc) {
      flags.push({
        key: "pdc_ready",
        label: `Ready for PDC (43/43 · ${dur?.totalRequiredMonths || 7}m)`,
        type: "blue",
        title: `Completed all 43 core requirements (CBT ${cbtCompleted}/28, CBT-E ${cbteCompleted}/3, PE ${peCompleted}/12) and met the mandated ${dur?.totalRequiredMonths || 7}-month program duration. Ready for Pre-Discharge Conference.`,
      });
    } else if (isCoreComplete && !isDurationMet && !p.date_pdc) {
      flags.push({
        key: "duration_pending",
        label: `Core 43/43 · Duration ${dur.monthsElapsed}/${dur.totalRequiredMonths}m`,
        type: "amber",
        title: `Completed all 43 core requirements, but mandated program duration (${dur.totalRequiredMonths} mos — ${dur.durationBasisLabel}) is not yet met (${dur.monthsElapsed}/${dur.totalRequiredMonths} mos elapsed; expected ${dur.expectedCompletionDate || "—"}).`,
      });
    } else if (!isCoreComplete && prog?.tallies?.totalPhysicalAttended >= 43 && !p.date_pdc) {
      flags.push({
        key: "incomplete_core",
        label: `Core: ${coreCompleted}/43`,
        type: "amber",
        title: `Attended ${prog.tallies.totalPhysicalAttended} activities, but core curriculum is incomplete (CBT ${cbtCompleted}/28, CBT-E ${cbteCompleted}/3, PE ${peCompleted}/12).`,
      });
    }
    if (recentAbsencesMap[p.id]) {
      flags.push({
        key: "at_risk_absent",
        label: "At Risk: 2 Absences",
        type: "amber",
        title: "Patient missed the last 2 consecutive scheduled sessions. Follow-up required.",
      });
    }
    if (p.recent_positive_rdt > 0) {
      flags.push({
        key: "positive_rdt",
        label: "Positive RDT",
        type: "red",
        title: "Tested positive on random drug test in the past 30 days. Case conference required.",
      });
    }

    const isCompleted = p.discharge_type ? isCompleterOutcome(p.discharge_outcome || p.discharge_type, p.discharge_remarks) : false;
    let resolvedStatus = p.enrollment_status;
    if (p.discharge_date) {
      if (resolvedStatus === "active" || !resolvedStatus) {
        resolvedStatus = isCompleted ? "completed" : "dropped";
      }
    }

    return {
      ...p,
      core_sessions: coreCompleted,
      cbt_completed: cbtCompleted,
      cbte_completed: cbteCompleted,
      pe_completed: peCompleted,
      is_core_complete: isCoreComplete,
      is_duration_met: isDurationMet,
      duration_summary: dur,
      enrollment_status: resolvedStatus,
      discharge_type: p.discharge_type || null,
      discharge_date: p.discharge_date || null,
      attendance_rate: attendanceRateMap.get(p.id)?.rate ?? null,
      flags,
    };
  });

  const [muniRows] = await pool.query(
    "SELECT DISTINCT municipality FROM patients WHERE municipality IS NOT NULL AND municipality != '' ORDER BY municipality"
  );
  const municipalities = muniRows.map((m) => m.municipality);

  res.json({
    patients,
    municipalities,
    pagination: {
      total: Number(total),
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

export async function updatePatient(req, res) {
  await ensureProgramDurationSchema();
  const { id } = req.params;
  const fields = req.body;

  if (fields.livingArrangement !== undefined
      && !new Set(["", "With Parents", "With Relatives", "Boarding House", "Living Alone"]).has(cleanText(fields.livingArrangement) || "")) {
    return res.status(400).json({ message: "Select a valid living arrangement." });
  }

  if (fields.estimatedFamilyMonthlyIncome !== undefined && fields.estimatedFamilyMonthlyIncome !== "") {
    const income = Number(fields.estimatedFamilyMonthlyIncome);
    if (!Number.isFinite(income) || income < 0) {
      return res.status(400).json({ message: "Estimated family monthly income must be zero or greater." });
    }
  }

  if (fields.emergencyContactMethod !== undefined && (cleanText(fields.emergencyContactMethod) || "").length > 30) {
    return res.status(400).json({ message: "Preferred contact method must be 30 characters or fewer." });
  }

  const emergencyContactEmail = cleanText(fields.emergencyContactEmail) || "";
  if (emergencyContactEmail.length > 255) {
    return res.status(400).json({ message: "Emergency contact email must be 255 characters or fewer." });
  }
  if (emergencyContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emergencyContactEmail)) {
    return res.status(400).json({ message: "Enter a valid emergency contact email address." });
  }
  if (fields.emergencyContactMethod === "email" && !emergencyContactEmail) {
    return res.status(400).json({ message: "Emergency contact email is required when Email is the preferred contact method." });
  }

  if (
    fields.requiredDurationMonths !== undefined ||
    fields.durationBasis !== undefined ||
    fields.durationBasisDetail !== undefined ||
    fields.extensionMonths !== undefined
  ) {
    return res.status(400).json({
      message:
        "Program duration and extension changes cannot be modified from the general patient profile. Use the formal Duration Change workflow with documented reason and approval.",
    });
  }

  const columnMap = {
    firstName: "first_name", middleName: "middle_name", lastName: "last_name", suffix: "suffix",
    preferredName: "preferred_name",
    gender: "gender", birthdate: "birthdate", civilStatus: "civil_status",
    nationality: "nationality", occupation: "occupation", educationalAttainment: "educational_attainment",
    religion: "religion", livingArrangement: "living_arrangement",
    estimatedFamilyMonthlyIncome: "estimated_family_monthly_income",
    employmentStatus: "employment_status",
    numberOfSiblings: "number_of_siblings",
    ordinalPosition: "ordinal_position",
    fatherName: "father_name",
    fatherOccupation: "father_occupation",
    motherName: "mother_name",
    motherOccupation: "mother_occupation",
    spouseName: "spouse_name",
    spouseOccupation: "spouse_occupation",
    contactNumber: "contact_number", email: "email", address: "address",
    region: "region", province: "province", municipality: "municipality",
    barangay: "barangay", streetAddress: "street_address", postalCode: "postal_code",
    photoDataUrl: "photo_url",
    emergencyContactName: "emergency_contact_name",
    emergencyContactRelationship: "emergency_contact_relationship",
    emergencyContactNumber: "emergency_contact_number",
    emergencyContactEmail: "emergency_contact_email",
    emergencyContactAddress: "emergency_contact_address",
    emergencyContactMethod: "emergency_contact_method",
    guardianName: "guardian_name", guardianRelationship: "guardian_relationship",
    guardianContactNumber: "guardian_contact_number", guardianAddress: "guardian_address",
    admissionDate: "admission_date", rehabStartDate: "rehab_start_date",
    referralSource: "referral_source",
    admissionType: "admission_type", programId: "program_id",
    assignedCaseManagerId: "assigned_case_manager_id", admissionNotes: "admission_notes",
    initialAssessment: "initial_assessment",
    enrollmentStatus: "enrollment_status",
    currentStatus: "current_status", programPhase: "program_phase",
    caseType: "case_type",
    attendingPhysician: "attending_physician",
    opdNumber: "opd_number",
  };

  // Single consolidated pre-fetch query to check current patient state
  const [[current]] = await pool.query(
    `SELECT first_name, middle_name, last_name, suffix, full_name,
            enrollment_status, admission_date, rehab_start_date,
            required_duration_months, duration_basis, duration_basis_detail,
            extension_months, expected_completion_date,
            assigned_case_manager_id
     FROM patients WHERE id = ?`,
    [id]
  );

  // If agreed start date or admission date changed, consistently recalculate expectedCompletionDate based on existing duration
  const nextStart =
    fields.rehabStartDate !== undefined && fields.rehabStartDate !== ""
      ? fields.rehabStartDate
      : toDateOnlyString(current?.rehab_start_date) ||
        (fields.admissionDate !== undefined && fields.admissionDate !== ""
          ? fields.admissionDate
          : toDateOnlyString(current?.admission_date));
  const currentReqMonths = Number(current?.required_duration_months) || 7;
  const currentExtMonths = Number(current?.extension_months) || 0;

  if (
    nextStart &&
    (fields.rehabStartDate !== undefined || fields.admissionDate !== undefined)
  ) {
    const computedExpected = calculateExpectedCompletionDate(nextStart, currentReqMonths + currentExtMonths);
    if (computedExpected) {
      fields.expectedCompletionDate = computedExpected;
    }
    if (!current?.rehab_start_date && fields.rehabStartDate === undefined) {
      fields.rehabStartDate = nextStart;
    }
  }

  const setClauses = [];
  const values = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (fields[key] !== undefined) {
      setClauses.push(`${column} = ?`);
      values.push(fields[key] === "" ? null : fields[key]);
    }
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ message: "No fields to update." });
  }

  if (["firstName", "middleName", "lastName", "suffix"].some((key) => fields[key] !== undefined)) {
    const fullName = [
      fields.firstName ?? current?.first_name,
      fields.middleName ?? current?.middle_name,
      fields.lastName ?? current?.last_name,
      fields.suffix ?? current?.suffix,
    ].map(cleanText).filter(Boolean).join(" ");
    setClauses.push("full_name = ?");
    values.push(fullName);
  }

  // Ensure active status and admission_date stay harmonized
  if (fields.enrollmentStatus === "active" && !fields.admissionDate && !current?.admission_date) {
    setClauses.push("admission_date = CURDATE()");
  } else if (fields.admissionDate && !fields.enrollmentStatus && current?.enrollment_status === "pending") {
    setClauses.push("enrollment_status = 'active'");
    setClauses.push("current_status = 'active'");
  }

  // Check for an enrollment status change
  let statusChangeMessage = null;
  if (fields.enrollmentStatus && current && current.enrollment_status !== fields.enrollmentStatus) {
    statusChangeMessage = `Changed enrollment status from "${current.enrollment_status}" to "${fields.enrollmentStatus}"`;
    if (fields.statusRemark) statusChangeMessage += ` — ${fields.statusRemark}`;
  }

  values.push(id);

  try {
    await pool.query(`UPDATE patients SET ${setClauses.join(", ")} WHERE id = ?`, values);

    // Duration changes must strictly be processed via recordPatientDurationChange (POST /api/patients/:id/duration-change).

    const [[updatedPatient]] = await pool.query("SELECT full_name FROM patients WHERE id = ?", [id]);
    const patientDisplayName = updatedPatient?.full_name || current?.full_name || `#${id}`;

    let auditLogged = false;

    // 1. Audit & Record Case Manager Reassignment with Effective Dates
    if (
      fields.assignedCaseManagerId !== undefined &&
      current &&
      Number(fields.assignedCaseManagerId || 0) !== Number(current.assigned_case_manager_id || 0)
    ) {
      let newCmName = "Unassigned";
      if (fields.assignedCaseManagerId) {
        const [[cmUser]] = await pool.query("SELECT full_name FROM users WHERE id = ?", [fields.assignedCaseManagerId]);
        if (cmUser) newCmName = cmUser.full_name;
      }
      await pool.query(
        "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patients', ?)",
        [req.user.username, `Reassigned Case Manager to "${newCmName}" for patient "${patientDisplayName}"`, id]
      );
      await recordCaseManagerAssignment(pool, {
        patientId: id,
        newCaseManagerId: fields.assignedCaseManagerId || null,
        reason: fields.reassignmentReason || `Reassigned to "${newCmName}" by ${req.user.username}`,
        assignedBy: req.user.id,
      });
      auditLogged = true;
    }

    // 2. Audit Admission Date Modification
    if (
      fields.admissionDate !== undefined &&
      current &&
      String(fields.admissionDate || "").slice(0, 10) !== String(current.admission_date ? new Date(current.admission_date).toISOString().slice(0, 10) : "")
    ) {
      await pool.query(
        "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patients', ?)",
        [req.user.username, `Updated admission date to "${fields.admissionDate || 'None'}" for patient "${patientDisplayName}"`, id]
      );
      auditLogged = true;
    }

    // 3. Audit Status Change or General Record Update
    if (statusChangeMessage) {
      await pool.query(
        "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patients', ?)",
        [req.user.username, `${statusChangeMessage} for patient "${patientDisplayName}"`, id]
      );
      if (fields.enrollmentStatus && fields.enrollmentStatus !== current.enrollment_status) {
        await recordPatientStatusChange(pool, {
          patientId: id,
          newStatus: fields.enrollmentStatus,
          reason: statusChangeMessage,
          changedBy: req.user.id,
        });
      }
      auditLogged = true;
    } else if (!auditLogged) {
      await pool.query(
        "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patients', ?)",
        [req.user.username, `Updated patient record for "${patientDisplayName}"`, id]
      );
    }
    await notifyRoles(["ict_admin", "him_staff", "admitting"], "patients", "patient_updated", `Patient record updated: "${updatedPatient?.full_name || `#${id}`}" — by ${req.user.username}`);

    // Notify newly assigned case manager on reassignment (with self-notification guard)
    if (
      fields.assignedCaseManagerId &&
      current &&
      Number(fields.assignedCaseManagerId) !== Number(current.assigned_case_manager_id) &&
      Number(fields.assignedCaseManagerId) !== Number(req.user.id)
    ) {
      await notifyUser(
        fields.assignedCaseManagerId,
        "patients",
        "patient_assigned",
        `Patient "${current.full_name}" has been assigned to you`
      );
    }

    res.json({ message: "Patient updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update the patient record." });
  }
}

async function verifyPatientAccess(patientId, user) {
  const [[patient]] = await pool.query("SELECT id, assigned_case_manager_id FROM patients WHERE id = ?", [patientId]);
  if (!patient) return { allowed: false, status: 404, message: "Patient not found." };
  if (user.role === "case_manager" && patient.assigned_case_manager_id && patient.assigned_case_manager_id !== user.id) {
    return { allowed: false, status: 403, message: "You do not have access to this patient." };
  }
  return { allowed: true, patient };
}

export async function getPatient(req, res) {
  const { id } = req.params;
  try {
    await ensureProgramDurationSchema();
    const [rows] = await pool.query(
      `SELECT p.*, u.full_name AS case_manager_name, pr.name AS program_name,
              d.discharge_type, d.discharge_date, d.remarks AS discharge_remarks, d.discharged_by
       FROM patients p
       LEFT JOIN users u ON u.id = p.assigned_case_manager_id
       LEFT JOIN programs pr ON pr.id = p.program_id
       LEFT JOIN discharges d ON d.id = (
         SELECT d2.id FROM discharges d2 WHERE d2.patient_id = p.id ORDER BY d2.discharge_date DESC, d2.id DESC LIMIT 1
       )
       WHERE p.id = ?`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: "Patient not found." });
    if (req.user.role === "case_manager" && rows[0].assigned_case_manager_id && rows[0].assigned_case_manager_id !== req.user.id) {
      return res.status(403).json({ message: "You do not have access to this patient." });
    }

    const patient = rows[0];
    if (patient.discharge_date && (patient.enrollment_status === "active" || !patient.enrollment_status)) {
      patient.enrollment_status = isCompleterOutcome(patient.discharge_outcome || patient.discharge_type || "", patient.discharge_remarks) ? "completed" : "dropped";
    }

    patient.duration_summary = evaluatePatientDuration(patient);
    const [durationHistory] = await pool
      .query(
        `SELECT * FROM patient_duration_history
         WHERE patient_id = ?
         ORDER BY created_at DESC, id DESC`,
        [id]
      )
      .catch(() => [[]]);
    patient.duration_history = durationHistory;

    res.json({ patient, durationHistory });
  } catch (err) {
    console.error("Error in getPatient:", err);
    res.status(500).json({ message: "Could not retrieve patient." });
  }
}

export async function getPatientDurationHistory(req, res) {
  const { id } = req.params;
  try {
    await ensureProgramDurationSchema();
    const access = await verifyPatientAccess(id, req.user);
    if (!access.allowed) return res.status(access.status).json({ message: access.message });

    const [[patient]] = await pool.query("SELECT * FROM patients WHERE id = ?", [id]);
    const [history] = await pool
      .query(
        `SELECT * FROM patient_duration_history
         WHERE patient_id = ?
         ORDER BY created_at DESC, id DESC`,
        [id]
      )
      .catch(() => [[]]);

    res.json({
      durationSummary: evaluatePatientDuration(patient),
      history,
    });
  } catch (err) {
    console.error("Error in getPatientDurationHistory:", err);
    res.status(500).json({ message: "Could not retrieve program duration history." });
  }
}

export async function recordPatientDurationChange(req, res) {
  const { id } = req.params;
  const {
    changeType, // 'EXTENSION' | 'REQUIREMENT_CHANGE'
    requiredDurationMonths,
    additionalExtensionMonths,
    durationBasis,
    durationBasisDetail,
    agreedStartDate,
    reason,
    effectiveDate,
    approvedByName,
  } = req.body;

  try {
    await ensureProgramDurationSchema();
    const access = await verifyPatientAccess(id, req.user);
    if (!access.allowed) return res.status(access.status).json({ message: access.message });

    const [[current]] = await pool.query("SELECT * FROM patients WHERE id = ?", [id]);
    if (!current) return res.status(404).json({ message: "Patient not found." });

    if (!cleanText(reason)) {
      return res.status(400).json({ message: "A documented reason is required when changing program duration or recording an extension." });
    }
    if (!cleanText(approvedByName)) {
      return res.status(400).json({ message: "Approving supervisor / court authority name is required." });
    }

    const prevBaseMonths = Number(current.required_duration_months) || 7;
    const prevExtMonths = Number(current.extension_months) || 0;
    const prevBasis = current.duration_basis || "STANDARD_PROGRAM";
    const prevExpected = toDateOnlyString(current.expected_completion_date);
    const effectiveStart =
      cleanText(agreedStartDate) ||
      toDateOnlyString(current.rehab_start_date) ||
      toDateOnlyString(current.admission_date) ||
      new Date().toISOString().slice(0, 10);

    let nextBaseMonths = prevBaseMonths;
    let nextExtMonths = prevExtMonths;
    let nextBasis = cleanText(durationBasis) || prevBasis;
    let nextBasisDetail =
      durationBasisDetail !== undefined
        ? cleanText(durationBasisDetail)
        : current.duration_basis_detail;

    const resolvedChangeType = changeType === "EXTENSION" ? "EXTENSION" : "REQUIREMENT_CHANGE";

    if (resolvedChangeType === "EXTENSION") {
      const addMonths = Number(additionalExtensionMonths);
      if (!Number.isFinite(addMonths) || addMonths <= 0) {
        return res.status(400).json({ message: "Enter a valid number of extension months greater than zero." });
      }
      nextExtMonths = prevExtMonths + addMonths;
    } else {
      const reqMonths = Number(requiredDurationMonths);
      if (!Number.isFinite(reqMonths) || reqMonths <= 0) {
        return res.status(400).json({ message: "Enter a valid required program duration in months." });
      }
      nextBaseMonths = reqMonths;
      if (req.body.resetExtensions === true) {
        nextExtMonths = 0;
      }
    }

    const totalMonths = nextBaseMonths + nextExtMonths;
    const newExpected = calculateExpectedCompletionDate(effectiveStart, totalMonths);
    const effDate = cleanText(effectiveDate) || new Date().toISOString().slice(0, 10);

    await pool.query(
      `UPDATE patients
       SET rehab_start_date = ?,
           required_duration_months = ?,
           extension_months = ?,
           duration_basis = ?,
           duration_basis_detail = ?,
           expected_completion_date = ?
       WHERE id = ?`,
      [
        effectiveStart,
        nextBaseMonths,
        nextExtMonths,
        nextBasis,
        nextBasisDetail || null,
        newExpected,
        id,
      ]
    );

    // Sync target_completion_date in active treatment plan if one exists
    await pool
      .query(
        `UPDATE patient_treatment_plans
         SET target_completion_date = ?
         WHERE patient_id = ? AND status = 'active'`,
        [newExpected, id]
      )
      .catch(() => {});

    // Preserve previous requirement and record the change/extension in patient_duration_history
    await pool.query(
      `INSERT INTO patient_duration_history
         (patient_id, change_type, previous_duration_months, new_duration_months,
          extension_months, total_duration_months, previous_basis, new_basis,
          basis_detail, agreed_start_date, previous_expected_completion_date,
          new_expected_completion_date, reason, effective_date,
          approved_by_name, recorded_by, recorded_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        resolvedChangeType,
        prevBaseMonths,
        nextBaseMonths,
        nextExtMonths,
        totalMonths,
        prevBasis,
        nextBasis,
        nextBasisDetail || null,
        effectiveStart,
        prevExpected,
        newExpected,
        cleanText(reason),
        effDate,
        cleanText(approvedByName),
        req.user.id,
        req.user.full_name || req.user.username || "Staff",
      ]
    );

    const actionDescription =
      resolvedChangeType === "EXTENSION"
        ? `Approved +${Number(additionalExtensionMonths)} mo. program extension for "${current.full_name}" (Previous: ${prevBaseMonths + prevExtMonths} mos -> New total: ${totalMonths} mos, Expected Completion: ${newExpected}, Approved by: ${cleanText(approvedByName)}, Reason: ${cleanText(reason)})`
        : `Updated program duration requirement for "${current.full_name}" from ${prevBaseMonths} mos (${prevBasis}) to ${nextBaseMonths} mos (${nextBasis})${nextExtMonths > 0 ? ` + ${nextExtMonths} mos ext.` : ""} (Expected Completion: ${newExpected}, Approved by: ${cleanText(approvedByName)}, Reason: ${cleanText(reason)})`;

    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patients', ?)",
      [req.user.username, actionDescription, id]
    );

    const [[updatedPatient]] = await pool.query("SELECT * FROM patients WHERE id = ?", [id]);
    const [history] = await pool.query(
      "SELECT * FROM patient_duration_history WHERE patient_id = ? ORDER BY created_at DESC, id DESC",
      [id]
    );

    res.json({
      message:
        resolvedChangeType === "EXTENSION"
          ? `Approved extension of +${Number(additionalExtensionMonths)} month(s) recorded. Expected completion date updated to ${newExpected}.`
          : `Program duration requirement updated to ${totalMonths} months. Previous requirement preserved in history.`,
      durationSummary: evaluatePatientDuration(updatedPatient),
      history,
    });
  } catch (err) {
    console.error("Error in recordPatientDurationChange:", err);
    res.status(500).json({ message: "Could not save program duration change." });
  }
}

export async function getPatientAttendance(req, res) {
  const { id } = req.params;
  try {
    await ensureAttendanceCompletionSchema();
    await ensureCbteAndRiskSchema();
    const access = await verifyPatientAccess(id, req.user);
    if (!access.allowed) return res.status(access.status).json({ message: access.message });

    const [attCols] = await pool.query("SHOW COLUMNS FROM attendance");
    const attColNames = attCols.map((c) => c.Field);
    const extraAtt = [];
    if (attColNames.includes("relapse_risk")) extraAtt.push("a.relapse_risk");
    if (attColNames.includes("staff_risk_assessment")) extraAtt.push("a.staff_risk_assessment");
    if (attColNames.includes("drug_test_result")) extraAtt.push("a.drug_test_result");
    if (attColNames.includes("family_attended")) extraAtt.push("a.family_attended");
    if (attColNames.includes("family_member_name")) extraAtt.push("a.family_member_name");
    if (attColNames.includes("is_chairperson")) extraAtt.push("a.is_chairperson");
    const extraAttSql = extraAtt.length ? ", " + extraAtt.join(", ") : "";

    const [rows] = await pool.query(
      `SELECT a.id, a.session_id, a.session_date,
              COALESCE(s.session_name, a.session_type) AS session_type,
              a.session_type AS raw_session_type,
              a.topic_id, a.topic_name,
              COALESCE(a.curriculum_requirement, s.curriculum_requirement, a.topic_name) AS curriculum_requirement,
              a.status,
              COALESCE(a.completion_status, CASE WHEN a.status = 'present' THEN 'CREDITED' ELSE 'NOT_CREDITED' END) AS completion_status,
              a.arrival_time,
              a.decision_reason,
              a.authorized_by_name,
              COALESCE(a.is_makeup, 0) AS is_makeup,
              a.makeup_for_attendance_id,
              COALESCE(a.is_duplicate_topic, 0) AS is_duplicate_topic,
              a.reviewed_at,
              a.notes,
              s.session_time,
              COALESCE(s.session_status, 'COMPLETED') AS session_status,
              s.cancellation_reason,
              orig.session_date AS makeup_origin_date,
              COALESCE(orig.curriculum_requirement, orig.topic_name, orig.session_type) AS makeup_origin_requirement,
              mk.id AS fulfilled_by_makeup_id,
              mk.session_date AS fulfilled_by_makeup_date
              ${extraAttSql}
       FROM attendance a
       LEFT JOIN sessions s ON s.id = a.session_id
       LEFT JOIN attendance orig ON orig.id = a.makeup_for_attendance_id
       LEFT JOIN attendance mk ON mk.makeup_for_attendance_id = a.id AND mk.completion_status = 'CREDITED'
       WHERE a.patient_id = ?
       ORDER BY a.session_date DESC, a.id DESC`,
      [id]
    );
    res.json({ attendance: rows });
  } catch (err) {
    console.error("Error in getPatientAttendance:", err);
    res.status(500).json({ message: "Could not retrieve patient attendance." });
  }
}

export async function getPatientProgressNotes(req, res) {
  const { id } = req.params;
  try {
    await ensureCbteAndRiskSchema();
    const access = await verifyPatientAccess(id, req.user);
    if (!access.allowed) return res.status(access.status).json({ message: access.message });

    const [pnCols] = await pool.query("SHOW COLUMNS FROM progress_notes");
    const pnColNames = pnCols.map((c) => c.Field);
    const extraPnCols = [];
    if (pnColNames.includes("relapse_risk")) extraPnCols.push("pn.relapse_risk");
    if (pnColNames.includes("staff_risk_assessment")) extraPnCols.push("pn.staff_risk_assessment");
    const extraPnSql = extraPnCols.length ? ", " + extraPnCols.join(", ") : "";

    const [rows] = await pool.query(
      `SELECT pn.id, pn.session_date, pn.session_type, pn.observation, pn.intervention_provided,
              pn.patient_response, pn.recommendations, pn.next_follow_up_date,
              pn.created_at, pn.updated_at, u.full_name AS case_manager_name
              ${extraPnSql}
       FROM progress_notes pn
       LEFT JOIN users u ON u.id = pn.case_manager_id
       WHERE pn.patient_id = ? ORDER BY pn.session_date DESC, pn.created_at DESC`,
      [id]
    );
    res.json({ progressNotes: rows });
  } catch (err) {
    console.error("Error in getPatientProgressNotes:", err);
    res.status(500).json({ message: "Could not retrieve progress notes." });
  }
}

export async function getPatientTimeline(req, res) {
  const { id } = req.params;
  try {
    const access = await verifyPatientAccess(id, req.user);
    if (!access.allowed) return res.status(access.status).json({ message: access.message });

    const [rows] = await pool.query(
      `SELECT 'progress_note' AS event_type,
              CONCAT('Progress note added', IF(session_type IS NOT NULL, CONCAT(' — ', session_type), '')) AS title,
              observation AS detail, created_at AS event_date
       FROM progress_notes WHERE patient_id = ?
       UNION ALL
       SELECT 'attendance', CONCAT('Attendance recorded: ', status), session_type, created_at
       FROM attendance WHERE patient_id = ?
       UNION ALL
       SELECT 'follow_up_scheduled', 'Follow-up scheduled', reason, created_at
       FROM follow_ups WHERE patient_id = ?
       UNION ALL
       SELECT 'follow_up_completed', 'Follow-up completed', completed_remarks, resolved_at
       FROM follow_ups WHERE patient_id = ? AND status = 'completed' AND resolved_at IS NOT NULL
       UNION ALL
       SELECT 'certificate', CONCAT(certificate_type, ' certificate issued'), NULL, issued_at
       FROM certificates WHERE patient_id = ?
       ORDER BY event_date DESC
       LIMIT 50`,
      [id, id, id, id, id]
    );
    res.json({ timeline: rows });
  } catch (err) {
    console.error("Error in getPatientTimeline:", err);
    res.status(500).json({ message: "Could not retrieve patient timeline." });
  }
}

export async function getPatientCertificates(req, res) {
  const { id } = req.params;
  try {
    const access = await verifyPatientAccess(id, req.user);
    if (!access.allowed) return res.status(access.status).json({ message: access.message });

    const [rows] = await pool.query(
      `SELECT c.id, c.certificate_type, c.completion_date, c.issued_at, u.full_name AS issued_by_name
       FROM certificates c
       LEFT JOIN users u ON u.id = c.issued_by
       WHERE c.patient_id = ? AND c.is_archived = FALSE ORDER BY c.issued_at DESC`,
      [id]
    );
    res.json({ certificates: rows });
  } catch (err) {
    console.error("Error in getPatientCertificates:", err);
    res.status(500).json({ message: "Could not retrieve patient certificates." });
  }
}

export async function getPatientHistory(req, res) {
  const { id } = req.params;
  try {
    const access = await verifyPatientAccess(id, req.user);
    if (!access.allowed) return res.status(access.status).json({ message: access.message });

    const [rows] = await pool.query(
      `SELECT actor_username, action, created_at
       FROM audit_log WHERE table_name = 'patients' AND record_id = ?
       ORDER BY created_at DESC`,
      [id]
    );
    res.json({ history: rows });
  } catch (err) {
    console.error("Error in getPatientHistory:", err);
    res.status(500).json({ message: "Could not retrieve patient history." });
  }
}

export async function createPatient(req, res) {
  const {
    firstName, middleName, lastName, suffix, preferredName, gender, birthdate, civilStatus,
    nationality, occupation, employmentStatus, educationalAttainment, religion, livingArrangement, estimatedFamilyMonthlyIncome,
    numberOfSiblings, ordinalPosition, fatherName, fatherOccupation, motherName, motherOccupation, spouseName, spouseOccupation,
    contactNumber, email, address, region, province, municipality, barangay, streetAddress, postalCode,
    emergencyContactName, emergencyContactRelationship, emergencyContactNumber,
    emergencyContactEmail, emergencyContactAddress, emergencyContactMethod,
    guardianName, guardianRelationship, guardianContactNumber, guardianAddress,
    admissionDate, referralSource, admissionType, programId,
    assignedCaseManagerId, admissionNotes,
    caseClassification, initialStatus, programPhase,
    expectedCompletionDate, sessionsRequired,
    caseType, attendingPhysician,
  } = req.body;

  const normalized = {
    firstName: cleanText(firstName),
    middleName: cleanText(middleName),
    lastName: cleanText(lastName),
    suffix: cleanText(suffix),
    preferredName: cleanText(preferredName),
    gender: cleanText(gender),
    birthdate: cleanText(birthdate),
    civilStatus: cleanText(civilStatus) || "single",
    nationality: cleanText(nationality),
    occupation: cleanText(occupation),
    employmentStatus: cleanText(employmentStatus) || "Employed",
    educationalAttainment: cleanText(educationalAttainment),
    religion: cleanText(religion),
    livingArrangement: cleanText(livingArrangement),
    estimatedFamilyMonthlyIncome: estimatedFamilyMonthlyIncome === "" || estimatedFamilyMonthlyIncome === undefined
      ? null
      : Number(estimatedFamilyMonthlyIncome),
    numberOfSiblings: numberOfSiblings === "" || numberOfSiblings === undefined ? null : Number(numberOfSiblings),
    ordinalPosition: cleanText(ordinalPosition),
    fatherName: cleanText(fatherName),
    fatherOccupation: cleanText(fatherOccupation),
    motherName: cleanText(motherName),
    motherOccupation: cleanText(motherOccupation),
    spouseName: cleanText(spouseName),
    spouseOccupation: cleanText(spouseOccupation),
    contactNumber: cleanText(contactNumber),
    email: cleanText(email),
    address: cleanText(address),
    region: cleanText(region),
    province: cleanText(province),
    municipality: cleanText(municipality),
    barangay: cleanText(barangay),
    streetAddress: cleanText(streetAddress),
    postalCode: cleanText(postalCode),
    emergencyContactName: cleanText(emergencyContactName),
    emergencyContactRelationship: cleanText(emergencyContactRelationship),
    emergencyContactNumber: cleanText(emergencyContactNumber),
    emergencyContactEmail: cleanText(emergencyContactEmail) || "",
    emergencyContactAddress: cleanText(emergencyContactAddress),
    emergencyContactMethod: cleanText(emergencyContactMethod) || "",
    guardianName: cleanText(guardianName),
    guardianRelationship: cleanText(guardianRelationship),
    guardianContactNumber: cleanText(guardianContactNumber),
    guardianAddress: cleanText(guardianAddress),
  };

  if (!normalized.firstName || !normalized.lastName || !normalized.gender || !normalized.birthdate) {
    return res.status(400).json({ message: "First name, last name, sex, and birthdate are required." });
  }

  const validSuffixes = new Set(["", "Jr.", "Sr.", "II", "III", "IV", "V"]);
  if (!validSuffixes.has(normalized.suffix || "")) {
    return res.status(400).json({ message: "Select a valid name suffix." });
  }

  const validLivingArrangements = new Set(["", "With Parents", "With Relatives", "Boarding House", "Living Alone"]);
  if (!validLivingArrangements.has(normalized.livingArrangement || "")) {
    return res.status(400).json({ message: "Select a valid living arrangement." });
  }

  if (normalized.estimatedFamilyMonthlyIncome !== null
      && (!Number.isFinite(normalized.estimatedFamilyMonthlyIncome) || normalized.estimatedFamilyMonthlyIncome < 0)) {
    return res.status(400).json({ message: "Estimated family monthly income must be zero or greater." });
  }

  if (!normalized.region || !normalized.province || !normalized.municipality || !normalized.barangay || !normalized.streetAddress) {
    return res.status(400).json({ message: "Region, Province, City/Municipality, Barangay, and Street Address are required." });
  }

  if (!normalized.emergencyContactName || !normalized.emergencyContactRelationship || !normalized.emergencyContactNumber) {
    return res.status(400).json({ message: "Emergency-contact name, relationship, and contact number are required." });
  }

  const age = ageFromBirthdate(normalized.birthdate);
  if (age === null || age < 0 || age > 130) {
    return res.status(400).json({ message: "Enter a valid birthdate that is not in the future." });
  }

  if (normalized.contactNumber && !validPhone(normalized.contactNumber)) {
    return res.status(400).json({ message: "Enter a valid patient mobile number." });
  }

  if (!validPhone(normalized.emergencyContactNumber)) {
    return res.status(400).json({ message: "Enter a valid emergency-contact number." });
  }

  if (normalized.emergencyContactMethod.length > 30) {
    return res.status(400).json({ message: "Preferred contact method must be 30 characters or fewer." });
  }

  if (normalized.emergencyContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.emergencyContactEmail)) {
    return res.status(400).json({ message: "Enter a valid emergency contact email address." });
  }

  if (normalized.emergencyContactEmail.length > 255) {
    return res.status(400).json({ message: "Emergency contact email must be 255 characters or fewer." });
  }

  if (normalized.emergencyContactMethod === "email" && !normalized.emergencyContactEmail) {
    return res.status(400).json({ message: "Emergency contact email is required when Email is the preferred contact method." });
  }

  if (normalized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  if (age < 18) {
    if (!normalized.guardianName || !normalized.guardianRelationship || !normalized.guardianContactNumber || !normalized.guardianAddress) {
      return res.status(400).json({ message: "Guardian name, relationship, contact number, and address are required for patients under 18." });
    }
  }

  if (normalized.guardianContactNumber && !validPhone(normalized.guardianContactNumber)) {
    return res.status(400).json({ message: "Enter a valid guardian contact number." });
  }

  const fullName = [normalized.firstName, normalized.middleName, normalized.lastName, normalized.suffix]
    .filter(Boolean)
    .join(" ");

  try {
    const [[existingPatient]] = await pool.query(
      `SELECT id, patient_code
       FROM patients
       WHERE LOWER(TRIM(first_name)) = LOWER(?)
         AND LOWER(TRIM(COALESCE(middle_name, ''))) = LOWER(?)
         AND LOWER(TRIM(last_name)) = LOWER(?)
         AND LOWER(TRIM(COALESCE(suffix, ''))) = LOWER(?)
         AND birthdate = ?
       LIMIT 1`,
      [normalized.firstName, normalized.middleName || "", normalized.lastName, normalized.suffix || "", normalized.birthdate]
    );

    if (existingPatient) {
      return res.status(409).json({
        message: `A patient with the same name and birthdate already exists (${existingPatient.patient_code}).`,
        existingPatientId: existingPatient.id,
      });
    }

    const patientCode = await generatePatientCode();
    const resolvedCaseType = "substance_use"; // Scope locked: ENTREPOSE SUD only

    // Enforce case manager assignment for all PWUD registrations
    if (!assignedCaseManagerId) {
      return res.status(400).json({ message: "An assigned Case Manager is required before registering an ENTREPOSE patient." });
    }

    let pwudCode = null;
    if (resolvedCaseType === "substance_use") {
      pwudCode = await generatePwudCode(normalized.municipality);
    }

    const record = {
      patient_code: patientCode,
      pwud_code: pwudCode,
      case_type: resolvedCaseType,
      first_name: normalized.firstName,
      middle_name: normalized.middleName || null,
      last_name: normalized.lastName,
      suffix: normalized.suffix || null,
      full_name: fullName,
      preferred_name: normalized.preferredName || null,
      gender: normalized.gender,
      birthdate: normalized.birthdate,
      civil_status: normalized.civilStatus,
      nationality: normalized.nationality || null,
      occupation: normalized.occupation || null,
      employment_status: normalized.employmentStatus || null,
      educational_attainment: normalized.educationalAttainment || null,
      religion: normalized.religion || null,
      living_arrangement: normalized.livingArrangement || null,
      estimated_family_monthly_income: normalized.estimatedFamilyMonthlyIncome,
      number_of_siblings: normalized.numberOfSiblings,
      ordinal_position: normalized.ordinalPosition || null,
      father_name: normalized.fatherName || null,
      father_occupation: normalized.fatherOccupation || null,
      mother_name: normalized.motherName || null,
      mother_occupation: normalized.motherOccupation || null,
      spouse_name: normalized.spouseName || null,
      spouse_occupation: normalized.spouseOccupation || null,
      contact_number: normalized.contactNumber || null,
      email: normalized.email || null,
      address: normalized.address,
      region: normalized.region,
      province: normalized.province,
      municipality: normalized.municipality,
      barangay: normalized.barangay,
      street_address: normalized.streetAddress,
      postal_code: normalized.postalCode || null,
      emergency_contact_name: normalized.emergencyContactName,
      emergency_contact_relationship: normalized.emergencyContactRelationship,
      emergency_contact_number: normalized.emergencyContactNumber,
      emergency_contact_email: normalized.emergencyContactEmail || null,
      emergency_contact_address: normalized.emergencyContactAddress || null,
      emergency_contact_method: normalized.emergencyContactMethod || null,
      guardian_name: normalized.guardianName || null,
      guardian_relationship: normalized.guardianRelationship || null,
      guardian_contact_number: normalized.guardianContactNumber || null,
      guardian_address: normalized.guardianAddress || null,
      admission_date: admissionDate || null,
      referral_source: referralSource || null,
      admission_type: admissionType || null,
      program_id: programId || null,
      assigned_case_manager_id: resolvedCaseType === "substance_use" ? (assignedCaseManagerId || null) : null,
      attending_physician: resolvedCaseType === "general_outpatient" ? (attendingPhysician || null) : null,
      admission_notes: admissionNotes || null,
      case_classification: caseClassification || null,
      initial_status: initialStatus || null,
      current_status: initialStatus || null,
      program_phase: programPhase || null,
      expected_completion_date: expectedCompletionDate || null,
      sessions_required: sessionsRequired || null,
      registered_by: req.user.id,
    };

    const [tableCols] = await pool.query("SHOW COLUMNS FROM patients");
    const existingColNames = new Set(tableCols.map((c) => c.Field));

    const finalRecord = {};
    for (const [col, val] of Object.entries(record)) {
      if (existingColNames.has(col)) {
        finalRecord[col] = val;
      }
    }

    const columns = Object.keys(finalRecord);
    const placeholders = columns.map(() => "?").join(", ");
    const [result] = await pool.query(
      `INSERT INTO patients (${columns.join(", ")}) VALUES (${placeholders})`,
      Object.values(finalRecord)
    );

    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, ?, ?)",
      [req.user.username, `Registered patient "${fullName}" (${patientCode})`, "patients", result.insertId]
    );

    await notifyRoles(["ict_admin", "him_staff", "admitting"], "patients", "patient_registered", `New patient registered: "${fullName}" (${patientCode}) — by ${req.user.username}`);

    if (assignedCaseManagerId) {
      await recordCaseManagerAssignment(pool, {
        patientId: result.insertId,
        newCaseManagerId: assignedCaseManagerId,
        effectiveDate: finalRecord.admission_date || null,
        reason: "Initial enrollment assignment",
        assignedBy: req.user.id,
      }).catch(() => {});
    }
    await recordPatientStatusChange(pool, {
      patientId: result.insertId,
      newStatus: finalRecord.enrollment_status || "pending",
      effectiveDate: finalRecord.admission_date || null,
      reason: "Initial enrollment registration",
      changedBy: req.user.id,
    }).catch(() => {});

    if (assignedCaseManagerId && Number(assignedCaseManagerId) !== Number(req.user.id)) {
      await notifyUser(
        assignedCaseManagerId,
        "patients",
        "patient_assigned",
        `New patient assigned: "${fullName}" (${patientCode})`
      );
    }

    res.status(201).json({ id: result.insertId, patientCode, pwudCode, message: "Patient registered." });
  } catch (err) {
    console.error("Error in createPatient:", err);
    if (err.code === "ER_BAD_FIELD_ERROR") {
      return res.status(500).json({ message: "The patient-registration database migration has not been applied." });
    }
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "A duplicate patient record or code was detected. Please try saving again." });
    }
    res.status(500).json({ message: err.message || "Could not register the patient." });
  }
}

/**
 * Retrieves full longitudinal Case Manager assignment timeline with effective dates
 */
export async function getPatientAssignmentHistory(req, res) {
  const { id } = req.params;
  try {
    await ensureHistoricalReportSchema(pool);
    const [rows] = await pool.query(
      `SELECT h.*, u.full_name AS assigned_by_name
       FROM patient_case_manager_history h
       LEFT JOIN users u ON u.id = h.assigned_by
       WHERE h.patient_id = ?
       ORDER BY h.start_date DESC, h.id DESC`,
      [id]
    );
    res.json({ success: true, history: rows });
  } catch (err) {
    console.error("Error in getPatientAssignmentHistory:", err);
    res.status(500).json({ message: "Could not fetch patient assignment history." });
  }
}
