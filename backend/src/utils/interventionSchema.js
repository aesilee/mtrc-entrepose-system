import pool from "../config/db.js";

let interventionSchemaEnsured = false;

export const INTERVENTION_TYPES = [
  {
    value: "HOME_VISIT",
    label: "Home Visit / Field Follow-up",
    qualifiesForTracker: true,
    milestoneKey: "date_home_visit",
    description: "In-person visit to the client's home or community environment.",
  },
  {
    value: "CONSULTATION_INTERNAL",
    label: "Internal Consultation within MTRC",
    qualifiesForTracker: true,
    description: "Medical, Psychiatric, Dental, or Psychological consultation at MTRC.",
  },
  {
    value: "FAMILY_COORDINATION",
    label: "Family Coordination & Support Session",
    qualifiesForTracker: true,
    description: "Coordination with family members or guardian regarding recovery support.",
  },
  {
    value: "TREATMENT_PLANNING",
    label: "Treatment Planning (ITP Formulation / Review)",
    qualifiesForTracker: true,
    milestoneKey: "date_initial_tx_planning",
    description: "Formulation, formal review, or update of Individualized Treatment Plan.",
  },
  {
    value: "ASSESSMENT_CLINICAL",
    label: "Clinical / Addiction Assessment (ASI / DDE)",
    qualifiesForTracker: true,
    milestoneKey: "date_initial_assessment",
    description: "Standardized clinical assessment or follow-up evaluation.",
  },
  {
    value: "CASE_CONFERENCE",
    label: "Multi-Disciplinary Case Conference",
    qualifiesForTracker: true,
    milestoneKey: "date_case_conference",
    description: "Case management conference with clinical team, family, or partners.",
  },
  {
    value: "STATUS_REPORT_PREP",
    label: "Court / Legal Status Report Preparation",
    qualifiesForTracker: true,
    milestoneKey: "date_status_reporting",
    description: "Clinical documentation and compilation of statutory progress report for RTC.",
  },
  {
    value: "REFERRAL_OUTSIDE",
    label: "Referral Outside MTRC / Inter-Agency Coordination",
    qualifiesForTracker: true,
    milestoneKey: "date_referral_outside_mtrc",
    description: "Formal referral to external agency, hospital, LGU, or social service.",
  },
  {
    value: "CRISIS_INTERVENTION",
    label: "Crisis Intervention & Relapse Response",
    qualifiesForTracker: true,
    description: "Immediate response to acute crisis, near-use situation, or acute relapse.",
  },
  {
    value: "AFTERCARE_PLANNING",
    label: "Aftercare & Pre-Discharge Planning (ACP / PDC)",
    qualifiesForTracker: true,
    milestoneKey: "date_acp_planning",
    description: "Coordination for 9-Month Community Aftercare (SIBOL / OP-ACP) and PDC.",
  },
  {
    value: "OTHER_CLINICAL",
    label: "Other Documented Case Management Service",
    qualifiesForTracker: true,
    description: "Other authorized supportive clinical service or collateral coordination.",
  },
];

export const CONSULT_TYPES = [
  { value: "M", code: "M", label: "Medical (General Medicine / Physical Exam)" },
  { value: "P", code: "P", label: "Psychiatric (Psychiatric Evaluation / Psychopharmacology)" },
  { value: "D", code: "D", label: "Dental (Dental Health Assessment / Care)" },
  { value: "PSYCH", code: "PSYCH", label: "Psychological (Psychological Testing / Evaluation)" },
  { value: "OTHER", code: "OTHER", label: "Other Specialized Consultation" },
];

export async function ensureInterventionSchema(customConn = null) {
  if (interventionSchemaEnsured) return true;
  const db = customConn || pool;

  try {
    // 1. Create patient_interventions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS patient_interventions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        intervention_date DATE NOT NULL,
        intervention_type VARCHAR(60) NOT NULL,
        consult_type VARCHAR(20) NULL,
        responsible_staff_id INT NULL,
        responsible_staff_name VARCHAR(150) NOT NULL,
        location_setting VARCHAR(100) NULL,
        qualifies_for_monthly_tracker TINYINT(1) NOT NULL DEFAULT 1,
        remarks TEXT NULL,
        recorded_by INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_patient_date (patient_id, intervention_date),
        INDEX idx_type (intervention_type),
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(() => {});

    // 2. Ensure patient_consult_logs exists and has needed columns
    await db.query(`
      CREATE TABLE IF NOT EXISTS patient_consult_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        consult_date DATE NOT NULL,
        consult_type VARCHAR(30) NOT NULL DEFAULT 'M',
        notes TEXT NULL,
        recorded_by INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_consult_pt_date (patient_id, consult_date),
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(() => {});

    // Ensure consult_type in patient_consult_logs supports varchar so diverse types can be saved
    const [cCols] = await db.query("SHOW COLUMNS FROM patient_consult_logs").catch(() => [[]]);
    const cTypeCol = cCols.find((c) => c.Field === "consult_type");
    if (cTypeCol && String(cTypeCol.Type).toLowerCase().startsWith("enum")) {
      await db.query("ALTER TABLE patient_consult_logs MODIFY COLUMN consult_type VARCHAR(30) NOT NULL DEFAULT 'M'").catch(() => {});
    }

    // 3. Ensure patient_milestone_history exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS patient_milestone_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        milestone_key VARCHAR(50) NOT NULL,
        milestone_date DATE NOT NULL,
        recorded_by INT NULL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pmh_patient (patient_id),
        INDEX idx_pmh_date (milestone_date),
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(() => {});

    interventionSchemaEnsured = true;
    return true;
  } catch (err) {
    console.warn("ensureInterventionSchema warning:", err.message);
    return false;
  }
}
