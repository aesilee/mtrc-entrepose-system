import { getUnifiedPatientProgress } from "./curriculumProgress.js";
import { ensureProgramDurationSchema, evaluatePatientDuration } from "./programDuration.js";

/**
 * Statutory completion rules shared by the Certificate of Completion and Completer discharges:
 * required duration met, 43/43 core credited, no positive Multi-3 test on record, PDC date recorded.
 * Returns a list of unmet requirements (empty when the patient may complete).
 * `db` may be the pool or a transaction connection.
 */
export async function getCompletionGuardFailures(db, patientId) {
  await ensureProgramDurationSchema();
  const [[patient]] = await db.query(
    `SELECT p.*, m.date_pdc
     FROM patients p
     LEFT JOIN patient_milestones m ON m.patient_id = p.id
     WHERE p.id = ?`,
    [patientId]
  );
  if (!patient) return ["Patient not found."];

  const failures = [];

  const durationSummary = evaluatePatientDuration(patient);
  if (!durationSummary.agreedStartDate) {
    failures.push("Patient lacks an agreed program start date / admission date.");
  } else if (!durationSummary.isDurationMet) {
    const extLabel =
      durationSummary.extensionMonths > 0
        ? ` (${durationSummary.baseDurationMonths} mos base + ${durationSummary.extensionMonths} mos approved extension)`
        : "";
    failures.push(
      `Mandated program duration of ${durationSummary.totalRequiredMonths} months${extLabel} not yet met. (${durationSummary.monthsElapsed} of ${durationSummary.totalRequiredMonths} months elapsed).`
    );
  }

  const progress = await getUnifiedPatientProgress(db, patientId);
  if (!progress.isCoreComplete) {
    const { cbt, cbte, pe, totalCore } = progress.components;
    failures.push(
      `Requires all 43 core curriculum requirements (28 CBT, 3 CBT-E, 12 PE). Current credited core: ${totalCore.completed}/43 — CBT: ${cbt.completed}/28, CBT-E: ${cbte.completed}/3, PE: ${pe.completed}/12.`
    );
  }

  const [[{ positive_tests }]] = await db.query(
    "SELECT COUNT(*) AS positive_tests FROM drug_test_logs WHERE patient_id = ? AND result = 'POSITIVE'",
    [patientId]
  );
  if (positive_tests > 0) {
    failures.push(`Client has ${positive_tests} POSITIVE urine drug test(s) on record.`);
  }

  if (!patient.date_pdc) {
    failures.push("Pre-Discharge Conference (PDC) milestone date is missing from Case Management.");
  }

  return failures;
}

/** Statuses that may still attend sessions, be scheduled, or be drug-tested. */
export function isEnrolledActive(enrollmentStatus) {
  return String(enrollmentStatus || "").toLowerCase() === "active";
}

/**
 * Returns the patients (id, full_name) who may NOT receive sessions, attendance, or drug tests on `onDate`:
 * anyone not actively enrolled, unless the date is on/before their discharge date (back-encoding an
 * earlier session for a since-discharged patient is still allowed).
 */
export async function findPatientsNotEnrolledOn(db, patientIds, onDate) {
  const ids = [...new Set((patientIds || []).map(Number).filter(Boolean))];
  if (!ids.length) return [];
  const [rows] = await db.query(
    `SELECT p.id, p.full_name, p.enrollment_status,
            (SELECT MAX(d.discharge_date) FROM discharges d WHERE d.patient_id = p.id) AS discharge_date
     FROM patients p WHERE p.id IN (?)`,
    [ids]
  );
  const day = onDate ? new Date(onDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return rows.filter((p) => {
    if (isEnrolledActive(p.enrollment_status)) return false;
    if (!p.discharge_date) return true;
    const dd = new Date(p.discharge_date);
    const discharged = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
    return day > discharged;
  });
}
