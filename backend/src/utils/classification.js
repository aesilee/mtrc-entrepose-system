/**
 * Single source of truth for patient classification and discharge outcomes (Task 10).
 *
 * Every list, report, tracker and DOH form MUST classify patients through the fixed
 * codes stored in the database columns below — never by reading free-text wording.
 *
 *   patients.referral_category      → REFERRAL_CATEGORIES codes
 *   patients.admission_category     → ADMISSION_CATEGORIES codes
 *   patient_discharges.outcome      → DISCHARGE_OUTCOMES codes
 *   patient_discharges.reason_code  → DISCHARGE_REASONS codes
 *   discharges.outcome / reason_code (mirror of the above)
 */

// ---------------------------------------------------------------------------
// Referral category (chosen from a fixed list at registration / referral)
// ---------------------------------------------------------------------------
export const REFERRAL_CATEGORIES = [
  { code: "VOLUNTARY", label: "Voluntary", trackerBucket: "Voluntary" },
  { code: "COURT_MANDATED", label: "Court-Mandated", trackerBucket: "Court-mandated" },
  { code: "LGU_REFERRED", label: "LGU-Referred (CADAC / MADAC / BADAC)", trackerBucket: "LGU-Referred" },
  { code: "WORKPLACE", label: "Workplace-Referred", trackerBucket: "Voluntary" },
  { code: "NGO", label: "NGO-Referred", trackerBucket: "Voluntary" },
];
export const REFERRAL_CATEGORY_CODES = new Set(REFERRAL_CATEGORIES.map((c) => c.code));
export const UNCLASSIFIED = "Unclassified";

export function referralCategoryLabel(code) {
  return REFERRAL_CATEGORIES.find((c) => c.code === code)?.label || UNCLASSIFIED;
}

/** Census bucket used by the OP CM Tracker and DOH census tables. */
export function referralTrackerBucket(code) {
  return REFERRAL_CATEGORIES.find((c) => c.code === code)?.trackerBucket || UNCLASSIFIED;
}

/**
 * Exact-match mapping of the legacy fixed dropdown values that were already stored
 * (e.g. "Court-Mandated", "court_mandated"). Used ONLY for the one-time backfill and to
 * accept older clients; it never searches inside free text.
 */
const LEGACY_REFERRAL_MAP = {
  voluntary: "VOLUNTARY",
  "court-mandated": "COURT_MANDATED",
  court_mandated: "COURT_MANDATED",
  "lgu-referred": "LGU_REFERRED",
  lgu_referred: "LGU_REFERRED",
  workplace: "WORKPLACE",
  "workplace-referred": "WORKPLACE",
  ngo: "NGO",
  "ngo-referred": "NGO",
};

export function normalizeReferralCategory(value) {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (REFERRAL_CATEGORY_CODES.has(raw.toUpperCase())) return raw.toUpperCase();
  return LEGACY_REFERRAL_MAP[raw.toLowerCase()] || null;
}

// ---------------------------------------------------------------------------
// Admission category (new admission vs readmission vs recommitment)
// ---------------------------------------------------------------------------
export const ADMISSION_CATEGORIES = [
  { code: "NEW_ADMISSION", label: "New Admission" },
  { code: "READMISSION", label: "Readmission" },
  { code: "RECOMMITMENT", label: "Recommitment" },
];
export const ADMISSION_CATEGORY_CODES = new Set(ADMISSION_CATEGORIES.map((c) => c.code));

export function admissionCategoryLabel(code) {
  return ADMISSION_CATEGORIES.find((c) => c.code === code)?.label || UNCLASSIFIED;
}

const LEGACY_ADMISSION_MAP = {
  "new admission": "NEW_ADMISSION",
  new_admission: "NEW_ADMISSION",
  "readmission (relapse)": "READMISSION",
  "readmission": "READMISSION",
  "readmit - relapse": "READMISSION",
  "readmit – relapse": "READMISSION",
  "readmit - escape": "READMISSION",
  "readmit – escape": "READMISSION",
  readmit_relapse: "READMISSION",
  readmit_escape: "READMISSION",
  recommitment: "RECOMMITMENT",
};

export function normalizeAdmissionCategory(value) {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (ADMISSION_CATEGORY_CODES.has(raw.toUpperCase())) return raw.toUpperCase();
  return LEGACY_ADMISSION_MAP[raw.toLowerCase()] || null;
}

// ---------------------------------------------------------------------------
// Discharge outcome + specific reason
// ---------------------------------------------------------------------------
export const DISCHARGE_OUTCOMES = [
  { code: "COMPLETER", label: "Completer" },
  { code: "NON_COMPLETER", label: "Non-Completer" },
];
export const DISCHARGE_OUTCOME_CODES = new Set(DISCHARGE_OUTCOMES.map((o) => o.code));

