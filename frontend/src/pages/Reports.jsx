import { useEffect, useState } from "react";
import AppShell from "../components/AppShell.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ReportGeneratorModal from "../components/ReportGeneratorModal.jsx";
import ReportViewModal from "../components/ReportViewModal.jsx";
import api from "../api/axios.js";

const iconProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

const REPORT_TYPE_ICONS = {
  attendance: <svg {...iconProps} width="18" height="18"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8.5 15l2 2 4-4" /></svg>,
  patient: <svg {...iconProps} width="18" height="18"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.5 2.9-6 5.5-6s5.5 2.5 5.5 6" /></svg>,
  program: <svg {...iconProps} width="18" height="18"><path d="M4 20V10M11 20V4M18 20v-7M3 20h18" /></svg>,
  monthly: <svg {...iconProps} width="18" height="18"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8 3v4M16 3v4" /></svg>,
};

const REPORT_TYPES = [
  { key: "attendance", label: "Attendance Report" },
  { key: "patient", label: "Patient Report" },
  { key: "program", label: "Program Report" },
  { key: "monthly", label: "Monthly Report" },
];

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [viewingId, setViewingId] = useState(null);

  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [caseManagerId, setCaseManagerId] = useState("");
  const [programStatus, setProgramStatus] = useState("");
  const [caseManagers, setCaseManagers] = useState([]);

  function loadReports() {
    setLoading(true);
    const params = {};
    if (typeFilter) params.reportType = typeFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (caseManagerId) params.caseManagerId = caseManagerId;
    if (programStatus) params.programStatus = programStatus;
    if (search) params.search = search;
    api.get("/reports", { params }).then(({ data }) => setReports(data.reports)).finally(() => setLoading(false));
  }

  useEffect(loadReports, [typeFilter, dateFrom, dateTo, caseManagerId, programStatus, search]);
  useEffect(() => { api.get("/users/case-managers").then(({ data }) => setCaseManagers(data.caseManagers)); }, []);

  const activeFilterCount = [typeFilter, dateFrom, dateTo, caseManagerId, programStatus].filter(Boolean).length;

  function clearFilters() {
    setTypeFilter(""); setDateFrom(""); setDateTo(""); setCaseManagerId(""); setProgramStatus("");
  }

  return (
    <AppShell title="Reports" description="Generate, preview, and export attendance, patient, program, and monthly reports.">
      <div className="no-print" style={styles.toolbar}>
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
                    {activeFilterCount > 0 && <button type="button" style={styles.clearLink} onClick={clearFilters}>Clear all</button>}
                  </div>

                  <label style={styles.filterLabel}>
                    Report type
                    <select style={styles.filterSelect} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                      <option value="">All types</option>
                      {REPORT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                  </label>

                  <label style={styles.filterLabel}>
                    Date generated
                    <div style={styles.dateRange}>
                      <input type="date" style={styles.dateInput} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                      <span>–</span>
                      <input type="date" style={styles.dateInput} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    </div>
                  </label>

                  <label style={styles.filterLabel}>
                    Case manager
                    <select style={styles.filterSelect} value={caseManagerId} onChange={(e) => setCaseManagerId(e.target.value)}>
                      <option value="">All case managers</option>
                      {caseManagers.map((cm) => <option key={cm.id} value={cm.id}>{cm.full_name}</option>)}
                    </select>
                  </label>

                  <label style={styles.filterLabel}>
                    Program status
                    <select style={styles.filterSelect} value={programStatus} onChange={(e) => setProgramStatus(e.target.value)}>
                      <option value="">All statuses</option>
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="dropped">Dropped</option>
                      <option value="transferred">Transferred</option>
                    </select>
                  </label>

                  <button type="button" style={styles.clearFooterBtn} onClick={clearFilters}>Clear filters</button>
                </div>
              </>
            )}
          </div>

          <div style={styles.searchBox}>
            <svg {...iconProps} width="16" height="16" style={styles.searchIcon}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input style={styles.searchInput} placeholder="Search past reports…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <button type="button" style={styles.generateBtn} onClick={() => setGeneratorOpen(true)}>+ Generate Report</button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>Loading reports…</div>
      ) : reports.length === 0 ? (
        <div className="no-print" style={styles.emptyCard}>
          <EmptyState
            icon={<svg {...iconProps} width="24" height="24"><path d="M4 20V10M11 20V4M18 20v-7M3 20h18" /></svg>}
            title="No reports generated yet"
            description="Click Generate Report to create your first attendance, patient, program, or monthly report."
          />
        </div>
      ) : (
        <div style={styles.grid}>
          {reports.map((r) => (
            <button key={r.id} type="button" style={styles.card} onClick={() => setViewingId(r.id)}>
              <div style={styles.cardIcon}>{REPORT_TYPE_ICONS[r.report_type]}</div>
              <div style={styles.cardTitle}>{r.title}</div>
              <div style={styles.cardMeta}>{r.date_range_label}</div>
              <div style={styles.cardFooter}>
                <span>{r.generated_by_name || "—"}</span>
                <span>{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {generatorOpen && (
        <ReportGeneratorModal onClose={() => setGeneratorOpen(false)} onGenerated={loadReports} />
      )}
      {viewingId && (
        <ReportViewModal reportId={viewingId} onClose={() => setViewingId(null)} />
      )}
    </AppShell>
  );
}

const styles = {
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20 },
  leftControls: { display: "flex", alignItems: "center", gap: 10 },
  filterBtn: { display: "flex", alignItems: "center", gap: 8, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  filterCount: { background: "var(--color-primary)", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "1px 7px" },
  menuBackdrop: { position: "fixed", inset: 0, zIndex: 30 },
  filterPanel: { position: "absolute", top: "calc(100% + 8px)", left: 0, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md, 10px)", boxShadow: "0 12px 28px rgba(0,0,0,0.18)", padding: 16, width: 280, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12, zIndex: 40 },
  filterPanelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 700, paddingBottom: 8, borderBottom: "1px solid var(--color-border)" },
  filterLabel: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" },
  filterSelect: { padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13, background: "var(--color-surface)", width: "100%", boxSizing: "border-box" },
  dateRange: { display: "flex", alignItems: "center", gap: 6, width: "100%" },
  dateInput: { padding: "8px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 12, background: "var(--color-surface)", flex: 1, minWidth: 0, boxSizing: "border-box" },
  clearLink: { background: "none", border: "none", color: "var(--color-primary-dark)", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 },
  clearFooterBtn: { marginTop: 4, background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", border: "none", borderRadius: "var(--radius-sm)", padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%" },
  searchBox: { display: "flex", alignItems: "center", gap: 8, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "8px 12px", minWidth: 260 },
  searchIcon: { color: "var(--color-text-muted)", flexShrink: 0 },
  searchInput: { border: "none", outline: "none", fontSize: 14, width: "100%", background: "transparent" },
  generateBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },

  emptyCard: { background: "var(--color-surface)", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-lg)" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 },
  card: {
    textAlign: "left", background: "var(--color-surface)", border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)", padding: 18, cursor: "pointer", display: "flex", flexDirection: "column", gap: 8,
  },
  cardIcon: { width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontWeight: 700, color: "var(--color-text)" },
  cardMeta: { fontSize: 12, color: "var(--color-text-muted)" },
  cardFooter: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-muted)", marginTop: 6, paddingTop: 8, borderTop: "1px solid var(--color-border)" },
};