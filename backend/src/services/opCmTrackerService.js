import pool from "../config/db.js";

const PSYCHIATRIC_COMORBIDITY_KEYS = new Set([
  "psychoticDisorder", "moodDisorder", "anxietyDisorder", "personalityDisorder",
]);

const COMORBIDITY_LABELS = {
  hypertension: "HPN",
  diabetes: "Diabetes",
  moodDisorder: "Mood Disorder",
  personalityDisorder: "PD",
  psychoticDisorder: "Psychotic Disorder",
  anxietyDisorder: "Anxiety Disorder",
};

const CBT_TYPES = ["CBT_GROUP"];
const PE_TYPES = ["PSYCHO_EDUCATION"];
const CORE_ATTENDANCE_TYPES = [...CBT_TYPES, ...PE_TYPES];

export function getMonthRange(month, year) {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isFinite(m) || m < 1 || m > 12 || !Number.isFinite(y) || y < 2000) {
    throw new Error("Invalid month or year.");
  }
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end, month: m, year: y };
}

export function caseManagerKey(fullName) {
  if (!fullName) return "Unassigned";
  return String(fullName).trim();
}

function mapCategory(admissionType, referralType) {
  const type = (admissionType || "").toLowerCase();
  if (type === "court_mandated") return "Court-Mandated";
  if (type === "lgu_referred") return "LGU-Referred";
  if (type === "voluntary") return "Voluntary";
  const ref = (referralType || "").toLowerCase();
  if (ref.includes("workplace")) return "Workplace-Referred";
  return admissionType ? admissionType.replace(/_/g, " ") : "—";
}

function sexCode(gender) {
  const g = String(gender || "").trim().toUpperCase();
  if (g.startsWith("M")) return "M";
  if (g.startsWith("F")) return "F";
  return g.slice(0, 1) || "—";
}

function censusGenderKey(gender) {
  const g = String(gender || "").trim().toLowerCase();
  return g.startsWith("f") ? "Female" : "Male";
}

function parseComorbidities(raw) {
  if (!raw) return { medical: 0, psychiatric: 0, details: "" };
  let obj = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return { medical: 0, psychiatric: 0, details: "" };
    }
  }
  if (!obj || typeof obj !== "object") return { medical: 0, psychiatric: 0, details: "" };

  const activeLabels = [];
  let medical = 0;
  let psychiatric = 0;
  for (const [key, status] of Object.entries(obj)) {
    if (!status || status === "none" || status === "") continue;
    if (PSYCHIATRIC_COMORBIDITY_KEYS.has(key)) psychiatric = 1;
    else medical = 1;
    activeLabels.push(COMORBIDITY_LABELS[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()));
  }
  return { medical, psychiatric, details: activeLabels.join(", ") };
}

function countByType(rows, types, field = "attended") {
  return rows
    .filter((r) => types.includes(r.session_type))
    .reduce((sum, r) => sum + Number(r[field] || 0), 0);
}

function mapDischargeStatus(status, reason) {
  if (status === "Completer (Graduated)") return "Completer";
  const r = String(reason || "").toLowerCase();
  if (r.includes("non-compliance") || r.includes("noncompliance")) return "Non-compliance";
  if (r.includes("re-arrest") || r.includes("buy-bust") || r.includes("incarcerat")) return "Incarcerated";
  if (r.includes("referred") || r.includes("residential")) return "Referred";
  if (r.includes("death") || r.includes("medical")) return "Medical";
  return "Non-compliance";
}

function mapAttritionBucket(reason) {
  const r = String(reason || "").toLowerCase();
  if (r.includes("re-arrest") || r.includes("buy-bust") || r.includes("incarcerat")) return "Incarcerated";
  if (r.includes("referred") || r.includes("residential") || r.includes("other facility")) {
    return "Referred to Other Program/Facilty";
  }
  if (r.includes("death") || r.includes("medical")) return "Medical Discharge";
  return "Non-compliance";
}

