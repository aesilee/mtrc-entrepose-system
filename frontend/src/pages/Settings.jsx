import { useEffect, useRef, useState } from "react";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";

const SECTIONS = [
  { key: "general", label: "General" },
  { key: "security", label: "Security" },
  { key: "backup", label: "Backup" },
  { key: "notifications", label: "Notifications" },
];

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeSection, setActiveSection] = useState("general");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const restoreInputRef = useRef(null);
  const logoInputRef = useRef(null);

  const generalRef = useRef(null);
  const securityRef = useRef(null);
  const backupRef = useRef(null);
  const notificationsRef = useRef(null);
  const sectionRefs = { general: generalRef, security: securityRef, backup: backupRef, notifications: notificationsRef };

  useEffect(() => {
    api.get("/settings").then(({ data }) => {
      setSettings(data.settings);
      setOriginalSettings(data.settings);
    }).catch((err) => setError(err.response?.data?.message || "Could not load settings."));
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const isDirty = isEditing && settings && originalSettings && JSON.stringify(settings) !== JSON.stringify(originalSettings);

  function update(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function goToSection(key) {
    setActiveSection(key);
    sectionRefs[key]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleEdit() {
    setError("");
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setSettings(originalSettings);
    setIsEditing(false);
    setError("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await api.put("/settings", settings);
      setOriginalSettings(settings);
      setIsEditing(false);
      setNotice("Settings saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  function handleLogoPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Downscale so the stored logo stays small no matter what the user uploads.
        const maxDim = 300;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        update("organization_logo", canvas.toDataURL("image/png"));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  
  async function handleBackup() {
    setBackingUp(true);
    setError("");
    try {
      const response = await api.get("/settings/backup", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `mtrc_backup_${new Date().toISOString().slice(0, 10)}.sql`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setNotice("Database backup downloaded.");
    } catch (err) {
      setError("Could not create the database backup. Make sure mysqldump is installed and on your PATH.");
    } finally {
      setBackingUp(false);
    }
  }

  async function handleRestoreFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm("Restoring will overwrite existing data with the contents of this backup file. Continue?")) {
      e.target.value = "";
      return;
    }
    setRestoring(true);
    setError("");
    try {
      await api.post("/settings/restore", file, { headers: { "Content-Type": "text/plain" } });
      setNotice("Database restored successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not restore the database.");
    } finally {
      setRestoring(false);
      e.target.value = "";
    }
  }

  if (!settings) {
    return (
      <AppShell title="Settings" description="Loading…">
        <div style={styles.loading}>{error || "Loading settings…"}</div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Settings" description="Configure system-wide settings for the MTRC ENTREPOSE Information System.">
      <div style={styles.headerCard}>
        <div style={styles.headerText}>System-wide settings apply to every user. Personal preferences are managed from each user's profile.</div>
        <div style={styles.headerActions}>
          {isEditing && <button style={styles.cancelBtn} onClick={handleCancelEdit} disabled={saving}>Cancel</button>}
          {!isEditing && <button style={styles.editBtn} onClick={handleEdit}>Edit</button>}
          {isDirty && <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>}
        </div>
      </div>

      {notice && <div style={styles.notice}>{notice}</div>}
      {error && <div style={styles.errorNotice}>{error}</div>}

      <div style={styles.layout}>
        <div style={styles.sideNav}>
          {SECTIONS.map((s) => (
            <button key={s.key} type="button" onClick={() => goToSection(s.key)} style={{ ...styles.sideNavItem, ...(activeSection === s.key ? styles.sideNavItemActive : {}) }}>
              {s.label}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          <div style={styles.mergedScroll}>
            <section ref={generalRef}>
              <div style={styles.sectionHeaderTitle}>General</div>
              <div style={styles.sectionSubtext}>This information appears in the header of generated reports and certificates.</div>

              <div style={styles.logoRow}>
                <div style={styles.logoPreviewWrap}>
                  {settings.organization_logo ? (
                    <img src={settings.organization_logo} alt="Organization logo" style={styles.logoPreview} />
                  ) : (
                    <div style={styles.logoPlaceholder}>No logo</div>
                  )}
                </div>
                {isEditing && (
                  <div style={styles.logoButtons}>
                    <button type="button" style={styles.actionBtnOutline} onClick={() => logoInputRef.current?.click()}>
                      {settings.organization_logo ? "Change logo" : "Upload logo"}
                    </button>
                    {settings.organization_logo && (
                      <button type="button" style={styles.actionBtnOutline} onClick={() => update("organization_logo", "")}>
                        Remove
                      </button>
                    )}
                    <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoPick} />
                  </div>
                )}
              </div>

              <div style={styles.grid}>
                <EditField label="Organization" editing={isEditing} value={settings.organization_name} onChange={(v) => update("organization_name", v)} />
                <EditField label="Organization email" editing={isEditing} type="email" value={settings.organization_email} onChange={(v) => update("organization_email", v)} />
                <EditField label="Organization address" span={2} editing={isEditing} type="textarea" value={settings.organization_address} onChange={(v) => update("organization_address", v)} />
                <EditField label="Admission No." editing={isEditing} value={settings.admission_no} onChange={(v) => update("admission_no", v)} />
                <EditField label="Administrative No." editing={isEditing} value={settings.administrative_no} onChange={(v) => update("administrative_no", v)} />
              </div>
            </section>

            <div style={styles.divider} />

            <section ref={securityRef}>
              <div style={styles.sectionHeaderTitle}>Security</div>
              <div style={styles.grid}>
                <EditField label="Minimum password length" editing={isEditing} type="number" value={settings.min_password_length} onChange={(v) => update("min_password_length", v)} />
                <EditField label="Session timeout (minutes)" editing={isEditing} type="number" value={settings.session_timeout_minutes} onChange={(v) => update("session_timeout_minutes", v)} />
                <EditField label="Max login attempts" editing={isEditing} type="number" value={settings.max_login_attempts} onChange={(v) => update("max_login_attempts", v)} />
              </div>
            </section>

            <div style={styles.divider} />

            <section ref={backupRef}>
              <div style={styles.sectionHeaderTitle}>Backup</div>
              <div style={styles.backupRow}>
                <div>
                  <div style={styles.backupTitle}>Backup database</div>
                  <div style={styles.backupDesc}>Download a full .sql snapshot of the current database.</div>
                </div>
                <button type="button" style={styles.actionBtn} onClick={handleBackup} disabled={backingUp}>{backingUp ? "Preparing…" : "Backup database"}</button>
              </div>
              <div style={{ ...styles.backupRow, borderBottom: "none" }}>
                <div>
                  <div style={styles.backupTitle}>Restore database</div>
                  <div style={styles.backupDesc}>Upload a .sql backup file to restore the database. This will overwrite existing data.</div>
                </div>
                <button type="button" style={styles.actionBtnOutline} onClick={() => restoreInputRef.current?.click()} disabled={restoring}>{restoring ? "Restoring…" : "Restore database"}</button>
                <input ref={restoreInputRef} type="file" accept=".sql" style={{ display: "none" }} onChange={handleRestoreFile} />
              </div>
            </section>

            <div style={styles.divider} />

            <section ref={notificationsRef}>
              <div style={styles.sectionHeaderTitle}>Notifications</div>
              <div style={styles.toggleList}>
                <ToggleRow label="Attendance reminders" editing={isEditing} checked={settings.notif_attendance_reminders === "1"} onChange={(v) => update("notif_attendance_reminders", v ? "1" : "0")} />
                <ToggleRow label="Follow-up reminders" editing={isEditing} checked={settings.notif_followup_reminders === "1"} onChange={(v) => update("notif_followup_reminders", v ? "1" : "0")} />
                <ToggleRow label="Certificate reminders" editing={isEditing} checked={settings.notif_certificate_reminders === "1"} onChange={(v) => update("notif_certificate_reminders", v ? "1" : "0")} />
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function EditField({ label, editing, value, onChange, type = "text", span }) {
  if (!editing) {
    return (
      <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
        <div style={styles.fieldLabel}>{label}</div>
        <div style={styles.fieldValue}>{value || "—"}</div>
      </div>
    );
  }
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <div style={styles.fieldLabel}>{label}</div>
      {type === "textarea" ? (
        <textarea style={{ ...styles.input, minHeight: 60 }} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={type} style={styles.input} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function ToggleRow({ label, checked, onChange, editing }) {
  if (!editing) {
    return (
      <div style={styles.toggleViewRow}>
        <span style={styles.fieldValue}>{label}</span>
        <span style={{ ...styles.statusPill, ...(checked ? styles.statusOn : styles.statusOff) }}>{checked ? "Enabled" : "Disabled"}</span>
      </div>
    );
  }
  return (
    <label style={styles.toggleRow}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

const styles = {
  loading: { padding: 40, textAlign: "center", color: "var(--color-text-muted)" },
  headerCard: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 20, flexWrap: "wrap" },
  headerText: { fontSize: 13, color: "var(--color-text-muted)", maxWidth: 560 },
  headerActions: { display: "flex", gap: 10 },
  editBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },
  cancelBtn: { background: "none", border: "1px solid var(--color-border)", padding: "10px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },
  saveBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },
  notice: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, marginBottom: 16 },
  errorNotice: { background: "#FDE2E2", color: "#B3261E", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, marginBottom: 16 },
  layout: { display: "flex", gap: 20, alignItems: "flex-start" },
  sideNav: { width: 200, flexShrink: 0, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 12, display: "flex", flexDirection: "column", gap: 2, position: "sticky", top: 20 },
  sideNavItem: { padding: "9px 10px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, color: "var(--color-text)", background: "none", border: "none", cursor: "pointer", textAlign: "left" },
  sideNavItemActive: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)" },
  content: { flex: 1, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md, 10px)", padding: 24, minHeight: 400 },
  mergedScroll: { display: "flex", flexDirection: "column", gap: 24 },
  divider: { borderTop: "1px solid var(--color-border)" },
  sectionHeaderTitle: { fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 },
  sectionSubtext: { fontSize: 12, color: "var(--color-text-muted)", marginBottom: 16 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  fieldLabel: { fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 },
  fieldValue: { fontSize: 14, color: "var(--color-text)" },
  input: { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13, fontFamily: "inherit" },
  logoRow: { display: "flex", alignItems: "center", gap: 16, marginBottom: 18 },
  logoPreviewWrap: { width: 64, height: 64, flexShrink: 0, border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "#fff" },
  logoPreview: { width: "100%", height: "100%", objectFit: "contain" },
  logoPlaceholder: { fontSize: 10, color: "var(--color-text-muted)", textAlign: "center" },
  logoButtons: { display: "flex", gap: 8 },
  backupRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--color-border)" },
  backupTitle: { fontSize: 13, fontWeight: 700 },
  backupDesc: { fontSize: 12, color: "var(--color-text-muted)", marginTop: 2, maxWidth: 420 },
  actionBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "9px 16px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },
  actionBtnOutline: { background: "none", border: "1px solid var(--color-border)", padding: "9px 16px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },
  toggleList: { display: "flex", flexDirection: "column", gap: 12 },
  toggleRow: { display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  toggleViewRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 0" },
  statusPill: { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999 },
  statusOn: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)" },
  statusOff: { background: "#F1F1EE", color: "var(--color-text-muted)" },
};