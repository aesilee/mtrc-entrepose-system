import React, { useState, useEffect } from "react";
import api from "../../api/axios.js";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function IssueSnapshotModal({
  isOpen,
  onClose,
  month,
  year,
  caseManagerId = null,
  caseManagerName = null,
  currentSummaries = null,
  onIssued,
}) {
  const monthName = MONTH_NAMES[month - 1] || `Month ${month}`;
  const defaultTitle = `Official OP CM Tracker Closing: ${monthName} ${year}${caseManagerName ? ` (${caseManagerName})` : " (Facility-Wide)"}`;

  const [title, setTitle] = useState(defaultTitle);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle);
      setNotes("");
      setError("");
      setSaving(false);
    }
  }, [isOpen, defaultTitle]);

  if (!isOpen) return null;

  async function handleIssue(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const { data } = await api.post("/reports/op-cm-tracker/snapshots", {
        month,
        year,
        caseManagerId: caseManagerId || null,
        title: title.trim() || defaultTitle,
        notes: notes.trim() || null,
      });

      if (onIssued) {
        onIssued(data);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to issue official report snapshot.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 12,
          maxWidth: 540,
          width: "100%",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
          border: "1px solid #E2E8F0",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #1E3A2F 0%, #2F6F4F 100%)",
            padding: "16px 20px",
            color: "#FFFFFF",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, textTransform: "uppercase", letterSpacing: 0.8 }}>
              HIM Statutory Report Control
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
              Issue Official Monthly Snapshot
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              background: "transparent",
              border: "none",
              color: "#FFFFFF",
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleIssue} style={{ padding: "18px 20px" }}>
          {/* Scope Meta Chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 11.5, background: "#F1F5F9", color: "#334155", padding: "4px 8px", borderRadius: 6, fontWeight: 600 }}>
              Period: <strong>{monthName} {year}</strong>
            </span>
            <span style={{ fontSize: 11.5, background: "#ECFDF5", color: "#065F46", padding: "4px 8px", borderRadius: 6, fontWeight: 600 }}>
              Scope: <strong>{caseManagerName ? `Case Manager: ${caseManagerName}` : "Facility-Wide (All Caseloads)"}</strong>
            </span>
            {currentSummaries && (
              <span style={{ fontSize: 11.5, background: "#EFF6FF", color: "#1D4ED8", padding: "4px 8px", borderRadius: 6, fontWeight: 600 }}>
                Census: <strong>{currentSummaries.activeCensusCount ?? "—"} active</strong> · Caseload: <strong>{currentSummaries.caseloadCount ?? "—"} clients</strong>
              </span>
            )}
          </div>

          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 12,
              color: "#475569",
              lineHeight: 1.5,
              marginBottom: 16,
            }}
          >
            <strong>Statutory Record Notice:</strong> Issuing an official snapshot freezes the current monthly totals (cases managed, active census, discharges, and attendance rate) as an immutable baseline for DOH / court reporting. Later retroactive session encoding or case reassignments will be preserved in historical queries and audited against this snapshot.
          </div>

          {error && (
            <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", color: "#991B1B", padding: "8px 12px", borderRadius: 6, fontSize: 12, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#1E293B", marginBottom: 4 }}>
              Official Snapshot Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Official OP CM Tracker Closing: November 2026"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid #CBD5E1",
                fontSize: 13,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#1E293B", marginBottom: 4 }}>
              HIM / Audit Notes <span style={{ fontWeight: 400, color: "#64748B" }}>(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Approved by HIM Lead; submitted to DOH Regional Office and RTC Branch 12."
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid #CBD5E1",
                fontSize: 12.5,
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 10, borderTop: "1px solid #F1F5F9" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                background: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: 6,
                padding: "8px 14px",
                fontSize: 12.5,
                fontWeight: 600,
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: "var(--color-primary, #2F6F4F)",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 12.5,
                fontWeight: 700,
                color: "#FFFFFF",
                cursor: "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Issuing Snapshot..." : "Confirm & Issue Official Snapshot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
