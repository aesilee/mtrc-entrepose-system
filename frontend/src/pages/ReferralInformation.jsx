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
  admissionType: "",
  natureOfConfinement: "",
  priorRehabAdmissions: 0,
  numberOfEscapes: 0,
  priorDrugHospitalizations: 0,
};

const SOURCE_OPTIONS = [
  { value: "physician", label: "Physician" },
  { value: "hospital", label: "Hospital" },
  { value: "community", label: "Community organization" },
  { value: "self_referral", label: "Self-referral / voluntary walk-in" },
  { value: "family", label: "Family" },
  { value: "court", label: "Court or legal referral" },
  { value: "other", label: "Other" },
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
    admissionType: referral.admission_type || "",
    natureOfConfinement: referral.nature_of_confinement || "",
    priorRehabAdmissions: referral.prior_rehab_admissions ?? 0,
    numberOfEscapes: referral.number_of_escapes ?? 0,
    priorDrugHospitalizations: referral.prior_drug_hospitalizations ?? 0,
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
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.put(`/referrals/patient/${id}`, form);
      setReferral(data.referral);
      setForm(toForm(data.referral));
      setMessage(data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not save the referral draft.");
    } finally {
      setSaving(false);
    }
  }

  async function submitReferral() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.post(`/referrals/patient/${id}/submit`, form);
      setReferral(data.referral);
      setForm(toForm(data.referral));
      navigate(`/patients/${id}/intake/drug-history`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not submit the referral.");
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
        <PatientWorkflowProgress currentStep={2} completedThrough={1} />

        <div style={styles.patientStrip}>
          <span style={styles.avatar}>{patient.full_name?.charAt(0) || "P"}</span>
          <strong>{patient.full_name}</strong>
          <span style={styles.divider} />
          <span style={styles.patientCode}>{patient.patient_code}</span>
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
          <Section title="Referral Source" description="Identify where the referral came from and when it was received.">
            <Field label="Referral source" required>
              <select style={styles.input} value={form.referralSource} onChange={(event) => update("referralSource", event.target.value)} required>
                <option value="">Select referral source</option>
                {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label={form.referralSource === "other" ? "Specify referral source" : "Referring organization"} required={form.referralSource === "other"}>
              <input style={styles.input} maxLength={150} value={form.referringOrganization} onChange={(event) => update("referringOrganization", event.target.value)} required={form.referralSource === "other"} />
            </Field>
            <Field label="Referring physician or professional">
              <input style={styles.input} maxLength={150} value={form.referringProfessional} onChange={(event) => update("referringProfessional", event.target.value)} />
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

          <Section title="Admission & Confinement" description="Record the IDADIN Part C admission classification and prior treatment history.">
            <Field label="Admission type" required>
              <select style={styles.input} value={form.admissionType} onChange={(event) => update("admissionType", event.target.value)} required>
                <option value="">Select admission type</option>
                <option value="voluntary">Voluntary</option>
                <option value="court_mandated">Court-Mandated</option>
                <option value="lgu_referred">LGU-Referred</option>
              </select>
            </Field>
            <Field label="Nature of confinement">
              <select style={styles.input} value={form.natureOfConfinement} onChange={(event) => update("natureOfConfinement", event.target.value)}>
                <option value="">Not applicable / select</option>
                <option value="arrested">Arrested</option>
                <option value="suspended_sentence">Suspended Sentence</option>
                <option value="compulsory_ra_9165">Compulsory Confinement (RA 9165)</option>
              </select>
            </Field>
            <Field label="Prior rehabilitation admissions">
              <input type="number" min="0" max="999" step="1" style={styles.input} value={form.priorRehabAdmissions} onChange={(event) => update("priorRehabAdmissions", event.target.value)} />
            </Field>
            <Field label="Number of escapes">
              <input type="number" min="0" max="999" step="1" style={styles.input} value={form.numberOfEscapes} onChange={(event) => update("numberOfEscapes", event.target.value)} />
            </Field>
            <Field label="Prior drug-related hospitalizations">
              <input type="number" min="0" max="999" step="1" style={styles.input} value={form.priorDrugHospitalizations} onChange={(event) => update("priorDrugHospitalizations", event.target.value)} />
            </Field>
          </Section>

        </fieldset>

        <section style={styles.section}>
          <div style={styles.sectionTitle}>Admission Documents</div>
          <div style={styles.sectionDescription}>
            Upload the Court Order or LGU Letter and the official Drug Dependency Examination (DDE) result when available.
          </div>

          <div style={styles.documentStatusRow}>
            <label style={styles.label}>
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
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V7m0 0-3 3m3-3 3 3" />
                <path d="M7 18H6a4 4 0 0 1-.7-7.94A7 7 0 0 1 18.9 9.3 4.5 4.5 0 0 1 18.5 18H17" />
              </svg>
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
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V7m0 0-3 3m3-3 3 3" />
                <path d="M7 18H6a4 4 0 0 1-.7-7.94A7 7 0 0 1 18.9 9.3 4.5 4.5 0 0 1 18.5 18H17" />
              </svg>
            </span>
            <span style={styles.uploadText}>
              <strong>{uploading ? "Uploading document…" : "Upload Official DDE Result"}</strong>
              <small>PDF, JPG, or PNG — maximum 10 MB</small>
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
                      {document.document_type === "dde_result" ? "DDE Result" : document.document_type === "court_order_lgu_letter" ? "Court Order / LGU Letter" : "Other Document"} · {formatFileSize(document.file_size)} · Uploaded {formatDateTime(document.created_at)}
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

        <div style={styles.actions}>
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
                  {saving ? "Saving…" : submitted ? "Save Admission History Changes" : "Save & Continue to Drug Use History"}
              </button>
            </>
          ) : (
            <>
              {canEdit && !locked && (
                <button type="button" style={styles.secondaryButton} onClick={() => setEditing(true)}>Edit Referral</button>
              )}
              <button type="button" style={styles.primaryButton} onClick={() => submitted ? navigate(`/patients/${id}/intake/drug-history`) : navigate("/patients")}>
                {submitted ? "Continue to Drug Use History" : "Return to Patients"}
              </button>
            </>
          )}
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
};
