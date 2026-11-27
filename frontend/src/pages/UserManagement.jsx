import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";
import { ROLE_LABELS } from "../config/roles.js";
import UserFormModal from "../components/UserFormModal.jsx";
import ResetPasswordModal from "../components/ResetPasswordModal.jsx";
import EmptyState from "../components/EmptyState.jsx";

// View options, like a file explorer's "View" menu. The choice is remembered per browser.
const VIEW_OPTIONS = [
  { value: "large", label: "Large cards", icon: "large" },
  { value: "small", label: "Small cards", icon: "small" },
  { value: "list", label: "List", icon: "list" },
  { value: "details", label: "Details", icon: "details" },
];
const VIEW_STORAGE_KEY = "mtrc_user_mgmt_view";

function readSavedView() {
  try {
    const v = localStorage.getItem(VIEW_STORAGE_KEY);
    return VIEW_OPTIONS.some((o) => o.value === v) ? v : "large";
  } catch {
    return "large";
  }
}

function ViewIcon({ type }) {
  const common = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.4, "aria-hidden": true };
  if (type === "large")
    return (
      <svg {...common}>
        <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" />
        <rect x="9" y="1.5" width="5.5" height="5.5" rx="1" />
        <rect x="1.5" y="9" width="5.5" height="5.5" rx="1" />
        <rect x="9" y="9" width="5.5" height="5.5" rx="1" />
      </svg>
    );
  if (type === "small")
    return (
      <svg {...common}>
        {[1.5, 6.25, 11].map((x) => [1.5, 6.25, 11].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="3.5" height="3.5" rx="0.6" />))}
      </svg>
    );
  if (type === "list")
    return (
      <svg {...common}>
        <circle cx="3" cy="3.5" r="1.2" />
        <circle cx="3" cy="8" r="1.2" />
        <circle cx="3" cy="12.5" r="1.2" />
        <path d="M6.5 3.5h8M6.5 8h8M6.5 12.5h8" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M1.5 3h13M1.5 6.3h13M1.5 9.7h13M1.5 13h13" />
    </svg>
  );
}

