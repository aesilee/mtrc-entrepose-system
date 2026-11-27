import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import ProgressNoteModal from "../components/ProgressNoteModal.jsx";
import RecordAttendanceModal from "../components/RecordAttendanceModal.jsx";
import FollowUpModal from "../components/FollowUpModal.jsx";
import CompleteFollowUpModal from "../components/CompleteFollowUpModal.jsx";
import SharedEmptyState from "../components/EmptyState.jsx";
import StatutoryCertificateModal from "../components/StatutoryCertificateModal.jsx";
import DrugTestModal from "../components/DrugTestModal.jsx";
import TreatmentPlanModal from "../components/TreatmentPlanModal.jsx";
import CourtProgressReportModal from "../components/CourtProgressReportModal.jsx";
import DischargeModal from "../components/DischargeModal.jsx";
import TransmittalNoticeModal from "../components/TransmittalNoticeModal.jsx";
import InterventionModal, { INTERVENTION_OPTIONS, CONSULT_OPTIONS } from "../components/InterventionModal.jsx";
import CardActionMenu from "../components/CardActionMenu.jsx";
import ArchiveConfirmModal from "../components/ArchiveConfirmModal.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import Toast from "../components/Toast.jsx";

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

const EDUCATION_OPTIONS = [
  "Elementary level",
  "Elementary graduate",
  "High school level",
  "High school graduate",
  "Vocational or technical",
  "College level",
  "College graduate",
  "Postgraduate",
];

const SUFFIX_OPTIONS = ["Jr.", "Sr.", "II", "III", "IV", "V"];
const LIVING_ARRANGEMENT_OPTIONS = ["With Parents", "With Relatives", "Boarding House", "Living Alone"];

const CONTACT_METHOD_OPTIONS = [
  { value: "call", label: "Phone call" },
  { value: "sms", label: "SMS or text message" },
  { value: "email", label: "Email" },
  { value: "other", label: "Other" },
];

