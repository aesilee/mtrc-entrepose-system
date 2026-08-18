import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import { useAuth } from "../context/AuthContext.jsx";

import api from "../api/axios.js";
import { DonutChart, BarChart } from "../components/AnalyticsCharts.jsx";
import useViewport from "../hooks/useViewport.js";
import ProgressNoteModal from "../components/ProgressNoteModal.jsx";
import FollowUpModal from "../components/FollowUpModal.jsx";

const kpiIconProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", width: "18", height: "18" };

const HIM_KPI_ICONS = {
  patients: <svg {...kpiIconProps}><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 9h6M9 13h6" /></svg>,
  status: <svg {...kpiIconProps}><path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" /><path d="M9.5 12l2 2 3.5-3.5" /></svg>,
  users: <svg {...kpiIconProps}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.5 2.9-6 5.5-6s5.5 2.5 5.5 6" /><circle cx="17" cy="8" r="2.6" /><path d="M15.5 14.2c2.4.3 4.5 2.6 4.5 5.8" /></svg>,
  online: <svg {...kpiIconProps}><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg>,
  reports: <svg {...kpiIconProps}><path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M9 12h6M9 16h6M9 8h2" /></svg>,
  permissions: <svg {...kpiIconProps}><path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" /></svg>,
  auditLogs: <svg {...kpiIconProps}><path d="M4 20V10" /><path d="M11 20V4" /><path d="M18 20v-7" /><path d="M3 20h18" /></svg>,
};

const iconProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

const ICONS = {
  users: <svg {...iconProps}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.5 2.9-6 5.5-6s5.5 2.5 5.5 6" /><circle cx="17" cy="8" r="2.6" /><path d="M15.5 14.2c2.4.3 4.5 2.6 4.5 5.8" /></svg>,
  online: <svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg>,
  patients: <svg {...iconProps}><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 9h6M9 13h6" /></svg>,
  status: <svg {...iconProps}><path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" /><path d="M9.5 12l2 2 3.5-3.5" /></svg>,
  createUser: <svg {...iconProps}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.5 2.9-6 5.5-6s5.5 2.5 5.5 6" /><path d="M18 8v6M15 11h6" /></svg>,
  backup: <svg {...iconProps}><path d="M3 15a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>,
  restore: <svg {...iconProps}><path d="M21 15a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></svg>,
  auditLogs: <svg {...iconProps}><path d="M4 20V10" /><path d="M11 20V4" /><path d="M18 20v-7" /><path d="M3 20h18" /></svg>,
  permissions: <svg {...iconProps}><path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" /></svg>,
  reports: <svg {...iconProps}><path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M9 12h6M9 16h6M9 8h2" /></svg>,
  analytics: <svg {...iconProps}><path d="M4 20V10M11 20V4M18 20v-7" /></svg>,
  therapy: <svg {...iconProps}><polyline points="3 12 7 6 11 15 15 9 18 12 21 12" /></svg>,
  rehabStatus: <svg {...iconProps}><path d="M3 17l6-6 4 4 8-8" /><path d="M15 6h6v6" /></svg>,
};

// recentActivity and systemNotifications are loaded at runtime from the dashboard APIs

const SYSTEM_HEALTH = [
  { label: "Database", value: "—" },
  { label: "API", value: "—" },
  { label: "Last Backup", value: "—" },
  { label: "Storage Used", value: "—" },
  { label: "Server Response", value: "—" },
];

const QUICK_ACTIONS = [
  { key: "createUser", label: "Create User", icon: ICONS.createUser, path: "/settings/users" },
  { key: "backup", label: "Backup Database", icon: ICONS.backup, path: null },
  { key: "restore", label: "Restore Backup", icon: ICONS.restore, path: null },
  { key: "auditLogs", label: "View Audit Logs", icon: ICONS.auditLogs, path: "/settings/audit-logs" },
  { key: "permissions", label: "Manage Permissions", icon: ICONS.permissions, path: "/settings" },
];

