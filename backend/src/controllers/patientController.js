import pool from "../config/db.js";
import { notifyIctAdmins, notifyRoles, notifyUser } from "../utils/notify.js";

async function generatePatientCode() {
  const year = new Date().getFullYear();
  const [[{ count }]] = await pool.query(
    `SELECT COUNT(*) as count FROM patients WHERE patient_code LIKE ?`,
    [`MTRC-${year}-%`]
  );
  const sequence = String(count + 1).padStart(4, "0");
  return `MTRC-${year}-${sequence}`;
}

export async function listPatients(req, res) {
  const clauses = ["p.is_archived = FALSE"];
  const params = [];

  if (req.user.role === "case_manager") {
    clauses.push("p.assigned_case_manager_id = ?");
    params.push(req.user.id);
  }

  const [rows] = await pool.query(
    `SELECT p.id, p.patient_code, p.full_name, p.gender, p.municipality,
            p.admission_date, p.enrollment_status, p.is_archived,
            p.assigned_case_manager_id AS case_manager_id,
            u.full_name AS case_manager_name,
            (SELECT COUNT(*) FROM attendance a WHERE a.patient_id = p.id) AS total_sessions,
            (SELECT COUNT(*) FROM attendance a WHERE a.patient_id = p.id AND a.status = 'present') AS present_sessions
     FROM patients p
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     WHERE ${clauses.join(" AND ")}
     ORDER BY p.created_at DESC`,
    params
  );

  const patients = rows.map((p) => ({
    ...p,
    attendance_rate: p.total_sessions > 0 ? Math.round((p.present_sessions / p.total_sessions) * 100) : null,
  }));

  res.json({ patients });
}

export async function updatePatient(req, res) {
  const { id } = req.params;
  const fields = req.body;

  const columnMap = {
    firstName: "first_name", middleName: "middle_name", lastName: "last_name",
    gender: "gender", birthdate: "birthdate", civilStatus: "civil_status",
    contactNumber: "contact_number", email: "email", address: "address", municipality: "municipality",
    photoDataUrl: "photo_url",
    emergencyContactName: "emergency_contact_name",
    emergencyContactRelationship: "emergency_contact_relationship",
    emergencyContactNumber: "emergency_contact_number",
    admissionDate: "admission_date", referralSource: "referral_source",
    admissionType: "admission_type", programId: "program_id",
    assignedCaseManagerId: "assigned_case_manager_id", admissionNotes: "admission_notes",
    initialAssessment: "initial_assessment",
    enrollmentStatus: "enrollment_status",
    currentStatus: "current_status", programPhase: "program_phase",
    expectedCompletionDate: "expected_completion_date", sessionsRequired: "sessions_required",
  };

  const setClauses = [];
  const values = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (fields[key] !== undefined) {
      setClauses.push(`${column} = ?`);
      values.push(fields[key] === "" ? null : fields[key]);
    }
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ message: "No fields to update." });
  }

  // Single consolidated pre-fetch query to check current patient state
  const [[current]] = await pool.query(
    "SELECT first_name, middle_name, last_name, full_name, enrollment_status, assigned_case_manager_id FROM patients WHERE id = ?",
    [id]
  );

  if (fields.firstName || fields.middleName || fields.lastName) {
    const fullName = [
      fields.firstName ?? current?.first_name,
      fields.middleName ?? current?.middle_name,
      fields.lastName ?? current?.last_name,
    ].filter(Boolean).join(" ");
    setClauses.push("full_name = ?");
    values.push(fullName);
  }

  // Check for an enrollment status change
  let statusChangeMessage = null;
  if (fields.enrollmentStatus && current && current.enrollment_status !== fields.enrollmentStatus) {
    statusChangeMessage = `Changed enrollment status from "${current.enrollment_status}" to "${fields.enrollmentStatus}"`;
    if (fields.statusRemark) statusChangeMessage += ` — ${fields.statusRemark}`;
  }

  values.push(id);

  try {
    await pool.query(`UPDATE patients SET ${setClauses.join(", ")} WHERE id = ?`, values);

    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, ?, ?)",
      [req.user.username, statusChangeMessage || `Updated patient record #${id}`, "patients", id]
    );

    const [[updatedPatient]] = await pool.query("SELECT full_name FROM patients WHERE id = ?", [id]);
    await notifyRoles(["ict_admin", "him_staff"], "patients", "patient_updated", `Patient record updated: "${updatedPatient?.full_name || `#${id}`}" — by ${req.user.username}`);

    // Notify newly assigned case manager on reassignment (with self-notification guard)
    if (
      fields.assignedCaseManagerId &&
      current &&
      Number(fields.assignedCaseManagerId) !== Number(current.assigned_case_manager_id) &&
      Number(fields.assignedCaseManagerId) !== Number(req.user.id)
    ) {
      await notifyUser(
        fields.assignedCaseManagerId,
        "patients",
        "patient_assigned",
        `Patient "${current.full_name}" has been assigned to you`
      );
    }

    res.json({ message: "Patient updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update the patient record." });
  }
}

