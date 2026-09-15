import pool from "../config/db.js";

const VALID_SOURCES = new Set([
  "Voluntary",
  "Court-Mandated",
  "LGU-Referred",
  "Workplace",
  "NGO",
  "voluntary",
  "court_mandated",
  "lgu_referred",
  "workplace",
  "ngo",
  "physician",
  "hospital",
  "community",
  "self_referral",
  "family",
  "court",
  "other",
]);

const VALID_PRIORITIES = new Set(["routine", "urgent", "emergency"]);
const VALID_DOCUMENT_STATUSES = new Set(["pending", "none_received", "paper_copy", "uploaded"]);
const VALID_ADMISSION_TYPES = new Set([
  "New Admission",
  "Readmit - Relapse",
  "Readmit - Escape",
  "Readmit – Relapse",
  "Readmit – Escape",
  "new_admission",
  "readmit_relapse",
  "readmit_escape",
  "voluntary",
  "court_mandated",
  "lgu_referred",
]);
const VALID_CONFINEMENT_NATURES = new Set(["arrested", "suspended_sentence", "compulsory_ra_9165"]);

function cleanText(value, maxLength = null) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).trim();
  if (!cleaned) return null;
  return maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

function normalizeReferral(body = {}) {
  return {
    referralSource: cleanText(body.referralSource, 50),
    referringOrganization: cleanText(body.referringOrganization, 150),
    referringProfessional: cleanText(body.referringProfessional, 150),
    referralDate: cleanText(body.referralDate, 10),
    reasonForReferral: cleanText(body.reasonForReferral),
    presentingConcern: cleanText(body.presentingConcern),
    supportingDocuments: cleanText(body.supportingDocuments),
    documentStatus: cleanText(body.documentStatus, 20) || "pending",
    recommendedProgramId: body.recommendedProgramId ? Number(body.recommendedProgramId) : null,
    referralPriority: cleanText(body.referralPriority, 20) || "routine",
    admissionType: cleanText(body.admissionType, 30),
    natureOfConfinement: cleanText(body.natureOfConfinement, 40),
    typeOfService: cleanText(body.typeOfService, 100),
    typeOfPatient: cleanText(body.typeOfPatient, 100),
    attendingPhysician: cleanText(body.attendingPhysician, 150),
    priorRehabAdmissions: body.priorRehabAdmissions === "" || body.priorRehabAdmissions == null ? 0 : Number(body.priorRehabAdmissions),
    numberOfEscapes: body.numberOfEscapes === "" || body.numberOfEscapes == null ? 0 : Number(body.numberOfEscapes),
    priorDrugHospitalizations: body.priorDrugHospitalizations === "" || body.priorDrugHospitalizations == null ? 0 : Number(body.priorDrugHospitalizations),
    hospitalizations: Array.isArray(body.hospitalizations) ? body.hospitalizations.map(h => ({
      hospitalName: cleanText(h.hospitalName, 255),
      dateAdmitted: cleanText(h.dateAdmitted, 10)
    })).filter(h => h.hospitalName) : [],
  };
}

function validateReferralValues(referral, { submitting = false } = {}) {
  if (referral.referralSource && !VALID_SOURCES.has(referral.referralSource)) {
    return "Select a valid referral source.";
  }
  if (!VALID_PRIORITIES.has(referral.referralPriority)) {
    return "Select a valid referral priority.";
  }
  if (!VALID_DOCUMENT_STATUSES.has(referral.documentStatus)) {
    return "Select a valid referral document status.";
  }
  if (referral.admissionType && !VALID_ADMISSION_TYPES.has(referral.admissionType)) {
    return "Select a valid admission type.";
  }
  if (referral.natureOfConfinement && !VALID_CONFINEMENT_NATURES.has(referral.natureOfConfinement)) {
    return "Select a valid nature of confinement.";
  }
  for (const [value, label] of [
    [referral.priorRehabAdmissions, "Prior rehabilitation admissions"],
    [referral.numberOfEscapes, "Number of escapes"],
    [referral.priorDrugHospitalizations, "Prior drug-related hospitalizations"],
  ]) {
    if (!Number.isInteger(value) || value < 0 || value > 999) return `${label} must be a whole number from 0 to 999.`;
  }
  if (referral.recommendedProgramId !== null && !Number.isInteger(referral.recommendedProgramId)) {
    return "Select a valid recommended service.";
  }
  if (submitting) {
    if (!referral.referralSource || !referral.referralDate || !referral.reasonForReferral || !referral.presentingConcern || !referral.admissionType) {
      return "Referral source, referral date, admission type, reason for referral, and presenting concern are required.";
    }
    if (referral.referralSource === "other" && !referral.referringOrganization) {
      return "Specify the other referral source before submission.";
    }
  }
  return null;
}

