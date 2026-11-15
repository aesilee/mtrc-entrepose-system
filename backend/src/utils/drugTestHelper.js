import pool from "../config/db.js";

export const MULTI3_SUBSTANCES = [
  { code: "THC", label: "THC (Marijuana)", chemical: "Tetrahydrocannabinol" },
  { code: "METH", label: "METH (Methamphetamine)", chemical: "Shabu / Methamphetamine" },
  { code: "ECS", label: "ECS (Ecstasy)", chemical: "MDMA / Ecstasy" },
];

export const VALID_DRUG_TEST_RESULTS = new Set([
  "NEGATIVE",
  "POSITIVE",
  "PENDING",
  "INVALID",
  "NOT_PERFORMED",
]);

let drugTestSchemaEnsured = false;

/**
 * Normalizes positive substance selections from either:
 * - an array of codes: ['THC', 'ECS']
 * - a boolean map: { thc: true, meth: false, ecs: true }
 * - a comma-separated string: "THC, ECS"
 */
export function normalizePositiveSubstances(input) {
  const selected = new Set();
  if (!input) return [];

  if (Array.isArray(input)) {
    for (const item of input) {
      const upper = String(item || "").trim().toUpperCase();
      if (upper.includes("THC")) selected.add("THC");
      if (upper.includes("METH")) selected.add("METH");
      if (upper.includes("ECS") || upper.includes("MDMA")) selected.add("ECS");
    }
  } else if (typeof input === "object") {
    if (input.thc || input.THC) selected.add("THC");
    if (input.meth || input.METH) selected.add("METH");
    if (input.ecs || input.ECS) selected.add("ECS");
  } else if (typeof input === "string") {
    const upper = input.toUpperCase();
    if (upper.includes("THC") || upper.includes("BOTH")) selected.add("THC");
    if (upper.includes("METH") || upper.includes("BOTH")) selected.add("METH");
    if (upper.includes("ECS") || upper.includes("MDMA")) selected.add("ECS");
  }

  return ["THC", "METH", "ECS"].filter((code) => selected.has(code));
}

/**
 * Builds the canonical `substance_tested` display string and `positive_substances` code list
 * for a single Multi-3 test record.
 */
export function buildMulti3SubstanceSummary(result, positiveInput) {
  const normResult = String(result || "").trim().toUpperCase();
  const codes = normalizePositiveSubstances(positiveInput);

  if (normResult === "POSITIVE") {
    const labels = codes.map((c) => {
      const found = MULTI3_SUBSTANCES.find((m) => m.code === c);
      return found ? found.label : c;
    });
    return {
      codes,
      positiveSubstancesStr: codes.join(","),
      substanceTested:
        labels.length > 0
          ? `Multi-3: ${labels.join(", ")}`
          : "Multi-3: Positive (Unspecified)",
    };
  }

  if (normResult === "NOT_PERFORMED") {
    return {
      codes: [],
      positiveSubstancesStr: null,
      substanceTested: "Multi-3: Test Not Performed",
    };
  }

  if (normResult === "PENDING") {
    return {
      codes: [],
      positiveSubstancesStr: null,
      substanceTested: "Multi-3 Rapid Drug Screen (Result Pending)",
    };
  }

  if (normResult === "INVALID") {
    return {
      codes: [],
      positiveSubstancesStr: null,
      substanceTested: "Multi-3 Rapid Drug Screen (Invalid Specimen — Retest Required)",
    };
  }

  return {
    codes: [],
    positiveSubstancesStr: null,
    substanceTested: "Multi-3 Rapid Drug Screen (THC, METH, ECS)",
  };
}

/**
 * Idempotently ensures `drug_test_logs` has all columns required for Multi-3 consistency,
 * test time, session linkage, staff member, and traceable corrections.
 */