function monthsInProgram(admissionDate, asOfDate) {
  if (!admissionDate) return 0;
  const start = new Date(admissionDate);
  const end = new Date(asOfDate);
  const diff = Math.max(0, end - start);
  return Math.ceil(diff / (1000 * 60 * 60 * 24 * 30));
}

function formatMonthsLabel(months) {
  if (months <= 0) return "—";
  if (months >= 6) return `${months} months above`;
  return months === 1 ? "1 month" : `${months} months`;
}

function emptyCensusRow() {
  return {
    Voluntary: { Male: 0, Female: 0 },
    "LGU-Referred": { Male: 0, Female: 0 },
    "Court-mandated": { Male: 0, Female: 0 },
    total: 0,
  };
}

function buildCensusMatrix(patients, categoryField, cmUsers = []) {
  const matrix = {};
  const cmNames = cmUsers.map((u) => u.full_name.trim());
  for (const name of cmNames) {
    matrix[name] = emptyCensusRow();
  }
  matrix["Unassigned"] = emptyCensusRow();

  for (const p of patients) {
    const cmName = p.case_manager_name ? p.case_manager_name.trim() : "Unassigned";
    if (!matrix[cmName]) {
      matrix[cmName] = emptyCensusRow();
      if (!cmNames.includes(cmName)) cmNames.push(cmName);
    }
    const cat = p[categoryField];
    const gender = censusGenderKey(p.gender);
    let bucket = "Voluntary";
    if (cat === "Court-Mandated") bucket = "Court-mandated";
    else if (cat === "LGU-Referred") bucket = "LGU-Referred";
    else if (cat === "Workplace-Referred") bucket = "Voluntary";

    matrix[cmName][bucket][gender] += 1;
    matrix[cmName].total += 1;
  }

  const displayNames = cmNames.filter((name) => name !== "Unassigned" || (matrix["Unassigned"] && matrix["Unassigned"].total > 0));

  const rows = displayNames.map((name) => ({
    caseManager: name,
    ...matrix[name],
  }));

  const subtotal = emptyCensusRow();
  for (const row of rows) {
    for (const bucket of ["Voluntary", "LGU-Referred", "Court-mandated"]) {
      subtotal[bucket].Male += row[bucket].Male;
      subtotal[bucket].Female += row[bucket].Female;
    }
    subtotal.total += row.total;
  }

  return { rows, subtotal, grandTotal: subtotal.total };
}

function buildDischargeSummary(discharges, cmUsers = []) {
  const matrix = {};
  const cmNames = cmUsers.map((u) => u.full_name.trim());
  for (const name of cmNames) {
    matrix[name] = {
      Completer: { Male: 0, Female: 0 },
      "Non-compliance": { Male: 0, Female: 0 },
      Incarcerated: { Male: 0, Female: 0 },
      "Referred to Other Program/Facility": { Male: 0, Female: 0 },
      "Medical Discharge": { Male: 0, Female: 0 },
      total: 0,
    };
  }

  for (const d of discharges) {
    const cmName = d.case_manager_name ? d.case_manager_name.trim() : "Unassigned";
    if (!matrix[cmName]) {
      matrix[cmName] = {
        Completer: { Male: 0, Female: 0 },
        "Non-compliance": { Male: 0, Female: 0 },
        Incarcerated: { Male: 0, Female: 0 },
        "Referred to Other Program/Facility": { Male: 0, Female: 0 },
        "Medical Discharge": { Male: 0, Female: 0 },
        total: 0,
      };
      if (!cmNames.includes(cmName)) cmNames.push(cmName);
    }
    const gender = censusGenderKey(d.gender);
    if (d.discharge_status === "Completer (Graduated)") {
      matrix[cmName].Completer[gender] += 1;
      matrix[cmName].total += 1;
    } else {
      const bucket = mapAttritionBucket(d.reason);
      const targetBucket = bucket === "Referred to Other Program/Facilty" ? "Referred to Other Program/Facility" : bucket;
      if (matrix[cmName][targetBucket]) {
        matrix[cmName][targetBucket][gender] += 1;
        matrix[cmName].total += 1;
      }
    }
  }

  const displayNames = cmNames.filter((name) => name !== "Unassigned" || (matrix["Unassigned"] && matrix["Unassigned"].total > 0));
  const rows = displayNames.map((name) => ({ caseManager: name, ...matrix[name] }));
  const subtotal = {
    Completer: { Male: 0, Female: 0 },
    "Non-compliance": { Male: 0, Female: 0 },
    Incarcerated: { Male: 0, Female: 0 },
    "Referred to Other Program/Facility": { Male: 0, Female: 0 },
    "Medical Discharge": { Male: 0, Female: 0 },
    total: 0,
  };

  for (const r of rows) {
    for (const b of ["Completer", "Non-compliance", "Incarcerated", "Referred to Other Program/Facility", "Medical Discharge"]) {
      subtotal[b].Male += r[b].Male;
      subtotal[b].Female += r[b].Female;
    }
    subtotal.total += r.total;
  }

  return { rows, subtotal, grandTotal: subtotal.total };
}

