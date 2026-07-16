import { useEffect, useState } from "react";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";
import { KpiCard, DonutChart, LineChart, BarChartV, GaugeRing } from "../components/AnalyticsCharts.jsx";

const iconProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", width: 20, height: 20 };

const PRESETS = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "this_year", label: "This year" },
  { key: "last_12_months", label: "Last 12 months" },
  { key: "custom", label: "Custom range" },
];

function computeRange(preset) {
  const now = new Date();
  if (preset === "this_month") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
  if (preset === "last_month") {
    return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) };
  }
  if (preset === "this_year") {
    return { from: new Date(now.getFullYear(), 0, 1), to: now };
  }
  return { from: new Date(now.getFullYear(), now.getMonth() - 11, 1), to: now };
}

function toISO(d) { return d.toISOString().slice(0, 10); }

export default function Analytics() {
  const [preset, setPreset] = useState("last_12_months");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [presetOpen, setPresetOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let dateFrom, dateTo;
    if (preset === "custom") {
      if (!customFrom || !customTo) { setLoading(false); return; }
      dateFrom = customFrom; dateTo = customTo;
    } else {
      const range = computeRange(preset);
      dateFrom = toISO(range.from); dateTo = toISO(range.to);
    }
    api.get("/analytics", { params: { dateFrom, dateTo } }).then(({ data }) => setData(data)).finally(() => setLoading(false));
  }, [preset, customFrom, customTo]);

  return (
    <AppShell title="Analytics" description="Program performance trends and key monitoring statistics.">
      <div style={styles.page}>
        <div style={styles.toolbar}>
          <div style={{ position: "relative" }}>
            <button type="button" style={styles.presetBtn} onClick={() => setPresetOpen((v) => !v)}>
              {PRESETS.find((p) => p.key === preset)?.label}
              <svg {...iconProps} width="14" height="14"><path d="M6 9l6 6 6-6" /></svg>
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

          {preset === "custom" && (
            <div style={styles.dateRange}>
              <input type="date" style={styles.dateInput} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <span>–</span>
              <input type="date" style={styles.dateInput} value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          )}
        </div>

        {loading || !data ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--color-text-muted)" }}>Loading analytics…</div>
        ) : (
          <>
            <div style={styles.kpiRow}>
              <KpiCard label="Completion Rate" value={data.kpis.completionRate} suffix="%" icon={<svg {...iconProps}><path d="M3 17l6-6 4 4 8-8" /></svg>} />
              <KpiCard label="Completed Patients" value={data.kpis.completedPatients} suffix="" icon={<svg {...iconProps}><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>} />
              <KpiCard label="Avg. Attendance" value={data.kpis.avgAttendance} suffix="%" icon={<svg {...iconProps}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /></svg>} />
              <KpiCard label="Avg. Rehab Duration" value={data.kpis.avgDurationMonths} suffix=" mo" icon={<svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>} />
              <KpiCard label="Near Completion" value={data.kpis.nearCompletion} suffix="" icon={<svg {...iconProps}><path d="M12 2l2.6 6.6L22 10l-5 4.5L18.2 22 12 18l-6.2 4 1.2-7.5L2 10l7.4-1.4z" /></svg>} />
            </div>

            <div style={styles.grid}>
              <Card title="Patient Status" span={1}>
                <DonutChart data={data.patientStatus} />
              </Card>

              <Card title="Completion Rate" span={1} center>
                <GaugeRing value={data.kpis.completionRate} />
              </Card>

              <Card title="Gender Distribution" span={1}>
                <DonutChart data={data.genderDistribution} size={140} />
              </Card>

              <Card title="Monthly Admissions" span={2}>
                <LineChart data={data.monthlyAdmissions} color="#7C5CFC" />
              </Card>

              <Card title="Attendance Trend" span={2}>
                <LineChart data={data.attendanceTrend} color="#2FBF8F" />
              </Card>

              <Card title="Municipality Distribution" span={2}>
                <BarChartV data={data.municipalityDistribution} />
              </Card>

              <Card title="Age Distribution" span={2}>
                <BarChartV data={data.ageDistribution} />
              </Card>

              <Card title="Attendance by Case Manager" span={2}>
                {data.attendanceByCaseManager.length === 0 ? (
                  <div style={{ color: "var(--color-text-muted)", fontSize: 13, padding: 20, textAlign: "center" }}>No case manager attendance data yet.</div>
                ) : (
                  <BarChartV data={data.attendanceByCaseManager} />
                )}
              </Card>

              <Card title="Recent Statistics" span={2}>
                <div style={styles.statsRow}>
                  <StatBlock label="Highest Attendance" value={data.recentStats.highestAttendance} />
                  <StatBlock label="Most Common Age Group" value={data.recentStats.mostCommonAge} />
                  <StatBlock label="Most Active Municipality" value={data.recentStats.mostActiveMunicipality} />
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Card({ title, span, center, children }) {
  return (
    <div style={{ ...styles.card, gridColumn: `span ${span}`, alignItems: center ? "center" : "stretch" }}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={{ display: "flex", justifyContent: center ? "center" : "flex-start" }}>{children}</div>
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
  page: { background: "#F6F5F1", margin: "-32px", padding: 32, minHeight: "calc(100% + 64px)" },
  toolbar: { display: "flex", gap: 12, marginBottom: 24 },
  presetBtn: { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "none", borderRadius: 12, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 10px rgba(20,20,40,0.05)" },
  menuBackdrop: { position: "fixed", inset: 0, zIndex: 30 },
  presetMenu: { position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#fff", borderRadius: 12, boxShadow: "0 12px 28px rgba(0,0,0,0.15)", padding: 6, zIndex: 40, minWidth: 160 },
  presetOption: { display: "block", width: "100%", textAlign: "left", padding: "9px 12px", fontSize: 13, fontWeight: 600, background: "none", border: "none", borderRadius: 8, cursor: "pointer" },
  dateRange: { display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 12, padding: "6px 12px", boxShadow: "0 2px 10px rgba(20,20,40,0.05)" },
  dateInput: { border: "none", fontSize: 13, background: "transparent" },

  kpiRow: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 20 },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  card: { gridColumn: "span 1", background: "#fff", borderRadius: 20, padding: 22, boxShadow: "0 2px 10px rgba(20,20,40,0.05)", display: "flex", flexDirection: "column", gap: 16 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "var(--color-text)" },

  statsRow: { display: "flex", gap: 16, flexWrap: "wrap" },
  statBlock: { background: "#F8F7FF", borderRadius: 14, padding: "14px 18px", flex: 1, minWidth: 160 },
  statBlockValue: { fontSize: 15, fontWeight: 800, color: "#7C5CFC" },
  statBlockLabel: { fontSize: 11, color: "var(--color-text-muted)", marginTop: 3 },
};