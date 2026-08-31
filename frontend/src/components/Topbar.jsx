import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import NotificationBell from "./NotificationBell.jsx";
import { NAV_BY_ROLE, FOOTER_NAV } from "../config/roles.js";

function getNavItems(role) {
  const items = NAV_BY_ROLE[role] || [];
  const flat = [];
  items.forEach((item) => {
    if (item.path) flat.push({ label: item.label, path: item.path });
    if (item.children) item.children.forEach((c) => c.path && flat.push({ label: c.label, path: c.path }));
  });
  FOOTER_NAV.forEach((item) => item.path && flat.push({ label: item.label, path: item.path }));
  return flat;
}

// Finds the nearest ancestor nav item for the current path (e.g. /patients/123
// -> "Patients" at /patients) instead of always pointing back to Dashboard.
function getBreadcrumbParent(role, pathname) {
  const navItems = getNavItems(role);
  const isTopLevelPage = navItems.some((item) => item.path === pathname);
  if (isTopLevelPage || pathname === "/dashboard") return null;

  const match = navItems
    .filter((item) => item.path !== "/dashboard" && pathname.startsWith(item.path + "/"))
    .sort((a, b) => b.path.length - a.path.length)[0];

  return match || { label: "Dashboard", path: "/dashboard" };
}

export default function Topbar({ title, description }) {
  const { user } = useAuth();
  const location = useLocation();

  const breadcrumbParent = getBreadcrumbParent(user?.role, location.pathname);

  return (
    <header style={styles.header}>
      <div style={{ minWidth: 0 }}>
        {breadcrumbParent ? (
          <h1 style={styles.title}>
            <Link to={breadcrumbParent.path} style={styles.breadcrumbLink}>{breadcrumbParent.label}</Link>
            <span style={styles.breadcrumbSep}> / </span>
            <span>{title}</span>
          </h1>
        ) : (
          <h1 style={styles.title}>{title}</h1>
        )}
        {description && <p style={styles.description}>{description}</p>}
      </div>
      <div style={styles.right}>
        {(user?.role === "ict_admin" || user?.role === "him_staff" || user?.role === "case_manager" || user?.role === "admitting") && <NotificationBell />}
      </div>
    </header>
  );
}

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 32px",
    borderBottom: "1px solid var(--color-border)",
    background: "var(--color-bg)",
  },
  title: {
    fontSize: 20,
    fontWeight: 800,
    margin: 0,
  },
  breadcrumbLink: {
    color: "var(--color-text-muted)",
    textDecoration: "none",
    fontWeight: 600,
  },
  breadcrumbSep: {
    color: "var(--color-text-muted)",
    fontWeight: 600,
  },
  menuBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    flexShrink: 0,
    background: "none",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text)",
    cursor: "pointer",
  },
  description: {
    fontSize: 13,
    color: "var(--color-text-muted)",
    marginTop: 2,
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  logoutBtn: {
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    padding: "8px 14px",
    borderRadius: "var(--radius-sm)",
    fontSize: 13,
    fontWeight: 600,
  },
};