import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import { ROLE_LABELS, NAV_BY_ROLE, FOOTER_NAV } from "../config/roles.js";
import useViewport from "../hooks/useViewport.js";
import useOrgSettings from "../hooks/useOrgSettings.js";

const NAV_ICONS = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  patients: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.5 2.9-6 5.5-6s5.5 2.5 5.5 6" />
      <circle cx="17" cy="8" r="2.6" />
      <path d="M15.5 14.2c2.4.3 4.5 2.6 4.5 5.8" />
    </svg>
  ),
  attendance: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
      <path d="M8.5 15l2 2 4-4" />
    </svg>
  ),
  caseManagement: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <rect x="9" y="2.3" width="6" height="3.4" rx="1" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10" />
      <path d="M11 20V4" />
      <path d="M18 20v-7" />
      <path d="M3 20h18" />
    </svg>
  ),
  certificates: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5" />
      <path d="M8.5 12.5L7 21l5-3 5 3-1.5-8.5" />
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 6h6v6" />
    </svg>
  ),
  administration: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" />
      <path d="M9.5 12l2 2 3.5-3.5" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.5 19c1-2.5 3.2-4 5.5-4s4.5 1.5 5.5 4" />
    </svg>
  ),
};

const HOVER_STYLES = (
  <style>{`
    .mtrc-nav-item {
      background: transparent;
    }
    .mtrc-nav-item:hover {
      background: var(--color-primary-tint);
      color: var(--color-primary-dark);
    }
    .mtrc-nav-item:hover .mtrc-nav-icon {
      color: var(--color-primary-dark);
    }
  `}</style>
);

function NavTooltip({ label, show, children }) {
  const [hover, setHover] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef(null);

  const handleEnter = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setCoords({ top: rect.top + rect.height / 2, left: rect.right + 12 });
    }
    setHover(true);
  };

  return (
    <div ref={wrapperRef} style={styles.tooltipWrapper} onMouseEnter={handleEnter} onMouseLeave={() => setHover(false)}>
      {children}
      {show &&
        hover &&
        createPortal(
          <div style={{ ...styles.tooltip, top: coords.top, left: coords.left }}>{label}</div>,
          document.body
        )}
    </div>
  );
}

