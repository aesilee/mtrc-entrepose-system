import { useEffect, useState } from "react";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";
import { ROLE_LABELS } from "../config/roles.js";

const EMPTY_FORM = {
  employeeId: "",
  fullName: "",
  username: "",
  role: "admitting",
  temporaryPassword: "",
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadUsers() {
    setLoading(true);
    const { data } = await api.get("/users");
    setUsers(data.users);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      await api.post("/users", form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setNotice("User account created.");
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create the account.");
    }
  }

  async function handleToggleStatus(user) {
    const nextStatus = user.status === "active" ? "inactive" : "active";
    await api.put(`/users/${user.id}`, { status: nextStatus });
    loadUsers();
  }

  return (
    <AppShell title="User Management">
      <div style={styles.headerRow}>
        <p style={styles.subtitle}>
          Create and manage login accounts for admitting personnel, case
          managers, HIM staff, and ICT administrators.
        </p>
        <button style={styles.addBtn} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Add user"}
        </button>
      </div>

      {notice && <div style={styles.notice}>{notice}</div>}

      {showForm && (
        <form onSubmit={handleCreate} style={styles.formCard}>
          <div style={styles.formGrid}>
            <label style={styles.label}>
              Employee ID
              <input
                style={styles.input}
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              />
            </label>
            <label style={styles.label}>
              Full name
              <input
                style={styles.input}
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </label>
            <label style={styles.label}>
              Username
              <input
                style={styles.input}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </label>
            <label style={styles.label}>
              Role
              <select
                style={styles.input}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.label}>
              Temporary password
              <input
                style={styles.input}
                type="text"
                value={form.temporaryPassword}
                onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })}
                required
              />
            </label>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button style={styles.submitBtn} type="submit">
            Create account
          </button>
        </form>
      )}

      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Username</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Last login</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={styles.td} colSpan={6}>
                  Loading…
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td style={styles.td}>{u.full_name}</td>
                  <td style={styles.td}>{u.username}</td>
                  <td style={styles.td}>{ROLE_LABELS[u.role]}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.badge,
                        ...(u.status === "active" ? styles.badgeActive : styles.badgeInactive),
                      }}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {u.last_login ? new Date(u.last_login).toLocaleString() : "—"}
                  </td>
                  <td style={styles.td}>
                    <button style={styles.linkBtn} onClick={() => handleToggleStatus(u)}>
                      {u.status === "active" ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

const styles = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 20,
  },
  subtitle: {
    color: "var(--color-text-muted)",
    fontSize: 14,
    maxWidth: 520,
    lineHeight: 1.6,
  },
  addBtn: {
    background: "var(--color-primary)",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "var(--radius-sm)",
    fontWeight: 700,
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  notice: {
    background: "var(--color-primary-tint)",
    color: "var(--color-primary-dark)",
    padding: "10px 14px",
    borderRadius: "var(--radius-sm)",
    fontSize: 13,
    marginBottom: 16,
  },
  formCard: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: 24,
    marginBottom: 24,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 16,
    marginBottom: 16,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
  },
  input: {
    padding: "9px 10px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    fontSize: 14,
  },
  error: {
    background: "var(--color-danger-tint)",
    color: "var(--color-danger)",
    fontSize: 13,
    padding: "8px 10px",
    borderRadius: "var(--radius-sm)",
    marginBottom: 12,
  },
  submitBtn: {
    background: "var(--color-primary)",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "var(--radius-sm)",
    fontWeight: 700,
    fontSize: 13,
  },
  tableCard: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "var(--color-text-muted)",
    padding: "12px 20px",
    borderBottom: "1px solid var(--color-border)",
  },
  td: {
    padding: "14px 20px",
    fontSize: 14,
    borderBottom: "1px solid var(--color-border)",
  },
  badge: {
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    textTransform: "capitalize",
  },
  badgeActive: {
    background: "var(--color-primary-tint)",
    color: "var(--color-primary-dark)",
  },
  badgeInactive: {
    background: "var(--color-danger-tint)",
    color: "var(--color-danger)",
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "var(--color-info)",
    fontSize: 13,
    fontWeight: 600,
    padding: 0,
  },
};
