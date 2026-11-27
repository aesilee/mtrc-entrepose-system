import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";
import EmptyState from "../components/EmptyState.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import Toast from "../components/Toast.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function fmtDateTime(d) { return d ? new Date(d).toLocaleString() : "—"; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"; }

function restoreEndpoint(a) {
  if (a.entity_type === "attendance") return `/attendance/archived/${a.entity_id}/restore`;
  if (a.entity_type === "certificate_issuance") return `/certificates/issuances/${a.entity_id}/restore`;
  if (a.entity_type === "certificate") return `/certificates/${a.entity_id}/restore`;
  if (a.entity_type === "report") return `/reports/${a.entity_id}/restore`;
  return `/archives/patients/${a.entity_id}/restore`;
}

const isCompleter = (p) => String(p.outcome || p.discharge_type || "").toUpperCase().startsWith("COMPLETER");

export default function Archives() {
  const { user } = useAuth();
  const canManage = user.role === "ict_admin";
  // Case managers can restore attendance records; everything else stays ICT-only.
  const canRestore = (a) => canManage || (user.role === "case_manager" && a.entity_type === "attendance");

  const [archives, setArchives] = useState([]);
  const [finished, setFinished] = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("patients");
  const [patientFilter, setPatientFilter] = useState("all"); // all | finished | removed
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [restoreTarget, setRestoreTarget] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([
      api.get("/archives").then(({ data }) => data.archives || []).catch(() => []),
      api.get("/archives/finished-patients").then(({ data }) => data.patients || []).catch(() => []),
    ])
      .then(([a, f]) => { setArchives(a); setFinished(f); })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const q = search.trim().toLowerCase();
  const matches = (...fields) => !q || fields.some((f) => String(f || "").toLowerCase().includes(q));

  // Patients section: discharged ("Finished") + archived by an admin ("Removed"), in one list.
  const patientRows = useMemo(() => {
    const finishedRows = finished.map((p) => ({
      key: `f-${p.patient_id}`,
      kind: "finished",
      patientId: p.patient_id,
      name: p.full_name,
      code: p.pwud_code || p.patient_code,
      badge: isCompleter(p) ? "Finished · Completer" : "Finished · Non-Completer",
      completer: isCompleter(p),
      date: p.discharge_date,
      dateLabel: fmtDate(p.discharge_date),
      detail: p.remarks || p.reason_code || "—",
      by: p.discharged_by || "—",
      cm: p.case_manager_name,
      archived: Boolean(p.is_archived),
    }));
    const removedRows = archives
      .filter((a) => a.entity_type === "patient")
      .map((a) => ({
        key: `r-${a.id}`,
        kind: "removed",
        patientId: a.entity_id,
        name: a.entity_label,
        code: "",
        badge: "Removed (archived)",
        date: a.archived_at,
        dateLabel: fmtDateTime(a.archived_at),
        detail: a.reason || "—",
        by: a.archived_by_name || a.archived_by_username || "—",
        archive: a,
      }));
    return [...finishedRows, ...removedRows]
      .filter((r) => patientFilter === "all" || r.kind === patientFilter)
      .filter((r) => matches(r.name, r.code, r.detail, r.by, r.cm))
      .sort((x, y) => new Date(y.date || 0) - new Date(x.date || 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, archives, patientFilter, q]);

  const attendanceRows = archives
    .filter((a) => a.entity_type === "attendance")
    .filter((a) => matches(a.entity_label, a.reason, a.archived_by_name));
  const otherRows = archives
    .filter((a) => !["patient", "attendance"].includes(a.entity_type))
    .filter((a) => matches(a.entity_label, a.reason, a.archived_by_name));

  const counts = {
    patients: finished.length + archives.filter((a) => a.entity_type === "patient").length,
    attendance: archives.filter((a) => a.entity_type === "attendance").length,
    other: archives.filter((a) => !["patient", "attendance"].includes(a.entity_type)).length,
  };
  const sections = [
    { key: "patients", label: "Patients" },
    { key: "attendance", label: "Attendance" },
    ...(counts.other > 0 ? [{ key: "other", label: "Other records" }] : []),
  ];

  async function handleRestore() {
    await api.post(restoreEndpoint(restoreTarget));
    setRestoreTarget(null);
    setToast("Record restored.");
    load();
  }

  const restoreButton = (a) =>
    canRestore(a) ? (
      <button type="button" style={styles.restoreBtn} onClick={() => setRestoreTarget(a)}>Restore</button>
    ) : null;

  function renderRecordTable(rows, emptyTitle, emptyText) {
    if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyText} />;
    return (
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Record</th>
            <th style={styles.th}>Reason</th>
            <th style={styles.th}>Archived by</th>
            <th style={styles.th}>Archived on</th>
            <th style={styles.th}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td style={styles.td}>{a.entity_label}</td>
              <td style={styles.td}>{a.reason || "—"}</td>
              <td style={styles.td}>{a.archived_by_name || a.archived_by_username || "—"}</td>
              <td style={{ ...styles.td, whiteSpace: "nowrap" }}>{fmtDateTime(a.archived_at)}</td>
              <td style={styles.td}>{restoreButton(a)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <AppShell
      title="Archives"
      description={
        user.role === "case_manager"
          ? "Finished and removed patients from your caseload, and archived attendance records."
          : "Finished and removed patients, archived attendance records, and other archived documents."
      }
    >
      <div style={styles.tabBar} role="tablist">
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={section === s.key}
            style={{ ...styles.tab, ...(section === s.key ? styles.tabActive : {}) }}
            onClick={() => setSection(s.key)}
          >
            {s.label}
            <span style={{ ...styles.tabCount, ...(section === s.key ? styles.tabCountActive : {}) }}>{counts[s.key]}</span>
          </button>
        ))}
      </div>

      <div style={styles.filterBar}>
        <input
          style={styles.searchInput}
          placeholder={section === "patients" ? "Search patient, code, reason, or staff…" : "Search record, reason, or who archived it…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {section === "patients" && (
          <div style={styles.chips}>
            {[
              { key: "all", label: "All" },
              { key: "finished", label: "Finished (discharged)" },
              { key: "removed", label: "Removed (archived)" },
            ].map((c) => (
              <button
                key={c.key}
                type="button"
                style={{ ...styles.chip, ...(patientFilter === c.key ? styles.chipActive : {}) }}
                onClick={() => setPatientFilter(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.loading}>Loading…</div>
        ) : section === "patients" ? (
          patientRows.length === 0 ? (
            <EmptyState
              title="No patients here"
              description={
                patientFilter === "removed"
                  ? "No patients have been archived."
                  : patientFilter === "finished"
                  ? "No patients have been discharged yet."
                  : "No finished or removed patients yet."
              }
            />
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Patient</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Reason / remarks</th>
                  <th style={styles.th}>By</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {patientRows.map((r) => (
                  <tr key={r.key}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 700 }}>{r.name}</div>
                      {(r.code || r.cm) && (
                        <div style={styles.subText}>{[r.code, r.cm ? `CM: ${r.cm}` : ""].filter(Boolean).join(" · ")}</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          ...(r.kind === "removed" ? styles.badgeRemoved : r.completer ? styles.badgeCompleter : styles.badgeNonCompleter),
                        }}
                      >
                        {r.badge}
                      </span>
                      {r.kind === "finished" && r.archived && <div style={styles.subText}>Also archived</div>}
                    </td>
                    <td style={{ ...styles.td, whiteSpace: "nowrap" }}>{r.dateLabel}</td>
                    <td style={styles.td}>{r.detail}</td>
                    <td style={styles.td}>{r.by}</td>
                    <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                      {r.kind === "finished" ? (
                        <Link to={`/patients/${r.patientId}`} style={styles.viewLink}>View profile</Link>
                      ) : (
                        restoreButton(r.archive)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : section === "attendance" ? (
          renderRecordTable(attendanceRows, "No archived attendance", "Attendance records archived from the Attendance page appear here.")
        ) : (
          renderRecordTable(otherRows, "No other archived records", "Archived certificates and reports appear here.")
        )}
      </div>

      {restoreTarget && (
        <ConfirmModal
          title="Restore record"
          description={`Restore "${restoreTarget.entity_label}" from archives?`}
          confirmLabel="Restore"
          onConfirm={handleRestore}
          onClose={() => setRestoreTarget(null)}
        />
      )}

      <Toast message={toast} onDismiss={() => setToast("")} />
    </AppShell>
  );
}

const styles = {
  tabBar: { display: "flex", gap: 6, borderBottom: "1px solid var(--color-border)", marginBottom: 16, flexWrap: "wrap" },
  tab: { display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "none", border: "none", borderBottom: "2px solid transparent", marginBottom: -1, fontSize: 13.5, fontWeight: 600, color: "var(--color-text-muted)", cursor: "pointer" },
  tabActive: { color: "var(--color-primary-dark)", borderBottomColor: "var(--color-primary)" },
  tabCount: { padding: "1px 8px", borderRadius: 999, background: "#EEF2EC", color: "#5E7552", fontSize: 11.5, fontWeight: 700 },
  tabCountActive: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)" },
  filterBar: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" },
  searchInput: { flex: 1, minWidth: 220, maxWidth: 400, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13 },
  chips: { display: "flex", gap: 6, flexWrap: "wrap" },
  chip: { padding: "6px 12px", borderRadius: 999, border: "1px solid var(--color-border)", background: "var(--color-surface, #fff)", fontSize: 12.5, fontWeight: 600, color: "var(--color-text)", cursor: "pointer" },
  chipActive: { background: "var(--color-primary-tint)", borderColor: "var(--color-primary)", color: "var(--color-primary-dark)" },
  tableCard: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflowX: "auto" },
  loading: { padding: 40, textAlign: "center", color: "var(--color-text-muted)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-muted)", padding: "12px 20px", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" },
  td: { padding: "12px 20px", fontSize: 13, borderBottom: "1px solid var(--color-border)", verticalAlign: "top" },
  subText: { fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 },
  badge: { display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" },
  badgeCompleter: { background: "#E3F0DD", color: "#2B4F24" },
  badgeNonCompleter: { background: "#F6F1E1", color: "#6E5218" },
  badgeRemoved: { background: "#F1EFEA", color: "#5B544A" },
  restoreBtn: { background: "none", border: "1px solid var(--color-border)", padding: "6px 12px", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  viewLink: { fontSize: 12.5, fontWeight: 700, color: "var(--color-primary-dark)", textDecoration: "none" },
};