function buildAttendancePerformance(gridRows, cmUsers = []) {
  const byCm = {};
  const cmNames = cmUsers.map((u) => u.full_name.trim());
  for (const name of cmNames) {
    byCm[name] = { target: 0, actual: 0 };
  }

  for (const row of gridRows) {
    const cmName = row.cmFullName && row.cmFullName !== "—" ? row.cmFullName.trim() : (row.cm || "Unassigned");
    if (!byCm[cmName]) {
      byCm[cmName] = { target: 0, actual: 0 };
      if (!cmNames.includes(cmName)) cmNames.push(cmName);
    }
    byCm[cmName].target += Number(row.scheduledCbtSessions || 0) + Number(row.scheduledPeSessions || 0);
    byCm[cmName].actual += Number(row.attendedCbtSessions || 0) + Number(row.attendedPeSessions || 0);
  }

  const displayNames = cmNames.filter((name) => name !== "Unassigned" || (byCm["Unassigned"] && (byCm["Unassigned"].target > 0 || byCm["Unassigned"].actual > 0)));

  const rows = displayNames.map((name) => {
    const { target = 0, actual = 0 } = byCm[name] || {};
    const attendanceRatePercent = target > 0 ? Math.round((actual / target) * 10000) / 100 : null;
    return { caseManager: name, targetScheduled: target, actualAttended: actual, attendanceRatePercent };
  });

  const totalTarget = rows.reduce((s, r) => s + r.targetScheduled, 0);
  const totalActual = rows.reduce((s, r) => s + r.actualAttended, 0);
  const totalRate = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 10000) / 100 : null;

  return {
    rows,
    facilityTotal: {
      caseManager: "FACILITY TOTAL",
      targetScheduled: totalTarget,
      actualAttended: totalActual,
      attendanceRatePercent: totalRate,
    },
  };
}

