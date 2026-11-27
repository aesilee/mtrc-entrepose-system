import pool from "../config/db.js";
import { ensureAttendanceCompletionSchema } from "../utils/attendanceSchema.js";
import { getBulkUnifiedPatientProgress } from "../utils/curriculumProgress.js";
import { ensureProgramDurationSchema, evaluatePatientDuration } from "../utils/programDuration.js";
import { ensureInterventionSchema, INTERVENTION_TYPES } from "../utils/interventionSchema.js";
import { ensureHistoricalReportSchema } from "../utils/historicalReportSchema.js";
import { notifyRoles } from "../utils/notify.js";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

export function formatTrackerDate(d) {
  if (!d) return null;
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return String(d).slice(0, 10);
}

export function onlyInMonth(d, start, end) {
  if (!d) return null;
  const s = formatTrackerDate(d);
  if (!s) return null;
  return s >= start && s <= end ? s : null;
}

export function mapCategory(admissionType, referralType, natureOfConfinement, referralSource) {
  const nature = String(natureOfConfinement || "").trim().toLowerCase();
  const source = String(referralSource || referralType || "").trim().toLowerCase();
  const admType = String(admissionType || "").trim().toLowerCase();

  // 1. Explicit Voluntary check FIRST (covers voluntary with court order, voluntary without court order, self-referral, walk-in, family)
  if (
    nature.includes("voluntary") ||
    nature.includes("without court order") ||
    nature.includes("self-referral") ||
    source === "voluntary" ||
    source.includes("self") ||
    source.includes("walk-in") ||
    source.includes("family") ||
    source.includes("parent") ||
    source.includes("wife") ||
    source.includes("husband") ||
    source.includes("relative") ||
    admType === "voluntary"
  ) {
    return "Voluntary";
  }

  // 2. Explicit Court-Mandated indicators (Plea Bargaining, Compulsory under Sec 61/62, Arrested, Probation, Suspended Sentence)
  if (
    nature.includes("plea bargaining") ||
    nature.includes("compulsory") ||
    nature.includes("section 61") ||
    nature.includes("section 62") ||
    nature.includes("arrested") ||
    nature.includes("suspended sentence") ||
    nature.includes("probation") ||
    nature.includes("court-mandated") ||
    source.includes("court") ||
    source.includes("rtc") ||
    source.includes("mtc") ||
    admType.includes("court") ||
    nature.includes("court")
  ) {
    return "Court-Mandated";
  }

  // 3. LGU-Referred (CADAC / MADAC / BADAC / Barangay / Social Worker)
  if (
    source.includes("lgu") ||
    source.includes("cadac") ||
    source.includes("madac") ||
    source.includes("badac") ||
    source.includes("barangay") ||
    nature.includes("lgu") ||
    nature.includes("cadac") ||
    nature.includes("madac") ||
    nature.includes("badac")
  ) {
    return "LGU-Referred";
  }

  // 4. Workplace
  if (
    source.includes("workplace") ||
    source.includes("employer") ||
    source.includes("company") ||
    nature.includes("workplace")
  ) {
    return "Workplace-Referred";
  }

  // 5. Context-aware fallback: if admission type indicates voluntary or walk-in
  if (admType.includes("voluntary") || source === "n/a" || !source) {
    return "Voluntary";
  }

  return "Voluntary";
}

function sexCode(gender) {
  const g = String(gender || "").trim().toUpperCase();
  if (g.startsWith("M")) return "M";
  if (g.startsWith("F")) return "F";
  return g.slice(0, 1) || "—";
}

