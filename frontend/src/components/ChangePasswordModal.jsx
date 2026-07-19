import { useState } from "react";
import api from "../api/axios.js";

export default function ChangePasswordModal({ onClose, onChanged }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("New password and confirm password do not match."); return; }
    setSaving(true);
    try {
      await api.put("/profile/password", { currentPassword, newPassword, confirmPassword });
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Could not change your password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>Change Password</div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={styles.body}>
          {error && <div style={styles.error}>{error}</div>}

          <label style={styles.label}>Current password
            <div style={styles.passwordRow}>
              <input type={showCurrent ? "text" : "password"} style={{ ...styles.input, flex: 1 }} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              <button type="button" style={styles.eyeBtn} onClick={() => setShowCurrent((v) => !v)}>{showCurrent ? "Hide" : "Show"}</button>
            </div>
          </label>

          <label style={styles.label}>New password
            <div style={styles.passwordRow}>
              <input type={showNew ? "text" : "password"} style={{ ...styles.input, flex: 1 }} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              <button type="button" style={styles.eyeBtn} onClick={() => setShowNew((v) => !v)}>{showNew ? "Hide" : "Show"}</button>
            </div>
          </label>

          <label style={styles.label}>Confirm new password
            <div style={styles.passwordRow}>
              <input type={showConfirm ? "text" : "password"} style={{ ...styles.input, flex: 1 }} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              <button type="button" style={styles.eyeBtn} onClick={() => setShowConfirm((v) => !v)}>{showConfirm ? "Hide" : "Show"}</button>
            </div>
          </label>

          <div style={styles.footer}>
            <button type="button" style={styles.secondaryBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={styles.primaryBtn} disabled={saving}>{saving ? "Saving…" : "Change password"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "var(--color-surface)", borderRadius: "var(--radius-lg)", width: 420, display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--color-border)" },
  title: { fontSize: 15, fontWeight: 800 },
  closeBtn: { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--color-text-muted)" },
  body: { padding: 20, display: "flex", flexDirection: "column", gap: 14 },
  error: { background: "#FDE2E2", color: "#B3261E", fontSize: 13, padding: "8px 12px", borderRadius: "var(--radius-sm)" },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 },
  input: { padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" },
  passwordRow: { display: "flex", gap: 6, alignItems: "center" },
  eyeBtn: { background: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "8px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  footer: { display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 6 },
  secondaryBtn: { background: "none", border: "1px solid var(--color-border)", padding: "9px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  primaryBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "9px 18px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer" },
};