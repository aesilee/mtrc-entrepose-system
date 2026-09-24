import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";
import { exportOpCmTrackerWorkbook } from "../utils/opCmTrackerExport.js";
import { useAuth } from "../context/AuthContext.jsx";

const MONTHS = [
  { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
  { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
  { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" },
];

const TABS = [
  { id: "grid", label: "Master Caseload" },
  { id: "census", label: "Census & Enrollments" },
  { id: "discharges", label: "Discharges & Attrition" },
  { id: "dt", label: "Drug Test Surveillance" },
  { id: "performance", label: "Staff Performance" },
];

// Unified column groupings
const GRID_COLUMN_GROUPS = [
  {
    name: "Patient Demographics",
    columns: [
      { key: "rowNum", label: "#", sticky: true, width: 44 },
      { key: "pwudCode", label: "PWUD CODE", sticky: true, width: 130 },
      { key: "clientName", label: "NAME OF CLIENT", sticky: true, width: 180 },
      { key: "sex", label: "Sex", align: "center", width: 55 },
      { key: "lgu", label: "LGU", width: 90 },
      { key: "cm", label: "Case Manager", width: 130 },
      { key: "category", label: "Category", width: 120 },
    ],
  },
  {
    name: "Enrollment & Intake Milestones",
    columns: [
      { key: "dateEnrolled", label: "Date Enrolled", date: true, width: 105 },
      { key: "newEnrollee", label: "New Enrollee?", align: "center", width: 100 },
      { key: "datePo", label: "PO Date", milestone: true, width: 100 },
      { key: "dateVltsReferral", label: "VLTS Referral", milestone: true, width: 100 },
      { key: "dateInitialAssessment", label: "Initial Assessment", milestone: true, width: 110 },
      { key: "dateInitialTreatmentPlanning", label: "Initial Tx Plan", milestone: true, width: 105 },
      { key: "dateInitialProgressReporting", label: "Initial Progress Rpt", milestone: true, width: 115 },
    ],
  },
  {
    name: "Clinical Sessions & Drug Tests",
    columns: [
      { key: "scheduledCbtSessions", label: "Sched. CBT", align: "center", width: 85 },
      { key: "attendedCbtSessions", label: "Att. CBT", align: "center", width: 80 },
      { key: "scheduledPeSessions", label: "Sched. PE", align: "center", width: 85 },
      { key: "attendedPeSessions", label: "Att. PE", align: "center", width: 80 },
      { key: "attendedShgmSessions", label: "SHGM", align: "center", width: 75 },
      { key: "individualCounselingSessions", label: "ICA", align: "center", width: 75 },
      { key: "conjointFamilySessions", label: "Conjoint", align: "center", width: 75 },
      { key: "drugTestsConducted", label: "DT Count", align: "center", width: 80 },
    ],
  },
  {
    name: "Follow-Up & Secondary Milestones",
    columns: [
      { key: "dateReferralOutsideMtrc", label: "Outside Ref.", milestone: true, width: 100 },
      { key: "dateCaseConference", label: "Case Conf.", milestone: true, width: 100 },
      { key: "dateStatusReporting", label: "Status Rpt", milestone: true, width: 100 },
      { key: "dateHomeVisit", label: "Home Visit", milestone: true, width: 100 },
      { key: "dateFollowupAssessment", label: "Follow-up ASI", milestone: true, width: 105 },
      { key: "dateAcpTreatmentPlanning", label: "ACP Plan", milestone: true, width: 100 },
      { key: "datePdc", label: "PDC", milestone: true, width: 90 },
      { key: "dateFinalProgressReporting", label: "Final Progress Rpt", milestone: true, width: 115 },
    ],
  },
  {
    name: "Clinical Comorbidities & Consults",
    columns: [
      { key: "interventionsConductedInMonth", label: "Interventions?", align: "center", width: 100 },
      { key: "medicalComorbidity", label: "Med Comorb.", align: "center", width: 85 },
      { key: "psychiatricComorbidity", label: "Psych Comorb.", align: "center", width: 90 },
      { key: "consultTypeWithinMtrc", label: "Consult", align: "center", width: 75 },
      { key: "comorbidityDetails", label: "Comorbidity Details", width: 160 },
    ],
  },
  {
    name: "Discharge & Disposition",
    columns: [
      { key: "dateOfDischarge", label: "Discharge Date", date: true, width: 105 },
      { key: "statusOfDischarge", label: "Discharge Status", width: 130 },
      { key: "remarks", label: "Remarks", width: 180 },
    ],
  },
];

const FLAT_GRID_COLUMNS = GRID_COLUMN_GROUPS.flatMap((group) => group.columns);

function fmtDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function fmtCell(row, col) {
  if (col.key === "rowNum") return row._rowNum;
  if (col.key === "pwudCode") return row.pwudCode || "—";
  if (col.key === "newEnrollee" || col.key === "interventionsConductedInMonth") {
    return Number(row[col.key]) === 1 ? "Yes" : "No";
  }
  const v = row[col.key];
  if (col.milestone) return v ? fmtDate(v) : "0";
  if (col.date) return fmtDate(v);
  if (v === 0 || v === "0") return "0";
  if (v === null || v === undefined || v === "" || v === "—") return "—";
  return v;
}

function CensusTable({ title, subtitle, data }) {
  if (!data?.rows) return null;
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <h3 style={styles.cardTitle}>{title}</h3>
          {subtitle && <p style={styles.cardSubtitle}>{subtitle}</p>}
        </div>
        <div style={styles.totalBadge}>
          Total: {data.grandTotal ?? data.subtotal?.total ?? 0}
        </div>
      </div>
      <div style={styles.tableWrap}>
        <table style={styles.cleanTable}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ ...styles.th, width: "26%" }}>Case Manager</th>
              <th colSpan={2} style={{ ...styles.th, textAlign: "center" }}>Voluntary</th>
              <th colSpan={2} style={{ ...styles.th, textAlign: "center" }}>LGU-Referred</th>
              <th colSpan={2} style={{ ...styles.th, textAlign: "center" }}>Court-Mandated</th>
              <th rowSpan={2} style={{ ...styles.th, textAlign: "center", width: "12%" }}>Total</th>
            </tr>
            <tr>
              <th style={{ ...styles.thSub, textAlign: "center" }}>M</th>
              <th style={{ ...styles.thSub, textAlign: "center" }}>F</th>
              <th style={{ ...styles.thSub, textAlign: "center" }}>M</th>
              <th style={{ ...styles.thSub, textAlign: "center" }}>F</th>
              <th style={{ ...styles.thSub, textAlign: "center" }}>M</th>
              <th style={{ ...styles.thSub, textAlign: "center" }}>F</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr><td colSpan={8} style={styles.emptyTd}>No active case manager records for this period.</td></tr>
            ) : (
              data.rows.map((row) => (
                <tr key={row.caseManager} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: 500 }}>{row.caseManager}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>{row.Voluntary.Male}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>{row.Voluntary.Female}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>{row["LGU-Referred"].Male}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>{row["LGU-Referred"].Female}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>{row["Court-mandated"].Male}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>{row["Court-mandated"].Female}</td>
                  <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>
                    {row.total}
                  </td>
                </tr>
              ))
            )}
            {data.subtotal && (
              <>
                <tr style={styles.subtotalRow}>
                  <td style={{ ...styles.td, fontWeight: 700 }}>Subtotal (M / F)</td>
                  <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>{data.subtotal.Voluntary.Male}</td>
                  <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>{data.subtotal.Voluntary.Female}</td>
                  <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>{data.subtotal["LGU-Referred"].Male}</td>
                  <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>{data.subtotal["LGU-Referred"].Female}</td>
                  <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>{data.subtotal["Court-mandated"].Male}</td>
                  <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>{data.subtotal["Court-mandated"].Female}</td>
                  <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>
                    {data.subtotal.total}
                  </td>
                </tr>
                <tr style={styles.categoryTotalRow}>
                  <td style={{ ...styles.td, fontWeight: 700 }}>TOTAL</td>
                  <td colSpan={2} style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>
                    {data.subtotal.Voluntary.Male + data.subtotal.Voluntary.Female}
                  </td>
                  <td colSpan={2} style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>
                    {data.subtotal["LGU-Referred"].Male + data.subtotal["LGU-Referred"].Female}
                  </td>
                  <td colSpan={2} style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>
                    {data.subtotal["Court-mandated"].Male + data.subtotal["Court-mandated"].Female}
                  </td>
                  <td style={{ ...styles.td, textAlign: "center", fontWeight: 800 }}>
                    {data.subtotal.total}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function OpCmTracker() {
  const { user } = useAuth();
  const isCaseManager = user?.role === "case_manager";
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [caseManagerId, setCaseManagerId] = useState("");
  const [caseManagers, setCaseManagers] = useState([]);
  const [tab, setTab] = useState("grid");
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
  const facilityRate = facilityPerf?.attendanceRatePercent != null ? `${facilityPerf.attendanceRatePercent}%` : "N/A";

  const selectedMonthName = MONTHS.find((m) => m.value === month)?.label || "";

  return (
    <AppShell
      title="OP CM Tracker"
      description="MTRC Outpatient Monthly Intervention Tracker — Longitudinal Caseload Matrix, Census Analytics, Discharges, DT Surveillance, and CM Performance."
    >
      {/* Top Navigation */}
      <div style={styles.topNav}>
        <Link to="/reports" style={styles.backLink}>
          Back to DOH Reports
        </Link>
      </div>

      {/* Filter Card */}
      <div style={styles.filterCard}>
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
            <label style={styles.filterField}>
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
            <div style={styles.filterField}>
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
              {loading ? "Loading..." : "Apply Filters"}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={!report || loading}
              style={{ ...styles.secondaryBtn, opacity: !report || loading ? 0.6 : 1 }}
            >
              Export to Excel
            </button>
          </div>
        </div>

        {report && (
          <div style={styles.filterMeta}>
            <span>Period: <strong>{selectedMonthName} {year}</strong></span>
            <span style={styles.dot}>•</span>
            <span>Case Manager: <strong>{caseManagerId ? (caseManagers.find(c => String(c.id) === String(caseManagerId))?.full_name || "Filtered") : "All Registered CMs"}</strong></span>
            <span style={styles.dot}>•</span>
            <span>Active Caseload: <strong>{rawGrid.length} clients</strong></span>
          </div>
        )}
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* KPI Overview Strip */}
      {report && (
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Active Outpatient Census</div>
            <div style={styles.kpiValue}>{activeCensusCount}</div>
            <div style={styles.kpiSub}>Active cases in month</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Monthly Admissions</div>
            <div style={styles.kpiValue}>{enrollmentsCount}</div>
            <div style={styles.kpiSub}>New enrollees in {selectedMonthName}</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Monthly Discharges</div>
            <div style={styles.kpiValue}>{dischargesCount}</div>
            <div style={styles.kpiSub}>Completers and attrition</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Positive Drug Tests</div>
            <div style={styles.kpiValue}>{positiveDtCount}</div>
            <div style={styles.kpiSub}>Surveillance tests</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Facility Attendance Rate</div>
            <div style={styles.kpiValue}>{facilityRate}</div>
            <div style={styles.kpiSub}>CBT and Psycho-Education</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={styles.tabContainer}>
        {TABS.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              style={{
                ...styles.tabButton,
                ...(isActive ? styles.tabButtonActive : {}),
              }}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {!report && !loading && !error && (
        <div style={styles.emptyState}>
          Select a reporting period and click Apply Filters to generate the tracker.
        </div>
      )}

      {/* Tab 1: Master Caseload Matrix */}
      {tab === "grid" && report && (
        <div style={styles.caseloadSection}>
          <div style={styles.matrixToolbar}>
            <input
              type="text"
              placeholder="Search by client name, PWUD code, LGU, or Case Manager..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            <span style={styles.countText}>
              Showing {filteredGrid.length} of {rawGrid.length} clients
            </span>
          </div>

          <div style={styles.matrixContainer}>
            <table style={styles.matrixTable}>
              <thead>
                {/* Unified Super-Header Row */}
                <tr>
                  {GRID_COLUMN_GROUPS.map((group) => {
                    const isStickyGroup = group.columns.some((c) => c.sticky);
                    return (
                      <th
                        key={group.name}
                        colSpan={group.columns.length}
                        style={{
                          ...styles.superTh,
                          ...(isStickyGroup ? { position: "sticky", left: 0, zIndex: 5 } : {}),
                        }}
                      >
                        {group.name}
                      </th>
                    );
                  })}
                </tr>
                {/* Sub-Header Row */}
                <tr>
                  {FLAT_GRID_COLUMNS.map((col) => {
                    const stickyLeft =
                      col.key === "rowNum"
                        ? 0
                        : col.key === "pwudCode"
                        ? 44
                        : col.key === "clientName"
                        ? 174
                        : undefined;

                    return (
                      <th
                        key={col.key}
                        style={{
                          ...styles.matrixTh,
                          minWidth: col.width || 90,
                          ...(col.sticky ? { ...styles.stickyTh, left: stickyLeft } : {}),
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
                        ? `No outpatient clients matching "${searchQuery}".`
                        : "No outpatient caseload rows recorded for this period."}
                    </td>
                  </tr>
                ) : (
                  filteredGrid.map((row, idx) => {
                    const rowData = { ...row, _rowNum: idx + 1 };
                    return (
                      <tr key={`${row.pwudCode}-${idx}`}>
                        {FLAT_GRID_COLUMNS.map((col) => {
                          const stickyLeft =
                            col.key === "rowNum"
                              ? 0
                              : col.key === "pwudCode"
                              ? 44
                              : col.key === "clientName"
                              ? 174
                              : undefined;

                          return (
                            <td
                              key={col.key}
                              style={{
                                ...styles.matrixTd,
                                ...(col.sticky ? { ...styles.stickyTd, left: stickyLeft } : {}),
                                textAlign: col.align || "left",
                                fontWeight: col.key === "clientName" ? 600 : "normal",
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
        </div>
      )}

      {/* Tab 2: Census & Enrollments */}
      {tab === "census" && summaries && (
        <div style={styles.stackedCards}>
          <CensusTable
            title="Summary 1 — Active Census per Case Manager"
            subtitle="Outpatient PWUDs without discharge, or discharged during/after reporting month."
            data={summaries.activeCensus}
          />
          <CensusTable
            title="Summary 2 — Monthly Enrollments"
            subtitle={`Outpatient clients admitted within ${selectedMonthName} ${year}.`}
            data={summaries.enrollments}
          />
        </div>
      )}

      {/* Tab 3: Discharges & Attrition */}
      {tab === "discharges" && summaries && (
        <div style={styles.stackedCards}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Summary 3 — Discharges & Attrition</h3>
                <p style={styles.cardSubtitle}>
                  Discharges categorized into Completers and Attrition (Non-compliance, Incarceration, Referral, Medical).
                </p>
              </div>
              <div style={styles.totalBadge}>
                Total: {summaries.discharges?.grandTotal ?? summaries.discharges?.subtotal?.total ?? 0}
              </div>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.cleanTable}>
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ ...styles.th, width: "22%" }}>Case Manager</th>
                    <th colSpan={2} style={{ ...styles.th, textAlign: "center" }}>Completer</th>
                    <th colSpan={2} style={{ ...styles.th, textAlign: "center" }}>Non-compliance</th>
                    <th colSpan={2} style={{ ...styles.th, textAlign: "center" }}>Incarcerated</th>
                    <th colSpan={2} style={{ ...styles.th, textAlign: "center" }}>Referred</th>
                    <th colSpan={2} style={{ ...styles.th, textAlign: "center" }}>Medical</th>
                    <th rowSpan={2} style={{ ...styles.th, textAlign: "center", width: "10%" }}>Total</th>
                  </tr>
                  <tr>
                    <th style={{ ...styles.thSub, textAlign: "center" }}>M</th>
                    <th style={{ ...styles.thSub, textAlign: "center" }}>F</th>
                    <th style={{ ...styles.thSub, textAlign: "center" }}>M</th>
                    <th style={{ ...styles.thSub, textAlign: "center" }}>F</th>
                    <th style={{ ...styles.thSub, textAlign: "center" }}>M</th>
                    <th style={{ ...styles.thSub, textAlign: "center" }}>F</th>
                    <th style={{ ...styles.thSub, textAlign: "center" }}>M</th>
                    <th style={{ ...styles.thSub, textAlign: "center" }}>F</th>
                    <th style={{ ...styles.thSub, textAlign: "center" }}>M</th>
                    <th style={{ ...styles.thSub, textAlign: "center" }}>F</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(summaries.discharges) ? summaries.discharges : (summaries.discharges?.rows || [])).map((row) => (
                    <tr key={row.caseManager} style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: 500 }}>{row.caseManager}</td>
                      <td style={{ ...styles.td, textAlign: "center" }}>{row.Completer.Male}</td>
                      <td style={{ ...styles.td, textAlign: "center" }}>{row.Completer.Female}</td>
                      <td style={{ ...styles.td, textAlign: "center" }}>{row["Non-compliance"].Male}</td>
                      <td style={{ ...styles.td, textAlign: "center" }}>{row["Non-compliance"].Female}</td>
                      <td style={{ ...styles.td, textAlign: "center" }}>{row.Incarcerated.Male}</td>
                      <td style={{ ...styles.td, textAlign: "center" }}>{row.Incarcerated.Female}</td>
                      <td style={{ ...styles.td, textAlign: "center" }}>{row["Referred to Other Program/Facility"]?.Male ?? row["Referred to Other Program/Facilty"]?.Male ?? 0}</td>
                      <td style={{ ...styles.td, textAlign: "center" }}>{row["Referred to Other Program/Facility"]?.Female ?? row["Referred to Other Program/Facilty"]?.Female ?? 0}</td>
                      <td style={{ ...styles.td, textAlign: "center" }}>{row["Medical Discharge"]?.Male ?? 0}</td>
                      <td style={{ ...styles.td, textAlign: "center" }}>{row["Medical Discharge"]?.Female ?? 0}</td>
                      <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>
                        {row.total ?? 0}
                      </td>
                    </tr>
                  ))}
                  {summaries.discharges?.subtotal && (
                    <>
                      <tr style={styles.subtotalRow}>
                        <td style={{ ...styles.td, fontWeight: 700 }}>Subtotal (M / F)</td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>{summaries.discharges.subtotal.Completer.Male}</td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>{summaries.discharges.subtotal.Completer.Female}</td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>{summaries.discharges.subtotal["Non-compliance"].Male}</td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>{summaries.discharges.subtotal["Non-compliance"].Female}</td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>{summaries.discharges.subtotal.Incarcerated.Male}</td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>{summaries.discharges.subtotal.Incarcerated.Female}</td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>{summaries.discharges.subtotal["Referred to Other Program/Facility"]?.Male ?? summaries.discharges.subtotal["Referred to Other Program/Facilty"]?.Male ?? 0}</td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>{summaries.discharges.subtotal["Referred to Other Program/Facility"]?.Female ?? summaries.discharges.subtotal["Referred to Other Program/Facilty"]?.Female ?? 0}</td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>{summaries.discharges.subtotal["Medical Discharge"]?.Male ?? 0}</td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>{summaries.discharges.subtotal["Medical Discharge"]?.Female ?? 0}</td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>
                          {summaries.discharges.subtotal.total ?? 0}
                        </td>
                      </tr>
                      <tr style={styles.categoryTotalRow}>
                        <td style={{ ...styles.td, fontWeight: 700 }}>GRAND TOTAL</td>
                        <td colSpan={2} style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>
                          {summaries.discharges.subtotal.Completer.Male + summaries.discharges.subtotal.Completer.Female}
                        </td>
                        <td colSpan={2} style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>
                          {summaries.discharges.subtotal["Non-compliance"].Male + summaries.discharges.subtotal["Non-compliance"].Female}
                        </td>
                        <td colSpan={2} style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>
                          {summaries.discharges.subtotal.Incarcerated.Male + summaries.discharges.subtotal.Incarcerated.Female}
                        </td>
                        <td colSpan={2} style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>
                          {(summaries.discharges.subtotal["Referred to Other Program/Facility"]?.Male ?? summaries.discharges.subtotal["Referred to Other Program/Facilty"]?.Male ?? 0) +
                           (summaries.discharges.subtotal["Referred to Other Program/Facility"]?.Female ?? summaries.discharges.subtotal["Referred to Other Program/Facilty"]?.Female ?? 0)}
                        </td>
                        <td colSpan={2} style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>
                          {(summaries.discharges.subtotal["Medical Discharge"]?.Male ?? 0) + (summaries.discharges.subtotal["Medical Discharge"]?.Female ?? 0)}
                        </td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 800 }}>
                          {summaries.discharges.subtotal.total ?? 0}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Summary 4 — Non-Completers Roster</h3>
                <p style={styles.cardSubtitle}>
                  Itemized roster of clients discharged prior to program completion.
                </p>
              </div>
              <div style={styles.totalBadge}>
                Count: {summaries.nonCompleters.length}
              </div>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.cleanTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>Case Manager</th>
                    <th style={styles.th}>Client Name</th>
                    <th style={{ ...styles.th, textAlign: "center" }}>Sex</th>
                    <th style={styles.th}>Date Enrolled</th>
                    <th style={styles.th}>Date Discharged</th>
                    <th style={styles.th}>Reason for Discharge</th>
                    <th style={{ ...styles.th, textAlign: "center" }}>LoT (Months)</th>
                    <th style={styles.th}>Interventions Rendered</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.nonCompleters.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={styles.emptyTd}>
                        No non-completers discharged for this period.
                      </td>
                    </tr>
                  ) : (
                    summaries.nonCompleters.map((r, i) => (
                      <tr key={i} style={styles.tr}>
                        <td style={styles.td}>{r.caseManager}</td>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{r.clientName}</td>
                        <td style={{ ...styles.td, textAlign: "center" }}>{r.sex}</td>
                        <td style={styles.td}>{fmtDate(r.dateEnrolled)}</td>
                        <td style={styles.td}>{fmtDate(r.dateDischarged)}</td>
                        <td style={styles.td}>{r.reasonForDischarge}</td>
                        <td style={{ ...styles.td, textAlign: "center" }}>{r.lengthOfTreatmentMonths}</td>
                        <td style={styles.td}>{r.interventionsDone || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Drug Test Surveillance */}
      {tab === "dt" && summaries && (
        <div style={styles.stackedCards}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Summary 5 — Positive Drug Test Surveillance</h3>
                <p style={styles.cardSubtitle}>
                  Surveillance of detected illicit substances among enrolled outpatients.
                </p>
              </div>
              <div style={styles.totalBadge}>
                Count: {summaries.positiveDrugTests.length}
              </div>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.cleanTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>Case Manager</th>
                    <th style={styles.th}>Client Name</th>
                    <th style={styles.th}>Substance Detected</th>
                    <th style={{ ...styles.th, textAlign: "center" }}>Months in Program</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.positiveDrugTests.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={styles.emptyTd}>
                        No positive drug test results recorded for this reporting period.
                      </td>
                    </tr>
                  ) : (
                    summaries.positiveDrugTests.map((r, i) => (
                      <tr key={i} style={styles.tr}>
                        <td style={styles.td}>{r.caseManager}</td>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{r.clientName}</td>
                        <td style={styles.td}>{r.substanceDetected}</td>
                        <td style={{ ...styles.td, textAlign: "center" }}>{r.monthsInProgramLabel}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Staff Performance */}
      {tab === "performance" && summaries && (
        <div style={styles.stackedCards}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>
                  Summary 6 — Case Manager Attendance Performance (CBT + Psycho-Education)
                </h3>
                <p style={styles.cardSubtitle}>
                  Attendance Rate (%) = [Actual Attended (CBT + PE) ÷ Target Scheduled (CBT + PE)] × 100
                </p>
              </div>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.cleanTable}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, width: "35%" }}>Case Manager</th>
                    <th style={{ ...styles.th, textAlign: "center", width: "20%" }}>Target Scheduled (CBT + PE)</th>
                    <th style={{ ...styles.th, textAlign: "center", width: "20%" }}>Actual Attended (CBT + PE)</th>
                    <th style={{ ...styles.th, textAlign: "center", width: "25%" }}>Attendance Rate (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(summaries.attendancePerformance)
                    ? summaries.attendancePerformance
                    : summaries.attendancePerformance?.rows || []
                  ).map((row) => (
                    <tr key={row.caseManager} style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: 500 }}>{row.caseManager}</td>
                      <td style={{ ...styles.td, textAlign: "center" }}>{row.targetScheduled}</td>
                      <td style={{ ...styles.td, textAlign: "center" }}>{row.actualAttended}</td>
                      <td style={{ ...styles.td, textAlign: "center" }}>
                        {row.targetScheduled > 0 && row.attendanceRatePercent != null
                          ? `${row.attendanceRatePercent}%`
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                  {summaries.attendancePerformance?.facilityTotal && (
                    <tr style={styles.subtotalRow}>
                      <td style={{ ...styles.td, fontWeight: 700 }}>
                        {summaries.attendancePerformance.facilityTotal.caseManager}
                      </td>
                      <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>
                        {summaries.attendancePerformance.facilityTotal.targetScheduled}
                      </td>
                      <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>
                        {summaries.attendancePerformance.facilityTotal.actualAttended}
                      </td>
                      <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>
                        {summaries.attendancePerformance.facilityTotal.attendanceRatePercent != null
                          ? `${summaries.attendancePerformance.facilityTotal.attendanceRatePercent}%`
                          : "N/A"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

const styles = {
  topNav: { marginBottom: 12 },
  backLink: {
    fontSize: 13,
    color: "var(--color-primary-dark)",
    textDecoration: "none",
    fontWeight: 600,
  },

  // Filter toolbar
  filterCard: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "16px 20px",
    marginBottom: 16,
  },
  filtersRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: 16,
  },
  filterField: { display: "flex", flexDirection: "column", gap: 5 },
  filterLabel: { fontSize: 12, fontWeight: 600, color: "var(--color-text)" },
  select: {
    padding: "8px 10px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    background: "#fff",
    fontSize: 13,
    minWidth: 140,
  },
  selectCm: {
    padding: "8px 10px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    background: "#fff",
    fontSize: 13,
    minWidth: 200,
  },
  inputYear: {
    padding: "8px 10px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    background: "#fff",
    fontSize: 13,
    width: 90,
  },
  cmUserText: {
    padding: "8px 10px",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--color-text)",
  },
  filterActions: { display: "flex", gap: 10, alignItems: "center" },
  primaryBtn: {
    padding: "8px 16px",
    background: "var(--color-primary)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "8px 16px",
    background: "var(--color-surface)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },
  filterMeta: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px solid var(--color-border)",
    fontSize: 12,
    color: "var(--color-text-muted)",
  },
  dot: { color: "var(--color-border)" },

  // KPI Overview
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    color: "var(--color-text-muted)",
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: 700,
    color: "var(--color-text)",
    lineHeight: 1.2,
  },
  kpiSub: { fontSize: 11, color: "var(--color-text-muted)" },

  // Tabs
  tabContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  tabButton: {
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    fontSize: 13,
    fontWeight: 500,
    color: "var(--color-text-muted)",
    cursor: "pointer",
  },
  tabButtonActive: {
    background: "var(--color-primary-tint)",
    borderColor: "var(--color-primary)",
    color: "var(--color-primary-dark)",
    fontWeight: 700,
  },

  // Caseload Matrix
  caseloadSection: { display: "flex", flexDirection: "column", gap: 8 },
  matrixToolbar: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: "1 1 300px",
    maxWidth: 440,
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    fontSize: 13,
  },
  countText: { fontSize: 12, color: "var(--color-text-muted)" },
  matrixContainer: {
    overflow: "auto",
    maxHeight: "72vh",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    background: "var(--color-surface)",
  },
  matrixTable: {
    borderCollapse: "separate",
    borderSpacing: 0,
    fontSize: 12,
    minWidth: "100%",
  },
  superTh: {
    background: "var(--color-primary-dark)",
    color: "#ffffff",
    padding: "6px 8px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    textAlign: "center",
    position: "sticky",
    top: 0,
    zIndex: 4,
    borderBottom: "1px solid rgba(255,255,255,0.2)",
    borderRight: "1px solid rgba(255,255,255,0.15)",
  },
  matrixTh: {
    background: "var(--color-primary)",
    color: "#ffffff",
    padding: "8px 10px",
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
    position: "sticky",
    top: 27,
    zIndex: 3,
    borderBottom: "2px solid var(--color-primary-dark)",
    borderRight: "1px solid rgba(255,255,255,0.1)",
  },
  stickyTh: {
    position: "sticky",
    zIndex: 5,
    background: "var(--color-primary-dark)",
  },
  matrixTd: {
    padding: "7px 10px",
    borderBottom: "1px solid var(--color-border)",
    borderRight: "1px solid #f0eee6",
    whiteSpace: "nowrap",
    fontSize: 12,
    background: "inherit",
  },
  stickyTd: {
    position: "sticky",
    zIndex: 2,
    background: "#ffffff",
    boxShadow: "2px 0 4px rgba(0,0,0,0.03)",
  },

  // Clean cards & standard tables
  stackedCards: { display: "flex", flexDirection: "column", gap: 16 },
  card: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "16px 20px",
  },
  cardHeader: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: 700, color: "var(--color-text)", margin: "0 0 4px" },
  cardSubtitle: { fontSize: 12, color: "var(--color-text-muted)", margin: 0 },
  totalBadge: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--color-text-muted)",
  },
  tableWrap: { overflowX: "auto" },
  cleanTable: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    background: "#f7f5f0",
    color: "var(--color-text)",
    padding: "9px 12px",
    fontWeight: 600,
    fontSize: 12,
    borderBottom: "1px solid var(--color-border)",
    borderRight: "1px solid var(--color-border)",
  },
  thSub: {
    background: "#f2efe8",
    color: "var(--color-text-muted)",
    padding: "6px 8px",
    fontWeight: 600,
    fontSize: 11,
    borderBottom: "1px solid var(--color-border)",
    borderRight: "1px solid var(--color-border)",
  },
  tr: {
    borderBottom: "1px solid var(--color-border)",
  },
  td: {
    padding: "8px 12px",
    borderRight: "1px solid #f0eee6",
    fontSize: 13,
  },
  subtotalRow: {
    background: "var(--color-primary-tint)",
    fontWeight: 700,
  },
  categoryTotalRow: {
    background: "#f0ece1",
    fontWeight: 700,
  },
  emptyTd: { textAlign: "center", padding: 24, color: "var(--color-text-muted)" },
  errorBox: {
    background: "var(--color-danger-tint)",
    color: "var(--color-danger)",
    padding: "10px 14px",
    borderRadius: "var(--radius-sm)",
    marginBottom: 14,
    fontSize: 13,
  },
  emptyState: {
    textAlign: "center",
    padding: 32,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    color: "var(--color-text-muted)",
    fontSize: 13,
  },
};
