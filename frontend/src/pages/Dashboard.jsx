import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import { useAuth } from "../context/AuthContext.jsx";

import api from "../api/axios.js";
import { DonutChart, LineChart } from "../components/AnalyticsCharts.jsx";
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
  const statCols = isMobile ? 1 : isTablet ? 2 : 4;
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

const FLOATING_ACTION_CSS = `
  @keyframes floating-actions-enter {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .floating-actions-enter { animation: floating-actions-enter 180ms ease-out both; }
  .floating-action-button { transition: transform 150ms ease, background-color 150ms ease; }
  .floating-action-button:hover { transform: translateY(-2px); background: var(--color-primary-tint) !important; }
  @media (prefers-reduced-motion: reduce) {
    .floating-actions-enter { animation: none; }
    .floating-action-button { transition: none; }
  }
`;

const floatingActionStyles = {
  dock: {
    position: "fixed",
    zIndex: 50,
    minHeight: 78,
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxSizing: "border-box",
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "0 10px 30px rgba(18, 38, 29, 0.16)",
  },
  title: { width: 96, flexShrink: 0, color: "var(--color-text)", fontSize: 13, fontWeight: 800 },
  list: { display: "grid", gap: 8, flex: 1, minWidth: 0 },
  button: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minWidth: 0,
    minHeight: 56,
    padding: "7px 8px",
    background: "var(--color-primary-tint)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text)",
    textAlign: "center",
    cursor: "pointer",
  },
  icon: {
    width: 18,
    height: 18,
    color: "var(--color-primary-dark)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  label: { fontSize: 10.5, fontWeight: 700, lineHeight: 1.15 },
};

