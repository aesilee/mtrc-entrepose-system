import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import CertificateViewModal from "../components/CertificateViewModal.jsx";
import PatientWorkflowProgress from "../components/PatientWorkflowProgress.jsx";
import api from "../api/axios.js";

const TODAY = new Date().toISOString().slice(0, 10);
const STEP_BY_SECTION = { "drug-history": 3, "clinical-triage": 4, finalize: 5 };
const DRUG_OPTIONS = [
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
];

const EMPTY_FORM = {
  ageAtFirstUse: "",
  lastDrugUseDate: "",
  lengthOfUse: "",
  frequencyOfUse: "",
  primaryReason: "",
  drugSource: "",
  provinceOfDrugSource: "",
  cityOfDrugSource: "",
  meansToSupport: "",
  areaOfDrugUse: "",
  estimatedDailyDrugExpense: "",
  substances: [],
  bloodPressure: "",
  pulseRate: "",
  respiratoryRate: "",
  temperature: "",
  weight: "",
  mseRemarks: "",
  socioeconomicClassification: "",
  treatmentDisposition: "",
  comorbidities: {
    // Medical / Surgical
    hypertension: "",
    diabetes: "",
    tuberculosis: "",
    asthma: "",
    cardiovascular: "",
    hepatitisB: "",
    hepatitisC: "",
    hivAids: "",
    gastrointestinal: "",
    dentalOral: "",
    musculoskeletal: "",
    genitoUrinary: "",
    previousMajorSurgery: "",
    parasiticInfection: "",
    eentCondition: "",
    skinDisease: "",
    endocrineDisorder: "",
    physicalDisability: "",
    // Psychiatric
    psychoticDisorder: "",
    moodDisorder: "",
    anxietyDisorder: "",
    personalityDisorder: "",
  },
  serviceAgreementSigned: false,
  pledgeOfCommitmentSigned: false,
  dataPrivacyConsentSigned: false,
  generalMedicalConsentSigned: false,
  programOrientationDate: "",
  admissionDate: TODAY,
  assignedCaseManagerId: "",
};

function toForm(intake, patientData) {
  if (!intake) {
    return {
      ...EMPTY_FORM,
      admissionDate: patientData?.admission_date ? String(patientData.admission_date).slice(0, 10) : TODAY,
      assignedCaseManagerId: patientData?.assigned_case_manager_id || "",
    };
  }
  let comorbidities = { ...EMPTY_FORM.comorbidities };
  if (intake.comorbidities) {
    try {
      const parsed = typeof intake.comorbidities === "string" ? JSON.parse(intake.comorbidities) : intake.comorbidities;
      comorbidities = { ...comorbidities, ...parsed };
    } catch { /* ignore */ }
  }
  return {
    ageAtFirstUse: intake.age_at_first_drug_use ?? "",
    lastDrugUseDate: intake.last_drug_use_date ? String(intake.last_drug_use_date).slice(0, 10) : "",
    lengthOfUse: intake.length_of_use || "",
    frequencyOfUse: intake.frequency_of_use || "",
    primaryReason: intake.primary_reason_for_using || "",
    drugSource: intake.drug_source || "",
    provinceOfDrugSource: intake.province_of_drug_source || "",
    cityOfDrugSource: intake.city_of_drug_source || "",
    meansToSupport: intake.means_to_support || "",
    areaOfDrugUse: intake.area_of_drug_use || "",
    estimatedDailyDrugExpense: intake.estimated_daily_drug_expense ?? "",
    substances: Array.isArray(intake.substances) ? intake.substances.map((s, i) => ({
      ...s,
      isPrimarySubstance: Boolean(s.isPrimarySubstance) || (i === 0 && intake.substances.every(sub => !sub.isPrimarySubstance)),
      routeOfAdministration: s.routeOfAdministration ? s.routeOfAdministration.split(',').map(r => r.trim()) : []
    })) : [],
    bloodPressure: intake.blood_pressure || "",
    pulseRate: intake.pulse_rate ?? "",
    respiratoryRate: intake.respiratory_rate ?? "",
    temperature: intake.temperature_celsius ?? "",
    weight: intake.weight_kg ?? "",
    mseRemarks: intake.mse_remarks || "",
    socioeconomicClassification: intake.socioeconomic_classification || "",
    treatmentDisposition: intake.treatment_disposition || "",
    comorbidities,
    serviceAgreementSigned: Boolean(intake.service_agreement_signed),
    pledgeOfCommitmentSigned: Boolean(intake.pledge_of_commitment_signed),
    dataPrivacyConsentSigned: Boolean(intake.data_privacy_consent_signed),
    generalMedicalConsentSigned: Boolean(intake.general_medical_consent_signed),
    programOrientationDate: "",
    admissionDate: patientData?.admission_date ? String(patientData.admission_date).slice(0, 10) : TODAY,
    assignedCaseManagerId: patientData?.assigned_case_manager_id || "",
  };
}


