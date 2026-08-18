import { useState } from "react";

export default function ArchiveConfirmModal({ title, description, confirmLabel = "Archive", onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setSubmitting(true);
    setError("");
    try {
      await onConfirm(reason);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>{title}</div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div style={styles.body}>
          {error && <div style={styles.error}>{error}</div>}
          <p style={styles.description}>{description}</p>
          <label style={styles.label}>
            Reason <span style={{ fontWeight: 400, color: "var(--color-text-muted)" }}>(optional)</span>
            <textarea style={styles.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being archived?" />
          </label>
          <div style={styles.footer}>
            <button type="button" style={styles.secondaryBtn} onClick={onClose}>Cancel</button>
            <button type="button" style={styles.confirmBtn} onClick={handleConfirm} disabled={submitting}>
              {submitting ? "Working…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "var(--color-surface)", borderRadius: "var(--radius-lg)", width: 420, display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--color-border)" },
  title: { fontSize: 15, fontWeight: 800 },
  closeBtn: { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--color-text-muted)" },
  body: { padding: 20, display: "flex", flexDirection: "column", gap: 14 },
  error: { background: "#FDE2E2", color: "#B3261E", fontSize: 13, padding: "8px 12px", borderRadius: "var(--radius-sm)" },
  description: { fontSize: 13, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 },
  input: { padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13, fontFamily: "inherit", minHeight: 70, resize: "vertical" },
  footer: { display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 6 },
  secondaryBtn: { background: "none", border: "1px solid var(--color-border)", padding: "9px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  confirmBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "9px 18px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer" },
};