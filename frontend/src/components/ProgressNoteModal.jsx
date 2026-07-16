import { useState } from "react";
import api from "../api/axios.js";

export default function ProgressNoteModal({ patientId, note, onClose, onSaved }) {
  const [form, setForm] = useState({
    sessionDate: note?.session_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    sessionType: note?.session_type || "",
    observation: note?.observation || "",
    interventionProvided: note?.intervention_provided || "",
    patientResponse: note?.patient_response || "",
    recommendations: note?.recommendations || "",
    nextFollowUpDate: note?.next_follow_up_date?.slice(0, 10) || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (note) {
        await api.put(`/progress-notes/${note.id}`, form);
      } else {
        await api.post(`/patients/${patientId}/progress-notes`, form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save the progress note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>{note ? "Edit Progress Note" : "Add Progress Note"}</div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.body}>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.grid}>
            <label style={styles.label}>
              Date
              <input type="date" style={styles.input} value={form.sessionDate} onChange={(e) => update("sessionDate", e.target.value)} required />
            </label>
            <label style={styles.label}>
              Session type
              <input style={styles.input} value={form.sessionType} onChange={(e) => update("sessionType", e.target.value)} placeholder="e.g. Individual counseling" />
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
  modal: { background: "var(--color-surface)", borderRadius: "var(--radius-lg)", width: 520, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" },
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