export async function getOpCmTrackerReport(month, year, caseManagerId = null) {
  const { start, end } = getMonthRange(month, year);

  const [cmUsers] = await pool.query(
    `SELECT id, full_name FROM users WHERE role = 'case_manager' ORDER BY full_name ASC`
  );
  const targetCms = caseManagerId ? cmUsers.filter((u) => u.id === caseManagerId) : cmUsers;

  const cmFilterSql = caseManagerId ? "AND p.assigned_case_manager_id = ?" : "";
  const baseParams = [end, start];
  if (caseManagerId) baseParams.push(caseManagerId);

  const [patients] = await pool.query(
    `SELECT p.id, p.pwud_code, p.full_name, p.gender, p.municipality, p.admission_date,
            COALESCE(p.admission_type, r.admission_type) AS admission_type,
            r.type_of_patient,
            u.full_name AS case_manager_name,
            m.date_po, m.date_vlts_referral, m.date_initial_assessment, m.date_initial_tx_planning,
            m.date_initial_progress_report, m.date_case_conference, m.date_status_reporting,
            m.date_home_visit, m.date_followup_assessment, m.date_acp_planning, m.date_pdc,
            m.date_final_progress_report, m.date_referral_outside_mtrc,
            pi.comorbidities,
            (SELECT pd.discharge_date FROM patient_discharges pd
             WHERE pd.patient_id = p.id ORDER BY pd.discharge_date DESC LIMIT 1) AS discharge_date,
            (SELECT pd.status FROM patient_discharges pd
             WHERE pd.patient_id = p.id ORDER BY pd.discharge_date DESC LIMIT 1) AS discharge_status,
            (SELECT pd.reason FROM patient_discharges pd
             WHERE pd.patient_id = p.id ORDER BY pd.discharge_date DESC LIMIT 1) AS discharge_reason,
            (SELECT pd.intervention_upon_discharge FROM patient_discharges pd
             WHERE pd.patient_id = p.id ORDER BY pd.discharge_date DESC LIMIT 1) AS discharge_intervention
     FROM patients p
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     LEFT JOIN patient_milestones m ON m.patient_id = p.id
     LEFT JOIN patient_intakes pi ON pi.patient_id = p.id
     LEFT JOIN patient_referrals r ON r.patient_id = p.id
     WHERE p.case_type = 'substance_use'
       AND p.is_archived = FALSE
       AND p.admission_date IS NOT NULL
       AND p.admission_date <= ?
       AND (
         NOT EXISTS (SELECT 1 FROM patient_discharges pd WHERE pd.patient_id = p.id)
         OR EXISTS (SELECT 1 FROM patient_discharges pd WHERE pd.patient_id = p.id AND pd.discharge_date >= ?)
       )
       ${cmFilterSql}
     ORDER BY u.full_name, p.full_name`,
    baseParams
  );

  if (patients.length === 0) {
    return {
      period: { month: Number(month), year: Number(year), start, end },
      grid: [],
      summaries: {
        activeCensus: buildCensusMatrix([], "category", targetCms),
        enrollments: buildCensusMatrix([], "category", targetCms),
        discharges: buildDischargeSummary([], targetCms),
        nonCompleters: [],
        positiveDrugTests: [],
        attendancePerformance: buildAttendancePerformance([], targetCms),
      },
    };
  }

  const patientIds = patients.map((p) => p.id);

  const [attendanceAgg] = await pool.query(
    `SELECT patient_id, session_type,
            COUNT(*) AS scheduled,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS attended
     FROM attendance
     WHERE patient_id IN (?) AND session_date BETWEEN ? AND ?
     GROUP BY patient_id, session_type`,
    [patientIds, start, end]
  );

  const [dtAgg] = await pool.query(
    `SELECT patient_id, COUNT(*) AS dt_count
     FROM drug_test_logs
     WHERE patient_id IN (?) AND test_date BETWEEN ? AND ?
     GROUP BY patient_id`,
    [patientIds, start, end]
  );

  const [consultAgg] = await pool.query(
    `SELECT patient_id, consult_type
     FROM patient_consult_logs
     WHERE patient_id IN (?) AND consult_date BETWEEN ? AND ?
     ORDER BY consult_date DESC`,
    [patientIds, start, end]
  );

  const attByPatient = new Map();
  for (const row of attendanceAgg) {
    if (!attByPatient.has(row.patient_id)) attByPatient.set(row.patient_id, []);
    attByPatient.get(row.patient_id).push(row);
  }
  const dtByPatient = new Map(dtAgg.map((r) => [r.patient_id, r.dt_count]));
  const consultByPatient = new Map(consultAgg.map((r) => [r.patient_id, r.consult_type]));

  const grid = patients.map((p) => {
    const att = attByPatient.get(p.id) || [];
    const scheduledCbt = countByType(att, CBT_TYPES, "scheduled");
    const attendedCbt = countByType(att, CBT_TYPES, "attended");
    const scheduledPe = countByType(att, PE_TYPES, "scheduled");
    const attendedPe = countByType(att, PE_TYPES, "attended");
    const attendedShgm = countByType(att, ["SHGM"], "attended");
    const individualSessions = countByType(att, ["INDIVIDUAL_COUNSELING"], "attended");
    const conjointSessions = countByType(att, ["CONJOINT_FAMILY"], "attended");
    const coreAttended = countByType(att, CORE_ATTENDANCE_TYPES, "attended")
      + attendedShgm + individualSessions + conjointSessions;

    const comorb = parseComorbidities(p.comorbidities);
    const category = mapCategory(p.admission_type, p.type_of_patient);
    const newEnrollee = p.admission_date >= start && p.admission_date <= end ? 1 : 0;

    return {
      pwudCode: p.pwud_code || "—",
      clientName: p.full_name,
      sex: sexCode(p.gender),
      lgu: p.municipality || "—",
      cm: caseManagerKey(p.case_manager_name),
      cmFullName: p.case_manager_name || "—",
      category,
      dateEnrolled: p.admission_date,
      newEnrollee,
      datePo: p.date_po,
      dateVltsReferral: p.date_vlts_referral,
      dateInitialAssessment: p.date_initial_assessment,
      dateInitialTreatmentPlanning: p.date_initial_tx_planning,
      dateInitialProgressReporting: p.date_initial_progress_report,
      scheduledCbtSessions: scheduledCbt,
      attendedCbtSessions: attendedCbt,
      scheduledPeSessions: scheduledPe,
      attendedPeSessions: attendedPe,
      attendedShgmSessions: attendedShgm,
      individualCounselingSessions: individualSessions,
      conjointFamilySessions: conjointSessions,
      drugTestsConducted: dtByPatient.get(p.id) || 0,
      dateReferralOutsideMtrc: p.date_referral_outside_mtrc || null,
      dateCaseConference: p.date_case_conference,
      dateStatusReporting: p.date_status_reporting,
      dateHomeVisit: p.date_home_visit,
      dateFollowupAssessment: p.date_followup_assessment,
      dateAcpTreatmentPlanning: p.date_acp_planning,
      datePdc: p.date_pdc,
      dateFinalProgressReporting: p.date_final_progress_report,
      interventionsConductedInMonth: coreAttended > 0 ? 1 : 0,
      medicalComorbidity: comorb.medical,
      psychiatricComorbidity: comorb.psychiatric,
      consultTypeWithinMtrc: consultByPatient.get(p.id) || "",
      comorbidityDetails: comorb.details,
      dateOfDischarge: p.discharge_date,
      statusOfDischarge: p.discharge_status ? mapDischargeStatus(p.discharge_status, p.discharge_reason) : "",
      remarks: p.discharge_intervention || "",
    };
  });

  const activeParams = [end, start];
  if (caseManagerId) activeParams.push(caseManagerId);
  const [activePatients] = await pool.query(
    `SELECT p.gender, p.admission_date,
            COALESCE(p.admission_type, r.admission_type) AS admission_type,
            r.type_of_patient,
            u.full_name AS case_manager_name
     FROM patients p
     LEFT JOIN patient_referrals r ON r.patient_id = p.id
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     WHERE p.case_type = 'substance_use'
       AND p.is_archived = FALSE
       AND p.admission_date IS NOT NULL
       AND p.admission_date <= ?
       AND (
         NOT EXISTS (SELECT 1 FROM patient_discharges pd WHERE pd.patient_id = p.id)
         OR EXISTS (SELECT 1 FROM patient_discharges pd WHERE pd.patient_id = p.id AND pd.discharge_date >= ?)
       )
       ${caseManagerId ? "AND p.assigned_case_manager_id = ?" : ""}`,
    activeParams
  );
  const activeForCensus = activePatients.map((p) => ({
    ...p,
    category: mapCategory(p.admission_type, p.type_of_patient),
  }));

  const enrollmentParams = [start, end];
  if (caseManagerId) enrollmentParams.push(caseManagerId);
  const [enrollmentPatients] = await pool.query(
    `SELECT p.gender,
            COALESCE(p.admission_type, r.admission_type) AS admission_type,
            r.type_of_patient,
            u.full_name AS case_manager_name
     FROM patients p
     LEFT JOIN patient_referrals r ON r.patient_id = p.id
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     WHERE p.case_type = 'substance_use'
       AND p.is_archived = FALSE
       AND p.admission_date BETWEEN ? AND ?
       ${caseManagerId ? "AND p.assigned_case_manager_id = ?" : ""}`,
    enrollmentParams
  );
  const enrollForCensus = enrollmentPatients.map((p) => ({
    ...p,
    category: mapCategory(p.admission_type, p.type_of_patient),
  }));

  const dischargeParams = [start, end];
  if (caseManagerId) dischargeParams.push(caseManagerId);
  const [monthDischarges] = await pool.query(
    `SELECT p.full_name, p.gender, p.admission_date, p.pwud_code,
            u.full_name AS case_manager_name,
            pd.discharge_date, pd.status AS discharge_status, pd.reason,
            pd.intervention_upon_discharge, pd.treatment_duration_months
     FROM patient_discharges pd
     JOIN patients p ON p.id = pd.patient_id
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     WHERE p.case_type = 'substance_use'
       AND p.is_archived = FALSE
       AND pd.discharge_date BETWEEN ? AND ?
       ${caseManagerId ? "AND p.assigned_case_manager_id = ?" : ""}`,
    dischargeParams
  );

  const nonCompleters = monthDischarges
    .filter((d) => d.discharge_status !== "Completer (Graduated)")
    .map((d) => ({
      caseManager: caseManagerKey(d.case_manager_name),
      clientName: d.full_name,
      sex: censusGenderKey(d.gender),
      dateEnrolled: d.admission_date,
      dateDischarged: d.discharge_date,
      reasonForDischarge: d.reason || "Non-compliance",
      lengthOfTreatmentMonths:
        d.treatment_duration_months != null
          ? Number(d.treatment_duration_months)
          : Math.max(0, Math.round(
              (new Date(d.discharge_date) - new Date(d.admission_date)) / (1000 * 60 * 60 * 24 * 30)
            )),
      interventionsDone: d.intervention_upon_discharge || "",
    }));

  const dtParams = [start, end];
  if (caseManagerId) dtParams.push(caseManagerId);
  const [positiveDt] = await pool.query(
    `SELECT u.full_name AS case_manager_name, p.full_name, p.admission_date,
            d.substance_tested, d.test_date
     FROM drug_test_logs d
     JOIN patients p ON p.id = d.patient_id
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     WHERE p.case_type = 'substance_use'
       AND p.is_archived = FALSE
       AND d.result = 'POSITIVE'
       AND d.test_date BETWEEN ? AND ?
       ${caseManagerId ? "AND p.assigned_case_manager_id = ?" : ""}
     ORDER BY u.full_name, p.full_name, d.test_date`,
    dtParams
  );

  const positiveDrugTests = positiveDt.map((row) => {
    const months = monthsInProgram(row.admission_date, row.test_date);
    return {
      caseManager: caseManagerKey(row.case_manager_name),
      clientName: row.full_name,
      substanceDetected: row.substance_tested || "—",
      monthsInProgram: months,
      monthsInProgramLabel: formatMonthsLabel(months),
    };
  });

  return {
    period: { month: Number(month), year: Number(year), start, end },
    grid,
    summaries: {
      activeCensus: buildCensusMatrix(activeForCensus, "category", targetCms),
      enrollments: buildCensusMatrix(enrollForCensus, "category", targetCms),
      discharges: buildDischargeSummary(monthDischarges, targetCms),
      nonCompleters,
      positiveDrugTests,
      attendancePerformance: buildAttendancePerformance(grid, targetCms),
    },
  };
}
