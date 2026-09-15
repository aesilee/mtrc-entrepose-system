import pool from "../config/db.js";
import { notifyRoles } from "../utils/notify.js";

const VALID_LENGTHS = new Set(["under_2_years", "2_to_4_years", "4_to_6_years", "6_years_or_more"]);
const VALID_FREQUENCIES = new Set(["daily", "2_to_5_weekly", "weekly", "monthly", "occasionally"]);
const VALID_CLASSIFICATIONS = new Set(["full_pay", "c1", "c2", "indigent"]);
const IDADIN_DRUGS = new Set([
  "Opium", "Morphine", "Heroin", "Hydrocodone", "Codeine", "Methadone", "Demerol",
  "Nalbuphine Hydrochloride (Nubain)", "Ketamine", "Cannabis (Marijuana)", "Brownies/Cake",
  "Seeds", "Hashish", "Mescaline (Peyote Cactus/Buttons)", "Psilocybin (Magic Mushroom)",
  "Phencyclidine (PCP/Angel Dust)", "Datura (Talampunay)", "LSD", "Cocaine", "Ephedrine",
  "MDMA (Ecstasy)", "Methamphetamine Hydrochloride (Shabu)", "Phentermine", "Pseudo-Ephedrine",
  "China White", "Speed", "Phenobarb (Luminal)", "Alprazolam (Xanor)", "Bromazepam (Lexotan)",
  "Chlordiazepoxide", "Chlorpromazine HCL", "Clonazepam", "Diazepam", "Dipotassium Clorazepate",
  "Estazolam", "Flunitrazepam", "Flurazepam", "Midazolam", "Triazolam", "Zolpidem",
  "Isoaminile Citrate", "Phenylpropanolamine/Paracetamol", "Codeine Phosphate/Guaifenesin",
  "Acetone", "Gasoline", "Rugby/Contact Cement", "Thinner/Lacquer Paint", "Artane", "Akineton",
  "Prozac", "Unisom",
]);

function cleanText(value, maxLength = null) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).trim();
  if (!cleaned) return null;
  return maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

