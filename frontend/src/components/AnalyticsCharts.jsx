import { useState } from "react";

// Lively, warm botanical green palette anchored on the user's palette:
// #357648 (Turf Green), #8FB361 (Muted Olive), #739E82 (Muted Teal), #243B12 (Black Forest), #F8F4F9 (Ghost White)
export const WARM_COLORS = [
  "#357648", // Turf Green (vibrant, healthy primary green)
  "#8FB361", // Muted Olive (warm, sunny leaf green)
  "#5C8D47", // Warm Meadow Green (lively warm mid-green)
  "#739E82", // Muted Teal (soft botanical sage)
  "#476A30", // Warm Forest Olive (rich warm olive-green)
  "#A3C478", // Soft Sunlit Pistachio (bright warm light green)
  "#243B12", // Black Forest (deep grounding forest tone)
];

const COLORS = WARM_COLORS;

export function KpiCard({
  label,
  value,
  suffix,
  icon,
  subtitle,
  accentColor = "#26653B",
  iconBg = "#E6F3E8",
  style,
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles.kpiCard,
        borderColor: hovered ? accentColor : "#DCE8DD",
        boxShadow: hovered
          ? "0 10px 24px rgba(38, 101, 59, 0.11), 0 2px 6px rgba(36, 59, 18, 0.05)"
          : "0 2px 10px rgba(38, 101, 59, 0.04), inset 0 0 0 2px rgba(230, 243, 232, 0.45)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        ...style,
      }}
    >
      <div
        style={{
          ...styles.kpiIcon,
          background: hovered ? accentColor : iconBg,
          color: hovered ? "#FFFFFF" : accentColor,
          transform: hovered ? "scale(1.04)" : "scale(1)",
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
        <div style={styles.kpiValue}>
          {value}
          {suffix && <span style={{ ...styles.kpiSuffix, color: accentColor }}>{suffix}</span>}
        </div>
        <div style={styles.kpiLabel} title={label}>
          {label}
        </div>
        {subtitle && (
          <div style={styles.kpiSubtitle} title={subtitle}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

export function DonutChart({ data, size = 130 }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-muted)",
          fontSize: 13,
        }}
      >
        No data available
      </div>
    );
  }

  const total = data.reduce((s, d) => s + Number(d.value || 0), 0) || 1;
  const strokeWidth = size <= 100 ? 15 : 18;
  const radius = size / 2 - strokeWidth / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedFraction = 0;
  const hoveredItem = hoveredIdx !== null && data[hoveredIdx] ? data[hoveredIdx] : null;
  const hoveredPct = hoveredItem ? Math.round((Number(hoveredItem.value || 0) / total) * 100) : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", width: "100%", justifyContent: "center" }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: size, height: size, flexShrink: 0, overflow: "visible" }}
      >
        {/* Warm ivory/sage background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#EFF4EE"
          strokeWidth={strokeWidth}
        />

        {data.map((d, i) => {
          const val = Number(d.value || 0);
          const fraction = val / total;
          const dashLen = Math.max(fraction * circumference - (data.length > 1 ? 2.5 : 0), 0);
          const dashOffset = -accumulatedFraction * circumference;
          accumulatedFraction += fraction;
          const isHovered = hoveredIdx === i;
          const isDimmed = hoveredIdx !== null && hoveredIdx !== i;

          return (
            <circle
              key={d.label}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
              strokeDasharray={`${dashLen} ${circumference}`}
              strokeDashoffset={dashOffset}
              strokeLinecap={data.length === 1 ? "butt" : "round"}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{
                transition: "stroke-width 0.22s ease, opacity 0.22s ease",
                opacity: isDimmed ? 0.42 : 1,
                cursor: "pointer",
              }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          );
        })}

        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fontSize={size <= 100 ? "16" : "19"}
          fontWeight="800"
          fill="var(--color-text, #1F2421)"
          style={{ transition: "all 0.2s ease" }}
        >
          {hoveredItem ? `${hoveredPct}%` : total}
        </text>
        <text
          x={cx}
          y={cy + 13}
          textAnchor="middle"
          fontSize="9.5"
          fontWeight="700"
          fill="#357648"
          style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
        >
          {hoveredItem ? `${hoveredItem.value} cases` : "Total"}
        </text>
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 115, flex: "1 1 auto" }}>
        {data.map((d, i) => {
          const pct = Math.round((Number(d.value || 0) / total) * 100);
          const isHovered = hoveredIdx === i;
          const itemColor = COLORS[i % COLORS.length];
          return (
            <div
              key={d.label}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 8,
                background: isHovered ? "#F2F7F1" : "transparent",
                transition: "background 0.18s ease, transform 0.18s ease",
                transform: isHovered ? "translateX(2px)" : "translateX(0)",
                cursor: "default",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 3,
                    background: itemColor,
                    flexShrink: 0,
                    boxShadow: isHovered ? `0 0 0 3px rgba(143, 179, 97, 0.3)` : "none",
                    transition: "box-shadow 0.18s ease",
                  }}
                />
                <span
                  style={{
                    textTransform: "capitalize",
                    color: "var(--color-text, #1F2421)",
                    fontWeight: isHovered ? 700 : 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={d.label}
                >
                  {d.label}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                <span style={{ fontWeight: 700, color: "#243B12" }}>{d.value}</span>
                <span style={{ fontSize: 10.5, color: "#357648", fontWeight: 600 }}>({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LineChart({ data, color = "#357648", suffix = "" }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: 125,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-muted)",
          fontSize: 13,
        }}
      >
        No data available
      </div>
    );
  }

  const width = 480;
  const height = 128;
  const padLeft = 34;
  const padRight = 14;
  const padTop = 18;
  const padBottom = 24;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;
  const max = Math.max(...data.map((d) => Number(d.value || 0)), 1);
  const stepX = chartWidth / Math.max(data.length - 1, 1);
  const gridLines = 4;
  const gradId = `warmLineGrad-${color.replace(/[^a-zA-Z0-9]/g, "")}`;

  const points = data.map((d, i) => {
    const val = Number(d.value || 0);
    const x = padLeft + i * stepX;
    const y = padTop + chartHeight - (val / max) * chartHeight;
    return { x, y, ...d, value: val };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${padTop + chartHeight} L${points[0].x},${padTop + chartHeight} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: 128, overflow: "visible" }}
      onMouseLeave={() => setHoveredIdx(null)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="65%" stopColor={color} stopOpacity="0.08" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Warm Gridlines & Y-Axis Labels */}
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = padTop + (chartHeight / gridLines) * i;
        const value = Math.round(max - (max / gridLines) * i);
        return (
          <g key={i}>
            <line
              x1={padLeft}
              y1={y}
              x2={width - padRight}
              y2={y}
              stroke="#EAE6DF"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={padLeft - 8}
              y={y + 3}
              textAnchor="end"
              fontSize="9.5"
              fontWeight="600"
              fill="#6B7268"
            >
              {value}
              {suffix}
            </text>
          </g>
        );
      })}

      {/* Warm Gradient Area & Line */}
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Hover Guide & Points */}
      {points.map((p, i) => {
        const isHovered = hoveredIdx === i;
        return (
          <g
            key={p.label}
            onMouseEnter={() => setHoveredIdx(i)}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={p.x - stepX / 2}
              y={padTop}
              width={stepX}
              height={chartHeight + padBottom}
              fill="transparent"
            />

            {isHovered && (
              <line
                x1={p.x}
                y1={padTop}
                x2={p.x}
                y2={padTop + chartHeight}
                stroke={color}
                strokeOpacity="0.45"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
            )}

            {isHovered && (
              <circle
                cx={p.x}
                cy={p.y}
                r="7.5"
                fill={color}
                opacity="0.18"
              />
            )}

            <circle
              cx={p.x}
              cy={p.y}
              r={isHovered ? "4.5" : "3.3"}
              fill={isHovered ? "#FFFFFF" : color}
              stroke={color}
              strokeWidth={isHovered ? "2.6" : "1.5"}
              style={{ transition: "all 0.18s ease" }}
            />

            {isHovered && (
              <g transform={`translate(${Math.min(Math.max(p.x, padLeft + 26), width - padRight - 26)}, ${Math.max(p.y - 12, 12)})`}>
                <rect
                  x="-26"
                  y="-16"
                  width="52"
                  height="18"
                  rx="5"
                  fill={color}
                />
                <text
                  x="0"
                  y="-4"
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="700"
                  fill="#FFFFFF"
                >
                  {p.value}
                  {suffix}
                </text>
              </g>
            )}

            <text
              x={p.x}
              y={height - 6}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight={isHovered ? "700" : "500"}
              fill={isHovered ? "#243B12" : "#6B7268"}
            >
              {p.label.split(" ")[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function BarChart({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: 145,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-muted)",
          fontSize: 13,
        }}
      >
        No data available
      </div>
    );
  }

  const width = 380;
  const height = 148;
  const padTop = 26;
  const padBottom = 26;
  const max = Math.max(...data.map((d) => Number(d.value || 0)), 1);
  const chartHeight = height - padTop - padBottom;
  const barGap = width / data.length;
  const barWidth = Math.min(barGap * 0.52, 44);
  const gridLines = 4;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: 148 }}
      onMouseLeave={() => setHoveredIdx(null)}
    >
      {/* Warm Gridlines */}
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = padTop + (chartHeight / gridLines) * i;
        return (
          <line
            key={i}
            x1={0}
            y1={y}
            x2={width}
            y2={y}
            stroke="#EAE6DF"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        );
      })}

      {data.map((d, i) => {
        const val = Number(d.value || 0);
        const x = i * barGap + (barGap - barWidth) / 2;
        const h = max ? (val / max) * chartHeight : 0;
        const y = padTop + chartHeight - h;
        const isHovered = hoveredIdx === i;
        const barColor = COLORS[i % COLORS.length];

        return (
          <g
            key={d.label}
            onMouseEnter={() => setHoveredIdx(i)}
            style={{ cursor: "pointer" }}
          >
            {/* Soft warm sage column track */}
            <rect
              x={x}
              y={padTop}
              width={barWidth}
              height={chartHeight}
              fill="#F3F7F2"
              rx="7"
              opacity={isHovered ? 1 : 0.65}
            />

            {/* Bar */}
            <rect
              x={x}
              y={val > 0 ? y : padTop + chartHeight - 3}
              width={barWidth}
              height={val > 0 ? Math.max(h, 4) : 3}
              fill={barColor}
              rx="7"
              opacity={hoveredIdx !== null && !isHovered ? 0.65 : 1}
              style={{ transition: "all 0.25s cubic-bezier(0.22, 1, 0.36, 1)" }}
            />

            {/* Value label */}
            <text
              x={x + barWidth / 2}
              y={val > 0 ? y - 7 : padTop + chartHeight - 8}
              textAnchor="middle"
              fontSize="11"
              fontWeight="800"
              fill={isHovered ? "#357648" : "var(--color-text, #1F2421)"}
            >
              {val}
            </text>

            {/* Category label */}
            <text
              x={x + barWidth / 2}
              y={height - 7}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight={isHovered ? "700" : "600"}
              fill={isHovered ? "#243B12" : "#6B7268"}
            >
              {d.label.length > 14 ? `${d.label.slice(0, 12)}…` : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function BarChartV({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
        No data available
      </div>
    );
  }

  const max = Math.max(...data.map((d) => Number(d.value || 0)), 100);
  const gridMarks = [0, 25, 50, 75, 100];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      {data.map((d, i) => {
        const isHovered = hoveredIdx === i;
        const barColor = COLORS[i % COLORS.length];
        return (
          <div
            key={d.label}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "6px 8px",
              borderRadius: 10,
              background: isHovered ? "#F2F7F1" : "transparent",
              transition: "background 0.2s ease",
            }}
          >
            <div
              style={{
                width: 110,
                fontSize: 12,
                fontWeight: isHovered ? 700 : 600,
                color: "var(--color-text, #1F2421)",
                flexShrink: 0,
                textAlign: "right",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={d.label}
            >
              {d.label}
            </div>
            <div style={{ flex: 1, position: "relative", height: 14 }}>
              <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "space-between" }}>
                {gridMarks.map((m) => (
                  <div key={m} style={{ width: 1, height: "100%", borderLeft: "1px dashed #E5E2DA" }} />
                ))}
              </div>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#EFF4EE",
                  borderRadius: 999,
                }}
              />
              <div
                style={{
                  position: "relative",
                  width: `${Math.min((Number(d.value || 0) / max) * 100, 100)}%`,
                  background: `linear-gradient(90deg, ${barColor}, #8FB361)`,
                  height: "100%",
                  borderRadius: 999,
                  transition: "width 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
            </div>
            <div style={{ width: 42, fontSize: 12, fontWeight: 800, color: "#357648", textAlign: "right" }}>
              {d.value}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HorizontalBarChart({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: 140,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-muted)",
          fontSize: 13,
        }}
      >
        No distribution data available
      </div>
    );
  }

  const totalPatients = data.reduce((sum, d) => sum + (d.count || d.value || 0), 0) || 1;

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, padding: "2px 0" }}>
      {data.map((d, i) => {
        const pct = d.percentage != null ? d.percentage : Math.round(((d.count || d.value || 0) / totalPatients) * 100);
        const sessionCount = d.sessionCount;
        const patientCount = d.count || d.value || 0;
        const barColor = COLORS[i % COLORS.length];
        const isHovered = hoveredIdx === i;

        return (
          <div
            key={d.label}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: "6px 10px",
              borderRadius: 10,
              background: isHovered ? "#F2F7F1" : "transparent",
              transition: "background 0.2s ease, transform 0.2s ease",
              transform: isHovered ? "translateX(2px)" : "translateX(0)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 3,
                    background: barColor,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontWeight: 700, color: "var(--color-text, #1F2421)" }}>{d.label}</span>
                <span style={{ fontSize: 11, color: "#6B7268", fontWeight: 500 }}>
                  ({patientCount} {patientCount === 1 ? "patient" : "patients"})
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 11.5,
                    color: "#357648",
                    background: "#E8F4EC",
                    padding: "2px 8px",
                    borderRadius: 999,
                  }}
                >
                  {pct}%
                </span>
                {sessionCount != null && (
                  <>
                    <span style={{ color: "#8FB361" }}>•</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7268" }}>
                      {sessionCount} {sessionCount === 1 ? "session" : "sessions"}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Horizontal Track & Bar */}
            <div
              style={{
                width: "100%",
                height: 9,
                background: "#EFF4EE",
                borderRadius: 999,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(Math.max(pct, 3), 100)}%`,
                  background: `linear-gradient(90deg, ${barColor}, #8FB361)`,
                  borderRadius: 999,
                  transition: "width 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function GaugeRing({ value, size = 140 }) {
  const radius = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg viewBox={`0 0 ${size} ${size / 2 + 20}`} style={{ width: size, height: size / 2 + 20 }}>
      <path
        d={`M14,${cy} A${radius},${radius} 0 0 1 ${size - 14},${cy}`}
        fill="none"
        stroke="#EFF4EE"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d={`M14,${cy} A${radius},${radius} 0 0 1 ${size - 14},${cy}`}
        fill="none"
        stroke="#357648"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--color-text, #1F2421)">
        {value}%
      </text>
    </svg>
  );
}

const styles = {
  kpiCard: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#FFFFFF",
    borderRadius: 16,
    padding: "12px 14px",
    border: "1.5px solid #DCE8DD",
    minWidth: 0,
    minHeight: 80,
    boxSizing: "border-box",
    transition: "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s ease, border-color 0.22s ease",
    cursor: "default",
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "background 0.22s ease, color 0.22s ease, transform 0.22s ease",
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 800,
    color: "var(--color-text, #1F2421)",
    lineHeight: 1.15,
    letterSpacing: "-0.02em",
  },
  kpiSuffix: {
    fontSize: 12.5,
    fontWeight: 700,
    marginLeft: 1,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--color-text, #1F2421)",
    marginTop: 2,
    lineHeight: 1.25,
    wordBreak: "break-word",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  kpiSubtitle: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--color-text-muted, #6B7268)",
    marginTop: 2,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};
