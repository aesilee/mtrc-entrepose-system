import pool from "../config/db.js";

export async function createProgressNote(req, res) {
  const { id: patientId } = req.params;
  const { sessionDate, sessionType, observation, interventionProvided, patientResponse, recommendations, nextFollowUpDate } = req.body;

  if (!sessionDate || !observation) {
    return res.status(400).json({ message: "Session date and observation are required." });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO progress_notes
        (patient_id, case_manager_id, session_date, session_type, observation,
         intervention_provided, patient_response, recommendations, next_follow_up_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patientId, req.user.id, sessionDate, sessionType || null, observation,
        interventionProvided || null, patientResponse || null, recommendations || null, nextFollowUpDate || null]
    );

    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, ?, ?)",
      [req.user.username, `Added a progress note for patient #${patientId}`, "patients", patientId]
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not save the progress note." });
  }
}

export async function updateProgressNote(req, res) {
  const { id } = req.params;
  const { sessionDate, sessionType, observation, interventionProvided, patientResponse, recommendations, nextFollowUpDate } = req.body;

  try {
    await pool.query(
      `UPDATE progress_notes SET
        session_date = ?, session_type = ?, observation = ?,
        intervention_provided = ?, patient_response = ?, recommendations = ?, next_follow_up_date = ?
       WHERE id = ?`,
      [sessionDate, sessionType || null, observation, interventionProvided || null,
        patientResponse || null, recommendations || null, nextFollowUpDate || null, id]
    );
    res.json({ message: "Progress note updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update the progress note." });
  }
}