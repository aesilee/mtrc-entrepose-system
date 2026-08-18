import pool from "../config/db.js";
import { notifyIctAdmins } from "../utils/notify.js";

export async function listArchives(req, res) {
  const { category } = req.query; // reserved for future entity types; only 'patient' exists today
  const clauses = ["a.restored_at IS NULL"];
  const params = [];

  if (category && category !== "all") {
    clauses.push("a.entity_type = ?");
    params.push(category);
  }

  if (req.user.role === "case_manager") {
    clauses.push("a.entity_type = 'patient'");
    clauses.push("p.assigned_case_manager_id = ?");
    params.push(req.user.id);
  }

  const [rows] = await pool.query(
    `SELECT a.id, a.entity_type, a.entity_id, a.entity_label, a.reason,
            a.archived_at, ua.full_name AS archived_by_name, ua.username AS archived_by_username,
            p.enrollment_status, p.patient_code
     FROM archives a
     LEFT JOIN users ua ON ua.id = a.archived_by
     LEFT JOIN patients p ON a.entity_type = 'patient' AND a.entity_id = p.id
     WHERE ${clauses.join(" AND ")}
     ORDER BY a.archived_at DESC`,
    params
  );

  res.json({ archives: rows });
}

export async function archivePatient(req, res) {
  const { id } = req.params;
  const { reason } = req.body;

  const [[patient]] = await pool.query("SELECT id, full_name, patient_code, is_archived FROM patients WHERE id = ?", [id]);
  if (!patient) return res.status(404).json({ message: "Patient not found." });
  if (patient.is_archived) return res.status(400).json({ message: "This patient is already archived." });

  try {
    await pool.query("UPDATE patients SET is_archived = TRUE, archived_at = NOW(), archived_by = ? WHERE id = ?", [req.user.id, id]);
    await pool.query(
      "INSERT INTO archives (entity_type, entity_id, entity_label, reason, archived_by) VALUES ('patient', ?, ?, ?, ?)",
      [id, `${patient.full_name} (${patient.patient_code})`, reason || null, req.user.id]
    );
    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, ?, ?)",
      [req.user.username, `Archived patient "${patient.full_name}"`, "patients", id]
    );

    await notifyIctAdmins("patients", "patient_archived", `Patient archived: "${patient.full_name}" — by ${req.user.username}`);

    res.json({ message: "Patient archived." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not archive this patient." });
  }
}

export async function restorePatient(req, res) {
  const { id } = req.params;

  const [[patient]] = await pool.query("SELECT id, full_name, is_archived FROM patients WHERE id = ?", [id]);
  if (!patient) return res.status(404).json({ message: "Patient not found." });
  if (!patient.is_archived) return res.status(400).json({ message: "This patient is not archived." });

  try {
    await pool.query("UPDATE patients SET is_archived = FALSE, archived_at = NULL, archived_by = NULL WHERE id = ?", [id]);
    await pool.query(
      `UPDATE archives SET restored_at = NOW(), restored_by = ?
       WHERE entity_type = 'patient' AND entity_id = ? AND restored_at IS NULL`,
      [req.user.id, id]
    );
    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, ?, ?)",
      [req.user.username, `Restored patient "${patient.full_name}" from archives`, "patients", id]
    );

    await notifyIctAdmins("patients", "patient_restored", `Patient restored from archives: "${patient.full_name}" — by ${req.user.username}`);

    res.json({ message: "Patient restored." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not restore this patient." });
  }
}