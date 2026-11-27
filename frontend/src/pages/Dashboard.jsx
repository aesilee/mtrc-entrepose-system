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

function RowAvatar({ name, photoUrl }) {
  return <PatientAvatar name={name} photoUrl={photoUrl} style={himStyles.rowAvatar} />;
}

const HIM_STATUS_COLORS = {
  pending: { bg: "#F1F7E6", color: "#476A30" },
  active: { bg: "#E8F5EC", color: "#357648" },
  completed: { bg: "#ECF4EF", color: "#243B12" },
  dropped: { bg: "#EFF3EC", color: "#5C6B57" },
  transferred: { bg: "#EAF4E4", color: "#5C8D47" },
};

function StatusPill({ status }) {
  const s = HIM_STATUS_COLORS[status] || { bg: "var(--color-border)", color: "var(--color-text-muted)" };
  return (
    <span style={{ ...himStyles.pill, background: s.bg, color: s.color }}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "—"}
    </span>
  );
}

const REPORT_TYPE_STYLES = {
  Attendance: { bg: "#E8F5EC", color: "#357648" },
  Monthly: { bg: "#F1F7E6", color: "#5C8D47" },
  Program: { bg: "#ECF4EF", color: "#243B12" },
};

function getReportType(title) {
  return Object.keys(REPORT_TYPE_STYLES).find((key) => title?.startsWith(key)) || "Report";
}

function ReportPill({ title }) {
  const type = getReportType(title);
  const s = REPORT_TYPE_STYLES[type] || { bg: "var(--color-border)", color: "var(--color-text-muted)" };
  return <span style={{ ...himStyles.pill, background: s.bg, color: s.color }}>{type}</span>;
}

const ACTIVITY_ICONS = {
  login: <svg {...iconProps} width="16" height="16"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></svg>,
  update: <svg {...iconProps} width="16" height="16"><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" /></svg>,
  create: <svg {...iconProps} width="16" height="16"><path d="M12 5v14M5 12h14" /></svg>,
  note: <svg {...iconProps} width="16" height="16"><path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M9 12h6M9 16h6" /></svg>,
  default: <svg {...iconProps} width="16" height="16"><circle cx="12" cy="12" r="9" /></svg>,
};

function getActivityIcon(action) {
  const a = (action || "").toLowerCase();
  if (a.includes("logged in")) return ACTIVITY_ICONS.login;
  if (a.includes("registered")) return ACTIVITY_ICONS.create;
  if (a.includes("progress note")) return ACTIVITY_ICONS.note;
  if (a.includes("updated") || a.includes("changed")) return ACTIVITY_ICONS.update;
  return ACTIVITY_ICONS.default;
}

// recentActivity and systemNotifications are loaded at runtime from the dashboard APIs

const SYSTEM_HEALTH = [
  { label: "Database", value: "—" },
  { label: "API", value: "—" },
  { label: "Last Backup", value: "—" },
  { label: "Storage Used", value: "—" },
  { label: "Server Response", value: "—" },
];

const QUICK_ACTIONS = [
  { key: "createUser", label: "Create User", description: "Add a new staff account to the system.", icon: ICONS.createUser, path: "/settings/users" },
  { key: "backup", label: "Backup Database", description: "Save a snapshot of the current database.", icon: ICONS.backup, path: null },
  { key: "restore", label: "Restore Backup", description: "Roll the database back to a saved backup.", icon: ICONS.restore, path: null },
  { key: "auditLogs", label: "View Audit Logs", description: "Review recent actions across the system.", icon: ICONS.auditLogs, path: "/settings/audit-logs" },
  { key: "permissions", label: "Manage Permissions", description: "Configure roles and access levels.", icon: ICONS.permissions, path: "/settings" },
];

const QUICK_ACTION_COLORS = ["#357648", "#8FB361", "#5C8D47", "#739E82", "#476A30", "#243B12"];
const QUICK_ACTION_TINTS = ["#E8F5EC", "#F1F7E6", "#EEF6E9", "#ECF4EF", "#EAF2E5", "#EDF2EA"];

const titleAccentBarStyle = {
  width: 3.5,
  height: 16,
  borderRadius: 999,
  background: "#26653B",
  flexShrink: 0,
};

