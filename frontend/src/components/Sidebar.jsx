import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ROLE_LABELS, NAV_BY_ROLE, FOOTER_NAV } from "../config/roles.js";

export default function Sidebar({ user }) {
  const items = NAV_BY_ROLE[user.role] || [];
  const location = useLocation();

  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    items.forEach((item) => {
      if (item.children?.some((c) => location.pathname.startsWith(c.path))) {
        initial[item.label] = true;
      }
    });
    return initial;
  });

  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

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
        {items.map((item) =>
          item.children ? (
            <div key={item.label} style={styles.group}>
              <button
                type="button"
                onClick={() => toggleGroup(item.label)}
                style={{
                  ...styles.navItem,
                  ...styles.groupHeader,
                  ...(item.children.some((c) => location.pathname.startsWith(c.path))
                    ? styles.navItemActive
                    : {}),
                }}
              >
                <span>{item.label}</span>
                <span
                  style={{
                    ...styles.chevron,
                    transform: openGroups[item.label] ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  ›
                </span>
              </button>

              {openGroups[item.label] && (
                <div style={styles.subNav}>
                  {item.children.map((child) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      style={({ isActive }) => ({
                        ...styles.subNavItem,
                        ...(isActive ? styles.navItemActive : {}),
                      })}
                    >
                      <span>{child.label}</span>
                      {child.badge && <span style={styles.badge}>{child.badge}</span>}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              })}
            >
              <span>{item.label}</span>
              {item.badge && <span style={styles.badge}>{item.badge}</span>}
            </NavLink>
          )
        )}
      </nav>

      <div style={styles.footerNav}>
        {FOOTER_NAV.map((item) => (
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
      </div>

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
    overflowY: "auto",
  },
  group: {
    display: "flex",
    flexDirection: "column",
  },
  groupHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  chevron: {
    display: "inline-block",
    transition: "transform 0.15s ease",
    fontSize: 14,
    color: "var(--color-text-muted)",
  },
  subNav: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    marginLeft: 12,
    paddingLeft: 10,
    borderLeft: "1px solid var(--color-border)",
  },
  subNavItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    textDecoration: "none",
    color: "var(--color-text)",
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    fontSize: 13,
    fontWeight: 500,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    textDecoration: "none",
    color: "var(--color-text)",
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    fontSize: 14,
    fontWeight: 500,
    fontFamily: "inherit",
    lineHeight: "inherit",
  },
  navItemActive: {
    background: "var(--color-primary-tint)",
    color: "var(--color-primary-dark)",
    fontWeight: 700,
  },
  badge: {
    fontSize: 10,
    fontWeight: 700,
    color: "var(--color-primary-dark)",
    background: "var(--color-primary-tint)",
    padding: "2px 6px",
    borderRadius: 999,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  footerNav: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    paddingTop: 10,
    marginTop: 10,
    borderTop: "1px solid var(--color-border)",
  },
  roleBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--color-primary-dark)",
    background: "var(--color-primary-tint)",
    padding: "6px 10px",
    borderRadius: 999,
    textAlign: "center",
    marginTop: 12,
  },
};