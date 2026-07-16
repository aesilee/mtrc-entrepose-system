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

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
        {data.map((d, i) => {
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
        })}
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
  const width = 480, height = 160, pad = 24;
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = (width - pad * 2) / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = height - pad - (d.value / max) * (height - pad * 2);
    return { x, y, ...d };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${height - pad} L${points[0].x},${height - pad} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 160 }}>
      <path d={areaPath} fill={color} opacity="0.08" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" />
      {points.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
          <text x={p.x} y={height - 4} textAnchor="middle" fontSize="9" fill="var(--color-text-muted)">{p.label.split(" ")[0]}</text>
        </g>
      ))}
    </svg>
  );
}

export function BarChartV({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d, i) => (
        <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 90, fontSize: 12, color: "var(--color-text-muted)", flexShrink: 0, textAlign: "right" }}>{d.label}</div>
          <div style={{ flex: 1, background: "#F2F1EC", borderRadius: 999, height: 16, position: "relative" }}>
            <div style={{ width: `${(d.value / max) * 100}%`, background: COLORS[i % COLORS.length], height: "100%", borderRadius: 999 }} />
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