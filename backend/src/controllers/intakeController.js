import pool from "../config/db.js";
import { notifyRoles } from "../utils/notify.js";

// Official 3-letter LGU codes for Albay/Bicol municipalities
const LGU_CODE_MAP = {
  "legazpi":       "LEG",
  "legazpi city":  "LEG",
  "tabaco":        "TAB",
  "tabaco city":   "TAB",
  "ligao":         "LIG",
  "ligao city":    "LIG",
  "daraga":        "DAR",
  "malinao":       "MAL",
  "guinobatan":    "GUI",
  "polangui":      "POL",
  "tiwi":          "TIW",
  "camalig":       "CAM",
  "oas":           "OAS",
  "bacacay":       "BAC",
  "santo domingo": "STO",
  "casiguran":     "CAS",
};

function getLguCode(municipality) {
  if (!municipality) return "OTH";
  const key = String(municipality).trim().toLowerCase();
  return LGU_CODE_MAP[key] || "OTH";
}

const VALID_LENGTHS = new Set([
  "Less than 1 year",
  "1 Year – 2 Years & 11 Months",
  "3 Years – 4 Years & 11 Months",
  "5 Years – 6 Years & 11 Months",
  "7 Years – 8 Years & 11 Months",
  "9 Years – 10 Years & 11 Months",
  "11 Years and Above",
]);
const VALID_FREQUENCIES = new Set(["Daily", "2 to 5 times a week", "Weekly", "Monthly", "Occasionally"]);
const VALID_CLASSIFICATIONS = new Set(["full_pay", "c1", "c2", "c3"]);
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
    `SELECT id, patient_code, pwud_code, opd_number, case_type, full_name, photo_url,
            admission_date, enrollment_status, municipality,
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
  const shaped = shapeIntake(intake);
  if (shaped) {
    const [substances] = await connection.query(
      `SELECT drug_used AS drugUsed,
              is_primary_substance AS isPrimarySubstance,
              route_of_administration AS routeOfAdministration,
              frequency,
              amount_spent AS amountSpent,
              quantity,
              unit_of_measurement AS unitOfMeasurement
       FROM patient_substances WHERE patient_id = ?`,
      [patientId]
    );
    shaped.substances = substances;
  }
  return shaped;
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

    // Look up the appropriate certificate based on case type
    const isOPD = patient.case_type === "general_outpatient";
    const certType = isOPD ? "opd_consultation" : "enrollment";
    const [[enrollmentCertificate]] = await pool.query(
      "SELECT id FROM certificates WHERE patient_id = ? AND certificate_type = ? AND is_archived = FALSE ORDER BY issued_at DESC LIMIT 1",
      [patientId, certType]
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
  const meansToSupport = cleanText(req.body.meansToSupport, 100);
  const areaOfDrugUse = cleanText(req.body.areaOfDrugUse, 100);
  const provinceOfDrugSource = cleanText(req.body.provinceOfDrugSource, 100);
  const cityOfDrugSource = cleanText(req.body.cityOfDrugSource, 100);
  const estimatedDailyDrugExpense = req.body.estimatedDailyDrugExpense === "" || req.body.estimatedDailyDrugExpense == null ? null : Number(req.body.estimatedDailyDrugExpense);
  const substances = Array.isArray(req.body.substances) ? req.body.substances : [];

  const isDraft = Boolean(req.body.isDraft);

  if (!Number.isInteger(patientId)) return res.status(400).json({ message: "Invalid patient ID." });
  
  if (!isDraft) {
    if (!Number.isInteger(ageAtFirstUse) || ageAtFirstUse < 0 || ageAtFirstUse > 130) return res.status(400).json({ message: "Age at first drug use must be from 0 to 130." });
    if (!lastDrugUseDate || lastDrugUseDate > new Date().toISOString().slice(0, 10)) return res.status(400).json({ message: "Enter a valid date of last drug use that is not in the future." });
    if (!VALID_LENGTHS.has(lengthOfUse)) return res.status(400).json({ message: "Select a valid length of drug use." });
    if (!VALID_FREQUENCIES.has(frequencyOfUse)) return res.status(400).json({ message: "Select a valid frequency of drug use." });
    if (!primaryReason || !drugSource) return res.status(400).json({ message: "Primary reason and source of drugs are required." });
    if (!substances.length) return res.status(400).json({ message: "Select at least one valid drug used in the past 12 months." });

    const primaryCount = substances.filter(s => s.isPrimarySubstance).length;
    if (primaryCount !== 1) return res.status(400).json({ message: "Exactly one primary substance must be designated." });
  }

  const VALID_ROUTES = new Set([
    'Oral', 'Orally', 'Smoking', 'Inhalation/Sniffing', 'Inhalation', 'Injection', 'Injection/Intravenous', 'Orally / Ingestion', 'Injection / Intravenous'
  ]);
  for (const sub of substances) {
    if (!isDraft && !sub.drugUsed) return res.status(400).json({ message: "Drug type is required for all substances." });
  }

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

    const nextWorkflowStep = isDraft ? 3 : 4;

    await connection.query(
      `INSERT INTO patient_intakes
         (patient_id, age_at_first_drug_use, last_drug_use_date, length_of_use, frequency_of_use,
          primary_reason_for_using, drug_source, means_to_support, area_of_drug_use, province_of_drug_source, city_of_drug_source, estimated_daily_drug_expense, workflow_step, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         age_at_first_drug_use = VALUES(age_at_first_drug_use), last_drug_use_date = VALUES(last_drug_use_date),
         length_of_use = VALUES(length_of_use), frequency_of_use = VALUES(frequency_of_use),
         primary_reason_for_using = VALUES(primary_reason_for_using), drug_source = VALUES(drug_source),
         means_to_support = VALUES(means_to_support), area_of_drug_use = VALUES(area_of_drug_use),
         province_of_drug_source = VALUES(province_of_drug_source), city_of_drug_source = VALUES(city_of_drug_source),
         estimated_daily_drug_expense = VALUES(estimated_daily_drug_expense),
         workflow_step = GREATEST(workflow_step, ?), updated_by = VALUES(updated_by)`,
      [patientId, ageAtFirstUse || null, lastDrugUseDate || null, lengthOfUse, frequencyOfUse, primaryReason, drugSource, meansToSupport, areaOfDrugUse, provinceOfDrugSource, cityOfDrugSource, estimatedDailyDrugExpense, nextWorkflowStep, req.user.id, req.user.id, nextWorkflowStep]
    );

    await connection.query("DELETE FROM patient_substances WHERE patient_id = ?", [patientId]);
    for (const sub of substances) {
      await connection.query(
        `INSERT INTO patient_substances 
           (patient_id, drug_used, is_primary_substance, route_of_administration, frequency, amount_spent, quantity, unit_of_measurement)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patientId,
          cleanText(sub.drugUsed, 255),
          sub.isPrimarySubstance ? 1 : 0,
          cleanText(sub.routeOfAdministration || sub.modeOfIntake, 100) || "Oral",
          cleanText(sub.frequency, 50) || null,
          sub.amountSpent === "" || sub.amountSpent == null ? 0 : Number(sub.amountSpent),
          sub.quantity === "" || sub.quantity == null ? 0 : Number(sub.quantity),
          cleanText(sub.unitOfMeasurement, 50) || null,
        ]
      );
    }
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
  const respiratoryRate = Number(req.body.respiratoryRate);
  const temperature = Number(req.body.temperature);
  const weight = Number(req.body.weight);
  const socioeconomicClassification = cleanText(req.body.socioeconomicClassification, 20);
  const mseRemarks = cleanText(req.body.mseRemarks);
  const treatmentDisposition = cleanText(req.body.treatmentDisposition, 100);
  const rawComorbidities = req.body.comorbidities;
  const comorbiditiesJson = rawComorbidities && typeof rawComorbidities === "object"
    ? JSON.stringify(rawComorbidities)
    : null;

  if (!Number.isInteger(patientId)) return res.status(400).json({ message: "Invalid patient ID." });
  if (!/^\d{2,3}\/\d{2,3}$/.test(bloodPressure || "")) return res.status(400).json({ message: "Enter blood pressure in systolic/diastolic format, such as 120/80." });
  if (!Number.isInteger(pulseRate) || pulseRate < 20 || pulseRate > 250) return res.status(400).json({ message: "Pulse rate must be from 20 to 250 bpm." });
  if (!Number.isInteger(respiratoryRate) || respiratoryRate < 8 || respiratoryRate > 60) return res.status(400).json({ message: "Respiratory rate must be from 8 to 60 cpm." });
  if (!Number.isFinite(temperature) || temperature < 30 || temperature > 45) return res.status(400).json({ message: "Temperature must be from 30 to 45 °C." });
  if (!Number.isFinite(weight) || weight < 1 || weight > 500) return res.status(400).json({ message: "Weight must be from 1 to 500 kg." });
  if (!VALID_CLASSIFICATIONS.has(socioeconomicClassification)) return res.status(400).json({ message: "Select a valid socio-economic classification." });
  if (!treatmentDisposition) return res.status(400).json({ message: "Select a treatment disposition." });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const patient = await getPatient(connection, patientId);
    const intake = await getIntake(connection, patientId);
    if (!patient) {
      await connection.rollback();
      return res.status(404).json({ message: "Patient not found." });
    }

    const isOPD = patient.case_type === "general_outpatient";

    // For PWUD patients, drug history must be completed first (workflow_step >= 4)
    if (!isOPD && (!intake || intake.workflow_step < 4)) {
      await connection.rollback();
      return res.status(409).json({ message: "Complete Drug Use History before Clinical Triage." });
    }
    if (intake && intake.workflow_step >= 6) {
      await connection.rollback();
      return res.status(409).json({ message: "This registration is finalized and can no longer be changed from the intake workflow." });
    }
    if (patient.is_archived) {
      await connection.rollback();
      return res.status(409).json({ message: "Restore the patient before updating intake information." });
    }

    // Use INSERT...ON DUPLICATE KEY UPDATE so OPD patients (who skip drug history)
    // get their intakes row created here if it does not already exist.
    await connection.query(
      `INSERT INTO patient_intakes
         (patient_id, blood_pressure, pulse_rate, respiratory_rate, temperature_celsius, weight_kg,
          socioeconomic_classification, mse_remarks, treatment_disposition, comorbidities, workflow_step, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5, ?, ?)
       ON DUPLICATE KEY UPDATE
         blood_pressure = VALUES(blood_pressure),
         pulse_rate = VALUES(pulse_rate),
         respiratory_rate = VALUES(respiratory_rate),
         temperature_celsius = VALUES(temperature_celsius),
         weight_kg = VALUES(weight_kg),
         socioeconomic_classification = VALUES(socioeconomic_classification),
         mse_remarks = VALUES(mse_remarks),
         treatment_disposition = VALUES(treatment_disposition),
         comorbidities = VALUES(comorbidities),
         workflow_step = GREATEST(workflow_step, 5),
         updated_by = VALUES(updated_by)`,
      [
        patientId, bloodPressure, pulseRate, respiratoryRate, temperature, weight,
        socioeconomicClassification, mseRemarks, treatmentDisposition, comorbiditiesJson, req.user.id, req.user.id
      ]
    );
    await connection.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patient_intakes', ?)",
      [req.user.username, `Saved clinical triage and social classification for "${patient.full_name}" (${patient.patient_code})`, patientId]
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
  const generalMedicalConsentSigned = req.body.generalMedicalConsentSigned === true;

  if (!Number.isInteger(patientId)) return res.status(400).json({ message: "Invalid patient ID." });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const patient = await getPatient(connection, patientId, { lock: true });
    const intake = await getIntake(connection, patientId);
    if (!patient) {
      await connection.rollback();
      return res.status(404).json({ message: "Patient not found." });
    }

    const isOPD = patient.case_type === "general_outpatient";

    // Validate required consents by case type
    if (isOPD) {
      if (!generalMedicalConsentSigned || !dataPrivacyConsentSigned) {
        await connection.rollback();
        return res.status(400).json({ message: "Confirm General Medical/Psychiatric Consent and Data Privacy Consent before finalizing." });
      }
    } else {
      if (!serviceAgreementSigned || !pledgeOfCommitmentSigned || !dataPrivacyConsentSigned) {
        await connection.rollback();
        return res.status(400).json({ message: "Confirm all three signed consent documents before finalizing enrollment." });
      }
    }

    if (!intake || intake.workflow_step < 5 || !intake.socioeconomic_classification) {
      await connection.rollback();
      return res.status(409).json({ message: "Complete Clinical Triage & Social Classification before finalization." });
    }
    if (patient.is_archived) {
      await connection.rollback();
      return res.status(409).json({ message: "Restore the patient before finalizing enrollment." });
    }

    if (isOPD) {
      await connection.query(
        `UPDATE patient_intakes SET general_medical_consent_signed = TRUE,
           data_privacy_consent_signed = TRUE, workflow_step = 6, finalized_at = COALESCE(finalized_at, NOW()),
           finalized_by = COALESCE(finalized_by, ?), updated_by = ? WHERE patient_id = ?`,
        [req.user.id, req.user.id, patientId]
      );
    } else {
      await connection.query(
        `UPDATE patient_intakes SET service_agreement_signed = TRUE, pledge_of_commitment_signed = TRUE,
           data_privacy_consent_signed = TRUE, workflow_step = 6, finalized_at = COALESCE(finalized_at, NOW()),
           finalized_by = COALESCE(finalized_by, ?), updated_by = ? WHERE patient_id = ?`,
        [req.user.id, req.user.id, patientId]
      );
    }

    const year = new Date().getFullYear().toString().slice(-2);

    if (isOPD) {
      // Generate OPD number (OPD-YY-sequence) if not already set
      const [[{ opdCount }]] = await connection.query(
        `SELECT COUNT(*) as opdCount FROM patients WHERE opd_number LIKE ?`,
        [`OPD-${year}-%`]
      );
      const opdSeq = String(opdCount + 1).padStart(3, "0");
      const opdNumber = `OPD-${year}-${opdSeq}`;
      await connection.query(
        "UPDATE patients SET admission_date = COALESCE(admission_date, CURDATE()), enrollment_status = 'active', current_status = 'active', opd_number = COALESCE(opd_number, ?) WHERE id = ?",
        [opdNumber, patientId]
      );
    } else {
      // Generate PWUD code (OP-LGU-YY-sequence) if not already set
      const lguCode = getLguCode(patient.municipality);
      const [[{ count }]] = await connection.query(
        `SELECT COUNT(*) as count FROM patients WHERE pwud_code LIKE ?`,
        [`OP-${lguCode}-${year}-%`]
      );
      const sequence = String(count + 1).padStart(3, "0");
      const pwudCode = `OP-${lguCode}-${year}-${sequence}`;
      await connection.query(
        "UPDATE patients SET admission_date = COALESCE(admission_date, CURDATE()), enrollment_status = 'active', current_status = 'active', pwud_code = COALESCE(pwud_code, ?) WHERE id = ?",
        [pwudCode, patientId]
      );
    }

    await connection.query("UPDATE patient_referrals SET status = 'intake_completed' WHERE patient_id = ?", [patientId]);
    await connection.query(
      `INSERT INTO patient_case_management
         (patient_id, date_of_initial_assessment, date_of_case_conference, program_orientation_date)
       VALUES (?, NULL, NULL, ?)
       ON DUPLICATE KEY UPDATE program_orientation_date = VALUES(program_orientation_date), updated_at = NOW()`,
      [patientId, req.body.programOrientationDate || null]
    );

    const certType = isOPD ? "opd_consultation" : "enrollment";
    let [[certificate]] = await connection.query(
      "SELECT id FROM certificates WHERE patient_id = ? AND certificate_type = ? AND is_archived = FALSE ORDER BY issued_at DESC LIMIT 1",
      [patientId, certType]
    );
    if (!certificate) {
      const [[preparer]] = await connection.query("SELECT full_name FROM users WHERE id = ?", [req.user.id]);
      const [[certificatePatient]] = await connection.query(
        `SELECT p.full_name, p.patient_code, p.admission_date, pr.name AS program_name
         FROM patients p LEFT JOIN programs pr ON pr.id = p.program_id WHERE p.id = ?`,
        [patientId]
      );
      const certRemarks = isOPD
        ? "General medical/psychiatric consent and data privacy consent verified"
        : "Enrollment requirements and signed consents verified";
      const [result] = await connection.query(
        `INSERT INTO certificates
           (patient_id, certificate_type, patient_name, patient_code, program_name,
            admission_date, completion_date, prepared_by_name, remarks, issued_by)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
        [patientId, certType, certificatePatient.full_name, certificatePatient.patient_code, certificatePatient.program_name,
          certificatePatient.admission_date, preparer?.full_name || req.user.username,
          certRemarks, req.user.id]
      );
      certificate = { id: result.insertId };
    }

    await connection.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patient_intakes', ?)",
      [req.user.username, `Finalized enrollment for \"${patient.full_name}\" (${patient.patient_code})`, patientId]
    );
    await connection.commit();
    const noticeMsg = isOPD
      ? `OPD registration finalized: "${patient.full_name}" (${patient.patient_code})`
      : `Patient enrollment finalized: "${patient.full_name}" (${patient.patient_code})`;
    await notifyRoles(["ict_admin", "him_staff", "admitting"], "patients", "patient_enrolled", noticeMsg);
    res.json({ message: isOPD ? "OPD registration finalized and Outpatient Consultation Slip generated." : "Enrollment finalized and Certificate of Enrollment generated.", certificateId: certificate.id });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "Could not finalize the enrollment." });
  } finally {
    connection.release();
  }
}
