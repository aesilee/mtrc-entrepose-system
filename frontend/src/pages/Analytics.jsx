import { useEffect, useState, useCallback } from "react";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";
import { KpiCard, DonutChart, LineChart, BarChart, BarChartV, HorizontalBarChart } from "../components/AnalyticsCharts.jsx";
import useViewport from "../hooks/useViewport.js";
import { useAuth } from "../context/AuthContext.jsx";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  width: 20,
  height: 20,
};

const PRESETS = [
  { key: "last_6_months", label: "Last 6 months" },
  { key: "this_year", label: "This year" },
  { key: "last_12_months", label: "Last 12 months" },
  { key: "custom", label: "Custom range" },
];

const ROLE_SCOPE_META = {
  case_manager: {
    badge: "Caseload Scope",
    title: "Assigned Caseload Clinical & Attendance Overview",
    subtitle: "Live progression across the 43-session outpatient curriculum, drug test abstinence, and client retention.",
  },
  him_staff: {
    badge: "Institutional Surveillance",
    title: "DOH & Facility-Wide Rehabilitation Analytics",
    subtitle: "Aggregated outpatient census, demographic distributions, legal admission tracks, and compliance metrics.",
  },
  ict_admin: {
    badge: "System-Wide View",
    title: "MTRC Outpatient Rehabilitation Intelligence",
    subtitle: "Complete operational, clinical, and case management performance metrics across all cohorts.",
  },
  admitting: {
    badge: "Intake & Admissions View",
    title: "Admission & Demographic Distribution Overview",
    subtitle: "Summary of patient intake classifications, referral sources, and geographic reach.",
  },
};

function computeRange(preset) {
  const now = new Date();
  if (preset === "last_6_months") return { from: new Date(now.getFullYear(), now.getMonth() - 5, 1), to: now };
  if (preset === "this_year") return { from: new Date(now.getFullYear(), 0, 1), to: now };
  return { from: new Date(now.getFullYear(), now.getMonth() - 11, 1), to: now };
}

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

