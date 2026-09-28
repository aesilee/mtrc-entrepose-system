import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";
import { exportOpCmTrackerWorkbook } from "../utils/opCmTrackerExport.js";
import { useAuth } from "../context/AuthContext.jsx";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const MONTHS = [
  { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
  { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
  { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" },
];

const TABS = [
  { id: "caseload", label: "Caseload" },
  { id: "census", label: "Census & enrollments" },
  { id: "discharges", label: "Discharges & attrition" },
  { id: "dt", label: "Drug test surveillance" },
  { id: "performance", label: "Staff performance" },
];

const MILESTONES_CONFIG = [
  { key: "datePo", label: "Program orientation" },
  { key: "dateVltsReferral", label: "Referral to VLTS" },
  { key: "dateInitialAssessment", label: "Initial assessment" },
  { key: "dateInitialTreatmentPlanning", label: "Initial treatment planning" },
  { key: "dateInitialProgressReporting", label: "Initial progress reporting" },
  { key: "dateCaseConference", label: "Case conference" },
  { key: "dateStatusReporting", label: "Status reporting" },
  { key: "dateHomeVisit", label: "Home visit" },
  { key: "dateFollowupAssessment", label: "Follow-up assessment" },
  { key: "dateAcpTreatmentPlanning", label: "ACP treatment planning" },
  { key: "datePdc", label: "Pre-discharge conference" },
  { key: "dateFinalProgressReporting", label: "Final progress reporting" },
];

// Unified column groupings for Spreadsheet Matrix view
const GRID_COLUMN_GROUPS = [
  {
    name: "Patient Demographics",
    headerBg: "var(--color-primary-dark, #234F39)",
    headerBorder: "rgba(255,255,255,0.2)",
    columns: [
      { key: "rowNum", label: "#", sticky: true, width: 48, align: "center" },
      { key: "pwudCode", label: "PWUD CODE", sticky: true, width: 140 },
      { key: "clientName", label: "NAME OF CLIENT", sticky: true, width: 200 },
      { key: "sex", label: "Sex", align: "center", width: 60 },
      { key: "lgu", label: "LGU", width: 100 },
      { key: "cm", label: "Case Manager", width: 140 },
      { key: "category", label: "Category", width: 120 },
    ],
  },
  {
    name: "Enrollment & Intake Milestones",
    headerBg: "var(--color-primary-dark, #234F39)",
    headerBorder: "rgba(255,255,255,0.2)",
    columns: [
      { key: "dateEnrolled", label: "Date Enrolled", date: true, width: 115 },
      { key: "newEnrollee", label: "New Enrollee?", align: "center", width: 105 },
      { key: "datePo", label: "PO Date", milestone: true, width: 105 },
      { key: "dateVltsReferral", label: "VLTS Referral", milestone: true, width: 110 },
      { key: "dateInitialAssessment", label: "Initial Assessment", milestone: true, width: 120 },
      { key: "dateInitialTreatmentPlanning", label: "Initial Tx Plan", milestone: true, width: 115 },
      { key: "dateInitialProgressReporting", label: "Initial Progress Rpt", milestone: true, width: 125 },
    ],
  },
  {
    name: "Clinical Sessions & Drug Tests",
    headerBg: "var(--color-primary-dark, #234F39)",
    headerBorder: "rgba(255,255,255,0.2)",
    columns: [
      { key: "scheduledCbtSessions", label: "Sched. CBT", align: "center", width: 90 },
      { key: "attendedCbtSessions", label: "Att. CBT", align: "center", width: 85 },
      { key: "scheduledPeSessions", label: "Sched. PE", align: "center", width: 90 },
      { key: "attendedPeSessions", label: "Att. PE", align: "center", width: 85 },
      { key: "attendedShgmSessions", label: "SHGM", align: "center", width: 80 },
      { key: "individualCounselingSessions", label: "ICA", align: "center", width: 80 },
      { key: "conjointFamilySessions", label: "Conjoint", align: "center", width: 80 },
      { key: "drugTestsConducted", label: "DT Count", align: "center", width: 85 },
    ],
  },
  {
    name: "Follow-Up & Secondary Milestones",
    headerBg: "var(--color-primary-dark, #234F39)",
    headerBorder: "rgba(255,255,255,0.2)",
    columns: [
      { key: "dateReferralOutsideMtrc", label: "Outside Ref.", milestone: true, width: 110 },
      { key: "dateCaseConference", label: "Case Conf.", milestone: true, width: 110 },
      { key: "dateStatusReporting", label: "Status Rpt", milestone: true, width: 110 },
      { key: "dateHomeVisit", label: "Home Visit", milestone: true, width: 105 },
      { key: "dateFollowupAssessment", label: "Follow-up ASI", milestone: true, width: 115 },
      { key: "dateAcpTreatmentPlanning", label: "ACP Plan", milestone: true, width: 105 },
      { key: "datePdc", label: "PDC", milestone: true, width: 95 },
      { key: "dateFinalProgressReporting", label: "Final Progress Rpt", milestone: true, width: 125 },
    ],
  },
  {
    name: "Clinical Comorbidities & Consults",
    headerBg: "var(--color-primary-dark, #234F39)",
    headerBorder: "rgba(255,255,255,0.2)",
    columns: [
      { key: "interventionsConductedInMonth", label: "Interventions?", align: "center", width: 110 },
      { key: "medicalComorbidity", label: "Med Comorb.", align: "center", width: 95 },
      { key: "psychiatricComorbidity", label: "Psych Comorb.", align: "center", width: 100 },
      { key: "consultTypeWithinMtrc", label: "Consult", align: "center", width: 85 },
      { key: "comorbidityDetails", label: "Comorbidity Details", width: 170 },
    ],
  },
  {
    name: "Discharge & Disposition",
    headerBg: "var(--color-primary-dark, #234F39)",
    headerBorder: "rgba(255,255,255,0.2)",
    columns: [
      { key: "dateOfDischarge", label: "Discharge Date", date: true, width: 115 },
      { key: "statusOfDischarge", label: "Discharge Status", width: 140 },
      { key: "remarks", label: "Remarks", width: 190 },
    ],
  },
];

const FLAT_GRID_COLUMNS = GRID_COLUMN_GROUPS.flatMap((group) => group.columns);

function fmtDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function getInitials(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fmtCell(row, col) {
  if (col.key === "rowNum") {
    return <span style={styles.rowNumBadge}>{row._rowNum}</span>;
  }
  if (col.key === "pwudCode") {
    return <span style={styles.codeBadge}>{row.pwudCode || "—"}</span>;
  }
  if (col.key === "newEnrollee" || col.key === "interventionsConductedInMonth") {
    return Number(row[col.key]) === 1 ? (
      <span style={styles.yesBadge}>Yes</span>
    ) : (
      <span style={styles.noMuted}>No</span>
    );
  }
  const v = row[col.key];
  if (col.milestone || col.date) {
    return v ? <span style={styles.dateText}>{fmtDate(v)}</span> : <span style={styles.zeroMuted}>—</span>;
  }
  if (v === 0 || v === "0") {
    return <span style={styles.zeroMuted}>0</span>;
  }
  if (v === null || v === undefined || v === "" || v === "—") {
    return <span style={styles.zeroMuted}>—</span>;
  }
  if (typeof v === "number" || (!isNaN(v) && typeof v === "string" && v.trim() !== "")) {
    return <span style={styles.activeNumber}>{v}</span>;
  }
  return v;
}

export default function OpCmTracker() {
  const { user } = useAuth();
  const isCaseManager = user?.role === "case_manager";
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [caseManagerId, setCaseManagerId] = useState("");
  const [caseManagers, setCaseManagers] = useState([]);
  const [tab, setTab] = useState("caseload");
  const [caseloadView, setCaseloadView] = useState("cards"); // "cards" | "matrix"
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isCaseManager) {
      api.get("/users/case-managers")
        .then(({ data }) => setCaseManagers(data.caseManagers || []))
        .catch(() => {});
    }
  }, [isCaseManager]);

  async function loadReport() {
    setLoading(true);
    setError("");
    try {
      const params = { month, year };
      if (!isCaseManager && caseManagerId) params.caseManagerId = caseManagerId;
      const { data } = await api.get("/reports/op-cm-tracker", { params });
      if (data.success) {
        setReport(data.data);
      } else {
        setError("Could not load OP CM Tracker.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not load OP CM Tracker.");
      setReport(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadReport();
  }, []);

  function handleExport() {
    if (!report) return;
    exportOpCmTrackerWorkbook(report);
  }

  const rawGrid = report?.grid || [];
  const summaries = report?.summaries;

  const filteredGrid = useMemo(() => {
    if (!searchQuery.trim()) return rawGrid;
    const q = searchQuery.toLowerCase().trim();
    return rawGrid.filter((r) =>
      (r.clientName && r.clientName.toLowerCase().includes(q)) ||
      (r.pwudCode && r.pwudCode.toLowerCase().includes(q)) ||
      (r.lgu && r.lgu.toLowerCase().includes(q)) ||
      (r.cm && r.cm.toLowerCase().includes(q))
    );
  }, [rawGrid, searchQuery]);

  const activeCensusCount = summaries?.activeCensus?.grandTotal ?? summaries?.activeCensus?.subtotal?.total ?? 0;
  const enrollmentsCount = summaries?.enrollments?.grandTotal ?? summaries?.enrollments?.subtotal?.total ?? 0;
  const dischargesCount = summaries?.discharges?.grandTotal ?? summaries?.discharges?.subtotal?.total ?? 0;
  const positiveDtCount = summaries?.positiveDrugTests?.length ?? 0;
  const facilityPerf = summaries?.attendancePerformance?.facilityTotal;
  const facilityRate = facilityPerf?.attendanceRatePercent != null ? `${facilityPerf.attendanceRatePercent}%` : "0%";

  const selectedMonthName = MONTHS.find((m) => m.value === month)?.label || "";

  function toggleCard(id) {
    setExpandedCardId((prev) => (prev === id ? null : id));
  }

  return (
    <AppShell
      title="OP CM Tracker"
      description="MTRC Outpatient Monthly Intervention Overview — Longitudinal Caseload Progress, Census, Discharges, and Drug-Test Surveillance."
    >
      <div style={styles.pageWrapper}>
        {/* Top Breadcrumb Navigation */}
        <div style={styles.topNav}>
          <Link to="/reports" style={styles.backLink}>
            <svg {...iconProps} width="15" height="15">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to DOH Reports
          </Link>
        </div>

        {/* Filter Card */}
        <div style={styles.filterCard}>
          <div style={styles.filterCardHeader}>
            <div style={styles.filterCardTitle}>
              <svg {...iconProps} width="16" height="16" style={{ color: "var(--color-primary, #2F6F4F)" }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Tracker Scope & Scope Controls</span>
            </div>
            {report && (
              <div style={styles.metaBadgeList}>
                <span style={styles.metaChip}>
                  Period: <strong>{selectedMonthName} {year}</strong>
                </span>
                <span style={styles.metaChip}>
                  Active Caseload: <strong>{rawGrid.length} clients</strong>
                </span>
              </div>
            )}
          </div>

          <div style={styles.filtersRow}>
            <label style={styles.filterField}>
              <span style={styles.filterLabel}>Reporting Month</span>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                style={styles.select}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>

            <label style={styles.filterField}>
              <span style={styles.filterLabel}>Reporting Year</span>
              <input
                type="number"
                min={2020}
                max={2050}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                style={styles.inputYear}
              />
            </label>

            {!isCaseManager ? (
              <label style={{ ...styles.filterField, flex: 1, minWidth: 200 }}>
                <span style={styles.filterLabel}>Assigned Case Manager</span>
                <select
                  value={caseManagerId}
                  onChange={(e) => setCaseManagerId(e.target.value)}
                  style={styles.selectCm}
                >
                  <option value="">All Registered Case Managers</option>
                  {caseManagers.map((cm) => (
                    <option key={cm.id} value={cm.id}>{cm.full_name}</option>
                  ))}
                </select>
              </label>
            ) : (
              <div style={{ ...styles.filterField, flex: 1 }}>
                <span style={styles.filterLabel}>Assigned Case Manager</span>
                <div style={styles.cmUserText}>
                  {user?.full_name || "Assigned Caseload"}
                </div>
              </div>
            )}

            <div style={styles.filterActions}>
              <button
                type="button"
                onClick={loadReport}
                disabled={loading}
                style={{ ...styles.primaryBtn, opacity: loading ? 0.7 : 1 }}
              >
                <svg {...iconProps} width="15" height="15">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {loading ? "Generating..." : "Apply Filters"}
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={!report || loading}
                style={{ ...styles.secondaryBtn, opacity: !report || loading ? 0.6 : 1 }}
                title="Download formatted Excel workbook"
              >
                <svg {...iconProps} width="15" height="15" style={{ color: "#059669" }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Export Excel (.xlsx)
              </button>
            </div>
          </div>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Executive KPI Cards — Clean White Surface with Green Accent */}
        {report && (
          <div style={styles.kpiGrid}>
            <div style={styles.kpiCard}>
              <span style={styles.kpiLabel}>ACTIVE CENSUS</span>
              <div style={styles.kpiValue}>{activeCensusCount}</div>
              <div style={styles.kpiSub}>active cases</div>
            </div>

            <div style={styles.kpiCard}>
              <span style={styles.kpiLabel}>ADMISSIONS</span>
              <div style={styles.kpiValue}>{enrollmentsCount}</div>
              <div style={styles.kpiSub}>new this month</div>
            </div>

            <div style={styles.kpiCard}>
              <span style={styles.kpiLabel}>DISCHARGES</span>
              <div style={styles.kpiValue}>{dischargesCount}</div>
              <div style={styles.kpiSub}>completers + attrition</div>
            </div>

            <div style={styles.kpiCard}>
              <span style={styles.kpiLabel}>POSITIVE DTS</span>
              <div style={{ ...styles.kpiValue, color: positiveDtCount > 0 ? "#b91c1c" : "var(--color-primary-dark, #234F39)" }}>
                {positiveDtCount}
              </div>
              <div style={styles.kpiSub}>flagged this month</div>
            </div>

            <div style={styles.kpiCard}>
              <span style={styles.kpiLabel}>ATTENDANCE</span>
              <div style={styles.kpiValue}>{facilityRate}</div>
              <div style={styles.kpiSub}>CBT + PE combined</div>
            </div>
          </div>
        )}

        {/* Minimalist Segmented Navigation Tabs */}
        <div style={styles.tabContainer}>
          <div style={styles.tabBar}>
            {TABS.map((t) => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  style={{
                    ...styles.tabBtn,
                    ...(isActive ? styles.tabBtnActive : {}),
                  }}
                >
                  {t.label}
                  {t.id === "caseload" && report && (
                    <span style={{ ...styles.tabBadge, ...(isActive ? styles.tabBadgeActive : {}) }}>
                      {rawGrid.length}
                    </span>
                  )}
                  {t.id === "dt" && positiveDtCount > 0 && (
                    <span style={styles.tabBadgeDanger}>{positiveDtCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: CASELOAD (Interactive Cards View + Full Matrix Toggle) */}
        {tab === "caseload" && (
          <div style={styles.caseloadSection}>
            {/* Filter and View Switch Toolbar */}
            <div style={styles.caseloadToolbar}>
              <div style={styles.searchBox}>
                <svg {...iconProps} width="15" height="15" style={styles.searchIcon}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Filter by client name, PWUD code, LGU, or case manager..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.searchInput}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    style={styles.clearSearchBtn}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div style={styles.caseloadMetaRight}>
                <span style={styles.countText}>
                  Showing <strong>{filteredGrid.length}</strong> of {rawGrid.length} active cases · click a row to open the case
                </span>

                <div style={styles.viewToggleGroup}>
                  <button
                    type="button"
                    onClick={() => setCaseloadView("cards")}
                    style={{
                      ...styles.viewToggleBtn,
                      ...(caseloadView === "cards" ? styles.viewToggleBtnActive : {}),
                    }}
                    title="Interactive Caseload Cards"
                  >
                    <svg {...iconProps} width="14" height="14">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                    Cards View
                  </button>
                  <button
                    type="button"
                    onClick={() => setCaseloadView("matrix")}
                    style={{
                      ...styles.viewToggleBtn,
                      ...(caseloadView === "matrix" ? styles.viewToggleBtnActive : {}),
                    }}
                    title="Complete DOH 40-Column Spreadsheet Grid"
                  >
                    <svg {...iconProps} width="14" height="14">
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                    Full Matrix Table
                  </button>
                </div>
              </div>
            </div>

            {/* View Mode 1: Interactive Client Caseload Cards (Reference Concept) */}
            {caseloadView === "cards" && (
              <div style={styles.clientCardsList}>
                {filteredGrid.length === 0 ? (
                  <div style={styles.emptyCard}>
                    <p style={{ margin: "0 0 6px", fontWeight: 600, color: "var(--color-text)" }}>
                      No outpatient cases match your search.
                    </p>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      Try adjusting the reporting month or clearing the search filter.
                    </span>
                  </div>
                ) : (
                  filteredGrid.map((row, idx) => {
                    const rowId = row.pwudCode || `client-${idx}`;
                    const isExpanded = expandedCardId === rowId;
                    const initials = getInitials(row.clientName);

                    // Calculate completed milestones count
                    const completedMilestones = MILESTONES_CONFIG.filter((m) => Boolean(row[m.key])).length;

                    // Drug test surveillance status
                    const isPositive = summaries?.positiveDrugTests?.some(
                      (p) => p.clientName?.toLowerCase() === row.clientName?.toLowerCase()
                    );
                    const dtStatus = isPositive
                      ? { label: "Positive", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" }
                      : row.drugTestsConducted > 0
                      ? { label: "Negative", color: "#15803d", bg: "#dcfce7", border: "#bbf7d0" }
                      : { label: "No test yet", color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" };

                    // Status attention tag
                    let statusTag = null;
                    if (row.newEnrollee === 1) {
                      statusTag = { text: "Recent enrollee", bg: "#fef3c7", color: "#92400e" };
                    } else if (row.dateOfDischarge) {
                      statusTag = { text: "Discharged", bg: "#f1f5f9", color: "#475569" };
                    } else if (completedMilestones < 3) {
                      statusTag = { text: "New admission", bg: "#e0f2fe", color: "#0369a1" };
                    } else {
                      statusTag = { text: "Active", bg: "var(--color-primary-tint, #E7F2EC)", color: "var(--color-primary-dark, #234F39)" };
                    }

                    return (
                      <div
                        key={rowId}
                        style={{
                          ...styles.clientCard,
                          ...(isExpanded ? styles.clientCardExpanded : {}),
                        }}
                      >
                        {/* Summary Header Row (Clickable) */}
                        <div
                          style={styles.clientCardHeader}
                          onClick={() => toggleCard(rowId)}
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                        >
                          {/* Col 1: Avatar Initials */}
                          <div style={styles.avatarWrap}>
                            <span style={styles.avatarText}>{initials}</span>
                          </div>

                          {/* Col 2: Client Name & Code/LGU */}
                          <div style={styles.clientIdentCol}>
                            <span style={styles.clientCardName}>{row.clientName}</span>
                            <span style={styles.clientCardMeta}>
                              <code style={styles.codeSnippet}>{row.pwudCode}</code>
                              <span>·</span>
                              <span>{row.lgu || "Unspecified LGU"}</span>
                            </span>
                          </div>

                          {/* Col 3: Case Manager & Category */}
                          <div style={styles.cmCategoryCol}>
                            <span style={styles.cmNameText}>{row.cmFullName || row.cm}</span>
                            <span style={styles.categoryPill}>{row.category}</span>
                          </div>

                          {/* Col 4: 12 Milestone Visual Dots Indicator */}
                          <div style={styles.milestoneDotsCol}>
                            <div style={styles.dotsRow}>
                              {MILESTONES_CONFIG.map((m, mIdx) => {
                                const isDone = Boolean(row[m.key]);
                                return (
                                  <span
                                    key={m.key}
                                    title={`${m.label}: ${isDone ? fmtDate(row[m.key]) : "Pending"}`}
                                    style={{
                                      ...styles.milestoneDot,
                                      ...(isDone ? styles.milestoneDotDone : styles.milestoneDotPending),
                                    }}
                                  />
                                );
                              })}
                            </div>
                            <span style={styles.milestoneCountLabel}>
                              {completedMilestones} of 12 milestones
                            </span>
                          </div>

                          {/* Col 5: Session Quick Progress */}
                          <div style={styles.sessionsQuickCol}>
                            <span style={styles.sessionQuickText}>
                              CBT <strong>{row.attendedCbtSessions}</strong> / {row.scheduledCbtSessions || 28}
                            </span>
                            <span style={styles.sessionQuickText}>
                              PE <strong>{row.attendedPeSessions}</strong> / {row.scheduledPeSessions || 12}
                            </span>
                          </div>

                          {/* Col 6: Drug Test Status */}
                          <div style={styles.dtStatusCol}>
                            <span
                              style={{
                                ...styles.dtBadge,
                                color: dtStatus.color,
                                background: dtStatus.bg,
                                borderColor: dtStatus.border,
                              }}
                            >
                              <span style={{ ...styles.dtDot, background: dtStatus.color }} />
                              {dtStatus.label}
                            </span>
                          </div>

                          {/* Col 7: Status Attention Chip & Chevron */}
                          <div style={styles.chevronCol}>
                            {statusTag && (
                              <span
                                style={{
                                  ...styles.statusChip,
                                  background: statusTag.bg,
                                  color: statusTag.color,
                                }}
                              >
                                {statusTag.text}
                              </span>
                            )}
                            <svg
                              {...iconProps}
                              width="16"
                              height="16"
                              style={{
                                ...styles.chevronIcon,
                                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                              }}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </div>

                        {/* Expandable Accordion Body (Reveals Clinical Timeline, Sessions, DT, Comorbidities) */}
                        {isExpanded && (
                          <div style={styles.clientCardBody}>
                            <div style={styles.detailsGrid}>
                              {/* Sub-Panel 1: Milestone Timeline */}
                              <div style={styles.detailSection}>
                                <div style={styles.detailSectionTitle}>
                                  <svg {...iconProps} width="14" height="14" style={{ color: "var(--color-primary, #2F6F4F)" }}>
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  <span>MILESTONE TIMELINE</span>
                                </div>
                                <div style={styles.timelineList}>
                                  {MILESTONES_CONFIG.map((m) => {
                                    const dateVal = row[m.key];
                                    const isDone = Boolean(dateVal);
                                    return (
                                      <div key={m.key} style={styles.timelineItem}>
                                        <div
                                          style={{
                                            ...styles.timelineMarker,
                                            background: isDone ? "var(--color-primary, #2F6F4F)" : "#ffffff",
                                            borderColor: isDone ? "var(--color-primary, #2F6F4F)" : "#cbd5e1",
                                          }}
                                        />
                                        <div style={styles.timelineTextWrap}>
                                          <span style={styles.timelineLabel}>{m.label}</span>
                                          <span
                                            style={{
                                              ...styles.timelineDate,
                                              color: isDone ? "var(--color-primary-dark, #234F39)" : "var(--color-text-muted)",
                                              fontWeight: isDone ? 600 : 400,
                                            }}
                                          >
                                            {isDone ? fmtDate(dateVal) : "Pending"}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Sub-Panel 2: Sessions — Scheduled / Attended */}
                              <div style={styles.detailSection}>
                                <div style={styles.detailSectionTitle}>
                                  <svg {...iconProps} width="14" height="14" style={{ color: "var(--color-primary, #2F6F4F)" }}>
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                  </svg>
                                  <span>SESSIONS — SCHEDULED / ATTENDED</span>
                                </div>
                                <div style={styles.sessionsTable}>
                                  <div style={styles.sessionRow}>
                                    <span style={styles.sessionRowLabel}>CBT (Group Counseling)</span>
                                    <span style={styles.sessionRowVal}>
                                      <strong>{row.attendedCbtSessions}</strong> / {row.scheduledCbtSessions || 28}
                                    </span>
                                  </div>
                                  <div style={styles.progressBarWrap}>
                                    <div
                                      style={{
                                        ...styles.progressBarFill,
                                        width: `${Math.min(100, Math.round((row.attendedCbtSessions / (row.scheduledCbtSessions || 28)) * 100))}%`,
                                      }}
                                    />
                                  </div>

                                  <div style={styles.sessionRow}>
                                    <span style={styles.sessionRowLabel}>Psycho-Education (PE)</span>
                                    <span style={styles.sessionRowVal}>
                                      <strong>{row.attendedPeSessions}</strong> / {row.scheduledPeSessions || 12}
                                    </span>
                                  </div>
                                  <div style={styles.progressBarWrap}>
                                    <div
                                      style={{
                                        ...styles.progressBarFill,
                                        width: `${Math.min(100, Math.round((row.attendedPeSessions / (row.scheduledPeSessions || 12)) * 100))}%`,
                                      }}
                                    />
                                  </div>

                                  <div style={styles.sessionRow}>
                                    <span style={styles.sessionRowLabel}>SHGM (Self-Help Meetings)</span>
                                    <span style={styles.sessionRowVal}>
                                      <strong>{row.attendedShgmSessions}</strong> / 6
                                    </span>
                                  </div>

                                  <div style={styles.sessionRow}>
                                    <span style={styles.sessionRowLabel}>Individual Counseling (ICA)</span>
                                    <span style={styles.sessionRowVal}>
                                      <strong>{row.individualCounselingSessions}</strong> / 26
                                    </span>
                                  </div>

                                  <div style={styles.sessionRow}>
                                    <span style={styles.sessionRowLabel}>Conjoint Family Sessions</span>
                                    <span style={styles.sessionRowVal}>
                                      <strong>{row.conjointFamilySessions}</strong> / —
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Sub-Panel 3: Drug Test Log, Discharge & Comorbidities */}
                              <div style={styles.detailSection}>
                                {/* Drug Test Log */}
                                <div style={styles.detailSectionTitle}>
                                  <svg {...iconProps} width="14" height="14" style={{ color: "var(--color-primary, #2F6F4F)" }}>
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  </svg>
                                  <span>DRUG TEST SURVEILLANCE LOG</span>
                                </div>
                                <div style={styles.subDetailBox}>
                                  {row.drugTestsConducted > 0 ? (
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <span style={{ fontSize: 12 }}>
                                        Tests Conducted: <strong>{row.drugTestsConducted}</strong>
                                      </span>
                                      <span
                                        style={{
                                          ...styles.dtBadge,
                                          color: dtStatus.color,
                                          background: dtStatus.bg,
                                          borderColor: dtStatus.border,
                                        }}
                                      >
                                        <span style={{ ...styles.dtDot, background: dtStatus.color }} />
                                        {dtStatus.label}
                                      </span>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                                      No drug test recorded this reporting period.
                                    </span>
                                  )}
                                </div>

                                {/* Discharge Box */}
                                <div style={{ ...styles.detailSectionTitle, marginTop: 14 }}>
                                  <svg {...iconProps} width="14" height="14" style={{ color: "var(--color-primary, #2F6F4F)" }}>
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                  </svg>
                                  <span>DISCHARGE & DISPOSITION</span>
                                </div>
                                <div style={styles.subDetailBox}>
                                  {row.dateOfDischarge ? (
                                    <div>
                                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)" }}>
                                        Discharged on {fmtDate(row.dateOfDischarge)}
                                      </div>
                                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                                        Status: {row.statusOfDischarge || "Completer"}
                                      </div>
                                      {row.remarks && (
                                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                                          Remarks: {row.remarks}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                                      Active case — no discharge recorded.
                                    </span>
                                  )}
                                </div>

                                {/* Comorbidities Box */}
                                <div style={{ ...styles.detailSectionTitle, marginTop: 14 }}>
                                  <svg {...iconProps} width="14" height="14" style={{ color: "var(--color-primary, #2F6F4F)" }}>
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                  </svg>
                                  <span>COMORBIDITIES & CONSULTATIONS</span>
                                </div>
                                <div style={styles.subDetailBox}>
                                  {row.comorbidityDetails || row.consultTypeWithinMtrc ? (
                                    <div>
                                      {row.comorbidityDetails && (
                                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)" }}>
                                          {row.comorbidityDetails}
                                        </div>
                                      )}
                                      {row.consultTypeWithinMtrc && (
                                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                                          Internal Consult: {row.consultTypeWithinMtrc}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                                      None recorded
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* View Mode 2: Complete DOH 40-Column Spreadsheet Grid */}
            {caseloadView === "matrix" && (
              <div style={styles.matrixContainer}>
                <table style={styles.matrixTable}>
                  <thead>
                    {/* Super-Header Clinical Domains */}
                    <tr>
                      {GRID_COLUMN_GROUPS.map((group) => {
                        const isStickyGroup = group.columns.some((c) => c.sticky);
                        return (
                          <th
                            key={group.name}
                            colSpan={group.columns.length}
                            style={{
                              ...styles.superTh,
                              background: group.headerBg,
                              borderRight: `1px solid ${group.headerBorder}`,
                              ...(isStickyGroup ? { position: "sticky", left: 0, zIndex: 6 } : {}),
                            }}
                          >
                            {group.name}
                          </th>
                        );
                      })}
                    </tr>
                    {/* Sub-Header Column Labels */}
                    <tr>
                      {FLAT_GRID_COLUMNS.map((col) => {
                        const stickyLeft =
                          col.key === "rowNum"
                            ? 0
                            : col.key === "pwudCode"
                            ? 48
                            : col.key === "clientName"
                            ? 188
                            : undefined;

                        const isLastSticky = col.key === "clientName";

                        return (
                          <th
                            key={col.key}
                            style={{
                              ...styles.matrixTh,
                              minWidth: col.width || 90,
                              textAlign: col.align || "left",
                              ...(col.sticky ? { ...styles.stickyTh, left: stickyLeft } : {}),
                              ...(isLastSticky ? styles.lastStickyBorder : {}),
                            }}
                          >
                            {col.label}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGrid.length === 0 ? (
                      <tr>
                        <td colSpan={FLAT_GRID_COLUMNS.length} style={styles.emptyTd}>
                          {searchQuery
                            ? `No outpatient clients match "${searchQuery}".`
                            : "No outpatient caseload records found for this reporting period."}
                        </td>
                      </tr>
                    ) : (
                      filteredGrid.map((row, idx) => {
                        const rowData = { ...row, _rowNum: idx + 1 };
                        const isEven = idx % 2 === 1;

                        return (
                          <tr key={`${row.pwudCode}-${idx}`} style={{ ...styles.matrixRow, background: isEven ? "#fcfcfb" : "#ffffff" }}>
                            {FLAT_GRID_COLUMNS.map((col) => {
                              const stickyLeft =
                                col.key === "rowNum"
                                  ? 0
                                  : col.key === "pwudCode"
                                  ? 48
                                  : col.key === "clientName"
                                  ? 188
                                  : undefined;

                              const isLastSticky = col.key === "clientName";

                              return (
                                <td
                                  key={col.key}
                                  style={{
                                    ...styles.matrixTd,
                                    textAlign: col.align || "left",
                                    ...(col.sticky ? { ...styles.stickyTd, left: stickyLeft, background: isEven ? "#fcfcfb" : "#ffffff" } : {}),
                                    ...(isLastSticky ? styles.lastStickyBorder : {}),
                                  }}
                                >
                                  {fmtCell(rowData, col)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CENSUS & ENROLLMENTS (Matching Image 2) */}
        {tab === "census" && summaries && (
          <div style={styles.stackedCards}>
            {/* Enrollment by Case Manager and Referral Category */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>
                    ENROLLMENT BY CASE MANAGER AND REFERRAL CATEGORY — {selectedMonthName.toUpperCase()} {year}
                  </h3>
                  <p style={styles.cardSubtitle}>
                    Active admissions distribution across voluntary, LGU-referred, and court-mandated tracks.
                  </p>
                </div>
                <div style={styles.totalBadge}>
                  <span style={styles.totalBadgeLabel}>Total Active:</span>
                  <span style={styles.totalBadgeValue}>{activeCensusCount}</span>
                </div>
              </div>

              <div style={styles.tableWrap}>
                <table style={styles.cleanTable}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: "34%" }}>CASE MANAGER</th>
                      <th style={{ ...styles.th, textAlign: "center", width: "22%" }}>VOLUNTARY</th>
                      <th style={{ ...styles.th, textAlign: "center", width: "22%" }}>LGU-REFERRED</th>
                      <th style={{ ...styles.th, textAlign: "center", width: "22%" }}>COURT-MANDATED</th>
                      <th style={{ ...styles.th, textAlign: "center", width: "12%" }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summaries.activeCensus?.rows || []).length === 0 ? (
                      <tr><td colSpan={5} style={styles.emptyTd}>No active case manager records for this period.</td></tr>
                    ) : (
                      summaries.activeCensus.rows.map((row, idx) => {
                        const volTotal = (row.Voluntary?.Male || 0) + (row.Voluntary?.Female || 0);
                        const lguTotal = (row["LGU-Referred"]?.Male || 0) + (row["LGU-Referred"]?.Female || 0);
                        const courtTotal = (row["Court-mandated"]?.Male || 0) + (row["Court-mandated"]?.Female || 0);
                        return (
                          <tr key={row.caseManager} style={{ ...styles.tr, background: idx % 2 === 1 ? "#fafaf9" : "#ffffff" }}>
                            <td style={{ ...styles.td, fontWeight: 600, color: "var(--color-text)" }}>{row.caseManager}</td>
                            <td style={{ ...styles.td, textAlign: "center" }}>{volTotal}</td>
                            <td style={{ ...styles.td, textAlign: "center" }}>{lguTotal}</td>
                            <td style={{ ...styles.td, textAlign: "center" }}>{courtTotal}</td>
                            <td style={{ ...styles.td, textAlign: "center", fontWeight: 700, color: "var(--color-primary-dark, #234F39)" }}>
                              {row.total}
                            </td>
                          </tr>
                        );
                      })
                    )}
                    {summaries.activeCensus?.subtotal && (
                      <tr style={styles.subtotalRow}>
                        <td style={{ ...styles.td, fontWeight: 800 }}>All case managers</td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 800 }}>
                          {(summaries.activeCensus.subtotal.Voluntary?.Male || 0) + (summaries.activeCensus.subtotal.Voluntary?.Female || 0)}
                        </td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 800 }}>
                          {(summaries.activeCensus.subtotal["LGU-Referred"]?.Male || 0) + (summaries.activeCensus.subtotal["LGU-Referred"]?.Female || 0)}
                        </td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 800 }}>
                          {(summaries.activeCensus.subtotal["Court-mandated"]?.Male || 0) + (summaries.activeCensus.subtotal["Court-mandated"]?.Female || 0)}
                        </td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 800, color: "var(--color-primary-dark, #234F39)" }}>
                          {activeCensusCount}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Aftercare Enrollment (OP-ACP Only) */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>AFTERCARE ENROLLMENT (OP-ACP ONLY)</h3>
                  <p style={styles.cardSubtitle}>
                    Residential aftercare (RES-ACP) is out of scope and intentionally not shown here.
                  </p>
                </div>
              </div>

              <div style={styles.tableWrap}>
                <table style={styles.cleanTable}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: "70%" }}>TRACK</th>
                      <th style={{ ...styles.th, textAlign: "center", width: "30%" }}>ENROLLED</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>Outpatient aftercare (OP-ACP)</td>
                      <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DISCHARGES & ATTRITION (Matching Image 3) */}
        {tab === "discharges" && summaries && (
          <div style={styles.stackedCards}>
            {/* Discharges this Month by Reason */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>DISCHARGES THIS MONTH, BY REASON</h3>
                  <p style={styles.cardSubtitle}>
                    Summary of program completers, non-compliance exits, and court transfers for {selectedMonthName} {year}.
                  </p>
                </div>
                <div style={styles.totalBadge}>
                  <span style={styles.totalBadgeLabel}>Total Discharges:</span>
                  <span style={styles.totalBadgeValue}>{dischargesCount}</span>
                </div>
              </div>

              <div style={styles.tableWrap}>
                <table style={styles.cleanTable}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: "75%" }}>REASON</th>
                      <th style={{ ...styles.th, textAlign: "center", width: "25%" }}>COUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={styles.tr}>
                      <td style={styles.td}>Graduate (completed program)</td>
                      <td style={{ ...styles.td, textAlign: "center", fontWeight: 600 }}>
                        {summaries.discharges?.subtotal?.Completer ? (summaries.discharges.subtotal.Completer.Male + summaries.discharges.subtotal.Completer.Female) : 0}
                      </td>
                    </tr>
                    <tr style={{ ...styles.tr, background: "#fafaf9" }}>
                      <td style={styles.td}>Non-compliance</td>
                      <td style={{ ...styles.td, textAlign: "center", fontWeight: 600 }}>
                        {summaries.discharges?.subtotal?.["Non-compliance"] ? (summaries.discharges.subtotal["Non-compliance"].Male + summaries.discharges.subtotal["Non-compliance"].Female) : 0}
                      </td>
                    </tr>
                    <tr style={styles.tr}>
                      <td style={styles.td}>Early release</td>
                      <td style={{ ...styles.td, textAlign: "center", fontWeight: 600 }}>0</td>
                    </tr>
                    <tr style={{ ...styles.tr, background: "#fafaf9" }}>
                      <td style={styles.td}>Turned over per court order</td>
                      <td style={{ ...styles.td, textAlign: "center", fontWeight: 600 }}>
                        {summaries.discharges?.subtotal?.Incarcerated ? (summaries.discharges.subtotal.Incarcerated.Male + summaries.discharges.subtotal.Incarcerated.Female) : 0}
                      </td>
                    </tr>
                    <tr style={styles.tr}>
                      <td style={styles.td}>Death</td>
                      <td style={{ ...styles.td, textAlign: "center", fontWeight: 600 }}>0</td>
                    </tr>
                    <tr style={styles.subtotalRow}>
                      <td style={{ ...styles.td, fontWeight: 800 }}>Total</td>
                      <td style={{ ...styles.td, textAlign: "center", fontWeight: 800, color: "var(--color-primary-dark, #234F39)" }}>
                        {dischargesCount}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Non-Completer List */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>NON-COMPLETER LIST</h3>
                  <p style={styles.cardSubtitle}>
                    Clients who exited prior to program graduation during {selectedMonthName} {year}.
                  </p>
                </div>
              </div>

              <div style={styles.tableWrap}>
                <table style={styles.cleanTable}>
                  <thead>
                    <tr>
                      <th style={styles.th}>NAME</th>
                      <th style={{ ...styles.th, textAlign: "center" }}>SEX</th>
                      <th style={styles.th}>ENROLLED</th>
                      <th style={styles.th}>DISCHARGED</th>
                      <th style={styles.th}>REASON</th>
                      <th style={{ ...styles.th, textAlign: "center" }}>MONTHS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summaries.nonCompleters || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} style={styles.emptyTd}>
                          No non-completers recorded this month.
                        </td>
                      </tr>
                    ) : (
                      summaries.nonCompleters.map((r, i) => (
                        <tr key={i} style={{ ...styles.tr, background: i % 2 === 1 ? "#fafaf9" : "#ffffff" }}>
                          <td style={{ ...styles.td, fontWeight: 600 }}>{r.clientName}</td>
                          <td style={{ ...styles.td, textAlign: "center" }}>{r.sex}</td>
                          <td style={styles.td}>{fmtDate(r.dateEnrolled)}</td>
                          <td style={styles.td}>{fmtDate(r.dateDischarged)}</td>
                          <td style={styles.td}>{r.reason}</td>
                          <td style={{ ...styles.td, textAlign: "center" }}>{r.monthsInProgram}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DRUG TEST SURVEILLANCE (Matching Image 4) */}
        {tab === "dt" && summaries && (
          <div style={styles.stackedCards}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>POSITIVE DRUG TEST RESULTS THIS MONTH</h3>
                  <p style={styles.cardSubtitle}>
                    Active surveillance across all outpatient cohorts for {selectedMonthName} {year}.
                  </p>
                </div>
                <div style={styles.totalBadge}>
                  <span style={styles.totalBadgeLabel}>Flagged:</span>
                  <span style={{ ...styles.totalBadgeValue, color: positiveDtCount > 0 ? "#b91c1c" : "var(--color-primary-dark, #234F39)" }}>
                    {positiveDtCount}
                  </span>
                </div>
              </div>

              <div style={styles.tableWrap}>
                <table style={styles.cleanTable}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: "30%" }}>CASE MANAGER</th>
                      <th style={{ ...styles.th, width: "30%" }}>CLIENT</th>
                      <th style={{ ...styles.th, width: "25%" }}>SUBSTANCE</th>
                      <th style={{ ...styles.th, textAlign: "center", width: "15%" }}>MONTHS IN PROGRAM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summaries.positiveDrugTests || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} style={styles.emptyTd}>
                          No positive drug test results detected for this reporting period.
                        </td>
                      </tr>
                    ) : (
                      summaries.positiveDrugTests.map((r, i) => (
                        <tr key={i} style={{ ...styles.tr, background: i % 2 === 1 ? "#fafaf9" : "#ffffff" }}>
                          <td style={styles.td}>{r.caseManager}</td>
                          <td style={{ ...styles.td, fontWeight: 600 }}>{r.clientName}</td>
                          <td style={styles.td}>
                            <span style={styles.dangerPill}>
                              <span style={styles.dangerDot} />
                              {r.substanceDetected}
                            </span>
                          </td>
                          <td style={{ ...styles.td, textAlign: "center" }}>
                            <span style={styles.monthBadge}>{r.monthsInProgramLabel || r.monthsInProgram || 1}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <p style={styles.tableFooterNote}>
                This list is program-wide across every case manager's caseload — separate from the individual drug-test log inside a single client's case detail.
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: STAFF PERFORMANCE (Matching Image 5) */}
        {tab === "performance" && summaries && (
          <div style={styles.stackedCards}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>
                    ATTENDANCE RATE — TARGET VS. ACTUAL, BY CASE MANAGER
                  </h3>
                  <p style={styles.cardSubtitle}>
                    Attendance Rate (%) = [Actual Attended (CBT + PE) ÷ Target Scheduled (CBT + PE)] × 100
                  </p>
                </div>
                <div style={styles.totalBadge}>
                  <span style={styles.totalBadgeLabel}>Facility Average:</span>
                  <span style={styles.totalBadgeValue}>{facilityRate}</span>
                </div>
              </div>

              <div style={styles.tableWrap}>
                <table style={styles.cleanTable}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: "35%" }}>CASE MANAGER</th>
                      <th style={{ ...styles.th, textAlign: "center", width: "20%" }}>TARGET SESSIONS</th>
                      <th style={{ ...styles.th, textAlign: "center", width: "20%" }}>ACTUAL SESSIONS</th>
                      <th style={{ ...styles.th, width: "25%" }}>RATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(summaries.attendancePerformance)
                      ? summaries.attendancePerformance
                      : summaries.attendancePerformance?.rows || []
                    ).map((row, idx) => {
                      const rate = row.attendanceRatePercent ?? 0;
                      const hasRate = row.targetScheduled > 0;
                      return (
                        <tr key={row.caseManager} style={{ ...styles.tr, background: idx % 2 === 1 ? "#fafaf9" : "#ffffff" }}>
                          <td style={{ ...styles.td, fontWeight: 600 }}>{row.caseManager}</td>
                          <td style={{ ...styles.td, textAlign: "center" }}>{row.targetScheduled}</td>
                          <td style={{ ...styles.td, textAlign: "center" }}>{row.actualAttended}</td>
                          <td style={styles.td}>
                            {hasRate ? (
                              <div style={styles.rateColWrap}>
                                <div style={styles.rateBarContainer}>
                                  <div
                                    style={{
                                      ...styles.rateBarFill,
                                      width: `${Math.min(100, rate)}%`,
                                      background: rate >= 75 ? "var(--color-primary, #2F6F4F)" : "#d97706",
                                    }}
                                  />
                                </div>
                                <span style={styles.ratePercentText}>{rate}%</span>
                              </div>
                            ) : (
                              <span style={styles.zeroMuted}>N/A</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

const styles = {
  pageWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  topNav: {
    display: "flex",
    alignItems: "center",
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "var(--color-primary-dark, #234F39)",
    textDecoration: "none",
    fontWeight: 600,
    padding: "5px 10px",
    borderRadius: "var(--radius-sm, 6px)",
    background: "var(--color-primary-tint, #E7F2EC)",
    transition: "background 0.15s ease",
  },

  // Filter Card
  filterCard: {
    background: "#ffffff",
    border: "1px solid var(--color-border, #e7e3d9)",
    borderRadius: "var(--radius-md, 10px)",
    padding: "16px 20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
  },
  filterCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: "1px solid var(--color-border, #e7e3d9)",
  },
  filterCardTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 700,
    color: "var(--color-text, #1f2421)",
  },
  metaBadgeList: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  metaChip: {
    fontSize: 12,
    color: "var(--color-text, #1f2421)",
    background: "#f1f5f9",
    padding: "3px 10px",
    borderRadius: 999,
    border: "1px solid #e2e8f0",
  },
  filtersRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: 14,
  },
  filterField: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--color-text-muted, #6b7268)",
  },
  select: {
    height: 38,
    padding: "0 12px",
    borderRadius: "var(--radius-sm, 6px)",
    border: "1px solid var(--color-border, #e7e3d9)",
    background: "#ffffff",
    fontSize: 13,
    color: "var(--color-text, #1f2421)",
    minWidth: 140,
    cursor: "pointer",
    outline: "none",
  },
  selectCm: {
    height: 38,
    padding: "0 12px",
    borderRadius: "var(--radius-sm, 6px)",
    border: "1px solid var(--color-border, #e7e3d9)",
    background: "#ffffff",
    fontSize: 13,
    color: "var(--color-text, #1f2421)",
    width: "100%",
    minWidth: 200,
    cursor: "pointer",
    outline: "none",
  },
  inputYear: {
    height: 38,
    padding: "0 12px",
    borderRadius: "var(--radius-sm, 6px)",
    border: "1px solid var(--color-border, #e7e3d9)",
    background: "#ffffff",
    fontSize: 13,
    color: "var(--color-text, #1f2421)",
    width: 90,
    outline: "none",
  },
  cmUserText: {
    height: 38,
    display: "flex",
    alignItems: "center",
    padding: "0 12px",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--color-text, #1f2421)",
    background: "#f8fafc",
    borderRadius: "var(--radius-sm, 6px)",
    border: "1px solid var(--color-border, #e7e3d9)",
  },
  filterActions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  primaryBtn: {
    height: 38,
    padding: "0 18px",
    background: "var(--color-primary, #2F6F4F)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm, 6px)",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
    transition: "background 0.15s ease",
  },
  secondaryBtn: {
    height: 38,
    padding: "0 16px",
    background: "#ffffff",
    color: "var(--color-text, #1f2421)",
    border: "1px solid var(--color-border, #e7e3d9)",
    borderRadius: "var(--radius-sm, 6px)",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
    transition: "all 0.15s ease",
  },

  // KPI Overview — Clean White Cards with Green Theme
  kpiGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
  },
  kpiCard: {
    background: "#ffffff",
    border: "1px solid var(--color-border, #e7e3d9)",
    borderTop: "3px solid var(--color-primary, #2F6F4F)",
    borderRadius: "var(--radius-md, 8px)",
    padding: "12px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 3,
    minWidth: 155,
    maxWidth: 215,
    flex: "0 1 auto",
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "var(--color-text-muted, #6b7268)",
    whiteSpace: "nowrap",
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 800,
    color: "var(--color-primary-dark, #234F39)",
    lineHeight: 1.2,
  },
  kpiSub: {
    fontSize: 11,
    color: "var(--color-text-muted, #6b7268)",
    whiteSpace: "nowrap",
  },

  // Segmented Navigation Tabs
  tabContainer: {
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 2,
  },
  tabBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  tabBtn: {
    padding: "9px 16px",
    border: "none",
    borderBottom: "2px solid transparent",
    background: "transparent",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--color-text-muted, #6b7268)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: "all 0.15s ease",
  },
  tabBtnActive: {
    color: "var(--color-primary-dark, #234F39)",
    borderBottom: "2px solid var(--color-primary, #2F6F4F)",
    fontWeight: 700,
  },
  tabBadge: {
    fontSize: 11,
    fontWeight: 700,
    background: "#e2e8f0",
    color: "#475569",
    padding: "1px 7px",
    borderRadius: 999,
  },
  tabBadgeActive: {
    background: "var(--color-primary-tint, #E7F2EC)",
    color: "var(--color-primary-dark, #234F39)",
  },
  tabBadgeDanger: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "1px 7px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
  },

  // Caseload Section
  caseloadSection: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  caseloadToolbar: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#ffffff",
    border: "1px solid var(--color-border, #e7e3d9)",
    borderRadius: "var(--radius-sm, 6px)",
    padding: "0 12px",
    height: 38,
    flex: "1 1 320px",
    maxWidth: 480,
  },
  searchIcon: {
    color: "var(--color-text-muted, #6b7268)",
    flexShrink: 0,
  },
  searchInput: {
    border: "none",
    outline: "none",
    fontSize: 13,
    width: "100%",
    background: "transparent",
  },
  clearSearchBtn: {
    background: "none",
    border: "none",
    color: "var(--color-text-muted, #6b7268)",
    cursor: "pointer",
    fontSize: 12,
    padding: 0,
  },
  caseloadMetaRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  countText: {
    fontSize: 12,
    color: "var(--color-text-muted, #6b7268)",
  },
  viewToggleGroup: {
    display: "flex",
    alignItems: "center",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: "var(--radius-sm, 6px)",
    padding: 2,
    gap: 2,
  },
  viewToggleBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--color-text-muted, #6b7268)",
    border: "none",
    background: "transparent",
    borderRadius: 4,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  viewToggleBtnActive: {
    background: "#ffffff",
    color: "var(--color-primary-dark, #234F39)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  },

  // Interactive Client Caseload Cards (Design from Image 1)
  clientCardsList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  clientCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "var(--radius-md, 8px)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
    overflow: "hidden",
    transition: "all 0.2s ease-in-out",
  },
  clientCardExpanded: {
    borderColor: "var(--color-primary, #2F6F4F)",
    boxShadow: "0 4px 12px rgba(47, 111, 79, 0.08)",
  },
  clientCardHeader: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    gap: 14,
    cursor: "pointer",
    userSelect: "none",
    background: "#ffffff",
    transition: "background 0.15s ease",
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "var(--color-primary-tint, #E7F2EC)",
    color: "var(--color-primary-dark, #234F39)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontWeight: 700,
    fontSize: 13,
    border: "1px solid rgba(47, 111, 79, 0.15)",
  },
  avatarText: {
    letterSpacing: "0.02em",
  },
  clientIdentCol: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 180,
    flex: "1 1 180px",
  },
  clientCardName: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--color-text, #1f2421)",
  },
  clientCardMeta: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "var(--color-text-muted, #6b7268)",
  },
  codeSnippet: {
    fontFamily: "monospace",
    fontSize: 11,
    background: "#f1f5f9",
    padding: "1px 5px",
    borderRadius: 3,
    border: "1px solid #e2e8f0",
  },
  cmCategoryCol: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 130,
  },
  cmNameText: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--color-text, #1f2421)",
  },
  categoryPill: {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 700,
    color: "var(--color-primary-dark, #234F39)",
    background: "var(--color-primary-tint, #E7F2EC)",
    padding: "1px 6px",
    borderRadius: 4,
    width: "fit-content",
  },
  milestoneDotsCol: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 150,
  },
  dotsRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  milestoneDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    display: "inline-block",
  },
  milestoneDotDone: {
    background: "var(--color-primary, #2F6F4F)",
  },
  milestoneDotPending: {
    border: "1.5px solid #cbd5e1",
    background: "transparent",
  },
  milestoneCountLabel: {
    fontSize: 11,
    color: "var(--color-text-muted, #6b7268)",
  },
  sessionsQuickCol: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 110,
  },
  sessionQuickText: {
    fontSize: 11,
    color: "var(--color-text, #1f2421)",
  },
  dtStatusCol: {
    minWidth: 100,
  },
  dtBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    border: "1px solid",
  },
  dtDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
  },
  chevronCol: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginLeft: "auto",
  },
  statusChip: {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 4,
    whiteSpace: "nowrap",
  },
  chevronIcon: {
    color: "var(--color-text-muted, #6b7268)",
    transition: "transform 0.2s ease",
  },

  // Accordion Details Panel
  clientCardBody: {
    borderTop: "1px solid #f1f5f9",
    background: "#fafbf9",
    padding: "16px 20px",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 20,
  },
  detailSection: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  detailSectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--color-text-muted, #6b7268)",
    paddingBottom: 4,
    borderBottom: "1px solid #e2e8f0",
  },
  timelineList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    position: "relative",
    paddingLeft: 8,
  },
  timelineItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
  },
  timelineMarker: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    border: "2px solid",
    marginTop: 3,
    flexShrink: 0,
  },
  timelineTextWrap: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    width: "100%",
    gap: 8,
  },
  timelineLabel: {
    fontSize: 12,
    color: "var(--color-text, #1f2421)",
  },
  timelineDate: {
    fontSize: 11,
    whiteSpace: "nowrap",
  },

  // Sessions Table & Progress
  sessionsTable: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  sessionRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 12,
    color: "var(--color-text, #1f2421)",
  },
  sessionRowLabel: {
    color: "var(--color-text-muted, #6b7268)",
  },
  sessionRowVal: {
    fontSize: 12,
  },
  progressBarWrap: {
    width: "100%",
    height: 5,
    background: "#e2e8f0",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressBarFill: {
    height: "100%",
    background: "var(--color-primary, #2F6F4F)",
    borderRadius: 3,
    transition: "width 0.4s ease-out",
  },
  subDetailBox: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    padding: "8px 12px",
  },

  // Full Matrix Spreadsheet Container
  matrixContainer: {
    overflow: "auto",
    maxHeight: "72vh",
    border: "1px solid var(--color-border, #e7e3d9)",
    borderRadius: "var(--radius-md, 10px)",
    background: "#ffffff",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  matrixTable: {
    borderCollapse: "separate",
    borderSpacing: 0,
    fontSize: 12,
    minWidth: "100%",
  },
  superTh: {
    color: "#ffffff",
    padding: "8px 10px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    textAlign: "center",
    position: "sticky",
    top: 0,
    zIndex: 4,
    borderBottom: "1px solid rgba(255,255,255,0.15)",
  },
  matrixTh: {
    background: "#f8fafc",
    color: "#334155",
    padding: "9px 12px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 33,
    zIndex: 3,
    borderBottom: "2px solid #cbd5e1",
    borderRight: "1px solid #e2e8f0",
  },
  stickyTh: {
    position: "sticky",
    zIndex: 5,
    background: "#f1f5f9",
  },
  lastStickyBorder: {
    borderRight: "2px solid #cbd5e1 !important",
    boxShadow: "4px 0 6px rgba(0,0,0,0.03)",
  },
  matrixRow: {
    transition: "background 0.1s ease",
  },
  matrixTd: {
    padding: "9px 12px",
    borderBottom: "1px solid #e2e8f0",
    borderRight: "1px solid #f1f5f9",
    whiteSpace: "nowrap",
    fontSize: 12,
    color: "var(--color-text, #1f2421)",
  },
  stickyTd: {
    position: "sticky",
    zIndex: 2,
  },

  // Cell formatting badges
  rowNumBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--color-text-muted, #6b7268)",
  },
  codeBadge: {
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 6px",
    borderRadius: 4,
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    color: "#334155",
  },
  yesBadge: {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#15803d",
    border: "1px solid #bbf7d0",
  },
  noMuted: {
    color: "var(--color-text-muted, #6b7268)",
    fontSize: 11,
  },
  dateText: {
    fontSize: 11,
    color: "var(--color-text, #1f2421)",
  },
  zeroMuted: {
    color: "#94a3b8",
    fontSize: 11,
  },
  activeNumber: {
    fontWeight: 700,
    color: "var(--color-primary-dark, #234F39)",
  },

  // Summary Tables (Tabs 2 - 5)
  stackedCards: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  card: {
    background: "#ffffff",
    border: "1px solid var(--color-border, #e7e3d9)",
    borderRadius: "var(--radius-md, 10px)",
    padding: "18px 20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
  },
  cardHeader: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "var(--color-text, #1f2421)",
    margin: "0 0 4px",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "var(--color-text-muted, #6b7268)",
    margin: 0,
    lineHeight: 1.4,
  },
  totalBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    padding: "4px 10px",
    borderRadius: 999,
  },
  totalBadgeLabel: {
    color: "var(--color-text-muted, #6b7268)",
    fontWeight: 600,
  },
  totalBadgeValue: {
    fontWeight: 800,
    color: "var(--color-primary-dark, #234F39)",
  },
  tableWrap: {
    overflowX: "auto",
    borderRadius: "var(--radius-sm, 6px)",
    border: "1px solid var(--color-border, #e7e3d9)",
  },
  cleanTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    background: "#f8fafc",
    color: "#334155",
    padding: "10px 14px",
    fontWeight: 700,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    borderBottom: "1px solid var(--color-border, #e7e3d9)",
    borderRight: "1px solid var(--color-border, #e7e3d9)",
  },
  tr: {
    borderBottom: "1px solid var(--color-border, #e7e3d9)",
    transition: "background 0.1s ease",
  },
  td: {
    padding: "10px 14px",
    borderRight: "1px solid #f1f5f9",
    fontSize: 13,
    color: "var(--color-text, #1f2421)",
  },
  subtotalRow: {
    background: "#f1f5f9",
    fontWeight: 700,
    borderTop: "2px solid var(--color-border, #e7e3d9)",
  },
  emptyTd: {
    textAlign: "center",
    padding: 32,
    color: "var(--color-text-muted, #6b7268)",
    fontSize: 13,
  },
  emptyCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
    background: "#ffffff",
    border: "1px dashed var(--color-border, #e7e3d9)",
    borderRadius: "var(--radius-md, 10px)",
    textAlign: "center",
  },
  tableFooterNote: {
    fontSize: 11,
    color: "var(--color-text-muted, #6b7268)",
    marginTop: 10,
    lineHeight: 1.4,
  },

  // Pills and Performance
  dangerPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "3px 8px",
    borderRadius: 4,
    background: "#fff1f2",
    color: "#be123c",
    border: "1px solid #fecdd3",
    fontSize: 11,
    fontWeight: 700,
  },
  dangerDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#e11d48",
  },
  monthBadge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 4,
    background: "#f1f5f9",
    color: "#334155",
  },
  rateColWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  rateBarContainer: {
    flex: 1,
    height: 6,
    background: "#e2e8f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  rateBarFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.4s ease-out",
  },
  ratePercentText: {
    fontSize: 12,
    fontWeight: 700,
    minWidth: 36,
  },

  // Alerts
  errorBox: {
    background: "var(--color-danger-tint, #fbe9e8)",
    color: "var(--color-danger, #c8534f)",
    padding: "12px 16px",
    borderRadius: "var(--radius-sm, 6px)",
    fontSize: 13,
    fontWeight: 600,
  },
};
