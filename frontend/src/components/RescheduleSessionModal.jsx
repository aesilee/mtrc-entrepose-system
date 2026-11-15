import { useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getModalityConfig } from "../utils/modalityConfig.js";

export default function RescheduleSessionModal({ session, onClose, onRescheduled }) {
  const { user } = useAuth();
  const defaultStaffName = user?.full_name || user?.username || "";

  const [newDate, setNewDate] = useState(() => {
    // Default to tomorrow or 1 day after original date
    if (session?.session_date) {
      const d = new Date(session.session_date);
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  });
  const [newTime, setNewTime] = useState(session?.session_time || "09:00");
  const [reason, setReason] = useState("");
  const [authorizedByName, setAuthorizedByName] = useState(defaultStaffName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!session) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate) {
      setError("Please specify the new scheduled date.");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a documented reason for rescheduling.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        newDate,
        newTime: newTime || null,
        reason: reason.trim(),
        authorizedByName: authorizedByName.trim() || defaultStaffName,
      };

      const res = await api.post(`/sessions/${session.id}/reschedule`, payload);
      if (onRescheduled) {
        onRescheduled(res.data);
      }
      onClose();
    } catch (err) {
      console.error("Error rescheduling session:", err);
      setError(err.response?.data?.message || "Could not reschedule session. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const origDateStr = session.session_date ? String(session.session_date).slice(0, 10) : "—";

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Reschedule Session & Preserve Schedule</h2>
            <p style={styles.subtitle}>
              Keep the original schedule on record as &ldquo;Rescheduled&rdquo; and transfer the expected roster.
            </p>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.body}>
          {/* Original Session Card */}
          <div style={styles.origCard}>
            <div style={styles.origBadge}>Original Session Record</div>
            <div style={styles.origTitle}>{session.session_name || "Session"}</div>
            <div style={styles.origMetaRow}>
              <span>
                <strong>Original Date:</strong> {origDateStr}
              </span>
              {session.session_time && (
                <span>
                  <strong>Time:</strong> {session.session_time}
                </span>
              )}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <strong>Modality:</strong>
                {(() => {
                  const mcfg = getModalityConfig(session.session_type);
                  return (
                    <span
                      style={{
                        padding: "1px 7px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: mcfg.bg,
                        color: mcfg.text,
                        border: `1px solid ${mcfg.border}`,
                      }}
                    >
                      {mcfg.label}
                    </span>
                  );
                })()}
              </span>
              <span>
                <strong>Expected Roster:</strong> {session.expected_count ?? "—"} patient(s)
              </span>
            </div>
            {session.curriculum_requirement && (
              <div style={styles.origReq}>
                <strong>Curriculum:</strong> {session.curriculum_requirement}
              </div>
            )}
          </div>

          {/* New Schedule Inputs */}
          <div style={styles.grid2}>
            <label style={styles.label}>
              <span style={styles.labelText}>New Scheduled Date *</span>
              <input
                type="date"
                style={styles.input}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
              />
            </label>

            <label style={styles.label}>
              <span style={styles.labelText}>New Scheduled Time</span>
              <input
                type="time"
                style={styles.input}
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </label>
          </div>

          <label style={styles.label}>
            <span style={styles.labelText}>Reason for Rescheduling *</span>
            <textarea
              style={styles.textarea}
              rows={3}
              placeholder="e.g. Center holiday / Facilitator medical leave / Inclement weather (Typhoon warning)…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </label>

          <label style={styles.label}>
            <span style={styles.labelText}>Authorized Staff Member</span>
            <input
              type="text"
              style={styles.input}
              placeholder="Staff authorizing reschedule"
              value={authorizedByName}
              onChange={(e) => setAuthorizedByName(e.target.value)}
            />
          </label>

          {/* Policy Compliance Note */}
          <div style={styles.infoBox}>
            <div style={styles.infoText}>
              <strong>Schedule Preservation Guarantee:</strong> This session ({origDateStr}) will be preserved in historical reports marked as <em>RESCHEDULED</em>. A new session will be created on {newDate} carrying over the entire expected roster of {session.expected_count ?? "all"} patient(s).
            </div>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="submit"
              style={{
                ...styles.submitBtn,
                ...(saving || !reason.trim() ? styles.submitBtnDisabled : {}),
              }}
              disabled={saving || !reason.trim()}
            >
              {saving ? "Rescheduling…" : "✓ Confirm Reschedule"}
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
    maxWidth: "600px",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    overflow: "hidden",
  },
  header: {
    padding: "18px 22px 14px",
    borderBottom: "1px solid #E2E8F0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    margin: 0,
    fontSize: "17px",
    fontWeight: 700,
    color: "#0F172A",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: "12.5px",
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
    margin: "12px 22px 0",
    padding: "10px 14px",
    borderRadius: "8px",
    background: "#FEE2E2",
    border: "1px solid #FCA5A5",
    color: "#991B1B",
    fontSize: "13px",
  },
  body: {
    padding: "18px 22px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  origCard: {
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: "10px",
    padding: "12px 14px",
  },
  origBadge: {
    display: "inline-block",
    fontSize: "11px",
    fontWeight: 700,
    color: "#475569",
    background: "#E2E8F0",
    padding: "2px 8px",
    borderRadius: "4px",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  origTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#1E293B",
    marginBottom: "6px",
  },
  origMetaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    fontSize: "12px",
    color: "#475569",
    marginBottom: "4px",
  },
  origReq: {
    fontSize: "12px",
    color: "#64748B",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
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
  textarea: {
    padding: "8px 11px",
    borderRadius: "8px",
    border: "1px solid #CBD5E1",
    fontSize: "13px",
    color: "#0F172A",
    outline: "none",
    background: "#ffffff",
    fontFamily: "inherit",
    resize: "vertical",
  },
  infoBox: {
    background: "#F0FDF4",
    border: "1px solid #BBF7D0",
    borderRadius: "8px",
    padding: "10px 14px",
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
  },
  infoText: {
    fontSize: "12px",
    color: "#166534",
    lineHeight: 1.45,
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "12px",
    marginTop: "8px",
    paddingTop: "14px",
    borderTop: "1px solid #E2E8F0",
  },
  cancelBtn: {
    background: "#ffffff",
    border: "1px solid #CBD5E1",
    color: "#334155",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  submitBtn: {
    background: "#166534",
    color: "#ffffff",
    border: "none",
    padding: "8px 18px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  submitBtnDisabled: {
    background: "#94A3B8",
    cursor: "not-allowed",
  },
};