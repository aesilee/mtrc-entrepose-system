import pool from "../config/db.js";
import { notifyRoles } from "../utils/notify.js";
import {
  ensureCbteAndRiskSchema,
  normalizeSelfReportedRisk,
  normalizeStaffRiskAssessment,
} from "../utils/cbteAndRiskSchema.js";

export async function createProgressNote(req, res) {
  const { id: patientId } = req.params;
  const {
    sessionDate,
    sessionType,
    observation,
    interventionProvided,
    patientResponse,
    recommendations,
    nextFollowUpDate,
    relapseRisk,
    staffRiskAssessment,
  } = req.body;

  if (!sessionDate || !observation) {
    return res.status(400).json({ message: "Session date and observation are required." });
  }

  try {
    await ensureCbteAndRiskSchema();
    const [cols] = await pool.query("SHOW COLUMNS FROM progress_notes");
    const colNames = cols.map((c) => c.Field);
    const hasRelapseRisk = colNames.includes("relapse_risk");
    const hasStaffRisk = colNames.includes("staff_risk_assessment");

    const normalizedSelfRisk = normalizeSelfReportedRisk(relapseRisk);
    const normalizedStaffRisk = normalizeStaffRiskAssessment(staffRiskAssessment);

    let insertSql = `INSERT INTO progress_notes
        (patient_id, case_manager_id, session_date, session_type, observation,
         intervention_provided, patient_response, recommendations, next_follow_up_date${hasRelapseRisk ? ", relapse_risk" : ""}${hasStaffRisk ? ", staff_risk_assessment" : ""})
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?${hasRelapseRisk ? ", ?" : ""}${hasStaffRisk ? ", ?" : ""})`;
    const params = [
      patientId,
      req.user.id,
      sessionDate,
      sessionType || null,
      observation,
      interventionProvided || null,
      patientResponse || null,
      recommendations || null,
      nextFollowUpDate || null,
    ];
    if (hasRelapseRisk) params.push(normalizedSelfRisk);
    if (hasStaffRisk) params.push(normalizedStaffRisk);

    const [result] = await pool.query(insertSql, params);

    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, ?, ?)",
      [req.user.username, `Added a progress note for patient #${patientId} (Self-Reported: ${normalizedSelfRisk}${normalizedStaffRisk ? `, Staff Assessment: ${normalizedStaffRisk}` : ""})`, "patients", patientId]
    );

    const [[patientRow]] = await pool.query("SELECT full_name, assigned_case_manager_id FROM patients WHERE id = ?", [patientId]);
    await notifyRoles(["him_staff"], "documentation", "progress_note_added", `New progress note added for "${patientRow?.full_name || `#${patientId}`}" — pending documentation review`);

    // Distinguish NEARLY_USED (Strong Craving Without Substance Use) from USED (Actual Substance Use / Lapse)
    if (
      (normalizedSelfRisk === "AT_RISK" ||
        normalizedSelfRisk === "NEARLY_USED" ||
        normalizedSelfRisk === "USED") &&
      patientRow?.assigned_case_manager_id
    ) {
      const isActualUse = normalizedSelfRisk === "USED";
      const isNearUse = normalizedSelfRisk === "NEARLY_USED";
      const severity = isActualUse
        ? "ACTUAL SUBSTANCE USE / LAPSE"
        : isNearUse
        ? "NEAR-USE / STRONG CRAVING (NO SUBSTANCE USE)"
        : "AT RISK (TRIGGER EXPOSURE — NO USE)";
      const alertMessage = isNearUse
        ? `Client "${patientRow.full_name}" reported strong craving / near-use WITHOUT using substances (Abstinence Maintained) during progress note evaluation.`
        : `Client "${patientRow.full_name}" was recorded as "${normalizedSelfRisk}" during clinical progress note evaluation.`;
      await pool.query(
        "INSERT INTO notifications (user_id, category, event_type, title, message) VALUES (?, 'patients', 'relapse_risk_alert', ?, ?)",
        [
          patientRow.assigned_case_manager_id,
          `Schedule Book Status [${severity}]`,
          alertMessage,
        ]
      );
    }

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not save the progress note." });
  }
}

export async function updateProgressNote(req, res) {
  const { id } = req.params;
  const {
    sessionDate,
    sessionType,
    observation,
    interventionProvided,
    patientResponse,
    recommendations,
    nextFollowUpDate,
    relapseRisk,
    staffRiskAssessment,
  } = req.body;

  try {
    await ensureCbteAndRiskSchema();
    const [[note]] = await pool.query("SELECT id, case_manager_id FROM progress_notes WHERE id = ?", [id]);
    if (!note) return res.status(404).json({ message: "Progress note not found." });

    if (req.user.role === "case_manager" && note.case_manager_id && note.case_manager_id !== req.user.id) {
      return res.status(403).json({ message: "You can only edit progress notes authored by yourself." });
    }

    const [cols] = await pool.query("SHOW COLUMNS FROM progress_notes");
    const colNames = cols.map((c) => c.Field);
    const hasRelapseRisk = colNames.includes("relapse_risk");
    const hasStaffRisk = colNames.includes("staff_risk_assessment");

    const normalizedSelfRisk = normalizeSelfReportedRisk(relapseRisk);
    const normalizedStaffRisk = normalizeStaffRiskAssessment(staffRiskAssessment);

    let updateSql = `UPDATE progress_notes SET
        session_date = ?, session_type = ?, observation = ?,
        intervention_provided = ?, patient_response = ?, recommendations = ?, next_follow_up_date = ?
        ${hasRelapseRisk ? ", relapse_risk = ?" : ""}
        ${hasStaffRisk ? ", staff_risk_assessment = ?" : ""}
       WHERE id = ?`;
    const params = [
      sessionDate,
      sessionType || null,
      observation,
      interventionProvided || null,
      patientResponse || null,
      recommendations || null,
      nextFollowUpDate || null,
    ];
    if (hasRelapseRisk) params.push(normalizedSelfRisk);
    if (hasStaffRisk) params.push(normalizedStaffRisk);
    params.push(id);

    await pool.query(updateSql, params);
    res.json({ message: "Progress note updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update the progress note." });
  }
}