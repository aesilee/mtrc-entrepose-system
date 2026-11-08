import pool from "../config/db.js";
import { notifyRoles } from "../utils/notify.js";

export async function createProgressNote(req, res) {
  const { id: patientId } = req.params;
  const { sessionDate, sessionType, observation, interventionProvided, patientResponse, recommendations, nextFollowUpDate, relapseRisk } = req.body;

  if (!sessionDate || !observation) {
    return res.status(400).json({ message: "Session date and observation are required." });
  }

  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM progress_notes LIKE 'relapse_risk'");
    const hasRelapseRisk = cols.length > 0;

    let insertSql = `INSERT INTO progress_notes
        (patient_id, case_manager_id, session_date, session_type, observation,
         intervention_provided, patient_response, recommendations, next_follow_up_date${hasRelapseRisk ? ", relapse_risk" : ""})
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?${hasRelapseRisk ? ", ?" : ""})`;
    const params = [patientId, req.user.id, sessionDate, sessionType || null, observation,
      interventionProvided || null, patientResponse || null, recommendations || null, nextFollowUpDate || null];
    if (hasRelapseRisk) params.push(relapseRisk || "SAFE");

    const [result] = await pool.query(insertSql, params);

    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, ?, ?)",
      [req.user.username, `Added a progress note for patient #${patientId}`, "patients", patientId]
    );

    const [[patientRow]] = await pool.query("SELECT full_name, assigned_case_manager_id FROM patients WHERE id = ?", [patientId]);
    await notifyRoles(["him_staff"], "documentation", "progress_note_added", `New progress note added for "${patientRow?.full_name || `#${patientId}`}" — pending documentation review`);

    // If relapse risk is AT_RISK or USED, alert assigned Case Manager
    if ((relapseRisk === "AT_RISK" || relapseRisk === "USED") && patientRow?.assigned_case_manager_id) {
      const severity = relapseRisk === "USED" ? "URGENT LAPSE/SLIP" : "AT RISK";
      await pool.query(
        "INSERT INTO notifications (user_id, category, event_type, title, message) VALUES (?, 'patients', 'relapse_risk_alert', ?, ?)",
        [
          patientRow.assigned_case_manager_id,
          `Relapse Risk Alert [${severity}]`,
          `Client "${patientRow.full_name}" was rated "${relapseRisk}" during clinical progress note evaluation.`
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
  const { sessionDate, sessionType, observation, interventionProvided, patientResponse, recommendations, nextFollowUpDate, relapseRisk } = req.body;

  try {
    const [[note]] = await pool.query("SELECT id, case_manager_id FROM progress_notes WHERE id = ?", [id]);
    if (!note) return res.status(404).json({ message: "Progress note not found." });

    if (req.user.role === "case_manager" && note.case_manager_id && note.case_manager_id !== req.user.id) {
      return res.status(403).json({ message: "You can only edit progress notes authored by yourself." });
    }

    const [cols] = await pool.query("SHOW COLUMNS FROM progress_notes LIKE 'relapse_risk'");
    const hasRelapseRisk = cols.length > 0;

    let updateSql = `UPDATE progress_notes SET
        session_date = ?, session_type = ?, observation = ?,
        intervention_provided = ?, patient_response = ?, recommendations = ?, next_follow_up_date = ?
        ${hasRelapseRisk ? ", relapse_risk = ?" : ""}
       WHERE id = ?`;
    const params = [sessionDate, sessionType || null, observation, interventionProvided || null,
      patientResponse || null, recommendations || null, nextFollowUpDate || null];
    if (hasRelapseRisk) params.push(relapseRisk || "SAFE");
    params.push(id);

    await pool.query(updateSql, params);
    res.json({ message: "Progress note updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update the progress note." });
  }
}