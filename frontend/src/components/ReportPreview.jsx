import { BarChart, PieChart } from "./ReportCharts.jsx";
import useOrgSettings from "../hooks/useOrgSettings.js";

function formatLabel(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

export default function ReportPreview({ report, compact }) {
  const org = useOrgSettings();
  return (
    <div className="report-print-area" style={{ ...styles.card, padding: compact ? 20 : 28 }}>
      {org && (org.organization_name || org.organization_logo) && (
        <div style={styles.orgHeader}>
          {org.organization_logo ? (
            <img src={org.organization_logo} alt="Organization logo" style={styles.orgLogo} />
          ) : (
            <div style={styles.orgLogo} />
          )}
          <div style={styles.orgTextBlock}>
            <div style={styles.orgName}>{org.organization_name}</div>
            {org.organization_address && <div style={styles.orgLine}>{org.organization_address}</div>}
            <div style={styles.orgLine}>
              {[
                org.admission_no && `Admission: ${org.admission_no}`,
                org.administrative_no && `Administrative: ${org.administrative_no}`,
                org.organization_email,
              ]
                .filter(Boolean)
                .join("  |  ")}
            </div>
          </div>
          <div style={styles.orgLogo} />
        </div>
      )}
      <div style={styles.header}>
        <div style={styles.title}>{report.title}</div>
        <div style={styles.meta}>{report.dateRangeLabel || report.dateRange}</div>
      </div>
      <p style={styles.description}>{report.description}</p>

      <div style={styles.statsGrid}>
        {Object.entries(report.stats).map(([key, value]) => (
          <div key={key} style={styles.statChip}>
            <div style={styles.statValue}>{value ?? "—"}</div>
            <div style={styles.statLabel}>{formatLabel(key)}</div>
          </div>
        ))}
      </div>

      {report.chart && report.chart.data.length > 0 && (
        <div style={styles.chartWrap}>
          {report.chart.type === "bar" ? <BarChart data={report.chart.data} /> : <PieChart data={report.chart.data} />}
        </div>
      )}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>{report.rows[0] && Object.keys(report.rows[0]).map((k) => <th key={k} style={styles.th}>{formatLabel(k)}</th>)}</tr>
          </thead>
          <tbody>
            {report.rows.map((row, i) => (
              <tr key={i}>{Object.values(row).map((v, j) => <td key={j} style={styles.td}>{v ?? "—"}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  card: { background: "var(--color-surface)" },
  header: { marginBottom: 6 },
  title: { fontSize: 18, fontWeight: 800, color: "var(--color-primary-dark)" },
  meta: { fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 },
  description: { fontSize: 12, color: "var(--color-text-muted)", marginBottom: 18, lineHeight: 1.6 },
  statsGrid: { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statChip: { background: "var(--color-primary-tint)", borderRadius: "var(--radius-sm)", padding: "10px 14px", minWidth: 110 },
  statValue: { fontSize: 16, fontWeight: 800, color: "var(--color-primary-dark)" },
  statLabel: { fontSize: 10, color: "var(--color-text-muted)", marginTop: 2, textTransform: "capitalize" },
  chartWrap: { marginBottom: 22, background: "#FAFAF8", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md, 10px)", padding: 16 },
  tableWrap: { border: "1px solid var(--color-border)", borderRadius: "var(--radius-md, 10px)", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", background: "#FAFAF8" },
  td: { padding: "8px 10px", borderBottom: "1px solid var(--color-border)" },
  orgHeader: { display: "flex", alignItems: "center", gap: 16, paddingBottom: 14, marginBottom: 18, borderBottom: "1px solid var(--color-border)" },
  orgLogo: { width: 56, height: 56, objectFit: "contain", background: "#fff", borderRadius: "var(--radius-sm)", flexShrink: 0 },
  orgTextBlock: { flex: 1, textAlign: "center" },
  orgName: { fontSize: 16, fontWeight: 800, color: "var(--color-text)", textTransform: "uppercase", letterSpacing: 0.3 },
  orgLine: { fontSize: 11, color: "var(--color-text-muted)", marginTop: 3 },
};