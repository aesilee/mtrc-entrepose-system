import { NavLink } from "react-router-dom";
import { ROLE_LABELS, NAV_BY_ROLE } from "../config/roles.js";

export default function Sidebar({ user }) {
  const items = NAV_BY_ROLE[user.role] || [];

  return (
    <aside style={styles.aside}>
      <div style={styles.brand}>
        <div style={styles.logoMark}>M</div>
        <div>
          <div style={styles.brandName}>MTRC</div>
          <div style={styles.brandSub}>Patient &amp; Case Monitoring</div>
        </div>
      </div>

      <nav style={styles.nav}>
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              ...styles.navItem,
              ...(isActive ? styles.navItemActive : {}),
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={styles.roleBadge}>{ROLE_LABELS[user.role]}</div>
    </aside>
  );
}

const styles = {
  aside: {
    width: 240,
    minHeight: "100vh",
    background: "var(--color-surface)",
    borderRight: "1px solid var(--color-border)",
    display: "flex",
    flexDirection: "column",
    padding: "20px 16px",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "4px 8px 24px",
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: "var(--radius-sm)",
    background: "var(--color-primary)",
    color: "#fff",
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    fontSize: 15,
    color: "var(--color-primary-dark)",
  },
  brandSub: {
    fontSize: 11,
    color: "var(--color-text-muted)",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flex: 1,
  },
  navItem: {
    textDecoration: "none",
    color: "var(--color-text)",
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    fontSize: 14,
    fontWeight: 500,
  },
  navItemActive: {
    background: "var(--color-primary-tint)",
    color: "var(--color-primary-dark)",
    fontWeight: 700,
  },
  roleBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--color-primary-dark)",
    background: "var(--color-primary-tint)",
    padding: "6px 10px",
    borderRadius: 999,
    textAlign: "center",
  },
};