function parseStoredDrugs(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function shapeIntake(intake) {
  return intake ? { ...intake, drugs_used: parseStoredDrugs(intake.drugs_used) } : null;
}

async function getPatient(connection, patientId, { lock = false } = {}) {
  const [[patient]] = await connection.query(
    `SELECT id, patient_code, full_name, photo_url, admission_date, enrollment_status,
            program_id, is_archived, assigned_case_manager_id
     FROM patients WHERE id = ?${lock ? " FOR UPDATE" : ""}`,
    [patientId]
  );
  return patient || null;
}

async function getReferral(connection, patientId) {
  const [[referral]] = await connection.query(
    "SELECT id, status FROM patient_referrals WHERE patient_id = ?",
    [patientId]
  );
  return referral || null;
}

async function getIntake(connection, patientId) {
  const [[intake]] = await connection.query(
    "SELECT * FROM patient_intakes WHERE patient_id = ?",
    [patientId]
  );
  return shapeIntake(intake);
}

function canAccessPatient(user, patient) {
  return user.role !== "case_manager" || Number(patient.assigned_case_manager_id) === Number(user.id);
}

export async function getPatientIntake(req, res) {
  const patientId = Number(req.params.patientId);
  if (!Number.isInteger(patientId)) return res.status(400).json({ message: "Invalid patient ID." });

  try {
    const patient = await getPatient(pool, patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found." });
    if (!canAccessPatient(req.user, patient)) return res.status(403).json({ message: "You do not have access to this patient." });
    const [referral, intake] = await Promise.all([getReferral(pool, patientId), getIntake(pool, patientId)]);
    const [[enrollmentCertificate]] = await pool.query(
      "SELECT id FROM certificates WHERE patient_id = ? AND certificate_type = 'enrollment' AND is_archived = FALSE ORDER BY issued_at DESC LIMIT 1",
      [patientId]
    );
    res.json({ patient, referral, intake, enrollmentCertificateId: enrollmentCertificate?.id || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load the intake workflow." });
  }
}

export async function saveDrugUseHistory(req, res) {
  const patientId = Number(req.params.patientId);
  const ageAtFirstUse = Number(req.body.ageAtFirstUse);
  const lastDrugUseDate = cleanText(req.body.lastDrugUseDate, 10);
  const lengthOfUse = cleanText(req.body.lengthOfUse, 30);
  const frequencyOfUse = cleanText(req.body.frequencyOfUse, 30);
  const primaryReason = cleanText(req.body.primaryReason);
  const drugSource = cleanText(req.body.drugSource, 150);
  const drugsUsed = Array.isArray(req.body.drugsUsed) ? [...new Set(req.body.drugsUsed.map((drug) => cleanText(drug, 100)).filter(Boolean))] : [];

  if (!Number.isInteger(patientId)) return res.status(400).json({ message: "Invalid patient ID." });
  if (!Number.isInteger(ageAtFirstUse) || ageAtFirstUse < 0 || ageAtFirstUse > 130) return res.status(400).json({ message: "Age at first drug use must be from 0 to 130." });
  if (!lastDrugUseDate || lastDrugUseDate > new Date().toISOString().slice(0, 10)) return res.status(400).json({ message: "Enter a valid date of last drug use that is not in the future." });
  if (!VALID_LENGTHS.has(lengthOfUse)) return res.status(400).json({ message: "Select a valid length of drug use." });
  if (!VALID_FREQUENCIES.has(frequencyOfUse)) return res.status(400).json({ message: "Select a valid frequency of drug use." });
  if (!primaryReason || !drugSource) return res.status(400).json({ message: "Primary reason and source of drugs are required." });
  if (!drugsUsed.length || drugsUsed.some((drug) => !IDADIN_DRUGS.has(drug))) return res.status(400).json({ message: "Select at least one valid drug used in the past 12 months." });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const patient = await getPatient(connection, patientId);
    const referral = await getReferral(connection, patientId);
    if (!patient) {
      await connection.rollback();
      return res.status(404).json({ message: "Patient not found." });
    }
    if (patient.is_archived) {
      await connection.rollback();
      return res.status(409).json({ message: "Restore the patient before updating intake information." });
    }
    if (!referral || !["ready_for_intake", "intake_in_progress"].includes(referral.status)) {
      await connection.rollback();
      return res.status(409).json({ message: "Complete Admission & Confinement History before Drug Use History." });
    }

    await connection.query(
      `INSERT INTO patient_intakes
         (patient_id, age_at_first_drug_use, last_drug_use_date, length_of_use, frequency_of_use,
          primary_reason_for_using, drug_source, drugs_used, workflow_step, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 4, ?, ?)
       ON DUPLICATE KEY UPDATE
         age_at_first_drug_use = VALUES(age_at_first_drug_use), last_drug_use_date = VALUES(last_drug_use_date),
         length_of_use = VALUES(length_of_use), frequency_of_use = VALUES(frequency_of_use),
         primary_reason_for_using = VALUES(primary_reason_for_using), drug_source = VALUES(drug_source),
         drugs_used = VALUES(drugs_used), workflow_step = GREATEST(workflow_step, 4), updated_by = VALUES(updated_by)`,
      [patientId, ageAtFirstUse, lastDrugUseDate, lengthOfUse, frequencyOfUse, primaryReason, drugSource, JSON.stringify(drugsUsed), req.user.id, req.user.id]
    );
    await connection.query("UPDATE patient_referrals SET status = 'intake_in_progress' WHERE patient_id = ?", [patientId]);
    await connection.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patient_intakes', ?)",
      [req.user.username, `Saved IDADIN drug use history for \"${patient.full_name}\" (${patient.patient_code})`, patientId]
    );
    await connection.commit();
    res.json({ message: "Drug use history saved.", intake: await getIntake(pool, patientId) });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "Could not save the drug use history." });
  } finally {
    connection.release();
  }
}

export async function saveClinicalTriage(req, res) {
  const patientId = Number(req.params.patientId);
  const bloodPressure = cleanText(req.body.bloodPressure, 20);
  const pulseRate = Number(req.body.pulseRate);
  const temperature = Number(req.body.temperature);
  const weight = Number(req.body.weight);
  const socioeconomicClassification = cleanText(req.body.socioeconomicClassification, 20);

  if (!Number.isInteger(patientId)) return res.status(400).json({ message: "Invalid patient ID." });
  if (!/^\d{2,3}\/\d{2,3}$/.test(bloodPressure || "")) return res.status(400).json({ message: "Enter blood pressure in systolic/diastolic format, such as 120/80." });
  if (!Number.isInteger(pulseRate) || pulseRate < 20 || pulseRate > 250) return res.status(400).json({ message: "Pulse rate must be from 20 to 250 bpm." });
  if (!Number.isFinite(temperature) || temperature < 30 || temperature > 45) return res.status(400).json({ message: "Temperature must be from 30 to 45 °C." });
  if (!Number.isFinite(weight) || weight < 1 || weight > 500) return res.status(400).json({ message: "Weight must be from 1 to 500 kg." });
  if (!VALID_CLASSIFICATIONS.has(socioeconomicClassification)) return res.status(400).json({ message: "Select a valid socio-economic classification." });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const patient = await getPatient(connection, patientId);
    const intake = await getIntake(connection, patientId);
    if (!patient) {
      await connection.rollback();
      return res.status(404).json({ message: "Patient not found." });
    }
    if (!intake || intake.workflow_step < 4) {
      await connection.rollback();
      return res.status(409).json({ message: "Complete Drug Use History before Clinical Triage." });
    }
    if (intake.workflow_step >= 6) {
      await connection.rollback();
      return res.status(409).json({ message: "This registration is finalized and can no longer be changed from the intake workflow." });
    }
    if (patient.is_archived) {
      await connection.rollback();
      return res.status(409).json({ message: "Restore the patient before updating intake information." });
    }

    await connection.query(
      `UPDATE patient_intakes SET blood_pressure = ?, pulse_rate = ?, temperature_celsius = ?, weight_kg = ?,
         socioeconomic_classification = ?, workflow_step = GREATEST(workflow_step, 5), updated_by = ?
       WHERE patient_id = ?`,
      [bloodPressure, pulseRate, temperature, weight, socioeconomicClassification, req.user.id, patientId]
    );
    await connection.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patient_intakes', ?)",
      [req.user.username, `Saved clinical triage and social classification for \"${patient.full_name}\" (${patient.patient_code})`, patientId]
    );
    await connection.commit();
    res.json({ message: "Clinical triage and classification saved.", intake: await getIntake(pool, patientId) });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "Could not save clinical triage." });
  } finally {
    connection.release();
  }
}

