import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import NotificationBell from "./NotificationBell.jsx";
import { NAV_BY_ROLE, FOOTER_NAV, ROLE_LABELS } from "../config/roles.js";

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

function getInitials(name) {
  return (
    String(name || "U")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "U"
  );
}

export default function Topbar({ title, description }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const menuWrapRef = useRef(null);

  const breadcrumbParent = getBreadcrumbParent(user?.role, location.pathname);
  const displayName = user?.fullName || user?.username || "Staff Member";
  const initials = getInitials(displayName);
  const roleLabel = user?.role ? (ROLE_LABELS[user.role] || user.role) : "Staff";
  const displayEmail = user?.email || (user?.username ? `@${user.username}` : "");

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleLogout() {
    logout();
    setLogoutConfirmOpen(false);
    navigate("/login");
  }

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
        {(user?.role === "ict_admin" || user?.role === "him_staff" || user?.role === "case_manager" || user?.role === "admitting") && (
          <NotificationBell />
        )}

        {/* Profile Dropdown Container */}
        <div ref={menuWrapRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            style={{
              ...styles.userChip,
              background: menuOpen ? "#FFFFFF" : "rgba(255, 255, 255, 0.85)",
              borderColor: menuOpen ? "#26653B" : "rgba(115, 158, 130, 0.35)",
              boxShadow: menuOpen ? "0 4px 14px rgba(38, 101, 59, 0.14)" : "0 1px 4px rgba(0,0,0,0.04)",
            }}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            title="User account menu"
          >
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt={displayName} style={styles.userAvatarImg} />
            ) : (
              <span style={styles.userAvatarBadge}>{initials}</span>
            )}
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                color: menuOpen ? "#26653B" : "#476A30",
                transition: "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
                transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {/* Profile Dropdown Panel */}
          {menuOpen && (
            <div style={styles.dropdownMenu}>
              {/* User Identity Header */}
              <div style={styles.dropdownHeader}>
                {user?.photoUrl ? (
                  <img src={user.photoUrl} alt={displayName} style={styles.dropdownAvatarImg} />
                ) : (
                  <span style={styles.dropdownAvatarBadge}>{initials}</span>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={styles.dropdownName} title={displayName}>
                    {displayName}
                  </div>
                  <div style={styles.dropdownRoleBadge}>
                    {roleLabel}
                  </div>
                  {displayEmail && (
                    <div style={styles.dropdownEmail} title={displayEmail}>
                      {displayEmail}
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.dropdownDivider} />

              {/* Actions List */}
              <div style={styles.dropdownList}>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/profile");
                  }}
                  style={styles.dropdownItem}
                >
                  <span style={styles.dropdownItemIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <div style={styles.dropdownItemTitle}>My Profile</div>
                    <div style={styles.dropdownItemSub}>Account &amp; personal details</div>
                  </div>
                </button>

                {user?.role === "ict_admin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/settings");
                    }}
                    style={styles.dropdownItem}
                  >
                    <span style={styles.dropdownItemIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    </span>
                    <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                      <div style={styles.dropdownItemTitle}>System Settings</div>
                      <div style={styles.dropdownItemSub}>Platform configuration</div>
                    </div>
                  </button>
                )}

                {(user?.role === "ict_admin" || user?.role === "him_staff" || user?.role === "case_manager") && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/settings/archives");
                    }}
                    style={styles.dropdownItem}
                  >
                    <span style={styles.dropdownItemIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                        <path d="M21 8H3v13h18V8z" />
                        <path d="M1 3h22v5H1z" />
                        <line x1="10" y1="12" x2="14" y2="12" />
                      </svg>
                    </span>
                    <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                      <div style={styles.dropdownItemTitle}>Archives</div>
                      <div style={styles.dropdownItemSub}>Archived records &amp; history</div>
                    </div>
                  </button>
                )}
              </div>

              <div style={styles.dropdownDivider} />

              {/* Logout Option */}
              <div style={{ padding: "6px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setLogoutConfirmOpen(true);
                  }}
                  style={styles.dropdownLogoutBtn}
                >
                  <span style={styles.dropdownLogoutIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </span>
                  <span style={styles.dropdownLogoutText}>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {logoutConfirmOpen &&
        createPortal(
          <div style={styles.confirmOverlay} onClick={() => setLogoutConfirmOpen(false)}>
            <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.confirmHeader}>Log out</div>
              <div style={styles.confirmText}>Are you sure you want to log out of the MTRC System?</div>

              <div style={styles.confirmUserBox}>
                <div style={styles.confirmAvatar}>{(displayName || "U").charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.confirmUserName}>{displayName}</div>
                  <div style={styles.confirmUserRole}>{roleLabel}</div>
                </div>
              </div>

              <div style={styles.confirmActions}>
                <button type="button" style={styles.confirmCancelBtn} onClick={() => setLogoutConfirmOpen(false)}>
                  Cancel
                </button>
                <button type="button" style={styles.confirmLogoutBtn} onClick={handleLogout}>
                  Log out
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 30px 14px",
    borderBottom: "1px solid rgba(53, 118, 72, 0.10)",
    background: "transparent",
    position: "relative",
    zIndex: 20,
  },
  title: {
    fontSize: 21,
    fontWeight: 800,
    color: "#1B2E20",
    margin: 0,
    letterSpacing: "-0.015em",
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
  description: {
    fontSize: 12.5,
    color: "#5E6E62",
    marginTop: 3,
    marginBottom: 0,
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  userChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(255, 255, 255, 0.88)",
    border: "1.5px solid rgba(115, 158, 130, 0.42)",
    borderRadius: 999,
    padding: "4px 13px 4px 4px",
    cursor: "pointer",
    transition: "all 0.22s ease",
  },
  userAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
    boxShadow: "0 2px 6px rgba(53, 118, 72, 0.16)",
  },
  userAvatarBadge: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #739E82 0%, #357648 100%)",
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 2px 7px rgba(53, 118, 72, 0.25)",
  },

  dropdownMenu: {
    position: "absolute",
    top: "calc(100% + 10px)",
    right: 0,
    width: 260,
    background: "#FFFFFF",
    border: "1px solid #DCE7DC",
    borderRadius: 16,
    boxShadow: "0 14px 36px rgba(27, 46, 32, 0.16), 0 2px 8px rgba(0,0,0,0.04)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 1000,
    animation: "mtrcFlyoutIn 0.2s cubic-bezier(0.22, 1, 0.36, 1) both",
  },
  dropdownHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 16px 14px",
    background: "linear-gradient(180deg, #FAFCFA 0%, #F4F8F4 100%)",
  },
  dropdownAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
    border: "2px solid #26653B",
  },
  dropdownAvatarBadge: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #739E82 0%, #357648 100%)",
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 2px 8px rgba(53, 118, 72, 0.28)",
  },
  dropdownName: {
    fontSize: 13.5,
    fontWeight: 800,
    color: "#1B2E20",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: 1.25,
  },
  dropdownRoleBadge: {
    display: "inline-block",
    marginTop: 3,
    padding: "2px 7px",
    borderRadius: 999,
    background: "#E6F3E8",
    color: "#26653B",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
  },
  dropdownEmail: {
    fontSize: 11,
    color: "#68786B",
    marginTop: 3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  dropdownDivider: {
    height: 1,
    background: "#EEF3EE",
    width: "100%",
  },
  dropdownList: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "6px",
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "8px 10px",
    background: "transparent",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    transition: "background 0.18s ease, transform 0.18s ease",
  },
  dropdownItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: "#F2F7F2",
    color: "#26653B",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dropdownItemTitle: {
    fontSize: 12.5,
    fontWeight: 700,
    color: "#1B2E20",
    lineHeight: 1.2,
  },
  dropdownItemSub: {
    fontSize: 10.5,
    color: "#68786B",
    marginTop: 1,
    lineHeight: 1.2,
  },
  dropdownLogoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "9px 10px",
    background: "transparent",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    transition: "background 0.18s ease, color 0.18s ease",
    color: "#9A241C",
  },
  dropdownLogoutIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: "#FDECEA",
    color: "#B3261E",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dropdownLogoutText: {
    fontSize: 12.5,
    fontWeight: 700,
    color: "#B3261E",
  },

  confirmOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
  },
  confirmModal: {
    width: 400,
    maxWidth: "100%",
    background: "#FFFFFF",
    border: "1px solid #DCE7DC",
    borderRadius: 18,
    boxShadow: "0 20px 48px rgba(15, 23, 42, 0.22)",
    padding: 24,
    animation: "mtrcTooltipIn 0.22s cubic-bezier(0.22, 1, 0.36, 1) both",
  },
  confirmHeader: {
    fontSize: 19,
    fontWeight: 800,
    color: "#1B2E20",
    marginBottom: 8,
  },
  confirmText: {
    margin: 0,
    color: "#5E6E62",
    fontSize: 14,
    lineHeight: 1.5,
  },
  confirmUserBox: {
    marginTop: 16,
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    background: "#F2F7F2",
    borderRadius: 12,
    border: "1px solid #DCE8DD",
  },
  confirmAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#26653B",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 14,
    flexShrink: 0,
  },
  confirmUserName: {
    fontSize: 13.5,
    fontWeight: 800,
    color: "#1B2E20",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  confirmUserRole: {
    fontSize: 11.5,
    color: "#5E6E62",
    marginTop: 2,
    fontWeight: 500,
  },
  confirmActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 22,
  },
  confirmCancelBtn: {
    border: "1px solid #DCE7DC",
    background: "#FFFFFF",
    color: "#2C3B2F",
    padding: "9px 15px",
    borderRadius: 9,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  confirmLogoutBtn: {
    border: "none",
    background: "#1E5A34",
    color: "#FFFFFF",
    padding: "9px 18px",
    borderRadius: 9,
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    transition: "background 0.15s ease, transform 0.15s ease",
    boxShadow: "0 2px 8px rgba(30, 90, 52, 0.25)",
  },
};