export function censusGenderKey(gender) {
  const g = String(gender || "").trim().toLowerCase();
  if (g.startsWith("f")) return "Female";
  if (g.startsWith("m")) return "Male";
  return "Unspecified";
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

function mapDischargeStatus(status, reason, outcome = null) {
  if (outcome === "COMPLETER" || status === "Completer (Graduated)" || status === "Completer" || status === "COMPLETER") {
    return "Completer";
  }
  const r = String(reason || "").toLowerCase();
  if (r.includes("non-compliance") || r.includes("noncompliance")) return "Non-compliance";
  if (r.includes("re-arrest") || r.includes("buy-bust") || r.includes("incarcerat")) return "Incarcerated";
  if (r.includes("referred") || r.includes("residential")) return "Referred";
  if (r.includes("death") || r.includes("medical")) return "Medical";
  return "Non-compliance";
}

function mapAttritionBucket(reason) {
  const r = String(reason || "").toLowerCase();
  if (r.includes("re-arrest") || r.includes("buy-bust") || r.includes("incarcerat") || r.includes("court order turnover")) return "Incarcerated";
  if (r.includes("referred") || r.includes("residential") || r.includes("other facility") || r.includes("transfer")) {
    return "Referred to Other Program/Facility";
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
    Voluntary: { Male: 0, Female: 0, Unspecified: 0 },
    "LGU-Referred": { Male: 0, Female: 0, Unspecified: 0 },
    "Court-mandated": { Male: 0, Female: 0, Unspecified: 0 },
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
    let bucket = "Court-mandated";
    if (cat === "Court-Mandated") bucket = "Court-mandated";
    else if (cat === "LGU-Referred") bucket = "LGU-Referred";
    else if (cat === "Voluntary" || cat === "Workplace-Referred") bucket = "Voluntary";

    if (matrix[cmName][bucket][gender] !== undefined) {
      matrix[cmName][bucket][gender] += 1;
    } else {
      matrix[cmName][bucket].Unspecified += 1;
    }
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
      subtotal[bucket].Male += (row[bucket].Male || 0);
      subtotal[bucket].Female += (row[bucket].Female || 0);
      subtotal[bucket].Unspecified += (row[bucket].Unspecified || 0);
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
      Completer: { Male: 0, Female: 0, Unspecified: 0 },
      "Non-compliance": { Male: 0, Female: 0, Unspecified: 0 },
      Incarcerated: { Male: 0, Female: 0, Unspecified: 0 },
      "Referred to Other Program/Facility": { Male: 0, Female: 0, Unspecified: 0 },
      "Medical Discharge": { Male: 0, Female: 0, Unspecified: 0 },
      total: 0,
    };
  }

  for (const d of discharges) {
    const cmName = d.case_manager_name ? d.case_manager_name.trim() : "Unassigned";
    if (!matrix[cmName]) {
      matrix[cmName] = {
        Completer: { Male: 0, Female: 0, Unspecified: 0 },
        "Non-compliance": { Male: 0, Female: 0, Unspecified: 0 },
        Incarcerated: { Male: 0, Female: 0, Unspecified: 0 },
        "Referred to Other Program/Facility": { Male: 0, Female: 0, Unspecified: 0 },
        "Medical Discharge": { Male: 0, Female: 0, Unspecified: 0 },
        total: 0,
      };
      if (!cmNames.includes(cmName)) cmNames.push(cmName);
    }
    const gender = censusGenderKey(d.gender);
    const isCompleter = d.outcome === "COMPLETER" || d.discharge_status === "Completer (Graduated)" || d.discharge_status === "Completer" || d.discharge_status === "COMPLETER";
    if (isCompleter) {
      if (matrix[cmName].Completer[gender] !== undefined) {
        matrix[cmName].Completer[gender] += 1;
      } else {
        matrix[cmName].Completer.Unspecified += 1;
      }
      matrix[cmName].total += 1;
    } else {
      const bucket = mapAttritionBucket(d.reason);
      const targetBucket = matrix[cmName][bucket] ? bucket : "Non-compliance";
      if (matrix[cmName][targetBucket][gender] !== undefined) {
        matrix[cmName][targetBucket][gender] += 1;
      } else {
        matrix[cmName][targetBucket].Unspecified += 1;
      }
      matrix[cmName].total += 1;
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

function buildAttendancePerformance(gridRows, cmUsers = [], cbteCountByCm = {}) {
  const byCm = {};
  const cmNames = cmUsers.map((u) => u.full_name.trim());
  for (const name of cmNames) {
    byCm[name] = {
      cbtTarget: 0,
      cbtActual: 0,
      cbtUnresolved: 0,
      peTarget: 0,
      peActual: 0,
      peUnresolved: 0,
      cbteConducted: cbteCountByCm[name] || 0,
      shgmAttended: 0,
      individualAttended: 0,
      conjointAttended: 0,
      target: 0,
      actual: 0,
      unresolved: 0,
    };
  }

  for (const row of gridRows) {
    const cmName = row.cmFullName && row.cmFullName !== "—" ? row.cmFullName.trim() : (row.cm || "Unassigned");
    if (!byCm[cmName]) {
      byCm[cmName] = {
        cbtTarget: 0,
        cbtActual: 0,
        cbtUnresolved: 0,
        peTarget: 0,
        peActual: 0,
        peUnresolved: 0,
        cbteConducted: cbteCountByCm[cmName] || 0,
        shgmAttended: 0,
        individualAttended: 0,
        conjointAttended: 0,
        target: 0,
        actual: 0,
        unresolved: 0,
      };
      if (!cmNames.includes(cmName)) cmNames.push(cmName);
    }
    const cbtT = Number(row.scheduledCbtSessions || 0);
    const cbtA = Number(row.attendedCbtSessions || 0);
    const cbtU = Number(row.unresolvedCbtSessions || 0);

    const peT = Number(row.scheduledPeSessions || 0);
    const peA = Number(row.attendedPeSessions || 0);
    const peU = Number(row.unresolvedPeSessions || 0);

    byCm[cmName].cbtTarget += cbtT;
    byCm[cmName].cbtActual += cbtA;
    byCm[cmName].cbtUnresolved += cbtU;

    byCm[cmName].peTarget += peT;
    byCm[cmName].peActual += peA;
    byCm[cmName].peUnresolved += peU;

    byCm[cmName].shgmAttended += Number(row.attendedShgmSessions || 0);
    byCm[cmName].individualAttended += Number(row.individualCounselingSessions || 0);
    byCm[cmName].conjointAttended += Number(row.conjointFamilySessions || 0);

    byCm[cmName].target += (cbtT + peT);
    byCm[cmName].actual += (cbtA + peA);
    byCm[cmName].unresolved += (cbtU + peU);
  }

  const displayNames = cmNames.filter((name) =>
    name !== "Unassigned" ||
    (byCm["Unassigned"] && (byCm["Unassigned"].target > 0 || byCm["Unassigned"].actual > 0 || byCm["Unassigned"].unresolved > 0))
  );

    const rows = displayNames.map((name) => {
    const b = byCm[name] || {};
    const cbtRate = b.cbtTarget > 0 ? Math.round((b.cbtActual / b.cbtTarget) * 10000) / 100 : null;
    const peRate = b.peTarget > 0 ? Math.round((b.peActual / b.peTarget) * 10000) / 100 : null;
    // HIM-approved definition: Attendance rate counts CBT sessions ONLY
    const attendanceRatePercent = cbtRate;
    const combinedRatePercent = b.target > 0 ? Math.round((b.actual / b.target) * 10000) / 100 : null;

    return {
      caseManager: name,
      // HIM-approved statutory attendance rate (CBT Only)
      attendanceRatePercent,
      combinedRatePercent,
      // Combined totals (CBT + PE)
      targetScheduled: b.target,
      actualAttended: b.actual,
      unresolvedSessions: b.unresolved,
      // Modality breakdown
      cbtTarget: b.cbtTarget,
      cbtActual: b.cbtActual,
      cbtUnresolved: b.cbtUnresolved,
      cbtRate,
      peTarget: b.peTarget,
      peActual: b.peActual,
      peUnresolved: b.peUnresolved,
      peRate,
      cbteConducted: b.cbteConducted,
      shgmAttended: b.shgmAttended,
      individualAttended: b.individualAttended,
      conjointAttended: b.conjointAttended,
    };
  });

  const totalCbtTarget = rows.reduce((s, r) => s + r.cbtTarget, 0);
  const totalCbtActual = rows.reduce((s, r) => s + r.cbtActual, 0);
  const totalCbtUnresolved = rows.reduce((s, r) => s + r.cbtUnresolved, 0);
  const totalCbtRate = totalCbtTarget > 0 ? Math.round((totalCbtActual / totalCbtTarget) * 10000) / 100 : null;

  const totalPeTarget = rows.reduce((s, r) => s + r.peTarget, 0);
  const totalPeActual = rows.reduce((s, r) => s + r.peActual, 0);
  const totalPeUnresolved = rows.reduce((s, r) => s + r.peUnresolved, 0);
  const totalPeRate = totalPeTarget > 0 ? Math.round((totalPeActual / totalPeTarget) * 10000) / 100 : null;

  const totalCbte = rows.reduce((s, r) => s + (r.cbteConducted || 0), 0);

  const totalTarget = rows.reduce((s, r) => s + r.targetScheduled, 0);
  const totalActual = rows.reduce((s, r) => s + r.actualAttended, 0);
  const totalUnresolved = rows.reduce((s, r) => s + r.unresolvedSessions, 0);
  const totalRate = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 10000) / 100 : null;

  return {
    rows,
    facilityTotal: {
      caseManager: "FACILITY TOTAL",
      targetScheduled: totalTarget,
      actualAttended: totalActual,
      unresolvedSessions: totalUnresolved,
      attendanceRatePercent: totalCbtRate,
      combinedRatePercent: totalRate,
      cbtTarget: totalCbtTarget,
      cbtActual: totalCbtActual,
      cbtUnresolved: totalCbtUnresolved,
      cbtRate: totalCbtRate,
      peTarget: totalPeTarget,
      peActual: totalPeActual,
      peUnresolved: totalPeUnresolved,
      peRate: totalPeRate,
      cbteConducted: totalCbte,
    },
  };
}

function buildHistoricalCmSubquery(alias = "p") {
  return `COALESCE(
    (SELECT h.case_manager_id FROM patient_case_manager_history h
     WHERE h.patient_id = ${alias}.id
       AND h.start_date <= ?
       AND (h.end_date IS NULL OR h.end_date >= ?)
     ORDER BY h.start_date DESC, h.id DESC LIMIT 1),
    ${alias}.assigned_case_manager_id
  )`;
}

function buildHistoricalCmNameSubquery(alias = "p", uAlias = "u") {
  return `COALESCE(
    (SELECT h.case_manager_name FROM patient_case_manager_history h
     WHERE h.patient_id = ${alias}.id
       AND h.start_date <= ?
       AND (h.end_date IS NULL OR h.end_date >= ?)
     ORDER BY h.start_date DESC, h.id DESC LIMIT 1),
    ${uAlias}.full_name,
    'Unassigned'
  )`;
}

export async function getOpCmTrackerReport(month, year, caseManagerId = null) {
  await ensureAttendanceCompletionSchema();
  await ensureProgramDurationSchema();
  await ensureInterventionSchema();
  await ensureHistoricalReportSchema();
  const { start, end } = getMonthRange(month, year);
  const endDateTime = `${end} 23:59:59`;

  const [cmUsers] = await pool.query(
    `SELECT id, full_name FROM users WHERE role = 'case_manager' ORDER BY full_name ASC`
  );
  const targetCms = caseManagerId ? cmUsers.filter((u) => u.id === caseManagerId) : cmUsers;

  const cmFilterSql = caseManagerId ? `AND ${buildHistoricalCmSubquery("p")} = ?` : "";
  const baseParams = [end, start, end, start, endDateTime, end, start];
  if (caseManagerId) baseParams.push(end, start, caseManagerId);

  const [patients] = await pool.query(
    `SELECT p.id, p.pwud_code, p.full_name, p.gender, p.municipality, p.admission_date,
            p.rehab_start_date, p.required_duration_months, p.duration_basis,
            p.duration_basis_detail, p.extension_months, p.expected_completion_date,
            p.is_archived, p.archived_at,
            COALESCE(p.admission_type, r.admission_type) AS admission_type,
            r.type_of_patient,
            COALESCE(r.referral_source, p.referral_source) AS referral_source,
            r.nature_of_confinement,
            ${buildHistoricalCmSubquery("p")} AS effective_case_manager_id,
            ${buildHistoricalCmNameSubquery("p", "u")} AS case_manager_name,
            u.full_name AS current_case_manager_name,
            p.assigned_case_manager_id AS current_case_manager_id,
            m.date_po, m.date_vlts_referral, m.date_initial_assessment, m.date_initial_tx_planning,
            m.date_initial_progress_report, m.date_case_conference, m.date_status_reporting,
            m.date_home_visit, m.date_followup_assessment, m.date_acp_planning, m.date_pdc,
            m.date_final_progress_report, m.date_referral_outside_mtrc,
            pi.comorbidities,
            (SELECT pd.discharge_date FROM patient_discharges pd
             WHERE pd.patient_id = p.id ORDER BY pd.discharge_date DESC LIMIT 1) AS discharge_date,
            (SELECT pd.outcome FROM patient_discharges pd
             WHERE pd.patient_id = p.id ORDER BY pd.discharge_date DESC LIMIT 1) AS discharge_outcome,
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
       AND (p.is_archived = FALSE OR p.archived_at IS NULL OR p.archived_at > ?)
       AND p.admission_date IS NOT NULL
       AND p.admission_date <= ?
       AND (
         NOT EXISTS (SELECT 1 FROM patient_discharges pd WHERE pd.patient_id = p.id)
         OR EXISTS (SELECT 1 FROM patient_discharges pd WHERE pd.patient_id = p.id AND pd.discharge_date >= ?)
       )
       ${cmFilterSql}
     ORDER BY case_manager_name, p.full_name`,
    baseParams
  );

  if (patients.length === 0) {
    return {
      period: { month: Number(month), year: Number(year), start, end },
      grid: [],
      summaries: {
        activeCensus: buildCensusMatrix([], "category", targetCms),
        casesManagedCensus: buildCensusMatrix([], "category", targetCms),
        enrollments: buildCensusMatrix([], "category", targetCms),
        discharges: buildDischargeSummary([], targetCms),
        nonCompleters: [],
        positiveDrugTests: [],
        attendancePerformance: buildAttendancePerformance([], targetCms),
        caseloadCount: 0,
        activeCensusCount: 0,
        dischargesCount: 0,
        enrollmentsCount: 0,
        positiveDtCount: 0,
      },
      generationMetadata: {
        reportMode: "LIVE_REGENERATED",
        generatedAt: new Date().toISOString(),
        periodLabel: `${MONTH_NAMES[Number(month) - 1] || month} ${year}`,
        effectiveHistoryApplied: true,
        archivedRecordsPreserved: true,
      },
      officialSnapshot: null,
    };
  }

  const patientIds = patients.map((p) => p.id);

  const [attendanceAgg] = await pool.query(
    `SELECT patient_id, session_type,
            SUM(CASE WHEN status != 'cancelled' THEN 1 ELSE 0 END) AS scheduled,
            SUM(CASE WHEN status IN ('present', 'late', 'absent', 'excused') THEN 1 ELSE 0 END) AS recorded,
            SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) AS attended,
            SUM(CASE WHEN status IN ('present', 'late') AND COALESCE(completion_status, CASE WHEN status = 'present' THEN 'CREDITED' ELSE 'NOT_CREDITED' END) = 'CREDITED' AND COALESCE(is_duplicate_topic, 0) = 0 THEN 1 ELSE 0 END) AS credited,
            SUM(CASE WHEN completion_status = 'PENDING_REVIEW' THEN 1 ELSE 0 END) AS pending_review,
            SUM(CASE WHEN COALESCE(is_makeup, 0) = 1 AND completion_status = 'CREDITED' THEN 1 ELSE 0 END) AS makeup_credited,
            SUM(CASE WHEN COALESCE(is_duplicate_topic, 0) = 1 THEN 1 ELSE 0 END) AS repeat_count,
            SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) AS late_count,
            SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) AS excused_count,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
     FROM attendance
     WHERE patient_id IN (?) AND session_date BETWEEN ? AND ?
     GROUP BY patient_id, session_type`,
    [patientIds, start, end]
  );

  // Query pre-scheduled sessions from session_roster so unrecorded sessions never vanish from the denominator
  const [rosterAgg] = await pool.query(
    `SELECT sr.patient_id, s.session_type,
            COUNT(DISTINCT s.id) AS scheduled_roster_count
     FROM session_roster sr
     JOIN sessions s ON s.id = sr.session_id
     WHERE sr.patient_id IN (?)
       AND s.session_date BETWEEN ? AND ?
       AND COALESCE(s.session_status, 'COMPLETED') NOT IN ('CANCELLED', 'RESCHEDULED')
     GROUP BY sr.patient_id, s.session_type`,
    [patientIds, start, end]
  ).catch(() => [[]]);

  // Query past/today sessions where patient was expected in roster but has NO recorded attendance (unresolved)
  const [unresolvedAgg] = await pool.query(
    `SELECT sr.patient_id, s.session_type,
            COUNT(DISTINCT s.id) AS unresolved_count
     FROM session_roster sr
     JOIN sessions s ON s.id = sr.session_id
     LEFT JOIN attendance a ON a.session_id = sr.session_id AND a.patient_id = sr.patient_id
     WHERE sr.patient_id IN (?)
       AND s.session_date BETWEEN ? AND ?
       AND s.session_date <= CURDATE()
       AND COALESCE(s.session_status, 'COMPLETED') NOT IN ('CANCELLED', 'RESCHEDULED')
       AND a.id IS NULL
     GROUP BY sr.patient_id, s.session_type`,
    [patientIds, start, end]
  ).catch(() => [[]]);

  const [dtAgg] = await pool.query(
    `SELECT patient_id, COUNT(*) AS dt_count
     FROM drug_test_logs
     WHERE patient_id IN (?)
       AND test_date BETWEEN ? AND ?
       AND COALESCE(result, '') != 'NOT_PERFORMED'
     GROUP BY patient_id`,
    [patientIds, start, end]
  ).catch(() => [[]]);

  const [consultAgg] = await pool.query(
    `SELECT patient_id, consult_type, consult_date, notes
     FROM patient_consult_logs
     WHERE patient_id IN (?) AND consult_date BETWEEN ? AND ?
     ORDER BY consult_date ASC`,
    [patientIds, start, end]
  ).catch(() => [[]]);

  // Query dated interventions from patient_interventions for this reporting month
  const [interventionsAgg] = await pool.query(
    `SELECT i.id, i.patient_id, i.intervention_date, i.intervention_type, i.consult_type,
            i.responsible_staff_name, i.location_setting, i.qualifies_for_monthly_tracker, i.remarks
     FROM patient_interventions i
     WHERE i.patient_id IN (?) AND i.intervention_date BETWEEN ? AND ?
     ORDER BY i.intervention_date ASC, i.id ASC`,
    [patientIds, start, end]
  ).catch(() => [[]]);

  // Query milestone history records dated in this reporting month
  const [milestonesHistoryAgg] = await pool.query(
    `SELECT patient_id, milestone_key, milestone_date
     FROM patient_milestone_history
     WHERE patient_id IN (?) AND milestone_date BETWEEN ? AND ?
     ORDER BY milestone_date ASC`,
    [patientIds, start, end]
  ).catch(() => [[]]);

  // Query progress notes written in this reporting month
  const [notesAgg] = await pool.query(
    `SELECT patient_id, COUNT(*) AS note_count
     FROM progress_notes
     WHERE patient_id IN (?) AND note_date BETWEEN ? AND ?
     GROUP BY patient_id`,
    [patientIds, start, end]
  ).catch(() => [[]]);

  const attByPatient = new Map();
  for (const row of attendanceAgg) {
    if (!attByPatient.has(row.patient_id)) attByPatient.set(row.patient_id, []);
    attByPatient.get(row.patient_id).push(row);
  }

  const rosterByPatient = new Map();
  for (const row of rosterAgg) {
    if (!rosterByPatient.has(row.patient_id)) rosterByPatient.set(row.patient_id, []);
    rosterByPatient.get(row.patient_id).push(row);
  }

  const unresolvedByPatient = new Map();
  for (const row of unresolvedAgg) {
    if (!unresolvedByPatient.has(row.patient_id)) unresolvedByPatient.set(row.patient_id, []);
    unresolvedByPatient.get(row.patient_id).push(row);
  }

  const interventionsByPatient = new Map();
  for (const row of interventionsAgg) {
    if (!interventionsByPatient.has(row.patient_id)) interventionsByPatient.set(row.patient_id, []);
    interventionsByPatient.get(row.patient_id).push(row);
  }

  const consultsByPatient = new Map();
  for (const row of consultAgg) {
    if (!consultsByPatient.has(row.patient_id)) consultsByPatient.set(row.patient_id, []);
    consultsByPatient.get(row.patient_id).push(row);
  }

  const milestonesByPatient = new Map();
  for (const row of milestonesHistoryAgg) {
    if (!milestonesByPatient.has(row.patient_id)) milestonesByPatient.set(row.patient_id, []);
    milestonesByPatient.get(row.patient_id).push(row);
  }

  const notesByPatient = new Map(notesAgg.map((r) => [r.patient_id, Number(r.note_count || 0)]));
  const dtByPatient = new Map(dtAgg.map((r) => [r.patient_id, r.dt_count]));
  const lifetimeProgressMap = await getBulkUnifiedPatientProgress(pool, patientIds).catch(() => new Map());

  const sumField = (rows, field) => rows.reduce((sum, r) => sum + Number(r[field] || 0), 0);

  const grid = patients.map((p) => {
    const att = attByPatient.get(p.id) || [];
    const roster = rosterByPatient.get(p.id) || [];
    const unres = unresolvedByPatient.get(p.id) || [];
    const lifetimeProg = lifetimeProgressMap.get(Number(p.id));
    const pInterventions = interventionsByPatient.get(p.id) || [];
    const pConsultLogs = consultsByPatient.get(p.id) || [];
    const pMilestoneHistory = milestonesByPatient.get(p.id) || [];
    const noteCount = notesByPatient.get(p.id) || 0;

    const rosterScheduledCbt = countByType(roster, CBT_TYPES, "scheduled_roster_count");
    const attScheduledCbt = countByType(att, CBT_TYPES, "scheduled");
    const scheduledCbt = Math.max(rosterScheduledCbt, attScheduledCbt);

    const attendedCbt = countByType(att, CBT_TYPES, "credited");
    const rawAttendedCbt = countByType(att, CBT_TYPES, "attended");

    const rosterScheduledPe = countByType(roster, PE_TYPES, "scheduled_roster_count");
    const attScheduledPe = countByType(att, PE_TYPES, "scheduled");
    const scheduledPe = Math.max(rosterScheduledPe, attScheduledPe);

    const attendedPe = countByType(att, PE_TYPES, "credited");
    const rawAttendedPe = countByType(att, PE_TYPES, "attended");
    const attendedShgm = countByType(att, ["SHGM"], "credited");
    const individualSessions = countByType(att, ["INDIVIDUAL_COUNSELING"], "credited");
    const conjointSessions = countByType(att, ["CONJOINT_FAMILY"], "credited");
    const coreAttended = countByType(att, CORE_ATTENDANCE_TYPES, "attended")
      + countByType(att, ["SHGM", "INDIVIDUAL_COUNSELING", "CONJOINT_FAMILY"], "attended");

    const unresolvedCbtSessions = countByType(unres, CBT_TYPES, "unresolved_count");
    const unresolvedPeSessions = countByType(unres, PE_TYPES, "unresolved_count");
    const unresolvedSessions = sumField(unres, "unresolved_count");

    const pendingReviewSessions = sumField(att, "pending_review");
    const makeupCreditedSessions = sumField(att, "makeup_credited");
    const repeatTopicSessions = sumField(att, "repeat_count");
    const lateSessions = sumField(att, "late_count");
    const excusedSessions = sumField(att, "excused_count");
    const absentSessions = sumField(att, "absent_count");
    const cancelledSessions = sumField(att, "cancelled_count");

    // Aggregate all consultations in month from both patient_consult_logs and patient_interventions
    const allConsults = [
      ...pConsultLogs.map((c) => ({
        date: c.consult_date,
        type: c.consult_type,
        notes: c.notes,
        source: "consult_log",
      })),
      ...pInterventions
        .filter((i) => i.intervention_type === "CONSULTATION_INTERNAL" || Boolean(i.consult_type))
        .map((i) => ({
          date: i.intervention_date,
          type: i.consult_type || "M",
          notes: i.remarks,
          staff: i.responsible_staff_name,
          source: "intervention",
        })),
    ];
    // Preserve distinct consultation types (e.g. "M, P") and chronological details
    const distinctConsultTypes = Array.from(new Set(allConsults.map((c) => c.type).filter(Boolean)));
    const consultTypeWithinMtrc = distinctConsultTypes.join(", ");

    // Break down interventions in this reporting month
    const qualifyingInterventions = pInterventions.filter((i) => Number(i.qualifies_for_monthly_tracker) === 1);
    const homeVisitsInMonth = pInterventions.filter((i) => i.intervention_type === "HOME_VISIT");
    const caseConfsInMonth = pInterventions.filter((i) => i.intervention_type === "CASE_CONFERENCE");
    const familyInMonth = pInterventions.filter((i) => i.intervention_type === "FAMILY_COORDINATION");
    const statusReportsInMonth = pInterventions.filter((i) => i.intervention_type === "STATUS_REPORT_PREP");
    const outsideReferralsInMonth = pInterventions.filter((i) => i.intervention_type === "REFERRAL_OUTSIDE");
    const txPlansInMonth = pInterventions.filter((i) => i.intervention_type === "TREATMENT_PLANNING");
    const assessmentsInMonth = pInterventions.filter((i) => i.intervention_type === "ASSESSMENT_CLINICAL");
    const crisisInMonth = pInterventions.filter((i) => i.intervention_type === "CRISIS_INTERVENTION");
    const aftercareInMonth = pInterventions.filter((i) => i.intervention_type === "AFTERCARE_PLANNING");
    const otherInMonth = pInterventions.filter((i) => i.intervention_type === "OTHER_CLINICAL");

    // Milestones occurring in this reporting month
    const homeVisitMilestones = pMilestoneHistory.filter((m) => m.milestone_key === "date_home_visit");
    const caseConfMilestones = pMilestoneHistory.filter((m) => m.milestone_key === "date_case_conference");
    const statusReportMilestones = pMilestoneHistory.filter((m) => m.milestone_key === "date_status_reporting");
    const referralMilestones = pMilestoneHistory.filter((m) => m.milestone_key === "date_referral_outside_mtrc");
    const txPlanMilestones = pMilestoneHistory.filter((m) => m.milestone_key === "date_initial_tx_planning");
    const assessmentMilestones = pMilestoneHistory.filter((m) => m.milestone_key === "date_initial_assessment");
    const pdcMilestones = pMilestoneHistory.filter((m) => m.milestone_key === "date_pdc");

    // Derive milestone dates from dated records in this reporting month (falling back to baseline)
    const monthHomeVisitDate = homeVisitsInMonth.length > 0
      ? homeVisitsInMonth[homeVisitsInMonth.length - 1].intervention_date
      : homeVisitMilestones.length > 0
      ? homeVisitMilestones[homeVisitMilestones.length - 1].milestone_date
      : p.date_home_visit;

    const monthCaseConfDate = caseConfsInMonth.length > 0
      ? caseConfsInMonth[caseConfsInMonth.length - 1].intervention_date
      : caseConfMilestones.length > 0
      ? caseConfMilestones[caseConfMilestones.length - 1].milestone_date
      : p.date_case_conference;

    const monthStatusReportDate = statusReportsInMonth.length > 0
      ? statusReportsInMonth[statusReportsInMonth.length - 1].intervention_date
      : statusReportMilestones.length > 0
      ? statusReportMilestones[statusReportMilestones.length - 1].milestone_date
      : p.date_status_reporting;

    const monthReferralDate = outsideReferralsInMonth.length > 0
      ? outsideReferralsInMonth[outsideReferralsInMonth.length - 1].intervention_date
      : referralMilestones.length > 0
      ? referralMilestones[referralMilestones.length - 1].milestone_date
      : p.date_referral_outside_mtrc || null;

    const monthTxPlanDate = txPlansInMonth.length > 0
      ? txPlansInMonth[txPlansInMonth.length - 1].intervention_date
      : txPlanMilestones.length > 0
      ? txPlanMilestones[txPlanMilestones.length - 1].milestone_date
      : p.date_initial_tx_planning;

    const monthAssessmentDate = assessmentsInMonth.length > 0
      ? assessmentsInMonth[assessmentsInMonth.length - 1].intervention_date
      : assessmentMilestones.length > 0
      ? assessmentMilestones[assessmentMilestones.length - 1].milestone_date
      : p.date_initial_assessment;

    const monthPdcDate = pdcMilestones.length > 0
      ? pdcMilestones[pdcMilestones.length - 1].milestone_date
      : p.date_pdc;

    // Under MTRC clinical definition (Task 7):
    // "A patient who receives a documented home visit but attends no group session can still have that intervention reflected in the monthly tracker"
    // Interventions conducted in month is TRUE if patient had ANY of:
    // 1. Group / individual sessions attended (coreAttended > 0)
    // 2. Documented qualifying interventions (home visits, conferences, reports, referrals, family coordination, etc.)
    // 3. Clinical consultations within MTRC (Medical, Psychiatric, Dental, Psychological)
    // 4. Milestone history events recorded in the reporting month
    // 5. Clinical progress notes written during the month
    const totalClinicalInterventions =
      coreAttended + qualifyingInterventions.length + allConsults.length + pMilestoneHistory.length + noteCount;
    const hasInterventionInMonth =
      coreAttended > 0 ||
      qualifyingInterventions.length > 0 ||
      allConsults.length > 0 ||
      pMilestoneHistory.length > 0 ||
      noteCount > 0;

    // Human-readable summary items for tooltip/badge
    const summaryList = [];
    if (coreAttended > 0) summaryList.push(`${coreAttended} Session${coreAttended > 1 ? "s" : ""}`);
    if (homeVisitsInMonth.length > 0) summaryList.push(`${homeVisitsInMonth.length} Home Visit${homeVisitsInMonth.length > 1 ? "s" : ""}`);
    if (allConsults.length > 0) summaryList.push(`${allConsults.length} Consult (${distinctConsultTypes.join(", ")})`);
    if (caseConfsInMonth.length > 0) summaryList.push(`${caseConfsInMonth.length} Case Conf`);
    if (familyInMonth.length > 0) summaryList.push(`${familyInMonth.length} Family Coord`);
    if (statusReportsInMonth.length > 0) summaryList.push(`${statusReportsInMonth.length} Status Report`);
    if (outsideReferralsInMonth.length > 0) summaryList.push(`${outsideReferralsInMonth.length} Outside Referral`);
    if (txPlansInMonth.length > 0) summaryList.push(`ITP Planning`);
    if (assessmentsInMonth.length > 0) summaryList.push(`Assessment`);
    if (crisisInMonth.length > 0) summaryList.push(`${crisisInMonth.length} Crisis Interv`);
    if (otherInMonth.length > 0) summaryList.push(`${otherInMonth.length} Other Clinical`);
    if (noteCount > 0) summaryList.push(`${noteCount} Progress Note${noteCount > 1 ? "s" : ""}`);

    const comorb = parseComorbidities(p.comorbidities);
    const category = mapCategory(p.admission_type, p.type_of_patient, p.nature_of_confinement, p.referral_source);
    const newEnrollee = p.admission_date >= start && p.admission_date <= end ? 1 : 0;
    const dischargeDateInMonth = onlyInMonth(p.discharge_date, start, end);

    return {
      id: p.id,
      pwudCode: p.pwud_code || "—",
      clientName: p.full_name,
      sex: sexCode(p.gender),
      lgu: p.municipality || "—",
      cm: caseManagerKey(p.case_manager_name),
      cmFullName: p.case_manager_name || "—",
      category,
      dateEnrolled: formatTrackerDate(p.admission_date),
      newEnrollee,
      datePo: onlyInMonth(p.date_po, start, end),
      dateVltsReferral: onlyInMonth(p.date_vlts_referral, start, end),
      dateInitialAssessment: onlyInMonth(monthAssessmentDate, start, end),
      dateInitialTreatmentPlanning: onlyInMonth(monthTxPlanDate, start, end),
      dateInitialProgressReporting: onlyInMonth(p.date_initial_progress_report, start, end),
      scheduledCbtSessions: scheduledCbt,
      attendedCbtSessions: attendedCbt,
      rawAttendedCbtSessions: rawAttendedCbt,
      scheduledPeSessions: scheduledPe,
      attendedPeSessions: attendedPe,
      rawAttendedPeSessions: rawAttendedPe,
      attendedShgmSessions: attendedShgm,
      individualCounselingSessions: individualSessions,
      conjointFamilySessions: conjointSessions,
      unresolvedSessions,
      unresolvedCbtSessions,
      unresolvedPeSessions,
      pendingReviewSessions,
      makeupCreditedSessions,
      repeatTopicSessions,
      lateSessions,
      excusedSessions,
      absentSessions,
      cancelledSessions,
      drugTestsConducted: dtByPatient.get(p.id) || 0,
      dateReferralOutsideMtrc: onlyInMonth(monthReferralDate, start, end),
      dateCaseConference: onlyInMonth(monthCaseConfDate, start, end),
      dateStatusReporting: onlyInMonth(monthStatusReportDate, start, end),
      dateHomeVisit: onlyInMonth(monthHomeVisitDate, start, end),
      dateFollowupAssessment: onlyInMonth(p.date_followup_assessment, start, end),
      dateAcpTreatmentPlanning: onlyInMonth(p.date_acp_planning, start, end),
      datePdc: onlyInMonth(monthPdcDate, start, end),
      dateFinalProgressReporting: onlyInMonth(p.date_final_progress_report, start, end),
      lifetimeMilestones: {
        datePo: p.date_po,
        dateVltsReferral: p.date_vlts_referral,
        dateInitialAssessment: p.date_initial_assessment,
        dateInitialTreatmentPlanning: p.date_initial_tx_planning,
        dateInitialProgressReporting: p.date_initial_progress_report,
        dateReferralOutsideMtrc: p.date_referral_outside_mtrc,
        dateCaseConference: p.date_case_conference,
        dateStatusReporting: p.date_status_reporting,
        dateHomeVisit: p.date_home_visit,
        dateFollowupAssessment: p.date_followup_assessment,
        dateAcpTreatmentPlanning: p.date_acp_planning,
        datePdc: p.date_pdc,
        dateFinalProgressReporting: p.date_final_progress_report,
      },
      interventionsConductedInMonth: hasInterventionInMonth ? 1 : 0,
      interventionTotalServices: totalClinicalInterventions,
      interventionSummaryText: summaryList.join(" • "),
      interventionSummaryList: summaryList,
      qualifyingInterventionsList: qualifyingInterventions,
      consultDetailsList: allConsults,
      medicalComorbidity: comorb.medical,
      psychiatricComorbidity: comorb.psychiatric,
      consultTypeWithinMtrc: consultTypeWithinMtrc || "",
      consultTypeAndDates: allConsults.length > 0
        ? allConsults.map((c) => (c.date ? `${c.type || "Consult"} (${formatTrackerDate(c.date)})` : (c.type || "Consult"))).join(", ")
        : consultTypeWithinMtrc || "",
      comorbidityDetails: comorb.details,
      dateOfDischarge: dischargeDateInMonth,
      statusOfDischarge: dischargeDateInMonth && (p.discharge_outcome || p.discharge_status) ? mapDischargeStatus(p.discharge_status, p.discharge_reason, p.discharge_outcome) : "",
      remarks: p.discharge_intervention || "",
      durationSummary: evaluatePatientDuration(p),
      effectiveCaseManager: p.case_manager_name,
      currentCaseManager: p.current_case_manager_name || "Unassigned",
      isReassigned: Boolean(p.current_case_manager_id && Number(p.current_case_manager_id) !== Number(p.effective_case_manager_id)),
      isArchived: Boolean(p.is_archived),
      archivedAt: p.archived_at ? formatTrackerDate(p.archived_at) : null,
      lifetimeCurriculum: lifetimeProg
        ? {
            cbtCompleted: lifetimeProg.components.cbt.completed,
            cbtRequired: 28,
            cbteCompleted: lifetimeProg.components.cbte.completed,
            cbteRequired: 3,
            peCompleted: lifetimeProg.components.pe.completed,
            peRequired: 12,
            totalCoreCompleted: lifetimeProg.components.totalCore.completed,
            totalCoreRequired: 43,
            isCoreComplete: lifetimeProg.isCoreComplete,
            missingSummary: lifetimeProg.missingRequirements.summaryText,
          }
        : null,
    };
  });

  const activeParams = [end, start, endDateTime, end, end];
  if (caseManagerId) activeParams.push(end, start, caseManagerId);
  const [activePatients] = await pool.query(
    `SELECT p.id, p.gender, p.admission_date,
            COALESCE(p.admission_type, r.admission_type) AS admission_type,
            r.type_of_patient,
            COALESCE(r.referral_source, p.referral_source) AS referral_source,
            r.nature_of_confinement,
            ${buildHistoricalCmNameSubquery("p", "u")} AS case_manager_name
     FROM patients p
     LEFT JOIN patient_referrals r ON r.patient_id = p.id
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     WHERE p.case_type = 'substance_use'
       AND (p.is_archived = FALSE OR p.archived_at IS NULL OR p.archived_at > ?)
       AND p.admission_date IS NOT NULL
       AND p.admission_date <= ?
       AND (
         NOT EXISTS (SELECT 1 FROM patient_discharges pd WHERE pd.patient_id = p.id)
         OR EXISTS (SELECT 1 FROM patient_discharges pd WHERE pd.patient_id = p.id AND pd.discharge_date > ?)
       )
       ${cmFilterSql}`,
    activeParams
  );
  const activeForCensus = activePatients.map((p) => ({
    ...p,
    category: mapCategory(p.admission_type, p.type_of_patient, p.nature_of_confinement, p.referral_source),
  }));

  const enrollmentParams = [end, start, endDateTime, start, end];
  if (caseManagerId) enrollmentParams.push(end, start, caseManagerId);
  const [enrollmentPatients] = await pool.query(
    `SELECT p.gender,
            COALESCE(p.admission_type, r.admission_type) AS admission_type,
            r.type_of_patient,
            COALESCE(r.referral_source, p.referral_source) AS referral_source,
            r.nature_of_confinement,
            ${buildHistoricalCmNameSubquery("p", "u")} AS case_manager_name
     FROM patients p
     LEFT JOIN patient_referrals r ON r.patient_id = p.id
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     WHERE p.case_type = 'substance_use'
       AND (p.is_archived = FALSE OR p.archived_at IS NULL OR p.archived_at > ?)
       AND p.admission_date BETWEEN ? AND ?
       ${cmFilterSql}`,
    enrollmentParams
  );
  const enrollForCensus = enrollmentPatients.map((p) => ({
    ...p,
    category: mapCategory(p.admission_type, p.type_of_patient, p.nature_of_confinement, p.referral_source),
  }));

  const dischargeParams = [end, start, endDateTime, start, end];
  if (caseManagerId) dischargeParams.push(end, start, caseManagerId);
  const [monthDischarges] = await pool.query(
    `SELECT p.full_name, p.gender, p.admission_date, p.pwud_code,
            ${buildHistoricalCmNameSubquery("p", "u")} AS case_manager_name,
            pd.discharge_date, pd.status AS discharge_status, pd.outcome, pd.reason,
            pd.intervention_upon_discharge, pd.treatment_duration_months
     FROM patient_discharges pd
     JOIN patients p ON p.id = pd.patient_id
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     WHERE p.case_type = 'substance_use'
       AND (p.is_archived = FALSE OR p.archived_at IS NULL OR p.archived_at > ?)
       AND pd.discharge_date BETWEEN ? AND ?
       ${cmFilterSql}`,
    dischargeParams
  );

  const nonCompleters = monthDischarges
    .filter((d) => d.outcome === "NON_COMPLETER" || (d.outcome !== "COMPLETER" && d.discharge_status !== "Completer (Graduated)" && d.discharge_status !== "Completer" && d.discharge_status !== "COMPLETER"))
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

  const dtParams = [end, start, endDateTime, start, end];
  if (caseManagerId) dtParams.push(end, start, caseManagerId);
  const [positiveDt] = await pool.query(
    `SELECT ${buildHistoricalCmNameSubquery("p", "u")} AS case_manager_name,
            p.full_name, p.admission_date,
            d.substance_tested, d.test_date
     FROM drug_test_logs d
     JOIN patients p ON p.id = d.patient_id
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     WHERE p.case_type = 'substance_use'
       AND (p.is_archived = FALSE OR p.archived_at IS NULL OR p.archived_at > ?)
       AND d.result = 'POSITIVE'
       AND d.test_date BETWEEN ? AND ?
       ${cmFilterSql}
     ORDER BY case_manager_name, p.full_name, d.test_date`,
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

  // Query formal CBT-E evaluations completed during reporting month
  const cbteParams = [end, start, endDateTime, start, end];
  if (caseManagerId) cbteParams.push(end, start, caseManagerId);
  const [cbteInMonth] = await pool.query(
    `SELECT e.id, e.patient_id, e.evaluation_type, e.evaluation_date,
            e.evaluation_date AS session_date,
            'CBTE' AS session_type,
            CONCAT('CBT-E ', COALESCE(e.evaluation_type, 'Evaluation')) AS requirement_title,
            'present' AS attendance_status,
            'CREDITED' AS completion_status,
            COALESCE(e.clinical_judgment, 'Formal CBT-E Evaluation Conducted') AS decision_reason,
            COALESCE(e.self_reported_status, '—') AS relapse_risk,
            COALESCE(e.staff_risk_assessment, '—') AS staff_risk_assessment,
            NULL AS drug_test_result,
            p.full_name AS client_name, p.pwud_code,
            ${buildHistoricalCmNameSubquery("p", "u")} AS case_manager_name,
            '—' AS facilitator_name,
            0 AS is_makeup,
            0 AS is_duplicate_topic
     FROM patient_cbte_evaluations e
     JOIN patients p ON p.id = e.patient_id
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     WHERE p.case_type = 'substance_use'
       AND (p.is_archived = FALSE OR p.archived_at IS NULL OR p.archived_at > ?)
       AND e.evaluation_date BETWEEN ? AND ?
       ${cmFilterSql}
     ORDER BY e.evaluation_date DESC, e.id DESC`,
    cbteParams
  ).catch((err) => {
    console.error("cbteInMonth query error:", err.message);
    return [[]];
  });

  const cbteCountByCm = {};
  for (const row of cbteInMonth) {
    const cm = row.case_manager_name ? row.case_manager_name.trim() : "Unassigned";
    cbteCountByCm[cm] = (cbteCountByCm[cm] || 0) + 1;
  }

  // Query detailed session attendance records for drilldown traceability
  const traceAttParams = [end, start, endDateTime, start, end];
  if (caseManagerId) traceAttParams.push(end, start, caseManagerId);
  const [detailedAttendance] = await pool.query(
    `SELECT a.id, a.patient_id, p.full_name AS client_name, p.pwud_code,
            a.session_date, s.session_time AS session_time, a.session_type,
            COALESCE(a.curriculum_requirement, a.topic_name, s.topic_name, a.session_type) AS requirement_title,
            a.status AS attendance_status, a.arrival_time,
            COALESCE(a.completion_status, CASE WHEN a.status = 'present' THEN 'CREDITED' ELSE 'NOT_CREDITED' END) AS completion_status,
            a.decision_reason, a.relapse_risk, a.staff_risk_assessment, a.drug_test_result,
            ${buildHistoricalCmNameSubquery("p", "u")} AS case_manager_name,
            COALESCE(a.facilitator_name, s.facilitator_name, '—') AS facilitator_name,
            COALESCE(a.is_makeup, 0) AS is_makeup,
            COALESCE(a.is_duplicate_topic, 0) AS is_duplicate_topic
     FROM attendance a
     JOIN patients p ON p.id = a.patient_id
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     LEFT JOIN sessions s ON s.id = a.session_id
     WHERE p.case_type = 'substance_use'
       AND (p.is_archived = FALSE OR p.archived_at IS NULL OR p.archived_at > ?)
       AND a.session_date BETWEEN ? AND ?
       ${cmFilterSql}
     ORDER BY a.session_date DESC, s.session_time DESC, a.id DESC`,
    traceAttParams
  ).catch((err) => {
    console.error("detailedAttendance query error:", err.message);
    return [[]];
  });

  // Detailed unresolved expected roster sessions for drilldown traceability
  const traceUnresParams = [end, start, endDateTime, start, end];
  if (caseManagerId) traceUnresParams.push(end, start, caseManagerId);
  const [detailedUnresolved] = await pool.query(
    `SELECT sr.session_id, sr.patient_id, p.full_name AS client_name, p.pwud_code,
            s.session_date, s.session_time AS session_time, s.session_type,
            COALESCE(s.curriculum_requirement, s.topic_name, s.session_type) AS requirement_title,
            'UNRESOLVED' AS attendance_status,
            'AWAITING_ENCODING' AS completion_status,
            'Expected session attendance not yet encoded' AS decision_reason,
            ${buildHistoricalCmNameSubquery("p", "u")} AS case_manager_name,
            COALESCE(s.facilitator_name, '—') AS facilitator_name
     FROM session_roster sr
     JOIN sessions s ON s.id = sr.session_id
     JOIN patients p ON p.id = sr.patient_id
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     LEFT JOIN attendance a ON a.session_id = sr.session_id AND a.patient_id = sr.patient_id
     WHERE p.case_type = 'substance_use'
       AND (p.is_archived = FALSE OR p.archived_at IS NULL OR p.archived_at > ?)
       AND s.session_date BETWEEN ? AND ?
       AND s.session_date <= CURDATE()
       AND COALESCE(s.session_status, 'COMPLETED') NOT IN ('CANCELLED', 'RESCHEDULED')
       AND a.id IS NULL
       ${cmFilterSql}
     ORDER BY s.session_date DESC, s.session_time DESC, sr.session_id DESC`,
    traceUnresParams
  ).catch((err) => {
    console.error("detailedUnresolved query error:", err.message);
    return [[]];
  });

  const payload = {
    period: { month: Number(month), year: Number(year), start, end },
    grid,
    summaries: {
      activeCensus: buildCensusMatrix(activeForCensus, "category", targetCms),
      casesManagedCensus: buildCensusMatrix(patients.map((p) => ({
        ...p,
        category: mapCategory(p.admission_type, p.type_of_patient, p.nature_of_confinement, p.referral_source),
      })), "category", targetCms),
      enrollments: buildCensusMatrix(enrollForCensus, "category", targetCms),
      discharges: buildDischargeSummary(monthDischarges, targetCms),
      nonCompleters,
      positiveDrugTests,
      attendancePerformance: buildAttendancePerformance(grid, targetCms, cbteCountByCm),
      caseloadCount: patients.length,
      activeCensusCount: activeForCensus.length,
      dischargesCount: monthDischarges.length,
      enrollmentsCount: enrollForCensus.length,
      positiveDtCount: positiveDt.length,
      caseloadReconciliation: {
        reportingPeriod: { month: Number(month), year: Number(year), start, end },
        casesManagedDuringMonth: patients.length,
        monthEndActiveCensus: activeForCensus.length,
        dischargesDuringMonth: monthDischarges.length,
        newEnrollmentsDuringMonth: enrollForCensus.length,
        formula: `Month-End Active Census (${activeForCensus.length}) = Total Cases Managed (${patients.length}) - Discharges in Month (${monthDischarges.length})`,
        explanation: "Cases Managed represents all clients actively served or managed during ANY point in the calendar month. Active Census represents only those clients remaining actively enrolled at the close of the month (excluding those discharged during the month).",
        dischargedPatients: monthDischarges.map((d) => ({
          clientName: d.full_name,
          pwudCode: d.pwud_code,
          dischargeDate: formatTrackerDate(d.discharge_date),
          status: d.discharge_status,
          reason: d.reason,
          caseManager: d.case_manager_name || "Unassigned",
        })),
      },
    },
    traceability: {
      attendanceRecords: detailedAttendance,
      unresolvedRecords: detailedUnresolved,
      cbteRecords: cbteInMonth,
    },
  };

  // Check if an official issued snapshot exists for this month & scope
  const [snapshots] = await pool.query(
    `SELECT id, snapshot_title, status, version, issued_by_name, issued_at, notes, summary_json
     FROM report_snapshots
     WHERE report_type = 'OP_CM_TRACKER'
       AND reporting_month = ?
       AND reporting_year = ?
       AND (case_manager_id = ? OR (? IS NULL AND case_manager_id IS NULL))
       AND status = 'OFFICIAL_ISSUED'
     ORDER BY version DESC, id DESC LIMIT 1`,
    [Number(month), Number(year), caseManagerId || null, caseManagerId || null]
  ).catch(() => [[]]);

  let officialSnapshot = null;
  if (snapshots && snapshots.length > 0) {
    const s = snapshots[0];
    const snapSummaries = typeof s.summary_json === "string" ? JSON.parse(s.summary_json) : s.summary_json;
    const diffs = [];
    const liveCensus = activeForCensus.length;
    const snapCensus = snapSummaries?.activeCensusCount ?? null;
    if (snapCensus !== null && liveCensus !== snapCensus) {
      diffs.push(`Active Census: Live ${liveCensus} vs Issued ${snapCensus}`);
    }
    const liveCaseload = patients.length;
    const snapCaseload = snapSummaries?.caseloadCount ?? null;
    if (snapCaseload !== null && liveCaseload !== snapCaseload) {
      diffs.push(`Caseload Managed: Live ${liveCaseload} vs Issued ${snapCaseload}`);
    }
    const liveRate = payload.summaries.attendancePerformance?.facilityTotal?.attendanceRatePercent;
    const snapRate = snapSummaries?.attendancePerformance?.facilityTotal?.attendanceRatePercent;
    if (snapRate !== undefined && liveRate !== snapRate) {
      diffs.push(`Attendance Rate: Live ${liveRate != null ? `${liveRate}%` : "N/A"} vs Issued ${snapRate != null ? `${snapRate}%` : "N/A"}`);
    }

    officialSnapshot = {
      id: s.id,
      title: s.snapshot_title,
      version: s.version,
      issuedByName: s.issued_by_name,
      issuedAt: s.issued_at,
      notes: s.notes,
      summaries: snapSummaries,
      isIdentical: diffs.length === 0,
      differences: diffs,
    };
  }

  return {
    ...payload,
    generationMetadata: {
      reportMode: officialSnapshot ? "OFFICIAL_SNAPSHOT_AVAILABLE" : "LIVE_REGENERATED",
      generatedAt: new Date().toISOString(),
      periodLabel: `${MONTH_NAMES[Number(month) - 1] || month} ${year}`,
      effectiveHistoryApplied: true,
      archivedRecordsPreserved: true,
    },
    officialSnapshot,
  };
}

export async function getOpCmTrackerDrilldown(month, year, caseManagerId = null, metric = "all", modality = "all") {
  const report = await getOpCmTrackerReport(month, year, caseManagerId);
  const { attendanceRecords = [], unresolvedRecords = [], cbteRecords = [] } = report.traceability || {};
  let list = [];

  if (metric === "unresolved") {
    list = unresolvedRecords;
  } else if (metric === "cbte") {
    list = cbteRecords;
  } else {
    list = attendanceRecords;
    if (metric === "attended") {
      list = list.filter((r) => r.attendance_status === "present" || r.attendance_status === "late");
    } else if (metric === "credited") {
      list = list.filter((r) => r.completion_status === "CREDITED");
    } else if (metric === "absent") {
      list = list.filter((r) => r.attendance_status === "absent");
    } else if (metric === "excused") {
      list = list.filter((r) => r.attendance_status === "excused");
    }
  }

  if (modality && modality !== "all") {
    list = list.filter((r) => r.session_type === modality || (modality === "CBT_GROUP" && (r.session_type === "CBT_GROUP" || r.evaluation_type)));
  }

  return {
    period: report.period,
    metric,
    modality,
    totalCount: list.length,
    records: list,
  };
}

/**
 * Issues an official statutory monthly snapshot for OP CM Tracker, freezing summaries for audit.
 */
export async function issueOpCmTrackerSnapshot({ month, year, caseManagerId = null, title = null, notes = null, user }) {
  await ensureHistoricalReportSchema();
  const m = Number(month);
  const y = Number(year);
  const cmId = caseManagerId ? Number(caseManagerId) : null;

  const issuerName = user?.fullName || user?.full_name || user?.username || "Staff Member";
  const issuerUsername = user?.username || "staff";
  const issuerId = user?.id || 1;

  let cmName = "Facility-Wide";
  if (cmId) {
    const [cmRows] = await pool.query("SELECT full_name FROM users WHERE id = ?", [cmId]).catch(() => [[]]);
    cmName = cmRows?.[0]?.full_name || `Case Manager #${cmId}`;
  }

  const liveReport = await getOpCmTrackerReport(m, y, cmId);
  const defaultTitle = `Official OP CM Tracker Closing: ${MONTH_NAMES[m - 1] || m} ${y}${cmId ? ` (${cmName})` : " (Facility-Wide)"}`;
  const snapshotTitle = (title && String(title).trim()) ? String(title).trim() : defaultTitle;

  const [prevSnapshots] = await pool.query(
    `SELECT id, version FROM report_snapshots
     WHERE report_type = 'OP_CM_TRACKER'
       AND reporting_month = ?
       AND reporting_year = ?
       AND (case_manager_id = ? OR (? IS NULL AND case_manager_id IS NULL))
     ORDER BY version DESC LIMIT 1`,
    [m, y, cmId, cmId]
  ).catch(() => [[]]);

  const nextVersion = prevSnapshots.length > 0 ? prevSnapshots[0].version + 1 : 1;

  if (prevSnapshots.length > 0) {
    await pool.query(
      `UPDATE report_snapshots SET status = 'SUPERSEDED'
       WHERE report_type = 'OP_CM_TRACKER'
         AND reporting_month = ?
         AND reporting_year = ?
         AND (case_manager_id = ? OR (? IS NULL AND case_manager_id IS NULL))
         AND status = 'OFFICIAL_ISSUED'`,
      [m, y, cmId, cmId]
    ).catch(() => {});
  }

  const [insertRes] = await pool.query(
    `INSERT INTO report_snapshots
      (report_type, reporting_month, reporting_year, case_manager_id, case_manager_name,
       snapshot_title, status, version, summary_json, grid_json, issued_by, issued_by_name, notes)
     VALUES (?, ?, ?, ?, ?, ?, 'OFFICIAL_ISSUED', ?, ?, ?, ?, ?, ?)`,
    [
      'OP_CM_TRACKER',
      m,
      y,
      cmId,
      cmName,
      snapshotTitle,
      nextVersion,
      JSON.stringify(liveReport.summaries),
      JSON.stringify(liveReport.grid.map((r) => ({
        patientId: r.patientId,
        clientName: r.clientName,
        pwudCode: r.pwudCode,
        caseManager: r.caseManager,
        category: r.category,
        dateEnrolled: r.dateEnrolled,
        dischargeDate: r.dischargeDate,
        interventionsConductedInMonth: r.interventionsConductedInMonth,
        cbtAttendanceInMonth: r.cbtAttendanceInMonth,
        peAttendanceInMonth: r.peAttendanceInMonth,
        drugTestResultInMonth: r.drugTestResultInMonth,
        isArchived: r.isArchived,
      }))),
      issuerId,
      issuerName,
      notes || null,
    ]
  );

  await pool.query(
    "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'report_snapshots', ?)",
    [issuerUsername, `Issued official OP CM Tracker snapshot (v${nextVersion}) for ${m}/${y}`, insertRes.insertId]
  ).catch(() => {});

  await notifyRoles(["him_staff", "ict_admin"], "reports", "report_snapshot_issued",
    `Official OP CM Tracker snapshot issued for ${MONTH_NAMES[m - 1] || m} ${y} (v${nextVersion}) by ${issuerName}`
  ).catch(() => {});

  return {
    success: true,
    snapshotId: insertRes.insertId,
    version: nextVersion,
    snapshotTitle,
    issuedAt: new Date().toISOString(),
  };
}

export async function listOpCmTrackerSnapshots({ month = null, year = null, caseManagerId = null }) {
  await ensureHistoricalReportSchema();
  const where = ["report_type = 'OP_CM_TRACKER'"];
  const params = [];
  if (year) { where.push("reporting_year = ?"); params.push(Number(year)); }
  if (month) { where.push("reporting_month = ?"); params.push(Number(month)); }
  if (caseManagerId) { where.push("case_manager_id = ?"); params.push(Number(caseManagerId)); }

  const [rows] = await pool.query(
    `SELECT id, snapshot_title, reporting_month, reporting_year, case_manager_id, case_manager_name,
            status, version, issued_by_name, issued_at, notes
     FROM report_snapshots
     WHERE ${where.join(" AND ")}
     ORDER BY reporting_year DESC, reporting_month DESC, version DESC`,
    params
  );
  return rows;
}

export async function getOpCmTrackerSnapshotById(id) {
  await ensureHistoricalReportSchema();
  const [rows] = await pool.query(
    `SELECT * FROM report_snapshots WHERE id = ?`,
    [Number(id)]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    ...r,
    summary: typeof r.summary_json === "string" ? JSON.parse(r.summary_json) : r.summary_json,
    grid: typeof r.grid_json === "string" ? JSON.parse(r.grid_json) : r.grid_json,
  };
}
