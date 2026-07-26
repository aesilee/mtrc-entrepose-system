import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABELS } from "../config/roles.js";
import api from "../api/axios.js";
import { DonutChart, LineChart } from "../components/AnalyticsCharts.jsx";
import useViewport from "../hooks/useViewport.js";

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
};

const RECENT_ACTIVITY = [
  { user: "—", action: "No recent activity yet", time: "—" },
];

const SYSTEM_NOTIFICATIONS = [
  { message: "No notifications yet", time: "—" },
];

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
  const statCols = isMobile ? 1 : isTablet ? 2 : 4;
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/dashboard/stats").then(({ data }) => setStats(data));
  }, []);

  const statCards = [
    { key: "totalUsers", label: "Total Users", value: stats?.totalUsers ?? "—", icon: ICONS.users },
    { key: "onlineUsers", label: "Online Users", value: stats?.onlineUsers ?? "—", icon: ICONS.online },
    { key: "totalPatients", label: "Total Patients", value: stats?.totalPatients ?? "—", icon: ICONS.patients },
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
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} style={styles.activityRow}>
                <span style={styles.activityUser}>{item.user}</span>
                <span style={styles.activityAction}>{item.action}</span>
                <span style={styles.activityTime}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>System Notifications</div>
          <div style={styles.list}>
            {SYSTEM_NOTIFICATIONS.map((item, i) => (
              <div key={i} style={styles.notificationRow}>
                <span>{item.message}</span>
                <span style={styles.activityTime}>{item.time}</span>
              </div>
            ))}
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
        <HimCard title="Patient Status Overview" span={1} maxSpan={gridCols} center>
          {overview?.patientStatus?.length ? <DonutChart data={overview.patientStatus} size={110} /> : <div style={himStyles.emptyText}>No data yet.</div>}
        </HimCard>
        <HimCard title="Monthly Admissions" span={3} maxSpan={gridCols}>
          {monthlyAdmissions.length ? <LineChart data={monthlyAdmissions} color="#2FBF8F" suffix="" /> : <div style={himStyles.emptyText}>No data yet.</div>}
        </HimCard>
      </div>

      {/* Row 3: Recent Patient Updates, Recent Certificates */}
      <div style={{ ...himStyles.gridRow, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
        <HimCard title="Recent Patient Record Updates" span={2} maxSpan={gridCols} isMobile={isCompact}>
          {!himStats?.recentPatientUpdates?.length ? (
            <div style={himStyles.emptyText}>No recent updates.</div>
          ) : (
            <div style={himStyles.list}>
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
        <HimCard title="Recent Certificates" span={2} maxSpan={gridCols} isMobile={isCompact}>
          {!himStats?.recentCertificates?.length ? (
            <div style={himStyles.emptyText}>No certificates issued yet.</div>
          ) : (
            <div style={himStyles.list}>
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
        <HimCard title="Record Activity Timeline" span={2} maxSpan={gridCols} isMobile={isCompact}>
          {!himStats?.recentActivity?.length ? (
            <div style={himStyles.emptyText}>No recent activity.</div>
          ) : (
            <div style={himStyles.list}>
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
        <HimCard title="Recent Reports" span={2} maxSpan={gridCols} isMobile={isCompact}>
          {recentReports.length === 0 ? (
            <div style={himStyles.emptyText}>No reports generated yet.</div>
          ) : (
            <div style={himStyles.list}>
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

      {/* Quick Actions — compact */}
      <div style={himStyles.card}>
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

function HimCard({ title, span, maxSpan, center, isMobile, children }) {
  const effectiveSpan = maxSpan ? Math.min(span, maxSpan) : span;
  return (
    <div style={{ ...himStyles.card, gridColumn: `span ${effectiveSpan}`, overflow: isMobile ? "visible" : "auto" }}>
      <div style={himStyles.cardTitle}>{title}</div>
      <div style={{ display: "flex", justifyContent: center ? "center" : "flex-start", alignItems: "center", flex: 1 }}>
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

function GenericDashboard({ user }) {
  return (
    <div style={styles.card}>
      <h2 style={styles.heading}>Welcome, {user.fullName.split(" ")[0]}</h2>
      <p style={styles.text}>
        You're signed in as <strong>{ROLE_LABELS[user.role]}</strong>. Real
        summary statistics (enrollment, attendance rate, flagged sessions)
        will appear here once the Client Profiling and Attendance modules
        are connected.
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <AppShell title="Dashboard" description="Overview of enrollment, attendance, and program activity.">
      {user.role === "ict_admin" ? <IctAdminDashboard /> : user.role === "him_staff" ? <HimStaffDashboard /> : <GenericDashboard user={user} />}
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
  page: { display: "flex", flexDirection: "column", gap: 14 },
  kpiRow: { display: "grid", gap: 14 },
  gridRow: { display: "grid", gap: 14, alignItems: "stretch" },
  card: {
    background: "#fff", borderRadius: 18, padding: 14, boxShadow: "0 2px 10px rgba(20,20,40,0.05)",
    display: "flex", flexDirection: "column", gap: 8, minHeight: 90,
  },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "var(--color-text)" },
  emptyText: { color: "var(--color-text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" },
  list: { display: "flex", flexDirection: "column", gap: 10, width: "100%" },
  row: {
    display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13,
    color: "var(--color-text-muted)", paddingBottom: 10, borderBottom: "1px solid var(--color-border)",
  },
  rowMain: { fontWeight: 700, color: "var(--color-text)" },
  rowMid: { flex: 1, marginLeft: 8, textTransform: "capitalize" },
  rowTime: { color: "var(--color-text-muted)", whiteSpace: "nowrap" },
  compactActionsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  compactActionBtn: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 8px",
    fontSize: 11, fontWeight: 600, color: "var(--color-text)", background: "#F6F5F1",
    border: "none", borderRadius: 12, cursor: "pointer", textAlign: "center",
  },
  compactActionIcon: { width: 16, height: 16, color: "var(--color-primary-dark)" },
  kpiCard: { display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 18, padding: 14, boxShadow: "0 2px 10px rgba(20,20,40,0.05)" },
  kpiIcon: { width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  kpiValue: { fontSize: 20, fontWeight: 800, color: "var(--color-text)" },
  kpiLabel: { fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 },
};