import pool from "../config/db.js";

let cbteRiskSchemaEnsured = false;

export const SELF_REPORTED_RISK_OPTIONS = [
  {
    value: "SAFE",
    label: "Safe / Abstinent",
    description: "Adhering to recovery plan; no cravings or high-risk exposure reported.",
    isSubstanceUse: false,
  },
  {
    value: "AT_RISK",
    label: "At Risk (Triggers / High-Risk Exposure — No Use)",
    description: "Exposed to external/internal triggers or high-risk situations, without substance use.",
    isSubstanceUse: false,
  },
  {
    value: "NEARLY_USED",
    label: "Nearly Used / Strong Craving (No Substance Use)",
    description: "Experienced strong craving or near-use situation, but maintained abstinence and did NOT use drugs.",
    isSubstanceUse: false,
  },
  {
    value: "USED",
    label: "Used / Slip (Actual Substance Use)",
    description: "Client reported actual substance use / lapse during the period.",
    isSubstanceUse: true,
  },
];

export const STAFF_RISK_ASSESSMENT_OPTIONS = [
  { value: "LOW_RISK", label: "Low Risk (Stable Recovery & Coping)" },
  { value: "MODERATE_RISK", label: "Moderate Risk (Monitor Triggers & Coping)" },
  { value: "HIGH_RISK", label: "High Risk (Intensify Clinical Support)" },
  { value: "ACUTE_RELAPSE_RISK", label: "Acute Relapse Risk (Immediate Clinical Intervention)" },
];

export function normalizeSelfReportedRisk(raw) {
  if (!raw) return null;
  const val = String(raw).trim().toUpperCase();
  if (val === "SAFE" || val === "AT_RISK" || val === "NEARLY_USED" || val === "USED") {
    return val;
  }
  if (val === "NEAR_USE" || val === "CRAVING" || val === "STRONG_CRAVING") {
    return "NEARLY_USED";
  }
  return null;
}

export function normalizeStaffRiskAssessment(raw) {
  const val = String(raw || "").trim().toUpperCase();
  if (
    val === "LOW_RISK" ||
    val === "MODERATE_RISK" ||
    val === "HIGH_RISK" ||
    val === "ACUTE_RELAPSE_RISK"
  ) {
    return val;
  }
  return null;
}