async function getPatient(connection, patientId) {
  const [[patient]] = await connection.query(
    `SELECT p.id, p.patient_code, p.full_name, p.photo_url, p.is_archived,
            p.assigned_case_manager_id, u.full_name AS case_manager_name
     FROM patients p
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     WHERE p.id = ?`,
    [patientId]
  );
  return patient;
}

function canAccessPatient(user, patient) {
  return user.role !== "case_manager" || Number(patient.assigned_case_manager_id) === Number(user.id);
}

async function validateProgram(connection, programId) {
  if (!programId) return true;
  const [[program]] = await connection.query(
    "SELECT id FROM programs WHERE id = ? AND is_active = TRUE",
    [programId]
  );
  return Boolean(program);
}

async function findReferral(connection, patientId) {
  const [[referral]] = await connection.query(
    `SELECT r.*, rp.name AS recommended_program_name,
            assignee.full_name AS intake_assignee_name,
            creator.full_name AS created_by_name,
            submitter.full_name AS submitted_by_name
     FROM patient_referrals r
     LEFT JOIN programs rp ON rp.id = r.recommended_program_id
     LEFT JOIN users assignee ON assignee.id = r.intake_assignee_id
     LEFT JOIN users creator ON creator.id = r.created_by
     LEFT JOIN users submitter ON submitter.id = r.submitted_by
     WHERE r.patient_id = ?`,
    [patientId]
  );
  if (referral) {
    const [hospitalizations] = await connection.query(
      `SELECT hospital_name AS hospitalName, date_admitted AS dateAdmitted FROM patient_hospitalizations WHERE patient_id = ? ORDER BY date_admitted DESC`,
      [patientId]
    );
    referral.hospitalizations = hospitalizations;
  }
  return referral || null;
}

async function resolveDocumentStatus(connection, referralId, requestedStatus) {
  if (!referralId) return requestedStatus === "uploaded" ? "pending" : requestedStatus;
  const [[documents]] = await connection.query(
    "SELECT COUNT(*) AS count FROM patient_referral_documents WHERE referral_id = ?",
    [referralId]
  );
  if (documents.count) return "uploaded";
  return requestedStatus === "uploaded" ? "pending" : requestedStatus;
}