export default function Analytics() {
  const { user } = useAuth();
  const isCaseManager = user?.role === "case_manager";
  const scopeMeta = ROLE_SCOPE_META[user?.role] || ROLE_SCOPE_META.him_staff;
  const { width, isMobile, isTablet } = useViewport();
  const isCompact = isMobile || isTablet;
  const kpiCols = isMobile ? 2 : isTablet ? 3 : width < 1200 ? "repeat(auto-fit, minmax(160px, 1fr))" : 7;
  const gridCols = isMobile ? 1 : isTablet ? 2 : 4;

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchOverview = useCallback((isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    api
      .get("/analytics/overview")
      .then(({ data }) => {
        setOverview(data);
        if (isManual) setRefreshKey((k) => k + 1);
      })
      .catch((err) => console.error("Error loading analytics overview:", err))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    fetchOverview(false);
  }, [fetchOverview]);

  const totalStatuses = (overview?.patientStatus || []).reduce((acc, s) => acc + Number(s.value || 0), 0);

  return (
    <AppShell title="Analytics" description="Program performance trends, clinical distributions, and monitoring statistics.">
      <div className="mtrc-page-enter" style={styles.page}>
        {loading || !overview ? (
          <div style={styles.loadingPanel}>
            <div style={styles.loadingSpinner} />
            <div style={styles.loadingTitle}>Loading Analytics…</div>
            <div style={styles.loadingSub}>Preparing cohort metrics, attendance records, and DOH indicators</div>
          </div>
        ) : (
          <>
            {/* Light, Warm Overview Bar with subtle botanical leaf watermark */}
            <div
              style={{
                ...styles.overviewBar,
                flexDirection: isCompact ? "column" : "row",
                alignItems: isCompact ? "flex-start" : "center",
                padding: isCompact ? "18px 20px" : "22px 28px",
                minHeight: isCompact ? "auto" : 112,
              }}
            >
              {/* Subtle Botanical Leaf Watermark in Center-Right */}
              <svg
                viewBox="0 0 180 120"
                style={{
                  position: "absolute",
                  right: isCompact ? 16 : "26%",
                  bottom: -10,
                  width: 170,
                  height: 115,
                  pointerEvents: "none",
                  zIndex: 0,
                  opacity: 0.75,
                }}
                aria-hidden="true"
              >
                <path
                  d="M72 115 C 62 72, 95 24, 148 10 C 142 62, 108 98, 72 115 Z"
                  fill="rgba(143, 179, 97, 0.16)"
                />
                <path
                  d="M72 115 C 94 78, 118 44, 148 10"
                  fill="none"
                  stroke="rgba(53, 118, 72, 0.16)"
                  strokeWidth="1.5"
                />
                <path
                  d="M65 118 C 36 86, 22 50, 32 16 C 68 38, 78 78, 65 118 Z"
                  fill="rgba(53, 118, 72, 0.11)"
                />
                <path
                  d="M65 118 C 52 84, 42 52, 32 16"
                  fill="none"
                  stroke="rgba(53, 118, 72, 0.14)"
                  strokeWidth="1.3"
                />
              </svg>

              <div style={{ ...styles.overviewLeft, position: "relative", zIndex: 1 }}>
                <div style={styles.overviewBadgeRow}>
                  <span style={styles.scopePill}>
                    <span style={styles.liveDot} />
                    {scopeMeta.badge}
                  </span>
                  <span style={styles.standardBadge}>43-Session Outpatient Program</span>
                </div>
                <div style={styles.overviewTitle}>{scopeMeta.title}</div>
                <div style={styles.overviewSubtitle}>{scopeMeta.subtitle}</div>
              </div>

              <div
                style={{
                  ...styles.overviewRight,
                  width: isCompact ? "100%" : "auto",
                  justifyContent: isCompact ? "space-between" : "flex-end",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div style={styles.quickMetricsGroup}>
                  <div style={styles.quickMetricChip}>
                    <span style={styles.quickMetricNum}>{totalStatuses}</span>
                    <span style={styles.quickMetricText}>Total Cohort</span>
                  </div>
                  <div style={styles.quickMetricDivider} />
                  <div style={styles.quickMetricChip}>
                    <span style={{ ...styles.quickMetricNum, color: "#6E9940" }}>
                      {overview.kpis?.nearCompletion ?? 0}
                    </span>
                    <span style={styles.quickMetricText}>Near PDC (≥80%)</span>
                  </div>
                  <div style={styles.quickMetricDivider} />
                  <div style={styles.quickMetricChip}>
                    <span style={styles.quickMetricNum}>{overview.kpis?.totalDrugTests ?? 0}</span>
                    <span style={styles.quickMetricText}>Drug Screens</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fetchOverview(true)}
                  disabled={refreshing}
                  style={{
                    ...styles.refreshBtn,
                    opacity: refreshing ? 0.75 : 1,
                  }}
                  title="Refresh analytics data"
                >
                  <svg
                    {...iconProps}
                    width={15}
                    height={15}
                    style={{
                      animation: refreshing ? "spin 0.9s linear infinite" : "none",
                    }}
                  >
                    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                    <polyline points="21 3 21 9 15 9" />
                  </svg>
                  <span>{refreshing ? "Updating…" : "Refresh"}</span>
                </button>
              </div>
            </div>

            {/* Row 1: KPI Cards (7 Key Clinical & Program Indicators) */}
            <div style={{ ...styles.kpiRow, gridTemplateColumns: typeof kpiCols === "string" ? kpiCols : `repeat(${kpiCols}, 1fr)` }}>
              <KpiCard
                label="Retention Rate"
                value={overview.kpis?.retentionRate ?? 100}
                suffix="%"
                subtitle="Active + Graduated"
                accentColor="#357648"
                iconBg="#E8F5EC"
                icon={<svg {...iconProps}><path d="M3 17l6-6 4 4 8-8" /><polyline points="14 7 21 7 21 14" /></svg>}
              />
              <KpiCard
                label="Active Caseload"
                value={overview.kpis?.activeCaseload ?? 0}
                suffix=""
                subtitle="Currently Enrolled"
                accentColor="#6E9940"
                iconBg="#F1F7E6"
                icon={<svg {...iconProps}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>}
              />
              <KpiCard
                label="Completed / Graduated"
                value={overview.kpis?.completedPatients ?? 0}
                suffix=""
                subtitle="PDC Cleared"
                accentColor="#357648"
                iconBg="#E8F5EC"
                icon={<svg {...iconProps}><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>}
              />
              <KpiCard
                label="Total Discharged"
                value={overview.kpis?.totalDischarged ?? 0}
                suffix=""
                subtitle="Exit Registry"
                accentColor="#5C8D47"
                iconBg="#EEF6E9"
                icon={<svg {...iconProps}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>}
              />
              <KpiCard
                label="Avg. Attendance"
                value={overview.kpis?.avgAttendance ?? 0}
                suffix="%"
                subtitle="DOH Target: ≥80%"
                accentColor="#357648"
                iconBg="#E8F5EC"
                icon={<svg {...iconProps}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /></svg>}
              />
              <KpiCard
                label="Avg. Rehab Duration"
                value={overview.kpis?.avgDurationMonths ?? 0}
                suffix=" mo"
                subtitle="Program Length"
                accentColor="#739E82"
                iconBg="#ECF4EF"
                icon={<svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>}
              />
              <KpiCard
                label="Drug Test Abstinence"
                value={overview.kpis?.drugTestAbstinenceRate ?? 100}
                suffix="%"
                subtitle="Negative Screens"
                accentColor="#6E9940"
                iconBg="#F1F7E6"
                icon={<svg {...iconProps}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>}
              />
            </div>

            {/* Row 2: Monthly Admissions & Monthly Discharges TimeSeries */}
            <div style={{ ...styles.gridRow, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
              <TimeSeriesCard
                key={`adm-${refreshKey}`}
                title="Monthly Admissions"
                subtitle="New & readmitted outpatient enrollments"
                endpoint="/analytics/monthly-admissions"
                color="#357648"
                accentColor="#357648"
                span={2}
                maxSpan={gridCols}
              />
              <TimeSeriesCard
                key={`dis-${refreshKey}`}
                title="Monthly Discharges & Exits"
                subtitle="Completed graduations & program exits"
                endpoint="/analytics/monthly-discharges"
                color="#5C8D47"
                accentColor="#5C8D47"
                span={2}
                maxSpan={gridCols}
              />
            </div>

            {/* Row 3: Attendance Trend & Status Distributions */}
            <div style={{ ...styles.gridRow, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
              <TimeSeriesCard
                key={`att-${refreshKey}`}
                title="Attendance Trend"
                subtitle="Monthly session attendance compliance rate"
                endpoint="/analytics/attendance-trend"
                color="#8FB361"
                accentColor="#8FB361"
                suffix="%"
                isAverage
                span={2}
                maxSpan={gridCols}
              />
              <Card
                title="Patient Status"
                subtitle="Current enrollment breakdown"
                accentColor="#357648"
                span={1}
                maxSpan={gridCols}
                center
              >
                <DonutChart data={overview.patientStatus} size={112} />
              </Card>
              <Card
                title="Discharge Types"
                subtitle="Exit classification outcomes"
                accentColor="#8FB361"
                span={1}
                maxSpan={gridCols}
                center
              >
                {overview.dischargeDistribution?.length ? (
                  <DonutChart data={overview.dischargeDistribution} size={112} />
                ) : (
                  <EmptyChartBox text="No discharge records yet." />
                )}
              </Card>
            </div>

            {/* Row 4: Clinical Intake & Demographic Profiles (4 Single-Span Cards) */}
            <div style={{ ...styles.gridRow, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
              <Card
                title="Primary Substance Profile"
                subtitle="Reported substance of abuse"
                accentColor="#357648"
                span={1}
                maxSpan={gridCols}
                center
              >
                {overview.substanceDistribution?.length ? (
                  <DonutChart data={overview.substanceDistribution} size={112} />
                ) : (
                  <EmptyChartBox text="No substance data yet." />
                )}
              </Card>
              <Card
                title="Admission Classification"
                subtitle="Legal confinement & referral track"
                accentColor="#8FB361"
                span={1}
                maxSpan={gridCols}
                center
              >
                {overview.admissionClassification?.length ? (
                  <DonutChart data={overview.admissionClassification} size={112} />
                ) : (
                  <EmptyChartBox text="No classification data yet." />
                )}
              </Card>
              <Card
                title="Age Distribution"
                subtitle="Patient age group cohorts"
                accentColor="#739E82"
                span={1}
                maxSpan={gridCols}
                center
              >
                <BarChart data={overview.ageDistribution} />
              </Card>
              <Card
                title="Gender Distribution"
                subtitle="Enrolled demographic split"
                accentColor="#357648"
                span={1}
                maxSpan={gridCols}
                center
              >
                <DonutChart data={overview.genderDistribution} size={112} />
              </Card>
            </div>

            {/* Row 5: Clinical Interventions & Curriculum Progression */}
            <div style={{ ...styles.gridRow, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
              <Card
                title="Service Modality Volume (Attended Sessions)"
                subtitle="Completed sessions across CBT, Psycho-Education, SHGM, Individual & Family modalities"
                accentColor="#357648"
                span={2}
                maxSpan={gridCols}
              >
                {(overview.modalityVolume || []).length === 0 ? (
                  <div style={styles.emptyText}>No modality session records yet.</div>
                ) : (
                  <BarChart data={overview.modalityVolume} />
                )}
              </Card>
              <Card
                title="43-Session Curriculum Cohort Progression"
                subtitle="Active clients grouped by milestone phase toward Pre-Discharge Conference (PDC)"
                accentColor="#8FB361"
                span={2}
                maxSpan={gridCols}
              >
                {(overview.curriculumPhases || []).length === 0 ? (
                  <div style={styles.emptyText}>No active curriculum cohort data.</div>
                ) : (
                  <BarChart data={overview.curriculumPhases} />
                )}
              </Card>
            </div>

            {/* Row 6: Municipality Distribution & Role-Specific Operational Card */}
            <div style={{ ...styles.gridRow, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
              <Card
                title="Municipality Distribution"
                subtitle="Geographic concentration of enrolled patients across Albay LGUs"
                accentColor="#357648"
                span={2}
                maxSpan={gridCols}
              >
                <HorizontalBarChart data={overview.municipalityDistribution} />
              </Card>

              {isCaseManager ? (
                <Card
                  title="My Caseload Phase Breakdown"
                  subtitle="Proportional distribution of your active patients by treatment phase"
                  accentColor="#8FB361"
                  span={2}
                  maxSpan={gridCols}
                  isMobile={isCompact}
                >
                  {(overview.curriculumPhases || []).length === 0 ? (
                    <div style={styles.emptyText}>No assigned patients in active curriculum.</div>
                  ) : (
                    <HorizontalBarChart
                      data={(overview.curriculumPhases || []).map((p) => ({
                        label: p.label,
                        value: p.value,
                        count: p.value,
                      }))}
                    />
                  )}
                </Card>
              ) : (
                <Card
                  title="Attendance by Case Manager"
                  subtitle="Average client attendance compliance rate across assigned case managers"
                  accentColor="#8FB361"
                  span={2}
                  maxSpan={gridCols}
                  isMobile={isCompact}
                >
                  {(overview.attendanceByCaseManager || []).length === 0 ? (
                    <div style={styles.emptyText}>No case manager attendance data yet.</div>
                  ) : (
                    <BarChartV data={overview.attendanceByCaseManager} />
                  )}
                </Card>
              )}
            </div>

            {/* Row 7: Clinical & Operational Highlights */}
            <div style={{ ...styles.gridRow, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
              <Card
                title="Program & Operational Highlights"
                subtitle="Key institutional benchmarks and leading cohort indicators"
                accentColor="#357648"
                span={4}
                maxSpan={gridCols}
                isMobile={isCompact}
                noScroll
              >
                <div style={{ ...styles.statsRow, padding: "4px 0", flexWrap: isCompact ? "wrap" : "nowrap" }}>
                  <StatBlock
                    label="Highest Attendance"
                    value={overview.recentStats?.highestAttendance || "—"}
                    accent="#357648"
                    bg="#F2F8F4"
                  />
                  <StatBlock
                    label="Most Common Age Group"
                    value={overview.recentStats?.mostCommonAge || "—"}
                    accent="#8FB361"
                    bg="#F5F9EE"
                  />
                  <StatBlock
                    label="Primary Substance"
                    value={overview.recentStats?.topSubstance || "—"}
                    accent="#739E82"
                    bg="#F2F7F4"
                  />
                  <StatBlock
                    label="Admission Type"
                    value={overview.recentStats?.topAdmissionType || "—"}
                    accent="#5C8D47"
                    bg="#EEF6E9"
                  />
                  <StatBlock
                    label="Most Active LGU"
                    value={overview.recentStats?.mostActiveMunicipality || "—"}
                    accent="#357648"
                    bg="#F2F8F4"
                  />
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function TimeSeriesCard({ title, subtitle, endpoint, color, accentColor = "#357648", suffix = "", isAverage = false, span, maxSpan }) {
  const effectiveSpan = maxSpan ? Math.min(span, maxSpan) : span;
  const [preset, setPreset] = useState("last_12_months");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [presetOpen, setPresetOpen] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let dateFrom, dateTo;
    if (preset === "custom") {
      if (!customFrom || !customTo) return;
      dateFrom = customFrom;
      dateTo = customTo;
    } else {
      const range = computeRange(preset);
      dateFrom = toISO(range.from);
      dateTo = toISO(range.to);
    }
    setLoading(true);
    api
      .get(endpoint, { params: { dateFrom, dateTo } })
      .then(({ data }) => setData(data.data || []))
      .finally(() => setLoading(false));
  }, [preset, customFrom, customTo, endpoint]);

  const summaryValue = data.length
    ? isAverage
      ? Math.round(data.reduce((s, d) => s + Number(d.value || 0), 0) / data.length)
      : data.reduce((s, d) => s + Number(d.value || 0), 0)
    : 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles.card,
        gridColumn: `span ${effectiveSpan}`,
        borderColor: hovered ? "rgba(53, 118, 72, 0.4)" : "var(--color-border, #E7E3D9)",
        boxShadow: hovered
          ? "0 10px 24px rgba(53, 118, 72, 0.08), 0 2px 6px rgba(20, 20, 40, 0.04)"
          : "0 2px 10px rgba(20, 20, 40, 0.04)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <div style={styles.cardHeader}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 9, minWidth: 0 }}>
          <span style={{ ...styles.cardHeaderDot, background: accentColor }} />
          <div style={{ minWidth: 0 }}>
            <div style={styles.cardTitle}>{title}</div>
            {subtitle && <div style={styles.cardSubtitle}>{subtitle}</div>}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {!loading && (
            <span style={styles.summaryPill}>
              {isAverage ? "Avg:" : "Total:"}{" "}
              <strong style={{ color: "#357648" }}>
                {summaryValue}
                {suffix}
              </strong>
            </span>
          )}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              style={{
                ...styles.presetBtn,
                borderColor: presetOpen ? "#357648" : "var(--color-border, #E7E3D9)",
              }}
              onClick={() => setPresetOpen((v) => !v)}
            >
              {PRESETS.find((p) => p.key === preset)?.label}
              <svg {...iconProps} width="12" height="12">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {presetOpen && (
              <>
                <div style={styles.menuBackdrop} onClick={() => setPresetOpen(false)} />
                <div style={styles.presetMenu}>
                  {PRESETS.map((p) => {
                    const active = p.key === preset;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        style={{
                          ...styles.presetOption,
                          background: active ? "#E8F5EC" : "transparent",
                          color: active ? "#357648" : "var(--color-text, #1F2421)",
                          fontWeight: active ? 700 : 600,
                        }}
                        onClick={() => {
                          setPreset(p.key);
                          setPresetOpen(false);
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {preset === "custom" && (
        <div style={styles.dateRange}>
          <input type="date" style={styles.dateInput} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          <span style={{ color: "#357648", fontWeight: 700 }}>–</span>
          <input type="date" style={styles.dateInput} value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
        </div>
      )}

      {loading ? (
        <div style={styles.emptyText}>Loading trend data…</div>
      ) : (
        <LineChart data={data} color={color} suffix={suffix} />
      )}
    </div>
  );
}

function Card({ title, subtitle, accentColor = "#357648", span, center, children, maxSpan, isMobile, noScroll, centerBlock }) {
  const effectiveSpan = maxSpan ? Math.min(span, maxSpan) : span;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles.card,
        gridColumn: `span ${effectiveSpan}`,
        overflow: noScroll ? "hidden" : isMobile ? "visible" : styles.card.overflow,
        minHeight: isMobile ? "auto" : styles.card.minHeight,
        justifyContent: centerBlock ? "center" : "flex-start",
        borderColor: hovered ? "rgba(53, 118, 72, 0.4)" : "var(--color-border, #E7E3D9)",
        boxShadow: hovered
          ? "0 10px 24px rgba(53, 118, 72, 0.08), 0 2px 6px rgba(20, 20, 40, 0.04)"
          : "0 2px 10px rgba(20, 20, 40, 0.04)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        <span style={{ ...styles.cardHeaderDot, background: accentColor }} />
        <div style={{ minWidth: 0 }}>
          <div style={styles.cardTitle}>{title}</div>
          {subtitle && <div style={styles.cardSubtitle}>{subtitle}</div>}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: center ? "center" : "flex-start",
          alignItems: "center",
          flex: centerBlock ? "none" : 1,
          width: "100%",
          paddingTop: 4,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function EmptyChartBox({ text }) {
  return (
    <div style={styles.emptyText}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#8CA291"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: 24, height: 24, marginBottom: 6, opacity: 0.85 }}
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="13" y2="17" />
      </svg>
      <div>{text}</div>
    </div>
  );
}

function StatBlock({ label, value, accent = "#357648", bg = "#F2F8F4" }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles.statBlock,
        borderLeft: `3.5px solid ${accent}`,
        background: hovered ? "#FFFFFF" : bg,
        borderColor: hovered ? accent : "rgba(53, 118, 72, 0.14)",
        borderLeftColor: accent,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "0 6px 16px rgba(53, 118, 72, 0.08)" : "none",
      }}
    >
      <div style={styles.statBlockValue}>{value}</div>
      <div style={styles.statBlockLabel}>{label}</div>
    </div>
  );
}

const styles = {
  page: {
    background: "transparent",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    width: "100%",
  },

  loadingPanel: {
    background: "#FFFFFF",
    borderRadius: 18,
    padding: "60px 24px",
    textAlign: "center",
    border: "1px solid #DCE7DC",
    boxShadow: "0 2px 10px rgba(20, 20, 40, 0.04)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
  },
  loadingSpinner: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: "3px solid #E8F5EC",
    borderTopColor: "#357648",
    borderRightColor: "#8FB361",
    animation: "spin 0.85s linear infinite",
  },
  loadingTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: "var(--color-text, #1F2421)",
  },
  loadingSub: {
    fontSize: 12.5,
    color: "var(--color-text-muted, #6B7268)",
    fontWeight: 500,
  },

  overviewBar: {
    position: "relative",
    overflow: "hidden",
    background: "linear-gradient(135deg, #FFFFFF 0%, #F5FAF5 55%, #EAF4EB 100%)",
    borderRadius: 18,
    padding: "22px 28px",
    minHeight: 112,
    border: "1px solid #D8E6D9",
    borderLeft: "6px solid #1E5A34",
    boxShadow: "0 2px 14px rgba(30, 90, 52, 0.05)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    width: "100%",
    boxSizing: "border-box",
  },
  overviewLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    minWidth: 0,
    position: "relative",
    zIndex: 1,
  },
  overviewBadgeRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  scopePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#E6F3E8",
    color: "#245B32",
    padding: "4px 12px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.03em",
    textTransform: "uppercase",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#6E9940",
    boxShadow: "0 0 0 3px rgba(110, 153, 64, 0.25)",
  },
  standardBadge: {
    fontSize: 11.5,
    fontWeight: 700,
    color: "#476A30",
    background: "#EEF6E8",
    padding: "4px 11px",
    borderRadius: 999,
  },
  overviewTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: "var(--color-text, #1F2421)",
    letterSpacing: "-0.015em",
    lineHeight: 1.25,
  },
  overviewSubtitle: {
    fontSize: 12.5,
    color: "#5E6E62",
    lineHeight: 1.5,
  },
  overviewRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    flexShrink: 0,
    position: "relative",
    zIndex: 1,
  },
  quickMetricsGroup: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "#FFFFFF",
    border: "1px solid #DCE7DC",
    borderRadius: 14,
    padding: "8px 18px",
    boxShadow: "0 1px 4px rgba(30, 90, 52, 0.04)",
  },
  quickMetricChip: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  quickMetricNum: {
    fontSize: 17,
    fontWeight: 800,
    color: "#1E5A34",
    lineHeight: 1.15,
  },
  quickMetricText: {
    fontSize: 10.5,
    fontWeight: 600,
    color: "#5E6E62",
    whiteSpace: "nowrap",
  },
  quickMetricDivider: {
    width: 1,
    height: 24,
    background: "#DCE7DC",
  },
  refreshBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    background: "#1E5A34",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 12,
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.18s ease",
    boxShadow: "0 2px 8px rgba(30, 90, 52, 0.22)",
  },

  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 14,
  },
  gridRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 14,
    alignItems: "stretch",
  },

  card: {
    background: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    border: "1px solid #DCE7DC",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minHeight: 90,
    overflow: "auto",
    boxSizing: "border-box",
    transition: "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s ease, border-color 0.22s ease",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  cardHeaderDot: {
    width: 3.5,
    height: 16,
    borderRadius: 999,
    marginTop: 2,
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: 800,
    color: "var(--color-text, #1F2421)",
    lineHeight: 1.25,
  },
  cardSubtitle: {
    fontSize: 11,
    color: "var(--color-text-muted, #6B7268)",
    fontWeight: 500,
    marginTop: 2,
  },
  emptyText: {
    color: "var(--color-text-muted, #6B7268)",
    fontSize: 12.5,
    fontWeight: 600,
    textAlign: "center",
    padding: "22px 14px",
    width: "100%",
    background: "#EEF3EE",
    borderRadius: 12,
    border: "1px solid #E1EBE1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  },

  summaryPill: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--color-text-muted, #6B7268)",
    background: "#F4F8F4",
    border: "1px solid #DFECE2",
    borderRadius: 8,
    padding: "5px 9px",
    whiteSpace: "nowrap",
  },
  presetBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#F7F5F0",
    color: "var(--color-text, #1F2421)",
    border: "1px solid var(--color-border, #E7E3D9)",
    borderRadius: 9,
    padding: "6px 11px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.18s ease",
  },
  menuBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 30,
  },
  presetMenu: {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    background: "#FFFFFF",
    border: "1px solid var(--color-border, #E7E3D9)",
    borderRadius: 12,
    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.12)",
    padding: 6,
    zIndex: 40,
    minWidth: 155,
  },
  presetOption: {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "8px 10px",
    fontSize: 12,
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  dateRange: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    background: "#F7F5F0",
    padding: "6px 10px",
    borderRadius: 9,
  },
  dateInput: {
    border: "1px solid var(--color-border, #E7E3D9)",
    borderRadius: 6,
    fontSize: 11,
    padding: "4px 7px",
    color: "var(--color-text, #1F2421)",
    background: "#FFFFFF",
  },

  statsRow: {
    display: "flex",
    gap: 14,
    width: "100%",
    alignItems: "stretch",
  },
  statBlock: {
    border: "1px solid rgba(53, 118, 72, 0.14)",
    borderRadius: 14,
    padding: "12px 16px",
    flex: 1,
    minWidth: 150,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 5,
    transition: "all 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
  },
  statBlockValue: {
    fontSize: 14,
    fontWeight: 800,
    color: "#243B12",
    lineHeight: 1.35,
  },
  statBlockLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--color-text-muted, #6B7268)",
  },
};
