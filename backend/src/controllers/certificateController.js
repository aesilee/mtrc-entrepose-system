import pool from "../config/db.js";
import { notifyIctAdmins, notifyRoles } from "../utils/notify.js";

const DEFAULT_REMARKS = "Successfully completed all required rehabilitation activities";

export async function generateCertificate(req, res) {
  const { id } = req.params;
  const { completionDate, remarks } = req.body;

  const [[patient]] = await pool.query(
    `SELECT p.id, p.full_name, p.patient_code, p.admission_date, pr.name AS program_name
     FROM patients p LEFT JOIN programs pr ON pr.id = p.program_id
     WHERE p.id = ?`,
    [id]
  );
  if (!patient) return res.status(404).json({ message: "Patient not found." });

  const [[preparer]] = await pool.query("SELECT full_name FROM users WHERE id = ?", [req.user.id]);

  const finalCompletionDate = completionDate || new Date().toISOString().slice(0, 10);
  const finalRemarks = remarks?.trim() || DEFAULT_REMARKS;

  try {
    const [result] = await pool.query(
      `INSERT INTO certificates
        (patient_id, certificate_type, patient_name, patient_code, program_name,
         admission_date, completion_date, prepared_by_name, remarks, issued_by)
       VALUES (?, 'completion', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, patient.full_name, patient.patient_code, patient.program_name || null,
        patient.admission_date, finalCompletionDate, preparer?.full_name || req.user.username,
        finalRemarks, req.user.id,
      ]
    );

    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, ?, ?)",
      [req.user.username, `Generated a completion certificate for patient "${patient.full_name}"`, "patients", id]
    );

   await notifyRoles(["ict_admin", "him_staff"], "certificates", "certificate_generated", `Certificate of completion generated for "${patient.full_name}" — by ${req.user.username}`);

    res.status(201).json({
      id: result.insertId,
      certificateType: "completion",
      patientName: patient.full_name,
      patientCode: patient.patient_code,
      program: patient.program_name || "—",
      admissionDate: patient.admission_date,
      completionDate: finalCompletionDate,
      preparedBy: preparer?.full_name || req.user.username,
      remarks: finalRemarks,
      issuedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not generate the certificate." });
  }
}

export async function getCertificate(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query("SELECT * FROM certificates WHERE id = ?", [id]);
  if (!rows[0]) return res.status(404).json({ message: "Certificate not found." });

  const c = rows[0];
  res.json({
    id: c.id,
    certificateType: c.certificate_type,
    patientName: c.patient_name,
    patientCode: c.patient_code,
    program: c.program_name || "—",
    admissionDate: c.admission_date,
    completionDate: c.completion_date,
    preparedBy: c.prepared_by_name,
    remarks: c.remarks,
    issuedAt: c.issued_at,
  });
}

export async function deleteCertificate(req, res) {
  const { id } = req.params;

  const [[cert]] = await pool.query("SELECT patient_id, patient_name FROM certificates WHERE id = ?", [id]);
  if (!cert) return res.status(404).json({ message: "Certificate not found." });

  try {
    await pool.query("DELETE FROM certificates WHERE id = ?", [id]);

    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, ?, ?)",
      [req.user.username, `Deleted a completion certificate for patient "${cert.patient_name}"`, "patients", cert.patient_id]
    );

    res.json({ message: "Certificate deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete the certificate." });
  }
}