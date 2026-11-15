import { useEffect, useState } from "react";
import api from "../api/axios.js";

const SESSION_TYPE_OPTIONS = [
  { value: "CBT_GROUP",             label: "CBT Group Session" },
  { value: "PSYCHO_EDUCATION",      label: "Psycho-Education / PE Meeting" },
  { value: "SHGM",                  label: "Self-Help Group Meeting" },
  { value: "INDIVIDUAL_COUNSELING", label: "Individual Counseling" },
  { value: "CONJOINT_FAMILY",       label: "Conjoint / Family Session" },
];

export default function ProgressNoteModal({ patientId: initialPatientId, note, onClose, onSaved }) {
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId || "");
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({
    sessionDate: note?.session_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    sessionType: note?.session_type || "",
    relapseRisk: note?.relapse_risk || "",
    staffRiskAssessment: note?.staff_risk_assessment || "",
    observation: note?.observation || "",
    interventionProvided: note?.intervention_provided || "",
    patientResponse: note?.patient_response || "",
    recommendations: note?.recommendations || "",
    nextFollowUpDate: note?.next_follow_up_date?.slice(0, 10) || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialPatientId) {
      api.get("/patients").then(({ data }) => {
        const pts = data.patients || [];
        setPatients(pts);
        if (pts.length && !selectedPatientId) {
          setSelectedPatientId(pts[0].id);
        }
      });
    }
  }, [initialPatientId]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const targetPatientId = initialPatientId || selectedPatientId;
    if (!targetPatientId) {
      setError("Please select a patient.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (note) {
        await api.put(`/progress-notes/${note.id}`, form);
      } else {
        await api.post(`/patients/${targetPatientId}/progress-notes`, form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save the progress note.");
    } finally {
      setSaving(false);
    }
  }

  const selfRiskStyle =
    form.relapseRisk === "USED"
      ? { background: "#FEE2E2", color: "#991B1B", borderColor: "#FCA5A5" }
      : form.relapseRisk === "NEARLY_USED"
      ? { background: "#FFEDD5", color: "#9A3412", borderColor: "#FDBA74" }
      : form.relapseRisk === "AT_RISK"
      ? { background: "#FEF3C7", color: "#92400E", borderColor: "#FCD34D" }
      : { background: "#ECFDF5", color: "#065F46", borderColor: "#A7F3D0" };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>{note ? "Edit Progress Note" : "Add Progress Note"}</div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.body}>
          {error && <div style={styles.error}>{error}</div>}
          {!initialPatientId && (
            <label style={styles.label}>
              Patient
              <select
                style={styles.input}
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                required
              >
                <option value="">Select a patient…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name} ({p.patient_code})</option>
                ))}
              </select>
            </label>
          )}
          <div style={styles.grid}>
            <label style={styles.label}>
              Date
              <input type="date" style={styles.input} value={form.sessionDate} onChange={(e) => update("sessionDate", e.target.value)} required />
            </label>
            <label style={styles.label}>
              Session type
              <select style={styles.input} value={form.sessionType} onChange={(e) => update("sessionType", e.target.value)}>
                <option value="">— Select session type —</option>
                {SESSION_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 11.5, color: "#475569", lineHeight: 1.4 }}>
              <strong>Separate Risk Documentation:</strong> Client self-reported Schedule Book status and Staff clinical assessment are recorded separately. Selecting <em>Nearly Used / Strong Craving</em> preserves that the client experienced cravings <strong>without</strong> using drugs.
            </div>
            <label style={styles.label}>
              1. Client Self-Reported Schedule Book Status (ENTREPOSE Vol. 3A)
              <select
                style={{
                  ...styles.input,
                  ...selfRiskStyle,
                  fontWeight: 600,
                }}
                value={form.relapseRisk}
                onChange={(e) => update("relapseRisk", e.target.value)}
              >
                <option value="">— Unanswered / Not Assessed —</option>
                <option value="SAFE">🟢 Safe / Abstinent (Adhering to schedule; no cravings reported)</option>
                <option value="AT_RISK">🟡 At Risk (Trigger exposure or skipped activity — no substance use)</option>
                <option value="NEARLY_USED">🟠 Nearly Used / Strong Craving (Strong urge — did NOT use substances)</option>
                <option value="USED">🔴 Actual Use / Slip (Client reported actual substance use / lapse)</option>
              </select>
            </label>

            <label style={styles.label}>
              2. Staff Clinical Risk Assessment (Evaluator Judgment)
              <select
                style={styles.input}
                value={form.staffRiskAssessment}
                onChange={(e) => update("staffRiskAssessment", e.target.value)}
              >
                <option value="">— Optional: Select Staff Clinical Risk Level —</option>
                <option value="LOW_RISK">Low Risk — Stable Recovery & Coping</option>
                <option value="MODERATE_RISK">Moderate Risk — Monitor Triggers & Reinforce Coping</option>
                <option value="HIGH_RISK">High Risk — Intensify Clinical Support & Follow-up</option>
                <option value="ACUTE_RELAPSE_RISK">Acute Relapse Risk — Immediate Clinical Intervention</option>
              </select>
            </label>
          </div>

          <label style={styles.label}>
            Observation
            <textarea style={{ ...styles.input, minHeight: 70 }} value={form.observation} onChange={(e) => update("observation", e.target.value)} required />
          </label>
          <label style={styles.label}>
            Intervention provided
            <textarea style={{ ...styles.input, minHeight: 60 }} value={form.interventionProvided} onChange={(e) => update("interventionProvided", e.target.value)} />
          </label>
          <label style={styles.label}>
            Patient response
            <textarea style={{ ...styles.input, minHeight: 60 }} value={form.patientResponse} onChange={(e) => update("patientResponse", e.target.value)} />
          </label>
          <label style={styles.label}>
            Recommendations
            <textarea style={{ ...styles.input, minHeight: 60 }} value={form.recommendations} onChange={(e) => update("recommendations", e.target.value)} />
          </label>
          <label style={styles.label}>
            Next follow-up date
            <input type="date" style={styles.input} value={form.nextFollowUpDate} onChange={(e) => update("nextFollowUpDate", e.target.value)} />
          </label>

          <div style={styles.footer}>
            <button type="button" style={styles.secondaryBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={styles.primaryBtn} disabled={saving}>{saving ? "Saving…" : "Save note"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "var(--color-surface)", borderRadius: "var(--radius-lg)", width: 560, maxWidth: "95vw", maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--color-border)" },
  title: { fontSize: 16, fontWeight: 800 },
  closeBtn: { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--color-text-muted)" },
  body: { padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 },
  error: { background: "#FDE2E2", color: "#B3261E", fontSize: 13, padding: "8px 12px", borderRadius: "var(--radius-sm)" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 },
  input: { padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13, fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
  footer: { display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 6 },
  secondaryBtn: { background: "none", border: "1px solid var(--color-border)", padding: "9px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  primaryBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "9px 18px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer" },
};
