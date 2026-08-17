import pool from "../config/db.js";
import { notifyRoles } from "../utils/notify.js";

const CERTIFICATE_TYPES = new Set(["enrollment", "completion"]);
const DEFAULT_REMARKS = {
  enrollment: "Officially enrolled in the rehabilitation program",
  completion: "Successfully completed all required rehabilitation activities",
};

export async function listCertificates(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.patient_id, c.certificate_type, c.patient_name, c.patient_code,
              c.program_name, c.admission_date, c.completion_date, c.prepared_by_name,
              c.remarks, c.issued_at, u.full_name AS issued_by_name
       FROM certificates c
       LEFT JOIN users u ON u.id = c.issued_by
       ORDER BY c.issued_at DESC, c.id DESC`
    );

    res.json({ certificates: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load certificates." });
  }
}

export async function generateCertificate(req, res) {
  const { id } = req.params;
  const { certificateType = "completion", completionDate, remarks } = req.body;

  if (!CERTIFICATE_TYPES.has(certificateType)) {
    return res.status(400).json({ message: "Unsupported certificate type." });
  }

  if (req.user.role === "admitting" && certificateType !== "enrollment") {
    return res.status(403).json({ message: "Admitting Personnel can only generate enrollment certificates." });
  }

  try {
    const [[patient]] = await pool.query(
      `SELECT p.id, p.full_name, p.patient_code, p.admission_date,
              pr.name AS program_name, cm.full_name AS case_manager_name
       FROM patients p
       LEFT JOIN programs pr ON pr.id = p.program_id
       LEFT JOIN users cm ON cm.id = p.assigned_case_manager_id
       WHERE p.id = ?`,
      [id]
    );
    if (!patient) return res.status(404).json({ message: "Patient not found." });

    const [[preparer]] = await pool.query("SELECT full_name FROM users WHERE id = ?", [req.user.id]);
    const finalCompletionDate = certificateType === "completion"
      ? completionDate || new Date().toISOString().slice(0, 10)
      : null;
    const finalRemarks = typeof remarks === "string" && remarks.trim()
      ? remarks.trim()
      : DEFAULT_REMARKS[certificateType];
    const certificateLabel = certificateType === "enrollment" ? "enrollment" : "completion";
    const auditCertificateLabel = certificateType === "enrollment" ? "an enrollment" : "a completion";

    const [result] = await pool.query(
      `INSERT INTO certificates
        (patient_id, certificate_type, patient_name, patient_code, program_name,
         admission_date, completion_date, prepared_by_name, remarks, issued_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, certificateType, patient.full_name, patient.patient_code, patient.program_name || null,
        patient.admission_date, finalCompletionDate, preparer?.full_name || req.user.username,
        finalRemarks, req.user.id,
      ]
    );

    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, ?, ?)",
      [req.user.username, `Generated ${auditCertificateLabel} certificate for patient "${patient.full_name}"`, "patients", id]
    );

    await notifyRoles(
      ["ict_admin", "him_staff", "admitting"],
      "certificates",
      "certificate_generated",
      `Certificate of ${certificateLabel} generated for "${patient.full_name}" — by ${req.user.username}`
    );

    res.status(201).json({
      id: result.insertId,
      certificateType,
      patientName: patient.full_name,
      patientCode: patient.patient_code,
      program: patient.program_name || "—",
      caseManager: patient.case_manager_name || "Unassigned",
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
  try {
    const [rows] = await pool.query(
      `SELECT c.*, cm.full_name AS case_manager_name
       FROM certificates c
       LEFT JOIN patients p ON p.id = c.patient_id
       LEFT JOIN users cm ON cm.id = p.assigned_case_manager_id
       WHERE c.id = ?`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: "Certificate not found." });

    const c = rows[0];
    res.json({
      id: c.id,
      certificateType: c.certificate_type,
      patientName: c.patient_name,
      patientCode: c.patient_code,
      program: c.program_name || "—",
      caseManager: c.case_manager_name || "Unassigned",
      admissionDate: c.admission_date,
      completionDate: c.completion_date,
      preparedBy: c.prepared_by_name,
      remarks: c.remarks,
      issuedAt: c.issued_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load the certificate." });
  }
}

export async function deleteCertificate(req, res) {
  const { id } = req.params;
  try {
    const [[cert]] = await pool.query(
      "SELECT patient_id, patient_name, certificate_type FROM certificates WHERE id = ?",
      [id]
    );
    if (!cert) return res.status(404).json({ message: "Certificate not found." });

    await pool.query("DELETE FROM certificates WHERE id = ?", [id]);
    const deletedCertificateLabel = cert.certificate_type === "enrollment" ? "an enrollment" : "a completion";

    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, ?, ?)",
      [req.user.username, `Deleted ${deletedCertificateLabel} certificate for patient "${cert.patient_name}"`, "patients", cert.patient_id]
    );

    res.json({ message: "Certificate deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete the certificate." });
  }
}
