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
  drugsUsed: [],
  bloodPressure: "",
  pulseRate: "",
  temperature: "",
  weight: "",
  socioeconomicClassification: "",
  serviceAgreementSigned: false,
  pledgeOfCommitmentSigned: false,
  dataPrivacyConsentSigned: false,
};

function toForm(intake) {
  if (!intake) return { ...EMPTY_FORM };
  return {
    ageAtFirstUse: intake.age_at_first_drug_use ?? "",
    lastDrugUseDate: intake.last_drug_use_date ? String(intake.last_drug_use_date).slice(0, 10) : "",
    lengthOfUse: intake.length_of_use || "",
    frequencyOfUse: intake.frequency_of_use || "",
    primaryReason: intake.primary_reason_for_using || "",
    drugSource: intake.drug_source || "",
    drugsUsed: Array.isArray(intake.drugs_used) ? intake.drugs_used : [],
    bloodPressure: intake.blood_pressure || "",
    pulseRate: intake.pulse_rate ?? "",
    temperature: intake.temperature_celsius ?? "",
    weight: intake.weight_kg ?? "",
    socioeconomicClassification: intake.socioeconomic_classification || "",
    serviceAgreementSigned: Boolean(intake.service_agreement_signed),
    pledgeOfCommitmentSigned: Boolean(intake.pledge_of_commitment_signed),
    dataPrivacyConsentSigned: Boolean(intake.data_privacy_consent_signed),
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
  const [certificateId, setCertificateId] = useState(null);
  const [certificateAction, setCertificateAction] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/intakes/patient/${id}`)
      .then(({ data }) => {
        if (!active) return;
        setPatient(data.patient);
        setReferral(data.referral);
        setIntake(data.intake);
        setForm(toForm(data.intake));
        setCertificateId(data.enrollmentCertificateId || null);
      })
      .catch((requestError) => active && setError(requestError.response?.data?.message || "Could not load the intake workflow."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setError("");
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
        drugsUsed: form.drugsUsed,
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
        temperature: form.temperature,
        weight: form.weight,
        socioeconomicClassification: form.socioeconomicClassification,
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
    try {
      const { data } = await api.post(`/intakes/patient/${id}/finalize`, {
        serviceAgreementSigned: form.serviceAgreementSigned,
        pledgeOfCommitmentSigned: form.pledgeOfCommitmentSigned,
        dataPrivacyConsentSigned: form.dataPrivacyConsentSigned,
      });
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

  const finalized = intake?.workflow_step >= 6;
  const prerequisitesMissing = !referral || !["ready_for_intake", "intake_in_progress", "intake_completed"].includes(referral.status);
  const title = currentStep === 3
    ? "Drug Use History (IDADIN Part B)"
    : currentStep === 4
      ? "Clinical Triage & Social Classification"
      : "Consents & Finalization";

  return (
    <AppShell title={title} description="Complete the admitting-personnel registration workflow.">
      <div style={styles.page}>
        <PatientWorkflowProgress currentStep={currentStep} completedThrough={finalized ? 5 : currentStep - 1} />

        <div style={styles.patientStrip}>
          <span style={styles.avatar}>{patient.full_name?.charAt(0) || "P"}</span>
          <strong>{patient.full_name}</strong>
          <span style={styles.divider} />
          <span style={styles.patientCode}>{patient.patient_code}</span>
          <span style={{ ...styles.statusBadge, ...(finalized ? styles.statusComplete : styles.statusPending) }}>
            {finalized ? "Enrolled" : `Step ${currentStep} of 5`}
          </span>
        </div>

        {error && <div role="alert" style={styles.error}>{error}</div>}

        {prerequisitesMissing ? (
          <section style={styles.noticeCard}>
            <strong>Admission history must be completed first.</strong>
            <span>Return to Step 2 and save the Admission & Confinement History before continuing.</span>
            <button type="button" style={styles.primaryButton} onClick={() => navigate(`/patients/${id}/referral`)}>Go to Admission History</button>
          </section>
        ) : finalized ? (
          <section style={styles.completeCard}>
            <div style={styles.completeIcon}>✓</div>
            <h2 style={styles.completeTitle}>Enrollment finalized</h2>
            <p style={styles.completeText}>The patient profile is active and the Certificate of Enrollment is ready to print.</p>
            <div style={styles.actions}>
              <button type="button" style={styles.secondaryButton} onClick={() => navigate(`/patients/${id}`)}>View Patient Profile</button>
              {certificateId && <button type="button" style={styles.primaryButton} onClick={() => setCertificateAction("print")}>Print Certificate of Enrollment</button>}
            </div>
          </section>
        ) : currentStep === 3 ? (
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
                  <option value="under_2_years">Less than 2 years</option>
                  <option value="2_to_4_years">2 to less than 4 years</option>
                  <option value="4_to_6_years">4 to less than 6 years</option>
                  <option value="6_years_or_more">6 years or more</option>
                </select>
              </Field>
              <Field label="Frequency of use" required>
                <select style={styles.input} value={form.frequencyOfUse} onChange={(event) => update("frequencyOfUse", event.target.value)} required>
                  <option value="">Select frequency</option>
                  <option value="daily">Daily</option>
                  <option value="2_to_5_weekly">2–5 times a week</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="occasionally">Occasionally</option>
                </select>
              </Field>
              <Field label="Primary reason for using drugs" required wide>
                <textarea rows={3} style={styles.textarea} value={form.primaryReason} onChange={(event) => update("primaryReason", event.target.value)} required />
              </Field>
              <Field label="Source of drugs" required wide>
                <input maxLength={150} style={styles.input} value={form.drugSource} onChange={(event) => update("drugSource", event.target.value)} placeholder="e.g. Friend/peer, pusher, drugstore, relative" required />
              </Field>
              <Field label="Specific drugs used in the past 12 months" required full hint="Hold Ctrl (Windows) or Command (Mac) to select multiple drugs.">
                <select
                  multiple
                  size={12}
                  style={styles.multiSelect}
                  value={form.drugsUsed}
                  onChange={(event) => update("drugsUsed", Array.from(event.target.selectedOptions, (option) => option.value))}
                  required
                >
                  {DRUG_OPTIONS.map((drug) => <option key={drug} value={drug}>{drug}</option>)}
                </select>
              </Field>
            </Section>
            <Actions back={() => navigate(`/patients/${id}/referral`)} saving={saving} label="Save & Continue to Clinical Triage" />
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
              <Field label="Temperature (°C)" required>
                <input type="number" min="30" max="45" step="0.1" style={styles.input} value={form.temperature} onChange={(event) => update("temperature", event.target.value)} required />
              </Field>
              <Field label="Weight (kg)" required>
                <input type="number" min="1" max="500" step="0.01" style={styles.input} value={form.weight} onChange={(event) => update("weight", event.target.value)} required />
              </Field>
            </Section>
            <Section title="Social Classification" description="Record the classification assessed by the Medical Social Worker.">
              <Field label="Socio-economic classification" required wide>
                <select style={styles.input} value={form.socioeconomicClassification} onChange={(event) => update("socioeconomicClassification", event.target.value)} required>
                  <option value="">Select classification</option>
                  <option value="full_pay">Full Pay</option>
                  <option value="c1">C1</option>
                  <option value="c2">C2</option>
                  <option value="indigent">Indigent</option>
                </select>
              </Field>
            </Section>
            <Actions back={() => navigate(`/patients/${id}/intake/drug-history`)} saving={saving} label="Save & Continue to Consents" />
          </form>
        ) : (
          <form onSubmit={finalize} style={styles.form}>
            <section style={styles.section}>
              <div style={styles.sectionTitle}>Signed Documents</div>
              <div style={styles.sectionDescription}>Confirm each signed document is present in the patient's admission record.</div>
              <ConsentCheck id="service-agreement" label="Service Agreement signed" checked={form.serviceAgreementSigned} onChange={(checked) => update("serviceAgreementSigned", checked)} />
              <ConsentCheck id="pledge-commitment" label="Pledge of Commitment signed" checked={form.pledgeOfCommitmentSigned} onChange={(checked) => update("pledgeOfCommitmentSigned", checked)} />
              <ConsentCheck id="privacy-consent" label="Data Privacy Consent signed" checked={form.dataPrivacyConsentSigned} onChange={(checked) => update("dataPrivacyConsentSigned", checked)} />
            </section>
            <div style={styles.finalNotice}>Finalizing activates the patient record and creates a printable Certificate of Enrollment.</div>
            <Actions back={() => navigate(`/patients/${id}/intake/clinical-triage`)} saving={saving} label="Finalize & Enroll" />
          </form>
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

function Actions({ back, saving, label }) {
  return (
    <div style={styles.actions}>
      <button type="button" style={styles.secondaryButton} onClick={back}>Back</button>
      <button type="submit" style={styles.primaryButton} disabled={saving}>{saving ? "Saving…" : label}</button>
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
};
