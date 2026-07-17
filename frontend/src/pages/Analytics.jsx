import { useEffect, useState } from "react";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";
import { KpiCard, DonutChart, LineChart, BarChart, BarChartV } from "../components/AnalyticsCharts.jsx";
import useViewport from "../hooks/useViewport.js";

const iconProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", width: 20, height: 20 };

const PRESETS = [
  { key: "last_6_months", label: "Last 6 months" },
  { key: "this_year", label: "This year" },
  { key: "last_12_months", label: "Last 12 months" },
  { key: "custom", label: "Custom range" },
];

function computeRange(preset) {
  const now = new Date();
  if (preset === "last_6_months") return { from: new Date(now.getFullYear(), now.getMonth() - 5, 1), to: now };
  if (preset === "this_year") return { from: new Date(now.getFullYear(), 0, 1), to: now };
  return { from: new Date(now.getFullYear(), now.getMonth() - 11, 1), to: now };
}

function toISO(d) { return d.toISOString().slice(0, 10); }

export default function Analytics() {
  const { isMobile, isTablet } = useViewport();
  const isCompact = isMobile || isTablet;
  const kpiCols = isMobile ? 2 : isTablet ? 3 : 5;
  const gridCols = isMobile ? 1 : isTablet ? 2 : 4;

  // Must mirror AppShell's <main> padding exactly, or the page's negative-margin
  // bleed trick below will overpull and eat into the reserved bottom-bar space.
  const mainPad = isMobile
    ? { top: 16, side: 16, bottom: 84 }
    : { top: 32, side: 32, bottom: 32 };
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics/overview").then(({ data }) => setOverview(data)).finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Analytics" description="Program performance trends and key monitoring statistics.">
      <div
        style={{
          ...styles.page,
          margin: `-${mainPad.top}px -${mainPad.side}px -${mainPad.bottom}px`,
          width: `calc(100% + ${mainPad.side * 2}px)`,
          padding: `${mainPad.top}px ${mainPad.side}px ${mainPad.bottom}px`,
          height: isCompact ? "auto" : styles.page.height,
          minHeight: isCompact ? `calc(100% + ${mainPad.top + mainPad.bottom}px)` : undefined,
        }}
      >
        {loading || !overview ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--color-text-muted)" }}>Loading analytics…</div>
        ) : (
          <>
            {/* Row 1: KPI Cards */}
            <div style={{ ...styles.kpiRow, gridTemplateColumns: `repeat(${kpiCols}, 1fr)` }}>
              <KpiCard label="Completion Rate" value={overview.kpis.completionRate} suffix="%" icon={<svg {...iconProps}><path d="M3 17l6-6 4 4 8-8" /></svg>} />
              <KpiCard label="Completed Patients" value={overview.kpis.completedPatients} suffix="" icon={<svg {...iconProps}><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>} />
              <KpiCard label="Avg. Attendance" value={overview.kpis.avgAttendance} suffix="%" icon={<svg {...iconProps}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /></svg>} />
              <KpiCard label="Avg. Rehab Duration" value={overview.kpis.avgDurationMonths} suffix=" mo" icon={<svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>} />
              <KpiCard label="Near Completion" value={overview.kpis.nearCompletion} suffix="" icon={<svg {...iconProps}><path d="M12 2l2.6 6.6L22 10l-5 4.5L18.2 22 12 18l-6.2 4 1.2-7.5L2 10l7.4-1.4z" /></svg>} />
            </div>

            {/* Row 2: Patient Status, Age Distribution, Monthly Admissions */}
            <div style={{ ...styles.gridRow, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
              <Card title="Patient Status" span={1} maxSpan={gridCols} center>
                <DonutChart data={overview.patientStatus} size={110} />
              </Card>
              <Card title="Age Distribution" span={1} maxSpan={gridCols} center>
                <BarChart data={overview.ageDistribution} />
              </Card>
              <TimeSeriesCard title="Monthly Admissions" endpoint="/analytics/monthly-admissions" color="#7C5CFC" span={2} maxSpan={gridCols} />
            </div>

            {/* Row 3: Attendance Trend, Gender Distribution, Municipality Distribution */}
            <div style={{ ...styles.gridRow, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
              <TimeSeriesCard title="Attendance Trend" endpoint="/analytics/attendance-trend" color="#2FBF8F" suffix="%" span={2} maxSpan={gridCols} />
              <Card title="Gender Distribution" span={1} maxSpan={gridCols} center>
                <DonutChart data={overview.genderDistribution} size={110} />
              </Card>
              <Card title="Municipality Distribution" span={1} maxSpan={gridCols}>
                <BarChart data={overview.municipalityDistribution} />
              </Card>
            </div>

            {/* Row 4: Attendance by Case Manager, Recent Statistics */}
            <div
              style={{
                ...styles.gridRow,
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                flex: isCompact ? "none" : 1,
                minHeight: isCompact ? "auto" : 0,
                alignItems: isCompact ? "start" : styles.gridRow.alignItems,
              }}
            >
              <Card title="Attendance by Case Manager" span={2} maxSpan={gridCols} isMobile={isCompact}>
                {overview.attendanceByCaseManager.length === 0 ? (
                  <div style={styles.emptyText}>No case manager attendance data yet.</div>
                ) : (
                  <BarChartV data={overview.attendanceByCaseManager} />
                )}
              </Card>
              <Card title="Recent Statistics" span={2} maxSpan={gridCols} isMobile={isCompact}>
                <div style={{ ...styles.statsRow, padding: "4px 0" }}>
                  <StatBlock label="Highest Attendance" value={overview.recentStats.highestAttendance} />
                  <StatBlock label="Most Common Age Group" value={overview.recentStats.mostCommonAge} />
                  <StatBlock label="Most Active Municipality" value={overview.recentStats.mostActiveMunicipality} />
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function TimeSeriesCard({ title, endpoint, color, suffix = "", span, maxSpan }) {
  const effectiveSpan = maxSpan ? Math.min(span, maxSpan) : span;
  const [preset, setPreset] = useState("last_12_months");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [presetOpen, setPresetOpen] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let dateFrom, dateTo;
    if (preset === "custom") {
      if (!customFrom || !customTo) return;
      dateFrom = customFrom; dateTo = customTo;
    } else {
      const range = computeRange(preset);
      dateFrom = toISO(range.from); dateTo = toISO(range.to);
    }
    setLoading(true);
    api.get(endpoint, { params: { dateFrom, dateTo } }).then(({ data }) => setData(data.data)).finally(() => setLoading(false));
  }, [preset, customFrom, customTo, endpoint]);

  return (
    <div style={{ ...styles.card, gridColumn: `span ${effectiveSpan}` }}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>{title}</div>
        <div style={{ position: "relative" }}>
          <button type="button" style={styles.presetBtn} onClick={() => setPresetOpen((v) => !v)}>
            {PRESETS.find((p) => p.key === preset)?.label}
            <svg {...iconProps} width="12" height="12"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {presetOpen && (
            <>
              <div style={styles.menuBackdrop} onClick={() => setPresetOpen(false)} />
              <div style={styles.presetMenu}>
                {PRESETS.map((p) => (
                  <button key={p.key} type="button" style={styles.presetOption} onClick={() => { setPreset(p.key); setPresetOpen(false); }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {preset === "custom" && (
        <div style={styles.dateRange}>
          <input type="date" style={styles.dateInput} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          <span>–</span>
          <input type="date" style={styles.dateInput} value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
        </div>
      )}

      {loading ? (
        <div style={styles.emptyText}>Loading…</div>
      ) : (
        <LineChart data={data} color={color} suffix={suffix} />
      )}
    </div>
  );
}

function Card({ title, span, center, children, maxSpan, isMobile }) {
  const effectiveSpan = maxSpan ? Math.min(span, maxSpan) : span;
  return (
    <div
      style={{
        ...styles.card,
        gridColumn: `span ${effectiveSpan}`,
        overflow: isMobile ? "visible" : styles.card.overflow,
        minHeight: isMobile ? "auto" : styles.card.minHeight,
      }}
    >
      <div style={styles.cardTitle}>{title}</div>
      <div style={{ display: "flex", justifyContent: center ? "center" : "flex-start", alignItems: "center", flex: 1 }}>
        {children}
      </div>
    </div>
  );
}

function StatBlock({ label, value }) {
  return (
    <div style={styles.statBlock}>
      <div style={styles.statBlockValue}>{value}</div>
      <div style={styles.statBlockLabel}>{label}</div>
    </div>
  );
}

const styles = {
  page: { background: "#F6F5F1", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14, height: "calc(100% + 64px)" },

  kpiRow: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 },
  gridRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, alignItems: "stretch" },

  card: {
    background: "#fff", borderRadius: 18, padding: 14, boxShadow: "0 2px 10px rgba(20,20,40,0.05)",
    display: "flex", flexDirection: "column", gap: 8, minHeight: 90, overflow: "auto",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "var(--color-text)" },
  emptyText: { color: "var(--color-text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" },

  presetBtn: { display: "flex", alignItems: "center", gap: 6, background: "#F6F5F1", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" },
  menuBackdrop: { position: "fixed", inset: 0, zIndex: 30 },
  presetMenu: { position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", borderRadius: 12, boxShadow: "0 12px 28px rgba(0,0,0,0.15)", padding: 6, zIndex: 40, minWidth: 150 },
  presetOption: { display: "block", width: "100%", textAlign: "left", padding: "8px 10px", fontSize: 12, fontWeight: 600, background: "none", border: "none", borderRadius: 8, cursor: "pointer" },
  dateRange: { display: "flex", alignItems: "center", gap: 6, fontSize: 12 },
  dateInput: { border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 11, padding: "4px 6px" },

  statsRow: { display: "flex", gap: 14, width: "100%", alignItems: "stretch" },
  statBlock: {
    background: "#F8F7FF", borderRadius: 14, padding: "16px 18px", flex: 1,
    boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6,
  },
  statBlockValue: { fontSize: 14, fontWeight: 800, color: "#7C5CFC", lineHeight: 1.35 },
  statBlockLabel: { fontSize: 11, color: "var(--color-text-muted)" },
};