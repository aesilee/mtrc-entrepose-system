import { useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

export const INTERVENTION_OPTIONS = [
  {
    value: "HOME_VISIT",
    label: "Home Visit / Field Follow-up",
    desc: "In-person visit to client's home or community to verify living conditions and family support.",
    badgeColor: "#1E40AF",
    badgeBg: "#DBEAFE",
  },
  {
    value: "CONSULTATION_INTERNAL",
    label: "Internal Consultation within MTRC",
    desc: "Medical, Psychiatric, Dental, or Psychological clinical consultation within MTRC.",
    badgeColor: "#065F46",
    badgeBg: "#D1FAE5",
  },
  {
    value: "FAMILY_COORDINATION",
    label: "Family Coordination & Support Session",
    desc: "Face-to-face or structured coordination with family/guardian regarding recovery support.",
    badgeColor: "#854D0E",
    badgeBg: "#FEF9C3",
  },
  {
    value: "TREATMENT_PLANNING",
    label: "Treatment Planning (ITP Formulation / Review)",
    desc: "Initial formulation, 3-month review, or modification of Individualized Treatment Plan.",
    badgeColor: "#5B21B6",
    badgeBg: "#EDE9FE",
  },
  {
    value: "ASSESSMENT_CLINICAL",
    label: "Clinical / Addiction Assessment (ASI / DDE)",
    desc: "Comprehensive diagnostic intake, Addiction Severity Index (ASI), or clinical reassessment.",
    badgeColor: "#374151",
    badgeBg: "#F3F4F6",
  },
  {
    value: "CASE_CONFERENCE",
    label: "Multi-Disciplinary Case Conference",
    desc: "Case management conference with physician, psychologist, social worker, or court officers.",
    badgeColor: "#9D174D",
    badgeBg: "#FCE7F3",
  },
  {
    value: "STATUS_REPORT_PREP",
    label: "Court / Legal Status Report Preparation",
    desc: "Formulation and compilation of periodic statutory progress report for the Regional Trial Court.",
    badgeColor: "#1E3A8A",
    badgeBg: "#E0E7FF",
  },
  {
    value: "REFERRAL_OUTSIDE",
    label: "Referral Outside MTRC / Inter-Agency Coordination",
    desc: "Referral to external health institution, LGU recovery group, vocational training, or social service.",
    badgeColor: "#9A3412",
    badgeBg: "#FFEDD5",
  },
  {
    value: "CRISIS_INTERVENTION",
    label: "Crisis Intervention & Relapse Response",
    desc: "Urgent clinical de-escalation, family crisis resolution, or craving/near-use support.",
    badgeColor: "#991B1B",
    badgeBg: "#FEE2E2",
  },
  {
    value: "AFTERCARE_PLANNING",
    label: "Aftercare & Pre-Discharge Planning (ACP / PDC)",
    desc: "Coordination for Pre-Discharge Conference and enrollment into 9-Month Community Aftercare (SIBOL).",
    badgeColor: "#155E75",
    badgeBg: "#CFFAFE",
  },
  {
    value: "OTHER_CLINICAL",
    label: "Other Documented Case Management Service",
    desc: "Other authorized supportive clinical service or collateral coordination.",
    badgeColor: "#4B5563",
    badgeBg: "#E5E7EB",
  },
];

export const CONSULT_OPTIONS = [
  { value: "M", label: "M — Medical (General Medicine / Physical Exam / Labs)" },
  { value: "P", label: "P — Psychiatric (Psychiatric Evaluation / Psychopharmacology)" },
  { value: "D", label: "D — Dental (Dental Health Assessment / Care)" },
  { value: "PSYCH", label: "PSYCH — Psychological (Psychological Testing / Evaluation)" },
  { value: "OTHER", label: "OTHER — Other Specialized Clinical Consultation" },
];

export const LOCATION_OPTIONS = [
  "In-Center (MTRC Outpatient Office)",
  "Home Visit / Field / Residence",
  "Regional Trial Court / Hall of Justice",
  "External Hospital / Health Facility",
  "Barangay / Community Center",
  "Tele-Consultation / Structured Phone Call",
];

function toDateString(d) {
  if (!d) return new Date().toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

export default function InterventionModal({
  patientId,
  patientName = "",
  intervention = null,
  onClose,
  onSaved,
}) {
  const { user } = useAuth();
  const isEditing = Boolean(intervention?.id);

  const [form, setForm] = useState({
    interventionDate: toDateString(intervention?.intervention_date),
    interventionType: intervention?.intervention_type || "HOME_VISIT",
    consultType: intervention?.consult_type || "M",
    responsibleStaffName:
      intervention?.responsible_staff_name || user?.full_name || "Assigned Case Manager",
    locationSetting:
      intervention?.location_setting || "In-Center (MTRC Outpatient Office)",
    qualifiesForTracker:
      intervention?.qualifies_for_monthly_tracker !== undefined
        ? Boolean(intervention.qualifies_for_monthly_tracker)
        : true,
    remarks: intervention?.remarks || "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isConsultation =
    form.interventionType === "CONSULTATION_INTERNAL" || Boolean(form.consultType);

  const selectedTypeObj =
    INTERVENTION_OPTIONS.find((t) => t.value === form.interventionType) || INTERVENTION_OPTIONS[0];

  function update(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-adjust default location if Home Visit is selected
      if (field === "interventionType") {
        if (value === "HOME_VISIT" && prev.locationSetting === "In-Center (MTRC Outpatient Office)") {
          next.locationSetting = "Home Visit / Field / Residence";
        } else if (value === "STATUS_REPORT_PREP" && prev.locationSetting === "Home Visit / Field / Residence") {
          next.locationSetting = "In-Center (MTRC Outpatient Office)";
        }
      }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.interventionDate) {
      setError("Please select the date of intervention.");
      return;
    }
    if (!form.responsibleStaffName.trim()) {
      setError("Please specify the responsible clinician or staff member.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        interventionDate: form.interventionDate,
        interventionType: form.interventionType,
        consultType: form.interventionType === "CONSULTATION_INTERNAL" ? form.consultType : null,
        responsibleStaffName: form.responsibleStaffName.trim(),
        locationSetting: form.locationSetting,
        qualifiesForTracker: form.qualifiesForTracker ? 1 : 0,
        remarks: form.remarks.trim() || null,
      };

      if (isEditing) {
        await api.put(`/case-management/patients/${patientId}/interventions/${intervention.id}`, payload);
      } else {
        await api.post(`/case-management/patients/${patientId}/interventions`, payload);
      }

      onSaved();
    } catch (err) {
      console.error("Error saving intervention:", err);
      setError(err.response?.data?.message || "Failed to save clinical intervention.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.badgeRow}>
              <span style={styles.tag}>Task 7: Case Management Interventions</span>
              <span style={{ ...styles.pill, background: selectedTypeObj.badgeBg, color: selectedTypeObj.badgeColor }}>
                {selectedTypeObj.label}
              </span>
            </div>
            <h2 style={styles.title}>
              {isEditing ? "Edit Clinical Intervention" : "Record Clinical Intervention & Consultation"}
            </h2>
            <p style={styles.subtitle}>
              Document client-specific clinical services (Home visits, consultations, case conferences, referrals, etc.)
              for {patientName || "the patient"} to reflect in the MTRC Monthly Case Management Tracker.
            </p>
          </div>
          <button style={styles.closeBtn} onClick={onClose} type="button">
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={styles.body}>
          {error && <div style={styles.errorBox}>{error}</div>}

          {/* Grid: Date & Type */}
          <div style={styles.grid2}>
            <label style={styles.label}>
              <span style={styles.labelTitle}>Date of Service / Intervention *</span>
              <input
                type="date"
                style={styles.input}
                value={form.interventionDate}
                onChange={(e) => update("interventionDate", e.target.value)}
                required
              />
            </label>

            <label style={styles.label}>
              <span style={styles.labelTitle}>Intervention Modality / Service *</span>
              <select
                style={styles.select}
                value={form.interventionType}
                onChange={(e) => update("interventionType", e.target.value)}
                required
              >
                {INTERVENTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Description helper box */}
          <div style={styles.descBox}>
            <span style={{ fontWeight: 600, color: "#1E293B" }}>Clinical Definition:</span>{" "}
            {selectedTypeObj.desc}
          </div>

          {/* If Consultation: Subtype selector */}
          {form.interventionType === "CONSULTATION_INTERNAL" && (
            <div style={styles.consultBox}>
              <label style={styles.label}>
                <span style={styles.labelTitle}>Consultation Type within MTRC *</span>
                <select
                  style={styles.select}
                  value={form.consultType}
                  onChange={(e) => update("consultType", e.target.value)}
                  required
                >
                  {CONSULT_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <span style={styles.hint}>
                  Selecting Medical (M) or Psychiatric (P) updates the tracker's Consult column and synchronizes with patient consult logs.
                </span>
              </label>
            </div>
          )}

          {/* Grid: Responsible Staff & Setting */}
          <div style={styles.grid2}>
            <label style={styles.label}>
              <span style={styles.labelTitle}>Responsible Clinician / Staff Member *</span>
              <input
                type="text"
                style={styles.input}
                value={form.responsibleStaffName}
                onChange={(e) => update("responsibleStaffName", e.target.value)}
                placeholder="e.g. Joshua Loretcha / Dr. Medical Officer"
                required
              />
            </label>

            <label style={styles.label}>
              <span style={styles.labelTitle}>Setting / Service Location</span>
              <select
                style={styles.select}
                value={form.locationSetting}
                onChange={(e) => update("locationSetting", e.target.value)}
              >
                {LOCATION_OPTIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Monthly Tracker Qualification Checkbox */}
          <div style={styles.trackerBox}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.qualifiesForTracker}
                onChange={(e) => update("qualifiesForTracker", e.target.checked)}
                style={{ marginTop: 3, width: 16, height: 16, accentColor: "#2F6F4F" }}
              />
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1F2937" }}>
                  Qualifies for Monthly Case Management Tracker ("Intervention Conducted" Indicator)
                </span>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#4B5563", lineHeight: 1.4 }}>
                  Under MTRC guidelines, documented services (Home Visits, Case Conferences, Court Reports, Consultations,
                  and Referrals) qualify as active monthly interventions even if the client attended zero group sessions.
                </p>
              </div>
            </label>
          </div>

          {/* Remarks / Narrative */}
          <label style={styles.label}>
            <span style={styles.labelTitle}>
              Clinical Observations, Notes, and Recommendations
            </span>
            <textarea
              style={styles.textarea}
              rows={4}
              value={form.remarks}
              onChange={(e) => update("remarks", e.target.value)}
              placeholder="Document specific details: findings, issues addressed, family reaction, court orders received, referrals coordinated, or follow-up milestones set..."
            />
          </label>

          {/* Footer Actions */}
          <div style={styles.footer}>
            <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" style={styles.saveBtn} disabled={saving}>
              {saving ? "Saving Record..." : isEditing ? "Save Changes" : "Record Clinical Intervention"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.45)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1050,
    padding: 16,
  },
  modal: {
    background: "#FFFFFF",
    borderRadius: 12,
    width: "100%",
    maxWidth: 640,
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "20px 24px 16px",
    borderBottom: "1px solid #E5E7EB",
    background: "#F9FAFB",
  },
  badgeRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  tag: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#4B5563",
    background: "#E5E7EB",
    padding: "2px 8px",
    borderRadius: 4,
  },
  pill: {
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 9999,
  },
  title: {
    margin: "0 0 4px",
    fontSize: 18,
    fontWeight: 800,
    color: "#111827",
  },
  subtitle: {
    margin: 0,
    fontSize: 12.5,
    color: "#6B7280",
    lineHeight: 1.45,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 26,
    color: "#9CA3AF",
    cursor: "pointer",
    lineHeight: 1,
    padding: 0,
  },
  body: {
    padding: "20px 24px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  errorBox: {
    background: "#FEE2E2",
    border: "1px solid #FCA5A5",
    color: "#991B1B",
    padding: "10px 14px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  labelTitle: {
    fontSize: 12.5,
    fontWeight: 700,
    color: "#374151",
  },
  input: {
    padding: "9px 12px",
    borderRadius: 6,
    border: "1px solid #D1D5DB",
    fontSize: 13,
    color: "#111827",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  select: {
    padding: "9px 12px",
    borderRadius: 6,
    border: "1px solid #D1D5DB",
    fontSize: 13,
    color: "#111827",
    outline: "none",
    background: "#FFF",
    width: "100%",
    boxSizing: "border-box",
  },
  descBox: {
    background: "#F0FDF4",
    border: "1px solid #BBF7D0",
    padding: "8px 12px",
    borderRadius: 6,
    fontSize: 12,
    color: "#166534",
    lineHeight: 1.4,
  },
  consultBox: {
    background: "#F0F9FF",
    border: "1px solid #BAE6FD",
    padding: "12px 14px",
    borderRadius: 6,
  },
  hint: {
    fontSize: 11.5,
    color: "#0369A1",
    marginTop: 4,
    lineHeight: 1.35,
  },
  trackerBox: {
    background: "#FAF5FF",
    border: "1px solid #E9D5FF",
    padding: "12px 14px",
    borderRadius: 6,
  },
  textarea: {
    padding: "10px 12px",
    borderRadius: 6,
    border: "1px solid #D1D5DB",
    fontSize: 13,
    color: "#111827",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
    resize: "vertical",
    lineHeight: 1.45,
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    paddingTop: 10,
    borderTop: "1px solid #E5E7EB",
  },
  cancelBtn: {
    background: "#FFFFFF",
    border: "1px solid #D1D5DB",
    borderRadius: 6,
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    cursor: "pointer",
  },
  saveBtn: {
    background: "#2F6F4F",
    border: "none",
    borderRadius: 6,
    padding: "9px 18px",
    fontSize: 13,
    fontWeight: 700,
    color: "#FFFFFF",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
  },
};