function GroupFlyout({ label, groupItem }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef(null);
  const closeTimer = useRef(null);

  const openFlyout = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setCoords({ top: rect.top, left: rect.right + 12 });
    }
    setOpen(true);
  };
  const scheduleClose = () => { closeTimer.current = setTimeout(() => setOpen(false), 150); };

  return (
    <div ref={wrapperRef} style={styles.tooltipWrapper} onMouseEnter={openFlyout} onMouseLeave={scheduleClose}>
      <button type="button" className="mtrc-nav-item" style={{ ...styles.navItem, ...styles.groupHeader, ...styles.navItemCollapsed }}>
        <span className="mtrc-nav-icon" style={styles.navIcon}>{NAV_ICONS[groupItem.icon]}</span>
      </button>
      {open &&
        createPortal(
          <div style={{ ...styles.flyoutPanel, top: coords.top, left: coords.left }} onMouseEnter={openFlyout} onMouseLeave={scheduleClose}>
            <div style={styles.flyoutHeader}>{label}</div>
            {groupItem.children.map((child) => (
              <NavLink
                key={child.path}
                to={child.path}
                end
                className="mtrc-nav-item"
                style={({ isActive }) => ({ ...styles.flyoutItem, ...(isActive ? styles.navItemActive : {}) })}
                onClick={() => setOpen(false)}
              >
                <span>{child.label}</span>
                {child.badge && <span style={styles.badge}>{child.badge}</span>}
              </NavLink>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

// ---- Mobile: bottom navigation bar ----
function BottomBar({ user }) {
  const items = NAV_BY_ROLE[user.role] || [];
  const location = useLocation();
  const [sheetItem, setSheetItem] = useState(null);
  const allItems = [...items, ...FOOTER_NAV];

  return (
    <>
      <nav style={styles.bottomBar}>
        {allItems.map((item) =>
          item.children ? (
            <button
              key={item.label}
              type="button"
              style={{
                ...styles.bottomBarItem,
                ...(item.children.some((c) => location.pathname.startsWith(c.path)) ? styles.bottomBarItemActive : {}),
              }}
              onClick={() => setSheetItem(item)}
            >
              <span style={styles.bottomBarIcon}>{NAV_ICONS[item.icon]}</span>
              <span style={styles.bottomBarLabel}>{item.label}</span>
            </button>
          ) : (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                ...styles.bottomBarItem,
                ...(isActive ? styles.bottomBarItemActive : {}),
              })}
            >
              <span style={styles.bottomBarIcon}>{NAV_ICONS[item.icon]}</span>
              <span style={styles.bottomBarLabel}>{item.label}</span>
            </NavLink>
          )
        )}
      </nav>

      {sheetItem &&
        createPortal(
          <div style={styles.sheetBackdrop} onClick={() => setSheetItem(null)}>
            <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
              <div style={styles.sheetHandle} />
              <div style={styles.sheetTitle}>{sheetItem.label}</div>
              {sheetItem.children.map((child) => (
                <NavLink
                  key={child.path}
                  to={child.path}
                  end
                  className="mtrc-nav-item"
                  style={({ isActive }) => ({ ...styles.sheetItem, ...(isActive ? styles.navItemActive : {}) })}
                  onClick={() => setSheetItem(null)}
                >
                  <span>{child.label}</span>
                  {child.badge && <span style={styles.badge}>{child.badge}</span>}
                </NavLink>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default function Sidebar({ user }) {
  const { isMobile } = useViewport();
  const items = NAV_BY_ROLE[user.role] || [];
  const location = useLocation();
  const org = useOrgSettings();
  const [collapsed, setCollapsed] = useState(
    () => sessionStorage.getItem("mtrc-sidebar-collapsed") === "true"
  );
  const setCollapsedPersisted = (value) => {
    setCollapsed((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      sessionStorage.setItem("mtrc-sidebar-collapsed", String(next));
      return next;
    });
  };

  const [openGroups, setOpenGroups] = useState(() => {
    let stored = null;
    try {
      stored = JSON.parse(sessionStorage.getItem("mtrc-sidebar-open-groups"));
    } catch {
      stored = null;
    }
    const initial = stored && typeof stored === "object" ? stored : {};
    items.forEach((item) => {
      if (item.children?.some((c) => location.pathname.startsWith(c.path))) {
        initial[item.label] = true;
      }
    });
    return initial;
  });

  const persistOpenGroups = (next) => {
    sessionStorage.setItem("mtrc-sidebar-open-groups", JSON.stringify(next));
  };

  const toggleGroup = (label) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      persistOpenGroups(next);
      return next;
    });
  };

  if (isMobile) {
    return <BottomBar user={user} />;
  }

  return (
    <aside
      style={{
        ...styles.aside,
        width: collapsed ? 72 : 240,
        padding: collapsed ? "20px 12px" : "20px 16px",
      }}
    >
      {HOVER_STYLES}
      <div
        style={{
          ...styles.brand,
          flexDirection: collapsed ? "column" : "row",
          justifyContent: collapsed ? "center" : "space-between",
        }}
      >
        {org?.organization_logo ? (
  <img src={org.organization_logo} alt="Organization logo" style={styles.logoMark} />
) : (
  <div style={styles.logoMark}>M</div>
)}

        {!collapsed && (
          <div style={styles.brandText}>
            <div style={styles.brandName}>MTRC</div>
            <div style={styles.brandSub}>Patient &amp; Case Monitoring</div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCollapsedPersisted((prev) => !prev)}
          style={{ ...styles.collapseBtn, marginTop: collapsed ? 10 : 0 }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <line x1="15" y1="4" x2="15" y2="20" />
              <rect x="15.8" y="5" width="4.2" height="14" rx="1.2" fill="currentColor" stroke="none" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <line x1="9" y1="4" x2="9" y2="20" />
              <rect x="4" y="5" width="4.2" height="14" rx="1.2" fill="currentColor" stroke="none" />
            </svg>
          )}
        </button>
      </div>

      <nav style={styles.nav}>
        {items.map((item) =>
          item.children ? (
            <div key={item.label} style={styles.group}>
              {collapsed ? (
                <GroupFlyout label={item.label} groupItem={item} />
              ) : (
                <button
                  type="button"
                  className="mtrc-nav-item"
                  onClick={() => toggleGroup(item.label)}
                  style={{
                    ...styles.navItem,
                    ...styles.groupHeader,
                    ...(item.children.some((c) => location.pathname.startsWith(c.path)) ? styles.navItemActive : {}),
                  }}
                >
                  <span className="mtrc-nav-icon" style={styles.navIcon}>{NAV_ICONS[item.icon]}</span>
                  <span style={styles.navLabel}>{item.label}</span>
                  <span style={{ ...styles.chevron, transform: openGroups[item.label] ? "rotate(90deg)" : "rotate(0deg)" }}>
                    ›
                  </span>
                </button>
              )}

              {!collapsed && openGroups[item.label] && (
                <div style={styles.subNav}>
                  {item.children.map((child) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      end
                      className="mtrc-nav-item"
                      style={({ isActive }) => ({ ...styles.subNavItem, ...(isActive ? styles.navItemActive : {}) })}
                    >
                      <span>{child.label}</span>
                      {child.badge && <span style={styles.badge}>{child.badge}</span>}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NavTooltip key={item.path} label={item.label} show={collapsed}>
              <NavLink
                to={item.path}
                className="mtrc-nav-item"
                style={({ isActive }) => ({
                  ...styles.navItem,
                  ...(collapsed ? styles.navItemCollapsed : {}),
                  ...(isActive ? styles.navItemActive : {}),
                })}
              >
                <span className="mtrc-nav-icon" style={styles.navIcon}>{NAV_ICONS[item.icon]}</span>
                {!collapsed && <span style={styles.navLabel}>{item.label}</span>}
                {item.badge && !collapsed && <span style={styles.badge}>{item.badge}</span>}
              </NavLink>
            </NavTooltip>
          )
        )}
      </nav>

      <div style={styles.footerNav}>
        {FOOTER_NAV.map((item) => (
          <NavTooltip key={item.path} label={item.label} show={collapsed}>
            <NavLink
              to={item.path}
              className="mtrc-nav-item"
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(collapsed ? styles.navItemCollapsed : {}),
                ...(isActive ? styles.navItemActive : {}),
              })}
            >
              <span className="mtrc-nav-icon" style={styles.navIcon}>{NAV_ICONS[item.icon]}</span>
              {!collapsed && <span style={styles.navLabel}>{item.label}</span>}
            </NavLink>
          </NavTooltip>
        ))}
      </div>

      {!collapsed && <div style={styles.roleBadge}>{ROLE_LABELS[user.role]}</div>}
    </aside>
  );
}

const styles = {
  aside: {
    minHeight: "100vh",
    background: "var(--color-surface)",
    borderRight: "1px solid var(--color-border)",
    display: "flex",
    flexDirection: "column",
    padding: "20px 16px",
    transition: "width 0.25s ease, padding 0.25s ease",
  },
  brand: { display: "flex", alignItems: "center", gap: 8, padding: "4px 4px 24px" },
  brandText: { overflow: "hidden", whiteSpace: "nowrap" },
  collapseBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22,
    border: "none", background: "transparent", padding: 0, color: "var(--color-text-muted)", cursor: "pointer", flexShrink: 0,
  },
  logoMark: {
  width: 34, height: 34, borderRadius: "var(--radius-sm)", background: "var(--color-primary)", color: "#fff",
  fontFamily: "var(--font-display)", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  objectFit: "contain",
},
  brandName: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--color-primary-dark)" },
  brandSub: { fontSize: 11, color: "var(--color-text-muted)" },
  nav: { display: "flex", flexDirection: "column", gap: 2, flex: 1, overflowY: "auto" },
  group: { display: "flex", flexDirection: "column" },
  groupHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", border: "none", cursor: "pointer", textAlign: "left" },
  chevron: { display: "inline-block", transition: "transform 0.15s ease", fontSize: 14, color: "var(--color-text-muted)" },
  subNav: { display: "flex", flexDirection: "column", gap: 1, marginLeft: 12, paddingLeft: 10, borderLeft: "1px solid var(--color-border)" },
  subNavItem: {
    display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none",
    color: "var(--color-text)", padding: "8px 12px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 500,
  },
  navItem: {
    display: "flex", alignItems: "center", textDecoration: "none", color: "var(--color-text)",
    padding: "10px 12px", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 500,
    transition: "background 0.15s ease, color 0.15s ease, padding 0.2s ease",
    width: "100%",
  },
  navItemCollapsed: { justifyContent: "center", alignItems: "center", padding: "10px 0", width: "100%" },
  navIcon: { display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, flexShrink: 0 },
  navLabel: { flex: 1, overflow: "hidden", whiteSpace: "nowrap", marginLeft: 10 },
  tooltip: {
    position: "fixed", transform: "translateY(-50%)", background: "var(--color-primary-dark)", color: "#fff",
    fontSize: 12, fontWeight: 600, padding: "6px 10px", borderRadius: "var(--radius-sm)", whiteSpace: "nowrap",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 9999, pointerEvents: "none",
  },
  tooltipWrapper: { position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%" },
  flyoutPanel: {
    position: "fixed", minWidth: 200, background: "var(--color-surface)", border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md, 10px)", boxShadow: "0 10px 28px rgba(0,0,0,0.2)", padding: 8,
    display: "flex", flexDirection: "column", gap: 2, zIndex: 9999,
  },
  flyoutHeader: { fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4, padding: "4px 10px 8px" },
  flyoutItem: {
    display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none",
    color: "var(--color-text)", padding: "8px 10px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 500,
  },
  navItemActive: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", fontWeight: 700 },
  badge: {
    fontSize: 10, fontWeight: 700, color: "var(--color-primary-dark)", background: "var(--color-primary-tint)",
    padding: "2px 6px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.3,
  },
  footerNav: { display: "flex", flexDirection: "column", gap: 2, paddingTop: 10, marginTop: 10, borderTop: "1px solid var(--color-border)" },
  roleBadge: {
    fontSize: 11, fontWeight: 600, color: "var(--color-primary-dark)", background: "var(--color-primary-tint)",
    padding: "6px 10px", borderRadius: 999, textAlign: "center", marginTop: 12,
  },

  // ---- Bottom bar (mobile) ----
  bottomBar: {
    position: "fixed", bottom: 0, left: 0, right: 0, height: 64,
    background: "var(--color-surface)", borderTop: "1px solid var(--color-border)",
    display: "flex", alignItems: "stretch", justifyContent: "space-around",
    zIndex: 200, overflowX: "auto",
  },
  bottomBarItem: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
    flex: 1, minWidth: 56, textDecoration: "none", color: "var(--color-text-muted)",
    border: "none", background: "none", cursor: "pointer", padding: "6px 2px",
  },
  bottomBarItemActive: { color: "var(--color-primary-dark)" },
  bottomBarIcon: { width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" },
  bottomBarLabel: { fontSize: 9.5, fontWeight: 600, textAlign: "center", lineHeight: 1.1 },

  sheetBackdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300, display: "flex", alignItems: "flex-end" },
  sheet: {
    width: "100%", background: "var(--color-surface)", borderRadius: "18px 18px 0 0",
    padding: "10px 16px 20px", display: "flex", flexDirection: "column", gap: 4,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 999, background: "var(--color-border)", alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontSize: 13, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 },
  sheetItem: {
    display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none",
    color: "var(--color-text)", padding: "12px 10px", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 500,
  },
};