import { useState, useEffect, useMemo } from "react";
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

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Schedule Planned Session & Roster</h2>
            <p style={styles.subtitle}>
              Pre-assign patients or cohorts before attendance occurs so denominators remain intact.
            </p>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.body}>
          {/* Top Form Grid */}
          <div style={styles.grid2}>
            {/* Session Modality */}
            <label style={styles.label}>
              <span style={styles.labelText}>Therapeutic Modality *</span>
              <select
                style={styles.select}
                value={sessionType}
                onChange={(e) => handleSessionTypeChange(e.target.value)}
              >
                {SESSION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {sessionType && (() => {
                const cfg = getModalityConfig(sessionType);
                return (
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: "6px",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 700,
                      background: cfg.bg,
                      color: cfg.text,
                      border: `1px solid ${cfg.border}`,
                      width: "fit-content",
                    }}
                  >
                    {cfg.label}
                  </span>
                );
              })()}
            </label>

            {/* Curriculum Topic from Annex 1 */}
            <label style={styles.label}>
              <span style={styles.labelText}>Curriculum Topic (Annex 1)</span>
              <select
                style={styles.select}
                value={topicId}
                onChange={(e) => {
                  setTopicId(e.target.value);
                  if (e.target.value) setCustomTopicName("");
                }}
              >
                <option value="">Select an Annex 1 topic or specify below…</option>
                {availableTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.topic_code}] {t.title_tagalog}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!topicId && (
            <label style={styles.label}>
              <span style={styles.labelText}>Custom / Module Topic Title</span>
              <input
                type="text"
                style={styles.input}
                placeholder="e.g. Relapse Prevention and Craving Management"
                value={customTopicName}
                onChange={(e) => setCustomTopicName(e.target.value)}
              />
            </label>
          )}

          {/* Date, Time, Facilitator, Case Manager */}
          <div style={styles.grid4}>
            <label style={styles.label}>
              <span style={styles.labelText}>Session Date *</span>
              <input
                type="date"
                style={styles.input}
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
              />
            </label>

            <label style={styles.label}>
              <span style={styles.labelText}>Scheduled Time</span>
              <input
                type="time"
                style={styles.input}
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
              />
            </label>

            <label style={styles.label}>
              <span style={styles.labelText}>Facilitator Name</span>
              <input
                type="text"
                style={styles.input}
                value={facilitatorName}
                onChange={(e) => setFacilitatorName(e.target.value)}
                placeholder="Facilitating staff"
              />
            </label>

            <label style={styles.label}>
              <span style={styles.labelText}>Assigned Case Manager</span>
              <select
                style={styles.select}
                value={caseManagerId}
                onChange={(e) => setCaseManagerId(e.target.value)}
              >
                <option value="">All / Case Manager in charge</option>
                {caseManagers.map((cm) => (
                  <option key={cm.id} value={cm.id}>
                    {cm.full_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Expected Patient Roster Selection */}
          <div style={styles.rosterSection}>
            <div style={styles.rosterHeader}>
              <div>
                <span style={styles.rosterTitle}>Expected Patient Roster (Denominator)</span>
                <span style={styles.rosterHint}>
                  {isSinglePatientSession
                    ? "Select exactly 1 client for this individual session"
                    : `Selected: ${selectedPatientIds.length} expected patient(s)`}
                </span>
              </div>
              {!isSinglePatientSession && (
                <div style={styles.rosterActions}>
                  <button type="button" style={styles.actionLink} onClick={selectAllFiltered}>
                    Select Visible ({filteredPatients.length})
                  </button>
                  <span style={{ color: "#CBD5E1" }}>|</span>
                  <button type="button" style={styles.actionLink} onClick={clearSelection}>
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div style={styles.searchRow}>
              <input
                type="text"
                style={styles.rosterSearchInput}
                placeholder="Search patient by name, code, or PWUD ID…"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
            </div>

            <div style={styles.rosterList}>
              {loading ? (
                <div style={styles.rosterLoading}>Loading patients…</div>
              ) : filteredPatients.length === 0 ? (
                <div style={styles.rosterEmpty}>No matching patients found.</div>
              ) : (
                filteredPatients.map((p) => {
                  const isChecked = selectedPatientIds.includes(String(p.id));
                  return (
                    <label
                      key={p.id}
                      style={{
                        ...styles.patientCard,
                        ...(isChecked ? styles.patientCardSelected : {}),
                      }}
                    >
                      <input
                        type={isSinglePatientSession ? "radio" : "checkbox"}
                        checked={isChecked}
                        name="expectedPatient"
                        onChange={() => togglePatient(p.id)}
                        style={styles.checkbox}
                      />
                      <div style={styles.patientInfo}>
                        <div style={styles.patientName}>{p.full_name}</div>
                        <div style={styles.patientMeta}>
                          {p.pwud_code ? `PWUD: ${p.pwud_code}` : `Code: ${p.patient_code || "—"}`}
                          {p.case_manager_name ? ` · CM: ${p.case_manager_name}` : ""}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Expected Summary Banner */}
          <div style={styles.summaryBox}>
            <div style={styles.summaryLeft}>
              <div>
                <strong>Expected Cohort Size: {selectedPatientIds.length} patients</strong>
                <div style={styles.summarySub}>
                  When attendance is encoded, unrecorded patients will be reported as{" "}
                  <strong>Unresolved</strong> rather than assumed absent.
                </div>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div style={styles.footer}>
            <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="submit"
              style={{
                ...styles.submitBtn,
                ...(saving || selectedPatientIds.length === 0 ? styles.submitBtnDisabled : {}),
              }}
              disabled={saving || selectedPatientIds.length === 0}
            >
              {saving ? "Scheduling Session…" : `Schedule Session (${selectedPatientIds.length} Expected)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.65)",
    backdropFilter: "blur(3px)",
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
    maxWidth: "840px",
    maxHeight: "92vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    overflow: "hidden",
  },
  header: {
    padding: "20px 24px 16px",
    borderBottom: "1px solid #E2E8F0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 700,
    color: "#0F172A",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: "#64748B",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "18px",
    color: "#94A3B8",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "6px",
  },
  errorBox: {
    margin: "12px 24px 0",
    padding: "10px 14px",
    borderRadius: "8px",
    background: "#FEE2E2",
    border: "1px solid #FCA5A5",
    color: "#991B1B",
    fontSize: "13px",
    fontWeight: 500,
  },
  body: {
    padding: "20px 24px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },
  grid4: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr 1.2fr 1.4fr",
    gap: "12px",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  labelText: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#334155",
  },
  input: {
    padding: "8px 11px",
    borderRadius: "8px",
    border: "1px solid #CBD5E1",
    fontSize: "13px",
    color: "#0F172A",
    outline: "none",
    background: "#ffffff",
  },
  select: {
    padding: "8px 11px",
    borderRadius: "8px",
    border: "1px solid #CBD5E1",
    fontSize: "13px",
    color: "#0F172A",
    outline: "none",
    background: "#ffffff",
  },
  rosterSection: {
    border: "1px solid #E2E8F0",
    borderRadius: "10px",
    padding: "14px",
    background: "#F8FAFC",
  },
  rosterHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  rosterTitle: {
    fontSize: "13.5px",
    fontWeight: 700,
    color: "#1E293B",
    display: "block",
  },
  rosterHint: {
    fontSize: "12px",
    color: "#64748B",
  },
  rosterActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  actionLink: {
    background: "none",
    border: "none",
    color: "#166534",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
  },
  searchRow: {
    marginBottom: "10px",
  },
  rosterSearchInput: {
    width: "100%",
    padding: "7px 11px",
    borderRadius: "6px",
    border: "1px solid #CBD5E1",
    fontSize: "12.5px",
    outline: "none",
    boxSizing: "border-box",
  },
  rosterList: {
    maxHeight: "180px",
    overflowY: "auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "8px",
    background: "#ffffff",
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
    padding: "8px",
  },
  rosterLoading: {
    padding: "20px",
    textAlign: "center",
    fontSize: "13px",
    color: "#64748B",
    gridColumn: "1 / -1",
  },
  rosterEmpty: {
    padding: "20px",
    textAlign: "center",
    fontSize: "13px",
    color: "#94A3B8",
    gridColumn: "1 / -1",
  },
  patientCard: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #E2E8F0",
    background: "#ffffff",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  patientCardSelected: {
    background: "#F0FDF4",
    borderColor: "#86EFAC",
  },
  checkbox: {
    cursor: "pointer",
    accentColor: "#166534",
  },
  patientInfo: {
    overflow: "hidden",
  },
  patientName: {
    fontSize: "12.5px",
    fontWeight: 600,
    color: "#1E293B",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  patientMeta: {
    fontSize: "11px",
    color: "#64748B",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  summaryBox: {
    background: "#ECFDF5",
    border: "1px solid #A7F3D0",
    borderRadius: "8px",
    padding: "10px 14px",
  },
  summaryLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#065F46",
    fontSize: "13px",
  },
  summaryIcon: {
    fontSize: "20px",
  },
  summarySub: {
    fontSize: "12px",
    color: "#047857",
    marginTop: "2px",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "12px",
    marginTop: "10px",
    paddingTop: "14px",
    borderTop: "1px solid #E2E8F0",
  },
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
    boxShadow: "0 2px 4px rgba(22, 101, 52, 0.25)",
  },
  submitBtnDisabled: {
    background: "#94A3B8",
    cursor: "not-allowed",
    boxShadow: "none",
  },
};