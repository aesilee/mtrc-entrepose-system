import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import PatientWorkflowProgress from "../components/PatientWorkflowProgress.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";

const TODAY = new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  referralSource: "",
  referringOrganization: "",
  referringProfessional: "",
  referralDate: TODAY,
  reasonForReferral: "",
  presentingConcern: "",
  supportingDocuments: "",
  documentStatus: "pending",
  recommendedProgramId: "",
  referralPriority: "routine",
  typeOfService: "",
  admissionType: "",
  natureOfConfinement: "",
  attendingPhysician: "",
  priorRehabAdmissions: 0,
  numberOfEscapes: 0,
  priorDrugHospitalizations: 0,
  assistRiskLevel: "",
  ddeSeverityDiagnosis: "",
  medicalClearanceStatus: "",
  baselineDtDate: "",
  baselineDtReferenceNumber: "",
  baselineDtMeth: false,
  baselineDtThc: false,
  baselineDtOther: false,
  baselineDtFinding: "",
  hospitalizations: [],
};

const SOURCE_OPTIONS = [
  { value: "Voluntary", label: "Voluntary Walk-In" },
  { value: "Court-Mandated", label: "Court-Mandated" },
  { value: "LGU-Referred", label: "LGU-Referred (CADAC / MADAC / BADAC)" },
  { value: "Workplace", label: "Workplace-Referred" },
  { value: "NGO", label: "NGO-Referred" },
];

// DOH/DDB-standard service categories (IDADIN Part C)
const TYPE_OF_SERVICE_OPTIONS = [
  { value: "Outpatient Service (ENTREPOSE)", label: "Outpatient Service (ENTREPOSE)" },
  { value: "Inpatient / Residential Service", label: "Inpatient / Residential Service" },
  { value: "Aftercare Program (ACP / SIBOL)", label: "Aftercare Program (ACP / SIBOL)" },
];

// IDADIN admission category
const ADMISSION_TYPE_OPTIONS = [
  { value: "New Admission", label: "New Admission" },
  { value: "Readmission (Relapse)", label: "Readmission – Relapse" },
  { value: "Recommitment", label: "Recommitment" },
];

// RA 9165 confinement legal tracks (IDADIN Part C)
const NATURE_OF_CONFINEMENT_OPTIONS = [
  { value: "Plea Bargaining Agreement (Court-Mandated)", label: "Plea Bargaining Agreement (Court-Mandated)" },
  { value: "Compulsory Confinement under Section 61, RA 9165", label: "Compulsory Confinement — Sec. 61, RA 9165" },
  { value: "Compulsory Confinement under Section 62, RA 9165", label: "Compulsory Confinement — Sec. 62, RA 9165" },
  { value: "Voluntary with Court Order", label: "Voluntary with Court Order" },
  { value: "Voluntary without Court Order (Self-Referral)", label: "Voluntary without Court Order (Self-Referral)" },
  { value: "Arrested / Suspended Sentence", label: "Arrested / Suspended Sentence" },
];

const NATURE_OF_EVENT_OPTIONS = [
  { value: "", label: "Select event type" },
  { value: "Drug Overdose", label: "Drug Overdose" },
  { value: "Severe Intoxication / Poisoning", label: "Severe Intoxication / Poisoning" },
  { value: "Adverse Drug Reaction", label: "Adverse Drug Reaction" },
];


const STATUS_LABELS = {
  draft: "Draft",
  ready_for_intake: "Admission history complete",
  returned_for_correction: "Returned for correction",
  intake_in_progress: "Initial Intake in progress",
  intake_completed: "Initial Intake completed",
};

function toInputDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function toForm(referral) {
  if (!referral) return { ...EMPTY_FORM };
  return {
    referralSource: referral.referral_source || "",
    referringOrganization: referral.referring_organization || "",
    referringProfessional: referral.referring_professional || "",
    referralDate: toInputDate(referral.referral_date),
    reasonForReferral: referral.reason_for_referral || "",
    presentingConcern: referral.presenting_concern || "",
    supportingDocuments: referral.supporting_documents || "",
    documentStatus: referral.document_status || "pending",
    recommendedProgramId: referral.recommended_program_id || "",
    referralPriority: referral.referral_priority || "routine",
    typeOfService: referral.type_of_service || "",
    admissionType: referral.admission_type || "",
    natureOfConfinement: referral.nature_of_confinement || "",
    attendingPhysician: referral.attending_physician || "",
    priorRehabAdmissions: referral.prior_rehab_admissions || 0,
    numberOfEscapes: referral.number_of_escapes || 0,
    priorDrugHospitalizations: referral.prior_drug_hospitalizations || 0,
    assistRiskLevel: referral.assist_risk_level || "",
    ddeSeverityDiagnosis: referral.dde_severity_diagnosis || "",
    medicalClearanceStatus: referral.medical_clearance_status || "",
    baselineDtDate: toInputDate(referral.baseline_dt_date),
    baselineDtReferenceNumber: referral.baseline_dt_reference_number || "",
    baselineDtMeth: Boolean(referral.baseline_dt_meth),
    baselineDtThc: Boolean(referral.baseline_dt_thc),
    baselineDtOther: Boolean(referral.baseline_dt_other),
    baselineDtFinding: referral.baseline_dt_finding || "",
    hospitalizations: Array.isArray(referral.hospitalizations) ? referral.hospitalizations : [],
  };
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReferralInformation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = ["admitting", "ict_admin"].includes(user.role);

  const [patient, setPatient] = useState(null);
  const [referral, setReferral] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);
  const ddeFileInputRef = useRef(null);
  const xrayFileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.get(`/referrals/patient/${id}`),
      api.get("/programs"),
      api.get(`/referrals/patient/${id}/documents`),
    ])
      .then(([referralResponse, programsResponse, documentsResponse]) => {
        if (!active) return;
        const loadedReferral = referralResponse.data.referral;
        setPatient(referralResponse.data.patient);
        setReferral(loadedReferral);
        setForm(toForm(loadedReferral));
        setPrograms(programsResponse.data.programs || []);
        setDocuments(documentsResponse.data.documents || []);
        setEditing(canEdit && (!loadedReferral || ["draft", "returned_for_correction"].includes(loadedReferral.status)));
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.response?.data?.message || "Could not load referral information.");
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id, canEdit]);

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setError("");
    setMessage("");
  }

  async function refreshDocuments() {
    const [{ data: documentData }, { data: referralData }] = await Promise.all([
      api.get(`/referrals/patient/${id}/documents`),
      api.get(`/referrals/patient/${id}`),
    ]);
    setDocuments(documentData.documents || []);
    setReferral(referralData.referral);
    setForm((previous) => ({
      ...previous,
      documentStatus: referralData.referral?.document_status || "pending",
    }));
  }

  async function uploadDocuments(event, documentType = "other") {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length) return;

    const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
    const invalidType = selected.find((file) => !allowedTypes.has(file.type));
    const oversized = selected.find((file) => file.size > 10 * 1024 * 1024);
    if (invalidType) {
      setError(`\"${invalidType.name}\" is not a PDF, JPG, or PNG file.`);
      return;
    }
    if (oversized) {
      setError(`\"${oversized.name}\" is larger than 10 MB.`);
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");
    try {
      for (const file of selected) {
        await api.post(`/referrals/patient/${id}/documents`, file, {
          headers: {
            "Content-Type": file.type,
            "X-File-Name": encodeURIComponent(file.name),
            "X-Document-Type": documentType,
          },
        });
      }
      await refreshDocuments();
      setMessage(`${selected.length} referral document${selected.length === 1 ? "" : "s"} uploaded.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not upload the referral document.");
      await refreshDocuments().catch(() => {});
    } finally {
      setUploading(false);
    }
  }

  async function downloadDocument(document) {
    setError("");
    try {
      const response = await api.get(`/referrals/patient/${id}/documents/${document.id}`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = document.original_name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not download the referral document.");
    }
  }

  async function removeDocument(document) {
    if (!window.confirm(`Remove \"${document.original_name}\" from this referral?`)) return;
    setError("");
    setMessage("");
    try {
      const { data } = await api.delete(`/referrals/patient/${id}/documents/${document.id}`);
      await refreshDocuments();
      setMessage(data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not remove the referral document.");
    }
  }

  async function saveDraft() {
    const payload = {
      ...form,
      patientId: id,
      priorRehabAdmissions: Number(form.priorRehabAdmissions),
      numberOfEscapes: Number(form.numberOfEscapes),
      priorDrugHospitalizations: Number(form.priorDrugHospitalizations),
      hospitalizations: form.hospitalizations,
    };

    setSaving(true);
    setError("");
    try {
      const { data } = await api.put(`/referrals/patient/${id}`, payload);
      setReferral(data.referral);
      setEditing(false);
      if (!submitted) setMessage("Draft saved successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not save draft.");
    } finally {
      setSaving(false);
    }
  }

  async function submitReferral(event) {
    event.preventDefault();
    const payload = {
      ...form,
      patientId: id,
      priorRehabAdmissions: Number(form.priorRehabAdmissions),
      numberOfEscapes: Number(form.numberOfEscapes),
      priorDrugHospitalizations: Number(form.priorDrugHospitalizations),
      hospitalizations: form.hospitalizations,
    };

    setSaving(true);
    setError("");
    try {
      const { data } = await api.post(`/referrals/patient/${id}/submit`, payload);
      setReferral(data.referral);
      setEditing(false);
      setMessage("Admission history saved successfully.");
      setTimeout(() => navigate(`/patients/${id}/intake/drug-history`), 800);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not save admission history.");
    } finally {
      setSaving(false);
    }
  }

  function cancelEditing() {
    if (referral) {
      setForm(toForm(referral));
      setEditing(false);
    } else {
      navigate("/patients");
    }
    setError("");
    setMessage("");
  }

  if (loading) {
    return (
      <AppShell title="Admission & Confinement History" description="Loading the IDADIN Part C record…">
        <div style={styles.loading}>Loading referral information…</div>
      </AppShell>
    );
  }

  if (!patient) {
    return (
      <AppShell title="Admission & Confinement History" description="Admission record unavailable.">
        <div style={styles.error}>{error || "Patient not found."}</div>
      </AppShell>
    );
  }

  const submitted = referral?.status === "ready_for_intake";
  const locked = ["intake_in_progress", "intake_completed"].includes(referral?.status);
  const statusLabel = STATUS_LABELS[referral?.status] || "Not started";

  return (
    <AppShell title="Admission & Confinement History (IDADIN Part C)" description="Record referral, admission, confinement, and prior-treatment details.">
      <div style={styles.page}>
        <PatientWorkflowProgress currentStep={2} completedThrough={1} caseType={patient.case_type} />

        <div style={styles.patientStrip}>
          <span style={styles.avatar}>{patient.full_name?.charAt(0) || "P"}</span>
          <strong>{patient.full_name}</strong>
          <span style={styles.divider} />
          <span style={styles.patientCode}>{patient.pwud_code || patient.patient_code}</span>
          <span style={{ ...styles.statusBadge, ...(submitted ? styles.statusReady : styles.statusDraft) }}>
            {statusLabel}
          </span>
        </div>

        {message && <div role="status" style={styles.success}>{message}</div>}
        {error && <div role="alert" style={styles.error}>{error}</div>}

        {submitted && !editing && (
          <section style={styles.handoffCard}>
            <div>
              <div style={styles.handoffTitle}>Admission history completed</div>
              <div style={styles.handoffText}>
                Demographics and admission history are complete. Continue with the patient's IDADIN drug use history.
              </div>
            </div>
            <div style={styles.handoffMeta}>
              <span><strong>Submitted:</strong> {formatDateTime(referral.submitted_at)}</span>
              <span><strong>Next step:</strong> Drug Use History</span>
            </div>
          </section>
        )}

        <fieldset disabled={!editing || !canEdit || locked} style={styles.fieldset}>
          <Section title="Referral Source & Priority" description="Identify where the referral came from, the referring party, and the urgency level.">
            <Field label="Referral source" required>
              <select style={styles.input} value={form.referralSource} onChange={(event) => update("referralSource", event.target.value)} required>
                <option value="">Select referral source</option>
                {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Referring organization" required>
              <input style={styles.input} maxLength={150} value={form.referringOrganization} onChange={(event) => update("referringOrganization", event.target.value)} placeholder="e.g. Legazpi City CADAC, RTC Branch 10" required />
            </Field>
            <Field label="Referring physician / professional">
              <input style={styles.input} maxLength={150} value={form.referringProfessional} onChange={(event) => update("referringProfessional", event.target.value)} placeholder="Name of judge, social worker, or officer (or N/A)" />
            </Field>
            <Field label="Referral date" required>
              <input type="date" max={TODAY} style={styles.input} value={form.referralDate} onChange={(event) => update("referralDate", event.target.value)} required />
            </Field>
            <Field label="Referral priority" required>
              <select style={styles.input} value={form.referralPriority} onChange={(event) => update("referralPriority", event.target.value)} required>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency / immediate review</option>
              </select>
            </Field>
          </Section>

          {form.referralPriority === "emergency" && (
            <div style={styles.emergencyNotice}>
              Follow the facility's emergency protocol immediately. Saving this record does not replace direct clinical escalation.
            </div>
          )}

          <Section title="Referral Details" description="Record the administrative reason and the concern reported by the referral source.">
            <Field label="Reason for referral" required wide>
              <textarea rows={4} style={styles.textarea} value={form.reasonForReferral} onChange={(event) => update("reasonForReferral", event.target.value)} required />
            </Field>
            <Field label="Presenting concern" required wide>
              <textarea rows={4} style={styles.textarea} value={form.presentingConcern} onChange={(event) => update("presentingConcern", event.target.value)} required />
            </Field>
            <Field label="Recommended service (not a final placement decision)">
              <select style={styles.input} value={form.recommendedProgramId} onChange={(event) => update("recommendedProgramId", event.target.value)}>
                <option value="">No service recommendation</option>
                {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
              </select>
            </Field>
          </Section>

          <Section title="Admission & Confinement (IDADIN Part C)" description="Record the DOH-standard admission category, legal confinement track, and prior treatment history.">
            <Field label="Admission type" required>
              <select style={styles.input} value={form.admissionType} onChange={(event) => update("admissionType", event.target.value)} required>
                <option value="">Select admission type</option>
                {ADMISSION_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Type of service" required>
              <select style={styles.input} value={form.typeOfService} onChange={(event) => update("typeOfService", event.target.value)} required>
                <option value="">Select type of service</option>
                {TYPE_OF_SERVICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Nature of confinement" required>
              <select style={styles.input} value={form.natureOfConfinement} onChange={(event) => update("natureOfConfinement", event.target.value)} required>
                <option value="">Select nature of confinement</option>
                {NATURE_OF_CONFINEMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="ASSIST Screening Risk Level">
              <select style={styles.input} value={form.assistRiskLevel} onChange={(event) => update("assistRiskLevel", event.target.value)}>
                <option value="">Select risk level</option>
                <option value="Low Risk">Low Risk</option>
                <option value="Moderate Risk">Moderate Risk</option>
                <option value="High Risk">High Risk</option>
                <option value="Pre-Screened by LGU / Not Administered">Pre-Screened by LGU / Not Administered</option>
              </select>
            </Field>
            <Field label="DDE Clinical Dependency Severity">
              <select style={styles.input} value={form.ddeSeverityDiagnosis} onChange={(event) => update("ddeSeverityDiagnosis", event.target.value)}>
                <option value="">Select severity diagnosis</option>
                <option value="Mild Dependence">Mild Dependence (LGU Track)</option>
                <option value="Moderate Dependence">Moderate Dependence (Outpatient Track)</option>
                <option value="Severe Dependence">Severe Dependence (Inpatient Track)</option>
              </select>
            </Field>
            {form.ddeSeverityDiagnosis === "Severe Dependence" && form.typeOfService.includes("Outpatient") && (
              <div style={{ ...styles.noticeCard, gridColumn: "1 / -1" }}>
                <strong>Clinical Advisory: Severe Dependence in Outpatient Setting</strong>
                <p style={{ margin: "4px 0 0", fontSize: 12 }}>
                  Standard protocol recommends Inpatient/Residential admission for Severe Dependence. Ensure you have a court order or documented clinical override authorizing outpatient enrollment for this client.
                </p>
              </div>
            )}

            <Field label="Attending DDE physician">
              <input style={styles.input} maxLength={255} value={form.attendingPhysician} onChange={(event) => update("attendingPhysician", event.target.value)} placeholder="DOH-accredited Drug Dependency Examiner" />
            </Field>
            <Field label="Prior rehabilitation admissions">
              <input type="number" min="0" max="999" step="1" style={styles.input} value={form.priorRehabAdmissions} onChange={(event) => update("priorRehabAdmissions", event.target.value)} />
            </Field>
            <Field label="Number of escapes from any facility">
              <input type="number" min="0" max="999" step="1" style={styles.input} value={form.numberOfEscapes} onChange={(event) => update("numberOfEscapes", event.target.value)} />
            </Field>
          </Section>

          <section style={{...styles.section, gridColumn: "1 / -1"}}>
            <div style={styles.sectionTitle}>Drug-Related Hospitalization History</div>
            <div style={styles.sectionDescription}>List prior medical hospitalizations resulting from substance use. Leave empty if none.</div>
            <HospitalizationTable hospitalizations={form.hospitalizations} onChange={(h) => update("hospitalizations", h)} disabled={!editing || !canEdit || locked} />
          </section>

          <Section title="Baseline Urine Drug Test (Form 11 Initial Entry)" description="Record the client's initial screening required for the 0-60 day surveillance phase.">
            <Field label="Drug test date" required>
              <input type="date" max={TODAY} style={styles.input} value={form.baselineDtDate} onChange={(event) => update("baselineDtDate", event.target.value)} required />
            </Field>
            <Field label="Laboratory specimen / reference number">
              <input style={styles.input} maxLength={100} value={form.baselineDtReferenceNumber} onChange={(event) => update("baselineDtReferenceNumber", event.target.value)} placeholder="e.g. DT-2026-001" />
            </Field>
            <Field label="Tested Substances" required>
              <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={form.baselineDtMeth} onChange={(e) => update("baselineDtMeth", e.target.checked)} />
                  Methamphetamine (Shabu)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={form.baselineDtThc} onChange={(e) => update("baselineDtThc", e.target.checked)} />
                  THC (Marijuana)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={form.baselineDtOther} onChange={(e) => update("baselineDtOther", e.target.checked)} />
                  Other
                </label>
              </div>
            </Field>
            <Field label="Overall screening finding" required>
              <select style={styles.input} value={form.baselineDtFinding} onChange={(event) => update("baselineDtFinding", event.target.value)} required>
                <option value="">Select finding</option>
                <option value="Positive">Positive</option>
                <option value="Negative">Negative</option>
              </select>
            </Field>
          </Section>

        </fieldset>

        <section style={styles.section}>
          <div style={styles.sectionTitle}>Admission Documents</div>
          <div style={styles.sectionDescription}>
            Upload the Court Order or LGU Letter and the official Drug Dependency Examination (DDE) result when available.
          </div>

          <div style={styles.documentStatusRow}>
            <label style={{ ...styles.label, flex: 1 }}>
              <span>Document status</span>
              <select
                style={styles.input}
                value={documents.length ? "uploaded" : form.documentStatus}
                onChange={(event) => update("documentStatus", event.target.value)}
                disabled={!editing || !canEdit || locked || documents.length > 0}
              >
                <option value="pending">Not specified</option>
                <option value="none_received">No documents received</option>
                <option value="paper_copy">Paper copy is in the physical chart</option>
                {documents.length > 0 && <option value="uploaded">Uploaded electronically</option>}
              </select>
            </label>
            <label style={{ ...styles.label, flex: 1 }}>
              <span>Medical clearance status</span>
              <select style={styles.input} value={form.medicalClearanceStatus} onChange={(event) => update("medicalClearanceStatus", event.target.value)} disabled={!editing || !canEdit || locked}>
                <option value="">Select clearance status</option>
                <option value="Verified Normal / Clear">Verified Normal / Clear</option>
                <option value="Under Evaluation">Under Evaluation (Needs clearance)</option>
                <option value="Pending Result">Pending Result</option>
              </select>
            </label>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={(event) => uploadDocuments(event, "court_order_lgu_letter")}
            disabled={!editing || !canEdit || locked || uploading}
            style={styles.hiddenFileInput}
          />
          <button
            type="button"
            style={{ ...styles.uploadBox, ...((!editing || !canEdit || locked || uploading) ? styles.uploadBoxDisabled : {}) }}
            onClick={() => fileInputRef.current?.click()}
            disabled={!editing || !canEdit || locked || uploading}
          >
            <span style={styles.uploadIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V7m0 0-3 3m3-3 3 3" /><path d="M7 18H6a4 4 0 0 1-.7-7.94A7 7 0 0 1 18.9 9.3 4.5 4.5 0 0 1 18.5 18H17" /></svg>
            </span>
            <span style={styles.uploadText}>
              <strong>{uploading ? "Uploading document…" : "Upload Court Order / LGU Letter"}</strong>
              <small>PDF, JPG, or PNG — maximum 10 MB each</small>
            </span>
          </button>

          <input
            ref={ddeFileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={(event) => uploadDocuments(event, "dde_result")}
            disabled={!editing || !canEdit || locked || uploading}
            style={styles.hiddenFileInput}
          />
          <button
            type="button"
            style={{ ...styles.uploadBox, marginTop: 10, ...((!editing || !canEdit || locked || uploading) ? styles.uploadBoxDisabled : {}) }}
            onClick={() => ddeFileInputRef.current?.click()}
            disabled={!editing || !canEdit || locked || uploading}
          >
            <span style={styles.uploadIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V7m0 0-3 3m3-3 3 3" /><path d="M7 18H6a4 4 0 0 1-.7-7.94A7 7 0 0 1 18.9 9.3 4.5 4.5 0 0 1 18.5 18H17" /></svg>
            </span>
            <span style={styles.uploadText}>
              <strong>{uploading ? "Uploading document…" : "Upload Official DDE Result"}</strong>
              <small>PDF, JPG, or PNG — maximum 10 MB</small>
            </span>
          </button>

          <input
            ref={xrayFileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={(event) => uploadDocuments(event, "chest_xray_medical_clearance")}
            disabled={!editing || !canEdit || locked || uploading}
            style={styles.hiddenFileInput}
          />
          <button
            type="button"
            style={{ ...styles.uploadBox, marginTop: 10, ...((!editing || !canEdit || locked || uploading) ? styles.uploadBoxDisabled : {}) }}
            onClick={() => xrayFileInputRef.current?.click()}
            disabled={!editing || !canEdit || locked || uploading}
          >
            <span style={styles.uploadIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V7m0 0-3 3m3-3 3 3" /><path d="M7 18H6a4 4 0 0 1-.7-7.94A7 7 0 0 1 18.9 9.3 4.5 4.5 0 0 1 18.5 18H17" /></svg>
            </span>
            <span style={styles.uploadText}>
              <strong>{uploading ? "Uploading document…" : "Upload Chest X-Ray / Medical Clearance"}</strong>
              <small>Valid within last 3 months (PDF, JPG, PNG)</small>
            </span>
          </button>

          {documents.length > 0 && (
            <div style={styles.documentList}>
              {documents.map((document) => (
                <div key={document.id} style={styles.documentItem}>
                  <span style={styles.fileType}>{document.mime_type === "application/pdf" ? "PDF" : "IMG"}</span>
                  <span style={styles.documentInfo}>
                    <strong style={styles.documentName}>{document.original_name}</strong>
                    <small style={styles.documentMeta}>
                      {document.document_type === "dde_result" ? "DDE Result" : document.document_type === "chest_xray_medical_clearance" ? "Chest X-Ray / Medical Clearance" : document.document_type === "court_order_lgu_letter" ? "Court Order / LGU Letter" : "Other Document"} · {formatFileSize(document.file_size)} · Uploaded {formatDateTime(document.created_at)}
                      {document.uploaded_by_name ? ` by ${document.uploaded_by_name}` : ""}
                    </small>
                  </span>
                  <button type="button" style={styles.documentButton} onClick={() => downloadDocument(document)}>Download</button>
                  {canEdit && editing && !locked && (
                    <button type="button" style={{ ...styles.documentButton, color: "var(--color-danger)" }} onClick={() => removeDocument(document)}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}


          <label style={{ ...styles.label, marginTop: 16 }}>
            <span>Document notes or approved storage references</span>
            <textarea
              rows={3}
              style={styles.textarea}
              value={form.supportingDocuments}
              onChange={(event) => update("supportingDocuments", event.target.value)}
              disabled={!editing || !canEdit || locked}
              placeholder="Example: Original referral letter is stored in the physical chart"
            />
          </label>
        </section>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <button type="button" style={styles.secondaryButton} onClick={() => navigate(`/patients/${id}/demographics`)}>
            ← Back to Demographics
          </button>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" style={styles.secondaryButton} onClick={() => navigate(`/patients/${id}`)}>View Patient Profile</button>
            {editing && canEdit ? (
              <>
                <button type="button" style={styles.secondaryButton} onClick={cancelEditing}>Cancel</button>
                {!submitted && (
                  <button type="button" style={styles.secondaryButton} onClick={saveDraft} disabled={saving}>
                    {saving ? "Saving…" : "Save Draft"}
                  </button>
                )}
                <button type="button" style={styles.primaryButton} onClick={submitReferral} disabled={saving}>
                  {saving ? "Saving…" : submitted ? "Save Changes" : "Save Admission & Continue to Drug Use History"}
                </button>
              </>
            ) : (
              <>
                {canEdit && !locked && (
                  <button type="button" style={styles.secondaryButton} onClick={() => setEditing(true)}>Edit Referral</button>
                )}
                <button type="button" style={styles.primaryButton} onClick={() => submitted ? navigate(`/patients/${id}/intake/drug-history`) : navigate("/patients")}>
                  {submitted ? "Continue to Drug Use History →" : "Return to Patients"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
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

function Field({ label, required, wide, full, children }) {
  const className = [
    "registration-field",
    wide ? "registration-field--wide" : "",
    full ? "registration-field--full" : "",
  ].filter(Boolean).join(" ");

  return (
    <label className={className} style={styles.label}>
      <span>{label} {required && <span style={styles.required}>*</span>}</span>
      {children}
    </label>
  );
}

function HospitalizationTable({ hospitalizations, onChange, disabled }) {
  function addRow() {
    onChange([...hospitalizations, { hospitalName: "", dateAdmitted: "", natureOfEvent: "" }]);
  }

  function updateRow(index, field, value) {
    const list = [...hospitalizations];
    list[index][field] = value;
    onChange(list);
  }

  function removeRow(index) {
    onChange(hospitalizations.filter((_, i) => i !== index));
  }

  return (
    <div>
      {hospitalizations.length === 0 ? (
        <div style={styles.emptyTable}>No prior drug-related hospitalizations recorded.</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Hospital / Facility Name</th>
              <th style={styles.th}>Date Admitted</th>
              <th style={styles.th}>Nature of Medical Event</th>
              <th style={styles.thAction}></th>
            </tr>
          </thead>
          <tbody>
            {hospitalizations.map((h, i) => (
              <tr key={i}>
                <td style={styles.td}>
                  <input
                    style={styles.input}
                    value={h.hospitalName}
                    onChange={(e) => updateRow(i, "hospitalName", e.target.value)}
                    disabled={disabled}
                    placeholder="Enter facility name"
                  />
                </td>
                <td style={styles.td}>
                  <input
                    type="date"
                    style={styles.input}
                    value={h.dateAdmitted ? String(h.dateAdmitted).slice(0, 10) : ""}
                    onChange={(e) => updateRow(i, "dateAdmitted", e.target.value)}
                    disabled={disabled}
                    max={TODAY}
                  />
                </td>
                <td style={styles.td}>
                  <select
                    style={styles.input}
                    value={h.natureOfEvent || ""}
                    onChange={(e) => updateRow(i, "natureOfEvent", e.target.value)}
                    disabled={disabled}
                  >
                    {NATURE_OF_EVENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </td>
                <td style={styles.tdAction}>
                  {!disabled && (
                    <button type="button" style={styles.removeBtn} onClick={() => removeRow(i)}>
                      &times;
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!disabled && (
        <button type="button" style={styles.addBtn} onClick={addRow}>
          + Add Hospitalization
        </button>
      )}
    </div>
  );
}

const styles = {
  page: { display: "flex", flexDirection: "column", gap: 16, maxWidth: 1400, width: "100%", margin: "0 auto" },
  loading: { padding: 30, color: "var(--color-text-muted)" },
  patientStrip: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: 13 },
  avatar: { width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", fontWeight: 800 },
  divider: { width: 1, height: 24, background: "var(--color-border)" },
  patientCode: { color: "var(--color-text-muted)" },
  statusBadge: { marginLeft: "auto", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 },
  statusReady: { background: "var(--color-warning-tint)", color: "var(--color-warning)" },
  statusDraft: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)" },
  success: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", border: "1px solid #bdd7c7", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 13 },
  error: { background: "var(--color-danger-tint)", color: "var(--color-danger)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 13 },
  handoffCard: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, padding: 16, background: "var(--color-primary-tint)", border: "1px solid #bdd7c7", borderRadius: "var(--radius-md)" },
  handoffTitle: { color: "var(--color-primary-dark)", fontWeight: 800, fontSize: 14 },
  handoffText: { color: "var(--color-text-muted)", fontSize: 12, lineHeight: 1.5, marginTop: 3 },
  handoffMeta: { display: "flex", flexDirection: "column", gap: 4, color: "var(--color-text)", fontSize: 12, whiteSpace: "nowrap" },
  fieldset: { display: "contents", border: 0, padding: 0, margin: 0 },
  section: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 20 },
  sectionTitle: { color: "var(--color-primary-dark)", fontSize: 15, fontWeight: 800 },
  sectionDescription: { color: "var(--color-text-muted)", fontSize: 12, lineHeight: 1.5, marginTop: 4, marginBottom: 16 },
  grid: { display: "grid", gap: 16 },
  label: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0, color: "var(--color-text)", fontSize: 13, fontWeight: 600 },
  required: { color: "var(--color-danger)" },
  input: { width: "100%", padding: "10px 11px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)", color: "var(--color-text)", fontSize: 13 },
  textarea: { width: "100%", resize: "vertical", padding: "10px 11px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)", color: "var(--color-text)", fontFamily: "inherit", fontSize: 13, lineHeight: 1.45 },
  emergencyNotice: { padding: "11px 14px", borderRadius: "var(--radius-sm)", background: "var(--color-danger-tint)", color: "var(--color-danger)", border: "1px solid #efc4c2", fontSize: 12, fontWeight: 600 },
  documentStatusRow: { display: "grid", gridTemplateColumns: "minmax(240px, 420px)", marginBottom: 14 },
  hiddenFileInput: { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" },
  uploadBox: { display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 16px", border: "1px dashed #b8c9bf", borderRadius: "var(--radius-md)", background: "var(--color-surface)", color: "var(--color-text)", textAlign: "left" },
  uploadBoxDisabled: { opacity: 0.58, cursor: "not-allowed" },
  uploadIcon: { width: 38, height: 38, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)" },
  uploadText: { display: "flex", flexDirection: "column", gap: 3 },
  documentList: { display: "flex", flexDirection: "column", gap: 8, marginTop: 12 },
  documentItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-bg)" },
  fileType: { minWidth: 36, padding: "4px 6px", borderRadius: 4, background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", fontSize: 10, fontWeight: 800, textAlign: "center" },
  documentInfo: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 },
  documentName: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 },
  documentMeta: { color: "var(--color-text-muted)", fontSize: 10 },
  documentButton: { border: 0, background: "transparent", color: "var(--color-primary-dark)", fontSize: 11, fontWeight: 700, padding: "6px 7px" },
  actions: { display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" },
  secondaryButton: { padding: "10px 16px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)", color: "var(--color-text)", fontSize: 13, fontWeight: 700 },
  primaryButton: { padding: "10px 18px", border: 0, borderRadius: "var(--radius-sm)", background: "var(--color-primary)", color: "#fff", fontSize: 13, fontWeight: 800 },
  emptyTable: { padding: 12, fontSize: 13, color: "var(--color-text-muted)", fontStyle: "italic", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-sm)" },
  table: { width: "100%", borderCollapse: "collapse", marginBottom: 12 },
  th: { textAlign: "left", padding: "8px 10px", fontSize: 12, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", fontWeight: 700 },
  td: { padding: "8px 10px", borderBottom: "1px solid var(--color-border)" },
  thAction: { width: 40, borderBottom: "1px solid var(--color-border)" },
  tdAction: { width: 40, padding: "8px 0", borderBottom: "1px solid var(--color-border)", textAlign: "center" },
  removeBtn: { border: "none", background: "none", color: "var(--color-danger)", fontSize: 20, cursor: "pointer", padding: 0 },
  addBtn: { border: "1px dashed var(--color-primary)", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", padding: "8px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 700, cursor: "pointer" },
};
