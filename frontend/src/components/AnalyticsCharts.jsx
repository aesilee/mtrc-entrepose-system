const COLORS = ["#7C5CFC", "#FF8A5C", "#2FBF8F", "#FFC24B", "#4EA1FF", "#FF5C7C", "#9A6BFF"];

export function KpiCard({ label, value, suffix, icon }) {
  return (
    <div style={styles.kpiCard}>
      <div style={styles.kpiIcon}>{icon}</div>
      <div>
        <div style={styles.kpiValue}>{value}{suffix}</div>
        <div style={styles.kpiLabel}>{label}</div>
      </div>
    </div>
  );
}

export function DonutChart({ data, size = 160 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = size / 2 - 14;
  const cx = size / 2, cy = size / 2;
  let angle = -90;

  // A slice covering the full 360° can't be drawn as a single SVG arc
  // (start point === end point, so nothing renders). Detect that case
  // and draw a full circle instead.
  const singleFullSlice = data.length === 1;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
        {/* background track so empty/partial portions are still visible */}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#F0EEFA" strokeWidth="20" />

        {singleFullSlice ? (
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke={COLORS[0]} strokeWidth="20" />
        ) : (
          data.map((d, i) => {
            const slice = (d.value / total) * 360;
            const start = angle;
            angle += slice;
            const end = angle;
            const largeArc = slice > 180 ? 1 : 0;
            const x1 = cx + radius * Math.cos((Math.PI * start) / 180);
            const y1 = cy + radius * Math.sin((Math.PI * start) / 180);
            const x2 = cx + radius * Math.cos((Math.PI * end) / 180);
            const y2 = cy + radius * Math.sin((Math.PI * end) / 180);
            return (
              <path key={d.label} d={`M${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2}`}
                fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="20" strokeLinecap="round" />
            );
          })
        )}

        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--color-text)">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="var(--color-text-muted)">Total</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.map((d, i) => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: COLORS[i % COLORS.length] }} />
            <span style={{ textTransform: "capitalize" }}>{d.label}</span>
            <span style={{ color: "var(--color-text-muted)" }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({ data, color = "#7C5CFC", suffix = "" }) {
  const width = 480, height = 150, padLeft = 34, padRight = 12, padTop = 16, padBottom = 24;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = chartWidth / Math.max(data.length - 1, 1);
  const gridLines = 4;

  const points = data.map((d, i) => {
    const x = padLeft + i * stepX;
    const y = padTop + chartHeight - (d.value / max) * chartHeight;
    return { x, y, ...d };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${padTop + chartHeight} L${points[0].x},${padTop + chartHeight} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 150 }}>
      {/* gridlines + y-axis labels */}
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = padTop + (chartHeight / gridLines) * i;
        const value = Math.round(max - (max / gridLines) * i);
        return (
          <g key={i}>
            <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#EEEDF6" strokeWidth="1" strokeDasharray="4 4" />
            <text x={padLeft - 8} y={y + 3} textAnchor="end" fontSize="9" fill="var(--color-text-muted)">{value}{suffix}</text>
          </g>
        );
      })}

      <path d={areaPath} fill={color} opacity="0.08" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" />
      {points.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
          <text x={p.x} y={height - 6} textAnchor="middle" fontSize="9" fill="var(--color-text-muted)">{p.label.split(" ")[0]}</text>
        </g>
      ))}
    </svg>
  );
}

export function BarChart({ data }) {
  const width = 380, height = 180, padTop = 30, padBottom = 26;
  const max = Math.max(...data.map((d) => d.value), 1);
  const chartHeight = height - padTop - padBottom;
  const barGap = width / data.length;
  const barWidth = Math.min(barGap * 0.5, 48);
  const gridLines = 4;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 180 }}>
      {/* gridlines */}
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = padTop + (chartHeight / gridLines) * i;
        return <line key={i} x1={0} y1={y} x2={width} y2={y} stroke="#EEEDF6" strokeWidth="1" strokeDasharray="4 4" />;
      })}

      {data.map((d, i) => {
        const x = i * barGap + (barGap - barWidth) / 2;
        const h = max ? (d.value / max) * chartHeight : 0;
        const y = padTop + chartHeight - h;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barWidth} height={Math.max(h, 2)} fill={COLORS[i % COLORS.length]} rx="6" />
            <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-text)">{d.value}</text>
            <text x={x + barWidth / 2} y={height - 6} textAnchor="middle" fontSize="10" fill="var(--color-text-muted)">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function BarChartV({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const gridMarks = [0, 25, 50, 75, 100];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {data.map((d, i) => (
        <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 90, fontSize: 12, color: "var(--color-text-muted)", flexShrink: 0, textAlign: "right" }}>{d.label}</div>
          <div style={{ flex: 1, position: "relative", height: 16 }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "space-between" }}>
              {gridMarks.map((m) => (
                <div key={m} style={{ width: 1, height: "100%", borderLeft: "1px dashed #EEEDF6" }} />
              ))}
            </div>
            <div style={{ position: "absolute", inset: 0, background: "#F8F7FF", borderRadius: 999 }} />
            <div style={{ position: "relative", width: `${(d.value / max) * 100}%`, background: COLORS[i % COLORS.length], height: "100%", borderRadius: 999 }} />
          </div>
          <div style={{ width: 30, fontSize: 12, fontWeight: 700 }}>{d.value}</div>
        </div>
      ))}
    </div>
  );
}

export function GaugeRing({ value, size = 140 }) {
  const radius = size / 2 - 14;
  const cx = size / 2, cy = size / 2;
  const circumference = Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg viewBox={`0 0 ${size} ${size / 2 + 20}`} style={{ width: size, height: size / 2 + 20 }}>
      <path d={`M14,${cy} A${radius},${radius} 0 0 1 ${size - 14},${cy}`} fill="none" stroke="#F2F1EC" strokeWidth="14" strokeLinecap="round" />
      <path d={`M14,${cy} A${radius},${radius} 0 0 1 ${size - 14},${cy}`} fill="none" stroke="#7C5CFC" strokeWidth="14"
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--color-text)">{value}%</text>
    </svg>
  );
}

const styles = {
  kpiCard: { display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 18, padding: "16px 18px", boxShadow: "0 2px 10px rgba(20,20,40,0.05)" },
  kpiIcon: { width: 40, height: 40, borderRadius: 12, background: "#F1EEFF", color: "#7C5CFC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  kpiValue: { fontSize: 20, fontWeight: 800, color: "var(--color-text)" },
  kpiLabel: { fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 },
};