export async function getPatientReferral(req, res) {
  const patientId = Number(req.params.patientId);
  if (!Number.isInteger(patientId)) {
    return res.status(400).json({ message: "Invalid patient ID." });
  }

  try {
    const patient = await getPatient(pool, patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found." });
    if (!canAccessPatient(req.user, patient)) {
      return res.status(403).json({ message: "You do not have access to this patient." });
    }

    const referral = await findReferral(pool, patientId);
    res.json({ patient, referral });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load the referral information." });
  }
}

export async function savePatientReferralDraft(req, res) {
  const patientId = Number(req.params.patientId);
  const referral = normalizeReferral(req.body);
  const validationError = validateReferralValues(referral);

  if (!Number.isInteger(patientId)) return res.status(400).json({ message: "Invalid patient ID." });
  if (validationError) return res.status(400).json({ message: validationError });

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
      return res.status(409).json({ message: "Restore the patient before updating referral information." });
    }

    const existing = await findReferral(connection, patientId);
    if (["intake_in_progress", "intake_completed"].includes(existing?.status)) {
      await connection.rollback();
      return res.status(409).json({ message: "This referral can no longer be edited because Initial Intake has started." });
    }

    if (!(await validateProgram(connection, referral.recommendedProgramId))) {
      await connection.rollback();
      return res.status(400).json({ message: "Select an active recommended service." });
    }
    const documentStatus = await resolveDocumentStatus(connection, existing?.id, referral.documentStatus);
    if (existing) {
      await connection.query(
        `UPDATE patient_referrals SET
           referral_source = ?, referring_organization = ?, referring_professional = ?,
           referral_date = ?, reason_for_referral = ?, presenting_concern = ?,
           supporting_documents = ?, document_status = ?, recommended_program_id = ?, referral_priority = ?,
           admission_type = ?, nature_of_confinement = ?, type_of_service = ?, type_of_patient = ?, attending_physician = ?,
           prior_rehab_admissions = ?, number_of_escapes = ?, prior_drug_hospitalizations = ?,
           status = 'draft', submitted_by = NULL, submitted_at = NULL
         WHERE patient_id = ?`,
        [
          referral.referralSource, referral.referringOrganization, referral.referringProfessional,
          referral.referralDate, referral.reasonForReferral, referral.presentingConcern,
          referral.supportingDocuments, documentStatus, referral.recommendedProgramId, referral.referralPriority,
          referral.admissionType, referral.natureOfConfinement, referral.typeOfService, referral.typeOfPatient, referral.attendingPhysician,
          referral.priorRehabAdmissions, referral.numberOfEscapes, referral.priorDrugHospitalizations,
          patientId,
        ]
      );
    } else {
      await connection.query(
        `INSERT INTO patient_referrals (
           patient_id, referral_source, referring_organization, referring_professional,
           referral_date, reason_for_referral, presenting_concern, supporting_documents, document_status,
           recommended_program_id, referral_priority, admission_type, nature_of_confinement, type_of_service, type_of_patient, attending_physician,
           prior_rehab_admissions, number_of_escapes, prior_drug_hospitalizations, status, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
        [
          patientId, referral.referralSource, referral.referringOrganization, referral.referringProfessional,
          referral.referralDate, referral.reasonForReferral, referral.presentingConcern,
          referral.supportingDocuments, documentStatus, referral.recommendedProgramId, referral.referralPriority,
          referral.admissionType, referral.natureOfConfinement, referral.typeOfService, referral.typeOfPatient, referral.attendingPhysician,
          referral.priorRehabAdmissions, referral.numberOfEscapes, referral.priorDrugHospitalizations,
          req.user.id,
        ]
      );
    }

    await connection.query("DELETE FROM patient_hospitalizations WHERE patient_id = ?", [patientId]);
    for (const hosp of referral.hospitalizations) {
      await connection.query(
        "INSERT INTO patient_hospitalizations (patient_id, hospital_name, date_admitted) VALUES (?, ?, ?)",
        [patientId, hosp.hospitalName, hosp.dateAdmitted || null]
      );
    }

    await connection.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patient_referrals', ?)",
      [req.user.username, `Saved referral draft for \"${patient.full_name}\" (${patient.patient_code})`, patientId]
    );

    await connection.commit();
    res.json({ message: "Referral draft saved.", referral: await findReferral(pool, patientId) });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "Could not save the referral draft." });
  } finally {
    connection.release();
  }
}

