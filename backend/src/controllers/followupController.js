import pool from "../config/db.js";

export async function getPatientFollowUps(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT f.id, f.reason, f.status, f.due_date, f.completed_remarks, f.resolved_at, f.created_at,
            u.full_name AS assigned_to_name
     FROM follow_ups f LEFT JOIN users u ON u.id = f.assigned_to
     WHERE f.patient_id = ? ORDER BY f.due_date DESC`,
    [id]
  );
  res.json({ followUps: rows });
}

export async function createFollowUp(req, res) {
  const { id } = req.params;
  const { reason, dueDate } = req.body;

  if (!reason || !dueDate) {
    return res.status(400).json({ message: "Reason and follow-up date are required." });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO follow_ups (patient_id, assigned_to, reason, due_date, status) VALUES (?, ?, ?, ?, 'pending')`,
      [id, req.user.id, reason, dueDate]
    );

    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, ?, ?)",
      [req.user.username, `Scheduled a follow-up for patient #${id}`, "patients", id]
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not schedule the follow-up." });
  }
}

export async function completeFollowUp(req, res) {
  const { id } = req.params;
  const { completedRemarks } = req.body;

  try {
    await pool.query(
      `UPDATE follow_ups SET status = 'completed', resolved_at = NOW(), completed_remarks = ? WHERE id = ?`,
      [completedRemarks || null, id]
    );
    res.json({ message: "Follow-up marked complete." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update the follow-up." });
  }
}