function IctAdminDashboard() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useViewport();
  const statCols = isMobile ? 1 : isTablet ? 2 : 5;
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemNotifications, setSystemNotifications] = useState([]);
  const [dashboardExtrasLoading, setDashboardExtrasLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard/stats").then(({ data }) => setStats(data)).catch(() => {});

    Promise.allSettled([
      api.get("/dashboard/him-stats"),
      // Request only system-category notifications from the API
      api.get("/notifications?category=system"),
    ]).then((results) => {
      const [himRes, notifRes] = results;
      if (himRes.status === "fulfilled") {
        setRecentActivity(himRes.value.data.recentActivity || []);
      }
      if (notifRes.status === "fulfilled") {
        // Filter system notifications to only those likely indicating bugs/errors/critical issues
        const raw = notifRes.value.data.notifications || [];
        const errRegex = /error|fail|exception|critical|bug/i;
        const filtered = raw.filter(n => n.type === 'error' || (n.message && errRegex.test(n.message)));
        setSystemNotifications(filtered);
      }
      setDashboardExtrasLoading(false);
    });
  }, []);

  const statCards = [
    { key: "totalUsers", label: "Total Users", value: stats?.totalUsers ?? "—", icon: ICONS.users },
    { key: "onlineUsers", label: "Online Users", value: stats?.onlineUsers ?? "—", icon: ICONS.online },
    { key: "totalPatients", label: "Total Patients", value: stats?.totalPatients ?? "—", icon: ICONS.patients },
    { key: "archivedRecords", label: "Archived Records", value: stats?.archivedRecords ?? stats?.archivedPatients ?? "—", icon: ICONS.status },
    { key: "systemStatus", label: "System Status", value: stats?.systemStatus ?? "—", icon: ICONS.status },
  ];

  return (
    <div style={styles.grid}>
      <div style={{ ...styles.statsRow, gridTemplateColumns: `repeat(${statCols}, 1fr)` }}>
        {statCards.map((card) => (
          <div key={card.key} style={styles.statCard}>
            <div style={styles.statIcon}>{card.icon}</div>
            <div>
              <div style={styles.statValue}>{card.value}</div>
              <div style={styles.statLabel}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...styles.twoColRow, flexDirection: isMobile ? "column" : "row" }}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Recent User Activity</div>
          <div style={styles.list}>
            {recentActivity && recentActivity.length ? (
              recentActivity.map((item, i) => (
                <div key={i} style={styles.activityRow}>
                  <span style={styles.activityUser}>{item.actor_username || item.user || '—'}</span>
                  <span style={styles.activityAction}>{item.action || item.activity || '—'}</span>
                  <span style={styles.activityTime}>{timeAgo(item.created_at || item.time || new Date())}</span>
                </div>
              ))
            ) : (
              <div style={styles.activityRow}>
                <span style={styles.activityUser}>—</span>
                <span style={styles.activityAction}>No recent activity yet</span>
                <span style={styles.activityTime}>—</span>
              </div>
            )}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>System Notifications</div>
          <div style={styles.list}>
            {systemNotifications && systemNotifications.length ? (
              systemNotifications.map((item, i) => (
                <div key={i} style={styles.notificationRow}>
                  <span>{item.message}</span>
                  <span style={styles.activityTime}>{timeAgo(item.created_at)}</span>
                </div>
              ))
            ) : (
              <div style={styles.notificationRow}>
                <span>No notifications yet.</span>
                <span style={styles.activityTime}>—</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ ...styles.twoColRow, flexDirection: isMobile ? "column" : "row" }}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>System Health</div>
          <div style={styles.healthGrid}>
            {SYSTEM_HEALTH.map((item) => (
              <div key={item.label} style={styles.healthItem}>
                <span style={styles.healthLabel}>{item.label}</span>
                <span style={styles.healthValue}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Quick Actions</div>
          <div style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.key}
                type="button"
                style={styles.actionBtn}
                onClick={() => (action.path ? navigate(action.path) : null)}
                disabled={!action.path}
              >
                <span style={styles.actionIcon}>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Dashboard-only Monthly Admissions line chart.
 *
 * Fully responsive: measures its own container width via ResizeObserver,
 * so the SVG viewBox always matches the real rendered pixel width. This
 * means the browser never needs to scale/stretch the SVG to fit (no
 * preserveAspectRatio side effects), and the plotted line reaches the
 * true edges of whatever container it's given.
 *
 * padLeft/padRight are kept to the bare minimum needed so the circle
 * markers (r=3.5) don't visually clip at the edges — NOT used as a
 * cosmetic margin. Actual breathing room from the card edge should be
 * controlled by the parent card's own padding, not by inflating these.
 */
function DashboardMonthlyAdmissionsChart({ data, color = "#2FBF8F", suffix = "" }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);
  const height = 115;
  const padLeft = 6;
  const padRight = 6;
  const padTop = 16;
  const padBottom = 18;

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateWidth = () => {
      const nextWidth = Math.max(node.getBoundingClientRect().width || 0, 0);
      setWidth(nextWidth);
    };

    updateWidth();

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateWidth) : null;
    if (resizeObserver && node) {
      resizeObserver.observe(node);
    }

    window.addEventListener("resize", updateWidth);

    return () => {
      if (resizeObserver && node) resizeObserver.unobserve(node);
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const resolvedWidth = width || 320;
  const chartWidth = resolvedWidth - padLeft - padRight;
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
    <div ref={containerRef} style={{ width: "100%", minWidth: 0, display: "block" }}>
      <svg
        viewBox={`0 0 ${resolvedWidth} ${height}`}
        width={resolvedWidth}
        height={height}
        style={{ display: "block", width: "100%", height: 115 }}
      >
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = padTop + (chartHeight / gridLines) * i;
          const value = Math.round(max - (max / gridLines) * i);
          return (
            <g key={i}>
              <line x1={padLeft} y1={y} x2={resolvedWidth - padRight} y2={y} stroke="#EEEDF6" strokeWidth="1" strokeDasharray="4 4" />
              {/* Label sits just inside the gridline (not to the left of padLeft) so padLeft can stay tiny */}
              <text x={padLeft + 3} y={y - 3} textAnchor="start" fontSize="8" fill="var(--color-text-muted)">
                {value}{suffix}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={color} opacity="0.08" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" />
        {points.map((p, index) => {
          const isFirst = index === 0;
          const isLast = index === points.length - 1;
          // Keep month labels from clipping off the SVG edge at the very first/last point,
          // without pulling the point/line itself inward.
          const anchor = isFirst ? "start" : isLast ? "end" : "middle";
          const labelX = isFirst ? Math.max(p.x, 2) : isLast ? Math.min(p.x, resolvedWidth - 2) : p.x;
          return (
            <g key={p.label}>
              <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
              <text x={labelX} y={height - 6} textAnchor={anchor} fontSize="9" fill="var(--color-text-muted)">
                {p.label.split(" ")[0]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function HimStaffDashboard() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useViewport();
  const isCompact = isMobile || isTablet;
  const kpiCols = isMobile ? 2 : isTablet ? 4 : 7;
  const gridCols = isMobile ? 1 : isTablet ? 2 : 4;

  const [overview, setOverview] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [himStats, setHimStats] = useState(null);
  const [monthlyAdmissions, setMonthlyAdmissions] = useState([]);

  useEffect(() => {
    api.get("/analytics/overview").then(({ data }) => setOverview(data));
    api.get("/reports").then(({ data }) => setRecentReports((data.reports || []).slice(0, 5)));
    api.get("/dashboard/him-stats").then(({ data }) => setHimStats(data));
    api.get("/analytics/monthly-admissions").then(({ data }) => setMonthlyAdmissions(data.data || []));
  }, []);

  const totalPatients = overview?.patientStatus?.reduce((sum, s) => sum + s.value, 0) ?? null;
  const activePatients = overview?.patientStatus?.find((s) => s.label === "active")?.value ?? 0;
  const graduatedPatients = overview?.kpis?.completedPatients ?? null;
  const attendanceRate = overview?.kpis?.avgAttendance ?? null;

  const quickActions = [
    { key: "reports", label: "Generate Report", icon: ICONS.reports, path: "/reports" },
    { key: "analytics", label: "View Analytics", icon: ICONS.analytics, path: "/analytics" },
    { key: "patients", label: "View Patients", icon: ICONS.patients, path: "/patients" },
    { key: "attendance", label: "View Attendance", icon: ICONS.status, path: "/attendance" },
    { key: "archives", label: "View Archives", icon: HIM_KPI_ICONS.status, path: "/settings/archives" },
  ];

  return (
    <div style={himStyles.page}>
      {/* Row 1: KPI Cards */}
      <div style={{ ...himStyles.kpiRow, gridTemplateColumns: `repeat(${kpiCols}, 1fr)` }}>
        <HimKpiCard label="Total Patients" value={totalPatients ?? "—"} suffix="" icon={HIM_KPI_ICONS.patients} />
        <HimKpiCard label="Active Patients" value={overview ? activePatients : "—"} suffix="" icon={HIM_KPI_ICONS.status} />
        <HimKpiCard label="Graduated Patients" value={graduatedPatients ?? "—"} suffix="" icon={HIM_KPI_ICONS.users} />
        <HimKpiCard label="Attendance Rate" value={attendanceRate ?? "—"} suffix="%" icon={HIM_KPI_ICONS.online} />
        <HimKpiCard label="Reports Generated Today" value={himStats?.reportsToday ?? "—"} suffix="" icon={HIM_KPI_ICONS.reports} />
        <HimKpiCard label="Certificates Issued" value={himStats?.certificatesIssued ?? "—"} suffix="" icon={HIM_KPI_ICONS.permissions} />
        <HimKpiCard label="Pending Record Updates" value={himStats?.pendingUpdates ?? "—"} suffix="" icon={HIM_KPI_ICONS.auditLogs} />
      </div>

      {/* Row 2: Patient Status, Monthly Admissions */}
      <div style={{ ...himStyles.gridRow, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
       <HimCard title="Patient Status Overview" span={1} maxSpan={gridCols} center compact>
         {overview?.patientStatus?.length ? (
           <div style={himStyles.chartWrapCompact}><DonutChart data={overview.patientStatus} size={96} /></div>
         ) : (
           <div style={himStyles.emptyText}>No data yet.</div>
         )}
       </HimCard>
       <HimCard title="Monthly Admissions" span={2} maxSpan={gridCols}>
         {monthlyAdmissions.length ? (
           <div style={himStyles.monthlyChartWrap}>
             <DashboardMonthlyAdmissionsChart data={monthlyAdmissions} color="#2FBF8F" suffix="" />
           </div>
         ) : (
           <div style={himStyles.emptyText}>No data yet.</div>
         )}
       </HimCard>
       <HimCard title="Patients by Municipality" span={1} maxSpan={gridCols} compact>
         {overview?.municipalityDistribution?.length ? (
           <div style={himStyles.municipalityChartWrap}>
             <BarChart data={overview.municipalityDistribution} />
           </div>
         ) : (
           <div style={himStyles.emptyText}>No municipality data yet.</div>
         )}
       </HimCard>
      </div>

      {/* Row 3: Recent Patient Updates, Recent Certificates */}
      <div style={{ ...himStyles.gridRow, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
        <HimCard title="Recent Patient Record Updates" span={2} maxSpan={gridCols} isMobile={isCompact} scrollable>
          {!himStats?.recentPatientUpdates?.length ? (
            <div style={himStyles.emptyText}>No recent updates.</div>
          ) : (
            <div style={himStyles.scrollList}>
              {himStats.recentPatientUpdates.map((p) => (
                <div key={p.id} style={himStyles.row}>
                  <span style={himStyles.rowMain}>{p.full_name}</span>
                  <span style={himStyles.rowMid}>{p.enrollment_status}</span>
                  <span style={himStyles.rowTime}>{timeAgo(p.updated_at)}</span>
                </div>
              ))}
            </div>
          )}
        </HimCard>
        <HimCard title="Recent Certificates" span={2} maxSpan={gridCols} isMobile={isCompact} scrollable>
          {!himStats?.recentCertificates?.length ? (
            <div style={himStyles.emptyText}>No certificates issued yet.</div>
          ) : (
            <div style={himStyles.scrollList}>
              {himStats.recentCertificates.map((c) => (
                <div key={c.id} style={himStyles.row}>
                  <span style={himStyles.rowMain}>{c.patient_name}</span>
                  <span style={himStyles.rowMid}>{c.certificate_type}</span>
                  <span style={himStyles.rowTime}>{timeAgo(c.issued_at)}</span>
                </div>
              ))}
            </div>
          )}
        </HimCard>
      </div>

      {/* Row 4: Activity Timeline, Recent Reports */}
      <div style={{ ...himStyles.gridRow, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
        <HimCard title="Record Activity Timeline" span={2} maxSpan={gridCols} isMobile={isCompact} scrollable>
          {!himStats?.recentActivity?.length ? (
            <div style={himStyles.emptyText}>No recent activity.</div>
          ) : (
            <div style={himStyles.scrollList}>
              {himStats.recentActivity.map((a, i) => (
                <div key={i} style={himStyles.row}>
                  <span style={himStyles.rowMain}>{a.actor_username}</span>
                  <span style={himStyles.rowMid}>{a.action}</span>
                  <span style={himStyles.rowTime}>{timeAgo(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </HimCard>
        <HimCard title="Recent Reports" span={2} maxSpan={gridCols} isMobile={isCompact} scrollable>
          {recentReports.length === 0 ? (
            <div style={himStyles.emptyText}>No reports generated yet.</div>
          ) : (
            <div style={himStyles.scrollList}>
              {recentReports.map((r) => (
                <div key={r.id} style={himStyles.row}>
                  <span style={himStyles.rowMain}>{r.title}</span>
                  <span style={himStyles.rowMid}>{r.date_range_label || ""}</span>
                  <span style={himStyles.rowTime}>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </HimCard>
      </div>

      {/* Quick Actions — floating */}
      <div style={himStyles.floatingActionsWrap}>
        <div style={himStyles.cardTitle}>Quick Actions</div>
        <div style={himStyles.compactActionsGrid}>
          {quickActions.map((action) => (
            <button key={action.key} type="button" style={himStyles.compactActionBtn} onClick={() => navigate(action.path)}>
              <span style={himStyles.compactActionIcon}>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HimCard({ title, span, maxSpan, center, isMobile, scrollable, compact, children }) {
  const effectiveSpan = maxSpan ? Math.min(span, maxSpan) : span;
  return (
    <div
      style={{
        ...himStyles.card,
        ...(compact ? himStyles.cardCompact : {}),
        gridColumn: `span ${effectiveSpan}`,
        overflow: isMobile ? "visible" : "hidden",
      }}
    >
      <div style={himStyles.cardTitle}>{title}</div>
      <div
        style={{
          display: "flex",
          justifyContent: center ? "center" : "flex-start",
          alignItems: "stretch",
          flex: 1,
          minHeight: 0,
          overflow: scrollable ? "hidden" : "visible",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function HimKpiCard({ label, value, suffix, icon }) {
  return (
    <div style={himStyles.kpiCard}>
      <div style={himStyles.kpiIcon}>{icon}</div>
      <div>
        <div style={himStyles.kpiValue}>{value}{value !== "—" ? suffix : ""}</div>
        <div style={himStyles.kpiLabel}>{label}</div>
      </div>
    </div>
  );
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display}:${m} ${ampm}`;
}

function CaseManagerDashboard() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useViewport();
  const isCompact = isMobile || isTablet;
  const kpiCols = isMobile ? 2 : 4;

  const [stats, setStats] = useState(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);

  useEffect(() => {
    api.get("/dashboard/case-manager-stats").then(({ data }) => setStats(data));
  }, []);

  const quickActions = [
    {
      key: "attendance",
      label: "Record Attendance",
      icon: ICONS.status,
      onClick: () => navigate("/attendance"),
    },
    {
      key: "addNote",
      label: "Add Progress Note",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      ),
      onClick: () => setNoteModalOpen(true),
    },
    {
      key: "patients",
      label: "View Patients",
      icon: ICONS.patients,
      onClick: () => navigate("/patients"),
    },
    {
      key: "followUp",
      label: "Follow-up Case",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="M12 14v4M10 16h4" />
        </svg>
      ),
      onClick: () => setFollowUpModalOpen(true),
    },
  ];

  return (
    <div style={cmStyles.page}>
      {/* Top 4 KPI Stat Cards */}
      <div style={{ ...cmStyles.kpiRow, gridTemplateColumns: `repeat(${kpiCols}, 1fr)` }}>
        <CmKpiCard label="Assigned Patients" value={stats?.assignedPatients ?? "—"} icon={HIM_KPI_ICONS.patients} />
        <CmKpiCard label="Today's Sessions" value={stats?.todaysSessions ?? "—"} icon={HIM_KPI_ICONS.online} />
        <CmKpiCard label="Missed Sessions" value={stats?.missedSessions ?? "—"} icon={HIM_KPI_ICONS.auditLogs} />
        <CmKpiCard label="Follow-ups Needed" value={stats?.followUpsNeeded ?? "—"} icon={HIM_KPI_ICONS.reports} />
      </div>

      {/* Proportional Two-Column Section: Left (1.2fr / 60%), Right (1fr / 40%) */}
      <div style={{
        ...cmStyles.gridRow,
        gridTemplateColumns: isCompact ? "1fr" : "1.2fr 1fr",
      }}>
        <CmCard title="Patients Needing Attention" isMobile={isCompact} highlight>
          {!stats?.patientsNeedingAttention?.length ? (
            <div style={cmStyles.emptyText}>No patients need attention right now.</div>
          ) : (
            <div style={cmStyles.list}>
              {stats.patientsNeedingAttention.map((p, i) => (
                <button
                  key={`${p.patient_id}-${p.issue}-${i}`}
                  type="button"
                  style={cmStyles.attentionRow}
                  onClick={() => navigate(`/patients/${p.patient_id}`)}
                >
                  <span style={cmStyles.rowMain}>{p.full_name}</span>
                  <span style={cmStyles.issueBadge}>{p.issue}</span>
                </button>
              ))}
            </div>
          )}
        </CmCard>

        <CmCard title="Today's Schedule" isMobile={isCompact}>
          {!stats?.todaysSchedule?.length ? (
            <div style={cmStyles.emptyText}>No sessions scheduled for today.</div>
          ) : (
            <div style={cmStyles.list}>
              {stats.todaysSchedule.map((s) => (
                <div key={s.id} style={cmStyles.scheduleRow}>
                  <span style={cmStyles.scheduleTime}>{formatTime(s.session_time) || "—"}</span>
                  <div>
                    <div style={cmStyles.rowMain}>{s.session_name}</div>
                    {s.program_name && <div style={cmStyles.scheduleMeta}>{s.program_name}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CmCard>
      </div>

      {/* Recent Progress Notes - Full Width */}
      <div style={cmStyles.fullWidthRow}>
        <CmCard title="Recent Progress Notes" isMobile={isCompact}>
          {!stats?.recentProgressNotes?.length ? (
            <div style={cmStyles.emptyText}>No progress notes yet.</div>
          ) : (
            <div style={cmStyles.list}>
              {stats.recentProgressNotes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  style={cmStyles.noteRow}
                  onClick={() => navigate(`/patients/${n.patient_id}`)}
                >
                  <span style={cmStyles.rowMain}>{n.patient_name}</span>
                  <span style={cmStyles.rowMid}>{n.session_type || n.note_type || "Progress note"}</span>
                  <span style={cmStyles.rowTime}>{timeAgo(n.created_at)}</span>
                </button>
              ))}
            </div>
          )}
        </CmCard>
      </div>

      {/* Quick Actions Row - Exactly 4 Buttons Evenly Spaced */}
      <div style={cmStyles.card}>
        <div style={cmStyles.cardTitle}>Quick Actions</div>
        <div style={{
          ...cmStyles.compactActionsGrid,
          gridTemplateColumns: isCompact ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        }}>
          {quickActions.map((action) => (
            <button key={action.key} type="button" style={cmStyles.compactActionBtn} onClick={action.onClick}>
              <span style={cmStyles.compactActionIcon}>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Modal dialogs */}
      {noteModalOpen && (
        <ProgressNoteModal
          onClose={() => setNoteModalOpen(false)}
          onSaved={() => {
            setNoteModalOpen(false);
            api.get("/dashboard/case-manager-stats").then(({ data }) => setStats(data));
          }}
        />
      )}
      {followUpModalOpen && (
        <FollowUpModal
          onClose={() => setFollowUpModalOpen(false)}
          onSaved={() => {
            setFollowUpModalOpen(false);
            api.get("/dashboard/case-manager-stats").then(({ data }) => setStats(data));
          }}
        />
      )}
    </div>
  );
}

function CmCard({ title, span, maxSpan, center, isMobile, highlight, children }) {
  const effectiveSpan = maxSpan ? Math.min(span, maxSpan) : span;
  return (
    <div style={{
      ...cmStyles.card,
      gridColumn: `span ${effectiveSpan}`,
      overflow: isMobile ? "visible" : "auto",
      borderColor: highlight ? "var(--color-primary)" : "var(--color-border)",
    }}>
      <div style={cmStyles.cardTitle}>{title}</div>
      <div style={{ display: "flex", justifyContent: center ? "center" : "flex-start", alignItems: "center", flex: 1 }}>
        {children}
      </div>
    </div>
  );
}

function CmKpiCard({ label, value, icon }) {
  return (
    <div style={cmStyles.kpiCard}>
      <div style={cmStyles.kpiIcon}>{icon}</div>
      <div>
        <div style={cmStyles.kpiValue}>{value}</div>
        <div style={cmStyles.kpiLabel}>{label}</div>
      </div>
    </div>
  );
}

const STATUS_BADGE_COLORS = {
  pending:     { bg: "#FFF3D6", color: "#9A6B00" },
  active:      { bg: "#D8F5E9", color: "#1A7F4B" },
  completed:   { bg: "#E1F0FF", color: "#0B5FA5" },
  dropped:     { bg: "#FDE2E2", color: "#B3261E" },
  transferred: { bg: "#EDEAFB", color: "#5B3EC9" },
};

function AdmittingDashboard() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useViewport();
  const isCompact = isMobile || isTablet;
  const kpiCols = isMobile ? 2 : 4;

  const [stats, setStats] = useState(null);

  function loadStats() {
    api.get("/dashboard/admitting-stats").then(({ data }) => setStats(data));
  }

  useEffect(() => {
    loadStats();
  }, []);

  const kpiCards = [
    {
      key: "todayAdmissions",
      label: "Today's New Admissions",
      value: stats?.todayAdmissions ?? "—",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      ),
    },
    {
      key: "totalPatients",
      label: "Total Registered Patients",
      value: stats?.totalPatients ?? "—",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 20c0-3.5 2.9-6 5.5-6s5.5 2.5 5.5 6" />
          <circle cx="17" cy="8" r="2.6" />
          <path d="M15.5 14.2c2.4.3 4.5 2.6 4.5 5.8" />
        </svg>
      ),
    },
    {
      key: "pendingRegistrations",
      label: "Pending Registrations",
      value: stats?.pendingRegistrations ?? "—",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      ),
    },
    {
      key: "certsToday",
      label: "Certificates Generated Today",
      value: stats?.certsToday ?? "—",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
          <circle cx="12" cy="8" r="5" />
          <path d="M8.5 12.5L7 21l5-3 5 3-1.5-8.5" />
        </svg>
      ),
    },
  ];

  const quickActions = [
    {
      key: "register",
      label: "Register New Patient",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      ),
      onClick: () => navigate("/patients/register"),
    },
    {
      key: "patients",
      label: "Search Patients",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      ),
      onClick: () => navigate("/patients"),
    },
  ];

  function fmtDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div style={apStyles.page}>
      {/* KPI row */}
      <div style={{ ...apStyles.kpiRow, gridTemplateColumns: `repeat(${kpiCols}, 1fr)` }}>
        {kpiCards.map((card) => (
          <div key={card.key} style={apStyles.kpiCard}>
            <div style={apStyles.kpiIcon}>{card.icon}</div>
            <div>
              <div style={apStyles.kpiValue}>{card.value}</div>
              <div style={apStyles.kpiLabel}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main two-column grid */}
      <div style={{ ...apStyles.gridRow, gridTemplateColumns: isCompact ? "1fr" : "1.4fr 1fr" }}>
        {/* Recent Admissions */}
        <div style={apStyles.card}>
          <div style={apStyles.cardHeader}>
            <span style={apStyles.cardTitle}>Recent Admissions</span>
            <button
              type="button"
              style={apStyles.linkBtn}
              onClick={() => navigate("/patients")}
            >
              View all
            </button>
          </div>

          {!stats?.recentAdmissions?.length ? (
            <div style={apStyles.emptyText}>No patients registered yet.</div>
          ) : (
            <div style={apStyles.tableWrap}>
              <table style={apStyles.table}>
                <thead>
                  <tr>
                    <th style={apStyles.th}>Name</th>
                    <th style={apStyles.th}>ID</th>
                    <th style={apStyles.th}>Admission Date</th>
                    <th style={apStyles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentAdmissions.map((p) => {
                    const sc = STATUS_BADGE_COLORS[p.enrollment_status] || STATUS_BADGE_COLORS.pending;
                    return (
                      <tr
                        key={p.id}
                        style={apStyles.tr}
                        onClick={() => navigate(`/patients/${p.id}`)}
                      >
                        <td style={apStyles.td}>{p.full_name}</td>
                        <td style={{ ...apStyles.td, color: "var(--color-text-muted)", fontSize: 12 }}>{p.patient_code}</td>
                        <td style={apStyles.td}>{fmtDate(p.admission_date || p.created_at)}</td>
                        <td style={apStyles.td}>
                          <span style={{ ...apStyles.statusBadge, background: sc.bg, color: sc.color }}>
                            {p.enrollment_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column: Pending / Incomplete Records */}
        <div style={apStyles.card}>
          <div style={apStyles.cardHeader}>
            <span style={apStyles.cardTitle}>Incomplete Records</span>
            {!!stats?.incompleteRecords?.length && (
              <span style={apStyles.warnBadge}>{stats.incompleteRecords.length} pending</span>
            )}
          </div>

          {!stats?.incompleteRecords?.length ? (
            <div style={apStyles.emptyText}>All registered patients have complete records.</div>
          ) : (
            <div style={apStyles.list}>
              {stats.incompleteRecords.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  style={apStyles.incompleteRow}
                  onClick={() => navigate(`/patients/${p.id}`)}
                >
                  <div>
                    <div style={apStyles.incompleteRowName}>{p.full_name}</div>
                    <div style={apStyles.incompleteRowCode}>{p.patient_code}</div>
                  </div>
                  <span style={apStyles.missingTag}>{p.missing_info}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: quick actions + notifications */}
      <div style={{ ...apStyles.gridRow, gridTemplateColumns: isCompact ? "1fr" : "1fr 1.4fr" }}>
        {/* Quick Actions */}
        <div style={apStyles.card}>
          <div style={apStyles.cardTitle}>Quick Actions</div>
          <div style={apStyles.actionsGrid}>
            {quickActions.map((action) => (
              <button
                key={action.key}
                type="button"
                style={apStyles.actionBtn}
                onClick={action.onClick}
              >
                <span style={apStyles.actionIcon}>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Admission Notifications */}
        <div style={apStyles.card}>
          <div style={apStyles.cardTitle}>Recent Activity</div>
          {!stats?.recentNotifications?.length ? (
            <div style={apStyles.emptyText}>No recent admission-related activity.</div>
          ) : (
            <div style={apStyles.list}>
              {stats.recentNotifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    ...apStyles.notifRow,
                    opacity: n.is_read ? 0.65 : 1,
                  }}
                >
                  <div style={apStyles.notifDot(n.is_read)} />
                  <div style={{ flex: 1 }}>
                    <div style={apStyles.notifMsg}>{n.message}</div>
                    <div style={apStyles.notifTime}>{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <AppShell title="Dashboard" description="Overview of enrollment, attendance, and program activity.">
      {user.role === "ict_admin" ? (
        <IctAdminDashboard />
      ) : user.role === "him_staff" ? (
        <HimStaffDashboard />
      ) : user.role === "case_manager" ? (
        <CaseManagerDashboard />
      ) : user.role === "admitting" ? (
        <AdmittingDashboard />
      ) : null}
    </AppShell>
  );
}

const styles = {
  heading: { fontSize: 18, marginBottom: 10 },
  text: { color: "var(--color-text-muted)", fontSize: 14, lineHeight: 1.6 },

  grid: { display: "flex", flexDirection: "column", gap: 20, height: "100%" },

  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
  },
  statCard: {
  display: "flex",
  alignItems: "center",
  gap: 14,
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: 20,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: "var(--radius-sm)",
    background: "var(--color-primary-tint)",
    color: "var(--color-primary-dark)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statValue: { fontSize: 22, fontWeight: 800, color: "var(--color-text)" },
  statLabel: { fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 },

  twoColRow: {
    display: "flex",
    gap: 16,
    flex: 1,
    minHeight: 0,
  },
  card: {
    flex: 1,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: 20,
    overflow: "auto",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--color-text)",
    marginBottom: 14,
  },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  activityRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    fontSize: 13,
    color: "var(--color-text-muted)",
    paddingBottom: 10,
    borderBottom: "1px solid var(--color-border)",
  },
  activityUser: { fontWeight: 700, color: "var(--color-text)" },
  activityAction: { flex: 1, marginLeft: 8 },
  activityTime: { color: "var(--color-text-muted)", whiteSpace: "nowrap" },
  notificationRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    color: "var(--color-text-muted)",
    paddingBottom: 10,
    borderBottom: "1px solid var(--color-border)",
  },

  healthGrid: { display: "flex", flexDirection: "column", gap: 10 },
  healthItem: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    paddingBottom: 10,
    borderBottom: "1px solid var(--color-border)",
  },
  healthLabel: { color: "var(--color-text-muted)" },
  healthValue: { fontWeight: 700, color: "var(--color-text)" },

  actionsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  actionBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--color-text)",
    background: "var(--color-primary-tint)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    textAlign: "left",
  },
  actionIcon: {
    width: 16,
    height: 16,
    flexShrink: 0,
    color: "var(--color-primary-dark)",
  },
  mutedText: { fontSize: 13, color: "var(--color-text-muted)" },
  compactActionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
  },
  compactActionBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    padding: "10px 8px",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--color-text)",
    background: "var(--color-primary-tint)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    textAlign: "center",
  },
};

const himStyles = {
  page: { display: "flex", flexDirection: "column", gap: 10 },
  kpiRow: { display: "grid", gap: 10 },
  gridRow: { display: "grid", gap: 10, alignItems: "stretch" },
  card: {
    background: "#fff", borderRadius: 16, padding: 12, boxShadow: "0 2px 10px rgba(20,20,40,0.05)",
    display: "flex", flexDirection: "column", gap: 8, minHeight: 90,
  },
  cardCompact: {
    padding: 10,
    gap: 6,
    minHeight: 72,
  },
  cardTitle: { fontSize: 12.5, fontWeight: 700, color: "var(--color-text)" },
  emptyText: { color: "var(--color-text-muted)", fontSize: 12.5, textAlign: "center", padding: "16px 0" },
  chartWrapCompact: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 102,
    marginTop: -4,
  },
  monthlyChartWrap: {
    width: "100%",
    boxSizing: "border-box",
    padding: "0 8%",
    minWidth: 0,
  },
  municipalityChartWrap: {
    width: "100%",
    minWidth: 0,
    marginRight: -8,
    display: "flex",
    justifyContent: "center",
  },
  list: { display: "flex", flexDirection: "column", gap: 8, width: "100%" },
  scrollList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: "100%",
    maxHeight: 180,
    overflowY: "auto",
    paddingRight: 6,
  },
  row: {
    display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5,
    color: "var(--color-text-muted)", paddingBottom: 8, borderBottom: "1px solid var(--color-border)",
  },
  rowMain: { fontWeight: 700, color: "var(--color-text)", minWidth: 0 },
  rowMid: { flex: 1, marginLeft: 6, textTransform: "capitalize", minWidth: 0 },
  rowTime: { color: "var(--color-text-muted)", whiteSpace: "nowrap", flexShrink: 0 },
  floatingActionsWrap: {
    position: "sticky",
    bottom: 12,
    zIndex: 20,
    alignSelf: "center",
    width: "min(100%, 720px)",
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(6px)",
    border: "1px solid var(--color-border)",
    borderRadius: 16,
    boxShadow: "0 8px 24px rgba(20,20,40,0.08)",
    padding: "10px 12px 12px",
    marginTop: 4,
  },
  compactActionsGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 },
  compactActionBtn: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "9px 6px",
    fontSize: 10.5, fontWeight: 600, color: "var(--color-text)", background: "#F6F5F1",
    border: "none", borderRadius: 12, cursor: "pointer", textAlign: "center",
  },
  compactActionIcon: { width: 16, height: 16, color: "var(--color-primary-dark)" },
  kpiCard: { display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 18, padding: 14, boxShadow: "0 2px 10px rgba(20,20,40,0.05)" },
  kpiIcon: { width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  kpiValue: { fontSize: 20, fontWeight: 800, color: "var(--color-text)" },
  kpiLabel: { fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 },
};

const cmStyles = {
  page: { display: "flex", flexDirection: "column", gap: 16, width: "100%", boxSizing: "border-box" },
  kpiRow: { display: "grid", gap: 16, width: "100%" },
  gridRow: { display: "grid", gap: 16, alignItems: "stretch", width: "100%" },
  fullWidthRow: { width: "100%" },
  card: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 90,
    width: "100%",
    boxSizing: "border-box",
  },
  cardTitle: { fontSize: 14, fontWeight: 700, color: "var(--color-text)" },
  emptyText: { color: "var(--color-text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0", width: "100%" },
  list: { display: "flex", flexDirection: "column", gap: 10, width: "100%" },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    fontSize: 13,
    color: "var(--color-text-muted)",
    paddingBottom: 10,
    borderBottom: "1px solid var(--color-border)",
  },
  rowMain: { fontWeight: 700, color: "var(--color-text)" },
  rowMid: { flex: 1, marginLeft: 8, textTransform: "capitalize" },
  rowTime: { color: "var(--color-text-muted)", whiteSpace: "nowrap" },
  attentionRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    padding: "10px 0",
    background: "none",
    border: "none",
    borderBottom: "1px solid var(--color-border)",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  },
  issueBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: 999,
    background: "#FFF3D6",
    color: "#9A6B00",
    whiteSpace: "nowrap",
  },
  scheduleRow: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    paddingBottom: 10,
    borderBottom: "1px solid var(--color-border)",
  },
  scheduleTime: {
    fontWeight: 700,
    fontSize: 13,
    color: "var(--color-primary-dark)",
    minWidth: 72,
  },
  scheduleMeta: { fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 },
  noteRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    fontSize: 13,
    paddingBottom: 10,
    background: "none",
    border: "none",
    borderBottom: "1px solid var(--color-border)",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    color: "inherit",
  },
  compactActionsGrid: { display: "grid", gap: 16, width: "100%" },
  compactActionBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "16px 12px",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--color-text)",
    background: "var(--color-primary-tint)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    textAlign: "center",
    width: "100%",
    boxSizing: "border-box",
  },
  compactActionIcon: { width: 20, height: 20, color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center" },
  kpiCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "16px 18px",
    width: "100%",
    boxSizing: "border-box",
  },
  kpiIcon: {
    width: 38,
    height: 38,
    borderRadius: "var(--radius-sm)",
    background: "var(--color-primary-tint)",
    color: "var(--color-primary-dark)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  kpiValue: { fontSize: 22, fontWeight: 800, color: "var(--color-text)" },
  kpiLabel: { fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 },
};

const apStyles = {
  page: { display: "flex", flexDirection: "column", gap: 16, width: "100%", boxSizing: "border-box" },
  kpiRow: { display: "grid", gap: 16, width: "100%" },
  gridRow: { display: "grid", gap: 16, alignItems: "stretch", width: "100%" },
  card: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 100,
    width: "100%",
    boxSizing: "border-box",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: { fontSize: 14, fontWeight: 700, color: "var(--color-text)" },
  emptyText: { color: "var(--color-text-muted)", fontSize: 13, textAlign: "center", padding: "24px 0" },
  list: { display: "flex", flexDirection: "column", gap: 0, width: "100%" },
  kpiCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "16px 18px",
    width: "100%",
    boxSizing: "border-box",
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: "var(--radius-sm)",
    background: "var(--color-primary-tint)",
    color: "var(--color-primary-dark)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  kpiValue: { fontSize: 22, fontWeight: 800, color: "var(--color-text)" },
  kpiLabel: { fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 },

  tableWrap: { overflowX: "auto", width: "100%" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left",
    padding: "6px 10px",
    fontWeight: 600,
    fontSize: 11,
    color: "var(--color-text-muted)",
    borderBottom: "1px solid var(--color-border)",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "10px 10px",
    fontSize: 13,
    color: "var(--color-text)",
    borderBottom: "1px solid var(--color-border)",
    verticalAlign: "middle",
  },
  tr: { cursor: "pointer" },
  statusBadge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 9px",
    borderRadius: 999,
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
  warnBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 9px",
    borderRadius: 999,
    background: "#FFF3D6",
    color: "#9A6B00",
    whiteSpace: "nowrap",
  },
  incompleteRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "10px 0",
    background: "none",
    border: "none",
    borderBottom: "1px solid var(--color-border)",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  },
  incompleteRowName: { fontSize: 13, fontWeight: 600, color: "var(--color-text)" },
  incompleteRowCode: { fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 },
  missingTag: {
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: 999,
    background: "#FDE2E2",
    color: "#B3261E",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  actionsGrid: { display: "flex", flexDirection: "column", gap: 10 },
  actionBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--color-text)",
    background: "var(--color-primary-tint)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    textAlign: "left",
  },
  actionIcon: {
    width: 18,
    height: 18,
    flexShrink: 0,
    color: "var(--color-primary-dark)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  linkBtn: {
    background: "none",
    border: "none",
    padding: 0,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
  },
  notifRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "10px 0",
    borderBottom: "1px solid var(--color-border)",
  },
  notifDot: (read) => ({
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: read ? "var(--color-border)" : "var(--color-primary)",
    marginTop: 5,
    flexShrink: 0,
  }),
  notifMsg: { fontSize: 13, color: "var(--color-text)", lineHeight: 1.45 },
  notifTime: { fontSize: 11, color: "var(--color-text-muted)", marginTop: 3 },
};