/**
 * trackerBucket → OP CM Tracker discharge columns.
 * dohReason     → DOH Form 10.2 consolidated reason rows.
 */
export const DISCHARGE_REASONS = [
  // Completer
  { code: "COMPLETED_PROGRAM", outcome: "COMPLETER", label: "Completed Program (Graduated)", trackerBucket: "Completer", dohReason: "Graduate from Program (Completer - 43 sessions)" },
  { code: "COMPLETED_MANDATED_DURATION", outcome: "COMPLETER", label: "Completed Mandated Outpatient Duration", trackerBucket: "Completer", dohReason: "Graduate from Program (Completer - 43 sessions)" },
  // Non-Completer
  { code: "NON_COMPLIANCE", outcome: "NON_COMPLETER", label: "Non-compliance / Absconded / Dropped Out", trackerBucket: "Non-compliance", dohReason: "Non-compliance with rules and regulations" },
  { code: "DISCIPLINARY", outcome: "NON_COMPLETER", label: "Expelled / Disciplinary Action", trackerBucket: "Non-compliance", dohReason: "Non-compliance with rules and regulations" },
  { code: "EARLY_RELEASE", outcome: "NON_COMPLETER", label: "Early Release (Court-Granted)", trackerBucket: "Non-compliance", dohReason: "Early release" },
  { code: "TURNED_OVER_LAW_ENFORCEMENT", outcome: "NON_COMPLETER", label: "Court Order Turnover / Re-arrest / Incarcerated", trackerBucket: "Incarcerated", dohReason: "Turned over to law enforcers per court order" },
  { code: "TRANSFERRED", outcome: "NON_COMPLETER", label: "Referred / Transferred to Residential or Other Facility", trackerBucket: "Referred to Other Program/Facility", dohReason: "Transferred to other facility" },
  { code: "MEDICAL", outcome: "NON_COMPLETER", label: "Medical Discharge / Health Reasons", trackerBucket: "Medical Discharge", dohReason: "Transferred to other facility" },
  { code: "DEATH", outcome: "NON_COMPLETER", label: "Death", trackerBucket: "Medical Discharge", dohReason: "Death" },
];
export const DISCHARGE_REASON_CODES = new Set(DISCHARGE_REASONS.map((r) => r.code));

export function getDischargeReason(code) {
  return DISCHARGE_REASONS.find((r) => r.code === code) || null;
}

export function dischargeOutcomeLabel(code) {
  return DISCHARGE_OUTCOMES.find((o) => o.code === code)?.label || UNCLASSIFIED;
}

export function isCompleterOutcome(code, legacyReason = null, legacyStatus = null) {
  if (code === "COMPLETER") return true;
  if (code === "NON_COMPLETER") return false;
  const text = `${legacyStatus || code || ""} ${legacyReason || ""}`.toLowerCase();
  if (text.includes("non-complete") || text.includes("non_complete") || text.includes("dropped") || text.includes("non-compliance")) {
    return false;
  }
  return text.includes("graduat") || text.includes("complet");
}

/** Maps a discharge outcome to patients.enrollment_status. */
export function enrollmentStatusForOutcome(code) {
  return code === "COMPLETER" ? "completed" : "dropped";
}

/**
 * Validates an outcome/reason pair. Returns an error message or null.
 */
export function validateDischargeSelection(outcome, reasonCode) {
  if (!DISCHARGE_OUTCOME_CODES.has(outcome)) {
    return "Select a discharge outcome: Completer or Non-Completer.";
  }
  const reason = getDischargeReason(reasonCode);
  if (!reason) return "Select a specific discharge reason from the list.";
  if (reason.outcome !== outcome) {
    return `The reason "${reason.label}" does not belong to the ${dischargeOutcomeLabel(outcome)} outcome.`;
  }
  return null;
}

/** Exact legacy label → code (backfill only). */
const LEGACY_DISCHARGE_REASON_MAP = {
  "completed program (graduated)": "COMPLETED_PROGRAM",
  "completed mandated outpatient duration": "COMPLETED_MANDATED_DURATION",
  "early release (court-granted / cleared)": "EARLY_RELEASE",
  "non-compliance / absconded / dropped out": "NON_COMPLIANCE",
  "expelled / disciplinary action": "DISCIPLINARY",
  "referred to residential / other facility": "TRANSFERRED",
  "medical discharge / health reasons": "MEDICAL",
  "court order turnover / re-arrest / incarcerated": "TURNED_OVER_LAW_ENFORCEMENT",
  death: "DEATH",
};

