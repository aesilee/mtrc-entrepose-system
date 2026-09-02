import pool from "../config/db.js";
import { notifyIctAdmins, notifyRoles, notifyUser } from "../utils/notify.js";

function cleanText(value) {
  return typeof value === "string" ? value.trim() : value;
}

function validPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function ageFromBirthdate(birthdate) {
  const [year, month, day] = String(birthdate || "").split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() + 1 !== month
    || parsed.getUTCDate() !== day
  ) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  const birthdayHasPassed = today.getMonth() + 1 > month
    || (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!birthdayHasPassed) age -= 1;
  return age;
}

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
    `SELECT p.id, p.patient_code, p.full_name, p.photo_url, p.gender, p.municipality,
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

  if (fields.emergencyContactMethod !== undefined && (cleanText(fields.emergencyContactMethod) || "").length > 30) {
    return res.status(400).json({ message: "Preferred contact method must be 30 characters or fewer." });
  }

  const emergencyContactEmail = cleanText(fields.emergencyContactEmail) || "";
  if (emergencyContactEmail.length > 255) {
    return res.status(400).json({ message: "Emergency contact email must be 255 characters or fewer." });
  }
  if (emergencyContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emergencyContactEmail)) {
    return res.status(400).json({ message: "Enter a valid emergency contact email address." });
  }
  if (fields.emergencyContactMethod === "email" && !emergencyContactEmail) {
    return res.status(400).json({ message: "Emergency contact email is required when Email is the preferred contact method." });
  }

  const columnMap = {
    firstName: "first_name", middleName: "middle_name", lastName: "last_name", suffix: "suffix",
    preferredName: "preferred_name",
    gender: "gender", birthdate: "birthdate", civilStatus: "civil_status",
    nationality: "nationality", occupation: "occupation", educationalAttainment: "educational_attainment",
    contactNumber: "contact_number", email: "email", address: "address", municipality: "municipality",
    province: "province", postalCode: "postal_code",
    photoDataUrl: "photo_url",
    emergencyContactName: "emergency_contact_name",
    emergencyContactRelationship: "emergency_contact_relationship",
    emergencyContactNumber: "emergency_contact_number",
    emergencyContactEmail: "emergency_contact_email",
    emergencyContactAddress: "emergency_contact_address",
    emergencyContactMethod: "emergency_contact_method",
    guardianName: "guardian_name", guardianRelationship: "guardian_relationship",
    guardianContactNumber: "guardian_contact_number", guardianAddress: "guardian_address",
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
    "SELECT first_name, middle_name, last_name, suffix, full_name, enrollment_status, assigned_case_manager_id FROM patients WHERE id = ?",
    [id]
  );

  if (["firstName", "middleName", "lastName", "suffix"].some((key) => fields[key] !== undefined)) {
    const fullName = [
      fields.firstName ?? current?.first_name,
      fields.middleName ?? current?.middle_name,
      fields.lastName ?? current?.last_name,
      fields.suffix ?? current?.suffix,
    ].map(cleanText).filter(Boolean).join(" ");
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
    await notifyRoles(["ict_admin", "him_staff", "admitting"], "patients", "patient_updated", `Patient record updated: "${updatedPatient?.full_name || `#${id}`}" — by ${req.user.username}`);

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
     WHERE c.patient_id = ? AND c.is_archived = FALSE ORDER BY c.issued_at DESC`,
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
    firstName, middleName, lastName, suffix, preferredName, gender, birthdate, civilStatus,
    nationality, occupation, educationalAttainment,
    contactNumber, email, address, municipality, province, postalCode,
    emergencyContactName, emergencyContactRelationship, emergencyContactNumber,
    emergencyContactEmail, emergencyContactAddress, emergencyContactMethod,
    guardianName, guardianRelationship, guardianContactNumber, guardianAddress,
    admissionDate, referralSource, admissionType, programId,
    assignedCaseManagerId, admissionNotes,
    caseClassification, initialStatus, programPhase,
    expectedCompletionDate, sessionsRequired,
  } = req.body;

  const normalized = {
    firstName: cleanText(firstName),
    middleName: cleanText(middleName),
    lastName: cleanText(lastName),
    suffix: cleanText(suffix),
    preferredName: cleanText(preferredName),
    gender: cleanText(gender),
    birthdate: cleanText(birthdate),
    civilStatus: cleanText(civilStatus) || "single",
    nationality: cleanText(nationality),
    occupation: cleanText(occupation),
    educationalAttainment: cleanText(educationalAttainment),
    contactNumber: cleanText(contactNumber),
    email: cleanText(email),
    address: cleanText(address),
    municipality: cleanText(municipality),
    province: cleanText(province),
    postalCode: cleanText(postalCode),
    emergencyContactName: cleanText(emergencyContactName),
    emergencyContactRelationship: cleanText(emergencyContactRelationship),
    emergencyContactNumber: cleanText(emergencyContactNumber),
    emergencyContactEmail: cleanText(emergencyContactEmail) || "",
    emergencyContactAddress: cleanText(emergencyContactAddress),
    emergencyContactMethod: cleanText(emergencyContactMethod) || "",
    guardianName: cleanText(guardianName),
    guardianRelationship: cleanText(guardianRelationship),
    guardianContactNumber: cleanText(guardianContactNumber),
    guardianAddress: cleanText(guardianAddress),
  };

  if (!normalized.firstName || !normalized.lastName || !normalized.gender || !normalized.birthdate) {
    return res.status(400).json({ message: "First name, last name, sex, and birthdate are required." });
  }

  if (!normalized.address || !normalized.municipality || !normalized.province) {
    return res.status(400).json({ message: "Home address, city or municipality, and province are required." });
  }

  if (!normalized.emergencyContactName || !normalized.emergencyContactRelationship || !normalized.emergencyContactNumber) {
    return res.status(400).json({ message: "Emergency-contact name, relationship, and contact number are required." });
  }

  const age = ageFromBirthdate(normalized.birthdate);
  if (age === null || age < 0 || age > 130) {
    return res.status(400).json({ message: "Enter a valid birthdate that is not in the future." });
  }

  if (normalized.contactNumber && !validPhone(normalized.contactNumber)) {
    return res.status(400).json({ message: "Enter a valid patient mobile number." });
  }

  if (!validPhone(normalized.emergencyContactNumber)) {
    return res.status(400).json({ message: "Enter a valid emergency-contact number." });
  }

  if (normalized.emergencyContactMethod.length > 30) {
    return res.status(400).json({ message: "Preferred contact method must be 30 characters or fewer." });
  }

  if (normalized.emergencyContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.emergencyContactEmail)) {
    return res.status(400).json({ message: "Enter a valid emergency contact email address." });
  }

  if (normalized.emergencyContactEmail.length > 255) {
    return res.status(400).json({ message: "Emergency contact email must be 255 characters or fewer." });
  }

  if (normalized.emergencyContactMethod === "email" && !normalized.emergencyContactEmail) {
    return res.status(400).json({ message: "Emergency contact email is required when Email is the preferred contact method." });
  }

  if (normalized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  if (age < 18) {
    if (!normalized.guardianName || !normalized.guardianRelationship || !normalized.guardianContactNumber || !normalized.guardianAddress) {
      return res.status(400).json({ message: "Guardian name, relationship, contact number, and address are required for patients under 18." });
    }
  }

  if (normalized.guardianContactNumber && !validPhone(normalized.guardianContactNumber)) {
    return res.status(400).json({ message: "Enter a valid guardian contact number." });
  }

  const fullName = [normalized.firstName, normalized.middleName, normalized.lastName, normalized.suffix]
    .filter(Boolean)
    .join(" ");

  try {
    const [[existingPatient]] = await pool.query(
      `SELECT id, patient_code
       FROM patients
       WHERE LOWER(TRIM(first_name)) = LOWER(?)
         AND LOWER(TRIM(COALESCE(middle_name, ''))) = LOWER(?)
         AND LOWER(TRIM(last_name)) = LOWER(?)
         AND LOWER(TRIM(COALESCE(suffix, ''))) = LOWER(?)
         AND birthdate = ?
       LIMIT 1`,
      [normalized.firstName, normalized.middleName || "", normalized.lastName, normalized.suffix || "", normalized.birthdate]
    );

    if (existingPatient) {
      return res.status(409).json({
        message: `A patient with the same name and birthdate already exists (${existingPatient.patient_code}).`,
        existingPatientId: existingPatient.id,
      });
    }

    const patientCode = await generatePatientCode();

    const record = {
      patient_code: patientCode,
      first_name: normalized.firstName,
      middle_name: normalized.middleName || null,
      last_name: normalized.lastName,
      suffix: normalized.suffix || null,
      full_name: fullName,
      preferred_name: normalized.preferredName || null,
      gender: normalized.gender,
      birthdate: normalized.birthdate,
      civil_status: normalized.civilStatus,
      nationality: normalized.nationality || null,
      occupation: normalized.occupation || null,
      educational_attainment: normalized.educationalAttainment || null,
      contact_number: normalized.contactNumber || null,
      email: normalized.email || null,
      address: normalized.address,
      municipality: normalized.municipality,
      province: normalized.province,
      postal_code: normalized.postalCode || null,
      emergency_contact_name: normalized.emergencyContactName,
      emergency_contact_relationship: normalized.emergencyContactRelationship,
      emergency_contact_number: normalized.emergencyContactNumber,
      emergency_contact_email: normalized.emergencyContactEmail || null,
      emergency_contact_address: normalized.emergencyContactAddress || null,
      emergency_contact_method: normalized.emergencyContactMethod || null,
      guardian_name: normalized.guardianName || null,
      guardian_relationship: normalized.guardianRelationship || null,
      guardian_contact_number: normalized.guardianContactNumber || null,
      guardian_address: normalized.guardianAddress || null,
      admission_date: admissionDate || null,
      referral_source: referralSource || null,
      admission_type: admissionType || null,
      program_id: programId || null,
      assigned_case_manager_id: assignedCaseManagerId || null,
      admission_notes: admissionNotes || null,
      case_classification: caseClassification || null,
      initial_status: initialStatus || null,
      current_status: initialStatus || null,
      program_phase: programPhase || null,
      expected_completion_date: expectedCompletionDate || null,
      sessions_required: sessionsRequired || null,
      registered_by: req.user.id,
    };

    const columns = Object.keys(record);
    const placeholders = columns.map(() => "?").join(", ");
    const [result] = await pool.query(
      `INSERT INTO patients (${columns.join(", ")}) VALUES (${placeholders})`,
      Object.values(record)
    );

    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, ?, ?)",
      [req.user.username, `Registered patient "${fullName}" (${patientCode})`, "patients", result.insertId]
    );

    await notifyRoles(["ict_admin", "him_staff", "admitting"], "patients", "patient_registered", `New patient registered: "${fullName}" (${patientCode}) — by ${req.user.username}`);

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
    if (err.code === "ER_BAD_FIELD_ERROR") {
      return res.status(500).json({ message: "The patient-registration database migration has not been applied." });
    }
    res.status(500).json({ message: "Could not register the patient." });
  }
}