export async function submitPatientReferral(req, res) {
  const patientId = Number(req.params.patientId);
  const referral = normalizeReferral(req.body);
  const validationError = validateReferralValues(referral, { submitting: true });

  if (!Number.isInteger(patientId)) return res.status(400).json({ message: "Invalid patient ID." });
  if (validationError) return res.status(400).json({ message: validationError });

  const connection = await pool.getConnection();
  let patient;
  try {
    await connection.beginTransaction();
    patient = await getPatient(connection, patientId);
    if (!patient) {
      await connection.rollback();
      return res.status(404).json({ message: "Patient not found." });
    }
    if (patient.is_archived) {
      await connection.rollback();
      return res.status(409).json({ message: "Restore the patient before submitting a referral." });
    }

    const existing = await findReferral(connection, patientId);
    if (["intake_in_progress", "intake_completed"].includes(existing?.status)) {
      await connection.rollback();
      return res.status(409).json({ message: "This referral can no longer be changed because Initial Intake has started." });
    }

    if (!(await validateProgram(connection, referral.recommendedProgramId))) {
      await connection.rollback();
      return res.status(400).json({ message: "Select an active recommended service." });
    }
    const documentStatus = await resolveDocumentStatus(connection, existing?.id, referral.documentStatus);

    if (existing) {
      await connection.query(
        `UPDATE patient_referrals SET
           referral_source = ?, referring_organization = ?, referring_professional = ?,
           referral_date = ?, reason_for_referral = ?, presenting_concern = ?,
           supporting_documents = ?, document_status = ?, recommended_program_id = ?, referral_priority = ?,
           admission_type = ?, nature_of_confinement = ?, type_of_service = ?, type_of_patient = ?, attending_physician = ?,
           prior_rehab_admissions = ?, number_of_escapes = ?, prior_drug_hospitalizations = ?,
           intake_assignee_id = NULL, status = 'ready_for_intake', submitted_by = ?, submitted_at = NOW()
         WHERE patient_id = ?`,
        [
          referral.referralSource, referral.referringOrganization, referral.referringProfessional,
          referral.referralDate, referral.reasonForReferral, referral.presentingConcern,
          referral.supportingDocuments, documentStatus, referral.recommendedProgramId, referral.referralPriority,
          referral.admissionType, referral.natureOfConfinement, referral.typeOfService, referral.typeOfPatient, referral.attendingPhysician,
          referral.priorRehabAdmissions, referral.numberOfEscapes, referral.priorDrugHospitalizations,
          req.user.id, patientId,
        ]
      );
    } else {
      await connection.query(
        `INSERT INTO patient_referrals (
           patient_id, referral_source, referring_organization, referring_professional,
           referral_date, reason_for_referral, presenting_concern, supporting_documents, document_status,
           recommended_program_id, referral_priority, admission_type, nature_of_confinement, type_of_service, type_of_patient, attending_physician,
           prior_rehab_admissions, number_of_escapes, prior_drug_hospitalizations, status,
           created_by, submitted_by, submitted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready_for_intake', ?, ?, NOW())`,
        [
          patientId, referral.referralSource, referral.referringOrganization, referral.referringProfessional,
          referral.referralDate, referral.reasonForReferral, referral.presentingConcern,
          referral.supportingDocuments, documentStatus, referral.recommendedProgramId, referral.referralPriority,
          referral.admissionType, referral.natureOfConfinement, referral.typeOfService, referral.typeOfPatient, referral.attendingPhysician,
          referral.priorRehabAdmissions, referral.numberOfEscapes, referral.priorDrugHospitalizations,
          req.user.id, req.user.id,
        ]
      );
    }

    await connection.query("DELETE FROM patient_hospitalizations WHERE patient_id = ?", [patientId]);
    for (const hosp of referral.hospitalizations) {
      await connection.query(
        "INSERT INTO patient_hospitalizations (patient_id, hospital_name, date_admitted) VALUES (?, ?, ?)",
        [patientId, hosp.hospitalName, hosp.dateAdmitted || null]
      );
    }

    await connection.query(
      "UPDATE patients SET referral_source = ?, admission_type = ? WHERE id = ?",
      [referral.referralSource, referral.admissionType, patientId]
    );
    await connection.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patient_referrals', ?)",
      [
        req.user.username,
        `Completed referral information for \"${patient.full_name}\" (${patient.patient_code}); ready for intake assignment`,
        patientId,
      ]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return res.status(500).json({ message: "Could not submit the referral." });
  } finally {
    connection.release();
  }

  res.json({
    message: "Admission and confinement history saved. Continue to Drug Use History.",
    referral: await findReferral(pool, patientId),
  });
}
