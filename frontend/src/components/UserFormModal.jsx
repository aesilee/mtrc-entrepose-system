import { useState } from "react";
import api from "../api/axios.js";
import { ROLE_LABELS } from "../config/roles.js";

const TABS_ADD = [
  { key: "basic", label: "Basic Information" },
  { key: "credentials", label: "Login Credentials" },
  { key: "role", label: "Role" },
];
const TABS_EDIT = [
  { key: "basic", label: "Basic Information" },
  { key: "role", label: "Role & Status" },
];

const EMPTY_FORM = {
  employeeId: "", firstName: "", lastName: "", email: "", contactNumber: "",
  username: "", password: "", confirmPassword: "",
  role: "admitting", status: "active",
};

function toFormState(user) {
  return {
    employeeId: user.employee_id || "", firstName: user.first_name || "", lastName: user.last_name || "",
    email: user.email || "", contactNumber: user.contact_number || "",
    username: user.username || "", password: "", confirmPassword: "",
    role: user.role || "admitting", status: user.status || "active",
  };
}

export default function UserFormModal({ mode, user, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const tabs = isEdit ? TABS_EDIT : TABS_ADD;
  const [activeTab, setActiveTab] = useState("basic");
  const [form, setForm] = useState(isEdit ? toFormState(user) : EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validate() {
    if (!form.firstName.trim() || !form.lastName.trim()) return "First name and last name are required.";
    if (!isEdit) {
      if (!form.username.trim()) return "Username is required.";
      if (form.password.length < 8) return "Password must be at least 8 characters.";
      if (form.password !== form.confirmPassword) return "Password and confirm password do not match.";
    }
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/users/${user.id}`, {
          employeeId: form.employeeId, firstName: form.firstName, lastName: form.lastName,
          email: form.email, contactNumber: form.contactNumber, role: form.role, status: form.status,
        });
      } else {
        await api.post("/users", form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save the user account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>{isEdit ? `Edit ${user.full_name || user.username}` : "Add User"}</div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={styles.tabBar}>
          {tabs.map((t) => (
            <button
              key={t.key} type="button"
              style={{ ...styles.tabBtn, ...(activeTab === t.key ? styles.tabBtnActive : {}) }}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={styles.body}>
          {error && <div style={styles.error}>{error}</div>}

          {activeTab === "basic" && (
            <div style={styles.grid}>
              <label style={styles.label}>First name
                <input style={styles.input} value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required />
              </label>
              <label style={styles.label}>Last name
                <input style={styles.input} value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required />
              </label>
              <label style={styles.label}>Employee ID
                <input style={styles.input} value={form.employeeId} onChange={(e) => update("employeeId", e.target.value)} />
              </label>
              <label style={styles.label}>Email
                <input type="email" style={styles.input} value={form.email} onChange={(e) => update("email", e.target.value)} />
              </label>
              <label style={styles.label}>Contact number
                <input style={styles.input} value={form.contactNumber} onChange={(e) => update("contactNumber", e.target.value)} />
              </label>
            </div>
          )}

          {activeTab === "credentials" && !isEdit && (
            <div style={styles.grid}>
              <label style={styles.label}>Username
                <input style={styles.input} value={form.username} onChange={(e) => update("username", e.target.value)} required />
              </label>
              <div />
              <label style={styles.label}>Password
                <div style={styles.passwordRow}>
                  <input type={showPassword ? "text" : "password"} style={{ ...styles.input, flex: 1 }} value={form.password} onChange={(e) => update("password", e.target.value)} required />
                  <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Hide" : "Show"}</button>
                </div>
              </label>
              <label style={styles.label}>Confirm password
                <div style={styles.passwordRow}>
                  <input type={showConfirm ? "text" : "password"} style={{ ...styles.input, flex: 1 }} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} required />
                  <button type="button" style={styles.eyeBtn} onClick={() => setShowConfirm((v) => !v)}>{showConfirm ? "Hide" : "Show"}</button>
                </div>
              </label>
            </div>
          )}

          {activeTab === "role" && (
            <div style={styles.grid}>
              <label style={styles.label}>Role
                <select style={styles.input} value={form.role} onChange={(e) => update("role", e.target.value)}>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              {isEdit && (
                <label style={styles.label}>Account status
                  <select style={styles.input} value={form.status} onChange={(e) => update("status", e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              )}
            </div>
          )}

          <div style={styles.footer}>
            <button type="button" style={styles.secondaryBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={styles.primaryBtn} disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "var(--color-surface)", borderRadius: "var(--radius-lg)", width: 560, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--color-border)" },
  title: { fontSize: 16, fontWeight: 800 },
  closeBtn: { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--color-text-muted)" },
  tabBar: { display: "flex", gap: 4, padding: "0 20px", borderBottom: "1px solid var(--color-border)" },
  tabBtn: { padding: "12px 4px", marginRight: 22, fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", background: "none", border: "none", borderBottom: "2px solid transparent", cursor: "pointer" },
  tabBtnActive: { color: "var(--color-text)", borderBottom: "2px solid var(--color-primary-dark)" },
  body: { padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 },
  error: { background: "#FDE2E2", color: "#B3261E", fontSize: 13, padding: "8px 12px", borderRadius: "var(--radius-sm)" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 },
  input: { padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13, fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
  passwordRow: { display: "flex", gap: 6, alignItems: "center" },
  eyeBtn: { background: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "8px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  footer: { display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 6 },
  secondaryBtn: { background: "none", border: "1px solid var(--color-border)", padding: "9px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  primaryBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "9px 18px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer" },
};