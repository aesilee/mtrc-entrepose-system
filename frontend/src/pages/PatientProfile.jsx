import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import ProgressNoteModal from "../components/ProgressNoteModal.jsx";
import FollowUpModal from "../components/FollowUpModal.jsx";
import CompleteFollowUpModal from "../components/CompleteFollowUpModal.jsx";
import SharedEmptyState from "../components/EmptyState.jsx";
import CertificateGeneratorModal from "../components/CertificateGeneratorModal.jsx";
import CertificateViewModal from "../components/CertificateViewModal.jsx";
import CardActionMenu from "../components/CardActionMenu.jsx";

const iconProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

const NAV_ICONS = {
  personal: <svg {...iconProps}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>,
  admission: <svg {...iconProps}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8 3v4M16 3v4" /></svg>,
  rehab: <svg {...iconProps}><path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" /></svg>,
  attendance: <svg {...iconProps}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8.5 15l2 2 4-4" /></svg>,
  "case-notes": <svg {...iconProps}><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 9h6M9 13h6" /></svg>,
  progress: <svg {...iconProps}><path d="M3 17l6-6 4 4 8-8" /><path d="M15 6h6v6" /></svg>,
  certificates: <svg {...iconProps}><circle cx="12" cy="8" r="5" /><path d="M8.5 12.5L7 21l5-3 5 3-1.5-8.5" /></svg>,
  history: <svg {...iconProps}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2" /><path d="M9 2h6" /></svg>,
};

const PROFILE_SECTIONS = [
  { key: "personal", label: "Personal Information" },
  { key: "admission", label: "Admission Information" },
  { key: "rehab", label: "Rehabilitation Information" },
];

const TAB_SECTIONS = [
  { key: "attendance", label: "Attendance" },
  { key: "case-notes", label: "Case Management" },
  { key: "progress", label: "Timeline" },
  { key: "certificates", label: "Certificates" },
  { key: "history", label: "History" },
];

const STATUS_COLORS = {
  pending: { bg: "#FFF3D6", color: "#9A6B00" },
  active: { bg: "var(--color-primary-tint)", color: "var(--color-primary-dark)" },
  completed: { bg: "#E1F0FF", color: "#0B5FA5" },
  dropped: { bg: "#FDE2E2", color: "#B3261E" },
  transferred: { bg: "#EDEAFB", color: "#5B3EC9" },
};

