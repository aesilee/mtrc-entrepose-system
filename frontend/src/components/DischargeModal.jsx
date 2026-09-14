import { useState } from "react";

const PROGRAM_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "outpatient", label: "Outpatient" },
  { value: "aftercare", label: "Aftercare" },
  { value: "medical_detox", label: "Medical Detox" },
];

const DISCHARGE_TYPES = [
  { value: "completed", label: "Completed Program" },
  { value: "court_order", label: "Court/Discharge Order" },
  { value: "medically_unfit", label: "Medically/Psychiatrically Unfit" },
  { value: "other", label: "Other" },
];

export default function DischargeModal({ patientName, onConfirm, onClose }) {
  const [programType, setProgramType] = useState("");
  const [dischargeType, setDischargeType] = useState("");
  const [dischargeDate, setDischargeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    if (!programType || !dischargeType || !dischargeDate) {
      setError("Program type, discharge type, and discharge date are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onConfirm({ programType, dischargeType, dischargeDate, remarks });
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>Discharge Patient</div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div style={styles.body}>
          {error && <div style={styles.error}>{error}</div>}
          <p style={styles.description}>
            Recording discharge for <strong>{patientName}</strong>. This will add them to the Discharged Patients list.
          </p>

          <label style={styles.label}>
            Program Type
            <select style={styles.input} value={programType} onChange={(e) => setProgramType(e.target.value)}>
              <option value="">Select program...</option>
              {PROGRAM_TYPES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Discharge Type
            <select style={styles.input} value={dischargeType} onChange={(e) => setDischargeType(e.target.value)}>
              <option value="">Select discharge type...</option>
              {DISCHARGE_TYPES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Discharge Date
            <input
              type="date"
              style={styles.input}
              value={dischargeDate}
              onChange={(e) => setDischargeDate(e.target.value)}
            />
          </label>

          <label style={styles.label}>
            Remarks <span style={{ fontWeight: 400, color: "var(--color-text-muted)" }}>(optional)</span>
            <textarea
              style={{ ...styles.input, minHeight: 70, resize: "vertical" }}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any additional notes..."
            />
          </label>

          <div style={styles.footer}>
            <button type="button" style={styles.secondaryBtn} onClick={onClose}>Cancel</button>
            <button type="button" style={styles.confirmBtn} onClick={handleConfirm} disabled={submitting}>
              {submitting ? "Discharging…" : "Discharge Patient"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "var(--color-surface)", borderRadius: "var(--radius-lg)", width: 440, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--color-border)" },
  title: { fontSize: 15, fontWeight: 800 },
  closeBtn: { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--color-text-muted)" },
  body: { padding: 20, display: "flex", flexDirection: "column", gap: 14 },
  error: { background: "#FDE2E2", color: "#B3261E", fontSize: 13, padding: "8px 12px", borderRadius: "var(--radius-sm)" },
  description: { fontSize: 13, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 },
  input: { padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13, fontFamily: "inherit" },
  footer: { display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 6 },
  secondaryBtn: { background: "none", border: "1px solid var(--color-border)", padding: "9px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  confirmBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "9px 18px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer" },
};