import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";
import { ROLE_LABELS } from "../config/roles.js";
import UserFormModal from "../components/UserFormModal.jsx";
import ResetPasswordModal from "../components/ResetPasswordModal.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [formModal, setFormModal] = useState(null);
  const [resetModalUser, setResetModalUser] = useState(null);
  const [notice, setNotice] = useState("");

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
        </div>
        <button style={styles.addBtn} onClick={() => setFormModal({ mode: "add" })}>+ Add user</button>
      </div>

      {notice && <div style={styles.notice}>{notice}</div>}

      {loading ? (
        <div style={styles.loading}>Loading…</div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState title="No users found" description="Try a different search or filter." />
      ) : (
        <div style={styles.list}>
          {filteredUsers.map((u) => (
            <div key={u.id} style={styles.card}>
              <div style={styles.cardTop}>
                <div style={styles.avatar}>{(u.full_name || u.username).charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.cardName}>{u.full_name || u.username}</div>
                  <div style={styles.cardUsername}>@{u.username}</div>
                </div>
                <span style={{ ...styles.badge, ...(u.status === "active" ? styles.badgeActive : styles.badgeInactive) }}>{u.status}</span>
              </div>

              <div style={styles.cardBody}>
                <div style={styles.roleTag}>{ROLE_LABELS[u.role]}</div>
                <div style={styles.metaRow}><span style={styles.metaLabel}>Employee ID</span><span>{u.employee_id || "—"}</span></div>
                <div style={styles.metaRow}><span style={styles.metaLabel}>Email</span><span style={styles.metaEllipsis}>{u.email || "—"}</span></div>
                <div style={styles.metaRow}><span style={styles.metaLabel}>Contact</span><span>{u.contact_number || "—"}</span></div>
                <div style={styles.metaRow}><span style={styles.metaLabel}>Last login</span><span>{u.last_login ? new Date(u.last_login).toLocaleString() : "Never"}</span></div>
              </div>

              <div style={styles.cardActions}>
                <button style={styles.actionBtn} onClick={() => setFormModal({ mode: "edit", user: u })}>Edit</button>
                <button style={styles.actionBtn} onClick={() => setResetModalUser(u)}>Reset password</button>
                <button style={{ ...styles.actionBtn, ...(u.status === "active" ? styles.dangerAction : styles.successAction) }} onClick={() => handleToggleStatus(u)}>
                  {u.status === "active" ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
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
  filters: { display: "flex", gap: 10, flex: 1, minWidth: 260 },
  searchInput: { flex: 1, minWidth: 200, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13 },
  roleSelect: { padding: "9px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13 },
  addBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", cursor: "pointer" },
  notice: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, marginBottom: 16 },
  loading: { padding: 40, textAlign: "center", color: "var(--color-text-muted)" },
  list: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 },
  card: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 16, display: "flex", flexDirection: "column", gap: 12 },
  cardTop: { display: "flex", alignItems: "center", gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: "50%", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, flexShrink: 0 },
  cardName: { fontSize: 14, fontWeight: 700, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardUsername: { fontSize: 12, color: "var(--color-text-muted)" },
  badge: { padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "capitalize", flexShrink: 0 },
  badgeActive: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)" },
  badgeInactive: { background: "var(--color-danger-tint)", color: "var(--color-danger)" },
  cardBody: { display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid var(--color-border)", paddingTop: 12 },
  roleTag: { alignSelf: "flex-start", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, marginBottom: 4 },
  metaRow: { display: "flex", justifyContent: "space-between", fontSize: 12.5, gap: 8 },
  metaLabel: { color: "var(--color-text-muted)" },
  metaEllipsis: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170, textAlign: "right" },
  cardActions: { display: "flex", gap: 8, borderTop: "1px solid var(--color-border)", paddingTop: 12 },
  actionBtn: { flex: 1, background: "none", border: "1px solid var(--color-border)", padding: "7px 8px", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  dangerAction: { color: "var(--color-danger)", borderColor: "var(--color-danger)" },
  successAction: { color: "var(--color-primary-dark)", borderColor: "var(--color-primary)" },
};