export async function finalizeEnrollment(req, res) {
  const patientId = Number(req.params.patientId);
  const serviceAgreementSigned = req.body.serviceAgreementSigned === true;
  const pledgeOfCommitmentSigned = req.body.pledgeOfCommitmentSigned === true;
  const dataPrivacyConsentSigned = req.body.dataPrivacyConsentSigned === true;

  if (!Number.isInteger(patientId)) return res.status(400).json({ message: "Invalid patient ID." });
  if (!serviceAgreementSigned || !pledgeOfCommitmentSigned || !dataPrivacyConsentSigned) {
    return res.status(400).json({ message: "Confirm all three signed consent documents before finalizing enrollment." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const patient = await getPatient(connection, patientId, { lock: true });
    const intake = await getIntake(connection, patientId);
    if (!patient) {
      await connection.rollback();
      return res.status(404).json({ message: "Patient not found." });
    }
    if (!intake || intake.workflow_step < 5 || !intake.socioeconomic_classification) {
      await connection.rollback();
      return res.status(409).json({ message: "Complete Clinical Triage & Social Classification before finalization." });
    }
    if (patient.is_archived) {
      await connection.rollback();
      return res.status(409).json({ message: "Restore the patient before finalizing enrollment." });
    }

    await connection.query(
      `UPDATE patient_intakes SET service_agreement_signed = TRUE, pledge_of_commitment_signed = TRUE,
         data_privacy_consent_signed = TRUE, workflow_step = 6, finalized_at = COALESCE(finalized_at, NOW()),
         finalized_by = COALESCE(finalized_by, ?), updated_by = ? WHERE patient_id = ?`,
      [req.user.id, req.user.id, patientId]
    );
    await connection.query(
      "UPDATE patients SET admission_date = COALESCE(admission_date, CURDATE()), enrollment_status = 'active' WHERE id = ?",
      [patientId]
    );
    await connection.query("UPDATE patient_referrals SET status = 'intake_completed' WHERE patient_id = ?", [patientId]);

    let [[certificate]] = await connection.query(
      "SELECT id FROM certificates WHERE patient_id = ? AND certificate_type = 'enrollment' AND is_archived = FALSE ORDER BY issued_at DESC LIMIT 1",
      [patientId]
    );
    if (!certificate) {
      const [[preparer]] = await connection.query("SELECT full_name FROM users WHERE id = ?", [req.user.id]);
      const [[certificatePatient]] = await connection.query(
        `SELECT p.full_name, p.patient_code, p.admission_date, pr.name AS program_name
         FROM patients p LEFT JOIN programs pr ON pr.id = p.program_id WHERE p.id = ?`,
        [patientId]
      );
      const [result] = await connection.query(
        `INSERT INTO certificates
           (patient_id, certificate_type, patient_name, patient_code, program_name,
            admission_date, completion_date, prepared_by_name, remarks, issued_by)
         VALUES (?, 'enrollment', ?, ?, ?, ?, NULL, ?, ?, ?)`,
        [patientId, certificatePatient.full_name, certificatePatient.patient_code, certificatePatient.program_name,
          certificatePatient.admission_date, preparer?.full_name || req.user.username,
          "Enrollment requirements and signed consents verified", req.user.id]
      );
      certificate = { id: result.insertId };
    }

    await connection.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patient_intakes', ?)",
      [req.user.username, `Finalized enrollment for \"${patient.full_name}\" (${patient.patient_code})`, patientId]
    );
    await connection.commit();
    await notifyRoles(["ict_admin", "him_staff", "admitting"], "patients", "patient_enrolled", `Patient enrollment finalized: \"${patient.full_name}\" (${patient.patient_code})`);
    res.json({ message: "Enrollment finalized and Certificate of Enrollment generated.", certificateId: certificate.id });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "Could not finalize the enrollment." });
  } finally {
    connection.release();
  }
}
