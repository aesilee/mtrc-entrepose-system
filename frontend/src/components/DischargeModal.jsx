import { useState, useEffect } from "react";
import api from "../api/axios.js";

const REASON_OPTIONS = [
  "Completed Program",
  "Non-compliance",
  "Early Release",
  "Court Order Turnover",
  "Death",
  "Referred to Residential",
  "Buy-Bust / Re-arrest",
  "Others"
];

export default function DischargeModal({ patientId, admissionDate, onClose, onSaved }) {
  const [form, setForm] = useState({
    dischargeDate: new Date().toISOString().slice(0, 10),
    status: "Completer (Graduated)",
    reason: "Completed Program",
    treatmentDurationMonths: 0,
    interventionUponDischarge: "",
    courtNotified: false,
    transitionToAftercare: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (admissionDate && form.dischargeDate) {
      const start = new Date(admissionDate);
      const end = new Date(form.dischargeDate);
      let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      if (months < 0) months = 0;
      update("treatmentDurationMonths", months);
    }
  }, [admissionDate, form.dischargeDate]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!patientId) {
      setError("No patient ID provided.");
      return;
    }
    if (!window.confirm("Are you sure you want to formally discharge this patient? This will change their enrollment status and lock further attendance tracking.")) return;
    
    setSaving(true);
    setError("");
    try {
      await api.post(`/case-management/patients/${patientId}/discharge`, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to process discharge.");
      setSaving(false); // only reset on error so modal doesn't flash if onSaved unmounts it
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Process Program Discharge</h2>
          <button type="button" onClick={onClose} style={styles.closeBtn} disabled={saving}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}
          
          <div style={styles.grid}>
            <label style={styles.label}>
              Discharge Date
              <input type="date" required style={styles.input} value={form.dischargeDate} onChange={(e) => update("dischargeDate", e.target.value)} disabled={saving} />
            </label>
            <label style={styles.label}>
              Status
              <select required style={styles.input} value={form.status} onChange={(e) => update("status", e.target.value)} disabled={saving}>
                <option value="Completer (Graduated)">Completer (Graduated)</option>
                <option value="Non-Completer">Non-Completer</option>
              </select>
            </label>
            <label style={styles.label}>
              Discharge Reason
              <select required style={styles.input} value={form.reason} onChange={(e) => update("reason", e.target.value)} disabled={saving}>
                {REASON_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label style={styles.label}>
              Treatment Duration (Months)
              <input type="number" required style={styles.input} value={form.treatmentDurationMonths} onChange={(e) => update("treatmentDurationMonths", e.target.value)} disabled={saving} />
            </label>
            <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
              Intervention / Remarks Upon Discharge
              <textarea style={styles.textarea} value={form.interventionUponDischarge} onChange={(e) => update("interventionUponDischarge", e.target.value)} disabled={saving} />
            </label>
            
            <div style={{ ...styles.checkboxGroup, gridColumn: "1 / -1" }}>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={form.courtNotified} onChange={(e) => update("courtNotified", e.target.checked)} disabled={saving} />
                Court Notified (Progress Report / Clearance Transmitted to RTC)
              </label>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={form.transitionToAftercare} onChange={(e) => update("transitionToAftercare", e.target.checked)} disabled={saving} />
                Transition to Aftercare Program (9-Month OP-ACP)
              </label>
            </div>
          </div>

          <div style={styles.footer}>
            <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" style={styles.saveBtn} disabled={saving}>
              {saving ? "Processing..." : "Confirm Discharge"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  modal: { background: "#fff", borderRadius: 12, width: "100%", maxWidth: 650, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" },
  header: { padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFF5F5", borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  title: { margin: 0, fontSize: 18, color: "#C53030", fontWeight: 700 },
  closeBtn: { background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#C53030", padding: 0, lineHeight: 1 },
  form: { padding: 24, overflowY: "auto" },
  error: { background: "#FFF5F5", color: "#C53030", padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 500, color: "#4A5568" },
  input: { padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 14, outline: "none" },
  textarea: { padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 14, outline: "none", minHeight: 80, resize: "vertical" },
  checkboxGroup: { display: "flex", flexDirection: "column", gap: 12, marginTop: 8, padding: 12, background: "#F7FAFC", borderRadius: 6, border: "1px solid #E2E8F0" },
  checkboxLabel: { display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#2D3748", cursor: "pointer" },
  footer: { padding: "16px 24px", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "flex-end", gap: 12, background: "#F7FAFC", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  cancelBtn: { padding: "8px 16px", border: "1px solid #E2E8F0", background: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#4A5568" },
  saveBtn: { padding: "8px 16px", border: "none", background: "#C53030", color: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 },
};
