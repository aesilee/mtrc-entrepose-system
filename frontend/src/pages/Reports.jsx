import { useEffect, useState } from "react";
import AppShell from "../components/AppShell.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ReportGeneratorModal from "../components/ReportGeneratorModal.jsx";
import ReportViewModal from "../components/ReportViewModal.jsx";
import api from "../api/axios.js";
import useViewport from "../hooks/useViewport.js";
import CardActionMenu from "../components/CardActionMenu.jsx";

const iconProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

const REPORT_TYPE_ICONS = {
  attendance: <svg {...iconProps} width="18" height="18"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8.5 15l2 2 4-4" /></svg>,
  patient: <svg {...iconProps} width="18" height="18"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.5 2.9-6 5.5-6s5.5 2.5 5.5 6" /></svg>,
  program: <svg {...iconProps} width="18" height="18"><path d="M4 20V10M11 20V4M18 20v-7M3 20h18" /></svg>,
  monthly: <svg {...iconProps} width="18" height="18"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8 3v4M16 3v4" /></svg>,
};

const REPORT_TYPE_LABELS = {
  attendance: "Attendance Report",
  patient: "Patient Report",
  program: "Program Report",
  monthly: "Monthly Report",
};

const REPORT_TYPES = [
  { key: "attendance", label: "Attendance Report" },
  { key: "patient", label: "Patient Report" },
  { key: "program", label: "Program Report" },
  { key: "monthly", label: "Monthly Report" },
];

const VIEW_ICONS = {
  xlCards: <svg {...iconProps} width="16" height="16"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h6" /></svg>,
  lgCards: <svg {...iconProps} width="16" height="16"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 10h10" /></svg>,
  mdCards: <svg {...iconProps} width="16" height="16"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>,
  smCards: <svg {...iconProps} width="16" height="16"><rect x="3" y="3" width="5" height="5" rx="1" /><rect x="10" y="3" width="5" height="5" rx="1" /><rect x="17" y="3" width="5" height="5" rx="1" /><rect x="3" y="10" width="5" height="5" rx="1" /><rect x="10" y="10" width="5" height="5" rx="1" /><rect x="17" y="10" width="5" height="5" rx="1" /><rect x="3" y="17" width="5" height="5" rx="1" /><rect x="10" y="17" width="5" height="5" rx="1" /><rect x="17" y="17" width="5" height="5" rx="1" /></svg>,
  list: <svg {...iconProps} width="16" height="16"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>,
  details: <svg {...iconProps} width="16" height="16"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="11" x2="21" y2="11" /><line x1="3" y1="16" x2="21" y2="16" /><line x1="3" y1="21" x2="21" y2="21" /></svg>,
  tiles: <svg {...iconProps} width="16" height="16"><rect x="3" y="4" width="18" height="6" rx="1.5" /><rect x="3" y="14" width="18" height="6" rx="1.5" /><path d="M7 7h2M7 17h2" /></svg>,
  content: <svg {...iconProps} width="16" height="16"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="7" y1="8" x2="17" y2="8" /><line x1="7" y1="12" x2="14" y2="12" /><line x1="7" y1="16" x2="10" y2="16" /></svg>,
};

const VIEW_OPTIONS = [
  { key: "xl-cards", label: "Extra large icons", icon: VIEW_ICONS.xlCards },
  { key: "lg-cards", label: "Large icons", icon: VIEW_ICONS.lgCards },
  { key: "md-cards", label: "Medium icons", icon: VIEW_ICONS.mdCards },
  { key: "sm-cards", label: "Small icons", icon: VIEW_ICONS.smCards },
  { key: "list", label: "List", icon: VIEW_ICONS.list },
  { key: "details", label: "Details", icon: VIEW_ICONS.details },
  { key: "tiles", label: "Tiles", icon: VIEW_ICONS.tiles },
  { key: "content", label: "Content", icon: VIEW_ICONS.content },
];