function fmtLastLogin(d) {
  return d ? new Date(d).toLocaleString() : "Never";
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [formModal, setFormModal] = useState(null);
  const [resetModalUser, setResetModalUser] = useState(null);
  const [notice, setNotice] = useState("");
  const [view, setView] = useState(readSavedView);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const viewMenuRef = useRef(null);

  async function loadUsers() {
    setLoading(true);
    const { data } = await api.get("/users");
    setUsers(data.users);
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  // Close the View menu on outside click or Escape.
  useEffect(() => {
    if (!viewMenuOpen) return;
    const onDown = (e) => { if (viewMenuRef.current && !viewMenuRef.current.contains(e.target)) setViewMenuOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setViewMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [viewMenuOpen]);

  function chooseView(v) {
    setView(v);
    setViewMenuOpen(false);
    try { localStorage.setItem(VIEW_STORAGE_KEY, v); } catch { /* storage unavailable: keep for this visit only */ }
  }

  async function handleToggleStatus(u) {
    const nextStatus = u.status === "active" ? "inactive" : "active";
    const verb = nextStatus === "active" ? "activate" : "deactivate";
    if (!window.confirm(`Are you sure you want to ${verb} ${u.full_name || u.username}?`)) return;
    await api.put(`/users/${u.id}`, { status: nextStatus });
    setNotice(`Account ${verb}d.`);
    loadUsers();
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${u.full_name || ""} ${u.username} ${u.employee_id || ""} ${u.email || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [users, search, roleFilter]);

  const currentView = VIEW_OPTIONS.find((o) => o.value === view) || VIEW_OPTIONS[0];

  const statusBadge = (u) => (
    <span style={{ ...styles.badge, ...(u.status === "active" ? styles.badgeActive : styles.badgeInactive) }}>{u.status}</span>
  );
  const avatar = (u, size = 40) => (
    <div style={{ ...styles.avatar, width: size, height: size, fontSize: size * 0.4 }}>
      {(u.full_name || u.username).charAt(0).toUpperCase()}
    </div>
  );
  const actions = (u, compact = false) => (
    <>
      <button style={compact ? styles.smallBtn : styles.actionBtn} onClick={() => setFormModal({ mode: "edit", user: u })}>Edit</button>
      <button style={compact ? styles.smallBtn : styles.actionBtn} onClick={() => setResetModalUser(u)}>
        {compact ? "Reset" : "Reset password"}
      </button>
      <button
        style={{ ...(compact ? styles.smallBtn : styles.actionBtn), ...(u.status === "active" ? styles.dangerAction : styles.successAction) }}
        onClick={() => handleToggleStatus(u)}
      >
        {u.status === "active" ? "Deactivate" : "Activate"}
      </button>
    </>
  );

  function renderUsers() {
    if (view === "details") {
      return (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {["Name", "Role", "Employee ID", "Email", "Contact", "Last login", "Status", ""].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.nameCell}>
                      {avatar(u, 28)}
                      <div style={{ minWidth: 0 }}>
                        <div style={styles.cardName}>{u.full_name || u.username}</div>
                        <div style={styles.cardUsername}>@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}><span style={styles.roleTag}>{ROLE_LABELS[u.role]}</span></td>
                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>{u.employee_id || "—"}</td>
                  <td style={{ ...styles.td, ...styles.ellipsisCell }} title={u.email || ""}>{u.email || "—"}</td>
                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>{u.contact_number || "—"}</td>
                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>{fmtLastLogin(u.last_login)}</td>
                  <td style={styles.td}>{statusBadge(u)}</td>
                  <td style={styles.td}><div style={styles.rowActions}>{actions(u, true)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (view === "list") {
      return (
        <div style={styles.listView}>
          {filteredUsers.map((u) => (
            <div key={u.id} style={styles.listRow}>
              {avatar(u, 32)}
              <div style={styles.listName}>
                <div style={styles.cardName}>{u.full_name || u.username}</div>
                <div style={styles.cardUsername}>@{u.username}</div>
              </div>
              <span><span style={styles.roleTag}>{ROLE_LABELS[u.role]}</span></span>
              <span style={styles.listMeta} title="Last login">{fmtLastLogin(u.last_login)}</span>
              <span>{statusBadge(u)}</span>
              <div style={styles.rowActions}>{actions(u, true)}</div>
            </div>
          ))}
        </div>
      );
    }

    if (view === "small") {
      return (
        <div style={styles.smallGrid}>
          {filteredUsers.map((u) => (
            <div key={u.id} style={styles.smallCard}>
              <div style={styles.cardTop}>
                {avatar(u, 32)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.cardName}>{u.full_name || u.username}</div>
                  <div style={styles.cardUsername}>@{u.username}</div>
                </div>
                {statusBadge(u)}
              </div>
              <div style={styles.smallMeta}>
                <span style={styles.roleTag}>{ROLE_LABELS[u.role]}</span>
                <span style={styles.cardUsername}>{u.employee_id || "No employee ID"}</span>
              </div>
              <div style={styles.rowActions}>{actions(u, true)}</div>
            </div>
          ))}
        </div>
      );
    }

    // Large cards (original layout)
    return (
      <div style={styles.list}>
        {filteredUsers.map((u) => (
          <div key={u.id} style={styles.card}>
            <div style={styles.cardTop}>
              {avatar(u)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.cardName}>{u.full_name || u.username}</div>
                <div style={styles.cardUsername}>@{u.username}</div>
              </div>
              {statusBadge(u)}
            </div>

            <div style={styles.cardBody}>
              <div style={{ ...styles.roleTag, alignSelf: "flex-start", marginBottom: 4 }}>{ROLE_LABELS[u.role]}</div>
              <div style={styles.metaRow}><span style={styles.metaLabel}>Employee ID</span><span>{u.employee_id || "—"}</span></div>
              <div style={styles.metaRow}><span style={styles.metaLabel}>Email</span><span style={styles.metaEllipsis}>{u.email || "—"}</span></div>
              <div style={styles.metaRow}><span style={styles.metaLabel}>Contact</span><span>{u.contact_number || "—"}</span></div>
              <div style={styles.metaRow}><span style={styles.metaLabel}>Last login</span><span>{fmtLastLogin(u.last_login)}</span></div>
            </div>

            <div style={styles.cardActions}>{actions(u)}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <AppShell
      title="User Management"
      description="Create and manage login accounts for admitting personnel, case managers, HIM staff, and ICT administrators."
    >
      <div style={styles.headerRow}>
        <div style={styles.filters}>
          <input style={styles.searchInput} placeholder="Search by name, username, employee ID, or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select style={styles.roleSelect} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All roles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <div style={{ position: "relative" }} ref={viewMenuRef}>
            <button
              type="button"
              style={styles.viewBtn}
              onClick={() => setViewMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={viewMenuOpen}
              title="Change how users are displayed"
            >
              <ViewIcon type={currentView.icon} />
              <span>View</span>
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
            </button>
            {viewMenuOpen && (
              <div role="menu" style={styles.viewMenu}>
                {VIEW_OPTIONS.map((o) => {
                  const active = o.value === view;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      style={{ ...styles.viewItem, ...(active ? styles.viewItemActive : {}) }}
                      onClick={() => chooseView(o.value)}
                    >
                      <span style={styles.viewDot}>{active ? "•" : ""}</span>
                      <ViewIcon type={o.icon} />
                      <span>{o.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <button style={styles.addBtn} onClick={() => setFormModal({ mode: "add" })}>+ Add user</button>
      </div>

      {notice && <div style={styles.notice}>{notice}</div>}

      {loading ? (
        <div style={styles.loading}>Loading…</div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState title="No users found" description="Try a different search or filter." />
      ) : (
        renderUsers()
      )}

      {formModal && (
        <UserFormModal
          mode={formModal.mode}
          user={formModal.user}
          onClose={() => setFormModal(null)}
          onSaved={() => {
            setFormModal(null);
            setNotice(formModal.mode === "add" ? "User account created." : "User account updated.");
            loadUsers();
          }}
        />
      )}

      {resetModalUser && (
        <ResetPasswordModal
          user={resetModalUser}
          onClose={() => setResetModalUser(null)}
          onSaved={() => { setResetModalUser(null); setNotice("Password reset."); }}
        />
      )}
    </AppShell>
  );
}

const styles = {
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20, flexWrap: "wrap" },
  filters: { display: "flex", gap: 10, flex: 1, minWidth: 260, flexWrap: "wrap" },
  searchInput: { flex: 1, minWidth: 200, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13 },
  roleSelect: { padding: "9px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13 },
  viewBtn: { display: "inline-flex", alignItems: "center", gap: 7, height: "100%", minHeight: 37, padding: "0 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", background: "var(--color-surface, #fff)", color: "var(--color-text)", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  viewMenu: { position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50, minWidth: 190, padding: 6, background: "var(--color-surface, #fff)", border: "1px solid var(--color-border)", borderRadius: 10, boxShadow: "0 12px 28px rgba(15, 23, 42, 0.14)" },
  viewItem: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", border: "none", background: "none", borderRadius: 6, fontSize: 13, color: "var(--color-text)", cursor: "pointer", textAlign: "left" },
  viewItemActive: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", fontWeight: 700 },
  viewDot: { width: 8, fontSize: 16, lineHeight: 1, textAlign: "center" },
  addBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", cursor: "pointer" },
  notice: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, marginBottom: 16 },
  loading: { padding: 40, textAlign: "center", color: "var(--color-text-muted)" },

  // Large cards
  list: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 },
  card: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 16, display: "flex", flexDirection: "column", gap: 12 },
  cardTop: { display: "flex", alignItems: "center", gap: 10 },
  avatar: { borderRadius: "50%", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 },
  cardName: { fontSize: 14, fontWeight: 700, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardUsername: { fontSize: 12, color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  badge: { padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "capitalize", flexShrink: 0, whiteSpace: "nowrap" },
  badgeActive: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)" },
  badgeInactive: { background: "var(--color-danger-tint)", color: "var(--color-danger)" },
  cardBody: { display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid var(--color-border)", paddingTop: 12 },
  roleTag: { display: "inline-block", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" },
  metaRow: { display: "flex", justifyContent: "space-between", fontSize: 12.5, gap: 8 },
  metaLabel: { color: "var(--color-text-muted)" },
  metaEllipsis: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170, textAlign: "right" },
  cardActions: { display: "flex", gap: 8, borderTop: "1px solid var(--color-border)", paddingTop: 12 },
  actionBtn: { flex: 1, background: "none", border: "1px solid var(--color-border)", padding: "7px 8px", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  dangerAction: { color: "var(--color-danger)", borderColor: "var(--color-danger)" },
  successAction: { color: "var(--color-primary-dark)", borderColor: "var(--color-primary)" },

  // Shared compact action buttons
  rowActions: { display: "flex", gap: 6, flexShrink: 0 },
  smallBtn: { background: "none", border: "1px solid var(--color-border)", padding: "5px 9px", borderRadius: "var(--radius-sm)", fontSize: 11.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },

  // Small cards
  smallGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 },
  smallCard: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md, 10px)", padding: 12, display: "flex", flexDirection: "column", gap: 10 },
  smallMeta: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minWidth: 0 },

  // List
  listView: { display: "flex", flexDirection: "column", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflowX: "auto" },
  // Fixed columns so every row lines up: avatar | name | role | last login | status | actions
  listRow: { display: "grid", gridTemplateColumns: "32px minmax(160px, 1fr) 150px 170px 80px auto", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: "1px solid var(--color-border)", minWidth: 760 },
  listName: { minWidth: 0 },
  listMeta: { fontSize: 12, color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },

  // Details (table)
  tableWrap: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 },
  th: { textAlign: "left", padding: "10px 12px", fontSize: 11.5, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.3, borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-muted, #F8FAFC)", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid var(--color-border)" },
  td: { padding: "9px 12px", verticalAlign: "middle", color: "var(--color-text)" },
  nameCell: { display: "flex", alignItems: "center", gap: 10, minWidth: 180 },
  ellipsisCell: { maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
};
