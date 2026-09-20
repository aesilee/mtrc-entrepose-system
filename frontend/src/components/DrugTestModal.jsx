import { useState } from "react";
import api from "../api/axios.js";

export default function DrugTestModal({ patientId, onClose, onSaved }) {
  const [form, setForm] = useState({
    testDate: new Date().toISOString().slice(0, 10),
    substanceTested: "METH",
    result: "NEGATIVE",
    actionTaken: "",
    remarks: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!patientId) {
      setError("No patient ID provided.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post(`/case-management/patients/${patientId}/drug-tests`, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save drug test.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Record Drug Test</h2>
          <button type="button" onClick={onClose} style={styles.closeBtn} disabled={saving}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}
          
          <div style={styles.grid}>
            <label style={styles.label}>
              Test Date
              <input type="date" required style={styles.input} value={form.testDate} onChange={(e) => update("testDate", e.target.value)} disabled={saving} />
            </label>
            <label style={styles.label}>
              Result
              <select required style={{ ...styles.input, fontWeight: 600, color: form.result === "POSITIVE" ? "#B3261E" : "#2F855A" }} value={form.result} onChange={(e) => update("result", e.target.value)} disabled={saving}>
                <option value="NEGATIVE">NEGATIVE</option>
                <option value="POSITIVE">POSITIVE</option>
              </select>
            </label>
            <label style={styles.label}>
              Substance Screened
              <select required style={styles.input} value={form.substanceTested} onChange={(e) => update("substanceTested", e.target.value)} disabled={saving}>
                <option value="METH">METH</option>
                <option value="THC">THC</option>
                <option value="BOTH">METH & THC</option>
              </select>
            </label>
            <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
              Action Taken (Required for POSITIVE)
              <input type="text" required={form.result === "POSITIVE"} style={styles.input} value={form.actionTaken} onChange={(e) => update("actionTaken", e.target.value)} disabled={saving} />
            </label>
            <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
              Remarks / Notes
              <textarea style={styles.textarea} value={form.remarks} onChange={(e) => update("remarks", e.target.value)} disabled={saving} />
            </label>
          </div>

          <div style={styles.footer}>
            <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" style={styles.saveBtn} disabled={saving}>
              {saving ? "Saving..." : "Save Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  modal: { background: "#fff", borderRadius: 12, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" },
  header: { padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { margin: 0, fontSize: 18, color: "#1A202C" },
  closeBtn: { background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#A0AEC0", padding: 0, lineHeight: 1 },
  form: { padding: 24, overflowY: "auto" },
  error: { background: "#FFF5F5", color: "#C53030", padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 500, color: "#4A5568" },
  input: { padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 14, outline: "none" },
  textarea: { padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 14, outline: "none", minHeight: 80, resize: "vertical" },
  footer: { padding: "16px 24px", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "flex-end", gap: 12, background: "#F7FAFC", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  cancelBtn: { padding: "8px 16px", border: "1px solid #E2E8F0", background: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#4A5568" },
  saveBtn: { padding: "8px 16px", border: "none", background: "var(--color-primary, #0B5FA5)", color: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 500 },
};