export default function Reports() {
  const { isMobile } = useViewport();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("mtrc-reports-view-mode") || "md-cards");
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [viewingAction, setViewingAction] = useState(null);

  function handleSelectView(key) {
    setViewMode(key);
    localStorage.setItem("mtrc-reports-view-mode", key);
    setViewMenuOpen(false);
  }

  function openView(id, action = null) {
    setViewingId(id);
    setViewingAction(action);
  }

  async function handleDeleteReport(id) {
    if (!window.confirm("Delete this report? This cannot be undone.")) return;
    try {
      await api.delete(`/reports/${id}`);
      if (viewingId === id) setViewingId(null);
      loadReports();
    } catch (err) {
      alert("Could not delete this report.");
    }
  }

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

  const currentViewOption = VIEW_OPTIONS.find((v) => v.key === viewMode) || VIEW_OPTIONS[2];

  return (
    <AppShell title="Reports" description="Generate, preview, and export attendance, patient, program, and monthly reports.">
      <div className="no-print" style={{ ...styles.toolbar, flexWrap: isMobile ? "wrap" : "nowrap" }}>
        <div style={{ ...styles.leftControls, flexWrap: isMobile ? "wrap" : "nowrap", width: isMobile ? "100%" : "auto" }}>
          {/* Filters Button & Dropdown */}
          <div style={{ position: "relative" }}>
            <button type="button" style={styles.filterBtn} onClick={() => { setFiltersOpen((v) => !v); setViewMenuOpen(false); }}>
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

          {/* Search Input */}
          <div style={styles.searchBox}>
            <svg {...iconProps} width="16" height="16" style={styles.searchIcon}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input style={styles.searchInput} placeholder="Search past reports…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {/* Layout & View Options Dropdown */}
          <div style={{ position: "relative" }}>
            <button type="button" style={styles.viewDropdownBtn} onClick={() => { setViewMenuOpen((v) => !v); setFiltersOpen(false); }}>
              <span style={styles.viewIcon}>{currentViewOption.icon}</span>
              <span>View</span>
              <svg {...iconProps} width="12" height="12" style={{ marginLeft: 2 }}><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {viewMenuOpen && (
              <>
                <div style={styles.menuBackdrop} onClick={() => setViewMenuOpen(false)} />
                <div style={styles.viewMenuPanel}>
                  <div style={styles.viewMenuHeader}>Layout &amp; View</div>
                  {VIEW_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      style={{
                        ...styles.viewMenuItem,
                        ...(viewMode === opt.key ? styles.viewMenuItemActive : {}),
                      }}
                      onClick={() => handleSelectView(opt.key)}
                    >
                      <span style={styles.viewMenuItemRadio}>
                        {viewMode === opt.key ? "•" : ""}
                      </span>
                      <span style={styles.viewMenuItemIcon}>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
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
      ) : viewMode === "details" ? (
        /* Details View (Table) */
        <div style={styles.tableCard}>
          <table style={styles.detailsTable}>
            <thead>
              <tr>
                <th style={styles.th}>Report Title</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Date Range / Scope</th>
                <th style={styles.th}>Generated By</th>
                <th style={styles.th}>Date Created</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} style={styles.tr} onClick={() => openView(r.id)}>
                  <td style={{ ...styles.td, fontWeight: 700 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={styles.rowIcon}>{REPORT_TYPE_ICONS[r.report_type]}</span>
                      {r.title}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.typeBadge}>{REPORT_TYPE_LABELS[r.report_type] || r.report_type}</span>
                  </td>
                  <td style={{ ...styles.td, color: "var(--color-text-muted)" }}>{r.date_range_label || "—"}</td>
                  <td style={styles.td}>{r.generated_by_name || "—"}</td>
                  <td style={{ ...styles.td, color: "var(--color-text-muted)" }}>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td style={{ ...styles.td, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <CardActionMenu
                      items={[
                        { label: "Print", onClick: () => openView(r.id, "print") },
                        { label: "Download PDF", onClick: () => openView(r.id, "download") },
                        { label: "Delete", danger: true, onClick: () => handleDeleteReport(r.id) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : viewMode === "list" ? (
        /* List View */
        <div style={styles.listView}>
          {reports.map((r) => (
            <div key={r.id} style={styles.listRow} onClick={() => openView(r.id)}>
              <div style={styles.listRowLeft}>
                <div style={styles.cardIconSmall}>{REPORT_TYPE_ICONS[r.report_type]}</div>
                <div>
                  <div style={styles.listRowTitle}>{r.title}</div>
                  <div style={styles.listRowMeta}>{r.date_range_label} · Generated by {r.generated_by_name || "—"}</div>
                </div>
              </div>
              <div style={styles.listRowRight} onClick={(e) => e.stopPropagation()}>
                <span style={styles.listRowDate}>{new Date(r.created_at).toLocaleDateString()}</span>
                <CardActionMenu
                  items={[
                    { label: "Print", onClick: () => openView(r.id, "print") },
                    { label: "Download PDF", onClick: () => openView(r.id, "download") },
                    { label: "Delete", danger: true, onClick: () => handleDeleteReport(r.id) },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "tiles" ? (
        /* Tiles View */
        <div style={styles.tilesGrid}>
          {reports.map((r) => (
            <div key={r.id} style={styles.tileCard} onClick={() => openView(r.id)}>
              <div style={styles.cardIcon}>{REPORT_TYPE_ICONS[r.report_type]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.cardTitle}>{r.title}</div>
                <div style={styles.cardMeta}>{r.date_range_label || "—"}</div>
                <div style={styles.tileFooter}>By {r.generated_by_name || "—"} · {new Date(r.created_at).toLocaleDateString()}</div>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <CardActionMenu
                  items={[
                    { label: "Print", onClick: () => openView(r.id, "print") },
                    { label: "Download PDF", onClick: () => openView(r.id, "download") },
                    { label: "Delete", danger: true, onClick: () => handleDeleteReport(r.id) },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "content" ? (
        /* Content View (Expanded Card Rows) */
        <div style={styles.contentStack}>
          {reports.map((r) => (
            <div key={r.id} style={styles.contentCard} onClick={() => openView(r.id)}>
              <div style={styles.contentCardHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={styles.cardIcon}>{REPORT_TYPE_ICONS[r.report_type]}</div>
                  <div>
                    <div style={styles.contentCardTitle}>{r.title}</div>
                    <span style={styles.typeBadge}>{REPORT_TYPE_LABELS[r.report_type] || r.report_type}</span>
                  </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <CardActionMenu
                    items={[
                      { label: "Print", onClick: () => openView(r.id, "print") },
                      { label: "Download PDF", onClick: () => openView(r.id, "download") },
                      { label: "Delete", danger: true, onClick: () => handleDeleteReport(r.id) },
                    ]}
                  />
                </div>
              </div>
              <div style={styles.contentCardBody}>
                <div style={styles.contentMetaItem}>
                  <span style={styles.contentMetaLabel}>Scope / Period:</span>
                  <span>{r.date_range_label || "All time record"}</span>
                </div>
                <div style={styles.contentMetaItem}>
                  <span style={styles.contentMetaLabel}>Prepared By:</span>
                  <span>{r.generated_by_name || "—"}</span>
                </div>
              </div>
              <div style={styles.contentCardFooter}>
                <span>Created {new Date(r.created_at).toLocaleString()}</span>
                <span style={styles.previewLink}>Click to Preview &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Grid Views: xl-cards, lg-cards, md-cards (default), sm-cards */
        <div
          style={{
            ...styles.grid,
            gridTemplateColumns:
              viewMode === "xl-cards"
                ? "repeat(auto-fill, minmax(320px, 1fr))"
                : viewMode === "lg-cards"
                ? "repeat(auto-fill, minmax(260px, 1fr))"
                : viewMode === "sm-cards"
                ? "repeat(auto-fill, minmax(160px, 1fr))"
                : "repeat(auto-fill, minmax(220px, 1fr))",
          }}
        >
          {reports.map((r) => (
            <div
              key={r.id}
              style={{
                ...styles.card,
                padding: viewMode === "xl-cards" ? 24 : viewMode === "sm-cards" ? 12 : 18,
                position: "relative",
                cursor: "pointer",
              }}
              onClick={() => openView(r.id)}
            >
              <CardActionMenu
                items={[
                  { label: "Print", onClick: () => openView(r.id, "print") },
                  { label: "Download PDF", onClick: () => openView(r.id, "download") },
                  { label: "Delete", danger: true, onClick: () => handleDeleteReport(r.id) },
                ]}
              />
              <div
                style={{
                  ...styles.cardIcon,
                  width: viewMode === "xl-cards" ? 44 : viewMode === "sm-cards" ? 28 : 36,
                  height: viewMode === "xl-cards" ? 44 : viewMode === "sm-cards" ? 28 : 36,
                }}
              >
                {REPORT_TYPE_ICONS[r.report_type]}
              </div>
              <div
                style={{
                  ...styles.cardTitle,
                  fontSize: viewMode === "xl-cards" ? 16 : viewMode === "sm-cards" ? 12.5 : 14,
                }}
              >
                {r.title}
              </div>
              <div style={styles.cardMeta}>{r.date_range_label}</div>
              <div style={styles.cardFooter}>
                <span>{r.generated_by_name || "—"}</span>
                <span>{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {generatorOpen && (
        <ReportGeneratorModal onClose={() => setGeneratorOpen(false)} onGenerated={loadReports} />
      )}
      {viewingId && (
        <ReportViewModal reportId={viewingId} autoAction={viewingAction} onClose={() => setViewingId(null)} />
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
  filterPanel: { position: "absolute", top: "calc(100% + 8px)", left: 0, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md, 10px)", boxShadow: "0 12px 28px rgba(0,0,0,0.18)", padding: 16, width: 280, maxWidth: "88vw", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12, zIndex: 40 },
  filterPanelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 700, paddingBottom: 8, borderBottom: "1px solid var(--color-border)" },
  filterLabel: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" },
  filterSelect: { padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13, background: "var(--color-surface)", width: "100%", boxSizing: "border-box" },
  dateRange: { display: "flex", alignItems: "center", gap: 6, width: "100%" },
  dateInput: { padding: "8px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 12, background: "var(--color-surface)", flex: 1, minWidth: 0, boxSizing: "border-box" },
  clearLink: { background: "none", border: "none", color: "var(--color-primary-dark)", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 },
  clearFooterBtn: { marginTop: 4, background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", border: "none", borderRadius: "var(--radius-sm)", padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%" },
  searchBox: { display: "flex", alignItems: "center", gap: 8, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "8px 12px", flex: "1 1 220px", minWidth: 0 },
  searchIcon: { color: "var(--color-text-muted)", flexShrink: 0 },
  searchInput: { border: "none", outline: "none", fontSize: 14, width: "100%", background: "transparent" },

  /* View Dropdown Styles */
  viewDropdownBtn: { display: "flex", alignItems: "center", gap: 6, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "9px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  viewIcon: { display: "flex", alignItems: "center", color: "var(--color-primary-dark)" },
  viewMenuPanel: { position: "absolute", top: "calc(100% + 8px)", left: 0, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md, 10px)", boxShadow: "0 12px 28px rgba(0,0,0,0.18)", padding: 6, width: 200, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 2, zIndex: 40 },
  viewMenuHeader: { fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4, padding: "6px 10px 4px" },
  viewMenuItem: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "none", background: "none", fontSize: 13, fontWeight: 500, color: "var(--color-text)", cursor: "pointer", textAlign: "left", width: "100%" },
  viewMenuItemActive: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", fontWeight: 700 },
  viewMenuItemRadio: { width: 12, display: "inline-block", textAlign: "center", fontSize: 16, color: "var(--color-primary-dark)" },
  viewMenuItemIcon: { display: "flex", alignItems: "center", opacity: 0.8 },

  generateBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },

  emptyCard: { background: "var(--color-surface)", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-lg)" },

  grid: { display: "grid", gap: 16 },
  card: {
    textAlign: "left", background: "var(--color-surface)", border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)", padding: 18, cursor: "pointer", display: "flex", flexDirection: "column", gap: 8,
  },
  cardIcon: { width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardIconSmall: { width: 30, height: 30, borderRadius: "var(--radius-sm)", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardTitle: { fontSize: 14, fontWeight: 700, color: "var(--color-text)" },
  cardMeta: { fontSize: 12, color: "var(--color-text-muted)" },
  cardFooter: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-muted)", marginTop: 6, paddingTop: 8, borderTop: "1px solid var(--color-border)" },

  /* List View Styles */
  listView: { display: "flex", flexDirection: "column", gap: 8 },
  listRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, padding: "10px 16px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md, 8px)", cursor: "pointer" },
  listRowLeft: { display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 },
  listRowTitle: { fontSize: 13.5, fontWeight: 700, color: "var(--color-text)" },
  listRowMeta: { fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 },
  listRowRight: { display: "flex", alignItems: "center", gap: 12, flexShrink: 0 },
  listRowDate: { fontSize: 11.5, color: "var(--color-text-muted)" },

  /* Details View Table Styles */
  tableCard: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" },
  detailsTable: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "12px 16px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid var(--color-border)", background: "var(--color-primary-tint)" },
  td: { padding: "12px 16px", borderBottom: "1px solid var(--color-border)", verticalAlign: "middle" },
  tr: { cursor: "pointer", transition: "background 0.15s ease" },
  rowIcon: { display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary-dark)" },
  typeBadge: { display: "inline-block", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "var(--color-primary-tint)", color: "var(--color-primary-dark)" },

  /* Tiles View Styles */
  tilesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 },
  tileCard: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md, 10px)", cursor: "pointer" },
  tileFooter: { fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 },

  /* Content View Styles */
  contentStack: { display: "flex", flexDirection: "column", gap: 14 },
  contentCard: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 18, cursor: "pointer", display: "flex", flexDirection: "column", gap: 12 },
  contentCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  contentCardTitle: { fontSize: 15, fontWeight: 800, color: "var(--color-text)" },
  contentCardBody: { display: "flex", gap: 24, fontSize: 13, color: "var(--color-text)", padding: "10px 0", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" },
  contentMetaItem: { display: "flex", gap: 6 },
  contentMetaLabel: { fontWeight: 600, color: "var(--color-text-muted)" },
  contentCardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--color-text-muted)" },
  previewLink: { color: "var(--color-primary-dark)", fontWeight: 700, fontSize: 12 },
};