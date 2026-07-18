export const CHART_COLORS = ["#2F6B4F", "#5B3EC9", "#0B5FA5", "#9A6B00", "#B3261E", "#3E8C9C"];

export function BarChart({ data }) {
  const width = 400, height = 200, padLeft = 34, padRight = 10, padTop = 24, padBottom = 28;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barGap = chartWidth / data.length;
  const barWidth = Math.min(barGap * 0.55, 60);
  const gridLines = 4;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", maxWidth: 500, height: 200 }}>
      {/* gridlines + y-axis labels */}
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = padTop + (chartHeight / gridLines) * i;
        const value = Math.round(max - (max / gridLines) * i);
        return (
          <g key={i}>
            <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#E5E4DC" strokeWidth="1" strokeDasharray="4 4" />
            <text x={padLeft - 8} y={y + 3} textAnchor="end" fontSize="9" fill="#8A8A80">{value}</text>
          </g>
        );
      })}
      {/* baseline (solid, not dashed) */}
      <line x1={padLeft} y1={padTop + chartHeight} x2={width - padRight} y2={padTop + chartHeight} stroke="#C9C8BC" strokeWidth="1" />

      {data.map((d, i) => {
        const x = padLeft + i * barGap + (barGap - barWidth) / 2;
        const h = max ? (d.value / max) * chartHeight : 0;
        const y = padTop + chartHeight - h;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barWidth} height={Math.max(h, 2)} fill={CHART_COLORS[i % CHART_COLORS.length]} rx="6" />
            <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" fontSize="12" fontWeight="700" fill="#333">{d.value}</text>
            <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="#666">{d.label}</text>
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