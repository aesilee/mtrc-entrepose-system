export const CHART_COLORS = ["#2F6B4F", "#5B3EC9", "#0B5FA5", "#9A6B00", "#B3261E", "#3E8C9C"];

export function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <svg viewBox="0 0 400 200" style={{ width: "100%", maxWidth: 500, height: 200 }}>
      {data.map((d, i) => {
        const barWidth = 60;
        const gap = 400 / data.length;
        const x = i * gap + (gap - barWidth) / 2;
        const h = (d.value / max) * 140;
        return (
          <g key={d.label}>
            <rect x={x} y={160 - h} width={barWidth} height={h} fill={CHART_COLORS[i % CHART_COLORS.length]} rx="6" />
            <text x={x + barWidth / 2} y={150 - h} textAnchor="middle" fontSize="12" fontWeight="700" fill="#333">{d.value}</text>
            <text x={x + barWidth / 2} y={178} textAnchor="middle" fontSize="10" fill="#666">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function PieChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  let angle = 0;
  const radius = 80, cx = 100, cy = 100;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <svg viewBox="0 0 200 200" style={{ width: 200, height: 200 }}>
        {data.map((d, i) => {
          const slice = (d.value / total) * 360;
          const startAngle = angle;
          angle += slice;
          const endAngle = angle;
          const largeArc = slice > 180 ? 1 : 0;
          const x1 = cx + radius * Math.cos((Math.PI * startAngle) / 180);
          const y1 = cy + radius * Math.sin((Math.PI * startAngle) / 180);
          const x2 = cx + radius * Math.cos((Math.PI * endAngle) / 180);
          const y2 = cy + radius * Math.sin((Math.PI * endAngle) / 180);
          return <path key={d.label} d={`M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`} fill={CHART_COLORS[i % CHART_COLORS.length]} />;
        })}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map((d, i) => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: CHART_COLORS[i % CHART_COLORS.length] }} />
            {d.label}: {d.value} ({Math.round((d.value / total) * 100)}%)
          </div>
        ))}
      </div>
    </div>
  );
}