export default function IntakeWorkflow() {
  const { id, section } = useParams();
  const navigate = useNavigate();
  const currentStep = STEP_BY_SECTION[section] || 3;
  const [patient, setPatient] = useState(null);
  const [referral, setReferral] = useState(null);
  const [intake, setIntake] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [certificateId, setCertificateId] = useState(null);
  const [certificateAction, setCertificateAction] = useState(null);
  const [caseManagers, setCaseManagers] = useState([]);

  useEffect(() => {
    api.get("/users/case-managers")
      .then(({ data }) => setCaseManagers(data.caseManagers || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/intakes/patient/${id}`)
      .then(({ data }) => {
        if (!active) return;
        setPatient(data.patient);
        setReferral(data.referral);
        setIntake(data.intake);
        setForm(toForm(data.intake, data.patient));
        setCertificateId(data.enrollmentCertificateId || null);
      })
      .catch((requestError) => active && setError(requestError.response?.data?.message || "Could not load the intake workflow."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setError("");
    setMessage("");
  }

  async function saveDrugHistoryDraft() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.put(`/intakes/patient/${id}/drug-history`, {
        isDraft: true,
        ageAtFirstUse: form.ageAtFirstUse,
        lastDrugUseDate: form.lastDrugUseDate,
        lengthOfUse: form.lengthOfUse,
        frequencyOfUse: form.frequencyOfUse,
        primaryReason: form.primaryReason,
        drugSource: form.drugSource,
        substances: form.substances.map(s => ({
          ...s,
          routeOfAdministration: Array.isArray(s.routeOfAdministration) ? s.routeOfAdministration.join(', ') : s.routeOfAdministration
        })),
      });
      setIntake(data.intake);
      setMessage("Draft saved successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not save the draft.");
    } finally {
      setSaving(false);
    }
  }

  async function saveDrugHistory(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data } = await api.put(`/intakes/patient/${id}/drug-history`, {
        ageAtFirstUse: form.ageAtFirstUse,
        lastDrugUseDate: form.lastDrugUseDate,
        lengthOfUse: form.lengthOfUse,
        frequencyOfUse: form.frequencyOfUse,
        primaryReason: form.primaryReason,
        drugSource: form.drugSource,
        substances: form.substances.map(s => ({
          ...s,
          routeOfAdministration: Array.isArray(s.routeOfAdministration) ? s.routeOfAdministration.join(', ') : s.routeOfAdministration
        })),
      });
      setIntake(data.intake);
      navigate(`/patients/${id}/intake/clinical-triage`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not save the drug use history.");
    } finally {
      setSaving(false);
    }
  }

  async function saveTriage(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data } = await api.put(`/intakes/patient/${id}/clinical-triage`, {
        bloodPressure: form.bloodPressure,
        pulseRate: form.pulseRate,
        respiratoryRate: form.respiratoryRate,
        temperature: form.temperature,
        weight: form.weight,
        mseRemarks: form.mseRemarks,
        socioeconomicClassification: form.socioeconomicClassification,
        treatmentDisposition: form.treatmentDisposition,
        comorbidities: form.comorbidities,
      });
      setIntake(data.intake);
      navigate(`/patients/${id}/intake/finalize`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not save clinical triage.");
    } finally {
      setSaving(false);
    }
  }

  async function finalize(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const isOPD = patient?.case_type === "general_outpatient";
    try {
      const payload = isOPD
        ? {
            generalMedicalConsentSigned: form.generalMedicalConsentSigned,
            dataPrivacyConsentSigned: form.dataPrivacyConsentSigned,
            programOrientationDate: form.programOrientationDate,
            admissionDate: form.admissionDate,
          }
        : {
            serviceAgreementSigned: form.serviceAgreementSigned,
            pledgeOfCommitmentSigned: form.pledgeOfCommitmentSigned,
            dataPrivacyConsentSigned: form.dataPrivacyConsentSigned,
            programOrientationDate: form.programOrientationDate,
            admissionDate: form.admissionDate,
            assignedCaseManagerId: form.assignedCaseManagerId || patient?.assigned_case_manager_id,
          };
      const { data } = await api.post(`/intakes/patient/${id}/finalize`, payload);
      setCertificateId(data.certificateId);
      setIntake((previous) => ({ ...(previous || {}), workflow_step: 6 }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not finalize the enrollment.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <AppShell title="Patient Intake" description="Loading the registration workflow…"><div style={styles.loading}>Loading intake workflow…</div></AppShell>;
  }

  if (!patient) {
    return <AppShell title="Patient Intake" description="Registration workflow unavailable."><div role="alert" style={styles.error}>{error || "Patient not found."}</div></AppShell>;
  }

  const isOPD = patient.case_type === "general_outpatient";
  const totalSteps = isOPD ? 3 : 5;
  // Map display step numbers: for OPD, sections map to steps 1,2,3 instead of 3,4,5
  const displayStep = isOPD && currentStep >= 3 ? currentStep - 2 : currentStep;

  const finalized = intake?.workflow_step >= 6;
  const prerequisitesMissing = !isOPD && (!referral || !["ready_for_intake", "intake_in_progress", "intake_completed"].includes(referral.status));
  const title = currentStep === 3
    ? "Drug Use History (IDADIN Part B)"
    : currentStep === 4
      ? "Clinical Triage & Social Classification"
      : "Consents & Finalization";

  const patientDisplayCode = isOPD
    ? (patient.opd_number || patient.patient_code)
    : (patient.pwud_code || patient.patient_code);

  return (
    <AppShell title={title} description="Complete the admitting-personnel registration workflow.">
      <div style={styles.page}>
        <PatientWorkflowProgress currentStep={displayStep} completedThrough={finalized ? totalSteps : displayStep - 1} caseType={patient.case_type} />

        <div style={styles.patientStrip}>
          <span style={styles.avatar}>{patient.full_name?.charAt(0) || "P"}</span>
          <strong>{patient.full_name}</strong>
          <span style={styles.divider} />
          <span style={styles.patientCode}>{patientDisplayCode}</span>
          <span style={{ ...styles.statusBadge, ...(finalized ? styles.statusComplete : styles.statusPending) }}>
            {finalized ? "Enrolled" : `Step ${displayStep} of ${totalSteps}`}
          </span>
        </div>

        {error && <div role="alert" style={styles.error}>{error}</div>}
        {message && <div role="status" style={{ ...styles.error, background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" }}>{message}</div>}

        {prerequisitesMissing && (
          <div style={{ ...styles.noticeCard, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>Note: Admission history (Step 2) is not yet finalized for this patient.</strong>
              <div style={{ fontSize: 12, marginTop: 3, color: "var(--color-text-muted)" }}>
                Displaying section fields for inspection and review.
              </div>
            </div>
            <button type="button" style={styles.secondaryButton} onClick={() => navigate(`/patients/${id}/referral`)}>
              View Step 2
            </button>
          </div>
        )}

        {currentStep === 3 ? (
          <form onSubmit={saveDrugHistory} style={styles.form}>
            <Section title="Drug Use Details" description="Record IDADIN Part B drug use information for the 12 months prior to admission.">
              <Field label="Age at first drug use" required>
                <input type="number" min="0" max="130" step="1" style={styles.input} value={form.ageAtFirstUse} onChange={(event) => update("ageAtFirstUse", event.target.value)} required />
              </Field>
              <Field label="Date of last drug use" required>
                <input type="date" max={TODAY} style={styles.input} value={form.lastDrugUseDate} onChange={(event) => update("lastDrugUseDate", event.target.value)} required />
              </Field>
              <Field label="Length of use" required>
                <select style={styles.input} value={form.lengthOfUse} onChange={(event) => update("lengthOfUse", event.target.value)} required>
                  <option value="">Select length of use</option>
                  <option value="Less than 1 year">Less than 1 year</option>
                  <option value="1 Year – 2 Years & 11 Months">1 Year – 2 Years & 11 Months</option>
                  <option value="3 Years – 4 Years & 11 Months">3 Years – 4 Years & 11 Months</option>
                  <option value="5 Years – 6 Years & 11 Months">5 Years – 6 Years & 11 Months</option>
                  <option value="7 Years – 8 Years & 11 Months">7 Years – 8 Years & 11 Months</option>
                  <option value="9 Years – 10 Years & 11 Months">9 Years – 10 Years & 11 Months</option>
                  <option value="11 Years and Above">11 Years and Above</option>
                </select>
              </Field>
              <Field label="Frequency of use" required>
                <select style={styles.input} value={form.frequencyOfUse} onChange={(event) => update("frequencyOfUse", event.target.value)} required>
                  <option value="">Select frequency</option>
                  {FREQUENCY_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Primary reason for using drugs" required>
                <select style={styles.input} value={form.primaryReason} onChange={(event) => update("primaryReason", event.target.value)} required>
                  <option value="">Select reason</option>
                  <option value="Peer Pressure / Curiosity">Peer Pressure / Curiosity</option>
                  <option value="Family Problems">Family Problems</option>
                  <option value="Financial Stress">Financial Stress</option>
                  <option value="Vice">Vice</option>
                  <option value="Emotional / Depression">Emotional / Depression</option>
                  <option value="Work-Related">Work-Related</option>
                  <option value="Medical Use">Medical Use</option>
                </select>
              </Field>
              <Field label="Source of drugs" required>
                <select style={styles.input} value={form.drugSource} onChange={(event) => update("drugSource", event.target.value)} required>
                  <option value="">Select source</option>
                  <option value="Friend / Peer">Friend / Peer</option>
                  <option value="Pusher">Pusher</option>
                  <option value="Relative">Relative</option>
                  <option value="Drugstore">Drugstore</option>
                  <option value="Self">Self</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
            </Section>
            <section style={styles.section}>
              <div style={styles.sectionTitle}>Specific drugs used in the past 12 months</div>
              <div style={styles.sectionDescription}>List all substances used, along with the route of administration.</div>
              <SubstancesTable substances={form.substances} onChange={(s) => update("substances", s)} disabled={prerequisitesMissing} />
            </section>
            <Actions back={() => navigate(`/patients/${id}/referral`)} draft={saveDrugHistoryDraft} saving={saving} label="Save & Continue to Clinical Triage" />
          </form>
        ) : currentStep === 4 ? (
          <form onSubmit={saveTriage} style={styles.form}>
            <Section title="Vital Signs" description="Enter the measurements logged by the triage nurse.">
              <Field label="Blood pressure" required hint="Use systolic/diastolic format, such as 120/80.">
                <input inputMode="numeric" pattern="[0-9]{2,3}/[0-9]{2,3}" style={styles.input} value={form.bloodPressure} onChange={(event) => update("bloodPressure", event.target.value)} placeholder="120/80" required />
              </Field>
              <Field label="Pulse rate (bpm)" required>
                <input type="number" min="20" max="250" step="1" style={styles.input} value={form.pulseRate} onChange={(event) => update("pulseRate", event.target.value)} required />
              </Field>
              <Field label="Respiratory rate (cpm)" required>
                <input type="number" min="10" max="60" step="1" style={styles.input} value={form.respiratoryRate} onChange={(event) => update("respiratoryRate", event.target.value)} required />
              </Field>
              <Field label="Temperature (°C)" required>
                <input type="number" min="30" max="45" step="0.1" style={styles.input} value={form.temperature} onChange={(event) => update("temperature", event.target.value)} required />
              </Field>
              <Field label="Weight (kg)" required>
                <input type="number" min="1" max="500" step="0.01" style={styles.input} value={form.weight} onChange={(event) => update("weight", event.target.value)} required />
              </Field>
              <Field label="Mental Status Examination Remarks" wide>
                <textarea rows={3} style={styles.textarea} value={form.mseRemarks} onChange={(event) => update("mseRemarks", event.target.value)} />
              </Field>
            </Section>
            <Section title="Clinical Comorbidities & Disposition" description="Record any known medical or psychiatric comorbid conditions. Select management status for each.">
              <ComorbidityTable comorbidities={form.comorbidities} onChange={(updated) => update("comorbidities", updated)} />
              <Field label="Treatment disposition" required wide>
                <select style={styles.input} value={form.treatmentDisposition} onChange={(event) => update("treatmentDisposition", event.target.value)} required>
                  <option value="">Select disposition</option>
                  <option value="Managed within MTRC Facility">Managed within MTRC Facility</option>
                  <option value="Referred to External Specialty Hospital">Referred to External Specialty Hospital</option>
                  <option value="Referred back to Attending Physician">Referred back to Attending Physician</option>
                </select>
              </Field>
            </Section>
            <Section title="Social Classification" description="Record the classification assessed by the Medical Social Worker.">
              <Field label="Socio-economic classification" required wide>
                <select style={styles.input} value={form.socioeconomicClassification} onChange={(event) => update("socioeconomicClassification", event.target.value)} required>
                  <option value="">Select classification</option>
                  <option value="full_pay">Full Pay</option>
                  <option value="c1">C1</option>
                  <option value="c2">C2</option>
                  <option value="c3">C3 (Indigent)</option>
                </select>
              </Field>
            </Section>
            <Actions
              back={() => navigate(isOPD ? `/patients/${id}/demographics` : `/patients/${id}/intake/drug-history`)}
              saving={saving}
              label="Save & Continue to Consents"
            />
          </form>
        ) : (
          <>
            {finalized && (
              <section style={styles.completeCard}>
                <div style={styles.completeIcon}>✓</div>
                <h2 style={styles.completeTitle}>{isOPD ? "OPD Registration finalized" : "Enrollment finalized"}</h2>
                <p style={styles.completeText}>
                  {isOPD
                    ? "The patient record is active and the Outpatient Consultation Slip is ready to print."
                    : "The patient profile is active and the Certificate of Enrollment is ready to print."}
                </p>
                <div style={styles.actions}>
                  <button type="button" style={styles.secondaryButton} onClick={() => navigate(`/patients/${id}`)}>View Patient Profile</button>
                  {certificateId && (
                    <button type="button" style={styles.primaryButton} onClick={() => setCertificateAction("print")}>
                      {isOPD ? "Print Outpatient Consultation Slip" : "Print Certificate of Enrollment"}
                    </button>
                  )}
                  <button type="button" style={styles.secondaryButton} onClick={() => alert("Transmittal notice template generation is under development.")}>
                    Print Transmittal Notice
                  </button>
                </div>
              </section>
            )}
            <form onSubmit={finalize} style={styles.form}>
              <section style={styles.section}>
                <div style={styles.sectionTitle}>Admission & Caseload Activation</div>
                <div style={styles.sectionDescription}>
                  Confirm the official admission date and assigned Case Manager. Once finalized, this client will become an active enrollee and appear on the Case Manager's caseload and the OP CM Tracker.
                </div>
                <div className="registration-grid" style={styles.grid}>
                  <Field label="Official Admission / Enrollment Date" required>
                    <input
                      type="date"
                      max={TODAY}
                      style={styles.input}
                      value={form.admissionDate || TODAY}
                      onChange={(event) => update("admissionDate", event.target.value)}
                      required
                    />
                  </Field>
                  {!isOPD && (
                    <Field label="Assigned Case Manager" required>
                      <select
                        style={styles.input}
                        value={form.assignedCaseManagerId || patient?.assigned_case_manager_id || ""}
                        onChange={(event) => update("assignedCaseManagerId", event.target.value)}
                        required
                      >
                        <option value="">Select Case Manager</option>
                        {caseManagers.map((cm) => (
                          <option key={cm.id} value={cm.id}>{cm.full_name}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <Field label="Scheduled Program Orientation (PO) Date" required>
                    <input
                      type="date"
                      min={TODAY}
                      style={styles.input}
                      value={form.programOrientationDate}
                      onChange={(event) => update("programOrientationDate", event.target.value)}
                      required
                    />
                  </Field>
                </div>
              </section>

              <section style={styles.section}>
                <div style={styles.sectionTitle}>Signed Documents</div>
                <div style={styles.sectionDescription}>Confirm each signed document is present in the patient's admission record.</div>
                {isOPD ? (
                  <>
                    <ConsentCheck id="general-medical-consent" label="General Medical / Psychiatric Consent signed" checked={form.generalMedicalConsentSigned} onChange={(checked) => update("generalMedicalConsentSigned", checked)} />
                    <ConsentCheck id="privacy-consent" label="Data Privacy Consent signed" checked={form.dataPrivacyConsentSigned} onChange={(checked) => update("dataPrivacyConsentSigned", checked)} />
                  </>
                ) : (
                  <>
                    <ConsentCheck id="service-agreement" label="Service Agreement signed" checked={form.serviceAgreementSigned} onChange={(checked) => update("serviceAgreementSigned", checked)} />
                    <ConsentCheck id="pledge-commitment" label="Pledge of Commitment signed" checked={form.pledgeOfCommitmentSigned} onChange={(checked) => update("pledgeOfCommitmentSigned", checked)} />
                    <ConsentCheck id="privacy-consent" label="Data Privacy Consent signed" checked={form.dataPrivacyConsentSigned} onChange={(checked) => update("dataPrivacyConsentSigned", checked)} />
                  </>
                )}
              </section>
              <div style={styles.finalNotice}>
                {isOPD
                  ? "Finalizing activates the patient record and creates a printable Outpatient Consultation Slip."
                  : "Finalizing activates the patient record and creates a printable Certificate of Enrollment."}
              </div>
              <Actions back={() => navigate(`/patients/${id}/intake/clinical-triage`)} saving={saving} label={finalized ? "Save Consents" : isOPD ? "Finalize OPD Registration" : "Finalize & Enroll"} />
            </form>
          </>
        )}
      </div>

      {certificateId && certificateAction && (
        <CertificateViewModal certificateId={certificateId} autoAction={certificateAction} onClose={() => setCertificateAction(null)} />
      )}
    </AppShell>
  );
}

function Section({ title, description, children }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      <div style={styles.sectionDescription}>{description}</div>
      <div className="registration-grid" style={styles.grid}>{children}</div>
    </section>
  );
}

function Field({ label, required, wide, full, hint, children }) {
  const className = ["registration-field", wide ? "registration-field--wide" : "", full ? "registration-field--full" : ""].filter(Boolean).join(" ");
  return (
    <label className={className} style={styles.label}>
      <span>{label} {required && <span style={styles.required}>*</span>}</span>
      {children}
      {hint && <span style={styles.hint}>{hint}</span>}
    </label>
  );
}

function ConsentCheck({ id, label, checked, onChange }) {
  return (
    <label htmlFor={id} style={styles.consentRow}>
      <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} required />
      <span>{label}</span>
    </label>
  );
}

function Actions({ back, saving, label, draft }) {
  return (
    <div style={styles.actions}>
      <button type="button" style={styles.secondaryButton} onClick={back}>Back</button>
      {draft && (
        <button type="button" style={styles.secondaryButton} onClick={draft} disabled={saving}>
          Save Draft
        </button>
      )}
      <button type="submit" style={styles.primaryButton} disabled={saving}>{saving ? "Saving…" : label}</button>
    </div>
  );
}

const DRUG_TYPE_OPTIONS = [
  "Methamphetamine Hydrochloride (Shabu)",
  "Cannabis (Marijuana)",
  "MDMA (Ecstasy)",
  "Cocaine",
  "Inhalants / Solvents (Rugby, Thinner, Contact Cement)",
  "Sedatives / Benzodiazepines (Valium, Rivotril, Xanor)",
  "Other Substance"
];

const MODE_OF_INTAKE_OPTIONS = [
  "Inhalation / Sniffing",
  "Smoking",
  "Orally / Ingestion",
  "Injection / Intravenous"
];

const FREQUENCY_OPTIONS = [
  "Daily",
  "2 to 5 times a week",
  "Weekly",
  "Monthly",
  "Occasionally",
];

const UNIT_OF_MEASUREMENT_OPTIONS = [
  "Sachet",
  "Stick",
  "Gram",
  "Tablet",
  "Ampule"
];

function SubstancesTable({ substances, onChange, disabled }) {
  function addRow() {
    onChange([
      ...substances,
      {
        drugUsed: "",
        isPrimarySubstance: substances.length === 0, // default first one to primary
        routeOfAdministration: "Inhalation / Sniffing",
        frequency: "Daily",
        amountSpent: "",
        quantity: "",
        unitOfMeasurement: "Gram",
      },
    ]);
  }

  function updateRow(index, field, value) {
    const updated = [...substances];
    
    // If setting a substance as primary, unset others
    if (field === 'isPrimarySubstance' && value === true) {
      updated.forEach((sub, i) => {
        if (i !== index) sub.isPrimarySubstance = false;
      });
    }

    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }

  function removeRow(index) {
    const updated = substances.filter((_, i) => i !== index);
    // If we removed the primary substance and there are still substances left, make the first one primary
    if (substances[index].isPrimarySubstance && updated.length > 0) {
      updated[0].isPrimarySubstance = true;
    }
    onChange(updated);
  }

  return (
    <div style={{ marginTop: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
        <thead>
          <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
            <th style={{ padding: "8px", fontWeight: 600 }}>Primary</th>
            <th style={{ padding: "8px", fontWeight: 600 }}>Type of Drug</th>
            <th style={{ padding: "8px", fontWeight: 600 }}>Route of Admin.</th>
            <th style={{ padding: "8px", fontWeight: 600 }}>Frequency</th>
            <th style={{ padding: "8px", fontWeight: 600 }}>Amt. Spent (PHP)</th>
            <th style={{ padding: "8px", fontWeight: 600 }}>Qty</th>
            <th style={{ padding: "8px", fontWeight: 600 }}>Unit</th>
            <th style={{ padding: "8px", fontWeight: 600, width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {substances.map((sub, index) => (
            <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "8px", textAlign: "center" }}>
                <input
                  type="radio"
                  name="primary_substance"
                  checked={Boolean(sub.isPrimarySubstance)}
                  onChange={() => updateRow(index, "isPrimarySubstance", true)}
                  disabled={disabled}
                  required
                />
              </td>
              <td style={{ padding: "4px 8px" }}>
                <select style={{ ...styles.input, fontSize: 13, padding: "4px 8px" }} value={sub.drugUsed} onChange={(e) => updateRow(index, "drugUsed", e.target.value)} disabled={disabled} required>
                  <option value="">Select drug</option>
                  {DRUG_TYPE_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </td>
              <td style={{ padding: "4px 8px" }}>
                <select style={{ ...styles.input, fontSize: 13, padding: "4px 8px" }} value={sub.routeOfAdministration} onChange={(e) => updateRow(index, "routeOfAdministration", e.target.value)} disabled={disabled} required>
                  {MODE_OF_INTAKE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </td>
              <td style={{ padding: "4px 8px" }}>
                <select style={{ ...styles.input, fontSize: 13, padding: "4px 8px" }} value={sub.frequency} onChange={(e) => updateRow(index, "frequency", e.target.value)} disabled={disabled} required>
                  {FREQUENCY_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </td>
              <td style={{ padding: "4px 8px" }}>
                <input type="number" min="0" step="0.01" style={{ ...styles.input, fontSize: 13, padding: "4px 8px" }} value={sub.amountSpent} onChange={(e) => updateRow(index, "amountSpent", e.target.value)} disabled={disabled} placeholder="0.00" />
              </td>
              <td style={{ padding: "4px 8px", width: 70 }}>
                <input type="number" min="0" step="0.01" style={{ ...styles.input, fontSize: 13, padding: "4px 8px" }} value={sub.quantity} onChange={(e) => updateRow(index, "quantity", e.target.value)} disabled={disabled} placeholder="0" />
              </td>
              <td style={{ padding: "4px 8px", width: 90 }}>
                <select style={{ ...styles.input, fontSize: 13, padding: "4px 8px" }} value={sub.unitOfMeasurement} onChange={(e) => updateRow(index, "unitOfMeasurement", e.target.value)} disabled={disabled}>
                  {UNIT_OF_MEASUREMENT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </td>
              <td style={{ padding: "4px 8px", textAlign: "center" }}>
                {!disabled && (
                  <button type="button" onClick={() => removeRow(index)} style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer", fontSize: 16, padding: "0 4px" }} title="Remove substance">
                    ×
                  </button>
                )}
              </td>
            </tr>
          ))}
          {substances.length === 0 && (
            <tr>
              <td colSpan={8} style={{ padding: "16px", textAlign: "center", color: "#6b7280", fontStyle: "italic" }}>
                No substances added. Click "+ Add Substance" to record drug history.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <button type="button" onClick={addRow} disabled={disabled} style={{ ...styles.addBtn, marginTop: 8, opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
        + Add Substance
      </button>
    </div>
  );
}

const COMORBIDITY_CONDITIONS = [
  // Medical / Surgical (18 items)
  { key: "hypertension",           label: "Hypertension",                         category: "Medical / Surgical" },
  { key: "diabetes",               label: "Diabetes Mellitus",                    category: "Medical / Surgical" },
  { key: "tuberculosis",           label: "Pulmonary Tuberculosis (PTB)",          category: "Medical / Surgical" },
  { key: "asthma",                 label: "Bronchial Asthma",                     category: "Medical / Surgical" },
  { key: "cardiovascular",         label: "Cardiovascular Disease",               category: "Medical / Surgical" },
  { key: "hepatitisB",             label: "Hepatitis B",                          category: "Medical / Surgical" },
  { key: "hepatitisC",             label: "Hepatitis C",                          category: "Medical / Surgical" },
  { key: "hivAids",                label: "HIV / AIDS",                           category: "Medical / Surgical" },
  { key: "gastrointestinal",       label: "Gastrointestinal Disease",             category: "Medical / Surgical" },
  { key: "dentalOral",             label: "Dental / Oral Condition",              category: "Medical / Surgical" },
  { key: "musculoskeletal",        label: "Musculoskeletal Disorder",             category: "Medical / Surgical" },
  { key: "genitoUrinary",          label: "Genito-Urinary Condition",             category: "Medical / Surgical" },
  { key: "previousMajorSurgery",   label: "Previous Major Surgery",               category: "Medical / Surgical" },
  { key: "parasiticInfection",     label: "Parasitic Infection",                  category: "Medical / Surgical" },
  { key: "eentCondition",          label: "EENT Condition",                       category: "Medical / Surgical" },
  { key: "skinDisease",            label: "Skin Disease",                         category: "Medical / Surgical" },
  { key: "endocrineDisorder",      label: "Hyperthyroidism / Endocrine Disorder", category: "Medical / Surgical" },
  { key: "physicalDisability",     label: "Physical Disability / Deformity",      category: "Medical / Surgical" },
  // Psychiatric (4 items)
  { key: "psychoticDisorder",      label: "Psychotic / Thought Disorder",         category: "Psychiatric" },
  { key: "moodDisorder",           label: "Mood Disorder (Bipolar / Depression)", category: "Psychiatric" },
  { key: "anxietyDisorder",        label: "Anxiety / Somatoform Disorder",        category: "Psychiatric" },
  { key: "personalityDisorder",    label: "Personality Disorder",                 category: "Psychiatric" },
];

const COMORBIDITY_STATUS_OPTIONS = [
  { value: "",                    label: "Select status" },
  { value: "none",                label: "None" },
  { value: "managed_in_facility", label: "Managed in-facility" },
  { value: "referred_externally", label: "Referred externally" },
];

function ComorbidityTable({ comorbidities, onChange }) {
  function updateCondition(key, value) {
    onChange({ ...comorbidities, [key]: value });
  }

  // Group conditions by category
  const categories = [...new Set(COMORBIDITY_CONDITIONS.map((c) => c.category))];

  return (
    <div style={{ overflowX: "auto", gridColumn: "1 / -1" }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Condition</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <>
              <tr key={`cat-${cat}`}>
                <td colSpan={2} style={{ ...styles.td, background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", fontWeight: 700, fontSize: 12, padding: "6px 10px", letterSpacing: "0.03em" }}>
                  {cat}
                </td>
              </tr>
              {COMORBIDITY_CONDITIONS.filter((c) => c.category === cat).map(({ key, label }) => (
                <tr key={key}>
                  <td style={styles.td}>{label}</td>
                  <td style={styles.td}>
                    <select
                      style={{ ...styles.input, minWidth: 200 }}
                      value={comorbidities[key] || ""}
                      onChange={(e) => updateCondition(key, e.target.value)}
                    >
                      {COMORBIDITY_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  page: { display: "flex", flexDirection: "column", gap: 18, maxWidth: 1320, width: "100%", margin: "0 auto" },
  form: { display: "flex", flexDirection: "column", gap: 18 },
  loading: { padding: 30, color: "var(--color-text-muted)" },
  patientStrip: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: 13 },
  avatar: { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", fontWeight: 800 },
  divider: { width: 1, height: 24, background: "var(--color-border)" },
  patientCode: { color: "var(--color-text-muted)" },
  statusBadge: { marginLeft: "auto", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 },
  statusPending: { color: "var(--color-warning)", background: "var(--color-warning-tint)" },
  statusComplete: { color: "var(--color-primary-dark)", background: "var(--color-primary-tint)" },
  error: { background: "var(--color-danger-tint)", color: "var(--color-danger)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 13 },
  section: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 20 },
  sectionTitle: { color: "var(--color-primary-dark)", fontSize: 15, fontWeight: 800 },
  sectionDescription: { color: "var(--color-text-muted)", fontSize: 12, lineHeight: 1.5, marginTop: 4, marginBottom: 16 },
  grid: { display: "grid", gap: 16 },
  label: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0, color: "var(--color-text)", fontSize: 13, fontWeight: 600 },
  required: { color: "var(--color-danger)" },
  hint: { color: "var(--color-text-muted)", fontSize: 11, fontWeight: 400 },
  input: { width: "100%", padding: "10px 11px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)", color: "var(--color-text)", fontSize: 13 },
  textarea: { width: "100%", resize: "vertical", padding: "10px 11px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)", color: "var(--color-text)", fontFamily: "inherit", fontSize: 13, lineHeight: 1.45 },
  multiSelect: { width: "100%", minHeight: 230, padding: 8, border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)", fontFamily: "inherit", fontSize: 13 },
  consentRow: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", marginTop: 10, border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text)", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  finalNotice: { padding: "12px 14px", borderRadius: "var(--radius-sm)", color: "var(--color-primary-dark)", background: "var(--color-primary-tint)", fontSize: 12 },
  actions: { display: "flex", justifyContent: "flex-end", gap: 10 },
  primaryButton: { border: 0, borderRadius: "var(--radius-sm)", padding: "10px 18px", background: "var(--color-primary)", color: "#fff", fontWeight: 700, fontSize: 13 },
  secondaryButton: { border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "10px 18px", background: "var(--color-surface)", color: "var(--color-text)", fontWeight: 700, fontSize: 13 },
  noticeCard: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, padding: 20, border: "1px solid var(--color-warning)", borderRadius: "var(--radius-lg)", background: "var(--color-warning-tint)", color: "var(--color-text)", fontSize: 13 },
  completeCard: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8, padding: 36, border: "1px solid #bdd7c7", borderRadius: "var(--radius-lg)", background: "var(--color-surface)" },
  completeIcon: { width: 48, height: 48, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--color-primary)", color: "#fff", fontSize: 24, fontWeight: 800 },
  completeTitle: { marginTop: 6, color: "var(--color-primary-dark)", fontSize: 20 },
  completeText: { color: "var(--color-text-muted)", fontSize: 13, margin: "0 0 8px" },
  emptyTable: { padding: 12, fontSize: 13, color: "var(--color-text-muted)", fontStyle: "italic", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-sm)" },
  table: { width: "100%", borderCollapse: "collapse", marginBottom: 12 },
  th: { textAlign: "left", padding: "8px 10px", fontSize: 12, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", fontWeight: 700 },
  td: { padding: "8px 10px", borderBottom: "1px solid var(--color-border)" },
  thAction: { width: 40, borderBottom: "1px solid var(--color-border)" },
  tdAction: { width: 40, padding: "8px 0", borderBottom: "1px solid var(--color-border)", textAlign: "center" },
  removeBtn: { border: "none", background: "none", color: "var(--color-danger)", fontSize: 20, cursor: "pointer", padding: 0 },
  addBtn: { border: "1px dashed var(--color-primary)", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", padding: "8px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 700, cursor: "pointer" },
};
