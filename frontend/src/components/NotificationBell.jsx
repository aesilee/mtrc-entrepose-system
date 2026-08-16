import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";

const ALL_CATEGORIES = [
  { key: "all", label: "All" },
  { key: "system", label: "System" },
  { key: "users", label: "Users" },
  { key: "patients", label: "Patients" },
  { key: "reports", label: "Reports" },
  { key: "certificates", label: "Certificates" },
  { key: "documentation", label: "Documentation" },
];

const ADMITTING_CATEGORIES = [
  { key: "all", label: "All" },
  { key: "patients", label: "Patients" },
  { key: "certificates", label: "Certificates" },
];

const CATEGORY_STYLE = {
  system: { bg: "var(--color-info-tint)", fg: "var(--color-info)" },
  users: { bg: "var(--color-primary-tint)", fg: "var(--color-primary-dark)" },
  patients: { bg: "var(--color-warning-tint)", fg: "var(--color-warning)" },
  reports: { bg: "#EFE9F7", fg: "#6B4FA0" },
  certificates: { bg: "#E8F5E9", fg: "#2E7D32" },
  documentation: { bg: "#FFF3E0", fg: "#E65100" },
};

const CATEGORY_ICON = {
  system: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  patients: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  certificates: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <circle cx="12" cy="8" r="6" /><path d="M9 13.5 7 22l5-3 5 3-2-8.5" />
    </svg>
  ),
  documentation: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <path d="M9 2h6l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M9 14l2 2 4-4" />
    </svg>
  ),
};

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [allNotifications, setAllNotifications] = useState([]);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  function loadUnreadCount() {
    api.get("/notifications/unread-count").then(({ data }) => setUnreadCount(data.count)).catch(() => {});
  }

  function loadAll() {
    setLoading(true);
    api.get("/notifications").then(({ data }) => setAllNotifications(data.notifications)).finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) loadAll();
  }

  async function handleMarkAllRead() {
    await api.put("/notifications/mark-all-read");
    setUnreadCount(0);
    setAllNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function handleDismiss(id) {
    setAllNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.put(`/notifications/${id}/read`);
      loadUnreadCount();
    } catch {
      // ignore — worst case it reappears on next open
    }
  }

  const categories = useMemo(() => {
    if (!user) return ALL_CATEGORIES;
    return user.role === "admitting" ? ADMITTING_CATEGORIES : ALL_CATEGORIES;
  }, [user]);

  useEffect(() => {
    if (!categories.some((c) => c.key === category)) {
      setCategory("all");
    }
  }, [categories, category]);

  const counts = { all: allNotifications.length };
  categories.forEach((c) => {
    if (c.key !== "all") counts[c.key] = allNotifications.filter((n) => n.category === c.key).length;
  });

  const visible = category === "all" ? allNotifications : allNotifications.filter((n) => n.category === category);

  return (
    <div ref={ref} style={styles.wrap}>
      <button type="button" style={styles.bellBtn} onClick={toggleOpen} aria-label="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span style={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {open && (
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Notifications</span>
            <button type="button" style={styles.refreshBtn} onClick={loadAll} aria-label="Refresh">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>

          <div style={styles.tabBar}>
            {categories.map((c) => (
              <button
                key={c.key}
                type="button"
                style={{ ...styles.tabBtn, ...(category === c.key ? styles.tabBtnActive : {}) }}
                onClick={() => setCategory(c.key)}
              >
                {c.label} <span style={styles.tabCount}>{counts[c.key] || 0}</span>
              </button>
            ))}
          </div>

          <div style={styles.list}>
            {loading ? (
              <div style={styles.emptyState}>Loading…</div>
            ) : visible.length === 0 ? (
              <div style={styles.emptyState}>No notifications yet.</div>
            ) : (
              visible.map((n) => {
                const c = CATEGORY_STYLE[n.category] || CATEGORY_STYLE.system;
                return (
                  <div key={n.id} style={{ ...styles.item, ...(n.is_read ? {} : styles.itemUnread) }}>
                    <div style={{ ...styles.itemIcon, background: c.bg, color: c.fg }}>
                      {CATEGORY_ICON[n.category] || CATEGORY_ICON.system}
                    </div>
                    <div style={styles.itemBody}>
                      <div style={styles.itemMessage}>{n.message}</div>
                      <div style={styles.itemTime}>{timeAgo(n.created_at)}</div>
                    </div>
                    <button type="button" style={styles.dismissBtn} onClick={() => handleDismiss(n.id)} aria-label="Dismiss">×</button>
                  </div>
                );
              })
            )}
          </div>

          <div style={styles.footer}>
            <button type="button" style={styles.markAllBtn} onClick={handleMarkAllRead}>Mark all as read</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { position: "relative" },
  bellBtn: { position: "relative", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--color-text)" },
  badge: { position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, padding: "0 3px", borderRadius: 999, background: "var(--color-danger, #B3261E)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 },
  panel: { position: "absolute", top: "calc(100% + 8px)", right: 0, width: 380, maxHeight: 480, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", boxShadow: "0 16px 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 200 },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--color-border)" },
  panelTitle: { fontSize: 15, fontWeight: 800 },
  refreshBtn: { background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", display: "flex", padding: 4 },
  tabBar: { display: "flex", gap: 4, padding: "10px 12px", overflowX: "auto" },
  tabBtn: { display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 12.5, fontWeight: 600, color: "var(--color-text-muted)", background: "none", border: "none", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap" },
  tabBtnActive: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)" },
  tabCount: { fontSize: 11, opacity: 0.75 },
  list: { overflowY: "auto", flex: 1, borderTop: "1px solid var(--color-border)" },
  item: { display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 16px", borderBottom: "1px solid var(--color-border)" },
  itemUnread: { background: "var(--color-primary-tint)" },
  itemIcon: { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  itemBody: { flex: 1, minWidth: 0 },
  itemMessage: { fontSize: 13, color: "var(--color-text)", lineHeight: 1.5 },
  itemTime: { fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 },
  dismissBtn: { background: "none", border: "none", fontSize: 16, lineHeight: 1, color: "var(--color-text-muted)", cursor: "pointer", padding: 2, flexShrink: 0 },
  emptyState: { padding: 30, textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 },
  footer: { padding: "12px 16px", borderTop: "1px solid var(--color-border)" },
  markAllBtn: { background: "none", border: "none", color: "var(--color-primary-dark)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 0, textDecoration: "underline" },
};