function DashboardOverviewBanner({
  badge,
  secondaryBadge = "43-Session Outpatient Program",
  title,
  subtitle,
  metrics = [],
  onRefresh,
  refreshing = false,
  isCompact = false,
}) {
  return (
    <div
      style={{
        ...overviewBannerStyles.bar,
        flexDirection: isCompact ? "column" : "row",
        alignItems: isCompact ? "flex-start" : "center",
        padding: isCompact ? "18px 20px" : "22px 28px",
        minHeight: isCompact ? "auto" : 112,
      }}
    >
      {/* Subtle Botanical Two-Leaf SVG Watermark */}
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
          fill="rgba(143, 179, 97, 0.18)"
        />
        <path
          d="M72 115 C 94 78, 118 44, 148 10"
          fill="none"
          stroke="rgba(53, 118, 72, 0.18)"
          strokeWidth="1.5"
        />
        <path
          d="M65 118 C 36 86, 22 50, 32 16 C 68 38, 78 78, 65 118 Z"
          fill="rgba(53, 118, 72, 0.13)"
        />
        <path
          d="M65 118 C 52 84, 42 52, 32 16"
          fill="none"
          stroke="rgba(53, 118, 72, 0.16)"
          strokeWidth="1.3"
        />
      </svg>

      <div style={overviewBannerStyles.left}>
        <div style={overviewBannerStyles.badgeRow}>
          <span style={overviewBannerStyles.scopePill}>
            <span style={overviewBannerStyles.liveDot} />
            {badge}
          </span>
          {secondaryBadge && (
            <span style={overviewBannerStyles.standardBadge}>{secondaryBadge}</span>
          )}
        </div>
        <div style={overviewBannerStyles.title}>{title}</div>
        <div style={overviewBannerStyles.subtitle}>{subtitle}</div>
      </div>

      <div
        style={{
          ...overviewBannerStyles.right,
          width: isCompact ? "100%" : "auto",
          justifyContent: isCompact ? "space-between" : "flex-end",
        }}
      >
        {metrics.length > 0 && (
          <div style={overviewBannerStyles.metricsGroup}>
            {metrics.map((m, idx) => (
              <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {idx > 0 && <div style={overviewBannerStyles.metricDivider} />}
                <div style={overviewBannerStyles.metricChip}>
                  <span style={{ ...overviewBannerStyles.metricNum, color: m.color || "#1E5A34" }}>
                    {m.value}
                  </span>
                  <span style={overviewBannerStyles.metricText}>{m.label}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            style={{
              ...overviewBannerStyles.refreshBtn,
              opacity: refreshing ? 0.75 : 1,
            }}
            title="Refresh dashboard data"
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
        )}
      </div>
    </div>
  );
}

const overviewBannerStyles = {
  bar: {
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
    boxSizing: "border-box",
    width: "100%",
  },
  left: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    minWidth: 0,
    position: "relative",
    zIndex: 1,
  },
  badgeRow: {
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
  title: {
    fontSize: 17,
    fontWeight: 800,
    color: "var(--color-text, #1F2421)",
    letterSpacing: "-0.015em",
    lineHeight: 1.25,
  },
  subtitle: {
    fontSize: 12.5,
    color: "#5E6E62",
    lineHeight: 1.5,
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    flexShrink: 0,
    position: "relative",
    zIndex: 1,
  },
  metricsGroup: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "#FFFFFF",
    border: "1px solid #DCE7DC",
    borderRadius: 14,
    padding: "8px 18px",
    boxShadow: "0 1px 4px rgba(30, 90, 52, 0.04)",
  },
  metricChip: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  metricNum: {
    fontSize: 17,
    fontWeight: 800,
    color: "#1E5A34",
    lineHeight: 1.15,
  },
  metricText: {
    fontSize: 10.5,
    fontWeight: 600,
    color: "#5E6E62",
    whiteSpace: "nowrap",
  },
  metricDivider: {
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
};

function QuickActionsCard({ title = "Quick Actions", actions, seeAllPath, navigate, cols }) {
  return (
    <div className="mtrc-dash-card" style={quickActionStyles.card}>
      <div style={quickActionStyles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={titleAccentBarStyle} />
          <span style={quickActionStyles.title}>{title}</span>
        </div>
        {seeAllPath && (
          <button type="button" style={quickActionStyles.seeAll} onClick={() => navigate(seeAllPath)}>See all</button>
        )}
      </div>
      <div style={{ ...quickActionStyles.grid, gridTemplateColumns: cols ? `repeat(${cols}, 1fr)` : quickActionStyles.grid.gridTemplateColumns }}>
        {actions.map((action, i) => (
          <button key={action.key} type="button" className="mtrc-quick-action" style={quickActionStyles.item} onClick={action.onClick} disabled={action.disabled}>
            <span style={{ ...quickActionStyles.icon, color: QUICK_ACTION_COLORS[i % QUICK_ACTION_COLORS.length], background: QUICK_ACTION_TINTS[i % QUICK_ACTION_TINTS.length], width: 32, height: 32, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              {action.icon}
            </span>
            <span style={quickActionStyles.itemTitle}>{action.label}</span>
            {action.description && <span style={quickActionStyles.itemDesc}>{action.description}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

const quickActionStyles = {
  card: { background: "#FFFFFF", border: "1px solid #DCE7DC", borderRadius: 18, padding: 16, boxShadow: "0 2px 10px rgba(20,20,40,0.04)", boxSizing: "border-box", width: "100%" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  title: { fontSize: 14, fontWeight: 800, color: "var(--color-text)" },
  seeAll: { fontSize: 12.5, fontWeight: 700, color: "#26653B", background: "none", border: "none", cursor: "pointer", padding: 0 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 },
  item: {
    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5, padding: "11px 13px",
    background: "#FFFFFF", border: "1px solid #E1ECE2", borderRadius: 13,
    cursor: "pointer", textAlign: "left", minWidth: 0,
  },
  icon: { width: 18, height: 18, flexShrink: 0 },
  itemTitle: { fontSize: 13, fontWeight: 700, color: "var(--color-text)" },
  itemDesc: { fontSize: 11.5, color: "var(--color-text-muted)", lineHeight: 1.35 },
};

function IctAdminDashboard() {
  const navigate = useNavigate();
  const { width, isMobile, isTablet } = useViewport();
  const isCompact = isMobile || isTablet;
  const statCols = isMobile ? 2 : isTablet ? 3 : width < 1200 ? "repeat(auto-fit, minmax(170px, 1fr))" : 5;
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemNotifications, setSystemNotifications] = useState([]);
  const [dashboardExtrasLoading, setDashboardExtrasLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function fetchIctDashboard(isManual = false) {
    if (isManual) setRefreshing(true);
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
      setRefreshing(false);
    });
  }

  useEffect(() => {
    fetchIctDashboard(false);
  }, []);

  const statCards = [
    { key: "totalUsers", label: "Total Users", value: stats?.totalUsers ?? "—", icon: HIM_KPI_ICONS.users },
    { key: "onlineUsers", label: "Online Users", value: stats?.onlineUsers ?? "—", icon: HIM_KPI_ICONS.online },
    { key: "totalPatients", label: "Total Patients", value: stats?.totalPatients ?? "—", icon: HIM_KPI_ICONS.patients },
    { key: "archivedRecords", label: "Archived Records", value: stats?.archivedRecords ?? stats?.archivedPatients ?? "—", icon: HIM_KPI_ICONS.status },
    { key: "systemStatus", label: "System Status", value: stats?.systemStatus ?? "—", icon: HIM_KPI_ICONS.status },
  ];

  return (
    <div className="mtrc-page-enter" style={styles.grid}>
      <DashboardOverviewBanner
        badge="System Administration"
        secondaryBadge="MTRC Enterprise Core"
        title="System Operations, Security & User Activity Overview"
        subtitle="Real-time monitoring of active staff accounts, patient registry volume, and platform health."
        metrics={[
          { label: "Total Users", value: stats?.totalUsers ?? 0 },
          { label: "Online Now", value: stats?.onlineUsers ?? 0, color: "#476A30" },
          { label: "Total Patients", value: stats?.totalPatients ?? 0 },
        ]}
        onRefresh={() => fetchIctDashboard(true)}
        refreshing={refreshing}
        isCompact={isCompact}
      />

      <div style={{ ...styles.statsRow, gridTemplateColumns: typeof statCols === "string" ? statCols : `repeat(${statCols}, 1fr)` }}>
        {statCards.map((card) => (
          <div key={card.key} className="mtrc-kpi-card" style={styles.statCard}>
            <div className="mtrc-kpi-icon" style={styles.statIcon}>{card.icon}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={styles.statValue}>{card.value}</div>
              <div style={styles.statLabel} title={card.label}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Quick Actions — full width, below summary cards */}
      <QuickActionsCard
        actions={QUICK_ACTIONS.map((a) => ({ ...a, onClick: () => (a.path ? navigate(a.path) : null), disabled: !a.path }))}
        navigate={navigate}
      />

      {/* Row 3: Recent User Activity, System Health, System Notifications */}
      <div style={{ ...styles.twoColRow, flexDirection: isMobile ? "column" : "row" }}>
        <div className="mtrc-dash-card" style={styles.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={titleAccentBarStyle} />
            <div style={styles.cardTitle}>Recent User Activity</div>
          </div>
          <div style={styles.boxList}>
            {recentActivity && recentActivity.length ? (
              recentActivity.map((item, i) => (
                <div key={i} style={himStyles.iconRow}>
                  <span style={himStyles.activityIcon}>{getActivityIcon(item.action || item.activity)}</span>
                  <div style={himStyles.avatarRowBody}>
                    <span style={himStyles.rowMain}>{item.actor_username || item.user || '—'}</span>
                    <span style={himStyles.rowSub}>{item.action || item.activity || '—'}</span>
                  </div>
                  <span style={himStyles.rowTime}>{timeAgo(item.created_at || item.time || new Date())}</span>
                </div>
              ))
            ) : (
              <DashboardEmptyState loading={dashboardExtrasLoading} emptyText="No recent activity yet." />
            )}
          </div>
        </div>

        <div className="mtrc-dash-card" style={styles.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={titleAccentBarStyle} />
            <div style={styles.cardTitle}>System Health</div>
          </div>
          <div style={styles.boxList}>
            {SYSTEM_HEALTH.map((item) => (
              <div key={item.label} style={styles.healthItem}>
                <span style={styles.healthLabel}>{item.label}</span>
                <span style={styles.healthValue}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mtrc-dash-card" style={styles.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={titleAccentBarStyle} />
            <div style={styles.cardTitle}>System Notifications</div>
          </div>
          <div style={styles.boxList}>
            {systemNotifications && systemNotifications.length ? (
              systemNotifications.map((item, i) => (
                <div key={i} style={styles.notificationRow}>
                  <span>{item.message}</span>
                  <span style={styles.activityTime}>{timeAgo(item.created_at)}</span>
                </div>
              ))
            ) : (
              <DashboardEmptyState loading={dashboardExtrasLoading} emptyText="No notifications yet." />
            )}
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
function DashboardMonthlyAdmissionsChart({ data, color = "#357648", suffix = "" }) {
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
              <line x1={padLeft} y1={y} x2={resolvedWidth - padRight} y2={y} stroke="#EAE6DF" strokeWidth="1" strokeDasharray="4 4" />
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
  const { width, isMobile, isTablet } = useViewport();
  const isCompact = isMobile || isTablet;
  const kpiCols = isMobile ? 2 : isTablet ? 3 : width < 1200 ? "repeat(auto-fit, minmax(150px, 1fr))" : 7;
  const gridCols = isMobile ? 1 : isTablet ? 2 : 4;

  const [overview, setOverview] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [himStats, setHimStats] = useState(null);
  const [monthlyAdmissions, setMonthlyAdmissions] = useState([]);

  const [refreshing, setRefreshing] = useState(false);

  function loadHimDashboard(isManual = false) {
    if (isManual) setRefreshing(true);
    Promise.allSettled([
      api.get("/analytics/overview").then(({ data }) => setOverview(data)),
      api.get("/reports").then(({ data }) => setRecentReports((data.reports || []).slice(0, 5))),
      api.get("/dashboard/him-stats").then(({ data }) => setHimStats(data)),
      api.get("/analytics/monthly-admissions").then(({ data }) => setMonthlyAdmissions(data.data || [])),
    ]).finally(() => setRefreshing(false));
  }

  useEffect(() => {
    loadHimDashboard(false);
  }, []);

  const totalPatients = overview?.patientStatus?.reduce((sum, s) => sum + s.value, 0) ?? null;
  const activePatients = overview?.patientStatus?.find((s) => s.label === "active")?.value ?? 0;
  const graduatedPatients = overview?.kpis?.completedPatients ?? null;
  const attendanceRate = overview?.kpis?.avgAttendance ?? null;

  const quickActions = [
    { key: "reports", label: "Generate Report", description: "Create a new attendance or program report.", icon: ICONS.reports, path: "/reports" },
    { key: "analytics", label: "View Analytics", description: "See program trends and monitoring stats.", icon: ICONS.analytics, path: "/analytics" },
    { key: "patients", label: "View Patients", description: "Browse the full patient records list.", icon: ICONS.patients, path: "/patients" },
    { key: "attendance", label: "View Attendance", description: "Check attendance logs across programs.", icon: ICONS.status, path: "/attendance" },
    { key: "archives", label: "View Archives", description: "Look up archived patient records.", icon: HIM_KPI_ICONS.status, path: "/settings/archives" },
  ];

  return (
    <div className="mtrc-page-enter" style={himStyles.page}>
      <DashboardOverviewBanner
        badge="Institutional Surveillance"
        secondaryBadge="DOH Outpatient Registry"
        title="Facility-Wide Patient Records & Program Overview"
        subtitle="Live surveillance of outpatient census, monthly admissions, certificates, and DOH reporting."
        metrics={[
          { label: "Total Cohort", value: totalPatients ?? 0 },
          { label: "Active", value: activePatients ?? 0, color: "#476A30" },
          { label: "Graduated", value: graduatedPatients ?? 0 },
        ]}
        onRefresh={() => loadHimDashboard(true)}
        refreshing={refreshing}
        isCompact={isCompact}
      />

      {/* Row 1: KPI Cards */}
      <div style={{ ...himStyles.kpiRow, gridTemplateColumns: typeof kpiCols === "string" ? kpiCols : `repeat(${kpiCols}, 1fr)` }}>
        <HimKpiCard label="Total Patients" value={totalPatients ?? "—"} suffix="" icon={HIM_KPI_ICONS.patients} />
        <HimKpiCard label="Active Patients" value={overview ? activePatients : "—"} suffix="" icon={HIM_KPI_ICONS.status} />
        <HimKpiCard label="Graduated Patients" value={graduatedPatients ?? "—"} suffix="" icon={HIM_KPI_ICONS.users} />
        <HimKpiCard label="Attendance Rate" value={attendanceRate ?? "—"} suffix="%" icon={HIM_KPI_ICONS.online} />
        <HimKpiCard label="Reports Generated Today" value={himStats?.reportsToday ?? "—"} suffix="" icon={HIM_KPI_ICONS.reports} />
        <HimKpiCard label="Certificates Issued" value={himStats?.certificatesIssued ?? "—"} suffix="" icon={HIM_KPI_ICONS.permissions} />
        <HimKpiCard label="Pending Record Updates" value={himStats?.pendingUpdates ?? "—"} suffix="" icon={HIM_KPI_ICONS.auditLogs} />
      </div>

      {/* Row 2: Quick Actions — own full-width row */}
      <QuickActionsCard actions={quickActions.map((a) => ({ ...a, onClick: () => navigate(a.path) }))} navigate={navigate} />

      {/* Row 3: Patient Status, Monthly Admissions, Patients by Municipality */}
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
             <DashboardMonthlyAdmissionsChart data={monthlyAdmissions} color="#357648" suffix="" />
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

      {/* Row 4: Recent Patient Updates, Recent Certificates */}
      <div style={{ ...himStyles.gridRow, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
        <HimCard title="Recent patient record updates" span={2} maxSpan={gridCols} isMobile={isCompact} scrollable viewAllPath="/patients">
          {!himStats?.recentPatientUpdates?.length ? (
            <div style={himStyles.emptyText}>No recent updates.</div>
          ) : (
            <div style={himStyles.scrollList}>
              {himStats.recentPatientUpdates.map((p) => (
                <div key={p.id} style={himStyles.avatarRow} onClick={() => navigate(`/patients/${p.id}`)}>
                  <RowAvatar name={p.full_name} photoUrl={p.photo_url} />
                  <span style={{ ...himStyles.rowMain, ...himStyles.avatarRowMain }}>{p.full_name}</span>
                  <StatusPill status={p.enrollment_status} />
                  <span style={himStyles.rowTime}>{timeAgo(p.updated_at)}</span>
                </div>
              ))}
            </div>
          )}
        </HimCard>
        <HimCard title="Recent certificates" span={2} maxSpan={gridCols} isMobile={isCompact} scrollable viewAllPath="/certificates">
          {!himStats?.recentCertificates?.length ? (
            <div style={himStyles.emptyText}>No certificates issued yet.</div>
          ) : (
            <div style={himStyles.scrollList}>
              {himStats.recentCertificates.map((c) => (
                <div key={c.id} style={himStyles.avatarRow}>
                  <RowAvatar name={c.patient_name} photoUrl={c.patient_photo_url} />
                  <div style={himStyles.avatarRowBody}>
                    <span style={himStyles.rowMain}>{c.patient_name}</span>
                    <span style={himStyles.rowSub}>{c.certificate_type ? c.certificate_type.charAt(0).toUpperCase() + c.certificate_type.slice(1) : ""}</span>
                  </div>
                  <span style={himStyles.rowTime}>{timeAgo(c.issued_at)}</span>
                </div>
              ))}
            </div>
          )}
        </HimCard>
      </div>

      {/* Row 5: Activity Timeline, Recent Reports */}
      <div style={{ ...himStyles.gridRow, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
        <HimCard title="Record activity timeline" span={2} maxSpan={gridCols} isMobile={isCompact} scrollable viewAllPath="/audit-logs">
          {!himStats?.recentActivity?.length ? (
            <div style={himStyles.emptyText}>No recent activity.</div>
          ) : (
            <div style={himStyles.scrollList}>
              {himStats.recentActivity.map((a, i) => (
                <div key={i} style={himStyles.iconRow}>
                  <span style={himStyles.activityIcon}>{getActivityIcon(a.action)}</span>
                  <div style={himStyles.avatarRowBody}>
                    <span style={himStyles.rowMain}>{a.actor_username}</span>
                    <span style={himStyles.rowSub}>{a.action.charAt(0).toLowerCase() + a.action.slice(1)}</span>
                  </div>
                  <span style={himStyles.rowTime}>{timeAgo(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </HimCard>
        <HimCard title="Recent reports" span={2} maxSpan={gridCols} isMobile={isCompact} scrollable viewAllPath="/reports">
          {recentReports.length === 0 ? (
            <div style={himStyles.emptyText}>No reports generated yet.</div>
          ) : (
            <div style={himStyles.scrollList}>
              {recentReports.map((r) => (
                <div key={r.id} style={himStyles.row}>
                  <ReportPill title={r.title} />
                  <span style={himStyles.rowMid}>{r.date_range_label || ""}</span>
                  <span style={himStyles.rowTime}>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </HimCard>
      </div>

    </div>
  );
}

function HimCard({ title, span, maxSpan, center, isMobile, scrollable, compact, viewAllPath, children }) {
  const effectiveSpan = maxSpan ? Math.min(span, maxSpan) : span;
  const navigate = useNavigate();
  return (
    <div
      className="mtrc-dash-card"
      style={{
        ...himStyles.card,
        ...(compact ? himStyles.cardCompact : {}),
        gridColumn: `span ${effectiveSpan}`,
        overflow: isMobile ? "visible" : "hidden",
      }}
    >
      <div style={himStyles.cardTitleRow}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={titleAccentBarStyle} />
          <div style={himStyles.cardTitle}>{title}</div>
        </div>
        {viewAllPath && (
          <button style={himStyles.viewAllLink} onClick={() => navigate(viewAllPath)}>View all →</button>
        )}
      </div>
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
    <div className="mtrc-kpi-card" style={himStyles.kpiCard}>
      <div className="mtrc-kpi-icon" style={himStyles.kpiIcon}>{icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={himStyles.kpiValue}>{value}{value !== "—" ? suffix : ""}</div>
        <div style={himStyles.kpiLabel} title={label}>{label}</div>
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

function getInitials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "—";
}

function PatientAvatar({ name, photoUrl, style }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name} style={{ ...style, objectFit: "cover" }} />;
  }
  return <span style={style}>{getInitials(name)}</span>;
}

function CaseManagerDashboard() {
  const navigate = useNavigate();
  const { width, isMobile, isTablet } = useViewport();
  const isCompact = isMobile || isTablet;
  const kpiCols = isCompact ? 2 : width < 1200 ? "repeat(auto-fit, minmax(170px, 1fr))" : 5;
  const primaryPanelHeight = isMobile ? 280 : 300;
  const patientsPanelHeight = isMobile ? 520 : 440;
  const overviewPanelHeight = isMobile ? 310 : 300;

  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientFilter, setPatientFilter] = useState("all");

  async function loadStats() {
    setLoadError("");
    setLoading(true);
    try {
      const [statsRes, flagsRes] = await Promise.all([
        api.get("/dashboard/case-manager-stats"),
        api.get("/case-management/attention")
      ]);
      setStats({
        ...statsRes.data,
        patientsNeedingAttention: flagsRes.data.patientsNeedingAttention
      });
    } catch (err) {
      setLoadError(err.response?.data?.message || "Could not load the case manager dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  function registrationPath(patient) {
    if (!patient?.id) return "/patients";
    if (Number(patient.next_step) === 2) return `/patients/${patient.id}/referral`;
    if (Number(patient.next_step) === 3) return `/patients/${patient.id}/intake/drug-history`;
    if (Number(patient.next_step) === 4) return `/patients/${patient.id}/intake/clinical-triage`;
    if (Number(patient.next_step) === 5) return `/patients/${patient.id}/intake/finalize`;
    return `/patients/${patient.id}`;
  }

  const statusOverview = [
    { key: "active", label: "Active", value: stats?.caseStatusOverview?.active || 0, color: "#357648", tint: "#E8F5EC" },
    { key: "followUp", label: "Follow-up", value: stats?.caseStatusOverview?.followUp || 0, color: "#8FB361", tint: "#F1F7E6" },
    { key: "completed", label: "Completed", value: stats?.caseStatusOverview?.completed || 0, color: "#5C8D47", tint: "#EEF6E9" },
    { key: "dropped", label: "Dropped", value: stats?.caseStatusOverview?.dropped || 0, color: "#739E82", tint: "#ECF4EF" },
    { key: "transferred", label: "Transferred", value: stats?.caseStatusOverview?.transferred || 0, color: "#243B12", tint: "#EAEDE6" },
  ];
  const statusTotal = statusOverview.reduce((total, item) => total + Number(item.value), 0);

  const activeCohortTotal = stats?.curriculumPhases?.totalActive || 0;
  const curriculumPhasesList = [
    {
      key: "phase1",
      name: "Phase 1: Early Stabilization",
      range: "Sessions 1–14",
      count: stats?.curriculumPhases?.phase1 || 0,
      color: "#739E82",
      tint: "#ECF4EF",
    },
    {
      key: "phase2",
      name: "Phase 2: Core CBT & Psychoeducation",
      range: "Sessions 15–28",
      count: stats?.curriculumPhases?.phase2 || 0,
      color: "#8FB361",
      tint: "#F1F7E6",
    },
    {
      key: "phase3",
      name: "Phase 3: Relapse Prevention & Reintegration",
      range: "Sessions 29–42",
      count: stats?.curriculumPhases?.phase3 || 0,
      color: "#5C8D47",
      tint: "#EEF6E9",
    },
    {
      key: "pdcReady",
      name: "PDC Ready (Graduation Track)",
      range: "43+ Sessions",
      count: stats?.curriculumPhases?.pdcReady || 0,
      color: "#357648",
      tint: "#E8F5EC",
    },
  ];

  const quickActions = [
    {
      key: "attendance",
      label: "Record Attendance",
      description: "Log today's session attendance for your patients.",
      icon: HIM_KPI_ICONS.status,
      onClick: () => navigate("/attendance"),
    },
    {
      key: "note",
      label: "Add Progress Note",
      description: "Document a patient's session and progress.",
      icon: <svg {...iconProps} width={18} height={18}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M12 12v6M9 15h6" /></svg>,
      onClick: () => setNoteModalOpen(true),
    },
    {
      key: "cm-tracker",
      label: "Monthly CM Tracker",
      description: "Monitor client 43-session milestones & DOH census.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      ),
      onClick: () => navigate("/reports/op-cm-tracker"),
    },
    {
      key: "continue-registration",
      label: "Continue Registration",
      description: stats?.pendingRegistrationRecords?.length
        ? `Resume ${stats.pendingRegistrationRecords[0].next_step_label}.`
        : "No incomplete registrations.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      ),
      onClick: () => navigate(registrationPath(stats?.pendingRegistrationRecords?.[0])),
    },
    {
      key: "patients",
      label: "View My Patients",
      description: "See the full list of patients assigned to you.",
      icon: HIM_KPI_ICONS.patients,
      onClick: () => navigate("/patients"),
    },
    {
      key: "followUp",
      label: "Follow-up Case",
      description: "Schedule or resolve a patient follow-up.",
      icon: <svg {...iconProps} width={18} height={18}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M8 2v4M16 2v4M3 10h18M12 14v4M10 16h4" /></svg>,
      onClick: () => setFollowUpModalOpen(true),
    },
  ];

  const recentPatients = stats?.recentPatients || [];
  const attentionPatientIds = new Set((stats?.patientsNeedingAttention || []).map((patient) => patient.patient_id));
  const patientFilters = [
    { key: "all", label: "All", count: recentPatients.length },
    { key: "active", label: "Active", count: recentPatients.filter((patient) => patient.enrollment_status === "active").length },
    { key: "pending", label: "Pending", count: recentPatients.filter((patient) => patient.enrollment_status === "pending").length },
    { key: "completed", label: "Completed", count: recentPatients.filter((patient) => patient.enrollment_status === "completed").length },
    { key: "attention", label: "Needs attention", count: recentPatients.filter((patient) => attentionPatientIds.has(patient.id)).length },
  ];
  const normalizedPatientSearch = patientSearch.trim().toLowerCase();
  const filteredPatients = recentPatients.filter((patient) => {
    const matchesSearch = !normalizedPatientSearch
      || patient.full_name?.toLowerCase().includes(normalizedPatientSearch)
      || patient.patient_code?.toLowerCase().includes(normalizedPatientSearch);
    const matchesFilter = patientFilter === "all"
      || (patientFilter === "attention" ? attentionPatientIds.has(patient.id) : patient.enrollment_status === patientFilter);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="mtrc-page-enter" style={cmStyles.page} aria-busy={loading}>
      {loadError && (
        <div role="alert" style={cmStyles.errorBanner}>
          <span>{loadError}</span>
          <button type="button" style={cmStyles.retryBtn} onClick={loadStats}>Retry</button>
        </div>
      )}

      <DashboardOverviewBanner
        badge="Caseload Scope"
        secondaryBadge="43-Session Outpatient Program"
        title="Assigned Caseload Clinical & Attendance Overview"
        subtitle="Live progression across your assigned patients, today's sessions, and clinical follow-ups."
        metrics={[
          { label: "Assigned", value: stats?.assignedPatients ?? 0 },
          { label: "Active", value: stats?.caseStatusOverview?.active ?? 0, color: "#476A30" },
          { label: "PDC Ready", value: stats?.curriculumPhases?.pdcReady ?? 0 },
        ]}
        onRefresh={loadStats}
        refreshing={loading}
        isCompact={isCompact}
      />

      <div style={{ ...cmStyles.kpiRow, gridTemplateColumns: typeof kpiCols === "string" ? kpiCols : `repeat(${kpiCols}, 1fr)` }}>
        <CmKpiCard label="Assigned Patients" value={stats?.assignedPatients ?? "—"} icon={HIM_KPI_ICONS.patients} />
        <CmKpiCard label="Today's Sessions" value={stats?.todaysSessions ?? "—"} icon={HIM_KPI_ICONS.online} />
        <CmKpiCard label="Missed Sessions" value={stats?.missedSessions ?? "—"} icon={HIM_KPI_ICONS.auditLogs} />
        <CmKpiCard label="Follow-ups Needed" value={stats?.followUpsNeeded ?? "—"} icon={HIM_KPI_ICONS.reports} />
        <CmKpiCard 
          label="Attendance Rate" 
          value={stats?.attendanceRate != null ? `${stats.attendanceRate}%` : "N/A"} 
          subtitle="DOH Target: ≥80%" 
          icon={HIM_KPI_ICONS.online} 
        />
      </div>

      <QuickActionsCard actions={quickActions} navigate={navigate} />

      <div style={{
        ...cmStyles.gridRow,
        gridTemplateColumns: isCompact ? "1fr" : "1.2fr 1fr",
      }}>
        <CmCard
          title="Patients Needing Attention"
          height={primaryPanelHeight}
          highlight
          headerAction={<button type="button" style={cmStyles.viewAllBtn} onClick={() => navigate("/patients")}>View all →</button>}
        >
          {!stats?.patientsNeedingAttention?.length ? (
            <DashboardEmptyState loading={loading} emptyText="No patients need attention right now." />
          ) : (
            <div style={{ ...cmStyles.list, ...cmStyles.scrollArea, ...cmStyles.boxList }}>
              {stats.patientsNeedingAttention.map((p, i) => (
                <button
                  key={`${p.patient_id}-${p.issue}-${i}`}
                  type="button"
                  className="mtrc-dash-row" style={cmStyles.attentionRow}
                  onClick={() => navigate(`/patients/${p.patient_id}`)}
                >
                  <PatientAvatar name={p.full_name} photoUrl={p.photo_url} style={cmStyles.patientAvatar} />
                  <span style={cmStyles.rowMain}>{p.full_name}</span>
                  <span style={{ 
                    ...cmStyles.issueBadge, 
                    backgroundColor: p.color === "red" ? "#EAF2E5" : p.color === "blue" ? "#E8F5EC" : "#F1F7E6",
                    color: p.color === "red" ? "#243B12" : p.color === "blue" ? "#357648" : "#476A30"
                  }}>{p.issue}</span>
                  <span aria-hidden="true" style={cmStyles.rowChevron}>›</span>
                </button>
              ))}
            </div>
          )}
        </CmCard>

        <CmCard title="Today's Schedule" height={primaryPanelHeight}>
          {!stats?.todaysSchedule?.length ? (
            <DashboardEmptyState loading={loading} emptyText="No sessions scheduled for today." />
          ) : (
            <div style={{ ...cmStyles.list, ...cmStyles.scrollArea, ...cmStyles.boxList }}>
              {stats.todaysSchedule.map((s) => (
                <div key={s.id} style={cmStyles.scheduleRow}>
                  <span style={cmStyles.scheduleIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M8 3v4M16 3v4M3 10h18" />
                    </svg>
                  </span>
                  <div style={cmStyles.scheduleIdentity}>
                    <div style={cmStyles.rowMain}>{s.session_name}</div>
                    <div style={cmStyles.scheduleMeta}>
                      {formatTime(s.session_time) || "Time not set"}{s.program_name ? ` · ${s.program_name}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CmCard>
      </div>

      <div style={{
        ...cmStyles.patientNotesRow,
        gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.75fr) minmax(300px, 0.75fr)",
      }}>
        <CmCard
          title="My Patients"
          height={patientsPanelHeight}
          headerAction={<button type="button" style={cmStyles.viewAllBtn} onClick={() => navigate("/patients")}>View all patients →</button>}
        >
          {!recentPatients.length ? (
            <DashboardEmptyState loading={loading} emptyText="No patients are assigned to you yet." />
          ) : (
            <div style={cmStyles.patientDirectory}>
              <label style={cmStyles.patientSearchBox}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={cmStyles.patientSearchIcon}>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-4-4" />
                </svg>
                <input
                  type="search"
                  value={patientSearch}
                  onChange={(event) => setPatientSearch(event.target.value)}
                  placeholder="Search by name or patient ID"
                  aria-label="Search assigned patients"
                  style={cmStyles.patientSearchInput}
                />
              </label>

              <div style={cmStyles.patientFilters} aria-label="Filter assigned patients">
                {patientFilters.map((filter) => {
                  const selected = patientFilter === filter.key;
                  return (
                    <button
                      key={filter.key}
                      type="button"
                      aria-pressed={selected}
                      className="mtrc-filter-pill" style={{ ...cmStyles.patientFilterBtn, ...(selected ? cmStyles.patientFilterBtnActive : {}) }}
                      onClick={() => setPatientFilter(filter.key)}
                    >
                      {filter.label} · {filter.count}
                    </button>
                  );
                })}
              </div>

              {!isMobile && (
                <div style={cmStyles.patientTableHeader} aria-hidden="true">
                  <span>Patient</span>
                  <span>Program</span>
                  <span>Status</span>
                  <span />
                  <span />
                </div>
              )}

              {!filteredPatients.length ? (
                <div style={cmStyles.patientFilterEmpty}>No patients match this search or filter.</div>
              ) : (
                <div style={{ ...cmStyles.patientList, ...cmStyles.scrollArea }}>
                  {filteredPatients.map((patient) => {
                    const badge = STATUS_BADGE_COLORS[patient.enrollment_status] || STATUS_BADGE_COLORS.pending;
                    return (
                      <button
                        key={patient.id}
                        type="button"
                        className="mtrc-dash-row" style={{ ...cmStyles.patientRow, ...(isMobile ? cmStyles.patientRowMobile : {}) }}
                        onClick={() => navigate(`/patients/${patient.id}`)}
                      >
                        {isMobile ? (
                          <>
                            <PatientAvatar name={patient.full_name} photoUrl={patient.photo_url} style={cmStyles.patientAvatar} />
                            <span style={cmStyles.patientIdentity}>
                              <span style={cmStyles.rowMain}>{patient.full_name}</span>
                              <span style={cmStyles.patientMeta}>
                                {patient.patient_code}{patient.program_name ? ` · ${patient.program_name}` : ""} · {timeAgo(patient.last_activity)}
                              </span>
                            </span>
                            <span style={cmStyles.patientRowAside}>
                              <span style={{ ...cmStyles.patientStatus, background: badge.bg, color: badge.color }}>
                                {patient.enrollment_status}
                              </span>
                              <span aria-hidden="true" style={cmStyles.rowChevron}>›</span>
                            </span>
                          </>
                        ) : (
                          <>
                            <span style={cmStyles.patientCell}>
                              <PatientAvatar name={patient.full_name} photoUrl={patient.photo_url} style={cmStyles.patientAvatar} />
                              <span style={cmStyles.patientIdentity}>
                                <span style={cmStyles.rowMain}>{patient.full_name}</span>
                                <span style={cmStyles.patientMeta}>{patient.patient_code}</span>
                              </span>
                            </span>
                            <span style={cmStyles.patientProgram}>{patient.program_name || "Not assigned"}</span>
                            <span style={{ ...cmStyles.patientStatus, background: badge.bg, color: badge.color }}>
                              {patient.enrollment_status}
                            </span>
                            <span style={cmStyles.rowTime}>{timeAgo(patient.last_activity)}</span>
                            <span aria-hidden="true" style={cmStyles.rowChevron}>›</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              <div style={cmStyles.patientListFooter}>
                Showing {filteredPatients.length} of {recentPatients.length} assigned patients
              </div>
            </div>
          )}
        </CmCard>

        <CmCard title="Recent Progress Notes" height={patientsPanelHeight}>
          {!stats?.recentProgressNotes?.length ? (
            <DashboardEmptyState loading={loading} emptyText="No progress notes yet." />
          ) : (
            <div style={{ ...cmStyles.list, ...cmStyles.scrollArea, ...cmStyles.boxList }}>
              {stats.recentProgressNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  className="mtrc-dash-row" style={cmStyles.progressNoteRow}
                  onClick={() => navigate(`/patients/${note.patient_id}`)}
                >
                  <PatientAvatar name={note.patient_name} photoUrl={note.patient_photo_url} style={cmStyles.patientAvatar} />
                  <span style={cmStyles.progressNoteContent}>
                    <span style={cmStyles.progressNotePatient}>{note.patient_name}</span>
                    <span style={cmStyles.progressNoteMeta}>{note.session_type || note.note_type || "Progress note"}</span>
                  </span>
                  <span style={cmStyles.rowTime}>{timeAgo(note.updated_at || note.created_at)}</span>
                  <span aria-hidden="true" style={cmStyles.rowChevron}>›</span>
                </button>
              ))}
            </div>
          )}
        </CmCard>
      </div>

      <div style={{ ...cmStyles.gridRow, gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr" }}>
        <CmCard
          title="43-Session Curriculum Progression"
          height={overviewPanelHeight}
          headerAction={<button type="button" style={cmStyles.viewAllBtn} onClick={() => navigate("/reports/op-cm-tracker")}>View matrix →</button>}
        >
          <div style={{ ...cmStyles.statusOverview, ...cmStyles.scrollArea, ...cmStyles.boxList }}>
            <div style={cmStyles.statusTotalRow}>
              <span style={cmStyles.statusTotalValue}>{activeCohortTotal}</span>
              <span style={cmStyles.statusTotalLabel}>Active caseload in curriculum</span>
            </div>
            <div style={cmStyles.statusBars}>
              {curriculumPhasesList.map((item) => {
                const percentage = activeCohortTotal ? Math.round((Number(item.count) / activeCohortTotal) * 100) : 0;
                return (
                  <div key={item.key} style={cmStyles.statusBarRow}>
                    <div style={cmStyles.statusBarHeader}>
                      <span style={cmStyles.statusBarLabel}>
                        <span style={{ ...cmStyles.statusDot, background: item.color }} />
                        {item.name}
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: item.tint, color: item.color, fontWeight: 700, marginLeft: 4 }}>
                          {item.range}
                        </span>
                      </span>
                      <span style={cmStyles.statusCount}>{item.count} · {percentage}%</span>
                    </div>
                    <div style={{ ...cmStyles.statusTrack, background: item.tint }}>
                      <div style={{ ...cmStyles.statusFill, width: `${percentage}%`, background: item.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CmCard>

        <CmCard title="Case Status Overview" height={overviewPanelHeight}>
          <div style={{ ...cmStyles.statusOverview, ...cmStyles.scrollArea, ...cmStyles.boxList }}>
            <div style={cmStyles.statusTotalRow}>
              <span style={cmStyles.statusTotalValue}>{statusTotal}</span>
              <span style={cmStyles.statusTotalLabel}>Current cases</span>
            </div>
            <div style={cmStyles.statusBars}>
              {statusOverview.map((item) => {
                const percentage = statusTotal ? Math.round((Number(item.value) / statusTotal) * 100) : 0;
                return (
                  <div key={item.key} style={cmStyles.statusBarRow}>
                    <div style={cmStyles.statusBarHeader}>
                      <span style={cmStyles.statusBarLabel}>
                        <span style={{ ...cmStyles.statusDot, background: item.color }} />
                        {item.label}
                      </span>
                      <span style={cmStyles.statusCount}>{item.value} · {percentage}%</span>
                    </div>
                    <div style={{ ...cmStyles.statusTrack, background: item.tint }}>
                      <div style={{ ...cmStyles.statusFill, width: `${percentage}%`, background: item.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CmCard>
      </div>

      <div style={{ ...cmStyles.gridRow, gridTemplateColumns: "1fr" }}>
        <CmCard title="Recent Case Activity" height={250}>
          {!stats?.recentCaseActivity?.length ? (
            <DashboardEmptyState loading={loading} emptyText="No recent case activity yet." />
          ) : (
            <div style={{ ...cmStyles.list, ...cmStyles.scrollArea, ...cmStyles.boxList }}>
              {stats.recentCaseActivity.map((activity) => (
                <button
                  key={activity.activity_id}
                  type="button"
                  className="mtrc-dash-row" style={cmStyles.activityRow}
                  onClick={() => navigate(`/patients/${activity.patient_id}`)}
                >
                  <span style={cmStyles.activityMarker} />
                  <span style={cmStyles.activityContent}>
                    <span style={cmStyles.activityTitle}>{activity.activity_label}</span>
                    <span style={cmStyles.activityMeta}>{activity.patient_name} · {activity.activity_detail}</span>
                  </span>
                  <span style={cmStyles.rowTime}>{timeAgo(activity.activity_at)}</span>
                </button>
              ))}
            </div>
          )}
        </CmCard>
      </div>

      {noteModalOpen && (
        <ProgressNoteModal
          onClose={() => setNoteModalOpen(false)}
          onSaved={() => { setNoteModalOpen(false); loadStats(); }}
        />
      )}
      {followUpModalOpen && (
        <FollowUpModal
          onClose={() => setFollowUpModalOpen(false)}
          onSaved={() => { setFollowUpModalOpen(false); loadStats(); }}
        />
      )}
    </div>
  );
}

function DashboardEmptyState({ loading, emptyText }) {
  return (
    <div style={cmStyles.emptyText}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#8CA291"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: 22, height: 22, marginBottom: 6, opacity: 0.85 }}
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="13" y2="17" />
      </svg>
      <div>{loading ? "Loading dashboard…" : emptyText}</div>
    </div>
  );
}

function CmCard({ title, span = 1, maxSpan, center, height, highlight, headerAction, children }) {
  const effectiveSpan = maxSpan ? Math.min(span, maxSpan) : span;
  return (
    <div className="mtrc-dash-card" style={{
      ...cmStyles.card,
      gridColumn: `span ${effectiveSpan}`,
      height,
      overflow: "hidden",
      borderColor: highlight ? "#357648" : "#DCE7DC"
    }}>
      <div style={cmStyles.cardHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={titleAccentBarStyle} />
          <div style={cmStyles.cardTitle}>{title}</div>
        </div>
        {headerAction}
      </div>
      <div style={{ ...cmStyles.cardBody, justifyContent: center ? "center" : "flex-start" }}>
        {children}
      </div>
    </div>
  );
}

function CmKpiCard({ label, value, icon, subtitle }) {
  return (
    <div className="mtrc-kpi-card" style={cmStyles.kpiCard}>
      <div className="mtrc-kpi-icon" style={cmStyles.kpiIcon}>{icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={cmStyles.kpiValue}>{value}</div>
        <div style={cmStyles.kpiLabel} title={label}>{label}</div>
        {subtitle && <div style={{ fontSize: 10.5, color: "var(--color-text-muted, #6B7280)", marginTop: 2, fontWeight: 600, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={subtitle}>{subtitle}</div>}
      </div>
    </div>
  );
}

const STATUS_BADGE_COLORS = {
  pending:     { bg: "#F1F7E6", color: "#476A30" },
  active:      { bg: "#E8F5EC", color: "#357648" },
  completed:   { bg: "#ECF4EF", color: "#243B12" },
  dropped:     { bg: "#EFF3EC", color: "#5C6B57" },
  transferred: { bg: "#EAF4E4", color: "#5C8D47" },
};

function AdmittingDashboard() {
  const navigate = useNavigate();
  const { width, isMobile, isTablet } = useViewport();
  const isCompact = isMobile || isTablet;
  const kpiCols = isCompact ? 2 : width < 1200 ? "repeat(auto-fit, minmax(170px, 1fr))" : 5;
  const mainPanelHeight = isMobile ? 320 : 286;
  const insightPanelHeight = isMobile ? 310 : 258;
  const activityPanelHeight = isMobile ? 270 : 210;
  const quickActionsPanelHeight = isMobile ? 300 : 220;

  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function loadStats() {
    setLoadError("");
    setRefreshing(true);
    try {
      const { data } = await api.get("/dashboard/admitting-stats");
      setStats(data);
    } catch (err) {
      setLoadError(err.response?.data?.message || "Could not load the admitting dashboard.");
    } finally {
      setRefreshing(false);
    }
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
      key: "pendingTriage",
      label: "Pending Triage / DDE",
      value: stats?.pendingTriageDDE ?? "—",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
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
      description: "Start a new patient admission record.",
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
      description: "Find an existing patient by name or ID.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      ),
      onClick: () => navigate("/patients"),
    },
    {
      key: "certificate",
      label: "Generate Certificate",
      description: "Print an enrollment certificate for a patient.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
          <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
      ),
      onClick: () => navigate("/patients"),
    },
  ];

  const registrationSegments = [
    { key: "newRegistrations", label: "New registrations", color: "#357648" },
    { key: "completed", label: "Completed", color: "#8FB361" },
    { key: "pending", label: "Pending", color: "#739E82" },
    { key: "incomplete", label: "Incomplete", color: "#243B12" },
  ].map((segment) => ({
    ...segment,
    value: Number(stats?.registrationProcess?.[segment.key] || 0),
  }));

  const processTotal = registrationSegments.reduce((sum, segment) => sum + segment.value, 0);
  let segmentOffset = 0;
  const processChart = processTotal
    ? `conic-gradient(${registrationSegments.map((segment) => {
        const start = segmentOffset;
        segmentOffset += (segment.value / processTotal) * 360;
        return `${segment.color} ${start}deg ${segmentOffset}deg`;
      }).join(", ")})`
    : "var(--color-border)";

  function fmtDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  function fmtShortDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  }

  return (
    <div className="mtrc-page-enter" style={apStyles.page}>
      {loadError && (
        <div role="alert" style={apStyles.errorBanner}>
          <span>{loadError}</span>
          <button type="button" style={apStyles.retryBtn} onClick={loadStats}>Retry</button>
        </div>
      )}

      <DashboardOverviewBanner
        badge="Intake & Admissions Scope"
        secondaryBadge="Outpatient Enrollment Track"
        title="Patient Registration & Admission Triage Overview"
        subtitle="Live tracking of new patient intakes, pending registrations, DDE triage, and enrollment certificates."
        metrics={[
          { label: "Registered", value: stats?.totalPatients ?? 0 },
          { label: "Today's Intake", value: stats?.todayAdmissions ?? 0, color: "#476A30" },
          { label: "Pending", value: stats?.pendingRegistrations ?? 0 },
        ]}
        onRefresh={loadStats}
        refreshing={refreshing}
        isCompact={isCompact}
      />

      {/* KPI row */}
      <div style={{ ...apStyles.kpiRow, gridTemplateColumns: typeof kpiCols === "string" ? kpiCols : `repeat(${kpiCols}, 1fr)` }}>
        {kpiCards.map((card) => (
          <div key={card.key} className="mtrc-kpi-card" style={apStyles.kpiCard}>
            <div className="mtrc-kpi-icon" style={apStyles.kpiIcon}>{card.icon}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={apStyles.kpiValue}>{card.value}</div>
              <div style={apStyles.kpiLabel} title={card.label}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Quick Actions (left) + Pending Registrations (right) */}
      <div style={{ ...apStyles.gridRow, gridTemplateColumns: isCompact ? "1fr" : "0.85fr 1.35fr" }}>
        <QuickActionsCard actions={quickActions} navigate={navigate} cols={1} />

        {/* Pending Registrations */}
        <div className="mtrc-dash-card" style={{ ...apStyles.card, height: "100%", overflow: "hidden" }}>
          <div style={apStyles.cardHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={titleAccentBarStyle} />
              <span style={apStyles.cardTitle}>Pending Registrations</span>
            </div>
            {!!stats?.pendingRegistrationRecords?.length && (
              <span style={apStyles.warnBadge}>{stats.pendingRegistrations} pending</span>
            )}
          </div>

          {!stats?.pendingRegistrationRecords?.length ? (
            <div style={apStyles.emptyText}>No registrations are waiting for completion.</div>
          ) : (
            <div style={{ ...apStyles.pendingList, ...apStyles.scrollArea, ...apStyles.boxList }}>
              {stats.pendingRegistrationRecords.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  className="mtrc-dash-row" style={apStyles.pendingRow}
                  onClick={() => navigate(registrationPath(patient))}
                >
                  <PatientAvatar name={patient.full_name} photoUrl={patient.photo_url} style={apStyles.pendingAvatar} />
                  <span style={apStyles.pendingIdentity}>
                    <span style={apStyles.pendingName}>{patient.full_name}</span>
                    <span style={apStyles.pendingMeta}>
                      {patient.patient_code} · {fmtShortDate(patient.admission_date || patient.created_at)}
                    </span>
                    <span style={apStyles.pendingStage}>Next: {patient.next_step_label}</span>
                  </span>
                  <span aria-hidden="true" style={apStyles.pendingChevron}>›</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

            <div style={apStyles.compactInsights}>
        {/* Row 3: Recent Admissions (left) + Incomplete Records (right) */}
        <div style={{ ...apStyles.gridRow, gridTemplateColumns: isCompact ? "1fr" : "1.6fr 1fr" }}>
          <div className="mtrc-dash-card" style={{ ...apStyles.card, height: insightPanelHeight, overflow: "hidden" }}>
            <div style={apStyles.cardHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={titleAccentBarStyle} />
                <span style={apStyles.cardTitle}>Recent Admissions</span>
              </div>
              <button
                type="button"
                style={apStyles.linkBtn}
                onClick={() => navigate("/patients")}
              >
                View all →
              </button>
            </div>

            {!stats?.recentAdmissions?.length ? (
              <div style={apStyles.emptyText}>No patients registered yet.</div>
            ) : (
              <div style={{ ...apStyles.tableWrap, ...apStyles.boxList }}>
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
                          className="mtrc-dash-row" style={apStyles.tr}
                          onClick={() => navigate(`/patients/${p.id}`)}
                        >
                          <td style={apStyles.td}>
                            <div style={apStyles.tableNameCell}>
                              <PatientAvatar name={p.full_name} photoUrl={p.photo_url} style={apStyles.tableAvatar} />
                              <span>{p.full_name}</span>
                            </div>
                          </td>
                          <td style={{ ...apStyles.td, color: "var(--color-text-muted)", fontSize: 12 }}>{p.patient_code}</td>
                          <td style={apStyles.td}>{fmtDate(p.admission_date || p.created_at)}</td>
                          <td style={apStyles.td}>
                            <span style={{ ...apStyles.statusBadge, background: sc.bg, color: sc.color }}>
                              {p.enrollment_status === "pending" ? p.registration_stage : p.enrollment_status}
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

          <div className="mtrc-dash-card" style={{ ...apStyles.card, height: insightPanelHeight, overflow: "hidden" }}>
            <div style={apStyles.cardHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={titleAccentBarStyle} />
                <span style={apStyles.cardTitle}>Incomplete Records</span>
              </div>
              {!!stats?.incompleteRecords?.length && (
                <span style={apStyles.warnBadge}>{stats.incompleteRecords.length} pending</span>
              )}
            </div>

            {!stats?.incompleteRecords?.length ? (
              <div style={apStyles.emptyText}>All registered patients have complete records.</div>
            ) : (
              <div style={{ ...apStyles.list, ...apStyles.scrollArea, ...apStyles.boxList }}>
                {stats.incompleteRecords.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="mtrc-dash-row" style={apStyles.incompleteRow}
                    onClick={() => navigate(registrationPath(p))}
                  >
                    <PatientAvatar name={p.full_name} photoUrl={p.photo_url} style={apStyles.incompleteAvatar} />
                    <div style={apStyles.incompletePatient}>
                      <div style={apStyles.incompleteRowName}>{p.full_name}</div>
                      <div style={apStyles.incompleteRowCode}>{p.patient_code}</div>
                    </div>
                    <span style={apStyles.missingTag} title={p.missing_info}>{p.missing_info}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 4: Registration Process (left) + Today's Admission Activity (right) */}
        <div style={{ ...apStyles.gridRow, gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)" }}>
          <div className="mtrc-dash-card" style={{ ...apStyles.card, height: activityPanelHeight, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={titleAccentBarStyle} />
              <div style={apStyles.cardTitle}>Registration Process</div>
            </div>
            <div style={{ ...apStyles.processContent, ...apStyles.boxList, flexDirection: "row", alignItems: "center", justifyContent: "center", height: "100%", gap: 24, boxSizing: "border-box" }}>
              <div
                style={{ ...apStyles.donut, width: 136, height: 136, background: processChart, flexShrink: 0 }}
                aria-label="Registration process chart"
              >
                <div style={apStyles.donutCenter}>
                  <strong style={apStyles.donutValue}>{stats?.totalPatients ?? 0}</strong>
                  <span style={apStyles.donutLabel}>patients</span>
                </div>
              </div>
              <div style={{ ...apStyles.processLegend, display: "flex", flexDirection: "column", gap: 8 }}>
                {registrationSegments.map((segment) => (
                  <div key={segment.key} style={apStyles.legendRow}>
                    <span style={{ ...apStyles.legendDot, background: segment.color }} />
                    <span style={apStyles.legendLabel}>{segment.label}</span>
                    <strong style={apStyles.legendValue}>{segment.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mtrc-dash-card" style={{ ...apStyles.card, ...apStyles.activityCard, height: activityPanelHeight, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={titleAccentBarStyle} />
              <div style={apStyles.cardTitle}>Today's Admission Activity</div>
            </div>

          {!stats?.todayAdmissionActivity?.length ? (
            <div style={apStyles.emptyText}>No admission activity recorded today.</div>
          ) : (
            <div style={{ ...apStyles.timeline, ...apStyles.scrollArea, ...apStyles.boxList }}>
              {stats.todayAdmissionActivity.map((activity, index) => (
                <button
                  key={activity.activity_id}
                  type="button"
                  className="mtrc-dash-row" style={apStyles.timelineRow}
                  onClick={() => activity.patient_id && navigate(`/patients/${activity.patient_id}`)}
                >
                  <span style={apStyles.timelineTrack}>
                    <span style={apStyles.timelineDot} />
                    {index < stats.todayAdmissionActivity.length - 1 && <span style={apStyles.timelineLine} />}
                  </span>
                  <span style={apStyles.timelineBody}>
                    <span style={apStyles.timelineTitle}>{activity.activity_label}</span>
                    <span style={apStyles.timelinePatient}>
                      {activity.patient_name}{activity.activity_detail ? ` · ${activity.activity_detail}` : ""}
                    </span>
                  </span>
                  <span style={apStyles.timelineTime}>{timeAgo(activity.activity_at)}</span>
                </button>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
  </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isCaseManager = user?.role === "case_manager";
  const isAdmitting = user?.role === "admitting";

  return (
    <AppShell
      title={isCaseManager ? "Case Manager Dashboard" : isAdmitting ? "Admitting Dashboard" : "Dashboard"}
      description={isCaseManager
        ? "Assigned patients, today's schedule, and recent case activity."
        : isAdmitting
          ? "Patient registrations, record completion, and today's admission activity."
          : "Overview of enrollment, attendance, and program activity."}
    >
      {user?.role === "ict_admin" ? (
        <IctAdminDashboard />
      ) : user?.role === "him_staff" ? (
        <HimStaffDashboard />
      ) : isCaseManager ? (
        <CaseManagerDashboard />
      ) : isAdmitting ? (
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
    gap: 12,
    background: "#FFFFFF",
    border: "1.5px solid #DCE8DD",
    borderRadius: 16,
    padding: "14px 16px",
    minHeight: 80,
    height: "auto",
    boxSizing: "border-box",
    boxShadow: "0 2px 10px rgba(38, 101, 59, 0.04), inset 0 0 0 2px rgba(230, 243, 232, 0.45)",
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "#E6F3E8",
    color: "#26653B",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statValue: { fontSize: 20, fontWeight: 800, color: "var(--color-text)", lineHeight: 1.15 },
  statLabel: {
    fontSize: 11.5,
    fontWeight: 700,
    color: "var(--color-text, #1F2421)",
    marginTop: 2,
    lineHeight: 1.25,
    wordBreak: "break-word",
  },

  twoColRow: {
    display: "flex",
    gap: 16,
    flex: 1,
    minHeight: 0,
  },
  card: {
    flex: 1,
    background: "#fff",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 2px 10px rgba(20,20,40,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minHeight: 0,
    overflow: "hidden",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--color-text)",
  },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  boxList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: "100%",
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: 10,
    border: "1px solid var(--color-border)",
    borderRadius: 10,
    boxSizing: "border-box",
  },
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
    background: "#FFFFFF", border: "1px solid #DCE7DC", borderRadius: 18, padding: 14, boxShadow: "0 2px 10px rgba(20,20,40,0.04)",
    display: "flex", flexDirection: "column", gap: 8, minHeight: 90,
  },
  cardCompact: {
    padding: 12,
    gap: 6,
    minHeight: 72,
  },
  cardTitle: { fontSize: 13, fontWeight: 800, color: "var(--color-text)" },
  emptyText: { color: "var(--color-text-muted)", fontSize: 12.5, fontWeight: 600, textAlign: "center", padding: "18px 12px", width: "100%", background: "#EEF3EE", borderRadius: 12, border: "1px solid #E1EBE1", boxSizing: "border-box" },
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
    padding: 10,
    border: "1px solid var(--color-border)",
    borderRadius: 10,
    marginTop: 4,
  },
  row: {
    display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5,
    color: "var(--color-text-muted)", paddingBottom: 8, borderBottom: "1px solid var(--color-border)",
  },
  rowMain: { fontWeight: 700, color: "var(--color-text)", minWidth: 0 },
  rowMid: { flex: 1, marginLeft: 6, textTransform: "capitalize", minWidth: 0 },
  rowTime: { color: "var(--color-text-muted)", whiteSpace: "nowrap", flexShrink: 0, fontSize: 11.5 },
  cardTitleRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  viewAllLink: { background: "none", border: "none", padding: 0, color: "var(--color-primary-dark)", fontSize: 11.5, fontWeight: 600, cursor: "pointer" },
  avatarRow: {
    display: "flex", alignItems: "center", gap: 10, fontSize: 12.5,
    paddingBottom: 8, borderBottom: "1px solid var(--color-border)", cursor: "pointer",
  },
  avatarRowMain: { flex: 1 },
  avatarRowBody: { display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 2 },
  rowSub: { color: "var(--color-text-muted)", fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rowAvatar: {
    width: 28, height: 28, borderRadius: "50%", flexShrink: 0, objectFit: "cover",
    background: "var(--color-primary-tint)", color: "var(--color-primary-dark)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 700,
  },
  pill: { fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, flexShrink: 0 },
  iconRow: {
    display: "flex", alignItems: "center", gap: 10, fontSize: 12.5,
    paddingBottom: 8, borderBottom: "1px solid var(--color-border)",
  },
  activityIcon: {
    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
    background: "var(--color-border)", color: "var(--color-text-muted)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  kpiCard: { display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF", border: "1.5px solid #DCE8DD", borderRadius: 16, padding: "12px 14px", minHeight: 76, height: "auto", boxSizing: "border-box", boxShadow: "0 2px 10px rgba(38, 101, 59, 0.04), inset 0 0 0 2px rgba(230, 243, 232, 0.45)" },
  kpiIcon: { width: 36, height: 36, borderRadius: "50%", background: "#E6F3E8", color: "#26653B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  kpiValue: { fontSize: 20, fontWeight: 800, color: "var(--color-text)", lineHeight: 1.15 },
  kpiLabel: { fontSize: 11, fontWeight: 700, color: "var(--color-text, #1F2421)", marginTop: 2, lineHeight: 1.25, wordBreak: "break-word", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
};

const cmStyles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    width: "100%",
    maxWidth: 1680,
    margin: "0 auto",
    paddingBottom: 8,
    boxSizing: "border-box",
  },
  kpiRow: { display: "grid", gap: 16, width: "100%" },
  gridRow: { display: "grid", gap: 16, alignItems: "stretch", width: "100%", minWidth: 0 },
  patientNotesRow: { display: "grid", gap: 16, alignItems: "stretch", width: "100%", minWidth: 0 },
  card: {
    background: "#FFFFFF",
    border: "1px solid #DCE7DC",
    borderRadius: 18,
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 90,
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
    boxShadow: "0 2px 10px rgba(20, 20, 40, 0.04)",
  },
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minWidth: 0 },
  cardTitle: { fontSize: 14, fontWeight: 800, color: "var(--color-text)" },
  cardBody: {
    display: "flex",
    alignItems: "stretch",
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: "100%",
  },
  emptyText: {
    color: "var(--color-text-muted)",
    fontSize: 12.5,
    fontWeight: 600,
    textAlign: "center",
    padding: "24px 16px",
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
  list: { display: "flex", flexDirection: "column", gap: 0, width: "100%", minWidth: 0 },
  scrollArea: { flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 6 },
  boxList: { border: "1px solid var(--color-border)", borderRadius: 10, padding: 12 },
  errorBanner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    background: "#FDE2E2",
    color: "#B3261E",
    borderRadius: "var(--radius-sm)",
    fontSize: 13,
  },
  retryBtn: { background: "none", border: "none", color: "inherit", fontWeight: 700, cursor: "pointer" },
  viewAllBtn: {
    flexShrink: 0,
    padding: 0,
    background: "none",
    border: "none",
    color: "var(--color-primary-dark)",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  rowMain: {
    flex: 1,
    fontWeight: 700,
    color: "var(--color-text)",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
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
    minHeight: 54,
    flexShrink: 0,
    color: "inherit",
  },
  patientAvatar: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "var(--color-primary-tint)",
    color: "var(--color-primary-dark)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 800,
    flexShrink: 0,
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
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid var(--color-border)",
    minHeight: 54,
    flexShrink: 0,
  },
  scheduleIcon: {
    width: 34,
    height: 34,
    borderRadius: "var(--radius-sm)",
    background: "var(--color-primary-tint)",
    color: "var(--color-primary-dark)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  scheduleMeta: { fontSize: 11, color: "var(--color-text-muted)", marginTop: 3 },
  scheduleIdentity: { flex: 1, minWidth: 0 },
  patientDirectory: { display: "flex", flexDirection: "column", gap: 10, width: "100%", minWidth: 0, minHeight: 0, height: "100%", flex: 1 },
  patientSearchBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    height: 40,
    padding: "0 12px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-surface)",
    boxSizing: "border-box",
    flexShrink: 0,
  },
  patientSearchIcon: { width: 17, height: 17, color: "var(--color-text-muted)", flexShrink: 0 },
  patientSearchInput: {
    width: "100%",
    minWidth: 0,
    padding: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "var(--color-text)",
    font: "inherit",
    fontSize: 13,
  },
  patientFilters: { display: "flex", gap: 8, width: "100%", overflowX: "auto", paddingBottom: 2, flexShrink: 0 },
  patientFilterBtn: {
    padding: "6px 11px",
    border: "1px solid var(--color-border)",
    borderRadius: 999,
    background: "var(--color-surface)",
    color: "var(--color-text-muted)",
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  patientFilterBtnActive: {
    background: "var(--color-primary-dark)",
    borderColor: "var(--color-primary-dark)",
    color: "#fff",
  },
  patientTableHeader: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1.5fr) minmax(120px, 0.8fr) 94px 72px 18px",
    alignItems: "center",
    gap: 12,
    padding: "2px 8px 7px",
    borderBottom: "1px solid var(--color-border)",
    color: "var(--color-text-muted)",
    fontSize: 10.5,
    fontWeight: 700,
    flexShrink: 0,
  },
  patientList: { display: "flex", flexDirection: "column", gap: 0, width: "100%", minWidth: 0 },
  patientFilterEmpty: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: 12 },
  patientRow: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1.5fr) minmax(120px, 0.8fr) 94px 72px 18px",
    alignItems: "center",
    gap: 12,
    width: "100%",
    minHeight: 54,
    padding: "9px 2px",
    background: "none",
    border: "none",
    borderBottom: "1px solid var(--color-border)",
    color: "inherit",
    textAlign: "left",
    cursor: "pointer",
    flexShrink: 0,
  },
  patientRowMobile: { display: "flex", gridTemplateColumns: "none", gap: 10 },
  patientCell: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 },
  patientProgram: { color: "var(--color-text-muted)", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  patientIdentity: { display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 },
  patientMeta: { color: "var(--color-text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  patientRowAside: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, flexShrink: 0 },
  patientStatus: { justifySelf: "start", padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "capitalize", whiteSpace: "nowrap" },
  rowChevron: { color: "var(--color-text-muted)", fontSize: 20, lineHeight: 1, flexShrink: 0 },
  patientListFooter: { color: "var(--color-text-muted)", fontSize: 11, textAlign: "center", flexShrink: 0 },
  progressNoteRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    minHeight: 58,
    padding: "9px 0",
    background: "none",
    border: "none",
    borderBottom: "1px solid var(--color-border)",
    color: "inherit",
    textAlign: "left",
    cursor: "pointer",
    flexShrink: 0,
  },
  progressNoteContent: { display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 },
  progressNotePatient: { color: "var(--color-text)", fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  progressNoteMeta: { color: "var(--color-text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "capitalize" },
  statusOverview: { display: "flex", flexDirection: "column", gap: 18, width: "100%", minWidth: 0 },
  statusTotalRow: { display: "flex", alignItems: "baseline", gap: 9 },
  statusTotalValue: { fontSize: 30, lineHeight: 1, fontWeight: 800, color: "var(--color-text)" },
  statusTotalLabel: { fontSize: 12, color: "var(--color-text-muted)" },
  statusBars: { display: "flex", flexDirection: "column", gap: 16, width: "100%" },
  statusBarRow: { display: "flex", flexDirection: "column", gap: 7 },
  statusBarHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  statusBarLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "var(--color-text)" },
  statusDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  statusCount: { color: "var(--color-text-muted)", fontSize: 11, whiteSpace: "nowrap" },
  statusTrack: { height: 10, width: "100%", borderRadius: 999, overflow: "hidden" },
  statusFill: { height: "100%", minWidth: 0, borderRadius: 999, transition: "width 0.55s cubic-bezier(0.22, 1, 0.36, 1)" },
  activityRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    minHeight: 50,
    padding: "8px 0",
    background: "none",
    border: "none",
    borderBottom: "1px solid var(--color-border)",
    color: "inherit",
    textAlign: "left",
    cursor: "pointer",
    flexShrink: 0,
  },
  activityMarker: { width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)", flexShrink: 0 },
  activityContent: { display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 },
  activityTitle: { color: "var(--color-text)", fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  activityMeta: { color: "var(--color-text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  quickActionsCard: {
    minHeight: 90,
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "min(900px, 100%)",
    margin: "0 auto",
    boxSizing: "border-box",
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
  },
  quickActionsTitle: { color: "var(--color-text)", fontSize: 14, fontWeight: 700 },
  quickActionsGrid: { display: "grid", gap: 12, width: "100%", minWidth: 0 },
  quickActionBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minWidth: 0,
    minHeight: 0,
    padding: "7px 8px",
    background: "var(--color-primary-tint)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text)",
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.15,
    textAlign: "center",
    cursor: "pointer",
  },
  quickActionIcon: { width: 18, height: 18, color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  kpiCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#FFFFFF",
    border: "1.5px solid #DCE8DD",
    borderRadius: 16,
    padding: "14px 16px",
    minHeight: 82,
    height: "auto",
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
    boxShadow: "0 2px 10px rgba(38, 101, 59, 0.04), inset 0 0 0 2px rgba(230, 243, 232, 0.45)",
  },
  kpiIcon: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "#E6F3E8",
    color: "#26653B",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  kpiValue: { fontSize: 22, fontWeight: 800, color: "var(--color-text)", lineHeight: 1.15 },
  kpiLabel: {
    fontSize: 11.5,
    fontWeight: 700,
    color: "var(--color-text, #1F2421)",
    marginTop: 2,
    lineHeight: 1.25,
    wordBreak: "break-word",
  },
};

const apStyles = {
  page: { display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 1680, margin: "0 auto", boxSizing: "border-box" },
  kpiRow: { display: "grid", gap: 14, width: "100%" },
  gridRow: { display: "grid", gap: 14, alignItems: "stretch", width: "100%" },
  compactInsights: { display: "flex", flexDirection: "column", gap: 14, width: "100%" },  activityCard: { maxWidth: 920, marginRight: "auto" },
  quickActionsCard: { width: "min(900px, 100%)", margin: "0 auto", minHeight: 0 },
  card: {
    background: "#FFFFFF",
    border: "1px solid #DCE7DC",
    borderRadius: 18,
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minHeight: 100,
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
    boxShadow: "0 2px 10px rgba(20, 20, 40, 0.04)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: { fontSize: 14, fontWeight: 800, color: "var(--color-text)" },
  emptyText: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: 12.5, fontWeight: 600, textAlign: "center", padding: "16px 12px", background: "#EEF3EE", borderRadius: 12, border: "1px solid #E1EBE1", boxSizing: "border-box" },
  list: { display: "flex", flexDirection: "column", gap: 0, width: "100%", minWidth: 0 },
  scrollArea: { flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 6 },
  boxList: { border: "1px solid var(--color-border)", borderRadius: 10, padding: 12 },
  errorBanner: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 14px", background: "#FDE2E2", color: "#B3261E", borderRadius: "var(--radius-sm)", fontSize: 13 },
  retryBtn: { background: "none", border: "none", color: "inherit", fontWeight: 700, cursor: "pointer" },
  kpiCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#FFFFFF",
    border: "1.5px solid #DCE8DD",
    borderRadius: 16,
    padding: "12px 14px",
    minHeight: 80,
    height: "auto",
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
    boxShadow: "0 2px 10px rgba(38, 101, 59, 0.04), inset 0 0 0 2px rgba(230, 243, 232, 0.45)",
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#E6F3E8",
    color: "#26653B",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  kpiValue: { fontSize: 20, fontWeight: 800, color: "var(--color-text)", lineHeight: 1.15 },
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

  tableWrap: { flex: 1, minHeight: 0, overflow: "auto", width: "100%" },
  table: { width: "100%", minWidth: 620, borderCollapse: "collapse", fontSize: 13 },
  tableNameCell: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  tableAvatar: { width: 26, height: 26, borderRadius: "50%", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 },
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
    padding: "9px 10px",
    fontSize: 13,
    color: "var(--color-text)",
    borderBottom: "1px solid var(--color-border)",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
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
    background: "#F1F7E6",
    color: "#476A30",
    whiteSpace: "nowrap",
  },
  pendingList: { display: "flex", flexDirection: "column", width: "100%", minWidth: 0 },
  pendingRow: { display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 58, padding: "9px 0", background: "none", border: "none", borderBottom: "1px solid var(--color-border)", color: "inherit", textAlign: "left", cursor: "pointer", flexShrink: 0 },
  pendingAvatar: { width: 36, height: 36, borderRadius: "50%", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 },
  pendingIdentity: { display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 },
  pendingName: { color: "var(--color-text)", fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  pendingMeta: { color: "var(--color-text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  pendingStage: { color: "var(--color-primary-dark)", fontSize: 10.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  pendingChevron: { color: "var(--color-text-muted)", fontSize: 20, lineHeight: 1, flexShrink: 0 },
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
    minHeight: 46,
    flexShrink: 0,
    color: "inherit",
  },
  incompleteAvatar: { width: 32, height: 32, borderRadius: "50%", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 },
  incompletePatient: { minWidth: 0, flex: 1 },
  incompleteRowName: { fontSize: 13, fontWeight: 600, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  incompleteRowCode: { fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 },
  missingTag: {
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: 999,
    background: "#ECF4EF",
    color: "#243B12",
    maxWidth: "45%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "center",
    flexShrink: 0,
  },
  processContent: { display: "flex", alignItems: "center", justifyContent: "space-evenly", gap: 20, flex: 1, minHeight: 0 },
  donut: { position: "relative", width: 142, height: 142, borderRadius: "50%", flexShrink: 0 },
  donutCenter: { position: "absolute", inset: 22, borderRadius: "50%", background: "var(--color-surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  donutValue: { fontSize: 22, color: "var(--color-text)", lineHeight: 1 },
  donutLabel: { fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 },
  processLegend: { display: "flex", flexDirection: "column", gap: 10, minWidth: 150 },
  legendRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 12 },
  legendDot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  legendLabel: { color: "var(--color-text-muted)", flex: 1 },
  legendValue: { color: "var(--color-text)", fontSize: 13 },
  timeline: { display: "flex", flexDirection: "column", width: "100%", minWidth: 0 },
  timelineRow: { display: "flex", alignItems: "stretch", gap: 10, width: "100%", minHeight: 50, padding: 0, background: "none", border: "none", color: "inherit", textAlign: "left", cursor: "pointer", flexShrink: 0 },
  timelineTrack: { position: "relative", width: 12, flexShrink: 0, display: "flex", justifyContent: "center" },
  timelineDot: { width: 9, height: 9, borderRadius: "50%", background: "var(--color-primary)", marginTop: 5, zIndex: 1 },
  timelineLine: { position: "absolute", top: 14, bottom: 0, width: 1, background: "var(--color-border)" },
  timelineBody: { display: "flex", flexDirection: "column", minWidth: 0, flex: 1, paddingBottom: 12 },
  timelineTitle: { fontSize: 13, fontWeight: 650, color: "var(--color-text)" },
  timelinePatient: { fontSize: 11, color: "var(--color-text-muted)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  timelineTime: { fontSize: 11, color: "var(--color-text-muted)", whiteSpace: "nowrap", paddingRight: 2 },
  actionsGrid: { display: "grid", gap: 10, width: "100%" },
  actionBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "12px 14px",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--color-text)",
    background: "var(--color-primary-tint)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    textAlign: "center",
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
};