export async function ensureCbteAndRiskSchema(customConn = null) {
  if (cbteRiskSchemaEnsured) return true;
  const db = customConn || pool;

  try {
    // 1. Ensure patient_cbte_evaluations exists and has source-form & audit columns
    await db
      .query(`
        CREATE TABLE IF NOT EXISTS patient_cbte_evaluations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          patient_id INT NOT NULL,
          evaluation_type VARCHAR(30) NOT NULL,
          evaluation_date DATE NOT NULL,
          evaluator_id INT NOT NULL,
          evaluator_name VARCHAR(150) NULL,
          form_basis VARCHAR(80) NOT NULL DEFAULT 'SUPPLIED_ENTREPOSE_WORKSHEET',
          approved_by_clinical_lead VARCHAR(150) NULL,
          adaptation_notes VARCHAR(255) NULL,
          self_reported_status VARCHAR(40) NULL,
          staff_risk_assessment VARCHAR(40) NULL,
          worksheet_responses_json JSON NULL,
          recovery_domains_json JSON NULL,
          coping_skills_json JSON NULL,
          life_goals_text TEXT NULL,
          overall_score DECIMAL(5,2) NULL,
          clinical_judgment VARCHAR(60) NOT NULL DEFAULT 'ON_TRACK',
          evaluator_remarks TEXT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_cbte_patient (patient_id),
          INDEX idx_cbte_type (evaluation_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      .catch(() => {});

    const [cbteCols] = await db.query("SHOW COLUMNS FROM patient_cbte_evaluations").catch(() => [[]]);
    const cbteColMap = new Map(cbteCols.map((c) => [c.Field, c]));

    const cbteAdditions = [
      ["evaluator_name", "VARCHAR(150) NULL AFTER evaluator_id"],
      ["form_basis", "VARCHAR(80) NOT NULL DEFAULT 'SUPPLIED_ENTREPOSE_WORKSHEET' AFTER evaluator_name"],
      ["approved_by_clinical_lead", "VARCHAR(150) NULL AFTER form_basis"],
      ["adaptation_notes", "VARCHAR(255) NULL AFTER approved_by_clinical_lead"],
      ["self_reported_status", "VARCHAR(40) NULL AFTER adaptation_notes"],
      ["staff_risk_assessment", "VARCHAR(40) NULL AFTER self_reported_status"],
      ["worksheet_responses_json", "JSON NULL AFTER staff_risk_assessment"],
    ];

    for (const [colName, colDef] of cbteAdditions) {
      if (cbteCols.length > 0 && !cbteColMap.has(colName)) {
        await db.query(`ALTER TABLE patient_cbte_evaluations ADD COLUMN ${colName} ${colDef}`).catch(() => {});
      }
    }

    const judgmentCol = cbteColMap.get("clinical_judgment");
    if (judgmentCol && String(judgmentCol.Type).toLowerCase().startsWith("enum")) {
      await db
        .query("ALTER TABLE patient_cbte_evaluations MODIFY COLUMN clinical_judgment VARCHAR(60) NOT NULL DEFAULT 'ON_TRACK'")
        .catch(() => {});
    }

    // 2. Ensure attendance table supports NEARLY_USED in relapse_risk and has staff_risk_assessment
    const [attCols] = await db.query("SHOW COLUMNS FROM attendance").catch(() => [[]]);
    const attColMap = new Map(attCols.map((c) => [c.Field, c]));

    if (attCols.length > 0) {
      if (!attColMap.has("relapse_risk")) {
        await db
          .query("ALTER TABLE attendance ADD COLUMN relapse_risk VARCHAR(40) NOT NULL DEFAULT 'SAFE'")
          .catch(() => {});
      } else {
        const rrCol = attColMap.get("relapse_risk");
        if (rrCol && String(rrCol.Type).toLowerCase().startsWith("enum")) {
          await db
            .query("ALTER TABLE attendance MODIFY COLUMN relapse_risk VARCHAR(40) NOT NULL DEFAULT 'SAFE'")
            .catch(() => {});
        }
      }

      if (!attColMap.has("staff_risk_assessment")) {
        await db
          .query("ALTER TABLE attendance ADD COLUMN staff_risk_assessment VARCHAR(40) NULL AFTER relapse_risk")
          .catch(() => {});
      }
    }

    // 3. Ensure progress_notes table supports NEARLY_USED in relapse_risk and has staff_risk_assessment
    const [pnCols] = await db.query("SHOW COLUMNS FROM progress_notes").catch(() => [[]]);
    const pnColMap = new Map(pnCols.map((c) => [c.Field, c]));

    if (pnCols.length > 0) {
      if (!pnColMap.has("relapse_risk")) {
        await db
          .query("ALTER TABLE progress_notes ADD COLUMN relapse_risk VARCHAR(40) NOT NULL DEFAULT 'SAFE'")
          .catch(() => {});
      } else {
        const pnRrCol = pnColMap.get("relapse_risk");
        if (pnRrCol && String(pnRrCol.Type).toLowerCase().startsWith("enum")) {
          await db
            .query("ALTER TABLE progress_notes MODIFY COLUMN relapse_risk VARCHAR(40) NOT NULL DEFAULT 'SAFE'")
            .catch(() => {});
        }
      }

      if (!pnColMap.has("staff_risk_assessment")) {
        await db
          .query("ALTER TABLE progress_notes ADD COLUMN staff_risk_assessment VARCHAR(40) NULL AFTER relapse_risk")
          .catch(() => {});
      }
    }

    cbteRiskSchemaEnsured = true;
    return true;
  } catch (err) {
    console.warn("ensureCbteAndRiskSchema warning:", err.message);
    return false;
  }
}
