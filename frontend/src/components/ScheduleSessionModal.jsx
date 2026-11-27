import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getModalityConfig } from "../utils/modalityConfig.js";

const SESSION_TYPE_OPTIONS = [
  { value: "CBT_GROUP", label: "CBT Group Session" },
  { value: "PSYCHO_EDUCATION", label: "Psycho-Education / PE Meeting" },
  { value: "SHGM", label: "Self-Help Group Meeting (SHGM)" },
  { value: "INDIVIDUAL_COUNSELING", label: "Individual Counseling" },
  { value: "CONJOINT_FAMILY", label: "Conjoint / Family Session" },
];

export default function ScheduleSessionModal({ onClose, onScheduled, initialDate }) {
  const { user } = useAuth();
  const defaultStaffName = user?.full_name || user?.username || "";

  const [sessionType, setSessionType] = useState("CBT_GROUP");
  const [sessionDate, setSessionDate] = useState(() => initialDate || new Date().toISOString().slice(0, 10));
  const [sessionTime, setSessionTime] = useState("09:00");
  const [facilitatorName, setFacilitatorName] = useState(defaultStaffName);

  useEffect(() => {
    if (initialDate) {
      setSessionDate(initialDate);
    }
  }, [initialDate]);
  const [caseManagerId, setCaseManagerId] = useState(user?.role === "case_manager" ? String(user.id) : "");
  const [topicId, setTopicId] = useState("");
  const [customTopicName, setCustomTopicName] = useState("");
  const [notes, setNotes] = useState("");

  const [topics, setTopics] = useState([]);
  const [patients, setPatients] = useState([]);
  const [caseManagers, setCaseManagers] = useState([]);
  const [selectedPatientIds, setSelectedPatientIds] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isSinglePatientSession =
    sessionType === "INDIVIDUAL_COUNSELING" || sessionType === "CONJOINT_FAMILY";

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/sessions/topics").catch(() => ({ data: {} })),
      api.get("/patients?forAttendance=true&limit=300").catch(() => ({ data: {} })),
      api.get("/users/case-managers").catch(() => ({ data: {} })),
    ])
      .then(([topRes, ptRes, cmRes]) => {
        if (topRes.data?.topics) setTopics(topRes.data.topics);
        if (ptRes.data?.patients) {
          setPatients(ptRes.data.patients);
        } else if (Array.isArray(ptRes.data)) {
          setPatients(ptRes.data);
        }
        if (cmRes.data?.caseManagers) setCaseManagers(cmRes.data.caseManagers);
      })
      .finally(() => setLoading(false));
  }, []);

  const availableTopics = useMemo(() => {
    if (!sessionType) return topics;
    return (topics || []).filter((t) => t.modality_type === sessionType);
  }, [topics, sessionType]);

  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients;
    const term = patientSearch.toLowerCase();
    return patients.filter((p) => {
      const name = (p.full_name || "").toLowerCase();
      const code = (p.patient_code || "").toLowerCase();
      const pwud = (p.pwud_code || "").toLowerCase();
      return name.includes(term) || code.includes(term) || pwud.includes(term);
    });
  }, [patients, patientSearch]);

  const handleSessionTypeChange = (newType) => {
    setSessionType(newType);
    setTopicId("");
    setCustomTopicName("");
    const isSingle = newType === "INDIVIDUAL_COUNSELING" || newType === "CONJOINT_FAMILY";
    if (isSingle && selectedPatientIds.length > 1) {
      setSelectedPatientIds([selectedPatientIds[0]]);
    }
  };

  const togglePatient = (patientId) => {
    const idStr = String(patientId);
    if (isSinglePatientSession) {
      setSelectedPatientIds([idStr]);
      return;
    }
    setSelectedPatientIds((prev) =>
      prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr]
    );
  };

  const selectAllFiltered = () => {
    if (isSinglePatientSession) return;
    const idsToAdd = filteredPatients.map((p) => String(p.id));
    setSelectedPatientIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
  };

  const clearSelection = () => {
    setSelectedPatientIds([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sessionType) {
      setError("Please select a session type.");
      return;
    }
    if (!sessionDate) {
      setError("Please specify a session date.");
      return;
    }
    if (selectedPatientIds.length === 0) {
      setError("Please select at least one expected patient to schedule this session.");
      return;
    }
    if (isSinglePatientSession && selectedPatientIds.length > 1) {
      setError("Individual and Conjoint sessions can only have 1 expected patient.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const selectedTopicObj = availableTopics.find((t) => String(t.id) === String(topicId));
      const topicName = customTopicName.trim() || selectedTopicObj?.title_tagalog || null;
      const curriculumRequirement = selectedTopicObj
        ? `[${selectedTopicObj.topic_code}] ${selectedTopicObj.title_tagalog}`
        : topicName;

      const payload = {
        sessionType,
        sessionDate,
        sessionTime: sessionTime || null,
        facilitatorName: facilitatorName.trim() || defaultStaffName,
        caseManagerId: caseManagerId ? Number(caseManagerId) : null,
        topicId: topicId ? Number(topicId) : null,
        topicName,
        curriculumRequirement,
        expectedPatientIds: selectedPatientIds.map(Number),
        notes: notes.trim() || null,
      };

      const res = await api.post("/sessions/schedule", payload);
      if (onScheduled) {
        onScheduled(res.data);
      }
      onClose();
    } catch (err) {
      console.error("Error scheduling session:", err);
      setError(err.response?.data?.message || "Could not schedule session. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const modality = getModalityConfig(sessionType);
  const selectedCount = selectedPatientIds.length;

  // Rendered into <body> so page headers / sticky bars can never draw over the dialog.
  return createPortal(
    <div style={styles.backdrop}>
      <div style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="schedule-session-title">
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 id="schedule-session-title" style={styles.title}>Schedule a Session</h2>
            <p style={styles.subtitle}>Plan the session and pick who is expected to attend.</p>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.body}>
            {error && <div style={styles.errorBox}>{error}</div>}

            {/* 1. Session */}
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <span style={styles.stepNo}>1</span> Session
              </h3>
              <div style={styles.grid2}>
                <label style={styles.field}>
                  <span style={styles.labelText}>
                    Modality <span style={styles.req}>*</span>
                  </span>
                  <select
                    style={styles.control}
                    value={sessionType}
                    onChange={(e) => handleSessionTypeChange(e.target.value)}
                  >
                    {SESSION_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={styles.field}>
                  <span style={styles.labelText}>Curriculum topic (Annex 1)</span>
                  <select
                    style={styles.control}
                    value={topicId}
                    onChange={(e) => {
                      setTopicId(e.target.value);
                      if (e.target.value) setCustomTopicName("");
                    }}
                  >
                    <option value="">
                      {availableTopics.length ? "None (use a custom title)" : "No Annex 1 topics for this modality"}
                    </option>
                    {availableTopics.map((t) => (
                      <option key={t.id} value={t.id}>
                        [{t.topic_code}] {t.title_tagalog}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {!topicId && (
                <label style={styles.field}>
                  <span style={styles.labelText}>Custom topic title</span>
                  <input
                    type="text"
                    style={styles.control}
                    placeholder="e.g. Relapse Prevention and Craving Management"
                    value={customTopicName}
                    onChange={(e) => setCustomTopicName(e.target.value)}
                  />
                </label>
              )}
            </section>

            {/* 2. Schedule */}
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <span style={styles.stepNo}>2</span> Schedule
              </h3>
              <div style={styles.grid2}>
                <label style={styles.field}>
                  <span style={styles.labelText}>
                    Date <span style={styles.req}>*</span>
                  </span>
                  <input
                    type="date"
                    style={styles.control}
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    required
                  />
                </label>
                <label style={styles.field}>
                  <span style={styles.labelText}>Time</span>
                  <input
                    type="time"
                    style={styles.control}
                    value={sessionTime}
                    onChange={(e) => setSessionTime(e.target.value)}
                  />
                </label>
                <label style={styles.field}>
                  <span style={styles.labelText}>Facilitator</span>
                  <input
                    type="text"
                    style={styles.control}
                    value={facilitatorName}
                    onChange={(e) => setFacilitatorName(e.target.value)}
                    placeholder="Facilitating staff"
                  />
                </label>
                <label style={styles.field}>
                  <span style={styles.labelText}>Case manager in charge</span>
                  <select
                    style={styles.control}
                    value={caseManagerId}
                    onChange={(e) => setCaseManagerId(e.target.value)}
                  >
                    <option value="">All case managers</option>
                    {caseManagers.map((cm) => (
                      <option key={cm.id} value={cm.id}>
                        {cm.full_name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            {/* 3. Expected patients */}
            <section style={styles.section}>
              <div style={styles.rosterHeader}>
                <h3 style={styles.sectionTitle}>
                  <span style={styles.stepNo}>3</span> Expected patients
                  <span style={styles.countPill}>{selectedCount} selected</span>
                </h3>
                {!isSinglePatientSession && (
                  <div style={styles.rosterActions}>
                    <button type="button" style={styles.linkBtn} onClick={selectAllFiltered}>
                      Select all shown ({filteredPatients.length})
                    </button>
                    <button
                      type="button"
                      style={{ ...styles.linkBtn, color: "#64748B" }}
                      onClick={clearSelection}
                      disabled={selectedCount === 0}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {isSinglePatientSession && (
                <p style={styles.hint}>Individual and family sessions have exactly one patient.</p>
              )}

              <input
                type="search"
                style={styles.control}
                placeholder="Search by name, patient code, or PWUD ID"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />

              <div style={styles.rosterList}>
                {loading ? (
                  <div style={styles.rosterEmpty}>Loading patients…</div>
                ) : filteredPatients.length === 0 ? (
                  <div style={styles.rosterEmpty}>No matching patients.</div>
                ) : (
                  filteredPatients.map((p) => {
                    const isChecked = selectedPatientIds.includes(String(p.id));
                    return (
                      <label
                        key={p.id}
                        style={{ ...styles.patientRow, ...(isChecked ? styles.patientRowSelected : {}) }}
                      >
                        <input
                          type={isSinglePatientSession ? "radio" : "checkbox"}
                          checked={isChecked}
                          name="expectedPatient"
                          onChange={() => togglePatient(p.id)}
                          style={styles.checkbox}
                        />
                        <span style={styles.patientInfo}>
                          <span style={styles.patientName}>{p.full_name}</span>
                          <span style={styles.patientMeta}>
                            {p.pwud_code || p.patient_code || "—"}
                            {p.case_manager_name ? ` · ${p.case_manager_name}` : ""}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              <p style={styles.hint}>
                Patients left unrecorded when attendance is encoded are shown as <strong>Unresolved</strong>, not
                absent.
              </p>
            </section>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <div style={styles.footerSummary}>
              <span
                style={{
                  ...styles.modalityTag,
                  background: modality.bg,
                  color: modality.text,
                  borderColor: modality.border,
                }}
              >
                {modality.label}
              </span>
              <span>{selectedCount} expected</span>
            </div>
            <div style={styles.footerButtons}>
              <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  ...styles.submitBtn,
                  ...(saving || selectedCount === 0 ? styles.submitBtnDisabled : {}),
                }}
                disabled={saving || selectedCount === 0}
              >
                {saving ? "Scheduling…" : "Schedule session"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

const control = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  height: "38px",
  padding: "0 12px",
  borderRadius: "8px",
  border: "1px solid #CBD5E1",
  fontSize: "13.5px",
  color: "#0F172A",
  background: "#ffffff",
  outline: "none",
  fontFamily: "inherit",
  textOverflow: "ellipsis",
};

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "16px",
  },
  modal: {
    background: "#ffffff",
    borderRadius: "14px",
    width: "100%",
    maxWidth: "720px",
    maxHeight: "92vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    overflow: "hidden",
  },
  header: {
    padding: "18px 24px 14px",
    borderBottom: "1px solid #E2E8F0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },
  title: { margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" },
  subtitle: { margin: "4px 0 0", fontSize: "13px", color: "#64748B" },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "22px",
    lineHeight: 1,
    color: "#94A3B8",
    cursor: "pointer",
    padding: "2px 6px",
    borderRadius: "6px",
  },
  form: { display: "flex", flexDirection: "column", minHeight: 0, flex: 1 },
  body: {
    padding: "18px 24px",
    overflowY: "auto",
    overflowX: "hidden",
    display: "flex",
    flexDirection: "column",
    gap: "22px",
    flex: 1,
    minHeight: 0,
  },
  errorBox: {
    padding: "10px 14px",
    borderRadius: "8px",
    background: "#FEE2E2",
    border: "1px solid #FCA5A5",
    color: "#991B1B",
    fontSize: "13px",
    fontWeight: 500,
  },
  section: { display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 },
  sectionTitle: {
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    fontWeight: 700,
    color: "#0F172A",
  },
  stepNo: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    background: "#DCFCE7",
    color: "#166534",
    fontSize: "12px",
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "12px 14px",
  },
  field: { display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 },
  labelText: { fontSize: "12.5px", fontWeight: 600, color: "#334155" },
  req: { color: "#DC2626" },
  control,
  hint: { margin: 0, fontSize: "12px", color: "#64748B" },
  rosterHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  countPill: {
    marginLeft: "4px",
    padding: "2px 10px",
    borderRadius: "999px",
    background: "#F1F5F9",
    color: "#334155",
    fontSize: "12px",
    fontWeight: 600,
  },
  rosterActions: { display: "flex", alignItems: "center", gap: "14px" },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#166534",
    fontSize: "12.5px",
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
  },
  rosterList: {
    height: "260px",
    overflowY: "auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    alignContent: "start",
    gap: "6px",
    border: "1px solid #E2E8F0",
    borderRadius: "10px",
    padding: "8px",
    background: "#F8FAFC",
  },
  rosterEmpty: {
    padding: "28px",
    textAlign: "center",
    fontSize: "13px",
    color: "#64748B",
    gridColumn: "1 / -1",
  },
  patientRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #E2E8F0",
    background: "#ffffff",
    cursor: "pointer",
    minWidth: 0,
  },
  patientRowSelected: { background: "#F0FDF4", borderColor: "#86EFAC" },
  checkbox: { cursor: "pointer", accentColor: "#166534", width: "16px", height: "16px", flexShrink: 0, margin: 0 },
  patientInfo: { display: "flex", flexDirection: "column", minWidth: 0 },
  patientName: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#1E293B",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  patientMeta: {
    fontSize: "11.5px",
    color: "#64748B",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    padding: "14px 24px",
    borderTop: "1px solid #E2E8F0",
    background: "#ffffff",
  },
  footerSummary: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "12.5px",
    color: "#475569",
    minWidth: 0,
  },
  modalityTag: {
    padding: "2px 8px",
    borderRadius: "6px",
    fontSize: "11.5px",
    fontWeight: 700,
    border: "1px solid",
    whiteSpace: "nowrap",
  },
  footerButtons: { display: "flex", gap: "10px", marginLeft: "auto" },
  cancelBtn: {
    background: "#ffffff",
    border: "1px solid #CBD5E1",
    color: "#334155",
    padding: "9px 18px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  submitBtn: {
    background: "#166534",
    color: "#ffffff",
    border: "none",
    padding: "9px 20px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  submitBtnDisabled: { background: "#94A3B8", cursor: "not-allowed" },
};
