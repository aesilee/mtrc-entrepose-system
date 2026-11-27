import pool from "../config/db.js";

let durationSchemaEnsured = false;

export const DURATION_BASIS_OPTIONS = {
  STANDARD_PROGRAM: "Standard ENTREPOSE Program (7 Months)",
  COURT_ORDER: "Court Instruction / RTC Mandate",
  PLEA_BARGAIN: "Plea Bargaining Framework",
  CLINICAL_ASSESSMENT: "Clinical / Multidisciplinary Requirement",
  APPROVED_EXTENSION: "Approved Program Extension",
  OTHER: "Other Approved Requirement",
};

export function getDurationBasisLabel(basisCode) {
  if (!basisCode) return DURATION_BASIS_OPTIONS.STANDARD_PROGRAM;
  return DURATION_BASIS_OPTIONS[basisCode] || basisCode;
}

/**
 * Formats a Date or date-string into YYYY-MM-DD without timezone drift.
 */
export function toDateOnlyString(val) {
  if (!val) return null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
  }
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Consistently calculates expected completion date by adding `totalMonths` calendar months
 * to `startDateStr` (YYYY-MM-DD).
 */
export function calculateExpectedCompletionDate(startDateVal, totalMonths) {
  const startStr = toDateOnlyString(startDateVal);
  const months = Number(totalMonths);
  if (!startStr || !Number.isFinite(months) || months <= 0) return null;

  const [y, m, d] = startStr.split("-").map(Number);
  if (!y || !m || !d) return null;

  const targetMonthIndex = m - 1 + months;
  const targetYear = y + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

  // Clamp day to the last day of the target month (e.g. Jan 31 + 1 month -> Feb 28/29)
  const maxDayInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(d, maxDayInTargetMonth);

  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
}

/**
 * Calculates elapsed months and days between agreedStartDate and asOfDate.
 */
export function calculateElapsedDuration(startDateVal, asOfDateVal = new Date()) {
  const startStr = toDateOnlyString(startDateVal);
  const asOfStr = toDateOnlyString(asOfDateVal) || toDateOnlyString(new Date());
  if (!startStr || !asOfStr) {
    return { daysElapsed: 0, monthsElapsed: 0, exactMonthsElapsed: 0 };
  }

  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = asOfStr.split("-").map(Number);
  const startUtc = Date.UTC(sy, sm - 1, sd);
  const endUtc = Date.UTC(ey, em - 1, ed);

  if (endUtc <= startUtc) {
    return { daysElapsed: 0, monthsElapsed: 0, exactMonthsElapsed: 0 };
  }

  const daysElapsed = Math.floor((endUtc - startUtc) / (1000 * 60 * 60 * 24));
  let calMonths = (ey - sy) * 12 + (em - sm);
  if (ed < sd) {
    calMonths -= 1;
  }
  const monthsElapsed = Math.max(0, calMonths);
  const exactMonthsElapsed = Number((daysElapsed / 30.4375).toFixed(1));

  return { daysElapsed, monthsElapsed, exactMonthsElapsed };
}

/**
 * Evaluates a patient row's complete program duration status.
 */
export function evaluatePatientDuration(patientRow, asOfDateVal = new Date()) {
  if (!patientRow) return null;

  const agreedStartDate =
    toDateOnlyString(patientRow.rehab_start_date) ||
    toDateOnlyString(patientRow.admission_date) ||
    null;

  const baseDurationMonths =
    Number(patientRow.required_duration_months) > 0
      ? Number(patientRow.required_duration_months)
      : 7;

  const extensionMonths =
    Number(patientRow.extension_months) > 0
      ? Number(patientRow.extension_months)
      : 0;

  const totalRequiredMonths = baseDurationMonths + extensionMonths;
  const durationBasis = patientRow.duration_basis || "STANDARD_PROGRAM";
  const durationBasisLabel = getDurationBasisLabel(durationBasis);
  const durationBasisDetail = patientRow.duration_basis_detail || null;

  const calculatedExpectedCompletionDate = agreedStartDate
    ? calculateExpectedCompletionDate(agreedStartDate, totalRequiredMonths)
    : null;

  const expectedCompletionDate =
    calculatedExpectedCompletionDate ||
    toDateOnlyString(patientRow.expected_completion_date) ||
    null;

  const { daysElapsed, monthsElapsed, exactMonthsElapsed } = calculateElapsedDuration(
    agreedStartDate,
    asOfDateVal
  );

  const asOfStr = toDateOnlyString(asOfDateVal) || toDateOnlyString(new Date());
  const isDateReached = Boolean(
    expectedCompletionDate && asOfStr && asOfStr >= expectedCompletionDate
  );
  const isDurationMet = Boolean(
    agreedStartDate && (isDateReached || monthsElapsed >= totalRequiredMonths)
  );
  const remainingMonths = Math.max(0, totalRequiredMonths - monthsElapsed);

  return {
    agreedStartDate,
    startDate: agreedStartDate,
    baseDurationMonths,
    requiredDurationMonths: baseDurationMonths,
    extensionMonths,
    totalRequiredMonths,
    durationBasis,
    durationBasisLabel,
    durationBasisDetail,
    expectedCompletionDate,
    calculatedExpectedCompletionDate,
    daysElapsed,
    monthsElapsed,
    elapsedMonths: monthsElapsed,
    exactMonthsElapsed,
    remainingMonths,
    isDurationMet,
  };
}

