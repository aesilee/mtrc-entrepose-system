import { useEffect, useRef, useState } from "react";
import AppShell from "../components/AppShell.jsx";
import ChangePasswordModal from "../components/ChangePasswordModal.jsx";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABELS, ROLE_PERMISSIONS } from "../config/roles.js";

function fmtDate(d) { return d ? String(d).slice(0, 10) : "—"; }
function fmtDateTime(d) { return d ? new Date(d).toLocaleString() : "—"; }

function parseDevice(ua) {
  if (!ua) return "—";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Unknown browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "Unknown OS";
  return `${browser} on ${os}`;
}

export default function Profile() {
  const { updateStoredUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  function load() {
    api.get("/profile").then(({ data }) => setProfile(data.profile));
    api.get("/profile/activity").then(({ data }) => setActivity(data.activity));
  }

  useEffect(load, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  function startEditing() {
    setForm({
      firstName: profile.first_name || "",
      lastName: profile.last_name || "",
      gender: profile.gender || "",
      birthdate: profile.birthdate ? String(profile.birthdate).slice(0, 10) : "",
      address: profile.address || "",
      contactNumber: profile.contact_number || "",
      email: profile.email || "",
      photoUrl: profile.photo_url || "",
    });
    setEditing(true);
    setError("");
  }

  function handleCancel() {
    setEditing(false);
    setForm(null);
    setError("");
  }

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePhotoPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 400;
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
        update("photoUrl", canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const { data } = await api.put("/profile", form);
      setProfile(data.profile);
      updateStoredUser({ fullName: data.profile.full_name, photoUrl: data.profile.photo_url || null });
      setEditing(false);
      setNotice("Profile updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not update your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return <AppShell title="My Profile" description="Loading…"><div style={styles.loading}>Loading profile…</div></AppShell>;
  }

  const displayPhoto = editing ? form?.photoUrl : profile.photo_url;

  return (
    <AppShell title="My Profile" description="View and update your account details.">
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <div style={styles.avatarWrap}>
            {displayPhoto ? (
              <img src={displayPhoto} alt={profile.full_name} style={styles.avatarImg} />
            ) : (
              <div style={styles.avatarPlaceholder}>{(profile.full_name || profile.username).charAt(0).toUpperCase()}</div>
            )}
            {editing && (
              <button type="button" style={styles.avatarEditBtn} onClick={() => fileInputRef.current?.click()}>
                Change photo
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoPick} />
          </div>
          <div>
            <div style={styles.headerName}>{profile.full_name || profile.username}</div>
            <div style={styles.headerMeta}>{ROLE_LABELS[profile.role]} · {profile.employee_id || "No employee ID"}</div>
            <div style={styles.headerMeta}>{profile.email || "No email on file"} {profile.contact_number ? `· ${profile.contact_number}` : ""}</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          {editing ? (
            <>
              <button type="button" style={styles.cancelBtn} onClick={handleCancel}>Cancel</button>
              <button type="button" style={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </>
          ) : (
            <button type="button" style={styles.editBtn} onClick={startEditing}>Edit profile</button>
          )}
        </div>
      </div>

      {notice && <div style={styles.notice}>{notice}</div>}
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.content}>
        <section>
          <div style={styles.sectionHeader}><span style={styles.sectionHeaderTitle}>Personal Information</span></div>
          <div style={styles.grid}>
            <EditField label="First name" editing={editing} value={form?.firstName} display={profile.first_name} onChange={(v) => update("firstName", v)} />
            <EditField label="Last name" editing={editing} value={form?.lastName} display={profile.last_name} onChange={(v) => update("lastName", v)} />
            <EditField label="Gender" editing={editing} type="select" options={["male", "female", "other"]} value={form?.gender} display={profile.gender} onChange={(v) => update("gender", v)} />
            <EditField label="Birthdate" editing={editing} type="date" value={form?.birthdate} display={fmtDate(profile.birthdate)} onChange={(v) => update("birthdate", v)} />
            <EditField label="Contact number" editing={editing} value={form?.contactNumber} display={profile.contact_number} onChange={(v) => update("contactNumber", v)} />
            <EditField label="Email" editing={editing} value={form?.email} display={profile.email} onChange={(v) => update("email", v)} />
            <EditField label="Address" span={2} editing={editing} type="textarea" value={form?.address} display={profile.address} onChange={(v) => update("address", v)} />
          </div>
        </section>

        <div style={styles.divider} />

        <section>
          <div style={styles.sectionHeader}><span style={styles.sectionHeaderTitle}>Account Information</span></div>
          <div style={styles.grid}>
            <Field label="Username">{profile.username}</Field>
            <Field label="Employee ID">{profile.employee_id || "—"}</Field>
            <Field label="Role">{ROLE_LABELS[profile.role]}</Field>
            <Field label="Account status"><span style={{ textTransform: "capitalize" }}>{profile.status}</span></Field>
            <Field label="Date created">{fmtDate(profile.created_at)}</Field>
          </div>
        </section>

        <div style={styles.divider} />

        <section>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionHeaderTitle}>Security</span>
            <button type="button" style={styles.editLink} onClick={() => setPasswordModalOpen(true)}>Change password</button>
          </div>
          <div style={styles.grid}>
            <Field label="Last password change">{profile.password_changed_at ? fmtDateTime(profile.password_changed_at) : "Never changed"}</Field>
            <Field label="Current device">{parseDevice(profile.last_login_device)}</Field>
          </div>
        </section>

        <div style={styles.divider} />

        <section>
          <div style={styles.sectionHeader}><span style={styles.sectionHeaderTitle}>Roles &amp; Permissions</span></div>
          <div style={styles.roleTag}>{ROLE_LABELS[profile.role]}</div>
          <ul style={styles.permList}>
            {(ROLE_PERMISSIONS[profile.role] || []).map((p) => <li key={p}>{p}</li>)}
          </ul>
        </section>

        <div style={styles.divider} />

        <section>
          <div style={styles.sectionHeader}><span style={styles.sectionHeaderTitle}>Recent Activity</span></div>
          {activity.length === 0 ? (
            <div style={styles.emptyState}>No recent activity.</div>
          ) : (
            <div style={styles.timeline}>
              {activity.map((a) => (
                <div key={a.id} style={styles.timelineItem}>
                  <div style={styles.timelineDot} />
                  <div>
                    <div style={{ fontSize: 13 }}>{a.action}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{fmtDateTime(a.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {passwordModalOpen && (
        <ChangePasswordModal
          onClose={() => setPasswordModalOpen(false)}
          onChanged={() => { setPasswordModalOpen(false); setNotice("Password changed."); load(); }}
        />
      )}
    </AppShell>
  );
}

function Field({ label, span, children }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <div style={styles.fieldLabel}>{label}</div>
      <div style={styles.fieldValue}>{children ?? "—"}</div>
    </div>
  );
}

function EditField({ label, editing, value, onChange, type = "text", options, span, display }) {
  if (!editing) return <Field label={label} span={span}>{display || "—"}</Field>;
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <div style={styles.fieldLabel}>{label}</div>
      {type === "select" ? (
        <select style={styles.input} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea style={{ ...styles.input, minHeight: 60 }} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={type} style={styles.input} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

const styles = {
  loading: { padding: 40, textAlign: "center", color: "var(--color-text-muted)" },
  headerCard: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 20, flexWrap: "wrap" },
  headerLeft: { display: "flex", alignItems: "center", gap: 16 },
  avatarWrap: { position: "relative", width: 56, height: 56, flexShrink: 0 },
  avatarImg: { width: 56, height: 56, borderRadius: "50%", objectFit: "cover" },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: "50%", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800 },
  avatarEditBtn: { position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 700, background: "var(--color-primary-dark)", color: "#fff", border: "none", borderRadius: 999, padding: "3px 8px", cursor: "pointer", whiteSpace: "nowrap" },
  headerName: { fontSize: 17, fontWeight: 800, color: "var(--color-text)" },
  headerMeta: { fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  editBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  cancelBtn: { background: "none", border: "1px solid var(--color-border)", padding: "10px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  saveBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  notice: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, marginBottom: 16 },
  error: { background: "#FDE2E2", color: "#B3261E", fontSize: 13, padding: "8px 12px", borderRadius: "var(--radius-sm)", marginBottom: 16 },
  content: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md, 10px)", padding: 24, display: "flex", flexDirection: "column", gap: 24 },
  divider: { borderTop: "1px solid var(--color-border)" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionHeaderTitle: { fontSize: 15, fontWeight: 700, color: "var(--color-text)" },
  editLink: { background: "none", border: "none", color: "var(--color-primary-dark)", fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  fieldLabel: { fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 },
  fieldValue: { fontSize: 14, color: "var(--color-text)" },
  input: { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13, fontFamily: "inherit" },
  roleTag: { display: "inline-block", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 999, marginBottom: 12 },
  permList: { margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--color-text)" },
  emptyState: { padding: 20, textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 },
  timeline: { display: "flex", flexDirection: "column", gap: 16 },
  timelineItem: { display: "flex", gap: 12 },
  timelineDot: { width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)", marginTop: 6, flexShrink: 0 },
};