const STANDARD_CONTACT_METHODS = new Set(["call", "sms", "email", "other"]);

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageCase = ["case_manager", "ict_admin"].includes(user.role);
  const [patient, setPatient] = useState(null);
  const [caseSubTab, setCaseSubTab] = useState("summary");
  const [followUps, setFollowUps] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [noteModal, setNoteModal] = useState(null); // null closed, {} = new, note object = edit
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [drugTestModalOpen, setDrugTestModalOpen] = useState(false);
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [reviewAttRecord, setReviewAttRecord] = useState(null);
  const [reviewAttForm, setReviewAttForm] = useState({
    status: "present",
    completionStatus: "CREDITED",
    arrivalTime: "",
    decisionReason: "",
    authorizedByName: "",
    isMakeup: false,
    makeupForAttendanceId: "",
    relapseRisk: "SAFE",
    staffRiskAssessment: "",
  });
  const [reviewAttSaving, setReviewAttSaving] = useState(false);
  const [treatmentPlanModalOpen, setTreatmentPlanModalOpen] = useState(false);
  const [treatmentPlan, setTreatmentPlan] = useState(null);
  const [courtReportModalOpen, setCourtReportModalOpen] = useState(false);
  
  const [milestones, setMilestones] = useState(null);
  const [milestoneHistory, setMilestoneHistory] = useState([]);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [drugTests, setDrugTests] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [interventionSummary, setInterventionSummary] = useState(null);
  const [interventionModalOpen, setInterventionModalOpen] = useState(false); // false | true | { ...intervention }
  
  const [statutoryCertModal, setStatutoryCertModal] = useState(null);
  const [showTransmittalModal, setShowTransmittalModal] = useState(false);
  const [durationModalOpen, setDurationModalOpen] = useState(false);
  const [durationSaving, setDurationSaving] = useState(false);
  const [durationForm, setDurationForm] = useState({
    changeType: "EXTENSION",
    additionalExtensionMonths: 3,
    requiredDurationMonths: 7,
    durationBasis: "STANDARD_PROGRAM",
    durationBasisDetail: "",
    agreedStartDate: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
    approvedByName: "",
    reason: "",
  });

  const [archivingCertificate, setArchivingCertificate] = useState(null);
  const [archivingPatient, setArchivingPatient] = useState(false);
  const [restoringPatient, setRestoringPatient] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleArchiveCertificate(reason) {
    await api.post(`/certificates/issuances/${archivingCertificate.id}/archive`, { reason });
    if (statutoryCertModal && statutoryCertModal.id === archivingCertificate.id) {
      setStatutoryCertModal(null);
    }
    setArchivingCertificate(null);
    setToast("Certificate archived.");
    refreshCertificates();
  }

  async function handleArchivePatient(reason) {
    await api.post(`/archives/patients/${id}/archive`, { reason });
    setArchivingPatient(false);
    setToast("Patient archived.");
    loadAll();
  }

  async function handleRestorePatient() {
    await api.post(`/archives/patients/${id}/restore`);
    setRestoringPatient(false);
    setToast("Patient restored.");
    loadAll();
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
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef(null);
  const personalRef = useRef(null);
  const admissionRef = useRef(null);
  const rehabRef = useRef(null);
  const sectionRefs = { personal: personalRef, admission: admissionRef, rehab: rehabRef };

  function loadAll() {
    setLoading(true);
    // Admitting personnel may open the profile but not clinical records (the API answers 403),
    // so clinical requests fall back to empty data instead of failing the whole profile.
    const optional = (request, fallback) => request.catch(() => ({ data: fallback }));
    Promise.all([
      api.get(`/patients/${id}`),
      optional(api.get(`/patients/${id}/attendance`), { attendance: [] }),
      optional(api.get(`/patients/${id}/progress-notes`), { progressNotes: [] }),
      optional(api.get(`/certificates/${id}/history`), { history: [] }),
      optional(api.get(`/patients/${id}/history`), { history: [] }),
      optional(api.get(`/patients/${id}/follow-ups`), { followUps: [] }),
      optional(api.get(`/patients/${id}/timeline`), { timeline: [] }),
      api.get("/users/case-managers"),
      api.get("/programs"),
      optional(api.get(`/case-management/patients/${id}/milestones`), { milestones: {}, history: [] }),
      optional(api.get(`/case-management/patients/${id}/sessions/summary`), null),
      optional(api.get(`/case-management/patients/${id}/drug-tests`), { drugTests: [] }),
      api.get(`/case-management/patients/${id}/treatment-plan`).catch(() => ({ data: { treatmentPlan: null } })),
      api.get(`/case-management/patients/${id}/interventions`).catch(() => ({ data: { interventions: [], summary: {} } })),
      api.get(`/patients/${id}/assignment-history`).catch(() => ({ data: { history: [] } })),
    ]).then(([p, a, pn, c, h, fu, tl, cm, pr, ms, ss, dt, tp, interv, assignH]) => {
      setPatient(p.data.patient);
      setForm(toFormState(p.data.patient));
      setAttendance(a.data.attendance);
      setProgressNotes(pn.data.progressNotes);
      setCertificates(c.data.history || []);
      setHistory(h.data.history);
      setFollowUps(fu.data.followUps);
      setTimeline(tl.data.timeline);
      setCaseManagers(cm.data.caseManagers);
      setPrograms(pr.data.programs);
      setMilestones(ms.data.milestones || {});
      setMilestoneHistory(ms.data.history || []);
      setSessionSummary(ss.data);
      setDrugTests(dt.data.drugTests || []);
      setTreatmentPlan(tp?.data?.treatmentPlan || null);
      setInterventions(interv?.data?.interventions || []);
      setInterventionSummary(interv?.data?.summary || null);
      setAssignmentHistory(assignH?.data?.history || []);
    }).catch(err => {
      console.error("Error loading patient profile data:", err);
    }).finally(() => setLoading(false));
  }

  function refreshCertificates() {
    // Same source as the initial load: issued certificates (certificate_issuances)
    Promise.all([
      api.get(`/certificates/${id}/history`),
      api.get(`/patients/${id}/timeline`),
    ]).then(([c, tl]) => {
      setCertificates(c.data.history || []);
      setTimeline(tl.data.timeline);
    }).catch(err => {
      console.error("Error refreshing certificates:", err);
    });
  }

  async function handleDeleteIntervention(interventionId) {
    if (!window.confirm("Are you sure you want to delete this clinical intervention record?")) return;
    try {
      await api.delete(`/case-management/patients/${id}/interventions/${interventionId}`);
      setToast("Intervention record deleted.");
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete intervention.");
    }
  }

  function handlePrintTreatmentPlan() {
    if (!treatmentPlan) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the Treatment Plan.");
      return;
    }

    const domainLabels = {
      SUBSTANCE_DEPENDENCE: "Substance Dependence & Craving Management",
      LEGAL_RTC: "Legal / RTC Plea Bargaining Compliance",
      FAMILY_INTERPERSONAL: "Family Conflict & Social Environment",
      VOCATIONAL_EMPLOYMENT: "Vocational & Economic Stability",
      HEALTH_COMORBIDITIES: "Physical Health & Co-occurring Conditions",
    };

    const modalityLabels = {
      CBT_GROUP: "CBT Group Counseling (28 Sessions)",
      PSYCHO_EDUCATION: "Psycho-Education Meetings (12 Sessions)",
      CBT_E: "CBT Evaluations (3 Sessions)",
      CONJOINT_FAMILY: "Conjoint / Family Sessions",
      INDIVIDUAL_COUNSELING: "Individual Counseling",
      DRUG_TESTING: "Surveillance Urine Drug Screening",
      SHGM: "Self-Help Group Meetings (SHGM)",
    };

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Individualized Treatment Plan - ${patient?.full_name || "Patient"}</title>
  <style>
    @page { size: portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11pt; color: #111; line-height: 1.45; padding: 10px; }
    .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 16px; }
    .header h4 { margin: 0; font-size: 9.5pt; font-weight: normal; text-transform: uppercase; color: #555; }
    .header h3 { margin: 2px 0; font-size: 11.5pt; font-weight: bold; }
    .header h2 { margin: 6px 0 2px; font-size: 13.5pt; font-weight: 800; color: #0d4a2b; letter-spacing: 0.5px; }
    .header p { margin: 0; font-size: 9pt; color: #666; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .meta-table td { padding: 6px 8px; border: 1px solid #ccc; font-size: 10pt; }
    .meta-label { font-weight: bold; background: #f7fafc; width: 22%; color: #4a5568; }
    .section-title { font-size: 10.5pt; font-weight: bold; background: #edf2f7; padding: 6px 10px; margin: 14px 0 8px; border-left: 4px solid #1A7F4B; text-transform: uppercase; letter-spacing: 0.3px; }
    .content-box { padding: 8px 12px; border: 1px solid #e2e8f0; min-height: 40px; font-size: 10pt; white-space: pre-wrap; line-height: 1.5; background: #fafafa; border-radius: 4px; }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
    .badge { display: inline-block; padding: 3px 8px; background: #edf2f7; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 9pt; font-weight: 600; margin-right: 4px; margin-bottom: 4px; }
    .sig-row { display: flex; justify-content: space-between; margin-top: 48px; padding-top: 10px; }
    .sig-block { width: 44%; text-align: center; }
    .sig-line { border-top: 1px solid #000; margin-top: 45px; padding-top: 4px; font-weight: bold; font-size: 10pt; }
    .sig-title { font-size: 8.5pt; color: #555; }
  </style>
</head>
<body>
  <div class="header">
    <h4>Republic of the Philippines · Department of Health</h4>
    <h3>MALINAO TREATMENT AND REHABILITATION CENTER</h3>
    <h2>INDIVIDUALIZED TREATMENT PLAN (ITP)</h2>
    <p>ENTREPOSE Outpatient Rehabilitation & Aftercare Program</p>
  </div>

  <table class="meta-table">
    <tr>
      <td class="meta-label">Patient Name:</td>
      <td><strong>${patient?.full_name || "—"}</strong></td>
      <td class="meta-label">PWUD Code:</td>
      <td><strong>${patient?.patient_code || "—"}</strong></td>
    </tr>
    <tr>
      <td class="meta-label">Admission Date:</td>
      <td>${fmtDate(patient?.admission_date)}</td>
      <td class="meta-label">Plan Formulation Date:</td>
      <td>${fmtDate(treatmentPlan.plan_date)}</td>
    </tr>
    <tr>
      <td class="meta-label">Handling Case Manager:</td>
      <td>${treatmentPlan.case_manager_name || user?.full_name || "—"}</td>
      <td class="meta-label">Target Completion:</td>
      <td>${fmtDate(treatmentPlan.target_completion_date)}</td>
    </tr>
    <tr>
      <td class="meta-label">Legal Status:</td>
      <td colspan="3">${patient?.nature_of_confinement === "court_mandated" ? `Court-Mandated (Plea Bargaining) · RTC Branch ${patient?.court_branch || "—"}` : "Voluntary Admission"}</td>
    </tr>
  </table>

  <div class="section-title">1. Identified Clinical & Psychosocial Problem Domains</div>
  <div>
    ${(treatmentPlan.problem_domains || []).map(d => `<span class="badge">✓ ${domainLabels[d] || d.replace(/_/g, " ")}</span>`).join(" ")}
  </div>

  <div class="section-title">2. Measurable Treatment Goals & Curriculum Objectives</div>
  <div class="content-box">${treatmentPlan.primary_goals || "—"}</div>

  <div class="section-title">3. Prescribed Rehabilitation Interventions</div>
  <div>
    ${(treatmentPlan.intervention_modalities || []).map(m => `<span class="badge">✓ ${modalityLabels[m] || m.replace(/_/g, " ")}</span>`).join(" ")}
  </div>

  <div class="section-title">4. Relapse Prevention & Coping Protocol</div>
  <div class="content-box">${treatmentPlan.relapse_prevention_plan || "—"}</div>

  <div class="sig-row">
    <div class="sig-block">
      <div class="sig-line">${patient?.full_name || "Client Signature"}</div>
      <div class="sig-title">Client Signature / Commitment</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">${treatmentPlan.case_manager_name || user?.full_name || "Case Manager"}</div>
      <div class="sig-title">Registered Case Manager / Clinician</div>
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  useEffect(loadAll, [id]);

  function toFormState(p) {
    const savedContactMethod = p.emergency_contact_method || "";
    const customContactMethod = savedContactMethod && !STANDARD_CONTACT_METHODS.has(savedContactMethod)
      ? savedContactMethod
      : "";

    return {
      firstName: p.first_name || "", middleName: p.middle_name || "", lastName: p.last_name || "", suffix: p.suffix || "",
      preferredName: p.preferred_name || "",
      gender: p.gender || "", birthdate: toInputDate(p.birthdate), civilStatus: p.civil_status || "single",
      nationality: p.nationality || "", occupation: p.occupation || "", educationalAttainment: p.educational_attainment || "",
      religion: p.religion || "", livingArrangement: p.living_arrangement || "",
      estimatedFamilyMonthlyIncome: p.estimated_family_monthly_income ?? "",
      contactNumber: p.contact_number || "", email: p.email || "", address: p.address || "", municipality: p.municipality || "",
      province: p.province || "", postalCode: p.postal_code || "",
      emergencyContactName: p.emergency_contact_name || "", emergencyContactRelationship: p.emergency_contact_relationship || "",
      emergencyContactNumber: p.emergency_contact_number || "", emergencyContactEmail: p.emergency_contact_email || "",
      emergencyContactAddress: p.emergency_contact_address || "",
      emergencyContactMethod: customContactMethod ? "other" : savedContactMethod,
      emergencyContactMethodOther: customContactMethod,
      guardianName: p.guardian_name || "", guardianRelationship: p.guardian_relationship || "",
      guardianContactNumber: p.guardian_contact_number || "", guardianAddress: p.guardian_address || "",
      admissionDate: toInputDate(p.admission_date),
      rehabStartDate: toInputDate(p.rehab_start_date) || toInputDate(p.admission_date),
      referralSource: p.referral_source || "", admissionType: p.admission_type || "",
      programId: p.program_id || "", assignedCaseManagerId: p.assigned_case_manager_id || "",
      admissionNotes: p.admission_notes || "", initialAssessment: p.initial_assessment || "",
      enrollmentStatus: p.enrollment_status || "pending", statusRemark: "",
      currentStatus: p.current_status || "", programPhase: p.program_phase || "",
      requiredDurationMonths: p.required_duration_months ?? 7,
      durationBasis: p.duration_basis || "STANDARD_PROGRAM",
      durationBasisDetail: p.duration_basis_detail || "",
      extensionMonths: p.extension_months ?? 0,
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
    if (form.emergencyContactMethod === "other" && !form.emergencyContactMethodOther.trim()) {
      setToast("Specify the preferred contact method when Other is selected.");
      return;
    }

    if (form.emergencyContactMethod === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emergencyContactEmail.trim())) {
      setToast("Enter a valid emergency contact email address.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        emergencyContactMethod: form.emergencyContactMethod === "other"
          ? form.emergencyContactMethodOther.trim()
          : form.emergencyContactMethod,
      };
      delete payload.emergencyContactMethodOther;
      delete payload.requiredDurationMonths;
      delete payload.durationBasis;
      delete payload.durationBasisDetail;
      delete payload.extensionMonths;
      await api.put(`/patients/${id}`, payload);
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

  const nonCancelledAttendance = attendance.filter((a) => a.status !== "cancelled");
  const presentCount = attendance.filter((a) => a.status === "present" || a.status === "late").length;
  const creditedCount = attendance.filter(
    (a) =>
      (a.status === "present" || a.status === "late") &&
      (a.completion_status || (a.status === "present" ? "CREDITED" : "NOT_CREDITED")) === "CREDITED" &&
      !a.is_duplicate_topic
  ).length;
  const pendingReviewCount = attendance.filter((a) => a.completion_status === "PENDING_REVIEW").length;
  const lateCount = attendance.filter((a) => a.status === "late").length;
  const excusedCount = attendance.filter((a) => a.status === "excused").length;
  const missedCount = attendance.filter((a) => a.status === "absent").length;
  const outstandingReqCount = attendance.filter(
    (a) => (a.status === "absent" || a.status === "excused") && !a.fulfilled_by_makeup_id
  ).length;
  const makeupCreditedCount = attendance.filter(
    (a) => Boolean(a.is_makeup) && a.completion_status === "CREDITED"
  ).length;
  const repeatTopicCount = attendance.filter((a) => Boolean(a.is_duplicate_topic)).length;
  const cancelledCount = attendance.filter((a) => a.status === "cancelled").length;
  const attendancePct = nonCancelledAttendance.length
    ? Math.round((presentCount / nonCancelledAttendance.length) * 100)
    : null;

  function openAttendanceReview(rec) {
    setReviewAttRecord(rec);
    setReviewAttForm({
      status: rec.status || "present",
      completionStatus: rec.completion_status || (rec.status === "present" ? "CREDITED" : "NOT_CREDITED"),
      arrivalTime: rec.arrival_time ? String(rec.arrival_time).slice(0, 5) : "",
      decisionReason: rec.decision_reason || "",
      authorizedByName: rec.authorized_by_name || user?.full_name || user?.username || "",
      isMakeup: Boolean(rec.is_makeup),
      makeupForAttendanceId: rec.makeup_for_attendance_id ? String(rec.makeup_for_attendance_id) : "",
      relapseRisk: rec.relapse_risk || "",
      staffRiskAssessment: rec.staff_risk_assessment || "",
    });
  }

  async function handleSaveAttendanceReview(e) {
    e.preventDefault();
    if (!reviewAttRecord) return;
    setReviewAttSaving(true);
    try {
      await api.put(`/attendance/${reviewAttRecord.id}/completion`, reviewAttForm);
      setReviewAttRecord(null);
      setToast("Participation and completion decision updated.");
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || "Could not update completion decision.");
    } finally {
      setReviewAttSaving(false);
    }
  }
  const durSummary = sessionSummary?.durationSummary || patient?.duration_summary || null;
  const durationSummary = durSummary || {};
  const durationHistory = patient?.duration_history || [];
  const isDurationMet = durSummary ? Boolean(durSummary.isDurationMet) : true;
  const isFullCompletionReady = Boolean(sessionSummary?.isCoreComplete && isDurationMet);

  function openDurationModal(initialMode = "EXTENSION") {
    setDurationForm({
      changeType: initialMode,
      additionalExtensionMonths: 3,
      requiredDurationMonths: durSummary?.baseDurationMonths ?? patient?.required_duration_months ?? 7,
      durationBasis: durSummary?.durationBasis || patient?.duration_basis || "STANDARD_PROGRAM",
      durationBasisDetail: durSummary?.durationBasisDetail || patient?.duration_basis_detail || "",
      agreedStartDate: durSummary?.agreedStartDate || toInputDate(patient?.rehab_start_date) || toInputDate(patient?.admission_date) || new Date().toISOString().slice(0, 10),
      effectiveDate: new Date().toISOString().slice(0, 10),
      approvedByName: user?.full_name || user?.username || "",
      reason: "",
    });
    setDurationModalOpen(true);
  }

  async function handleSaveDurationChange(e) {
    e.preventDefault();
    setDurationSaving(true);
    try {
      const { data } = await api.post(`/patients/${id}/duration-change`, durationForm);
      setDurationModalOpen(false);
      setToast(data.message || "Program duration updated.");
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || "Could not update program duration.");
    } finally {
      setDurationSaving(false);
    }
  }

  const statusStyle = STATUS_COLORS[patient.enrollment_status] || STATUS_COLORS.pending;
  const isMergedSection = PROFILE_SECTIONS.some((s) => s.key === activeSection);

  return (
    <AppShell title="Patient Profile" description="View and manage this patient's personal, admission, and rehabilitation records.">
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
            <div style={styles.headerMeta}>{patient.pwud_code || patient.patient_code} · {patient.municipality || "—"}</div>
          </div>
        </div>
                <div style={styles.headerRight}>
          {!!patient.is_archived && <span style={styles.archivedBadge}>Archived</span>}
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
                patient.is_archived ? (
                  <button type="button" style={styles.editBtn} onClick={() => setRestoringPatient(true)}>Restore</button>
                ) : (
                  <button type="button" style={styles.cancelBtn} onClick={() => setArchivingPatient(true)}>Archive</button>
                )
              )}
            </>
          )}
        </div>
      </div>

      {(!patient.admission_date || patient.enrollment_status === "pending") && (
        <div style={styles.pendingBanner}>
          <div style={styles.pendingBannerText}>
            <span style={{ fontWeight: 700, color: "var(--color-warning-dark, #8a5719)" }}>
              Enrollment Incomplete (Pending Intake Workflow)
            </span>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              This client has not finalized their intake registration. Complete all required intake steps to activate their admission record on the Case Manager caseload and OP CM Tracker.
            </span>
          </div>
          {user.role !== "him_staff" && (
            <button
              type="button"
              style={styles.resumeBtn}
              onClick={() => {
                navigate(`/patients/${patient.id}/referral`);
              }}
            >
              Resume Intake Workflow →
            </button>
          )}
        </div>
      )}

      {patient.enrollment_status === "active" && isFullCompletionReady && (
        <div style={{ ...styles.pendingBanner, background: "#f0fff4", borderColor: "#68d391" }}>
          <div style={styles.pendingBannerText}>
            <span style={{ fontWeight: 700, color: "#22543d" }}>
              🎓 Clinical Milestone Alert: Ready for Pre-Discharge Conference (PDC)
            </span>
            <span style={{ fontSize: 13, color: "#2f855a" }}>
              Client has completed all 43 core curriculum requirements (CBT {sessionSummary?.components?.cbt?.completed ?? 28}/28 · CBT-E {sessionSummary?.components?.cbte?.completed ?? 3}/3 · PE {sessionSummary?.components?.pe?.completed ?? 12}/12) and met the mandated {durSummary?.totalRequiredMonths ?? 7}-month duration ({durSummary?.durationBasisLabel || "Standard Program"}). Convene PDC and process formal program discharge.
            </span>
          </div>
          {canManageCase && (
            <button
              type="button"
              style={{ ...styles.resumeBtn, background: "#276749" }}
              onClick={() => setDischargeModalOpen(true)}
            >
              Process Program Discharge →
            </button>
          )}
        </div>
      )}

      {patient.enrollment_status === "active" &&
        sessionSummary?.isCoreComplete &&
        !isDurationMet && (
          <div style={{ ...styles.pendingBanner, background: "#EFF6FF", borderColor: "#93C5FD" }}>
            <div style={styles.pendingBannerText}>
              <span style={{ fontWeight: 700, color: "#1E40AF" }}>
                ⏳ All 43 Core Curriculum Requirements Completed — Mandated Program Duration In Progress ({durSummary?.monthsElapsed ?? 0} of {durSummary?.totalRequiredMonths ?? 12} Months)
              </span>
              <span style={{ fontSize: 13, color: "#1E3A8A" }}>
                Client has completed all 43 core topics, but is enrolled under a mandated <strong>{durSummary?.totalRequiredMonths ?? 12}-month requirement</strong> ({durSummary?.durationBasisLabel}{durSummary?.extensionMonths > 0 ? `, including +${durSummary.extensionMonths} mo. approved extension` : ""}). Expected completion date: <strong>{fmtDate(durSummary?.expectedCompletionDate || patient.expected_completion_date)}</strong> ({durSummary?.remainingMonths ?? 0} month(s) remaining). Client does not become eligible early based on a fixed 7-month default.
              </span>
            </div>
          </div>
        )}

      {patient.enrollment_status === "active" &&
        !sessionSummary?.isCoreComplete &&
        (sessionSummary?.tallies?.totalPhysicalAttended ?? presentCount) >= 43 && (
          <div style={{ ...styles.pendingBanner, background: "#FFFBEB", borderColor: "#FCD34D" }}>
            <div style={styles.pendingBannerText}>
              <span style={{ fontWeight: 700, color: "#92400E" }}>
                ⚠️ {sessionSummary?.tallies?.totalPhysicalAttended ?? presentCount} Activities Attended — Core Curriculum Incomplete ({sessionSummary?.attendedCore ?? 0} / 43 Core Requirements)
              </span>
              <span style={{ fontSize: 13, color: "#78350F" }}>
                Attending 43 total activities does not automatically complete the program. Approved core credits: CBT {sessionSummary?.components?.cbt?.completed ?? sessionSummary?.cbtGroup ?? 0}/28 · CBT-E {sessionSummary?.components?.cbte?.completed ?? sessionSummary?.cbteCompleted ?? 0}/3 · PE {sessionSummary?.components?.pe?.completed ?? sessionSummary?.psychoEd ?? 0}/12. {sessionSummary?.missingRequirements?.summaryText || ""}
              </span>
            </div>
          </div>
        )}

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
              if (user.role === "admitting" && (s.key === "case-notes" || s.key === "attendance" || s.key === "progress")) return false;
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
                  <EditField label="Suffix" editing={editing} type="select" options={SUFFIX_OPTIONS} value={form.suffix} onChange={(v) => update("suffix", v)} />
                  <EditField label="Preferred name" editing={editing} value={form.preferredName} onChange={(v) => update("preferredName", v)} />
                  <EditField label="Sex" editing={editing} type="select" options={["male", "female", "other"]} value={form.gender} onChange={(v) => update("gender", v)} />
                  <EditField label="Birthdate" editing={editing} type="date" value={form.birthdate} onChange={(v) => update("birthdate", v)} display={fmtDate(patient.birthdate)} />
                  <Field label="Age">{calcAge(form.birthdate)}</Field>
                  <EditField label="Civil status" editing={editing} type="select" options={["single", "married", "widowed", "separated"]} value={form.civilStatus} onChange={(v) => update("civilStatus", v)} />
                  <EditField label="Nationality" editing={editing} value={form.nationality} onChange={(v) => update("nationality", v)} />
                  <EditField label="Occupation" editing={editing} value={form.occupation} onChange={(v) => update("occupation", v)} />
                  <EditField label="Educational attainment" editing={editing} type="select" options={EDUCATION_OPTIONS} value={form.educationalAttainment} onChange={(v) => update("educationalAttainment", v)} />
                  <EditField label="Religion" editing={editing} value={form.religion} onChange={(v) => update("religion", v)} />
                  <EditField label="Living arrangement" editing={editing} type="select" options={LIVING_ARRANGEMENT_OPTIONS} value={form.livingArrangement} onChange={(v) => update("livingArrangement", v)} />
                  <EditField label="Estimated family monthly income" editing={editing} type="number" value={form.estimatedFamilyMonthlyIncome} onChange={(v) => update("estimatedFamilyMonthlyIncome", v)} display={patient.estimated_family_monthly_income == null ? "—" : `₱${Number(patient.estimated_family_monthly_income).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} />

                  <div style={styles.subsectionTitle}>Contact Information</div>
                  <EditField label="Home address" span={2} editing={editing} value={form.address} onChange={(v) => update("address", v)} />
                  <EditField label="Municipality" editing={editing} value={form.municipality} onChange={(v) => update("municipality", v)} />
                  <EditField label="Province" editing={editing} value={form.province} onChange={(v) => update("province", v)} />
                  <EditField label="Postal code" editing={editing} value={form.postalCode} onChange={(v) => update("postalCode", v)} />
                  <EditField label="Mobile number" editing={editing} value={form.contactNumber} onChange={(v) => update("contactNumber", v)} />
                  <EditField label="Email" editing={editing} value={form.email} onChange={(v) => update("email", v)} />

                  <div style={styles.subsectionTitle}>Emergency Contact</div>
                  <EditField label="Emergency contact name" editing={editing} value={form.emergencyContactName} onChange={(v) => update("emergencyContactName", v)} />
                  <EditField label="Relationship" editing={editing} value={form.emergencyContactRelationship} onChange={(v) => update("emergencyContactRelationship", v)} />
                  <EditField label="Emergency contact number" editing={editing} value={form.emergencyContactNumber} onChange={(v) => update("emergencyContactNumber", v)} />
                  <EditField
                    label="Preferred contact method" editing={editing} type="select" options={CONTACT_METHOD_OPTIONS}
                    value={form.emergencyContactMethod} onChange={(v) => update("emergencyContactMethod", v)}
                    display={form.emergencyContactMethod === "other" && form.emergencyContactMethodOther
                      ? form.emergencyContactMethodOther
                      : undefined}
                  />
                  {editing && form.emergencyContactMethod === "other" && (
                    <EditField label="Specify contact method" editing value={form.emergencyContactMethodOther} onChange={(v) => update("emergencyContactMethodOther", v.slice(0, 30))} />
                  )}
                  {(form.emergencyContactMethod === "email" || form.emergencyContactEmail) && (
                    <EditField label="Emergency contact email" editing={editing} type="email" value={form.emergencyContactEmail} onChange={(v) => update("emergencyContactEmail", v.slice(0, 255))} />
                  )}
                  <EditField label="Emergency contact address" span={2} editing={editing} value={form.emergencyContactAddress} onChange={(v) => update("emergencyContactAddress", v)} />

                  <div style={styles.subsectionTitle}>Guardian or Representative</div>
                  <EditField label="Guardian name" editing={editing} value={form.guardianName} onChange={(v) => update("guardianName", v)} />
                  <EditField label="Relationship" editing={editing} value={form.guardianRelationship} onChange={(v) => update("guardianRelationship", v)} />
                  <EditField label="Guardian contact number" editing={editing} value={form.guardianContactNumber} onChange={(v) => update("guardianContactNumber", v)} />
                  <EditField label="Guardian address" span={2} editing={editing} value={form.guardianAddress} onChange={(v) => update("guardianAddress", v)} />
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <SectionHeader icon={NAV_ICONS.rehab} title="Rehabilitation & Program Duration Information" />
                  {canManageCase && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        style={{ ...styles.generateBtn, background: "#fff", color: "#1B4332", border: "1px solid #1B4332", padding: "6px 12px", fontSize: 12 }}
                        onClick={() => openDurationModal("REQUIREMENT_CHANGE")}
                      >
                        ⚙️ Change Required Duration
                      </button>
                      <button
                        type="button"
                        style={{ ...styles.generateBtn, padding: "6px 12px", fontSize: 12 }}
                        onClick={() => openDurationModal("EXTENSION")}
                      >
                        ⏱️ + Record Approved Extension
                      </button>
                    </div>
                  )}
                </div>
                <div style={styles.grid}>
                  <EditField label="Current status" editing={editing} value={form.currentStatus} onChange={(v) => update("currentStatus", v)} />
                  <EditField label="Program phase" editing={editing} value={form.programPhase} onChange={(v) => update("programPhase", v)} />
                  <EditField
                    label="Agreed program start date"
                    editing={editing}
                    type="date"
                    value={form.rehabStartDate}
                    onChange={(v) => update("rehabStartDate", v)}
                    display={fmtDate(durationSummary.startDate || patient.rehab_start_date || patient.admission_date)}
                  />
                  <Field label="Required program duration">
                    <strong>{durationSummary.totalRequiredMonths || 7} Months</strong>
                    {(durationSummary.extensionMonths || 0) > 0 && (
                      <span style={{ marginLeft: 6, fontSize: 12, color: "#B45309", fontWeight: 700 }}>
                        ({durationSummary.requiredDurationMonths}m base + {durationSummary.extensionMonths}m extension)
                      </span>
                    )}
                  </Field>
                  <Field label="Requirement basis">
                    <span style={{ fontWeight: 600 }}>{durationSummary.durationBasisLabel || "Standard Outpatient Program (7 Months)"}</span>
                    {durationSummary.durationBasisDetail ? (
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                        Ref: {durationSummary.durationBasisDetail}
                      </div>
                    ) : null}
                  </Field>
                  <Field label="Months completed vs. required">
                    <strong style={{ color: durationSummary.isDurationMet ? "#166534" : "#1E293B" }}>
                      {durationSummary.elapsedMonths ?? 0} of {durationSummary.totalRequiredMonths ?? 7} months
                    </strong>{" "}
                    <span style={{ fontSize: 12, color: durationSummary.isDurationMet ? "#166534" : "#B45309", fontWeight: 600 }}>
                      ({durationSummary.isDurationMet ? "Duration Met" : `${durationSummary.remainingMonths ?? 0} mo remaining`})
                    </span>
                  </Field>
                  <EditField
                    label="Expected completion date"
                    editing={editing}
                    type="date"
                    value={form.expectedCompletionDate}
                    onChange={(v) => update("expectedCompletionDate", v)}
                    display={fmtDate(durationSummary.expectedCompletionDate || patient.expected_completion_date)}
                  />
                  <EditField label="Sessions required" editing={editing} type="number" value={form.sessionsRequired} onChange={(v) => update("sessionsRequired", v)} />
                  <Field label="Core curriculum completion (43 required)">
                    <strong>{sessionSummary?.attendedCore ?? 0} / 43</strong> ({sessionSummary?.percentage ?? 0}%) —{" "}
                    <span style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>
                      CBT {sessionSummary?.components?.cbt?.completed ?? sessionSummary?.cbtGroup ?? 0}/28 · CBT-E {sessionSummary?.components?.cbte?.completed ?? sessionSummary?.cbteCompleted ?? 0}/3 · PE {sessionSummary?.components?.pe?.completed ?? sessionSummary?.psychoEd ?? 0}/12
                    </span>
                  </Field>
                  <Field label="Supplementary services (tracked separately)">
                    <span style={{ fontSize: 13 }}>
                      SHGM: <strong>{sessionSummary?.supplementary?.shgm ?? sessionSummary?.shgm ?? 0}</strong> · Individual: <strong>{sessionSummary?.supplementary?.indCounseling ?? sessionSummary?.indCounseling ?? 0}</strong> · Family: <strong>{sessionSummary?.supplementary?.conjointFamily ?? sessionSummary?.conjointFamily ?? 0}</strong>
                      {(sessionSummary?.supplementary?.additionalPeMeetings ?? 0) > 0
                        ? ` · Extra PE Meetings: ${sessionSummary.supplementary.additionalPeMeetings}`
                        : ""}
                    </span>
                  </Field>
                  <Field label="Pending participation review">
                    {pendingReviewCount > 0 ? (
                      <span style={{ color: "#B45309", fontWeight: 700 }}>{pendingReviewCount} pending review</span>
                    ) : (
                      "0"
                    )}
                  </Field>
                  <Field label="Attendance rate (Present + Late)">
                    {attendancePct !== null ? `${attendancePct}%` : "—"}
                    {cancelledCount > 0 ? ` (${cancelledCount} center-cancelled excl.)` : ""}
                  </Field>
                </div>

                {durationHistory.length > 0 && (
                  <div style={{ marginTop: 18, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                      Preserved Duration & Extension History
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                        <thead>
                          <tr style={{ textAlign: "left", color: "#64748B", borderBottom: "1px solid #E2E8F0" }}>
                            <th style={{ padding: "6px 8px" }}>Action</th>
                            <th style={{ padding: "6px 8px" }}>Previous Requirement</th>
                            <th style={{ padding: "6px 8px" }}>Updated Requirement</th>
                            <th style={{ padding: "6px 8px" }}>Basis</th>
                            <th style={{ padding: "6px 8px" }}>Expected Completion</th>
                            <th style={{ padding: "6px 8px" }}>Reason</th>
                            <th style={{ padding: "6px 8px" }}>Approved By</th>
                            <th style={{ padding: "6px 8px" }}>Effective Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {durationHistory.map((h) => {
                            const extMonths = Number(h.extension_months ?? h.new_extension_months ?? 0);
                            const totalNewMonths = Number(h.total_duration_months || (Number(h.new_duration_months || 7) + extMonths));
                            return (
                              <tr key={h.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                                <td style={{ padding: "6px 8px", fontWeight: 700, color: h.change_type === "EXTENSION" ? "#B45309" : "#1E293B" }}>
                                  {h.change_type === "EXTENSION"
                                    ? `+${h.extension_added_months || extMonths || 0}m Extension`
                                    : h.change_type === "INITIAL_ENROLLMENT"
                                    ? "Initial Enrollment"
                                    : "Requirement Change"}
                                </td>
                                <td style={{ padding: "6px 8px", color: "#64748B" }}>
                                  {h.previous_duration_months != null
                                    ? `${Number(h.previous_duration_months) + Number(h.previous_extension_months || 0)}m`
                                    : "—"}
                                </td>
                                <td style={{ padding: "6px 8px", fontWeight: 700, color: "#0F172A" }}>
                                  {totalNewMonths}m
                                  {extMonths > 0 ? ` (${h.new_duration_months}m + ${extMonths}m ext)` : ""}
                                </td>
                                <td style={{ padding: "6px 8px" }}>{h.new_basis || "STANDARD_PROGRAM"}</td>
                                <td style={{ padding: "6px 8px" }}>{fmtDate(h.new_expected_completion_date)}</td>
                                <td style={{ padding: "6px 8px", color: "#334155" }}>{h.reason || "—"}</td>
                                <td style={{ padding: "6px 8px", fontWeight: 600 }}>{h.approved_by_name || "—"}</td>
                                <td style={{ padding: "6px 8px", color: "#64748B" }}>{fmtDate(h.effective_date || h.created_at)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            </div>
          ) : activeSection === "attendance" ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <SectionHeader icon={NAV_ICONS.attendance} title="Attendance & Curriculum Completion" />
                {canManageCase && (
                  <button type="button" style={styles.generateBtn} onClick={() => setAttendanceModalOpen(true)}>
                    + Record Attendance
                  </button>
                )}
              </div>
              {/* Session Attendance & Participation Metrics (Clean 6-Card Grid) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <StatCard tone="forest" label="Attendance Rate" value={attendancePct !== null ? `${attendancePct}%` : "—"} sub="DOH Target: ≥80%" />
                <StatCard tone="sage" label="Physical Attended" value={presentCount} sub={lateCount ? `${lateCount} Late arrival` : "All on-time"} />
                <StatCard tone={pendingReviewCount > 0 ? "amber" : "olive"} label="Pending Review" value={pendingReviewCount} sub={pendingReviewCount > 0 ? "Awaiting CM decision" : "Nothing to review"} />
                <StatCard tone="moss" label="Excused Absences" value={excusedCount} sub={outstandingReqCount ? `${outstandingReqCount} need makeup` : "Resolved"} />
                <StatCard tone={missedCount > 0 ? "clay" : "sage"} label="Unexcused Absent" value={missedCount} sub={missedCount > 0 ? "Missed sessions" : "None"} />
                <StatCard
                  tone="pine"
                  label="Supplementary"
                  value={sessionSummary?.supplementary?.totalSupplementaryCredited ?? ((sessionSummary?.shgm || 0) + (sessionSummary?.indCounseling || 0) + (sessionSummary?.conjointFamily || 0))}
                  sub="SHGM · ICA · Family"
                />
              </div>

              {sessionSummary?.components && (
                <CurriculumCompletionPanel
                  sessionSummary={sessionSummary}
                  canManageCase={canManageCase}
                />
              )}

              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: 12,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  overflow: "hidden",
                  marginTop: 20,
                }}
              >
                <div
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid #F1F5F9",
                    background: "#F8FAFC",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 13.5,
                        fontWeight: 800,
                        color: "#0F172A",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        letterSpacing: "0.02em",
                        textTransform: "uppercase",
                      }}
                    >
                      <span>📅</span> Attendance & Clinical Session Records
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748B" }}>
                      Detailed timeline of verified physical attendances, curriculum completion decisions, and post-session drug screens.
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        background: "#FFFFFF",
                        color: "#334155",
                        padding: "3px 10px",
                        borderRadius: 999,
                        border: "1px solid #CBD5E1",
                      }}
                    >
                      {attendance.length} {attendance.length === 1 ? "Record" : "Records"}
                    </span>
                  </div>
                </div>

                {attendance.length === 0 ? (
                  <div style={{ padding: "36px 20px" }}>
                    <EmptyState text="No attendance records yet for this patient." />
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <SimpleTable
                      columns={[
                        "DATE & TIME",
                        "SESSION & REQUIREMENT",
                        "ATTENDANCE STATUS",
                        "COMPLETION DECISION",
                        "RISK & DRUG SCREEN",
                        "REMARKS / REVIEW",
                      ]}
                      rows={attendance.map((a) => {
                        const compStatus =
                          a.completion_status || (a.status === "present" ? "CREDITED" : "NOT_CREDITED");
                        const reqTitle =
                          a.curriculum_requirement || a.topic_name || a.session_type || "General Session";

                        return [
                          <div>
                            <div style={{ fontWeight: 600 }}>{fmtDate(a.session_date)}</div>
                            {a.session_time && (
                              <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                                Sched: {String(a.session_time).slice(0, 5)}
                              </div>
                            )}
                          </div>,
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--color-text)" }}>{reqTitle}</div>
                            {a.raw_session_type && a.raw_session_type !== reqTitle && (
                              <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                                {a.raw_session_type}
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                              {Boolean(a.is_makeup) && (
                                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", fontWeight: 700 }}>
                                  🔄 Makeup{a.makeup_origin_date ? ` for ${fmtDate(a.makeup_origin_date)}` : ""}
                                </span>
                              )}
                              {Boolean(a.is_duplicate_topic) && (
                                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A", fontWeight: 700 }}>
                                  🔁 Repeat Topic (No Dup Credit)
                                </span>
                              )}
                              {a.fulfilled_by_makeup_id && (
                                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", fontWeight: 700 }}>
                                  ✓ Made up on {fmtDate(a.fulfilled_by_makeup_date)}
                                </span>
                              )}
                              {(a.status === "absent" || a.status === "excused") && !a.fulfilled_by_makeup_id && (
                                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#FFF1F2", color: "#BE123C", border: "1px solid #FECDD3", fontWeight: 700 }}>
                                  📌 Requirement Outstanding
                                </span>
                              )}
                              {a.is_chairperson ? (
                                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#EBF8FF", color: "#2B6CB0", fontWeight: 700 }}>
                                  👑 SHGM Chair
                                </span>
                              ) : null}
                              {a.family_attended ? (
                                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#F0FFF4", color: "#276749", fontWeight: 700 }}>
                                  👨‍👩‍👧 Family: {a.family_member_name || "Present"}
                                </span>
                              ) : null}
                            </div>
                          </div>,
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                            <span
                              style={{
                                textTransform: "capitalize",
                                fontWeight: 700,
                                fontSize: 11.5,
                                padding: "2px 8px",
                                borderRadius: 999,
                                background:
                                  a.status === "present"
                                    ? "var(--color-primary-tint)"
                                    : a.status === "late"
                                    ? "#FFF3D6"
                                    : a.status === "excused"
                                    ? "#EDEAFB"
                                    : a.status === "cancelled"
                                    ? "#F1F5F9"
                                    : "#FDE2E2",
                                color:
                                  a.status === "present"
                                    ? "var(--color-primary-dark)"
                                    : a.status === "late"
                                    ? "#9A6B00"
                                    : a.status === "excused"
                                    ? "#5B3EC9"
                                    : a.status === "cancelled"
                                    ? "#475569"
                                    : "#B3261E",
                              }}
                            >
                              {a.status === "cancelled" ? "Session Cancelled" : a.status}
                            </span>
                            {a.status === "late" && a.arrival_time && (
                              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#92400E" }}>
                                ⏰ Arrived: {String(a.arrival_time).slice(0, 5)}
                              </span>
                            )}
                          </div>,
                          <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 700,
                                background:
                                  compStatus === "CREDITED"
                                    ? "#DCFCE7"
                                    : compStatus === "PENDING_REVIEW"
                                    ? "#FEF3C7"
                                    : "#FEE2E2",
                                color:
                                  compStatus === "CREDITED"
                                    ? "#166534"
                                    : compStatus === "PENDING_REVIEW"
                                    ? "#92400E"
                                    : "#991B1B",
                                border:
                                  compStatus === "CREDITED"
                                    ? "1px solid #86EFAC"
                                    : compStatus === "PENDING_REVIEW"
                                    ? "1px solid #FCD34D"
                                    : "1px solid #FCA5A5",
                              }}
                            >
                              {compStatus === "CREDITED"
                                ? "✓ Credited"
                                : compStatus === "PENDING_REVIEW"
                                ? "⏳ Pending Review"
                                : "✕ Not Credited"}
                            </span>
                            {a.decision_reason && (
                              <div style={{ fontSize: 11, color: "#334155", textTransform: "none" }}>
                                {a.decision_reason}
                              </div>
                            )}
                            {a.authorized_by_name && (
                              <div style={{ fontSize: 10.5, color: "#64748B", textTransform: "none" }}>
                                Auth: <strong>{a.authorized_by_name}</strong>
                              </div>
                            )}
                          </div>,
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: 999,
                                fontSize: 10.5,
                                fontWeight: 700,
                                background:
                                  a.relapse_risk === "USED"
                                    ? "#FEE2E2"
                                    : a.relapse_risk === "NEARLY_USED"
                                    ? "#FFEDD5"
                                    : a.relapse_risk === "AT_RISK"
                                    ? "#FEF3C7"
                                    : "#ECFDF5",
                                color:
                                  a.relapse_risk === "USED"
                                    ? "#991B1B"
                                    : a.relapse_risk === "NEARLY_USED"
                                    ? "#9A3412"
                                    : a.relapse_risk === "AT_RISK"
                                    ? "#92400E"
                                    : "#065F46",
                                border:
                                  a.relapse_risk === "USED"
                                    ? "1px solid #FCA5A5"
                                    : a.relapse_risk === "NEARLY_USED"
                                    ? "1px solid #FDBA74"
                                    : a.relapse_risk === "AT_RISK"
                                    ? "1px solid #FCD34D"
                                    : "1px solid #A7F3D0",
                              }}
                              title="Client Self-Reported Craving / Relapse Risk Status"
                            >
                              {a.relapse_risk === "USED"
                                ? "🔴 Self: USED / SLIP"
                                : a.relapse_risk === "NEARLY_USED"
                                ? "🟠 Self: NEARLY USED (Craving / No Use)"
                                : a.relapse_risk === "AT_RISK"
                                ? "🟡 Self: AT RISK (No Use)"
                                : "🟢 Self: SAFE"}
                            </span>
                            {a.staff_risk_assessment && (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  background: "#EFF6FF",
                                  color: "#1E40AF",
                                  border: "1px solid #BFDBFE",
                                }}
                                title="Staff Clinical Risk Assessment"
                              >
                                🩺 Staff: {a.staff_risk_assessment.replace(/_/g, " ")}
                              </span>
                            )}
                            {a.drug_test_result && (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  background:
                                    a.drug_test_result === "POSITIVE"
                                      ? "#FEE2E2"
                                      : a.drug_test_result === "NEGATIVE"
                                      ? "#DCFCE7"
                                      : "#F1F5F9",
                                  color:
                                    a.drug_test_result === "POSITIVE"
                                      ? "#991B1B"
                                      : a.drug_test_result === "NEGATIVE"
                                      ? "#166534"
                                      : "#475569",
                                  border:
                                    a.drug_test_result === "POSITIVE"
                                      ? "1px solid #FCA5A5"
                                      : a.drug_test_result === "NEGATIVE"
                                      ? "1px solid #86EFAC"
                                      : "1px solid #CBD5E1",
                                }}
                                title="Post-Session Multi-3 Drug Screen Result"
                              >
                                🧪 Multi-3: {a.drug_test_result}
                              </span>
                            )}
                          </div>,
                          <div style={{ textTransform: "none" }}>
                            {a.notes && <div style={{ marginBottom: 6, fontSize: 12, color: "#334155" }}>{a.notes}</div>}
                            {canManageCase ? (
                              <button
                                type="button"
                                style={{
                                  background: "#F8FAFC",
                                  color: "var(--color-primary-dark)",
                                  border: "1px solid #CBD5E1",
                                  borderRadius: 6,
                                  padding: "4px 10px",
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                                onClick={() => openAttendanceReview(a)}
                              >
                                ⚖️ Review
                              </button>
                            ) : (
                              !a.notes && "—"
                            )}
                          </div>,
                        ];
                      })}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : activeSection === "case-notes" ? (
            <div>
              <SectionHeader icon={NAV_ICONS["case-notes"]} title="Case Management" />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <div style={styles.subTabBar}>
                  {[
                    { key: "treatment-plan", label: "Treatment Plan (ITP)" },
                    { key: "summary", label: "Progress & Summary" },
                    { key: "interventions", label: "Interventions & Consultations" },
                    { key: "milestones", label: "Milestones" },
                    { key: "drug-tests", label: "Drug Tests" },
                    { key: "notes", label: "Progress Notes" },
                    { key: "followups", label: "Follow-up Actions" },
                    { key: "assignment-history", label: "Assignment History" },
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
                {canManageCase && (
                  <button
                    type="button"
                    style={{ ...styles.generateBtn, background: "#2B6CB0", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
                    onClick={() => setCourtReportModalOpen(true)}
                  >
                    ⚖️ Court Progress Report
                  </button>
                )}
              </div>

              {caseSubTab === "treatment-plan" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, color: "#2D3748" }}>Individualized Treatment Plan (ITP)</h3>
                      <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#718096" }}>
                        Clinical care plan establishing goals, modalities, and statutory milestones.
                      </p>
                    </div>
                    {canManageCase && (
                      <div style={{ display: "flex", gap: 8 }}>
                        {treatmentPlan && (
                          <button
                            type="button"
                            style={{ ...styles.generateBtn, background: "#4A5568" }}
                            onClick={handlePrintTreatmentPlan}
                          >
                            🖨️ Print Treatment Plan
                          </button>
                        )}
                        <button
                          type="button"
                          style={styles.generateBtn}
                          onClick={() => setTreatmentPlanModalOpen(true)}
                        >
                          {treatmentPlan ? "✎ Edit Treatment Plan" : "+ Formulate Treatment Plan"}
                        </button>
                      </div>
                    )}
                  </div>

                  {!treatmentPlan ? (
                    <div style={{ ...styles.card, padding: 32, textAlign: "center", border: "1px dashed #CBD5E0", borderRadius: 8 }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
                      <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "#2D3748" }}>No Treatment Plan Formulated Yet</h3>
                      <p style={{ margin: "0 auto 18px", fontSize: 13, color: "#718096", maxWidth: 520, lineHeight: 1.5 }}>
                        Under DOH Outpatient SOP, an Individualized Treatment Plan (ITP) must be established within the first 14–30 days of admission to guide the client's 43-session curriculum and legal progress reporting.
                      </p>
                      {canManageCase && (
                        <button type="button" style={styles.generateBtn} onClick={() => setTreatmentPlanModalOpen(true)}>
                          + Formulate Treatment Plan
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div style={{ ...styles.card, padding: 20, border: "1px solid #E2E8F0", borderRadius: 8, background: "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #EDF2F7", paddingBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#2D3748" }}>Plan Status</span>
                            <span style={{
                              padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                              background: treatmentPlan.status === "active" ? "#D8F5E9" : "#E2E8F0",
                              color: treatmentPlan.status === "active" ? "#1A7F4B" : "#4A5568",
                              textTransform: "uppercase"
                            }}>
                              {treatmentPlan.status}
                            </span>
                          </div>
                          <div style={{ fontSize: 12.5, color: "#718096" }}>
                            Formulated: <strong>{fmtDate(treatmentPlan.plan_date)}</strong> · Target Completion: <strong>{fmtDate(treatmentPlan.target_completion_date)}</strong>
                          </div>
                        </div>

                        <div style={{ marginBottom: 18 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#718096", marginBottom: 8, letterSpacing: 0.5 }}>
                            1. Identified Problem Domains
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {(treatmentPlan.problem_domains || []).map((d) => (
                              <span key={d} style={{ ...styles.sessionPill, background: "#EBF8FF", color: "#2B6CB0", borderColor: "#BEE3F8" }}>
                                ✓ {d.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div style={{ marginBottom: 18 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#718096", marginBottom: 8, letterSpacing: 0.5 }}>
                            2. Measurable Target Goals & Objectives
                          </div>
                          <div style={{ background: "#F7FAFC", border: "1px solid #E2E8F0", borderRadius: 6, padding: "12px 14px", fontSize: 13, lineHeight: 1.6, color: "#2D3748", whiteSpace: "pre-wrap" }}>
                            {treatmentPlan.primary_goals}
                          </div>
                        </div>

                        <div style={{ marginBottom: 18 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#718096", marginBottom: 8, letterSpacing: 0.5 }}>
                            3. Prescribed Intervention Modalities
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {(treatmentPlan.intervention_modalities || []).map((m) => (
                              <span key={m} style={{ ...styles.sessionPill, background: "#F0FFF4", color: "#22543D", borderColor: "#C6F6D5" }}>
                                ✓ {m.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        </div>

                        {treatmentPlan.relapse_prevention_plan && (
                          <div style={{ marginBottom: 18 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#718096", marginBottom: 8, letterSpacing: 0.5 }}>
                              4. Relapse Prevention Protocol
                            </div>
                            <div style={{ background: "#FFFDF5", border: "1px solid #FEEBC8", borderRadius: 6, padding: "12px 14px", fontSize: 13, lineHeight: 1.6, color: "#744210", whiteSpace: "pre-wrap" }}>
                              {treatmentPlan.relapse_prevention_plan}
                            </div>
                          </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: "1px solid #EDF2F7", fontSize: 12.5, color: "#718096" }}>
                          <div>
                            Managing Clinician: <strong>{treatmentPlan.case_manager_name || user?.full_name || "Staff"}</strong>
                          </div>
                          <div>
                            Client Consent: <strong style={{ color: treatmentPlan.client_agreed ? "#2F855A" : "#C53030" }}>
                              {treatmentPlan.client_agreed ? "✓ Committed & Signed" : "Pending Consent"}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}


              {caseSubTab === "summary" && (
                <div>
                  <div style={{ ...styles.card, padding: "20px 24px", marginBottom: 20, border: "1.5px solid #D5E5D6", borderRadius: 14, background: "#FFFFFF", boxShadow: "0 2px 12px rgba(38, 101, 59, 0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1B3828" }}>
                          Lifetime Curriculum Progress (28 CBT · 3 CBT-E · 12 PE = 43 Core Requirements)
                        </h3>
                        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#52755D", lineHeight: 1.4 }}>
                          Counts only approved, non-duplicate curriculum credits toward each component target. Supplementary services and additional meetings are tracked separately.
                        </p>
                      </div>
                      {canManageCase && (
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            style={{
                              background: "#2A6A45",
                              color: "#FFFFFF",
                              border: "1px solid #1E5033",
                              padding: "8px 16px",
                              borderRadius: 8,
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: "pointer",
                              boxShadow: "0 2px 6px rgba(42, 106, 69, 0.2)",
                              transition: "all 0.15s ease",
                            }}
                            onClick={() => setAttendanceModalOpen(true)}
                          >
                            + Record CBT / Attendance
                          </button>
                          <button
                            type="button"
                            style={{
                              background: "#486B52",
                              color: "#FFFFFF",
                              border: "1px solid #36533E",
                              padding: "8px 16px",
                              borderRadius: 8,
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: "pointer",
                              boxShadow: "0 2px 6px rgba(72, 107, 82, 0.2)",
                              transition: "all 0.15s ease",
                            }}
                            onClick={() => setNoteModal({})}
                          >
                            + Log Progress Note
                          </button>
                        </div>
                      )}
                    </div>

                    {sessionSummary?.components ? (
                      <CurriculumCompletionPanel
                        sessionSummary={sessionSummary}
                        canManageCase={canManageCase}
                      />
                    ) : (
                      <>
                        <div style={{ background: "#EDF2F7", borderRadius: 8, height: 12, overflow: "hidden", marginBottom: 12 }}>
                          <div style={{ background: "var(--color-primary)", height: "100%", width: `${sessionSummary?.percentage || 0}%`, transition: "width 0.3s ease" }} />
                        </div>
                        <div style={{ fontSize: 14, color: "#2D3748", fontWeight: 700, marginBottom: 6 }}>
                          {sessionSummary?.attendedCore || 0} / 43 Credited Core Requirements Completed ({sessionSummary?.percentage || 0}%)
                        </div>
                      </>
                    )}
                  </div>

                  <div style={styles.grid}>
                    <Field label="Current status">{patient.enrollment_status || "—"}</Field>
                    <Field label="Program phase">{patient.treatment_phase || patient.program_phase || "—"}</Field>
                    <Field label="Assigned case manager">{patient.case_manager_name || "Unassigned"}</Field>
                    <Field label="Agreed program start date">{fmtDate(durationSummary.startDate || patient.rehab_start_date || patient.admission_date)}</Field>
                    <Field label="Required program duration">
                      <strong>{durationSummary.totalRequiredMonths || 7} Months</strong> ({durationSummary.durationBasisLabel || "Standard 7m"})
                    </Field>
                    <Field label="Months elapsed vs. required">
                      <strong style={{ color: durationSummary.isDurationMet ? "#166534" : "#B45309" }}>
                        {durationSummary.elapsedMonths ?? 0} / {durationSummary.totalRequiredMonths ?? 7} months
                      </strong>
                    </Field>
                    <Field label="Expected completion date">{fmtDate(durationSummary.expectedCompletionDate || patient.expected_completion_date)}</Field>
                  </div>
                  
                  {canManageCase && !editing && (
                    <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        style={{ ...styles.generateBtn, background: "#fff", color: "var(--color-primary)", border: "1px solid var(--color-primary)" }}
                        onClick={() => { goToSection("rehab"); startEditing(); }}
                      >
                        Update rehabilitation status
                      </button>
                      <button
                        type="button"
                        style={{ ...styles.generateBtn, background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0" }}
                        onClick={() => openDurationModal("EXTENSION")}
                      >
                        ⏱️ Record Extension / Change Duration
                      </button>
                      {patient.enrollment_status === 'active' && (
                        <button 
                          type="button" 
                          style={{ ...styles.generateBtn, background: "#C53030" }}
                          onClick={() => setDischargeModalOpen(true)}
                        >
                          Process Program Discharge
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {caseSubTab === "interventions" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, color: "#2D3748" }}>Clinical Interventions & Consultations</h3>
                      <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#718096" }}>
                        Record and retain multiple clinical services (Home visits, medical/psychiatric consults, case conferences, treatment planning, family coordination, and court reporting) qualifying for the monthly case management tracker beyond group attendance.
                      </p>
                    </div>
                    {canManageCase && (
                      <button
                        type="button"
                        style={styles.generateBtn}
                        onClick={() => setInterventionModalOpen(true)}
                      >
                        + Record Clinical Intervention
                      </button>
                    )}
                  </div>

                  {/* Summary Metric Ribbon */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
                    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Total Services</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#1E293B", marginTop: 2 }}>{interventions.length}</div>
                    </div>
                    <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8", textTransform: "uppercase" }}>Home Visits</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#1E40AF", marginTop: 2 }}>
                        {interventions.filter((i) => i.intervention_type === "HOME_VISIT").length}
                      </div>
                    </div>
                    <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#047857", textTransform: "uppercase" }}>Consultations</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#065F46", marginTop: 2 }}>
                        {interventions.filter((i) => i.intervention_type === "CONSULTATION_INTERNAL" || Boolean(i.consult_type)).length}
                      </div>
                    </div>
                    <div style={{ background: "#FEFCE8", border: "1px solid #FEF08A", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#A16207", textTransform: "uppercase" }}>Family Coord</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#854D0E", marginTop: 2 }}>
                        {interventions.filter((i) => i.intervention_type === "FAMILY_COORDINATION").length}
                      </div>
                    </div>
                    <div style={{ background: "#FDF2F8", border: "1px solid #FBCFE8", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#BE185D", textTransform: "uppercase" }}>Case Confs</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#9D174D", marginTop: 2 }}>
                        {interventions.filter((i) => i.intervention_type === "CASE_CONFERENCE").length}
                      </div>
                    </div>
                    <div style={{ background: "#F3E8FF", border: "1px solid #E9D5FF", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#7E22CE", textTransform: "uppercase" }}>Reports & Referrals</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#6B21A8", marginTop: 2 }}>
                        {interventions.filter((i) => i.intervention_type === "STATUS_REPORT_PREP" || i.intervention_type === "REFERRAL_OUTSIDE").length}
                      </div>
                    </div>
                  </div>

                  {interventions.length === 0 ? (
                    <EmptyState text="No clinical interventions or consultations recorded yet. Click '+ Record Clinical Intervention' to log home visits, internal consultations, case conferences, or family coordination." />
                  ) : (
                    <SimpleTable
                      columns={[
                        "Date of Service",
                        "Modality / Service Type",
                        "Consult Type",
                        "Responsible Clinician",
                        "Setting / Location",
                        "Tracker Indicator",
                        "Clinical Remarks & Actions",
                        ...(canManageCase ? ["Actions"] : []),
                      ]}
                      rows={interventions.map((item) => {
                        const opt = INTERVENTION_OPTIONS.find((o) => o.value === item.intervention_type) || {
                          label: item.intervention_type,
                          badgeBg: "#F1F5F9",
                          badgeColor: "#475569",
                        };
                        const consultOpt = CONSULT_OPTIONS.find((c) => c.value === item.consult_type);
                        return [
                          <div style={{ fontWeight: 700, color: "#1E293B" }}>{fmtDate(item.intervention_date)}</div>,
                          <div>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 700,
                                background: opt.badgeBg,
                                color: opt.badgeColor,
                              }}
                            >
                              {opt.label}
                            </span>
                          </div>,
                          item.consult_type ? (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 7px",
                                borderRadius: 4,
                                fontSize: 11.5,
                                fontWeight: 700,
                                background: "#E0F2FE",
                                color: "#0369A1",
                              }}
                              title={consultOpt?.label || item.consult_type}
                            >
                              {item.consult_type} ({item.consult_type === "M" ? "Medical" : item.consult_type === "P" ? "Psych" : item.consult_type})
                            </span>
                          ) : (
                            <span style={{ color: "#94A3B8" }}>—</span>
                          ),
                          <div style={{ fontWeight: 600, color: "#334155" }}>{item.responsible_staff_name}</div>,
                          <div style={{ fontSize: 12, color: "#64748B" }}>{item.location_setting || "In-Center"}</div>,
                          <div>
                            {Boolean(item.qualifies_for_monthly_tracker) ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: "#DCFCE7",
                                  color: "#166534",
                                }}
                              >
                                ✓ Counts in Tracker
                              </span>
                            ) : (
                              <span style={{ color: "#94A3B8", fontSize: 12 }}>Internal Only</span>
                            )}
                          </div>,
                          <div style={{ maxWidth: 300, fontSize: 12.5, color: "#334155", lineHeight: 1.4 }}>
                            {item.remarks || "—"}
                          </div>,
                          ...(canManageCase
                            ? [
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button
                                    type="button"
                                    style={{
                                      background: "none",
                                      border: "1px solid #CBD5E1",
                                      borderRadius: 4,
                                      padding: "3px 8px",
                                      fontSize: 11.5,
                                      fontWeight: 600,
                                      color: "#334155",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => setInterventionModalOpen(item)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    style={{
                                      background: "none",
                                      border: "1px solid #FCA5A5",
                                      borderRadius: 4,
                                      padding: "3px 8px",
                                      fontSize: 11.5,
                                      fontWeight: 600,
                                      color: "#DC2626",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => handleDeleteIntervention(item.id)}
                                  >
                                    Delete
                                  </button>
                                </div>,
                              ]
                            : []),
                        ];
                      })}
                    />
                  )}
                </div>
              )}

              {caseSubTab === "milestones" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 16, color: "#2D3748" }}>Clinical & Legal Milestones</h3>
                    {canManageCase && (
                      <button type="button" style={styles.generateBtn} onClick={async () => {
                        setSaving(true);
                        try {
                          await api.put(`/case-management/patients/${id}/milestones`, milestones);
                          setToast("Milestones saved successfully.");
                          loadAll();
                        } catch(e) {
                          alert("Failed to save milestones.");
                        }
                        setSaving(false);
                      }}>
                        {saving ? "Saving..." : "Save Milestones"}
                      </button>
                    )}
                  </div>
                  
                  <div style={styles.grid}>
                    {[
                      { key: "date_po", label: "Date of Program Orientation (PO)" },
                      { key: "date_vlts_referral", label: "Date of Referral to VLTS" },
                      { key: "date_initial_assessment", label: "Date of Initial Assessment (ASI)" },
                      { key: "date_initial_tx_planning", label: "Date of Initial Treatment Planning" },
                      { key: "date_initial_progress_report", label: "Date of Initial Progress Report (Court)" },
                      { key: "date_referral_outside_mtrc", label: "Date of Referral Outside MTRC" },
                      { key: "date_case_conference", label: "Date of Case Conference" },
                      { key: "date_status_reporting", label: "Date of Status Reporting (Court)" },
                      { key: "date_home_visit", label: "Date of Home Visit" },
                      { key: "date_followup_assessment", label: "Date of Follow-up Assessment (ASI)" },
                      { key: "date_acp_planning", label: "Date of ACP Treatment Planning (Aftercare)" },
                      { key: "date_pdc", label: "Date of Pre-Discharge Conference (PDC)" },
                      { key: "date_final_progress_report", label: "Date of Final Progress Report (Court)" },
                    ].map(field => (
                      <label key={field.key} style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 500, color: "#4A5568" }}>
                        {field.label}
                        <input 
                          type="date" 
                          style={{ padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 14 }} 
                          value={toInputDate(milestones?.[field.key])} 
                          onChange={(e) => canManageCase && setMilestones(m => ({...m, [field.key]: e.target.value}))}
                          disabled={!canManageCase || saving}
                        />
                      </label>
                    ))}
                  </div>

                  {milestoneHistory && milestoneHistory.length > 0 && (
                    <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #E2E8F0" }}>
                      <h4 style={{ margin: "0 0 12px", fontSize: 14, color: "#4A5568" }}>Milestone Audit Log</h4>
                      <SimpleTable
                        columns={["Milestone Event", "Date", "Recorded By", "Logged At"]}
                        rows={milestoneHistory.map(h => [
                          h.milestone_key.replace("date_", "").replace(/_/g, " ").toUpperCase(),
                          fmtDate(h.milestone_date),
                          h.recorded_by_name || "System / Admin",
                          fmtDate(h.recorded_at)
                        ])}
                      />
                    </div>
                  )}
                </div>
              )}

              {caseSubTab === "drug-tests" && (
                <div>
                  {canManageCase && (
                    <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ fontSize: 12.5, color: "#64748B" }}>
                        Consistent Multi-3 Rapid Screening (THC / METH / ECS) — One record per test event with traceable corrections.
                      </span>
                      <button type="button" style={styles.generateBtn} onClick={() => setDrugTestModalOpen(true)}>
                        + Record Multi-3 Drug Test
                      </button>
                    </div>
                  )}
                  {drugTests.length === 0 ? <EmptyState text="No drug test records found." /> : (
                    <SimpleTable 
                      columns={[
                        "Test Date & Time",
                        "Test Type / Related Visit",
                        "Multi-3 Panel / Substance(s)",
                        "Result",
                        "Staff Member",
                        "Clinical Action / Audit Note",
                        ...(canManageCase ? ["Action"] : []),
                      ]} 
                      rows={drugTests.map((d) => {
                        const resBadge =
                          d.result === "POSITIVE"
                            ? { bg: "#FDE2E2", color: "#B3261E" }
                            : d.result === "NEGATIVE"
                            ? { bg: "#D8F5E9", color: "#2F855A" }
                            : d.result === "PENDING" || d.result === "INVALID"
                            ? { bg: "#FEF3C7", color: "#92400E" }
                            : { bg: "#F1F5F9", color: "#475569" };
                        return [
                          <div>
                            <div style={{ fontWeight: 700 }}>{fmtDate(d.test_date)}</div>
                            <div style={{ fontSize: 11.5, color: "#64748B" }}>
                              {d.test_time ? String(d.test_time).slice(0, 5) : "—"} · Day {d.days_from_enrollment ?? 0}
                            </div>
                          </div>,
                          <div>
                            <div style={{ fontWeight: 600 }}>{d.test_type || "Random Screening"}</div>
                            {(d.related_visit || d.linked_session_name) && (
                              <div style={{ fontSize: 11.5, color: "#475569", marginTop: 2 }}>
                                📍 {d.related_visit || d.linked_session_name}
                              </div>
                            )}
                          </div>,
                          <div>
                            <div style={{ fontWeight: 600 }}>{d.substance_tested || "Multi-3 Screen"}</div>
                            {Boolean(d.is_corrected) && (
                              <div style={{ fontSize: 11, color: "#B45309", marginTop: 2 }}>
                                ✏️ Corrected (prev: {d.previous_result || "—"} · {d.previous_substance_tested || "—"})
                              </div>
                            )}
                          </div>,
                          <span style={{ padding: "3px 9px", borderRadius: 12, fontSize: 11.5, fontWeight: 700, background: resBadge.bg, color: resBadge.color }}>
                            {d.result}
                          </span>,
                          d.tested_by_name || d.recorded_by_name || "Staff",
                          <div>
                            <div>{d.action_taken || d.remarks || "—"}</div>
                            {Boolean(d.is_corrected) && d.correction_reason && (
                              <div style={{ fontSize: 11, color: "#92400E", marginTop: 2 }}>
                                <strong>Correction Reason:</strong> {d.correction_reason} ({d.corrected_by_name || "Staff"})
                              </div>
                            )}
                          </div>,
                          ...(canManageCase
                            ? [
                                <button
                                  type="button"
                                  style={{
                                    padding: "4px 10px",
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    borderRadius: 6,
                                    border: "1px solid #CBD5E1",
                                    background: "#F8FAFC",
                                    color: "#1E293B",
                                    cursor: "pointer",
                                  }}
                                  onClick={() => setDrugTestModalOpen(d)}
                                >
                                  ✏️ Correct
                                </button>,
                              ]
                            : []),
                        ];
                      })} 
                    />
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
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 700 }}>{fmtDate(n.session_date)} {n.session_type && `· ${n.session_type}`}</span>
                              {n.relapse_risk && (
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    padding: "1px 8px",
                                    borderRadius: 999,
                                    background:
                                      n.relapse_risk === "USED"
                                        ? "#FEE2E2"
                                        : n.relapse_risk === "NEARLY_USED"
                                        ? "#FFEDD5"
                                        : n.relapse_risk === "AT_RISK"
                                        ? "#FEF3C7"
                                        : "#ECFDF5",
                                    color:
                                      n.relapse_risk === "USED"
                                        ? "#991B1B"
                                        : n.relapse_risk === "NEARLY_USED"
                                        ? "#9A3412"
                                        : n.relapse_risk === "AT_RISK"
                                        ? "#92400E"
                                        : "#065F46",
                                    border:
                                      n.relapse_risk === "USED"
                                        ? "1px solid #FCA5A5"
                                        : n.relapse_risk === "NEARLY_USED"
                                        ? "1px solid #FDBA74"
                                        : n.relapse_risk === "AT_RISK"
                                        ? "1px solid #FCD34D"
                                        : "1px solid #A7F3D0",
                                  }}
                                >
                                  {n.relapse_risk === "USED"
                                    ? "🔴 Self: USED / SLIP"
                                    : n.relapse_risk === "NEARLY_USED"
                                    ? "🟠 Self: NEARLY USED (Craving / No Use)"
                                    : n.relapse_risk === "AT_RISK"
                                    ? "🟡 Self: AT RISK (No Use)"
                                    : "🟢 Self: SAFE"}
                                </span>
                              )}
                              {n.staff_risk_assessment && (
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    padding: "1px 8px",
                                    borderRadius: 999,
                                    background: "#EFF6FF",
                                    color: "#1E40AF",
                                    border: "1px solid #BFDBFE",
                                  }}
                                >
                                  🩺 Staff Assessment: {n.staff_risk_assessment.replace(/_/g, " ")}
                                </span>
                              )}
                            </div>
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

              {caseSubTab === "assignment-history" && (
                <div>
                  <div
                    style={{
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: 8,
                      padding: "12px 16px",
                      marginBottom: 16,
                      fontSize: 12,
                      color: "#475569",
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>Effective Date Auditing (Task 9):</strong> Case Manager assignments are bound to effective date ranges. When historical reports (e.g. OP CM Tracker, DOH Form 4.1) are generated for a prior period, each service and caseload count is locked to the Case Manager responsible at that time, preventing later reassignments from rewriting past performance.
                  </div>

                  {assignmentHistory.length === 0 ? (
                    <EmptyState text="No assignment history recorded yet." />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {assignmentHistory.map((h, i) => {
                        const isCurrent = !h.end_date;
                        return (
                          <div
                            key={h.id || i}
                            style={{
                              background: isCurrent ? "#F0FDF4" : "#FFFFFF",
                              border: `1px solid ${isCurrent ? "#86EFAC" : "#E2E8F0"}`,
                              borderRadius: 8,
                              padding: "12px 16px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: 10,
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: isCurrent ? "#166534" : "#1E293B" }}>
                                  {h.case_manager_name || "Unassigned"}
                                </span>
                                {isCurrent ? (
                                  <span style={{ fontSize: 11, fontWeight: 700, background: "#DCFCE7", color: "#166534", padding: "2px 6px", borderRadius: 4 }}>
                                    Active Current Assignment
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 11, fontWeight: 600, background: "#F1F5F9", color: "#64748B", padding: "2px 6px", borderRadius: 4 }}>
                                    Prior Assignment
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                                Period: <strong>{fmtDate(h.start_date)}</strong> – {h.end_date ? <strong>{fmtDate(h.end_date)}</strong> : <strong style={{ color: "#166534" }}>Present</strong>}
                                {h.reason && <span> · Reason: {h.reason}</span>}
                              </div>
                            </div>

                            <div style={{ textAlign: "right", fontSize: 11.5, color: "#94A3B8" }}>
                              {h.assigned_by_name && <div>Assigned by: {h.assigned_by_name}</div>}
                              <div>Recorded: {fmtDate(h.created_at)}</div>
                            </div>
                          </div>
                        );
                      })}
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
              
              <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={styles.generateBtn}
                  onClick={() => setStatutoryCertModal({ type: "ENROLLMENT" })}
                >
                  + Issue Certificate of Enrollment
                </button>
                <button
                  type="button"
                  style={{ ...styles.generateBtn, background: "var(--color-primary-dark, #0d4a2b)" }}
                  onClick={() => setStatutoryCertModal({ type: "COMPLETION" })}
                >
                  + Issue Certificate of Completion
                </button>
                <button
                  type="button"
                  style={{ ...styles.generateBtn, background: "#166534" }}
                  onClick={() => setShowTransmittalModal(true)}
                >
                  📨 Notice of Admission (Transmittal)
                </button>
              </div>

              {certificates.length === 0 ? (
                <EmptyState text="No certificates issued for this patient yet." />
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Control No.</th>
                      <th style={styles.th}>Date Issued</th>
                      <th style={styles.th}>Issued By</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map((c) => (
                      <tr key={c.id}>
                        <td style={styles.td}><strong>{c.certificate_type}</strong></td>
                        <td style={styles.td}>
                          <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--color-primary-dark)" }}>
                            {c.certificate_control_no}
                          </span>
                        </td>
                        <td style={styles.td}>{fmtDate(c.issued_date)}</td>
                        <td style={styles.td}>{c.issued_by_name}</td>
                        <td style={styles.td}>
                          <button
                            type="button"
                            style={{
                              padding: "5px 12px",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              background: "#f1f5f9",
                              border: "1px solid #cbd5e1",
                              borderRadius: 4,
                              color: "#1e293b",
                            }}
                            onClick={() => setStatutoryCertModal({ type: c.certificate_type, reprintRecord: c })}
                          >
                            🖨️ View / Reprint
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
      {attendanceModalOpen && (
        <RecordAttendanceModal
          initialPatientId={id}
          onClose={() => setAttendanceModalOpen(false)}
          onSaved={() => {
            setAttendanceModalOpen(false);
            loadAll();
          }}
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
      {statutoryCertModal && (
        <StatutoryCertificateModal
          patient={patient}
          initialType={statutoryCertModal.type || "ENROLLMENT"}
          reprintRecord={statutoryCertModal.reprintRecord || null}
          onClose={() => setStatutoryCertModal(null)}
          onIssued={() => {
            api.get(`/certificates/${id}/history`).then((res) => {
              setCertificates(res.data.history || []);
            });
          }}
        />
      )}
      {archivingCertificate && (
        <ArchiveConfirmModal
          title="Archive certificate"
          description="This certificate will be hidden from the certificates list. It can be restored from the Archives page."
          onConfirm={handleArchiveCertificate}
          onClose={() => setArchivingCertificate(null)}
        />
      )}
      {archivingPatient && (
        <ArchiveConfirmModal
          title="Archive patient"
          description="This patient will be hidden from the main Patients list. Their record and history stay intact and can be restored from the Archives page."
          onConfirm={handleArchivePatient}
          onClose={() => setArchivingPatient(false)}
        />
      )}
      {restoringPatient && (
        <ConfirmModal
          title="Restore patient"
          description="This patient will reappear in the main Patients list."
          confirmLabel="Restore"
          onConfirm={handleRestorePatient}
          onClose={() => setRestoringPatient(false)}
        />
      )}
      {drugTestModalOpen && (
        <DrugTestModal 
          patientId={id} 
          existingTest={typeof drugTestModalOpen === "object" ? drugTestModalOpen : null}
          onClose={() => setDrugTestModalOpen(false)} 
          onSaved={() => {
            const wasEdit = typeof drugTestModalOpen === "object";
            setDrugTestModalOpen(false);
            loadAll();
            setToast(wasEdit ? "Drug test correction saved and logged." : "Multi-3 drug test recorded.");
          }} 
        />
      )}
      
      {dischargeModalOpen && (
        <DischargeModal 
          patientId={id} 
          admissionDate={patient?.admission_date}
          onClose={() => setDischargeModalOpen(false)} 
          onSaved={() => { setDischargeModalOpen(false); loadAll(); setToast("Patient formally discharged."); }} 
        />
      )}

      {treatmentPlanModalOpen && (
        <TreatmentPlanModal
          patientId={id}
          patient={patient}
          existingPlan={treatmentPlan}
          onClose={() => setTreatmentPlanModalOpen(false)}
          onSaved={() => {
            setTreatmentPlanModalOpen(false);
            loadAll();
            setToast("Treatment Plan saved and synchronized with milestones.");
          }}
        />
      )}


      {courtReportModalOpen && (
        <CourtProgressReportModal
          patient={patient}
          onClose={() => setCourtReportModalOpen(false)}
          onSaved={() => {
            loadAll();
            setToast("Court progress report saved and milestone updated.");
          }}
        />
      )}

      {interventionModalOpen && (
        <InterventionModal
          patientId={id}
          patientName={patient?.full_name}
          intervention={typeof interventionModalOpen === "object" ? interventionModalOpen : null}
          onClose={() => setInterventionModalOpen(false)}
          onSaved={() => {
            setInterventionModalOpen(false);
            loadAll();
            setToast("Clinical intervention recorded and synchronized with monthly tracker.");
          }}
        />
      )}

      {showTransmittalModal && (
        <TransmittalNoticeModal
          patientId={id}
          initialPatient={patient}
          onClose={() => setShowTransmittalModal(false)}
        />
      )}

      {reviewAttRecord && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 120,
            padding: 16,
          }}
          onClick={() => setReviewAttRecord(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              width: 520,
              maxWidth: "95vw",
              boxShadow: "0 20px 40px rgba(0,0,0,0.22)",
              border: "1px solid #E2E8F0",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "16px 20px",
                borderBottom: "1px solid #EDF2F7",
              }}
            >
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: "#164E33" }}>
                  Review Participation & Completion Credit
                </div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                  {patient.full_name} · {fmtDate(reviewAttRecord.session_date)} ·{" "}
                  {reviewAttRecord.curriculum_requirement || reviewAttRecord.session_type}
                </div>
              </div>
              <button
                type="button"
                style={{ background: "none", border: "none", fontSize: 22, color: "#94A3B8", cursor: "pointer" }}
                onClick={() => setReviewAttRecord(null)}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSaveAttendanceReview}
              style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "#334155" }}>
                  Attendance Status
                  <select
                    style={styles.input}
                    value={reviewAttForm.status}
                    onChange={(e) => {
                      const nextSt = e.target.value;
                      setReviewAttForm((prev) => ({
                        ...prev,
                        status: nextSt,
                        completionStatus:
                          nextSt === "absent" || nextSt === "excused" || nextSt === "cancelled"
                            ? "NOT_CREDITED"
                            : prev.completionStatus,
                      }));
                    }}
                  >
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="excused">Excused</option>
                    <option value="absent">Absent</option>
                    <option value="cancelled">Session Cancelled (Center)</option>
                  </select>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "#334155" }}>
                  Completion Decision
                  <select
                    style={styles.input}
                    value={reviewAttForm.completionStatus}
                    disabled={
                      reviewAttForm.status === "absent" ||
                      reviewAttForm.status === "excused" ||
                      reviewAttForm.status === "cancelled"
                    }
                    onChange={(e) =>
                      setReviewAttForm((prev) => ({ ...prev, completionStatus: e.target.value }))
                    }
                  >
                    <option value="CREDITED">✓ Credited</option>
                    <option value="PENDING_REVIEW">⏳ Pending Review</option>
                    <option value="NOT_CREDITED">✕ Not Credited</option>
                  </select>
                </label>
              </div>

              {reviewAttForm.status === "late" && (
                <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "#334155" }}>
                  Actual Arrival Time
                  <input
                    type="time"
                    style={styles.input}
                    value={reviewAttForm.arrivalTime}
                    onChange={(e) =>
                      setReviewAttForm((prev) => ({ ...prev, arrivalTime: e.target.value }))
                    }
                  />
                </label>
              )}

              {(reviewAttForm.status === "present" || reviewAttForm.status === "late") && (
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 12px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={reviewAttForm.isMakeup}
                      onChange={(e) =>
                        setReviewAttForm((prev) => ({ ...prev, isMakeup: e.target.checked }))
                      }
                    />
                    🔄 Link as Makeup Attendance for an earlier missed/excused session
                  </label>
                  {reviewAttForm.isMakeup && (
                    <select
                      style={{ ...styles.input, marginTop: 8 }}
                      value={reviewAttForm.makeupForAttendanceId}
                      onChange={(e) =>
                        setReviewAttForm((prev) => ({
                          ...prev,
                          makeupForAttendanceId: e.target.value,
                        }))
                      }
                    >
                      <option value="">— Select original missed/excused session —</option>
                      {attendance
                        .filter(
                          (item) =>
                            item.id !== reviewAttRecord.id &&
                            (item.status === "absent" ||
                              item.status === "excused" ||
                              item.completion_status === "NOT_CREDITED")
                        )
                        .map((item) => (
                          <option key={item.id} value={String(item.id)}>
                            {fmtDate(item.session_date)} ·{" "}
                            {item.curriculum_requirement || item.topic_name || item.session_type} (
                            {item.status.toUpperCase()})
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "#334155" }}>
                  Client Self-Reported Craving / Relapse Risk
                  <select
                    style={styles.input}
                    value={reviewAttForm.relapseRisk || ""}
                    onChange={(e) =>
                      setReviewAttForm((prev) => ({ ...prev, relapseRisk: e.target.value }))
                    }
                  >
                    <option value="">— Unanswered / Not Assessed —</option>
                    <option value="SAFE">🟢 Safe / Abstinent</option>
                    <option value="AT_RISK">🟡 At Risk (Triggers — No Use)</option>
                    <option value="NEARLY_USED">🟠 Nearly Used / Craving (No Use)</option>
                    <option value="USED">🔴 Used / Slip (Actual Use)</option>
                  </select>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "#334155" }}>
                  Staff Clinical Risk Assessment
                  <select
                    style={styles.input}
                    value={reviewAttForm.staffRiskAssessment || ""}
                    onChange={(e) =>
                      setReviewAttForm((prev) => ({
                        ...prev,
                        staffRiskAssessment: e.target.value,
                      }))
                    }
                  >
                    <option value="">— Optional: Select Staff Risk —</option>
                    <option value="LOW_RISK">Low Risk (Stable)</option>
                    <option value="MODERATE_RISK">Moderate Risk</option>
                    <option value="HIGH_RISK">High Risk</option>
                    <option value="ACUTE_RELAPSE_RISK">Acute Relapse Risk</option>
                  </select>
                </label>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "#334155" }}>
                Reason for Credit Decision / Excuse Approval
                <textarea
                  rows={2}
                  style={styles.input}
                  placeholder="Enter reason credit was granted/withheld or approved excuse reason..."
                  value={reviewAttForm.decisionReason}
                  onChange={(e) =>
                    setReviewAttForm((prev) => ({ ...prev, decisionReason: e.target.value }))
                  }
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "#334155" }}>
                Authorized Staff Member
                <input
                  type="text"
                  style={styles.input}
                  placeholder="Case Manager / Supervisor Name"
                  value={reviewAttForm.authorizedByName}
                  onChange={(e) =>
                    setReviewAttForm((prev) => ({ ...prev, authorizedByName: e.target.value }))
                  }
                />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 10, borderTop: "1px solid #EDF2F7" }}>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => setReviewAttRecord(null)}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.saveBtn} disabled={reviewAttSaving}>
                  {reviewAttSaving ? "Saving…" : "Save Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {durationModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.48)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 125,
            padding: 16,
          }}
          onClick={() => setDurationModalOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              width: 560,
              maxWidth: "95vw",
              boxShadow: "0 20px 40px rgba(0,0,0,0.22)",
              border: "1px solid #E2E8F0",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                background: "#1B4332",
                color: "#fff",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  {durationForm.changeType === "EXTENSION"
                    ? "Record Approved Program Extension"
                    : "Update Required Program Duration & Basis"}
                </h3>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                  Current requirement: {durationSummary.totalRequiredMonths || 7} months ({durationSummary.durationBasisLabel || "Standard 7m"}) · Expected completion: {fmtDate(durationSummary.expectedCompletionDate || patient.expected_completion_date)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDurationModalOpen(false)}
                style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveDurationChange} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setDurationForm((prev) => ({ ...prev, changeType: "EXTENSION" }))}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: durationForm.changeType === "EXTENSION" ? "2px solid #1B4332" : "1px solid #CBD5E1",
                    background: durationForm.changeType === "EXTENSION" ? "#F0FDF4" : "#fff",
                    color: durationForm.changeType === "EXTENSION" ? "#166534" : "#475569",
                  }}
                >
                  ⏱️ Add Approved Extension
                </button>
                <button
                  type="button"
                  onClick={() => setDurationForm((prev) => ({ ...prev, changeType: "REQUIREMENT_CHANGE" }))}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: durationForm.changeType === "REQUIREMENT_CHANGE" ? "2px solid #1B4332" : "1px solid #CBD5E1",
                    background: durationForm.changeType === "REQUIREMENT_CHANGE" ? "#F0FDF4" : "#fff",
                    color: durationForm.changeType === "REQUIREMENT_CHANGE" ? "#166534" : "#475569",
                  }}
                >
                  ⚙️ Change Base Duration / Basis
                </button>
              </div>

              {durationForm.changeType === "EXTENSION" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "#334155" }}>
                    Additional Extension Months *
                    <input
                      type="number"
                      min={1}
                      max={24}
                      style={styles.input}
                      value={durationForm.additionalExtensionMonths}
                      onChange={(e) =>
                        setDurationForm((prev) => ({ ...prev, additionalExtensionMonths: e.target.value }))
                      }
                      required
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "#334155" }}>
                    Effective / Approval Date *
                    <input
                      type="date"
                      style={styles.input}
                      value={durationForm.effectiveDate}
                      onChange={(e) =>
                        setDurationForm((prev) => ({ ...prev, effectiveDate: e.target.value }))
                      }
                      required
                    />
                  </label>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "#334155" }}>
                    Agreed Start Date *
                    <input
                      type="date"
                      style={styles.input}
                      value={durationForm.rehabStartDate}
                      onChange={(e) =>
                        setDurationForm((prev) => ({ ...prev, rehabStartDate: e.target.value }))
                      }
                      required
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "#334155" }}>
                    Required Duration (Months) *
                    <select
                      style={styles.input}
                      value={durationForm.requiredDurationMonths}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setDurationForm((prev) => ({
                          ...prev,
                          requiredDurationMonths: val,
                          durationBasis: val === 12 ? "COURT_ORDER" : val === 7 ? "STANDARD_PROGRAM" : prev.durationBasis,
                        }));
                      }}
                    >
                      <option value={7}>7 Months — Standard Program</option>
                      <option value={12}>12 Months — Court-Mandated Duration</option>
                      <option value={6}>6 Months — Plea Bargain / Shortened</option>
                      <option value={9}>9 Months — Extended Clinical Plan</option>
                      <option value={18}>18 Months — Extended Court Mandate</option>
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "#334155" }}>
                    Requirement Basis *
                    <select
                      style={styles.input}
                      value={durationForm.durationBasis}
                      onChange={(e) =>
                        setDurationForm((prev) => ({ ...prev, durationBasis: e.target.value }))
                      }
                    >
                      <option value="STANDARD_PROGRAM">Standard Outpatient Program (7 Months)</option>
                      <option value="COURT_ORDER">Court Instruction / Mandated Order</option>
                      <option value="PLEA_BARGAIN">Plea Bargaining Agreement</option>
                      <option value="CLINICAL_ASSESSMENT">Clinical Assessment / Case Conference</option>
                      <option value="OTHER">Other Approved Requirement</option>
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "#334155" }}>
                    Court / Basis Reference Detail
                    <input
                      type="text"
                      style={styles.input}
                      placeholder="e.g., RTC Br. 18 Order / Case Conf."
                      value={durationForm.durationBasisDetail}
                      onChange={(e) =>
                        setDurationForm((prev) => ({ ...prev, durationBasisDetail: e.target.value }))
                      }
                    />
                  </label>
                </div>
              )}

              <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "#334155" }}>
                Reason for {durationForm.changeType === "EXTENSION" ? "Extension" : "Requirement Change"} *
                <textarea
                  rows={2}
                  style={styles.input}
                  placeholder={
                    durationForm.changeType === "EXTENSION"
                      ? "State clinical/legal reason for extending program duration (e.g., missed sessions, relapse prevention, court order)..."
                      : "State reason for updating the required duration (e.g., amended court order specifying 12 months)..."
                  }
                  value={durationForm.reason}
                  onChange={(e) => setDurationForm((prev) => ({ ...prev, reason: e.target.value }))}
                  required
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "#334155" }}>
                Approving Staff / Supervisor *
                <input
                  type="text"
                  style={styles.input}
                  placeholder="Name & designation of approving supervisor or judge"
                  value={durationForm.approvedByName}
                  onChange={(e) => setDurationForm((prev) => ({ ...prev, approvedByName: e.target.value }))}
                  required
                />
              </label>

              <div style={{ fontSize: 12, color: "#475569", background: "#F8FAFC", padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0" }}>
                <strong>Preservation Note:</strong> The patient's previous duration requirement ({durationSummary.totalRequiredMonths || 7} months, expected completion {fmtDate(durationSummary.expectedCompletionDate || patient.expected_completion_date)}) will be permanently preserved in the patient's duration history log.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8, borderTop: "1px solid #EDF2F7" }}>
                <button type="button" style={styles.cancelBtn} onClick={() => setDurationModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" style={styles.saveBtn} disabled={durationSaving}>
                  {durationSaving ? "Saving…" : "Save & Preserve History"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
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

// Warm green palette for the attendance summary cards. Amber/clay appear only when a count needs attention.
const STAT_TONES = {
  forest: { bg: "#EEF5E9", border: "#C8DCBB", label: "#3D6A33", value: "#2B4F24", sub: "#4E7D42" },
  sage: { bg: "#F5F7EF", border: "#DCE4CF", label: "#5E7552", value: "#34472C", sub: "#6B7F5F" },
  olive: { bg: "#F6F6EA", border: "#E0DFBF", label: "#68692F", value: "#4F5023", sub: "#76773E" },
  moss: { bg: "#F0F5EC", border: "#D2E1C8", label: "#4C6B42", value: "#33502B", sub: "#5A7A4F" },
  pine: { bg: "#EBF4EF", border: "#C5DECF", label: "#2F6650", value: "#1F4D3B", sub: "#3D7660" },
  amber: { bg: "#FBF4E2", border: "#EBD8A8", label: "#8A5C14", value: "#7A4F0E", sub: "#8A6524" },
  clay: { bg: "#FBEEE7", border: "#EBCBBB", label: "#94432A", value: "#843A22", sub: "#9A5038" },
};

function StatCard({ tone, label, value, sub }) {
  const t = STAT_TONES[tone] || STAT_TONES.sage;
  return (
    <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.label, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: t.value, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: t.sub, marginTop: 2, fontWeight: 600 }}>{sub}</div>
    </div>
  );
}

function CurriculumCompletionPanel({ sessionSummary, canManageCase }) {
  const [expanded, setExpanded] = useState({ cbt: false, cbte: true, pe: true });

  const cbt = sessionSummary?.components?.cbt || {
    completed: sessionSummary?.cbtGroup || 0,
    required: 28,
    remaining: Math.max(0, 28 - (sessionSummary?.cbtGroup || 0)),
    isComplete: (sessionSummary?.cbtGroup || 0) >= 28,
    missingTopics: [],
  };
  const cbte = sessionSummary?.components?.cbte || {
    completed: sessionSummary?.cbteCompleted || 0,
    required: 3,
    remaining: Math.max(0, 3 - (sessionSummary?.cbteCompleted || 0)),
    isComplete: (sessionSummary?.cbteCompleted || 0) >= 3,
    missingTopics: [],
  };
  const pe = sessionSummary?.components?.pe || {
    completed: sessionSummary?.psychoEd || 0,
    required: 12,
    remaining: Math.max(0, 12 - (sessionSummary?.psychoEd || 0)),
    isComplete: (sessionSummary?.psychoEd || 0) >= 12,
    missingTopics: [],
  };
  const totalCore = sessionSummary?.components?.totalCore || {
    completed: cbt.completed + cbte.completed + pe.completed,
    required: 43,
    remaining: Math.max(0, 43 - (cbt.completed + cbte.completed + pe.completed)),
    isComplete: cbt.isComplete && cbte.isComplete && pe.isComplete,
    percentage: Math.round(((cbt.completed + cbte.completed + pe.completed) / 43) * 100),
  };
  const supp = sessionSummary?.supplementary || {};

  const toggleComponent = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isAllExpanded = expanded.cbt && expanded.cbte && expanded.pe;
  const toggleAll = () => {
    const nextState = !isAllExpanded;
    setExpanded({ cbt: nextState, cbte: nextState, pe: nextState });
  };

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Hero Curriculum Progress Card (Warm Green & Spacious) */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1.5px solid #D5E5D6",
          borderRadius: 14,
          padding: "18px 22px",
          marginBottom: 18,
          boxShadow: "0 2px 10px rgba(38, 101, 59, 0.04), inset 0 0 0 1px rgba(230, 243, 232, 0.45)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "3px 9px",
                  borderRadius: 6,
                  background: "#E8F4E8",
                  color: "#1E5833",
                  border: "1px solid #C4DFC8",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                Curriculum Milestone
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#1B3828" }}>
                43 Core Requirements (ENTREPOSE Vol. 1)
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: "#52755D", lineHeight: 1.4 }}>
              Unified requirement of 28 CBT Sessions + 3 CBT-E Clinical Evaluations + 12 Psycho-Education Meetings.
            </p>
          </div>
          <span
            style={{
              padding: "5px 14px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 800,
              background: totalCore.isComplete ? "#E8F5EC" : "#F6F3EB",
              color: totalCore.isComplete ? "#166534" : "#6E5218",
              border: totalCore.isComplete ? "1.5px solid #A3D9B1" : "1.5px solid #DFD5BE",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            {totalCore.isComplete
              ? "✓ All 43 Core Complete (PDC Ready)"
              : `${totalCore.remaining} Core Requirement(s) Remaining`}
          </span>
        </div>

        {/* Progress Bar & Percentage */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{ flex: 1, background: "#E8F1EA", borderRadius: 999, height: 11, overflow: "hidden" }}>
            <div
              style={{
                background: totalCore.isComplete
                  ? "#1E5833"
                  : "linear-gradient(90deg, #2A6A45 0%, #3D8B59 100%)",
                height: "100%",
                width: `${Math.min(100, Math.max(0, totalCore.percentage || 0))}%`,
                borderRadius: 999,
                transition: "width 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1B3828", whiteSpace: "nowrap" }}>
            {totalCore.completed} / {totalCore.required} ({totalCore.percentage || 0}%)
          </div>
        </div>

        {/* 3 Pillars Sub-meters (Warm Botanical Styling) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <div style={{ background: "#F7FAF8", border: "1.5px solid #DCE9DE", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#1E3326" }}>
              <span>CBT Topics (Sessions 1–28)</span>
              <span style={{ color: cbt.isComplete ? "#1E5833" : "#244E36", fontWeight: 800 }}>{cbt.completed}/28</span>
            </div>
            <div style={{ background: "#E4EEE5", borderRadius: 999, height: 6, margin: "7px 0 5px", overflow: "hidden" }}>
              <div style={{ background: cbt.isComplete ? "#1E5833" : "#2E6F48", height: "100%", width: `${Math.round((cbt.completed / 28) * 100)}%` }} />
            </div>
            <div style={{ fontSize: 11, color: "#52755D", fontWeight: 600 }}>{cbt.isComplete ? "✓ Completed" : `${cbt.remaining} remaining`}</div>
          </div>

          <div style={{ background: "#F7FAF8", border: "1.5px solid #DCE9DE", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#1E3326" }}>
              <span>CBT-E Evaluations (Sesyon 1–3)</span>
              <span style={{ color: cbte.isComplete ? "#1E5833" : "#244E36", fontWeight: 800 }}>{cbte.completed}/3</span>
            </div>
            <div style={{ background: "#E4EEE5", borderRadius: 999, height: 6, margin: "7px 0 5px", overflow: "hidden" }}>
              <div style={{ background: cbte.isComplete ? "#1E5833" : "#558A43", height: "100%", width: `${Math.round((cbte.completed / 3) * 100)}%` }} />
            </div>
            <div style={{ fontSize: 11, color: "#52755D", fontWeight: 600 }}>{cbte.isComplete ? "✓ Completed" : `${cbte.remaining} remaining`}</div>
          </div>

          <div style={{ background: "#F7FAF8", border: "1.5px solid #DCE9DE", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#1E3326" }}>
              <span>PE Meetings (Topics 1–12)</span>
              <span style={{ color: pe.isComplete ? "#1E5833" : "#244E36", fontWeight: 800 }}>{pe.completed}/12</span>
            </div>
            <div style={{ background: "#E4EEE5", borderRadius: 999, height: 6, margin: "7px 0 5px", overflow: "hidden" }}>
              <div style={{ background: pe.isComplete ? "#1E5833" : "#3B7F52", height: "100%", width: `${Math.round((pe.completed / 12) * 100)}%` }} />
            </div>
            <div style={{ fontSize: 11, color: "#52755D", fontWeight: 600 }}>{pe.isComplete ? "✓ Completed" : `${pe.remaining} remaining`}</div>
          </div>
        </div>
      </div>

      {/* Component Matrix Table with Integrated Clean Drawers */}
      <div style={{ border: "1.5px solid #D5E5D6", borderRadius: 14, overflow: "hidden", marginBottom: 18, background: "#FFFFFF", boxShadow: "0 2px 10px rgba(38, 101, 59, 0.04)" }}>
        <div style={{ padding: "14px 20px", background: "#F3F8F4", borderBottom: "1px solid #DCE8DD", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#1B3828", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Curriculum Component Breakdown
          </span>
          <button
            type="button"
            onClick={toggleAll}
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #C4DFC8",
              borderRadius: 7,
              padding: "5px 12px",
              fontSize: 12,
              fontWeight: 700,
              color: "#205634",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {isAllExpanded ? "Collapse All Details ▴" : "Expand All Checklists ▾"}
          </button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F8FAF8", borderBottom: "1.5px solid #DCE8DD" }}>
              <th style={{ textAlign: "left", padding: "12px 18px", fontSize: 11, fontWeight: 800, color: "#45634F", textTransform: "uppercase", letterSpacing: "0.03em" }}>Component</th>
              <th style={{ textAlign: "center", padding: "12px 14px", fontSize: 11, fontWeight: 800, color: "#45634F", textTransform: "uppercase", width: 100 }}>Completed</th>
              <th style={{ textAlign: "center", padding: "12px 14px", fontSize: 11, fontWeight: 800, color: "#45634F", textTransform: "uppercase", width: 90 }}>Required</th>
              <th style={{ textAlign: "left", padding: "12px 14px", fontSize: 11, fontWeight: 800, color: "#45634F", textTransform: "uppercase", width: 170 }}>Requirement Status</th>
              <th style={{ textAlign: "right", padding: "12px 18px", fontSize: 11, fontWeight: 800, color: "#45634F", textTransform: "uppercase" }}>Inspect Checklist</th>
            </tr>
          </thead>
          <tbody>
            {/* CBT Row */}
            <tr style={{ borderBottom: expanded.cbt ? "none" : "1px solid #EBF2EC" }}>
              <td style={{ padding: "14px 18px" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#1B3828" }}>CBT</div>
                <div style={{ fontSize: 12, color: "#52755D", marginTop: 2 }}>Core Cognitive Behavioral Therapy Topics (Sessions 1–28)</div>
              </td>
              <td style={{ textAlign: "center", padding: "14px 14px", fontWeight: 800, fontSize: 14, color: cbt.isComplete ? "#1E5833" : "#1B3828" }}>{cbt.completed}</td>
              <td style={{ textAlign: "center", padding: "14px 14px", fontWeight: 700, fontSize: 14, color: "#52755D" }}>28</td>
              <td style={{ padding: "14px 14px" }}>
                {cbt.isComplete ? (
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "#E8F5EC", color: "#166534", border: "1px solid #A3D9B1" }}>
                    ✓ Complete (28/28)
                  </span>
                ) : (
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "#F6F3EB", color: "#6E5218", border: "1px solid #DFD5BE" }}>
                    {cbt.remaining} remaining ({cbt.completed}/28)
                  </span>
                )}
              </td>
              <td style={{ textAlign: "right", padding: "14px 18px" }}>
                <button
                  type="button"
                  onClick={() => toggleComponent("cbt")}
                  style={{
                    background: expanded.cbt ? "#EBF4EC" : "#FFFFFF",
                    border: "1.5px solid #C2DEC6",
                    borderRadius: 7,
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#205634",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {expanded.cbt ? "Hide Topics ▴" : `Inspect Missing (${cbt.remaining}) ▾`}
                </button>
              </td>
            </tr>

            {/* CBT Drawer */}
            {expanded.cbt && (
              <tr style={{ background: "#F8FAF8", borderBottom: "1.5px solid #D5E5D6" }}>
                <td colSpan={5} style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#1B3828" }}>
                        {cbt.isComplete ? "All 28 CBT Topics Completed" : `Missing CBT Core Topics (${cbt.remaining} of 28 Pending)`}
                      </div>
                      <div style={{ fontSize: 11.5, color: "#52755D", marginTop: 2 }}>
                        Core Cognitive Behavioral Therapy Sessions 1–28 (ENTREPOSE Volume 1).
                      </div>
                    </div>
                    <span style={{ background: "#E8F4E8", color: "#166534", border: "1px solid #C4DFC8", borderRadius: 999, padding: "3px 10px", fontSize: 11.5, fontWeight: 700 }}>
                      {cbt.completed} / 28 Credited
                    </span>
                  </div>

                  {cbt.isComplete ? (
                    <div
                      style={{
                        background: "#F2F9F3",
                        border: "1.5px solid #B8E0BF",
                        borderRadius: 10,
                        padding: "14px 18px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: "#2A6A45",
                          color: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        ✓
                      </span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#166534" }}>
                          All 28 Core Cognitive Behavioral Therapy Topics Completed
                        </div>
                        <div style={{ fontSize: 11.5, color: "#3B6E4C", marginTop: 2 }}>
                          This patient has satisfied 100% of the 28-session CBT outpatient curriculum (ENTREPOSE Volume 1).
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 10 }}>
                      {(cbt.missingTopics || []).map((t) => (
                        <div
                          key={t.code || t.sessionNumber}
                          style={{
                            background: "#FFFFFF",
                            border: "1.5px solid #D5E5D6",
                            borderRadius: 9,
                            padding: "10px 14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            boxShadow: "0 1px 3px rgba(38, 101, 59, 0.04)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <span
                              style={{
                                background: "#E8F4E8",
                                color: "#1E5833",
                                border: "1px solid #C4DFC8",
                                borderRadius: 6,
                                padding: "3px 7px",
                                fontSize: 11,
                                fontWeight: 800,
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >
                              {t.code || `CBT-${t.sessionNumber}`}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#1B3828", lineHeight: 1.3, wordBreak: "break-word" }}>
                                {t.title}
                              </div>
                              {t.altTitle && (
                                <div style={{ fontSize: 10.5, color: "#52755D", marginTop: 2 }}>
                                  Standard: {t.altTitle}
                                </div>
                              )}
                            </div>
                          </div>
                          <span
                            style={{
                              background: "#F6F3EB",
                              color: "#7A5C1E",
                              border: "1px solid #DFD5BE",
                              borderRadius: 999,
                              padding: "2px 8px",
                              fontSize: 10.5,
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                          >
                            Incomplete
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            )}

            {/* CBT-E Row */}
            <tr style={{ borderBottom: expanded.cbte ? "none" : "1px solid #EBF2EC" }}>
              <td style={{ padding: "14px 18px" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#1B3828" }}>CBT-E</div>
                <div style={{ fontSize: 12, color: "#52755D", marginTop: 2 }}>CBT Clinical Evaluations (Recovery W5 · Relapse W13 · Tx Plan M6–7)</div>
              </td>
              <td style={{ textAlign: "center", padding: "14px 14px", fontWeight: 800, fontSize: 14, color: cbte.isComplete ? "#1E5833" : "#1B3828" }}>{cbte.completed}</td>
              <td style={{ textAlign: "center", padding: "14px 14px", fontWeight: 700, fontSize: 14, color: "#52755D" }}>3</td>
              <td style={{ padding: "14px 14px" }}>
                {cbte.isComplete ? (
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "#E8F5EC", color: "#166534", border: "1px solid #A3D9B1" }}>
                    ✓ Complete (3/3)
                  </span>
                ) : (
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "#F6F3EB", color: "#6E5218", border: "1px solid #DFD5BE" }}>
                    {cbte.remaining} remaining ({cbte.completed}/3)
                  </span>
                )}
              </td>
              <td style={{ textAlign: "right", padding: "14px 18px" }}>
                <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => toggleComponent("cbte")}
                    style={{
                      background: expanded.cbte ? "#EBF4EC" : "#FFFFFF",
                      border: "1.5px solid #C2DEC6",
                      borderRadius: 7,
                      padding: "5px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#205634",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {expanded.cbte ? "Hide Details ▴" : `Inspect (${cbte.remaining}) ▾`}
                  </button>
                </div>
              </td>
            </tr>

            {/* CBT-E Drawer */}
            {expanded.cbte && (
              <tr style={{ background: "#F8FAF8", borderBottom: "1.5px solid #D5E5D6" }}>
                <td colSpan={5} style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#1B3828" }}>
                        CBT Clinical Evaluation Stages (Approved ENTREPOSE Vol. 2A Worksheets)
                      </div>
                      <div style={{ fontSize: 11.5, color: "#52755D", marginTop: 2 }}>
                        Required milestone evaluations conducted at Weeks 5, 13, and Month 6–7.
                      </div>
                    </div>
                    <span style={{ background: "#E8F4E8", color: "#166534", border: "1px solid #C4DFC8", borderRadius: 999, padding: "3px 10px", fontSize: 11.5, fontWeight: 700 }}>
                      {cbte.completed} / 3 Completed
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                    {[
                      {
                        num: 1,
                        code: "CBT-E 1",
                        title: "Pagsusuri ng Katayuan ng Paggaling",
                        timing: "Week 5 (Recovery Status & Physical Stability)",
                        desc: "Comprehensive evaluation of early cognitive stability and treatment adherence.",
                        isDone: cbte.completed >= 1,
                      },
                      {
                        num: 2,
                        code: "CBT-E 2",
                        title: "Pag-iwas sa Muling Paggamit",
                        timing: "Week 13 (Relapse Prevention Behaviors)",
                        desc: "Mid-treatment review of craving triggers and behavioral coping strategies.",
                        isDone: cbte.completed >= 2,
                      },
                      {
                        num: 3,
                        code: "CBT-E 3",
                        title: "Pagpapatuloy ng Treatment Planning",
                        timing: "Month 6–7 (Continuing Care Review)",
                        desc: "Pre-discharge assessment and continuing community aftercare preparation.",
                        isDone: cbte.completed >= 3,
                      },
                    ].map((stage) => (
                      <div
                        key={stage.code}
                        style={{
                          background: stage.isDone ? "#F3FAF4" : "#FFFFFF",
                          border: stage.isDone ? "1.5px solid #A8DCB4" : "1.5px solid #D5E5D6",
                          borderRadius: 10,
                          padding: "14px 16px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: 10,
                          boxShadow: stage.isDone ? "0 2px 6px rgba(22, 101, 52, 0.05)" : "none",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span
                              style={{
                                background: stage.isDone ? "#244E36" : "#E8F4E8",
                                color: stage.isDone ? "#FFFFFF" : "#1E5833",
                                border: stage.isDone ? "none" : "1px solid #C4DFC8",
                                borderRadius: 6,
                                padding: "2px 8px",
                                fontSize: 11,
                                fontWeight: 800,
                              }}
                            >
                              {stage.code}
                            </span>
                            {stage.isDone ? (
                              <span style={{ fontSize: 11.5, fontWeight: 800, color: "#166534", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                ✓ Credited
                              </span>
                            ) : (
                              <span style={{ background: "#F6F3EB", color: "#7A5C1E", border: "1px solid #DFD5BE", borderRadius: 999, padding: "2px 8px", fontSize: 10.5, fontWeight: 700 }}>
                                Pending Assessment
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#1B3828", lineHeight: 1.35 }}>
                            {stage.title}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#3D6E49", marginTop: 3 }}>
                            {stage.timing}
                          </div>
                          <div style={{ fontSize: 11, color: "#52755D", marginTop: 4, lineHeight: 1.4 }}>
                            {stage.desc}
                          </div>
                        </div>

                        {!stage.isDone && (
                          <div style={{ fontSize: 11, color: "#6B7F5F", marginTop: 4, fontStyle: "italic" }}>
                            Credited when the client's attendance at this CBT-E session is recorded. The client answers the Vol. 2A worksheet.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            )}

            {/* PE Row */}
            <tr style={{ borderBottom: expanded.pe ? "none" : "1px solid #EBF2EC" }}>
              <td style={{ padding: "14px 18px" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#1B3828" }}>PE</div>
                <div style={{ fontSize: 12, color: "#52755D", marginTop: 2 }}>Required Patient Psycho-Education Curriculum Topics (1–12)</div>
              </td>
              <td style={{ textAlign: "center", padding: "14px 14px", fontWeight: 800, fontSize: 14, color: pe.isComplete ? "#1E5833" : "#1B3828" }}>{pe.completed}</td>
              <td style={{ textAlign: "center", padding: "14px 14px", fontWeight: 700, fontSize: 14, color: "#52755D" }}>12</td>
              <td style={{ padding: "14px 14px" }}>
                {pe.isComplete ? (
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "#E8F5EC", color: "#166534", border: "1px solid #A3D9B1" }}>
                    ✓ Complete (12/12)
                  </span>
                ) : (
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "#F6F3EB", color: "#6E5218", border: "1px solid #DFD5BE" }}>
                    {pe.remaining} remaining ({pe.completed}/12)
                  </span>
                )}
              </td>
              <td style={{ textAlign: "right", padding: "14px 18px" }}>
                <button
                  type="button"
                  onClick={() => toggleComponent("pe")}
                  style={{
                    background: expanded.pe ? "#EBF4EC" : "#FFFFFF",
                    border: "1.5px solid #C2DEC6",
                    borderRadius: 7,
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#205634",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {expanded.pe ? "Hide Topics ▴" : `Inspect Missing (${pe.remaining}) ▾`}
                </button>
              </td>
            </tr>

            {/* PE Drawer (Clean & Structured Requirement Grid) */}
            {expanded.pe && (
              <tr style={{ background: "#F8FAF8", borderBottom: "1.5px solid #D5E5D6" }}>
                <td colSpan={5} style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#1B3828" }}>
                        {pe.isComplete ? "All Psycho-Education Topics Credited" : `Missing Psycho-Education Topics (${pe.remaining} of 12 Pending Credit)`}
                      </div>
                      <div style={{ fontSize: 11.5, color: "#52755D", marginTop: 2 }}>
                        Approved Patient Psycho-Education Curriculum (ENTREPOSE Volume 1, Topics 1–12).
                      </div>
                    </div>
                    <span style={{ background: "#E8F4E8", color: "#166534", border: "1px solid #C4DFC8", borderRadius: 999, padding: "3px 10px", fontSize: 11.5, fontWeight: 700 }}>
                      {pe.completed} / 12 Credited
                    </span>
                  </div>

                  {pe.isComplete ? (
                    <div
                      style={{
                        background: "#F2F9F3",
                        border: "1.5px solid #B8E0BF",
                        borderRadius: 10,
                        padding: "14px 18px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: "#2A6A45",
                          color: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        ✓
                      </span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#166534" }}>
                          All 12 Psycho-Education Topics Completed
                        </div>
                        <div style={{ fontSize: 11.5, color: "#3B6E4C", marginTop: 2 }}>
                          This patient has satisfied all 12 psycho-education meetings required for curriculum graduation.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 10 }}>
                      {(pe.missingTopics || []).map((t) => (
                        <div
                          key={t.code || t.sessionNumber}
                          style={{
                            background: "#FFFFFF",
                            border: "1.5px solid #D5E5D6",
                            borderRadius: 9,
                            padding: "10px 14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            boxShadow: "0 1px 3px rgba(38, 101, 59, 0.04)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <span
                              style={{
                                background: "#E8F4E8",
                                color: "#1E5833",
                                border: "1px solid #C4DFC8",
                                borderRadius: 6,
                                padding: "3px 7px",
                                fontSize: 11,
                                fontWeight: 800,
                                letterSpacing: "0.02em",
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >
                              {t.code ? t.code.replace("PE-PAT-", "PE-") : `PE-${t.sessionNumber}`}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: "#1B3828",
                                  lineHeight: 1.3,
                                  wordBreak: "break-word",
                                }}
                              >
                                {t.title}
                              </div>
                              {t.altTitle && (
                                <div style={{ fontSize: 10.5, color: "#52755D", marginTop: 2 }}>
                                  Standard: {t.altTitle}
                                </div>
                              )}
                            </div>
                          </div>
                          <span
                            style={{
                              background: "#F6F3EB",
                              color: "#7A5C1E",
                              border: "1px solid #DFD5BE",
                              borderRadius: 999,
                              padding: "2px 8px",
                              fontSize: 10.5,
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                          >
                            Incomplete
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            )}

            {/* Total Core Row */}
            <tr style={{ background: "#EDF6EE", borderTop: "2px solid #B8DCBE" }}>
              <td style={{ padding: "14px 18px", fontWeight: 800, fontSize: 13.5, color: "#144826" }}>
                Total Core Requirements Credited
              </td>
              <td style={{ textAlign: "center", padding: "14px 14px", fontWeight: 900, fontSize: 15, color: "#144826" }}>
                {totalCore.completed}
              </td>
              <td style={{ textAlign: "center", padding: "14px 14px", fontWeight: 900, fontSize: 15, color: "#144826" }}>
                {totalCore.required}
              </td>
              <td colSpan={2} style={{ padding: "14px 18px", fontWeight: 700, fontSize: 12.5, color: "#166534" }}>
                {totalCore.isComplete
                  ? "✓ All 3 core components satisfied (28 CBT + 3 CBT-E + 12 PE)"
                  : `Missing ${totalCore.remaining} core requirement(s) across incomplete components`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Supplementary Services Box (Warm & Botanical) */}
      <div
        style={{
          background: "#F7FAF8",
          border: "1.5px solid #D5E5D6",
          borderRadius: 12,
          padding: "16px 20px",
          marginTop: 18,
          boxShadow: "0 1px 3px rgba(38, 101, 59, 0.03)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, color: "#244E36", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
          Supplementary Services & Additional Meetings (Tracked Separately from 43 Core Targets)
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "#E8F4E8", color: "#1E5833", border: "1px solid #C2DEC6" }}>
            SHGM (Self-Help): {supp.shgm ?? sessionSummary?.shgm ?? 0}
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "#EBF2EC", color: "#2C5438", border: "1px solid #C5DAC9" }}>
            Individual Counseling: {supp.indCounseling ?? sessionSummary?.indCounseling ?? 0}
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "#E5EFE7", color: "#234D30", border: "1px solid #BDD8C2" }}>
            Conjoint / Family: {supp.conjointFamily ?? sessionSummary?.conjointFamily ?? 0}
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "#F0F5F1", color: "#3B5A44", border: "1px solid #CDE0D1" }}>
            Orientation: {supp.orientation ?? 0}
          </span>
          {(supp.additionalPeMeetings > 0 || supp.additionalCbtMeetings > 0) && (
            <span style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "#F6F3EB", color: "#6E5218", border: "1px solid #DFD5BE" }}>
              Repeat / Additional Meetings: {(supp.additionalPeMeetings || 0) + (supp.additionalCbtMeetings || 0)}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: "#52755D", lineHeight: 1.45 }}>
          <strong>Note:</strong> The monthly OP CM Tracker records all conducted sessions, while curriculum progress measures unique core completions toward completion certification.
        </div>
      </div>
    </div>
  );
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
  subsectionTitle: {
    gridColumn: "1 / -1",
    marginTop: 6,
    paddingTop: 14,
    borderTop: "1px solid var(--color-border)",
    color: "var(--color-primary-dark)",
    fontSize: 13,
    fontWeight: 700,
  },
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
  sessionPill: { padding: "4px 12px", background: "#E2E8F0", borderRadius: 16, fontSize: 13, fontWeight: 500, color: "#2D3748" },

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
  pendingBanner: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    background: "#fff9eb",
    border: "1px solid #f0d59e",
    borderRadius: "var(--radius-md, 8px)",
    padding: "12px 18px",
    marginBottom: 16,
  },
  pendingBannerText: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  resumeBtn: {
    padding: "8px 16px",
    background: "var(--color-primary-dark, #234f39)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm, 6px)",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
};