export async function ensureDrugTestSchema(customConn = null) {
  if (drugTestSchemaEnsured) return true;
  const db = customConn || pool;
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM drug_test_logs");
    const colMap = new Map(cols.map((c) => [c.Field, c]));

    // Ensure `result` column is VARCHAR(40) rather than a restrictive ENUM('NEGATIVE','POSITIVE')
    const resultCol = colMap.get("result");
    if (resultCol && /enum/i.test(String(resultCol.Type || ""))) {
      await db
        .query("ALTER TABLE drug_test_logs MODIFY COLUMN result VARCHAR(40) NOT NULL")
        .catch(() => {});
    }

    // Ensure `substance_tested` can accommodate Multi-3 detailed strings, triple-positive labels, and Invalid results
    const substanceCol = colMap.get("substance_tested");
    if (substanceCol && !/varchar\((?:25[5-9]|[3-9]\d\d|\d{4,})\)|text/i.test(String(substanceCol.Type || ""))) {
      await db
        .query("ALTER TABLE drug_test_logs MODIFY COLUMN substance_tested VARCHAR(255) NULL")
        .catch(() => {});
    }

    // Ensure `positive_substances` can accommodate expanded multi-substance codes
    const posSubCol = colMap.get("positive_substances");
    if (posSubCol && !/varchar\((?:15[0-9]|[2-9]\d\d|\d{4,})\)|text/i.test(String(posSubCol.Type || ""))) {
      await db
        .query("ALTER TABLE drug_test_logs MODIFY COLUMN positive_substances VARCHAR(150) NULL")
        .catch(() => {});
    }

    if (!colMap.has("test_time")) {
      await db.query("ALTER TABLE drug_test_logs ADD COLUMN test_time TIME NULL").catch(() => {});
    }
    if (!colMap.has("session_id")) {
      await db.query("ALTER TABLE drug_test_logs ADD COLUMN session_id INT NULL").catch(() => {});
    }
    if (!colMap.has("related_visit")) {
      await db.query("ALTER TABLE drug_test_logs ADD COLUMN related_visit VARCHAR(180) NULL").catch(() => {});
    }
    if (!colMap.has("positive_substances")) {
      await db.query("ALTER TABLE drug_test_logs ADD COLUMN positive_substances VARCHAR(60) NULL").catch(() => {});
    }
    if (!colMap.has("tested_by_name")) {
      await db.query("ALTER TABLE drug_test_logs ADD COLUMN tested_by_name VARCHAR(150) NULL").catch(() => {});
    }
    if (!colMap.has("is_corrected")) {
      await db.query("ALTER TABLE drug_test_logs ADD COLUMN is_corrected TINYINT(1) NOT NULL DEFAULT 0").catch(() => {});
    }
    if (!colMap.has("correction_reason")) {
      await db.query("ALTER TABLE drug_test_logs ADD COLUMN correction_reason TEXT NULL").catch(() => {});
    }
    if (!colMap.has("corrected_by")) {
      await db.query("ALTER TABLE drug_test_logs ADD COLUMN corrected_by INT NULL").catch(() => {});
    }
    if (!colMap.has("corrected_by_name")) {
      await db.query("ALTER TABLE drug_test_logs ADD COLUMN corrected_by_name VARCHAR(150) NULL").catch(() => {});
    }
    if (!colMap.has("corrected_at")) {
      await db.query("ALTER TABLE drug_test_logs ADD COLUMN corrected_at DATETIME NULL").catch(() => {});
    }
    if (!colMap.has("previous_result")) {
      await db.query("ALTER TABLE drug_test_logs ADD COLUMN previous_result VARCHAR(40) NULL").catch(() => {});
    }
    if (!colMap.has("previous_substance_tested")) {
      await db.query("ALTER TABLE drug_test_logs ADD COLUMN previous_substance_tested VARCHAR(255) NULL").catch(() => {});
    }

    drugTestSchemaEnsured = true;
    return true;
  } catch (err) {
    console.warn("ensureDrugTestSchema warning:", err.message);
    return false;
  }
}
