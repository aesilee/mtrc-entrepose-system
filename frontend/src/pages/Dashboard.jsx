import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABELS } from "../config/roles.js";
import api from "../api/axios.js";
import useViewport from "../hooks/useViewport.js";


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
      {user.role === "ict_admin" ? <IctAdminDashboard /> : <GenericDashboard user={user} />}
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
};