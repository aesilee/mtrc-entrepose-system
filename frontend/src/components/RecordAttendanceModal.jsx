import { useEffect, useState } from "react";
import api from "../api/axios.js";

const STATUS_OPTIONS = ["present", "absent", "excused", "late"];

export default function RecordAttendanceModal({ onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [programs, setPrograms] = useState([]);
  const [caseManagers, setCaseManagers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [session, setSession] = useState({
    sessionName: "", programId: "", caseManagerId: "",
    sessionDate: new Date().toISOString().slice(0, 10), sessionTime: "",
  });
  const [selections, setSelections] = useState({});
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    api.get("/programs").then(({ data }) => setPrograms(data.programs));
    api.get("/users/case-managers").then(({ data }) => setCaseManagers(data.caseManagers));
    api.get("/patients").then(({ data }) => setPatients(data.patients));
  }, []);

  function toggleStatus(patientId, status) {
    setSelections((prev) => ({ ...prev, [patientId]: { checked: true, status } }));
  }

  function toggleChecked(patientId) {
    setSelections((prev) => {
      if (prev[patientId]?.checked) {
        const { [patientId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [patientId]: { checked: true, status: "present" } };
    });
  }

  const filteredPatients = patients.filter((p) =>
    !patientSearch ||
    p.full_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.patient_code.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const selectedCount = Object.values(selections).filter((s) => s.checked).length;

  async function handleSubmit() {
    setSaving(true);
    setError("");
    try {
      const { data: sessionData } = await api.post("/sessions", session);
      const records = Object.entries(selections)
        .filter(([, v]) => v.checked)
        .map(([patientId, v]) => ({ patientId, status: v.status, remarks }));

      await api.post("/attendance/bulk", { sessionId: sessionData.id, records });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Could not record attendance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>Record Attendance</div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={styles.steps}>
          {["Session Details", "Patient Checklist", "Remarks"].map((label, i) => (
            <div key={label} style={{ ...styles.stepItem, ...(step === i + 1 ? styles.stepItemActive : {}) }}>
              {i + 1}. {label}
            </div>
          ))}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.body}>
          {step === 1 && (
            <div style={styles.grid}>
              <label style={styles.label}>
                Session name
                <input style={styles.input} value={session.sessionName} onChange={(e) => setSession({ ...session, sessionName: e.target.value })} />
              </label>
              <label style={styles.label}>
                Program
                <select style={styles.input} value={session.programId} onChange={(e) => setSession({ ...session, programId: e.target.value })}>
                  <option value="">Select a program</option>
                  {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label style={styles.label}>
                Case manager
                <select style={styles.input} value={session.caseManagerId} onChange={(e) => setSession({ ...session, caseManagerId: e.target.value })}>
                  <option value="">Select a case manager</option>
                  {caseManagers.map((cm) => <option key={cm.id} value={cm.id}>{cm.full_name}</option>)}
                </select>
              </label>
              <label style={styles.label}>
                Session date
                <input type="date" style={styles.input} value={session.sessionDate} onChange={(e) => setSession({ ...session, sessionDate: e.target.value })} />
              </label>
              <label style={styles.label}>
                Time
                <input type="time" style={styles.input} value={session.sessionTime} onChange={(e) => setSession({ ...session, sessionTime: e.target.value })} />
              </label>
            </div>
          )}

          {step === 2 && (
            <div>
              <input
                style={{ ...styles.input, marginBottom: 12 }}
                placeholder="Search patient…"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
              <div style={styles.checklist}>
                {filteredPatients.map((p) => {
                  const sel = selections[p.id];
                  return (
                    <div key={p.id} style={styles.checklistRow}>
                      <label style={styles.checklistLabel}>
                        <input type="checkbox" checked={!!sel?.checked} onChange={() => toggleChecked(p.id)} />
                        {p.full_name} <span style={styles.mutedText}>({p.patient_code})</span>
                      </label>
                      {sel?.checked && (
                        <select style={styles.statusSelect} value={sel.status} onChange={(e) => toggleStatus(p.id, e.target.value)}>
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={styles.mutedText}>{selectedCount} patient(s) selected</div>
            </div>
          )}

          {step === 3 && (
            <label style={styles.label}>
              Remarks (applied to all recorded patients)
              <textarea style={{ ...styles.input, minHeight: 100 }} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </label>
          )}
        </div>

        <div style={styles.footer}>
          {step > 1 && <button type="button" style={styles.secondaryBtn} onClick={() => setStep(step - 1)}>Back</button>}
          <div style={{ flex: 1 }} />
          {step < 3 ? (
            <button type="button" style={styles.primaryBtn} onClick={() => setStep(step + 1)} disabled={step === 2 && selectedCount === 0}>
              Next
            </button>
          ) : (
            <button type="button" style={styles.primaryBtn} onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : "Save Attendance"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "var(--color-surface)", borderRadius: "var(--radius-lg)", width: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--color-border)" },
  title: { fontSize: 16, fontWeight: 800 },
  closeBtn: { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--color-text-muted)" },
  steps: { display: "flex", gap: 4, padding: "12px 20px", borderBottom: "1px solid var(--color-border)" },
  stepItem: { fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", padding: "6px 10px", borderRadius: 999 },
  stepItemActive: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)" },
  error: { background: "#FDE2E2", color: "#B3261E", fontSize: 13, padding: "8px 20px" },
  body: { padding: 20, overflowY: "auto", flex: 1 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 },
  input: { padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13, fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
  checklist: { display: "flex", flexDirection: "column", gap: 4, maxHeight: 280, overflowY: "auto" },
  checklistRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 4px", borderBottom: "1px solid var(--color-border)" },
  checklistLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 },
  statusSelect: { fontSize: 12, padding: "4px 6px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)" },
  mutedText: { color: "var(--color-text-muted)", fontSize: 12, marginTop: 8 },
  footer: { display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderTop: "1px solid var(--color-border)" },
  secondaryBtn: { background: "none", border: "1px solid var(--color-border)", padding: "9px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  primaryBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "9px 18px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer" },
};