export function legacyDischargeReasonCode(label) {
  if (!label) return null;
  return LEGACY_DISCHARGE_REASON_MAP[String(label).trim().toLowerCase()] || null;
}

const LEGACY_OUTCOME_MAP = {
  "completer (graduated)": "COMPLETER",
  completer: "COMPLETER",
  "non-completer": "NON_COMPLETER",
  non_completer: "NON_COMPLETER",
};

export function legacyDischargeOutcomeCode(label) {
  if (!label) return null;
  return LEGACY_OUTCOME_MAP[String(label).trim().toLowerCase()] || null;
}

// ---------------------------------------------------------------------------
// Sex
// ---------------------------------------------------------------------------
/** Returns "Male" | "Female" | "Unspecified". A missing sex is NEVER counted as male. */
export function sexKey(gender) {
  const g = String(gender || "").trim().toLowerCase();
  if (g === "male" || g === "m") return "Male";
  if (g === "female" || g === "f") return "Female";
  return "Unspecified";
}
export const normalizeSex = sexKey;

/** Short code used in the tracker grid: "M" | "F" | "U". */
export function sexCode(gender) {
  const k = sexKey(gender);
  return k === "Male" ? "M" : k === "Female" ? "F" : "U";
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
let classificationSchemaEnsured = false;

/**
 * Idempotently adds the fixed-code columns and back-fills them from legacy values
 * by EXACT match only. Rows whose legacy text does not match a fixed value stay NULL
 * (shown as "Unclassified") until staff select a category.
 */
export async function ensureClassificationSchema(db) {
  if (classificationSchemaEnsured) return true;
  try {
    const [pCols] = await db.query("SHOW COLUMNS FROM patients");
    const pSet = new Set(pCols.map((c) => c.Field));
    if (!pSet.has("referral_category")) {
      await db.query("ALTER TABLE patients ADD COLUMN referral_category VARCHAR(30) NULL");
    }
    if (!pSet.has("admission_category")) {
      await db.query("ALTER TABLE patients ADD COLUMN admission_category VARCHAR(30) NULL");
    }

    for (const table of ["patient_discharges", "discharges"]) {
      const [cols] = await db.query(`SHOW COLUMNS FROM ${table}`);
      const set = new Set(cols.map((c) => c.Field));
      if (!set.has("outcome")) await db.query(`ALTER TABLE ${table} ADD COLUMN outcome VARCHAR(20) NULL`);
      if (!set.has("reason_code")) await db.query(`ALTER TABLE ${table} ADD COLUMN reason_code VARCHAR(40) NULL`);
    }

    // Exact-match backfill of patient categories
    const [patients] = await db.query(
      `SELECT id, referral_source, admission_type, referral_category, admission_category
       FROM patients WHERE referral_category IS NULL OR admission_category IS NULL`
    );
    for (const p of patients) {
      const rc = p.referral_category || normalizeReferralCategory(p.referral_source);
      const ac = p.admission_category || normalizeAdmissionCategory(p.admission_type);
      if (rc !== p.referral_category || ac !== p.admission_category) {
        await db.query("UPDATE patients SET referral_category = ?, admission_category = ? WHERE id = ?", [rc, ac, p.id]);
      }
    }

    // Exact-match backfill of discharge outcomes
    const [pds] = await db.query("SELECT id, status, reason FROM patient_discharges WHERE outcome IS NULL OR reason_code IS NULL");
    for (const d of pds) {
      const outcome = legacyDischargeOutcomeCode(d.status);
      const reasonCode = legacyDischargeReasonCode(d.reason);
      await db.query("UPDATE patient_discharges SET outcome = COALESCE(outcome, ?), reason_code = COALESCE(reason_code, ?) WHERE id = ?", [outcome, reasonCode, d.id]);
    }
    const [ds] = await db.query("SELECT id, discharge_type, remarks FROM discharges WHERE outcome IS NULL OR reason_code IS NULL");
    for (const d of ds) {
      const outcome = legacyDischargeOutcomeCode(d.discharge_type);
      const reasonCode = legacyDischargeReasonCode(d.remarks);
      await db.query("UPDATE discharges SET outcome = COALESCE(outcome, ?), reason_code = COALESCE(reason_code, ?) WHERE id = ?", [outcome, reasonCode, d.id]);
    }

    classificationSchemaEnsured = true;
    return true;
  } catch (err) {
    console.warn("ensureClassificationSchema warning:", err.message);
    return false;
  }
}