export async function getPatient(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT p.*, u.full_name AS case_manager_name, pr.name AS program_name
     FROM patients p
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     LEFT JOIN programs pr ON pr.id = p.program_id
     WHERE p.id = ?`,
    [id]
  );
  if (!rows[0]) return res.status(404).json({ message: "Patient not found." });
  if (req.user.role === "case_manager" && rows[0].assigned_case_manager_id !== req.user.id) {
    return res.status(403).json({ message: "You do not have access to this patient." });
  }
  res.json({ patient: rows[0] });
}

export async function getPatientAttendance(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT id, session_date, session_type, status, notes
     FROM attendance WHERE patient_id = ? ORDER BY session_date DESC`,
    [id]
  );
  res.json({ attendance: rows });
}

export async function getPatientProgressNotes(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT pn.id, pn.session_date, pn.session_type, pn.observation, pn.intervention_provided,
            pn.patient_response, pn.recommendations, pn.next_follow_up_date,
            pn.created_at, pn.updated_at, u.full_name AS case_manager_name
     FROM progress_notes pn
     LEFT JOIN users u ON u.id = pn.case_manager_id
     WHERE pn.patient_id = ? ORDER BY pn.session_date DESC, pn.created_at DESC`,
    [id]
  );
  res.json({ progressNotes: rows });
}

export async function getPatientTimeline(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT 'progress_note' AS event_type,
            CONCAT('Progress note added', IF(session_type IS NOT NULL, CONCAT(' — ', session_type), '')) AS title,
            observation AS detail, created_at AS event_date
     FROM progress_notes WHERE patient_id = ?
     UNION ALL
     SELECT 'attendance', CONCAT('Attendance recorded: ', status), session_type, created_at
     FROM attendance WHERE patient_id = ?
     UNION ALL
     SELECT 'follow_up_scheduled', 'Follow-up scheduled', reason, created_at
     FROM follow_ups WHERE patient_id = ?
     UNION ALL
     SELECT 'follow_up_completed', 'Follow-up completed', completed_remarks, resolved_at
     FROM follow_ups WHERE patient_id = ? AND status = 'completed' AND resolved_at IS NOT NULL
     UNION ALL
     SELECT 'certificate', CONCAT(certificate_type, ' certificate issued'), NULL, issued_at
     FROM certificates WHERE patient_id = ?
     ORDER BY event_date DESC
     LIMIT 50`,
    [id, id, id, id, id]
  );
  res.json({ timeline: rows });
}

export async function getPatientCertificates(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT c.id, c.certificate_type, c.completion_date, c.issued_at, u.full_name AS issued_by_name
     FROM certificates c
     LEFT JOIN users u ON u.id = c.issued_by
     WHERE c.patient_id = ? ORDER BY c.issued_at DESC`,
    [id]
  );
  res.json({ certificates: rows });
}

export async function getPatientHistory(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT actor_username, action, created_at
     FROM audit_log WHERE table_name = 'patients' AND record_id = ?
     ORDER BY created_at DESC`,
    [id]
  );
  res.json({ history: rows });
}

export async function createPatient(req, res) {
  const {
    firstName, middleName, lastName, gender, birthdate, civilStatus,
    contactNumber, email, address, municipality,
    emergencyContactName, emergencyContactRelationship, emergencyContactNumber,
    admissionDate, referralSource, admissionType, programId,
    assignedCaseManagerId, admissionNotes,
    caseClassification, initialStatus, programPhase,
    expectedCompletionDate, sessionsRequired,
  } = req.body;

  if (!firstName || !lastName || !gender || !birthdate) {
    return res.status(400).json({ message: "First name, last name, gender, and birthdate are required." });
  }

  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");

  try {
    const patientCode = await generatePatientCode();

    const [result] = await pool.query(
      `INSERT INTO patients (
        patient_code, first_name, middle_name, last_name, full_name,
        gender, birthdate, civil_status, contact_number, email, address, municipality,
        emergency_contact_name, emergency_contact_relationship, emergency_contact_number,
        admission_date, referral_source, admission_type, program_id,
        assigned_case_manager_id, admission_notes,
        case_classification, initial_status, current_status, program_phase,
        expected_completion_date, sessions_required, registered_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientCode, firstName, middleName || null, lastName, fullName,
        gender, birthdate, civilStatus || "single", contactNumber || null, email || null, address || null, municipality || null,
        emergencyContactName || null, emergencyContactRelationship || null, emergencyContactNumber || null,
        admissionDate || null, referralSource || null, admissionType || null, programId || null,
        assignedCaseManagerId || null, admissionNotes || null,
        caseClassification || null, initialStatus || null, initialStatus || null, programPhase || null,
        expectedCompletionDate || null, sessionsRequired || null, req.user.id,
      ]
    );

    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, ?, ?)",
      [req.user.username, `Registered patient "${fullName}" (${patientCode})`, "patients", result.insertId]
    );

    await notifyRoles(["ict_admin", "him_staff"], "patients", "patient_registered", `New patient registered: "${fullName}" (${patientCode}) — by ${req.user.username}`);

    if (assignedCaseManagerId && Number(assignedCaseManagerId) !== Number(req.user.id)) {
      await notifyUser(
        assignedCaseManagerId,
        "patients",
        "patient_assigned",
        `New patient assigned: "${fullName}" (${patientCode})`
      );
    }

    res.status(201).json({ id: result.insertId, patientCode, message: "Patient registered." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not register the patient." });
  }
}