function CaseManagerDashboard() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useViewport();
  const isCompact = isMobile || isTablet;
  const kpiCols = isCompact ? 2 : 4;
  const primaryPanelHeight = isMobile ? 280 : 300;
  const patientsPanelHeight = isMobile ? 480 : 430;
  const overviewPanelHeight = isMobile ? 300 : 290;

  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientFilter, setPatientFilter] = useState("all");

  async function loadStats() {
    setLoadError("");
    try {
      const { data } = await api.get("/dashboard/case-manager-stats");
      setStats(data);
    } catch (err) {
      setLoadError(err.response?.data?.message || "Could not load the case manager dashboard.");
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  const statusOverview = [
    { key: "active", label: "Active", value: stats?.caseStatusOverview?.active || 0, color: "#2F855A", tint: "#D8F5E9" },
    { key: "followUp", label: "Follow-up", value: stats?.caseStatusOverview?.followUp || 0, color: "#B7791F", tint: "#FFF3D6" },
    { key: "completed", label: "Completed", value: stats?.caseStatusOverview?.completed || 0, color: "#2B6CB0", tint: "#E1F0FF" },
    { key: "dropped", label: "Dropped", value: stats?.caseStatusOverview?.dropped || 0, color: "#B3261E", tint: "#FDE2E2" },
    { key: "transferred", label: "Transferred", value: stats?.caseStatusOverview?.transferred || 0, color: "#5B3EC9", tint: "#EDEAFB" },
  ];
  const statusTotal = statusOverview.reduce((total, item) => total + Number(item.value), 0);

  const quickActions = [
    {
      key: "attendance",
      label: "Record Attendance",
      icon: <svg {...iconProps} width={18} height={18}><path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" /><path d="M9.5 12l2 2 3.5-3.5" /></svg>,
      onClick: () => navigate("/attendance"),
    },
    {
      key: "note",
      label: "Add Progress Note",
      icon: <svg {...iconProps} width={18} height={18}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M12 12v6M9 15h6" /></svg>,
      onClick: () => setNoteModalOpen(true),
    },
    {
      key: "patients",
      label: "View My Patients",
      icon: <svg {...iconProps} width={18} height={18}><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 9h6M9 13h6" /></svg>,
      onClick: () => navigate("/patients"),
    },
    {
      key: "followUp",
      label: "Follow-up Case",
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
    <div style={{
      ...cmStyles.page,
      paddingBottom: isMobile ? 104 : 110,
    }}>
      {loadError && (
        <div role="alert" style={cmStyles.errorBanner}>
          <span>{loadError}</span>
          <button type="button" style={cmStyles.retryBtn} onClick={loadStats}>Retry</button>
        </div>
      )}

      <div style={{ ...cmStyles.kpiRow, gridTemplateColumns: `repeat(${kpiCols}, 1fr)` }}>
        <CmKpiCard label="Assigned Patients" value={stats?.assignedPatients ?? "—"} icon={HIM_KPI_ICONS.patients} />
        <CmKpiCard label="Today's Sessions" value={stats?.todaysSessions ?? "—"} icon={HIM_KPI_ICONS.online} />
        <CmKpiCard label="Missed Sessions" value={stats?.missedSessions ?? "—"} icon={HIM_KPI_ICONS.auditLogs} />
        <CmKpiCard label="Follow-ups Needed" value={stats?.followUpsNeeded ?? "—"} icon={HIM_KPI_ICONS.reports} />
      </div>

      <div style={{ ...cmStyles.dashboardBody, gridTemplateColumns: "1fr" }}>
        <div style={cmStyles.dashboardMain}>

      <div style={{
        ...cmStyles.gridRow,
        gridTemplateColumns: isCompact ? "1fr" : "1.2fr 1fr",
      }}>
        <CmCard
          title="Patients Needing Attention"
          height={primaryPanelHeight}
          highlight
          headerAction={(
            <button type="button" style={cmStyles.viewAllBtn} onClick={() => navigate("/patients")}>View all →</button>
          )}
        >
          {!stats?.patientsNeedingAttention?.length ? (
            <div style={cmStyles.emptyText}>No patients need attention right now.</div>
          ) : (
            <div style={{ ...cmStyles.list, ...cmStyles.scrollArea }}>
              {stats.patientsNeedingAttention.map((p, i) => (
                <button
                  key={`${p.patient_id}-${p.issue}-${i}`}
                  type="button"
                  style={cmStyles.attentionRow}
                  onClick={() => navigate(`/patients/${p.patient_id}`)}
                >
                  <span style={cmStyles.patientAvatar}>{getInitials(p.full_name)}</span>
                  <span style={{ ...cmStyles.rowMain, flex: 1 }}>{p.full_name}</span>
                  <span style={cmStyles.issueBadge}>{p.issue}</span>
                  <span aria-hidden="true" style={cmStyles.rowChevron}>›</span>
                </button>
              ))}
            </div>
          )}
        </CmCard>

        <CmCard title="Today's Schedule" height={primaryPanelHeight}>
          {!stats?.todaysSchedule?.length ? (
            <div style={cmStyles.emptyText}>No sessions scheduled for today.</div>
          ) : (
            <div style={{ ...cmStyles.list, ...cmStyles.scrollArea }}>
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
          headerAction={(
            <button type="button" style={cmStyles.viewAllBtn} onClick={() => navigate("/patients")}>View all patients →</button>
          )}
        >
          {!recentPatients.length ? (
            <div style={cmStyles.emptyText}>No patients are assigned to you yet.</div>
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
                      style={{ ...cmStyles.patientFilterBtn, ...(selected ? cmStyles.patientFilterBtnActive : {}) }}
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
                        style={{ ...cmStyles.patientRow, ...(isMobile ? cmStyles.patientRowMobile : {}) }}
                        onClick={() => navigate(`/patients/${patient.id}`)}
                      >
                        {isMobile ? (
                          <>
                            <span style={cmStyles.patientAvatar}>{getInitials(patient.full_name)}</span>
                            <span style={cmStyles.patientIdentity}>
                              <span style={cmStyles.patientNameLine}>
                                <span style={cmStyles.rowMain}>{patient.full_name}</span>
                              </span>
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
                              <span style={cmStyles.patientAvatar}>{getInitials(patient.full_name)}</span>
                              <span style={cmStyles.patientIdentity}>
                                <span style={cmStyles.patientNameLine}>
                                  <span style={cmStyles.rowMain}>{patient.full_name}</span>
                                </span>
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
                Showing {filteredPatients.length} of {recentPatients.length} recent patients
              </div>
            </div>
          )}
        </CmCard>

        <CmCard title="Recent Progress Notes" height={patientsPanelHeight}>
          {!stats?.recentProgressNotes?.length ? (
            <div style={cmStyles.emptyText}>No progress notes yet.</div>
          ) : (
            <div style={{ ...cmStyles.list, ...cmStyles.scrollArea }}>
              {stats.recentProgressNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  style={cmStyles.progressNoteRow}
                  onClick={() => navigate(`/patients/${note.patient_id}`)}
                >
                  <span style={cmStyles.patientAvatar}>{getInitials(note.patient_name)}</span>
                  <span style={cmStyles.progressNoteContent}>
                    <span style={cmStyles.progressNotePatient}>{note.patient_name}</span>
                    <span style={cmStyles.progressNoteMeta}>
                      {note.session_type || note.note_type || "Progress note"}
                    </span>
                  </span>
                  <span style={cmStyles.rowTime}>{timeAgo(note.updated_at || note.created_at)}</span>
                  <span aria-hidden="true" style={cmStyles.rowChevron}>›</span>
                </button>
              ))}
            </div>
          )}
        </CmCard>
      </div>

      <div style={{ ...cmStyles.gridRow, gridTemplateColumns: isCompact ? "1fr" : "0.85fr 1.15fr" }}>
        <CmCard title="Case Status Overview" height={overviewPanelHeight}>
          <div style={{ ...cmStyles.statusOverview, ...cmStyles.scrollArea }}>
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

        <CmCard title="Recent Case Activity" height={overviewPanelHeight}>
          {!stats?.recentCaseActivity?.length ? (
            <div style={cmStyles.emptyText}>No recent case activity yet.</div>
          ) : (
            <div style={{ ...cmStyles.list, ...cmStyles.scrollArea }}>
              {stats.recentCaseActivity.map((activity) => (
                <button
                  key={activity.activity_id}
                  type="button"
                  style={cmStyles.activityRow}
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
        </div>
      </div>

      <FloatingQuickActions
        actions={quickActions}
        isMobile={isMobile}
        hideTitle={isCompact}
        maxWidth={960}
        ariaLabel="Case Manager quick actions"
      />

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

function FloatingQuickActions({ actions, isMobile, hideTitle = false, maxWidth, ariaLabel }) {
  return (
    <>
      <style>{FLOATING_ACTION_CSS}</style>
      <aside
      aria-label={ariaLabel}
      className="floating-actions-enter"
      style={{
        ...floatingActionStyles.dock,
        left: isMobile ? 16 : "calc(50% + 120px)",
        width: isMobile ? "calc(100% - 32px)" : "calc(100% - 304px)",
        maxWidth: isMobile ? "none" : maxWidth,
        bottom: isMobile ? 72 : 20,
        transform: isMobile ? "none" : "translateX(-50%)",
      }}
      >
        {!isMobile && !hideTitle && <div style={floatingActionStyles.title}>Quick Actions</div>}
        <div style={{ ...floatingActionStyles.list, gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}>
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              className="floating-action-button"
              style={floatingActionStyles.button}
              onClick={action.onClick}
            >
              <span style={floatingActionStyles.icon}>{action.icon}</span>
              <span style={floatingActionStyles.label}>{action.label}</span>
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}

function CmCard({ title, span, maxSpan, center, height, highlight, headerAction, children }) {
  const effectiveSpan = maxSpan ? Math.min(span, maxSpan) : span;
  return (
    <div style={{
      ...cmStyles.card,
      gridColumn: `span ${effectiveSpan}`,
      height,
      overflow: "hidden",
      borderColor: highlight ? "var(--color-primary)" : "var(--color-border)",
    }}>
      <div style={cmStyles.cardHeader}>
        <div style={cmStyles.cardTitle}>{title}</div>
        {headerAction}
      </div>
      <div style={{ ...cmStyles.cardBody, justifyContent: center ? "center" : "flex-start" }}>
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
  const kpiCols = isCompact ? 2 : 4;
  const mainPanelHeight = isMobile ? 300 : 286;
  const insightPanelHeight = isMobile ? 290 : 258;
  const activityPanelHeight = isMobile ? 260 : 210;

  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState("");

  async function loadStats() {
    setLoadError("");
    try {
      const { data } = await api.get("/dashboard/admitting-stats");
      setStats(data);
    } catch (err) {
      setLoadError(err.response?.data?.message || "Could not load the admitting dashboard.");
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
    {
      key: "certificate",
      label: "Generate Certificate",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
          <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
      ),
      onClick: () => navigate("/certificates"),
    },
  ];

  const registrationSegments = [
    { key: "newRegistrations", label: "New registrations", color: "#2F80ED" },
    { key: "completed", label: "Completed", color: "#27AE60" },
    { key: "pending", label: "Pending", color: "#F2C94C" },
    { key: "incomplete", label: "Incomplete", color: "#EB5757" },
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
    <div style={{ ...apStyles.page, paddingBottom: isMobile ? 104 : 110 }}>
      {loadError && (
        <div role="alert" style={apStyles.errorBanner}>
          <span>{loadError}</span>
          <button type="button" style={apStyles.retryBtn} onClick={loadStats}>Retry</button>
        </div>
      )}

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

      <div style={{ ...apStyles.gridRow, gridTemplateColumns: isCompact ? "1fr" : "1.35fr 0.85fr" }}>
        <div style={{ ...apStyles.card, height: mainPanelHeight, overflow: "hidden" }}>
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

        <div style={{ ...apStyles.card, height: mainPanelHeight, overflow: "hidden" }}>
          <div style={apStyles.cardHeader}>
            <span style={apStyles.cardTitle}>Incomplete Records</span>
            {!!stats?.incompleteRecords?.length && (
              <span style={apStyles.warnBadge}>{stats.incompleteRecords.length} pending</span>
            )}
          </div>

          {!stats?.incompleteRecords?.length ? (
            <div style={apStyles.emptyText}>All registered patients have complete records.</div>
          ) : (
            <div style={{ ...apStyles.list, ...apStyles.scrollArea }}>
              {stats.incompleteRecords.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  style={apStyles.incompleteRow}
                  onClick={() => navigate(`/patients/${p.id}`)}
                >
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

      <div style={apStyles.compactInsights}>
        <div style={{ ...apStyles.gridRow, gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)" }}>
          <div style={{ ...apStyles.card, height: insightPanelHeight, overflow: "hidden" }}>
            <div style={apStyles.cardHeader}>
              <span style={apStyles.cardTitle}>Pending Registrations</span>
              {!!stats?.pendingRegistrationRecords?.length && (
                <span style={apStyles.warnBadge}>{stats.pendingRegistrations} pending</span>
              )}
            </div>

            {!stats?.pendingRegistrationRecords?.length ? (
              <div style={apStyles.emptyText}>No registrations are waiting for completion.</div>
            ) : (
              <div style={{ ...apStyles.pendingList, ...apStyles.scrollArea }}>
                {stats.pendingRegistrationRecords.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    style={apStyles.pendingRow}
                    onClick={() => navigate(`/patients/${patient.id}`)}
                  >
                    <span style={apStyles.pendingAvatar}>{getInitials(patient.full_name)}</span>
                    <span style={apStyles.pendingIdentity}>
                      <span style={apStyles.pendingName}>{patient.full_name}</span>
                      <span style={apStyles.pendingMeta}>
                        {patient.patient_code} · {fmtShortDate(patient.admission_date || patient.created_at)}
                      </span>
                    </span>
                    <span aria-hidden="true" style={apStyles.pendingChevron}>›</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...apStyles.card, height: insightPanelHeight, overflow: "hidden" }}>
            <div style={apStyles.cardTitle}>Registration Process</div>
            <div style={{ ...apStyles.processContent, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 16 }}>
              <div
                style={{ ...apStyles.donut, width: isMobile ? 126 : 136, height: isMobile ? 126 : 136, background: processChart }}
                aria-label="Registration process chart"
              >
                <div style={apStyles.donutCenter}>
                  <strong style={apStyles.donutValue}>{stats?.totalPatients ?? 0}</strong>
                  <span style={apStyles.donutLabel}>patients</span>
                </div>
              </div>
              <div style={{ ...apStyles.processLegend, width: isMobile ? "100%" : "auto", display: isMobile ? "grid" : "flex", gridTemplateColumns: isMobile ? "1fr 1fr" : undefined }}>
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
        </div>

        <div style={{ ...apStyles.card, ...apStyles.activityCard, height: activityPanelHeight, overflow: "hidden" }}>
          <div style={apStyles.cardTitle}>Today's Admission Activity</div>
          {!stats?.todayAdmissionActivity?.length ? (
            <div style={apStyles.emptyText}>No admission activity recorded today.</div>
          ) : (
            <div style={{ ...apStyles.timeline, ...apStyles.scrollArea }}>
              {stats.todayAdmissionActivity.map((activity, index) => (
                <button
                  key={activity.activity_id}
                  type="button"
                  style={apStyles.timelineRow}
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

      <FloatingQuickActions
        actions={quickActions}
        isMobile={isMobile}
        hideTitle={isCompact}
        maxWidth={860}
        ariaLabel="Admitting quick actions"
      />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isCaseManager = user.role === "case_manager";
  const isAdmitting = user.role === "admitting";

  return (
    <AppShell
      title={isCaseManager ? "Case Manager Dashboard" : isAdmitting ? "Admitting Dashboard" : "Dashboard"}
      description={isCaseManager
        ? "Assigned patients, today's schedule, and recent case activity."
        : isAdmitting
          ? "Patient registrations, record completion, and today's admission activity."
          : "Overview of enrollment, attendance, and program activity."}
    >
      {user.role === "ict_admin" ? (
        <IctAdminDashboard />
      ) : user.role === "him_staff" ? (
        <HimStaffDashboard />
      ) : isCaseManager ? (
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

const cmStyles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    width: "100%",
    maxWidth: 1440,
    margin: "0 auto",
    boxSizing: "border-box",
  },
  kpiRow: { display: "grid", gap: 16, width: "100%" },
  dashboardBody: { display: "grid", gap: 16, alignItems: "start", width: "100%", minWidth: 0, transition: "grid-template-columns 180ms ease" },
  dashboardMain: { display: "flex", flexDirection: "column", gap: 16, width: "100%", minWidth: 0 },
  gridRow: { display: "grid", gap: 16, alignItems: "stretch", width: "100%" },
  fullWidthRow: { width: "100%", maxWidth: 1080 },
  patientNotesRow: { display: "grid", gap: 16, alignItems: "stretch", width: "100%", minWidth: 0 },
  card: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 90,
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
  },
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minWidth: 0 },
  cardTitle: { fontSize: 14, fontWeight: 700, color: "var(--color-text)" },
  cardBody: {
    display: "flex",
    alignItems: "stretch",
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: "100%",
  },
  emptyText: { color: "var(--color-text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0", width: "100%" },
  list: { display: "flex", flexDirection: "column", gap: 10, width: "100%", minWidth: 0 },
  scrollArea: { flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 6 },
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
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    fontSize: 13,
    color: "var(--color-text-muted)",
    paddingBottom: 10,
    borderBottom: "1px solid var(--color-border)",
  },
  rowMain: {
    fontWeight: 700,
    color: "var(--color-text)",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
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
    minHeight: 46,
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
    padding: "8px 0 10px",
    borderBottom: "1px solid var(--color-border)",
    minHeight: 48,
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
  scheduleTime: {
    fontWeight: 700,
    fontSize: 13,
    color: "var(--color-primary-dark)",
    minWidth: 72,
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
  patientNameLine: { display: "flex", alignItems: "center", gap: 7, minWidth: 0 },
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
  progressNoteMeta: { color: "var(--color-text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
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
  statusFill: { height: "100%", minWidth: 0, borderRadius: 999, transition: "width 0.25s ease" },
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
  kpiCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "16px 18px",
    height: 86,
    minWidth: 0,
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
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    width: "100%",
    maxWidth: 1680,
    margin: "0 auto",
    boxSizing: "border-box",
  },
  kpiRow: { display: "grid", gap: 14, width: "100%" },
  gridRow: { display: "grid", gap: 14, alignItems: "stretch", width: "100%" },
  compactInsights: { display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 1320, marginRight: "auto" },
  activityCard: { maxWidth: 920, marginRight: "auto" },
  card: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minHeight: 100,
    minWidth: 0,
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
  emptyText: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: 13, textAlign: "center", padding: "12px 0" },
  list: { display: "flex", flexDirection: "column", gap: 0, width: "100%", minWidth: 0 },
  scrollArea: { flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 6 },
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
  kpiCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "14px 16px",
    height: 80,
    minWidth: 0,
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

  tableWrap: { flex: 1, minHeight: 0, overflow: "auto", width: "100%" },
  table: { width: "100%", minWidth: 620, borderCollapse: "collapse", fontSize: 13 },
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
    background: "#FFF3D6",
    color: "#9A6B00",
    whiteSpace: "nowrap",
  },
  pendingList: { display: "flex", flexDirection: "column", width: "100%", minWidth: 0 },
  pendingRow: {
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
  pendingAvatar: {
    width: 36,
    height: 36,
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
  pendingIdentity: { display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 },
  pendingName: { color: "var(--color-text)", fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  pendingMeta: { color: "var(--color-text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
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
  incompletePatient: { minWidth: 0, flex: 1 },
  incompleteRowName: { fontSize: 13, fontWeight: 600, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  incompleteRowCode: { fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 },
  missingTag: {
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: 999,
    background: "#FDE2E2",
    color: "#B3261E",
    maxWidth: "45%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "center",
    flexShrink: 0,
  },
  processContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-evenly",
    gap: 20,
    flex: 1,
    minHeight: 0,
  },
  donut: {
    position: "relative",
    width: 142,
    height: 142,
    borderRadius: "50%",
    flexShrink: 0,
  },
  donutCenter: {
    position: "absolute",
    inset: 22,
    borderRadius: "50%",
    background: "var(--color-surface)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  donutValue: { fontSize: 22, color: "var(--color-text)", lineHeight: 1 },
  donutLabel: { fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 },
  processLegend: { display: "flex", flexDirection: "column", gap: 10, minWidth: 150 },
  legendRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 12 },
  legendDot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  legendLabel: { color: "var(--color-text-muted)", flex: 1 },
  legendValue: { color: "var(--color-text)", fontSize: 13 },
  timeline: { display: "flex", flexDirection: "column", width: "100%", minWidth: 0 },
  timelineRow: {
    display: "flex",
    alignItems: "stretch",
    gap: 10,
    width: "100%",
    minHeight: 50,
    padding: 0,
    background: "none",
    border: "none",
    color: "inherit",
    textAlign: "left",
    cursor: "pointer",
    flexShrink: 0,
  },
  timelineTrack: { position: "relative", width: 12, flexShrink: 0, display: "flex", justifyContent: "center" },
  timelineDot: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    background: "var(--color-primary)",
    marginTop: 5,
    zIndex: 1,
  },
  timelineLine: {
    position: "absolute",
    top: 14,
    bottom: 0,
    width: 1,
    background: "var(--color-border)",
  },
  timelineBody: { display: "flex", flexDirection: "column", minWidth: 0, flex: 1, paddingBottom: 12 },
  timelineTitle: { fontSize: 13, fontWeight: 650, color: "var(--color-text)" },
  timelinePatient: {
    fontSize: 11,
    color: "var(--color-text-muted)",
    marginTop: 3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  timelineTime: { fontSize: 11, color: "var(--color-text-muted)", whiteSpace: "nowrap", paddingRight: 2 },
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
