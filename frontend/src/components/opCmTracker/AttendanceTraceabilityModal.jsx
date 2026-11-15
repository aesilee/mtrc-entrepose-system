import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { getModalityConfig } from "../../utils/modalityConfig.js";

export default function AttendanceTraceabilityModal({ isOpen, onClose, context, records = [] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [modalityFilter, setModalityFilter] = useState("all");

  const {
    caseManager = "Facility-Wide",
    metric = "all",
    title = "Attendance Records",
    periodLabel = "",
  } = context || {};

  // Pre-filter records based on metric context
  const contextRecords = useMemo(() => {
    let list = records;
    if (caseManager && caseManager !== "FACILITY TOTAL" && caseManager !== "Facility-Wide" && caseManager !== "All Case Managers") {
      list = list.filter((r) => r.case_manager_name === caseManager);
    }

    if (metric === "actualAttended") {
      list = list.filter(
        (r) =>
          (r.attendance_status === "present" || r.attendance_status === "late") &&
          r.completion_status === "CREDITED" &&
          !r.is_duplicate_topic
      );
    } else if (metric === "targetScheduled") {
      list = list.filter((r) => r.attendance_status !== "cancelled");
    } else if (metric === "unresolvedSessions") {
      list = list.filter((r) => r.attendance_status === "UNRESOLVED" || r.completion_status === "AWAITING_ENCODING");
    } else if (metric === "cbtActual") {
      list = list.filter(
        (r) =>
          r.session_type === "CBT_GROUP" &&
          (r.attendance_status === "present" || r.attendance_status === "late") &&
          r.completion_status === "CREDITED"
      );
    } else if (metric === "cbtTarget") {
      list = list.filter((r) => r.session_type === "CBT_GROUP" && r.attendance_status !== "cancelled");
    } else if (metric === "peActual") {
      list = list.filter(
        (r) =>
          r.session_type === "PSYCHO_EDUCATION" &&
          (r.attendance_status === "present" || r.attendance_status === "late") &&
          r.completion_status === "CREDITED"
      );
    } else if (metric === "peTarget") {
      list = list.filter((r) => r.session_type === "PSYCHO_EDUCATION" && r.attendance_status !== "cancelled");
    } else if (metric === "cbteConducted") {
      list = list.filter((r) => r.evaluation_type || r.session_type === "CBTE");
    }

    return list;
  }, [records, caseManager, metric]);

  // Interactive user filtering
  const filtered = useMemo(() => {
    return contextRecords.filter((r) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        (r.client_name && r.client_name.toLowerCase().includes(q)) ||
        (r.pwud_code && r.pwud_code.toLowerCase().includes(q)) ||
        (r.requirement_title && r.requirement_title.toLowerCase().includes(q)) ||
        (r.facilitator_name && r.facilitator_name.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === "all" ||
        (r.attendance_status && r.attendance_status.toLowerCase() === statusFilter.toLowerCase());

      const matchDecision =
        decisionFilter === "all" ||
        (r.completion_status && r.completion_status.toUpperCase() === decisionFilter.toUpperCase());

      const matchModality =
        modalityFilter === "all" ||
        (r.session_type && r.session_type.toUpperCase() === modalityFilter.toUpperCase());

      return matchSearch && matchStatus && matchDecision && matchModality;
    });
  }, [contextRecords, search, statusFilter, decisionFilter, modalityFilter]);

  if (!isOpen) return null;

  function exportCsv() {
    if (filtered.length === 0) return;
    const headers = [
      "Date",
      "Time",
      "PWUD Code",
      "Patient Name",
      "Case Manager",
      "Modality",
      "Topic / Curriculum Requirement",
      "Attendance Status",
      "Arrival Time",
      "Completion Status",
      "Decision Reason",
      "Relapse Risk",
      "Drug Test Result",
      "Facilitator",
    ];

    const rows = filtered.map((r) => [
      r.session_date ? String(r.session_date).slice(0, 10) : "",
      r.session_time ? String(r.session_time).slice(0, 5) : "",
      `"${r.pwud_code || ""}"`,
      `"${r.client_name || ""}"`,
      `"${r.case_manager_name || ""}"`,
      `"${r.session_type || ""}"`,
      `"${r.requirement_title || ""}"`,
      `"${r.attendance_status || ""}"`,
      r.arrival_time ? String(r.arrival_time).slice(0, 5) : "",
      `"${r.completion_status || ""}"`,
      `"${(r.decision_reason || "").replace(/"/g, '""')}"`,
      `"${r.relapse_risk || ""}"`,
      `"${r.drug_test_result || ""}"`,
      `"${r.facilitator_name || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `MTRC_Attendance_Traceability_${(caseManager || "All").replace(/\s+/g, "_")}_${metric}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 14,
          width: "100%",
          maxWidth: 1100,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: "16px 24px",
            background: "#F8FAFC",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>🔎</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0F172A" }}>
                Attendance Record Traceability & Drilldown
              </h3>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  background: "#ECFDF5",
                  color: "#065F46",
                  padding: "2px 8px",
                  borderRadius: 999,
                  border: "1px solid #A7F3D0",
                }}
              >
                Audit-Ready
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: "#475569" }}>
              Viewing records behind <strong>{title}</strong> for <strong>{caseManager}</strong> ({periodLabel || "Selected Month"}).
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={exportCsv}
              disabled={filtered.length === 0}
              style={{
                background: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                color: "#1E293B",
                cursor: filtered.length === 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              📥 Export CSV ({filtered.length})
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                color: "#475569",
                cursor: "pointer",
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div
          style={{
            padding: "12px 24px",
            background: "#FFFFFF",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search patient, PWUD code, topic, staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                fontSize: 12,
                width: 260,
              }}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12 }}
            >
              <option value="all">All Attendance Status</option>
              <option value="present">Present</option>
              <option value="late">Late Arrival</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
              <option value="UNRESOLVED">Unresolved / Missing</option>
            </select>

            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12 }}
            >
              <option value="all">All Completion Decisions</option>
              <option value="CREDITED">Credited Only</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="NOT_CREDITED">Not Credited</option>
            </select>

            <select
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12 }}
            >
              <option value="all">All Modalities</option>
              <option value="CBT_GROUP">CBT Group (Sessions 1–28)</option>
              <option value="PSYCHO_EDUCATION">Psycho-Education (PE 1–12)</option>
              <option value="SHGM">Self-Help Group (SHGM)</option>
              <option value="INDIVIDUAL_COUNSELING">Individual Counseling</option>
              <option value="CONJOINT_FAMILY">Family Session</option>
            </select>
          </div>

          <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
            Showing {filtered.length} of {contextRecords.length} records
          </span>
        </div>

        {/* Table View */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: "0" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "#64748B" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>No matching attendance records found.</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Adjust your search query or filters above.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left" }}>
                  <th style={{ padding: "10px 14px", fontWeight: 700, color: "#475569" }}>DATE & TIME</th>
                  <th style={{ padding: "10px 14px", fontWeight: 700, color: "#475569" }}>PATIENT / PWUD CODE</th>
                  <th style={{ padding: "10px 14px", fontWeight: 700, color: "#475569" }}>SESSION / REQUIREMENT</th>
                  <th style={{ padding: "10px 14px", fontWeight: 700, color: "#475569" }}>STATUS</th>
                  <th style={{ padding: "10px 14px", fontWeight: 700, color: "#475569" }}>CREDIT DECISION</th>
                  <th style={{ padding: "10px 14px", fontWeight: 700, color: "#475569" }}>RISK & MULTI-3</th>
                  <th style={{ padding: "10px 14px", fontWeight: 700, color: "#475569" }}>CASE MANAGER</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const isUnresolved = r.attendance_status === "UNRESOLVED";
                  const isCredited = r.completion_status === "CREDITED";
                  const isPending = r.completion_status === "PENDING_REVIEW";

                  return (
                    <tr
                      key={r.id || `rec-${idx}`}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        background: isUnresolved ? "#FFFBEB" : idx % 2 === 1 ? "#FAFAFA" : "#FFFFFF",
                      }}
                    >
                      {/* Date & Time */}
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 700, color: "#0F172A" }}>
                          {r.session_date ? String(r.session_date).slice(0, 10) : "—"}
                        </div>
                        {r.session_time && (
                          <div style={{ fontSize: 11, color: "#64748B" }}>
                            {String(r.session_time).slice(0, 5)}
                          </div>
                        )}
                      </td>

                      {/* Patient & PWUD */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 700, color: "#0F172A" }}>
                          {r.patient_id ? (
                            <Link
                              to={`/patients/${r.patient_id}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#1D4ED8", textDecoration: "none" }}
                              title="Open Patient Profile in new tab"
                            >
                              {r.client_name} ↗
                            </Link>
                          ) : (
                            r.client_name
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748B" }}>
                          <code>{r.pwud_code || "—"}</code>
                        </div>
                      </td>

                      {/* Session / Requirement */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 600, color: "#1E293B" }}>
                          {r.requirement_title || r.session_type || "General Session"}
                        </div>
                        <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                          {(() => {
                            const mcfg = getModalityConfig(r.session_type);
                            return (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                  background: mcfg.bg,
                                  color: mcfg.text,
                                  border: `1px solid ${mcfg.border}`,
                                }}
                              >
                                {mcfg.label}
                              </span>
                            );
                          })()}
                          {Boolean(r.is_makeup) && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: "1px 6px",
                                borderRadius: 4,
                                background: "#F4F7F4",
                                color: "#2D4A3E",
                                border: "1px solid #CBDAD0",
                              }}
                            >
                              Makeup
                            </span>
                          )}
                          {Boolean(r.is_duplicate_topic) && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: "1px 6px",
                                borderRadius: 4,
                                background: "#F4F7F4",
                                color: "#475569",
                                border: "1px solid #CBDAD0",
                              }}
                            >
                              Repeat Topic
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Attendance Status */}
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "capitalize",
                            background:
                              r.attendance_status === "present"
                                ? "#DCFCE7"
                                : r.attendance_status === "late"
                                ? "#FEF3C7"
                                : r.attendance_status === "UNRESOLVED"
                                ? "#FEE2E2"
                                : r.attendance_status === "excused"
                                ? "#F3E8FF"
                                : "#FEE2E2",
                            color:
                              r.attendance_status === "present"
                                ? "#166534"
                                : r.attendance_status === "late"
                                ? "#92400E"
                                : r.attendance_status === "UNRESOLVED"
                                ? "#991B1B"
                                : r.attendance_status === "excused"
                                ? "#6B21A8"
                                : "#991B1B",
                          }}
                        >
                          {r.attendance_status}
                        </span>
                        {r.arrival_time && (
                          <div style={{ fontSize: 10.5, color: "#92400E", marginTop: 2, fontWeight: 600 }}>
                            ⏰ Arrived: {String(r.arrival_time).slice(0, 5)}
                          </div>
                        )}
                      </td>

                      {/* Credit Decision */}
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 10.5,
                            fontWeight: 700,
                            background: isCredited ? "#DCFCE7" : isPending ? "#FEF3C7" : "#FEE2E2",
                            color: isCredited ? "#166534" : isPending ? "#92400E" : "#991B1B",
                            border: isCredited ? "1px solid #86EFAC" : isPending ? "1px solid #FCD34D" : "1px solid #FCA5A5",
                          }}
                        >
                          {isCredited ? "✓ Credited" : isPending ? "⏳ Pending Review" : "✕ Not Credited"}
                        </span>
                        {r.decision_reason && (
                          <div style={{ fontSize: 10.5, color: "#475569", marginTop: 2 }}>
                            {r.decision_reason}
                          </div>
                        )}
                      </td>

                      {/* Risk & Multi-3 */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          {r.relapse_risk && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: r.relapse_risk === "USED" ? "#DC2626" : "#059669" }}>
                              {r.relapse_risk === "USED" ? "🔴 USED" : "🟢 SAFE"}
                            </span>
                          )}
                          {r.drug_test_result && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "1px 5px",
                                borderRadius: 4,
                                background: r.drug_test_result === "POSITIVE" ? "#FEE2E2" : "#DCFCE7",
                                color: r.drug_test_result === "POSITIVE" ? "#991B1B" : "#166534",
                              }}
                            >
                              🧪 {r.drug_test_result}
                            </span>
                          )}
                          {!r.relapse_risk && !r.drug_test_result && <span style={{ color: "#94A3B8" }}>—</span>}
                        </div>
                      </td>

                      {/* Case Manager */}
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 600, color: "#1E293B" }}>
                          {r.case_manager_name || "Unassigned"}
                        </div>
                        {r.facilitator_name && r.facilitator_name !== "—" && (
                          <div style={{ fontSize: 10.5, color: "#64748B" }}>
                            Facilitator: {r.facilitator_name}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 24px",
            background: "#F8FAFC",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: "#64748B",
          }}
        >
          <span>
            Every number in MTRC OP CM Tracker is linked directly to clinical attendance and session records.
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: 6,
              padding: "5px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