function calcAge(birthdate) {
  if (!birthdate) return "—";
  const dob = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function calcMonthsCompleted(startDate) {
  if (!startDate) return "—";
  const start = new Date(startDate);
  const today = new Date();
  return Math.max((today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth()), 0);
}

function fmtDate(d) { return d ? String(d).slice(0, 10) : "—"; }
function fmtDateTime(d) { return d ? new Date(d).toLocaleString() : "—"; }
function toInputDate(d) { return d ? String(d).slice(0, 10) : ""; }

export default function PatientProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const canManageCase = ["case_manager", "ict_admin"].includes(user.role);
  const [patient, setPatient] = useState(null);
  const [caseSubTab, setCaseSubTab] = useState("summary");
  const [followUps, setFollowUps] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [noteModal, setNoteModal] = useState(null); // null closed, {} = new, note object = edit
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [certGeneratorOpen, setCertGeneratorOpen] = useState(false);
  const [viewingCertificateId, setViewingCertificateId] = useState(null);
  const [certAction, setCertAction] = useState(null);

  function openCertificate(certId, action = null) {
    setViewingCertificateId(certId);
    setCertAction(action);
  }

  async function handleDeleteCertificate(certId) {
    if (!window.confirm("Delete this certificate? This cannot be undone.")) return;
    try {
      await api.delete(`/certificates/${certId}`);
      if (viewingCertificateId === certId) setViewingCertificateId(null);
      refreshCertificates();
    } catch (err) {
      alert("Could not delete this certificate.");
    }
  }
  const [completingFollowUpId, setCompletingFollowUpId] = useState(null);
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);

  async function handleArchiveToggle() {
    const action = patient.is_archived ? "restore" : "archive";
    if (!window.confirm(patient.is_archived ? "Restore this patient?" : "Archive this patient? They'll be hidden from the main patients list.")) return;
    setArchiving(true);
    try {
      await api.post(`/archives/patients/${id}/${action}`);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || `Could not ${action} this patient.`);
    } finally {
      setArchiving(false);
    }
  }
  const [caseManagers, setCaseManagers] = useState([]);
  const [programs, setPrograms] = useState([]);

  const [activeSection, setActiveSection] = useState("personal");
  const [attendance, setAttendance] = useState([]);
  const [progressNotes, setProgressNotes] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef(null);
  const personalRef = useRef(null);
  const admissionRef = useRef(null);
  const rehabRef = useRef(null);
  const sectionRefs = { personal: personalRef, admission: admissionRef, rehab: rehabRef };

  function loadAll() {
    setLoading(true);
    Promise.all([
      api.get(`/patients/${id}`),
      api.get(`/patients/${id}/attendance`),
      api.get(`/patients/${id}/progress-notes`),
      api.get(`/patients/${id}/certificates`),
      api.get(`/patients/${id}/history`),
      api.get(`/patients/${id}/follow-ups`),
      api.get(`/patients/${id}/timeline`),
      api.get("/users/case-managers"),
      api.get("/programs"),
    ]).then(([p, a, pn, c, h, fu, tl, cm, pr]) => {
      setPatient(p.data.patient);
      setForm(toFormState(p.data.patient));
      setAttendance(a.data.attendance);
      setProgressNotes(pn.data.progressNotes);
      setCertificates(c.data.certificates);
      setHistory(h.data.history);
      setFollowUps(fu.data.followUps);
      setTimeline(tl.data.timeline);
      setCaseManagers(cm.data.caseManagers);
      setPrograms(pr.data.programs);
    }).finally(() => setLoading(false));
  }

  function refreshCertificates() {
    Promise.all([
      api.get(`/patients/${id}/certificates`),
      api.get(`/patients/${id}/timeline`),
    ]).then(([c, tl]) => {
      setCertificates(c.data.certificates);
      setTimeline(tl.data.timeline);
    });
  }

  useEffect(loadAll, [id]);

  function toFormState(p) {
    return {
      firstName: p.first_name || "", middleName: p.middle_name || "", lastName: p.last_name || "",
      gender: p.gender || "", birthdate: toInputDate(p.birthdate), civilStatus: p.civil_status || "single",
      contactNumber: p.contact_number || "", email: p.email || "", address: p.address || "", municipality: p.municipality || "",
      emergencyContactName: p.emergency_contact_name || "", emergencyContactRelationship: p.emergency_contact_relationship || "",
      emergencyContactNumber: p.emergency_contact_number || "",
      admissionDate: toInputDate(p.admission_date), referralSource: p.referral_source || "", admissionType: p.admission_type || "",
      programId: p.program_id || "", assignedCaseManagerId: p.assigned_case_manager_id || "",
      admissionNotes: p.admission_notes || "", initialAssessment: p.initial_assessment || "",
      enrollmentStatus: p.enrollment_status || "pending", statusRemark: "",
      currentStatus: p.current_status || "", programPhase: p.program_phase || "",
      expectedCompletionDate: toInputDate(p.expected_completion_date), sessionsRequired: p.sessions_required ?? "",
      photoDataUrl: p.photo_url || "",
    };
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePhotoPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("photoDataUrl", reader.result);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.put(`/patients/${id}`, form);
      loadAll();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setForm(toFormState(patient));
    setEditing(false);
  }

  function startEditing() {
    setForm((prev) => ({ ...prev, statusRemark: "" }));
    setEditing(true);
  }

  function goToSection(key) {
    setActiveSection(key);
    if (sectionRefs[key]) {
      sectionRefs[key].current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (loading) {
    return <AppShell title="Patient Profile" description="Loading…"><div style={styles.loading}>Loading patient record…</div></AppShell>;
  }
  if (!patient) {
    return <AppShell title="Patient Profile" description="Patient not found."><div style={styles.card}><p style={styles.emptyText}>This patient record could not be found.</p></div></AppShell>;
  }

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const missedCount = attendance.filter((a) => a.status === "absent").length;
  const attendancePct = attendance.length ? Math.round((presentCount / attendance.length) * 100) : null;
  const statusStyle = STATUS_COLORS[patient.enrollment_status] || STATUS_COLORS.pending;
  const isMergedSection = PROFILE_SECTIONS.some((s) => s.key === activeSection);

  return (
    <AppShell title={patient.full_name} description={`Patient ID: ${patient.patient_code}`}>
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <div style={styles.avatarWrap}>
            {form.photoDataUrl ? (
              <img src={form.photoDataUrl} alt={patient.full_name} style={styles.avatarImg} />
            ) : (
              <div style={styles.avatarPlaceholder}>{patient.full_name.charAt(0)}</div>
            )}
            {editing && (
              <button type="button" style={styles.avatarEditBtn} onClick={() => fileInputRef.current?.click()}>
                Change photo
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoPick} />
          </div>
          <div>
            <div style={styles.headerName}>{patient.full_name}</div>
            <div style={styles.headerMeta}>{patient.patient_code} · {patient.municipality || "—"}</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          {patient.is_archived && <span style={styles.archivedBadge}>Archived</span>}
          <span style={{ ...styles.statusBadge, background: statusStyle.bg, color: statusStyle.color }}>
            {patient.enrollment_status}
          </span>
          {editing ? (
            <>
              <button type="button" style={styles.cancelBtn} onClick={handleCancel}>Cancel</button>
              <button type="button" style={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </>
          ) : (
            <>
              {user.role !== "him_staff" && (
                <button type="button" style={styles.editBtn} onClick={startEditing}>Edit profile</button>
              )}
              {user.role === "ict_admin" && (
                <button
                  type="button"
                  style={patient.is_archived ? styles.restoreProfileBtn : styles.archiveProfileBtn}
                  onClick={handleArchiveToggle}
                  disabled={archiving}
                >
                  {archiving ? "Working…" : patient.is_archived ? "Restore" : "Archive"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div style={styles.layout}>
        <div style={styles.sideNav}>
          <div style={styles.sideNavGroupLabel}>Profile</div>
          {PROFILE_SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => goToSection(s.key)}
              style={{ ...styles.sideNavItem, ...(activeSection === s.key ? styles.sideNavItemActive : {}) }}
            >
              <span style={styles.sideNavIcon}>{NAV_ICONS[s.key]}</span>
              {s.label}
            </button>
          ))}

          <div style={{ ...styles.sideNavGroupLabel, marginTop: 16 }}>Records</div>
          {TAB_SECTIONS.filter((s) => {
              if (user.role === "case_manager" && s.key === "certificates") return false;
              if (user.role === "admitting" && (s.key === "case-notes" || s.key === "attendance")) return false;
              return true;
            }).map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveSection(s.key)}
              style={{ ...styles.sideNavItem, ...(activeSection === s.key ? styles.sideNavItemActive : {}) }}
            >
              <span style={styles.sideNavIcon}>{NAV_ICONS[s.key]}</span>
              {s.label}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {isMergedSection ? (
            <div style={styles.mergedScroll}>
              <section ref={personalRef}>
                <SectionHeader icon={NAV_ICONS.personal} title="Personal Information" />
                <div style={styles.grid}>
                  <EditField label="First name" editing={editing} value={form.firstName} onChange={(v) => update("firstName", v)} />
                  <EditField label="Middle name" editing={editing} value={form.middleName} onChange={(v) => update("middleName", v)} />
                  <EditField label="Last name" editing={editing} value={form.lastName} onChange={(v) => update("lastName", v)} />
                  <EditField label="Gender" editing={editing} type="select" options={["male", "female", "other"]} value={form.gender} onChange={(v) => update("gender", v)} />
                  <EditField label="Birthdate" editing={editing} type="date" value={form.birthdate} onChange={(v) => update("birthdate", v)} display={fmtDate(patient.birthdate)} />
                  <Field label="Age">{calcAge(form.birthdate)}</Field>
                  <EditField label="Civil status" editing={editing} type="select" options={["single", "married", "widowed", "separated"]} value={form.civilStatus} onChange={(v) => update("civilStatus", v)} />
                  <EditField label="Address" span={2} editing={editing} value={form.address} onChange={(v) => update("address", v)} />
                  <EditField label="Municipality" editing={editing} value={form.municipality} onChange={(v) => update("municipality", v)} />
                  <EditField label="Contact number" editing={editing} value={form.contactNumber} onChange={(v) => update("contactNumber", v)} />
                  <EditField label="Email" editing={editing} value={form.email} onChange={(v) => update("email", v)} />
                  <EditField label="Emergency contact name" editing={editing} value={form.emergencyContactName} onChange={(v) => update("emergencyContactName", v)} />
                  <EditField label="Relationship" editing={editing} value={form.emergencyContactRelationship} onChange={(v) => update("emergencyContactRelationship", v)} />
                  <EditField label="Emergency contact number" editing={editing} value={form.emergencyContactNumber} onChange={(v) => update("emergencyContactNumber", v)} />
                </div>
              </section>

              <div style={styles.sectionDivider} />

              <section ref={admissionRef}>
                <SectionHeader icon={NAV_ICONS.admission} title="Admission Information" />
                <div style={styles.grid}>
                  <EditField
                    label="Enrollment status" editing={editing} type="select"
                    options={["pending", "active", "completed", "dropped", "transferred"]}
                    value={form.enrollmentStatus} onChange={(v) => update("enrollmentStatus", v)}
                    display={patient.enrollment_status}
                  />
                  {editing && form.enrollmentStatus !== patient.enrollment_status && (
                    <div>
                      <div style={styles.fieldLabel}>Status change remark (optional)</div>
                      <textarea
                        style={{ ...styles.input, minHeight: 50 }}
                        placeholder="Why is the status changing?"
                        value={form.statusRemark}
                        onChange={(e) => update("statusRemark", e.target.value)}
                      />
                    </div>
                  )}
                  <EditField label="Admission date" editing={editing} type="date" value={form.admissionDate} onChange={(v) => update("admissionDate", v)} display={fmtDate(patient.admission_date)} />
                  <EditField label="Referral source" editing={editing} value={form.referralSource} onChange={(v) => update("referralSource", v)} />
                  <EditField label="Admission type" editing={editing} value={form.admissionType} onChange={(v) => update("admissionType", v)} />
                  <EditField
                    label="Program" editing={editing} type="select"
                    options={programs.map((p) => ({ value: p.id, label: p.name }))}
                    value={form.programId} onChange={(v) => update("programId", v)}
                    display={patient.program_name || "—"}
                  />
                  <EditField
                    label="Assigned case manager" editing={editing} type="select"
                    options={caseManagers.map((cm) => ({ value: cm.id, label: cm.full_name }))}
                    value={form.assignedCaseManagerId} onChange={(v) => update("assignedCaseManagerId", v)}
                    display={patient.case_manager_name || "Unassigned"}
                  />
                  <EditField label="Admission notes" span={2} editing={editing} type="textarea" value={form.admissionNotes} onChange={(v) => update("admissionNotes", v)} />
                  <EditField label="Initial assessment" span={2} editing={editing} type="textarea" value={form.initialAssessment} onChange={(v) => update("initialAssessment", v)} />
                </div>
              </section>

              <div style={styles.sectionDivider} />

              <section ref={rehabRef}>
                <SectionHeader icon={NAV_ICONS.rehab} title="Rehabilitation Information" />
                <div style={styles.grid}>
                  <EditField label="Current status" editing={editing} value={form.currentStatus} onChange={(v) => update("currentStatus", v)} />
                  <EditField label="Program phase" editing={editing} value={form.programPhase} onChange={(v) => update("programPhase", v)} />
                  <Field label="Months completed">{calcMonthsCompleted(patient.rehab_start_date)}</Field>
                  <EditField label="Expected completion" editing={editing} type="date" value={form.expectedCompletionDate} onChange={(v) => update("expectedCompletionDate", v)} display={fmtDate(patient.expected_completion_date)} />
                  <EditField label="Sessions required" editing={editing} type="number" value={form.sessionsRequired} onChange={(v) => update("sessionsRequired", v)} />
                  <Field label="Sessions completed">{presentCount}</Field>
                  <Field label="Attendance %">{attendancePct !== null ? `${attendancePct}%` : "—"}</Field>
                </div>
              </section>
            </div>
          ) : activeSection === "attendance" ? (
            <div>
              <SectionHeader icon={NAV_ICONS.attendance} title="Attendance" />
              <div style={styles.statsRow}>
                <StatChip label="Sessions completed" value={presentCount} />
                <StatChip label="Missed sessions" value={missedCount} />
                <StatChip label="Attendance rate" value={attendancePct !== null ? `${attendancePct}%` : "—"} />
              </div>
              {attendance.length === 0 ? <EmptyState text="No attendance records yet." /> : (
                <SimpleTable columns={["Date", "Session", "Status", "Remarks"]} rows={attendance.map((a) => [fmtDate(a.session_date), a.session_type || "—", a.status, a.notes || "—"])} />
              )}
            </div>
          ) : activeSection === "case-notes" ? (
            <div>
              <SectionHeader icon={NAV_ICONS["case-notes"]} title="Case Management" />

              <div style={styles.subTabBar}>
                {[
                  { key: "summary", label: "Rehabilitation Summary" },
                  { key: "notes", label: "Progress Notes" },
                  { key: "followups", label: "Follow-up Actions" },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setCaseSubTab(t.key)}
                    style={{ ...styles.subTabButton, ...(caseSubTab === t.key ? styles.subTabButtonActive : {}) }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {caseSubTab === "summary" && (
                <div>
                  <div style={styles.grid}>
                    <Field label="Current status">{patient.current_status || "—"}</Field>
                    <Field label="Program phase">{patient.program_phase || "—"}</Field>
                    <Field label="Assigned case manager">{patient.case_manager_name || "Unassigned"}</Field>
                    <Field label="Admission date">{fmtDate(patient.admission_date)}</Field>
                    <Field label="Expected completion">{fmtDate(patient.expected_completion_date)}</Field>
                    <Field label="Completion %">
                      {patient.sessions_required ? `${Math.round((presentCount / patient.sessions_required) * 100)}%` : "—"}
                    </Field>
                  </div>
                  {canManageCase && !editing && (
                    <div style={{ marginTop: 16 }}>
                      <button
                        type="button"
                        style={styles.generateBtn}
                        onClick={() => { goToSection("rehab"); startEditing(); }}
                      >
                        Update rehabilitation status
                      </button>
                    </div>
                  )}
                </div>
              )}

              {caseSubTab === "notes" && (
                <div>
                  {canManageCase && (
                    <div style={{ marginBottom: 16 }}>
                      <button type="button" style={styles.generateBtn} onClick={() => setNoteModal({})}>+ Add Progress Note</button>
                    </div>
                  )}
                  {progressNotes.length === 0 ? <EmptyState text="No progress notes have been recorded yet." /> : (
                    <div style={styles.list}>
                      {progressNotes.map((n) => (
                        <div key={n.id} style={styles.noteCard}>
                          <div style={styles.noteHeader}>
                            <span style={{ fontWeight: 700 }}>{fmtDate(n.session_date)} {n.session_type && `· ${n.session_type}`}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={styles.noteMeta}>{n.case_manager_name || "—"} · {fmtDateTime(n.created_at)}</span>
                              {canManageCase && (
                                <button type="button" style={styles.editLink} onClick={() => setNoteModal(n)}>Edit</button>
                              )}
                            </div>
                          </div>
                          <p style={styles.noteContent}><strong>Observation:</strong> {n.observation}</p>
                          {n.intervention_provided && <p style={styles.noteContent}><strong>Intervention:</strong> {n.intervention_provided}</p>}
                          {n.patient_response && <p style={styles.noteContent}><strong>Patient response:</strong> {n.patient_response}</p>}
                          {n.recommendations && <p style={styles.noteContent}><strong>Recommendations:</strong> {n.recommendations}</p>}
                          {n.next_follow_up_date && <p style={styles.noteContent}><strong>Next follow-up:</strong> {fmtDate(n.next_follow_up_date)}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {caseSubTab === "followups" && (
                <div>
                  {canManageCase && (
                    <div style={{ marginBottom: 16 }}>
                      <button type="button" style={styles.generateBtn} onClick={() => setFollowUpModalOpen(true)}>+ Schedule Follow-up</button>
                    </div>
                  )}
                  {followUps.length === 0 ? <EmptyState text="No follow-up actions scheduled yet." /> : (
                    <div style={styles.list}>
                      {followUps.map((f) => (
                        <div key={f.id} style={styles.noteCard}>
                          <div style={styles.noteHeader}>
                            <span style={{ fontWeight: 700 }}>Due {fmtDate(f.due_date)}</span>
                            <span style={{ ...styles.statusBadgeSm, ...(f.status === "completed" ? styles.statusCompleted : styles.statusPending) }}>
                              {f.status}
                            </span>
                          </div>
                          <p style={styles.noteContent}>{f.reason}</p>
                          {f.status === "completed" ? (
                            <p style={styles.noteMeta}>Completed {fmtDateTime(f.resolved_at)}{f.completed_remarks && ` — ${f.completed_remarks}`}</p>
                          ) : canManageCase ? (
                            <button type="button" style={styles.editLink} onClick={() => setCompletingFollowUpId(f.id)}>Mark complete</button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeSection === "progress" ? (
            <div>
              <SectionHeader icon={NAV_ICONS.progress} title="Progress" />
              {timeline.length === 0 ? <EmptyState text="No progress timeline yet." /> : (
                <div style={styles.timelineScroll}>
                  {timeline.map((t, i) => (
                    <div key={i} style={styles.timelineItem}>
                      <div style={styles.timelineDot} />
                      <div>
                        <div style={styles.noteMeta}>{fmtDateTime(t.event_date)}</div>
                        <p style={styles.noteContent}><strong>{t.title}</strong>{t.detail ? ` — ${t.detail}` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeSection === "certificates" ? (
            <div>
              <SectionHeader icon={NAV_ICONS.certificates} title="Certificates" />
              <div style={{ marginBottom: 16 }}>
                {user.role !== "case_manager" && (
                  <button type="button" style={styles.generateBtn} onClick={() => setCertGeneratorOpen(true)}>+ Generate Certificate</button>
                )}
              </div>
              {certificates.length === 0 ? <EmptyState text="No certificates issued yet." /> : (
                <div style={styles.certGrid}>
                  {certificates.map((c) => (
                    <div key={c.id} style={{ ...styles.certCard, position: "relative", cursor: "pointer" }} onClick={() => openCertificate(c.id)}>
                      <CardActionMenu
                        items={[
                          { label: "Print", onClick: () => openCertificate(c.id, "print") },
                          { label: "Download PDF", onClick: () => openCertificate(c.id, "download") },
                          ...(user.role !== "admitting" ? [{ label: "Delete", danger: true, onClick: () => handleDeleteCertificate(c.id) }] : []),
                        ]}
                      />
                      <div style={styles.certCardIcon}>{NAV_ICONS.certificates}</div>
                      <div style={styles.certCardTitle}>Certificate of Completion</div>
                      <div style={styles.certCardMeta}>{c.completion_date ? `Completed ${fmtDateTime(c.completion_date)}` : ""}</div>
                      <div style={styles.certCardFooter}>
                        <span>{c.issued_by_name || "—"}</span>
                        <span>{fmtDateTime(c.issued_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeSection === "history" ? (
            <div>
              <SectionHeader icon={NAV_ICONS.history} title="History" />
              {history.length === 0 ? <EmptyState text="No history recorded for this patient yet." /> : (
                <SimpleTable columns={["Action", "By", "Date"]} rows={history.map((h) => [h.action, h.actor_username, fmtDateTime(h.created_at)])} />
              )}
            </div>
          ) : null}
        </div>
      </div>

      {noteModal && (
        <ProgressNoteModal
          patientId={id}
          note={noteModal.id ? noteModal : null}
          onClose={() => setNoteModal(null)}
          onSaved={() => { setNoteModal(null); loadAll(); }}
        />
      )}
      {followUpModalOpen && (
        <FollowUpModal
          patientId={id}
          onClose={() => setFollowUpModalOpen(false)}
          onSaved={() => { setFollowUpModalOpen(false); loadAll(); }}
        />
      )}
      {completingFollowUpId && (
        <CompleteFollowUpModal
          followUpId={completingFollowUpId}
          onClose={() => setCompletingFollowUpId(null)}
          onSaved={() => { setCompletingFollowUpId(null); loadAll(); }}
        />
      )}
      {certGeneratorOpen && (
        <CertificateGeneratorModal
          patientId={id}
          onClose={() => setCertGeneratorOpen(false)}
          onGenerated={refreshCertificates}
        />
      )}
      {viewingCertificateId && (
        <CertificateViewModal
          certificateId={viewingCertificateId}
          autoAction={certAction}
          onClose={() => setViewingCertificateId(null)}
        />
      )}
    </AppShell>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div style={styles.sectionHeader}>
      <span style={styles.sectionHeaderIcon}>{icon}</span>
      <span style={styles.sectionHeaderTitle}>{title}</span>
    </div>
  );
}

function Field({ label, span, children }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <div style={styles.fieldLabel}>{label}</div>
      <div style={styles.fieldValue}>{children}</div>
    </div>
  );
}

function EditField({ label, editing, value, onChange, type = "text", options, span, display }) {
  if (!editing) {
    let shown = display ?? value;
    if (type === "select" && options && !display) {
      const match = options.find((o) => (typeof o === "object" ? String(o.value) === String(value) : o === value));
      shown = match ? (typeof match === "object" ? match.label : match) : "—";
    }
    return <Field label={label} span={span}>{shown || "—"}</Field>;
  }

  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <div style={styles.fieldLabel}>{label}</div>
      {type === "select" ? (
        <select style={styles.input} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select</option>
          {options.map((o) => {
            const val = typeof o === "object" ? o.value : o;
            const lbl = typeof o === "object" ? o.label : o;
            return <option key={val} value={val}>{lbl}</option>;
          })}
        </select>
      ) : type === "textarea" ? (
        <textarea style={{ ...styles.input, minHeight: 70 }} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={type} style={styles.input} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function StatChip({ label, value }) {
  return (
    <div style={styles.statChip}>
      <div style={styles.statChipValue}>{value}</div>
      <div style={styles.statChipLabel}>{label}</div>
    </div>
  );
}

function EmptyState({ text }) {
  return <SharedEmptyState title={text} />;
}

function SimpleTable({ columns, rows }) {
  return (
    <table style={styles.table}>
      <thead><tr>{columns.map((c) => <th key={c} style={styles.th}>{c}</th>)}</tr></thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>{row.map((cell, j) => <td key={j} style={styles.td}>{cell}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

const styles = {
  loading: { padding: 40, textAlign: "center", color: "var(--color-text-muted)" },
  card: { background: "var(--color-surface)", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-lg)", padding: 32 },
  emptyText: { color: "var(--color-text-muted)", fontSize: 14 },

  headerCard: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "var(--color-surface)", border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 20,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 16 },
  avatarWrap: { position: "relative", width: 64, height: 64 },
  avatarImg: { width: 64, height: 64, borderRadius: "50%", objectFit: "cover" },
  avatarPlaceholder: {
    width: 64, height: 64, borderRadius: "50%", background: "var(--color-primary-tint)",
    color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 24, fontWeight: 800,
  },
  avatarEditBtn: {
    position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
    fontSize: 10, fontWeight: 700, background: "var(--color-primary-dark)", color: "#fff",
    border: "none", borderRadius: 999, padding: "3px 8px", cursor: "pointer", whiteSpace: "nowrap",
  },
  headerName: { fontSize: 18, fontWeight: 800, color: "var(--color-text)" },
  headerMeta: { fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  statusBadge: { fontSize: 12, fontWeight: 700, textTransform: "capitalize", padding: "6px 12px", borderRadius: 999 },
  editBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  cancelBtn: { background: "none", border: "1px solid var(--color-border)", padding: "10px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  saveBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer" },

  layout: { display: "flex", gap: 20, alignItems: "flex-start" },
  sideNav: {
    width: 220, flexShrink: 0, background: "var(--color-surface)", border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)", padding: 12, display: "flex", flexDirection: "column", gap: 2,
    position: "sticky", top: 20,
  },
  sideNavGroupLabel: { fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4, padding: "6px 10px" },
  sideNavItem: {
    display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: "var(--radius-sm)",
    fontSize: 13, fontWeight: 600, color: "var(--color-text)", background: "none", border: "none",
    cursor: "pointer", textAlign: "left",
  },
  sideNavItemActive: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)" },
  sideNavIcon: { width: 16, height: 16, flexShrink: 0, display: "flex" },

  content: {
    flex: 1, background: "var(--color-surface)", border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md, 10px)", padding: 24, minHeight: 400,
  },
  mergedScroll: { display: "flex", flexDirection: "column", gap: 24 },
  sectionDivider: { borderTop: "1px solid var(--color-border)" },

  sectionHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionHeaderIcon: { width: 20, height: 20, color: "var(--color-primary-dark)", display: "flex" },
  sectionHeaderTitle: { fontSize: 15, fontWeight: 700, color: "var(--color-text)" },

  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  fieldLabel: { fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 },
  fieldValue: { fontSize: 14, color: "var(--color-text)" },
  input: { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13, fontFamily: "inherit" },

  statsRow: { display: "flex", gap: 12, marginBottom: 20 },
  statChip: { background: "var(--color-primary-tint)", borderRadius: "var(--radius-sm)", padding: "12px 18px", minWidth: 130 },
  statChipValue: { fontSize: 20, fontWeight: 800, color: "var(--color-primary-dark)" },
  statChipLabel: { fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 },

  emptyState: { padding: 40, textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 },
  list: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 14,
    alignItems: "start",
  },
  noteCard: { border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: 14 },
  noteHeader: { display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 },
  noteMeta: { color: "var(--color-text-muted)" },
  noteContent: { fontSize: 13, color: "var(--color-text)", margin: 0, lineHeight: 1.6 },

  subTabBar: { display: "flex", gap: 4, marginBottom: 18, borderBottom: "1px solid var(--color-border)" },
  subTabButton: { padding: "9px 4px", marginRight: 20, fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", background: "none", border: "none", borderBottom: "2px solid transparent", cursor: "pointer" },
  subTabButtonActive: { color: "var(--color-text)", borderBottom: "2px solid var(--color-primary-dark)" },
  editLink: { background: "none", border: "none", color: "var(--color-primary-dark)", fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0 },
  statusBadgeSm: { fontSize: 11, fontWeight: 700, textTransform: "capitalize", padding: "3px 9px", borderRadius: 999 },
  statusPending: { background: "#FFF3D6", color: "#9A6B00" },
  statusCompleted: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)" },
  timelineScroll: { display: "flex", flexDirection: "column", gap: 18, paddingLeft: 8, maxHeight: 420, overflowY: "auto" },
  timeline: { display: "flex", flexDirection: "column", gap: 20, paddingLeft: 8 },
  timelineItem: { display: "flex", gap: 12 },
  timelineDot: { width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)", marginTop: 6, flexShrink: 0 },

  generateBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "9px 16px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 700, cursor: "pointer" },

  certGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 },
  certCard: { textAlign: "left", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 18, cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 },
  certCardIcon: { width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center" },
  certCardTitle: { fontSize: 14, fontWeight: 700, color: "var(--color-text)" },
  certCardMeta: { fontSize: 12, color: "var(--color-text-muted)" },
  certCardFooter: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-muted)", marginTop: 6, paddingTop: 8, borderTop: "1px solid var(--color-border)" },

  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" },
  td: { padding: "10px 12px", borderBottom: "1px solid var(--color-border)", textTransform: "capitalize" },
  archivedBadge: { fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 999, background: "#F1F1EE", color: "var(--color-text-muted)" },
  archiveProfileBtn: { background: "none", border: "1px solid var(--color-border)", padding: "10px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  restoreProfileBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer" },
};