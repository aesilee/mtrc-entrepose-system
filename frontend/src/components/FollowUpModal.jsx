import { useState } from "react";
import api from "../api/axios.js";

export default function FollowUpModal({ patientId, onClose, onSaved }) {
  const [reason, setReason] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post(`/patients/${patientId}/follow-ups`, { reason, dueDate });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Could not schedule the follow-up.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>Schedule Follow-up</div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={styles.body}>
          {error && <div style={styles.error}>{error}</div>}
          <label style={styles.label}>
            Follow-up date
            <input type="date" style={styles.input} value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </label>
          <label style={styles.label}>
            Reason
            <textarea style={{ ...styles.input, minHeight: 80 }} value={reason} onChange={(e) => setReason(e.target.value)} required />
          </label>
          <div style={styles.footer}>
            <button type="button" style={styles.secondaryBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={styles.primaryBtn} disabled={saving}>{saving ? "Saving…" : "Schedule"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "var(--color-surface)", borderRadius: "var(--radius-lg)", width: 440, display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--color-border)" },
  title: { fontSize: 16, fontWeight: 800 },
  closeBtn: { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--color-text-muted)" },
  body: { padding: 20, display: "flex", flexDirection: "column", gap: 14 },
  error: { background: "#FDE2E2", color: "#B3261E", fontSize: 13, padding: "8px 12px", borderRadius: "var(--radius-sm)" },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 },
  input: { padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13, fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
  footer: { display: "flex", justifyContent: "flex-end", gap: 10 },
  secondaryBtn: { background: "none", border: "1px solid var(--color-border)", padding: "9px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  primaryBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "9px 18px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer" },
};