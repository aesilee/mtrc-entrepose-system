import pool from "../config/db.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const ALLOWED_DOCUMENT_TYPES = new Set(["court_order_lgu_letter", "dde_result", "other"]);

function cleanFileName(value) {
  let decoded = "";
  try {
    decoded = decodeURIComponent(String(value || ""));
  } catch {
    decoded = String(value || "");
  }
  const name = decoded
    .replace(/[\\/]/g, "_")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  return name.slice(0, 255);
}

function hasValidSignature(buffer, mimeType) {
  if (mimeType === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return false;
}

function canAccessPatient(user, patient) {
  return user.role !== "case_manager" || Number(patient.assigned_case_manager_id) === Number(user.id);
}

async function getPatient(connection, patientId) {
  const [[patient]] = await connection.query(
    `SELECT id, patient_code, full_name, is_archived, assigned_case_manager_id
     FROM patients WHERE id = ?`,
    [patientId]
  );
  return patient;
}

async function getReferral(connection, patientId) {
  const [[referral]] = await connection.query(
    "SELECT id, status, document_status FROM patient_referrals WHERE patient_id = ?",
    [patientId]
  );
  return referral || null;
}

async function ensureDraftReferral(connection, patientId, userId) {
  let referral = await getReferral(connection, patientId);
  if (referral) return referral;

  const [result] = await connection.query(
    "INSERT INTO patient_referrals (patient_id, status, created_by) VALUES (?, 'draft', ?)",
    [patientId, userId]
  );
  return { id: result.insertId, status: "draft", document_status: "pending" };
}

export async function listReferralDocuments(req, res) {
  const patientId = Number(req.params.patientId);
  if (!Number.isInteger(patientId)) return res.status(400).json({ message: "Invalid patient ID." });

  try {
    const patient = await getPatient(pool, patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found." });
    if (!canAccessPatient(req.user, patient)) {
      return res.status(403).json({ message: "You do not have access to this patient." });
    }

    const referral = await getReferral(pool, patientId);
    if (!referral) return res.json({ documents: [] });

    const [documents] = await pool.query(
      `SELECT d.id, d.document_type, d.original_name, d.mime_type, d.file_size, d.created_at,
              u.full_name AS uploaded_by_name
       FROM patient_referral_documents d
       LEFT JOIN users u ON u.id = d.uploaded_by
       WHERE d.referral_id = ?
       ORDER BY d.created_at DESC, d.id DESC`,
      [referral.id]
    );
    res.json({ documents });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load referral documents." });
  }
}

export async function uploadReferralDocument(req, res) {
  const patientId = Number(req.params.patientId);
  const mimeType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  const originalName = cleanFileName(req.headers["x-file-name"]);
  const documentType = String(req.headers["x-document-type"] || "other").trim().toLowerCase();
  const file = Buffer.isBuffer(req.body) ? req.body : null;

  if (!Number.isInteger(patientId)) return res.status(400).json({ message: "Invalid patient ID." });
  if (!ALLOWED_TYPES.has(mimeType)) return res.status(415).json({ message: "Only PDF, JPG, and PNG files are allowed." });
  if (!ALLOWED_DOCUMENT_TYPES.has(documentType)) return res.status(400).json({ message: "Select a valid admission document type." });
  if (!originalName) return res.status(400).json({ message: "The document must have a file name." });
  if (!file?.length) return res.status(400).json({ message: "The selected document is empty." });
  if (file.length > MAX_FILE_SIZE) return res.status(413).json({ message: "Each document must be 10 MB or smaller." });
  if (!hasValidSignature(file, mimeType)) {
    return res.status(400).json({ message: "The file contents do not match the selected file type." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const patient = await getPatient(connection, patientId);
    if (!patient) {
      await connection.rollback();
      return res.status(404).json({ message: "Patient not found." });
    }
    if (patient.is_archived) {
      await connection.rollback();
      return res.status(409).json({ message: "Restore the patient before uploading referral documents." });
    }

    const referral = await ensureDraftReferral(connection, patientId, req.user.id);
    if (["intake_in_progress", "intake_completed"].includes(referral.status)) {
      await connection.rollback();
      return res.status(409).json({ message: "Referral documents are locked because Initial Intake has started." });
    }

    const [result] = await connection.query(
      `INSERT INTO patient_referral_documents
         (referral_id, document_type, original_name, mime_type, file_size, file_data, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [referral.id, documentType, originalName, mimeType, file.length, file, req.user.id]
    );
    await connection.query(
      "UPDATE patient_referrals SET document_status = 'uploaded' WHERE id = ?",
      [referral.id]
    );
    await connection.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patient_referral_documents', ?)",
      [req.user.username, `Uploaded referral document \"${originalName}\" for ${patient.patient_code}`, result.insertId]
    );
    await connection.commit();

    res.status(201).json({
      message: "Referral document uploaded.",
      document: {
        id: result.insertId,
        document_type: documentType,
        original_name: originalName,
        mime_type: mimeType,
        file_size: file.length,
        uploaded_by_name: req.user.fullName,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "Could not upload the referral document." });
  } finally {
    connection.release();
  }
}

export async function downloadReferralDocument(req, res) {
  const patientId = Number(req.params.patientId);
  const documentId = Number(req.params.documentId);
  if (!Number.isInteger(patientId) || !Number.isInteger(documentId)) {
    return res.status(400).json({ message: "Invalid document request." });
  }

  try {
    const patient = await getPatient(pool, patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found." });
    if (!canAccessPatient(req.user, patient)) {
      return res.status(403).json({ message: "You do not have access to this patient." });
    }

    const [[document]] = await pool.query(
      `SELECT d.original_name, d.mime_type, d.file_size, d.file_data
       FROM patient_referral_documents d
       JOIN patient_referrals r ON r.id = d.referral_id
       WHERE d.id = ? AND r.patient_id = ?`,
      [documentId, patientId]
    );
    if (!document) return res.status(404).json({ message: "Referral document not found." });

    const asciiName = document.original_name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
    res.setHeader("Content-Type", document.mime_type);
    res.setHeader("Content-Length", document.file_size);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(document.original_name)}`
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.send(document.file_data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not download the referral document." });
  }
}

export async function deleteReferralDocument(req, res) {
  const patientId = Number(req.params.patientId);
  const documentId = Number(req.params.documentId);
  if (!Number.isInteger(patientId) || !Number.isInteger(documentId)) {
    return res.status(400).json({ message: "Invalid document request." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const patient = await getPatient(connection, patientId);
    if (!patient) {
      await connection.rollback();
      return res.status(404).json({ message: "Patient not found." });
    }
    if (patient.is_archived) {
      await connection.rollback();
      return res.status(409).json({ message: "Restore the patient before removing referral documents." });
    }

    const [[document]] = await connection.query(
      `SELECT d.id, d.original_name, d.referral_id, r.status
       FROM patient_referral_documents d
       JOIN patient_referrals r ON r.id = d.referral_id
       WHERE d.id = ? AND r.patient_id = ? FOR UPDATE`,
      [documentId, patientId]
    );
    if (!document) {
      await connection.rollback();
      return res.status(404).json({ message: "Referral document not found." });
    }
    if (["intake_in_progress", "intake_completed"].includes(document.status)) {
      await connection.rollback();
      return res.status(409).json({ message: "Referral documents are locked because Initial Intake has started." });
    }

    await connection.query("DELETE FROM patient_referral_documents WHERE id = ?", [documentId]);
    const [[remaining]] = await connection.query(
      "SELECT COUNT(*) AS count FROM patient_referral_documents WHERE referral_id = ?",
      [document.referral_id]
    );
    if (!remaining.count) {
      await connection.query(
        "UPDATE patient_referrals SET document_status = 'pending' WHERE id = ? AND document_status = 'uploaded'",
        [document.referral_id]
      );
    }
    await connection.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patient_referral_documents', ?)",
      [req.user.username, `Removed referral document \"${document.original_name}\" from ${patient.patient_code}`, documentId]
    );
    await connection.commit();
    res.json({ message: "Referral document removed." });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "Could not remove the referral document." });
  } finally {
    connection.release();
  }
}
