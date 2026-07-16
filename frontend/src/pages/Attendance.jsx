import { useEffect, useState } from "react";
import AppShell from "../components/AppShell.jsx";
import RecordAttendanceModal from "../components/RecordAttendanceModal.jsx";
import api from "../api/axios.js";

const iconProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

const STATUS_COLORS = {
  present: { bg: "var(--color-primary-tint)", color: "var(--color-primary-dark)" },
  absent: { bg: "#FDE2E2", color: "#B3261E" },
  excused: { bg: "#EDEAFB", color: "#5B3EC9" },
  late: { bg: "#FFF3D6", color: "#9A6B00" },
};

export default function Attendance() {
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [caseManagers, setCaseManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [caseManagerFilter, setCaseManagerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  function loadData() {
    setLoading(true);
    const params = {};
    if (dateFilter) params.dateFilter = dateFilter;
    if (dateFilter === "custom") { params.dateFrom = dateFrom; params.dateTo = dateTo; }
    if (programFilter) params.programId = programFilter;
    if (caseManagerFilter) params.caseManagerId = caseManagerFilter;
    if (statusFilter) params.status = statusFilter;
    if (search) params.search = search;

    api.get("/attendance", { params }).then(({ data }) => setRecords(data.attendance)).finally(() => setLoading(false));
    api.get("/attendance/stats").then(({ data }) => setStats(data));
  }

  useEffect(loadData, [dateFilter, dateFrom, dateTo, programFilter, caseManagerFilter, statusFilter, search]);
  useEffect(() => {
    api.get("/programs").then(({ data }) => setPrograms(data.programs));
    api.get("/users/case-managers").then(({ data }) => setCaseManagers(data.caseManagers));
  }, []);

  const activeFilterCount = [dateFilter, programFilter, caseManagerFilter, statusFilter].filter(Boolean).length;

  function clearFilters() {
    setDateFilter(""); setDateFrom(""); setDateTo(""); setProgramFilter(""); setCaseManagerFilter(""); setStatusFilter("");
  }

  return (
    <AppShell title="Attendance" description="Track sessions, record attendance, and monitor daily rates.">
      <div style={styles.wrapper}>
        <div style={styles.statsRow}>
          <StatCard label="Today's Sessions" value={stats?.todaySessions ?? "—"} />
          <StatCard label="Today's Attendance Rate" value={stats && stats.todayRate !== null ? `${stats.todayRate}%` : "—"} />
          <StatCard label="Present Today" value={stats?.presentToday ?? "—"} />
          <StatCard label="Absent Today" value={stats?.absentToday ?? "—"} />
        </div>

        <div style={styles.toolbar}>
          <div style={styles.leftControls}>
            <div style={{ position: "relative" }}>
              <button type="button" style={styles.filterBtn} onClick={() => setFiltersOpen((v) => !v)}>
                <svg {...iconProps} width="15" height="15"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
                Filters
                {activeFilterCount > 0 && <span style={styles.filterCount}>{activeFilterCount}</span>}
              </button>
              {filtersOpen && (
                <>
                  <div style={styles.menuBackdrop} onClick={() => setFiltersOpen(false)} />
                  <div style={styles.filterPanel}>
                    <div style={styles.filterPanelHeader}>
                      <span>Filters</span>
                      {activeFilterCount > 0 && <button type="button" style={styles.clearBtn} onClick={clearFilters}>Clear all</button>}
                    </div>

                    <label style={styles.filterLabel}>
                      Session date
                      <select style={styles.filterSelect} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                        <option value="">Any date</option>
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="week">This week</option>
                        <option value="custom">Custom date</option>
                      </select>
                    </label>

                    {dateFilter === "custom" && (
                      <div style={styles.dateRange}>
                        <input type="date" style={styles.dateInput} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                        <span style={styles.dateSep}>–</span>
                        <input type="date" style={styles.dateInput} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                      </div>
                    )}

                    <label style={styles.filterLabel}>
                      Program
                      <select style={styles.filterSelect} value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
                        <option value="">All programs</option>
                        {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </label>

                    <label style={styles.filterLabel}>
                      Case manager
                      <select style={styles.filterSelect} value={caseManagerFilter} onChange={(e) => setCaseManagerFilter(e.target.value)}>
                        <option value="">All case managers</option>
                        {caseManagers.map((cm) => <option key={cm.id} value={cm.id}>{cm.full_name}</option>)}
                      </select>
                    </label>

                    <label style={styles.filterLabel}>
                      Attendance status
                      <select style={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">All statuses</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="excused">Excused</option>
                        <option value="late">Late</option>
                      </select>
                    </label>

                    <button type="button" style={styles.clearFooterBtn} onClick={clearFilters}>Clear filters</button>
                  </div>
                </>
              )}
            </div>

            <div style={styles.searchBox}>
              <svg {...iconProps} width="16" height="16" style={styles.searchIcon}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
              <input style={styles.searchInput} placeholder="Search by patient name or ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <button type="button" style={styles.recordBtn} onClick={() => setModalOpen(true)}>+ Record Attendance</button>
        </div>

        <div style={{ ...styles.tableCard, flex: 1, minHeight: 0 }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Patient</th>
                <th style={styles.th}>Session</th>
                <th style={styles.th}>Program</th>
                <th style={styles.th}>Case Manager</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td style={styles.emptyCell} colSpan={7}>Loading attendance…</td></tr>
              ) : records.length === 0 ? (
                <tr><td style={styles.emptyCell} colSpan={7}>No attendance records match your filters.</td></tr>
              ) : (
                records.map((r) => {
                  const statusStyle = STATUS_COLORS[r.status] || STATUS_COLORS.present;
                  return (
                    <tr key={r.id}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{r.full_name}</td>
                      <td style={styles.td}>{r.session_name || "—"}</td>
                      <td style={styles.td}>{r.program_name || "—"}</td>
                      <td style={styles.td}>{r.case_manager_name || "—"}</td>
                      <td style={styles.td}>{r.session_date ? String(r.session_date).slice(0, 10) : "—"}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.statusBadge, background: statusStyle.bg, color: statusStyle.color }}>{r.status}</span>
                      </td>
                      <td style={styles.td}>{r.notes || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <RecordAttendanceModal
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); loadData(); }}
        />
      )}
    </AppShell>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles = {
  wrapper: { display: "flex", flexDirection: "column", gap: 16, height: "100%" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  statCard: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 18 },
  statValue: { fontSize: 22, fontWeight: 800, color: "var(--color-text)" },
  statLabel: { fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 },

  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  leftControls: { display: "flex", alignItems: "center", gap: 10, flex: 1 },
  filterBtn: { display: "flex", alignItems: "center", gap: 8, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  filterCount: { background: "var(--color-primary)", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "1px 7px" },
  menuBackdrop: { position: "fixed", inset: 0, zIndex: 30 },
  filterPanel: { position: "absolute", top: "calc(100% + 8px)", left: 0, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md, 10px)", boxShadow: "0 12px 28px rgba(0,0,0,0.18)", padding: 16, width: 280, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12, zIndex: 40 },
  filterPanelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 700, paddingBottom: 8, borderBottom: "1px solid var(--color-border)" },
  filterLabel: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" },
  filterSelect: { padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13, background: "var(--color-surface)", width: "100%", boxSizing: "border-box" },
  dateRange: { display: "flex", alignItems: "center", gap: 6, width: "100%" },
  dateInput: { padding: "8px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 12, background: "var(--color-surface)", flex: 1, minWidth: 0, boxSizing: "border-box" },
  dateSep: { color: "var(--color-text-muted)", flexShrink: 0 },
  clearBtn: { background: "none", border: "none", color: "var(--color-primary-dark)", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 },
  clearFooterBtn: { marginTop: 4, background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", border: "none", borderRadius: "var(--radius-sm)", padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%" },

  searchBox: { display: "flex", alignItems: "center", gap: 8, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "8px 12px", flex: 1, maxWidth: 380 },
  searchIcon: { color: "var(--color-text-muted)", flexShrink: 0 },
  searchInput: { border: "none", outline: "none", fontSize: 14, width: "100%", background: "transparent" },

  recordBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },

  tableCard: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md, 10px)", overflow: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" },
  td: { padding: "12px 16px", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" },
  emptyCell: { padding: 32, textAlign: "center", color: "var(--color-text-muted)" },
  statusBadge: { fontSize: 11, fontWeight: 700, textTransform: "capitalize", padding: "4px 10px", borderRadius: 999 },
};