/**
 * Idempotently ensures the duration columns and history table exist so queries never fail.
 */
export async function ensureProgramDurationSchema(customConn = null) {
  if (durationSchemaEnsured) return true;
  const db = customConn || pool;
  try {
    const [patCols] = await db.query("SHOW COLUMNS FROM patients");
    const patColMap = new Map(patCols.map((c) => [c.Field, c]));

    if (!patColMap.has("rehab_start_date")) {
      await db.query("ALTER TABLE patients ADD COLUMN rehab_start_date DATE NULL").catch(() => {});
    }
    if (!patColMap.has("expected_completion_date")) {
      await db.query("ALTER TABLE patients ADD COLUMN expected_completion_date DATE NULL").catch(() => {});
    }
    if (!patColMap.has("required_duration_months")) {
      await db
        .query("ALTER TABLE patients ADD COLUMN required_duration_months INT NOT NULL DEFAULT 7")
        .catch(() => {});
    }
    if (!patColMap.has("duration_basis")) {
      await db
        .query("ALTER TABLE patients ADD COLUMN duration_basis VARCHAR(60) NOT NULL DEFAULT 'STANDARD_PROGRAM'")
        .catch(() => {});
    }
    if (!patColMap.has("duration_basis_detail")) {
      await db
        .query("ALTER TABLE patients ADD COLUMN duration_basis_detail VARCHAR(255) NULL")
        .catch(() => {});
    }
    if (!patColMap.has("extension_months")) {
      await db
        .query("ALTER TABLE patients ADD COLUMN extension_months INT NOT NULL DEFAULT 0")
        .catch(() => {});
    }

    // Backfill rehab_start_date and expected_completion_date on active/enrolled patients where missing
    await db
      .query(`
        UPDATE patients
        SET rehab_start_date = COALESCE(rehab_start_date, DATE(admission_date)),
            required_duration_months = COALESCE(NULLIF(required_duration_months, 0), 7),
            duration_basis = COALESCE(NULLIF(duration_basis, ''), 'STANDARD_PROGRAM'),
            expected_completion_date = COALESCE(
              expected_completion_date,
              DATE_ADD(COALESCE(rehab_start_date, DATE(admission_date)), INTERVAL (COALESCE(NULLIF(required_duration_months, 0), 7) + COALESCE(extension_months, 0)) MONTH)
            )
        WHERE id > 0
          AND admission_date IS NOT NULL
          AND (rehab_start_date IS NULL OR expected_completion_date IS NULL)
      `)
      .catch(() => {});

    // Create patient_duration_history table to preserve previous requirements and approved extensions
    await db
      .query(`
        CREATE TABLE IF NOT EXISTS patient_duration_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          patient_id INT NOT NULL,
          change_type VARCHAR(40) NOT NULL DEFAULT 'REQUIREMENT_CHANGE',
          previous_duration_months INT NULL,
          new_duration_months INT NOT NULL,
          previous_extension_months INT NOT NULL DEFAULT 0,
          new_extension_months INT NOT NULL DEFAULT 0,
          extension_added_months INT NOT NULL DEFAULT 0,
          extension_months INT NOT NULL DEFAULT 0,
          total_duration_months INT NOT NULL DEFAULT 7,
          previous_basis VARCHAR(60) NULL,
          new_basis VARCHAR(60) NOT NULL DEFAULT 'STANDARD_PROGRAM',
          basis_detail VARCHAR(255) NULL,
          agreed_start_date DATE NULL,
          previous_expected_completion_date DATE NULL,
          new_expected_completion_date DATE NULL,
          reason TEXT NULL,
          effective_date DATE NULL,
          approved_by_id INT NULL,
          approved_by_name VARCHAR(150) NULL,
          recorded_by_id INT NULL,
          recorded_by INT NULL,
          recorded_by_name VARCHAR(150) NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          KEY idx_pdh_patient (patient_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `)
      .catch(() => {});

    const [histCols] = await db.query("SHOW COLUMNS FROM patient_duration_history").catch(() => [[]]);
    const histColMap = new Map(histCols.map((c) => [c.Field, c]));
    if (histColMap.size > 0) {
      if (!histColMap.has("extension_months")) {
        await db.query("ALTER TABLE patient_duration_history ADD COLUMN extension_months INT NOT NULL DEFAULT 0").catch(() => {});
      }
      if (!histColMap.has("total_duration_months")) {
        await db.query("ALTER TABLE patient_duration_history ADD COLUMN total_duration_months INT NOT NULL DEFAULT 7").catch(() => {});
      }
      if (!histColMap.has("recorded_by")) {
        await db.query("ALTER TABLE patient_duration_history ADD COLUMN recorded_by INT NULL").catch(() => {});
      }
      if (!histColMap.has("recorded_by_name")) {
        await db.query("ALTER TABLE patient_duration_history ADD COLUMN recorded_by_name VARCHAR(150) NULL").catch(() => {});
      }
    }

    durationSchemaEnsured = true;
    return true;
  } catch (err) {
    console.warn("ensureProgramDurationSchema warning:", err.message);
    return false;
  }
}
