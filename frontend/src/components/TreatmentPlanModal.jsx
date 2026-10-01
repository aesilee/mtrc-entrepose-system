import { useState } from "react";
import api from "../api/axios.js";

const DEFAULT_PROBLEM_DOMAINS = [
  { key: "SUBSTANCE_DEPENDENCE", label: "Substance Dependence & Craving Management" },
  { key: "LEGAL_RTC", label: "Legal / RTC Plea Bargaining Compliance" },
  { key: "FAMILY_INTERPERSONAL", label: "Family Conflict & Social Environment" },
  { key: "VOCATIONAL_EMPLOYMENT", label: "Vocational & Economic Stability" },
  { key: "HEALTH_COMORBIDITIES", label: "Physical Health & Co-occurring Conditions" },
];

const DEFAULT_MODALITIES = [
  { key: "CBT_GROUP", label: "CBT Group Counseling (28 Sessions)" },
  { key: "PSYCHO_EDUCATION", label: "Psycho-Education Meetings (12 Sessions)" },
  { key: "CBT_E", label: "CBT Evaluations (3 Sessions)" },
  { key: "CONJOINT_FAMILY", label: "Conjoint / Family Sessions" },
  { key: "INDIVIDUAL_COUNSELING", label: "Individual Counseling" },
  { key: "DRUG_TESTING", label: "Surveillance Urine Drug Screening" },
  { key: "SHGM", label: "Self-Help Group Meetings (SHGM)" },
];

const DEFAULT_GOALS = `1. Maintain continuous abstinence from all illicit and dangerous substances throughout outpatient enrollment.
2. Complete all 43 statutory core sessions (28 CBT group, 12 Psycho-Education, 3 CBT Evaluations).
3. Submit to mandatory and random surveillance urine drug screenings with negative results.
4. Strengthen familial support through participation in structured conjoint family meetings.
5. Comply with all legal conditions mandated by the handling Regional Trial Court (RTC).`;

const DEFAULT_RELAPSE_PLAN = `1. Recognize high-risk triggers (former peer networks, severe emotional stress, unstructured downtime).
2. Apply cognitive thought-stopping, 15-minute urge delaying, and situational avoidance.
3. Notify the assigned Case Manager or designated recovery support family member immediately upon experiencing strong cravings.`;

export default function TreatmentPlanModal({ patientId, existingPlan, onClose, onSaved }) {
  const defaultTargetDate = new Date();
  defaultTargetDate.setMonth(defaultTargetDate.getMonth() + 6);

  const [form, setForm] = useState({
    plan_date: existingPlan?.plan_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    target_completion_date: existingPlan?.target_completion_date?.slice(0, 10) || defaultTargetDate.toISOString().slice(0, 10),
    problem_domains: existingPlan?.problem_domains?.length 
      ? existingPlan.problem_domains 
      : ["SUBSTANCE_DEPENDENCE", "LEGAL_RTC", "FAMILY_INTERPERSONAL"],
    primary_goals: existingPlan?.primary_goals || DEFAULT_GOALS,
    intervention_modalities: existingPlan?.intervention_modalities?.length
      ? existingPlan.intervention_modalities
      : ["CBT_GROUP", "PSYCHO_EDUCATION", "CBT_E", "CONJOINT_FAMILY", "DRUG_TESTING"],
    relapse_prevention_plan: existingPlan?.relapse_prevention_plan || DEFAULT_RELAPSE_PLAN,
    client_agreed: existingPlan ? Boolean(existingPlan.client_agreed) : true,
    status: existingPlan?.status || "active",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleDomain(key) {
    setForm(prev => {
      const exists = prev.problem_domains.includes(key);
      const next = exists ? prev.problem_domains.filter(k => k !== key) : [...prev.problem_domains, key];
      return { ...prev, problem_domains: next };
    });
  }

  function toggleModality(key) {
    setForm(prev => {
      const exists = prev.intervention_modalities.includes(key);
      const next = exists ? prev.intervention_modalities.filter(k => k !== key) : [...prev.intervention_modalities, key];
      return { ...prev, intervention_modalities: next };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!patientId) {
      setError("No patient ID provided.");
      return;
    }
    if (!form.problem_domains.length) {
      setError("Please select at least one problem domain.");
      return;
    }
    if (!form.intervention_modalities.length) {
      setError("Please select at least one intervention modality.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api.post(`/case-management/patients/${patientId}/treatment-plan`, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save treatment plan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>
              {existingPlan ? "Edit Individualized Treatment Plan (ITP)" : "Formulate Individualized Treatment Plan (ITP)"}
            </h2>
            <p style={styles.subtitle}>
              Establishes clinical problem domains, 43-session roadmap, and statutory compliance milestones.
            </p>
          </div>
          <button type="button" onClick={onClose} style={styles.closeBtn} disabled={saving}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.grid2}>
            <label style={styles.label}>
              Plan Formulation Date *
              <input
                type="date"
                required
                style={styles.input}
                value={form.plan_date}
                onChange={e => setForm(f => ({ ...f, plan_date: e.target.value }))}
                disabled={saving}
              />
              <span style={styles.hint}>Automatically synchronizes to Milestones & DOH Tracker</span>
            </label>

            <label style={styles.label}>
              Target Completion Date
              <input
                type="date"
                style={styles.input}
                value={form.target_completion_date}
                onChange={e => setForm(f => ({ ...f, target_completion_date: e.target.value }))}
                disabled={saving}
              />
              <span style={styles.hint}>Standard DOH Outpatient duration: 6 months</span>
            </label>
          </div>

          <div style={styles.sectionBlock}>
            <div style={styles.sectionTitle}>1. Identified Problem Domains</div>
            <div style={styles.checkboxGrid}>
              {DEFAULT_PROBLEM_DOMAINS.map(d => {
                const checked = form.problem_domains.includes(d.key);
                return (
                  <label key={d.key} style={{ ...styles.checkboxCard, ...(checked ? styles.checkboxCardActive : {}) }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDomain(d.key)}
                      disabled={saving}
                      style={{ marginRight: 8 }}
                    />
                    <span style={{ fontSize: 13, fontWeight: checked ? 700 : 500 }}>{d.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={styles.sectionBlock}>
            <div style={styles.sectionTitle}>2. Measurable Target Goals & Objectives *</div>
            <textarea
              required
              rows={5}
              style={styles.textarea}
              value={form.primary_goals}
              onChange={e => setForm(f => ({ ...f, primary_goals: e.target.value }))}
              placeholder="Outline specific measurable clinical goals..."
              disabled={saving}
            />
          </div>

          <div style={styles.sectionBlock}>
            <div style={styles.sectionTitle}>3. Prescribed Intervention Modalities</div>
            <div style={styles.checkboxGrid}>
              {DEFAULT_MODALITIES.map(m => {
                const checked = form.intervention_modalities.includes(m.key);
                return (
                  <label key={m.key} style={{ ...styles.checkboxCard, ...(checked ? styles.checkboxCardActive : {}) }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleModality(m.key)}
                      disabled={saving}
                      style={{ marginRight: 8 }}
                    />
                    <span style={{ fontSize: 13, fontWeight: checked ? 700 : 500 }}>{m.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={styles.sectionBlock}>
            <div style={styles.sectionTitle}>4. Relapse Prevention & Coping Protocol</div>
            <textarea
              rows={4}
              style={styles.textarea}
              value={form.relapse_prevention_plan}
              onChange={e => setForm(f => ({ ...f, relapse_prevention_plan: e.target.value }))}
              placeholder="Outline trigger management, coping mechanics, and emergency contacts..."
              disabled={saving}
            />
          </div>

          <div style={styles.agreementCard}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.client_agreed}
                onChange={e => setForm(f => ({ ...f, client_agreed: e.target.checked }))}
                disabled={saving}
                style={{ marginTop: 2 }}
              />
              <span style={{ fontSize: 12.5, color: "#2D3748", lineHeight: 1.4 }}>
                <strong>Client Commitment & Consent:</strong> The patient has actively participated in this treatment planning conference, received a clear explanation of program expectations, and committed to complying with all scheduled sessions, drug tests, and treatment rules.
              </span>
            </label>
          </div>

          <div style={styles.footer}>
            <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" style={styles.saveBtn} disabled={saving}>
              {saving ? "Saving Plan..." : existingPlan ? "Update Treatment Plan" : "Finalize Treatment Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
    boxSizing: "border-box",
  },
  modal: {
    background: "#fff",
    borderRadius: 12,
    width: "100%",
    maxWidth: 760,
    maxHeight: "92vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
    overflow: "hidden",
  },
  header: {
    padding: "20px 24px 16px",
    borderBottom: "1px solid #E2E8F0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    color: "#1A202C",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: 12.5,
    color: "#718096",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 24,
    lineHeight: 1,
    color: "#A0AEC0",
    cursor: "pointer",
    padding: 0,
  },
  form: {
    padding: "20px 24px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  error: {
    padding: "10px 14px",
    background: "#FDE2E2",
    color: "#B3261E",
    borderRadius: 6,
    fontSize: 13,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    fontSize: 13,
    fontWeight: 600,
    color: "#4A5568",
  },
  input: {
    padding: "8px 12px",
    border: "1px solid #CBD5E0",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "inherit",
  },
  hint: {
    fontSize: 11,
    color: "#718096",
    fontWeight: 400,
  },
  sectionBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#2D3748",
  },
  checkboxGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 8,
  },
  checkboxCard: {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #E2E8F0",
    background: "#F7FAFC",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  checkboxCardActive: {
    borderColor: "var(--color-primary, #1A7F4B)",
    background: "var(--color-primary-tint, #D8F5E9)",
    color: "var(--color-primary-dark, #0d4a2b)",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #CBD5E0",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "inherit",
    lineHeight: 1.5,
    resize: "vertical",
  },
  agreementCard: {
    padding: "12px 16px",
    background: "#EDF2F7",
    borderRadius: 8,
    border: "1px solid #E2E8F0",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    paddingTop: 10,
    borderTop: "1px solid #E2E8F0",
  },
  cancelBtn: {
    padding: "9px 18px",
    background: "none",
    border: "1px solid #CBD5E0",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "#4A5568",
    cursor: "pointer",
  },
  saveBtn: {
    padding: "9px 20px",
    background: "var(--color-primary, #1A7F4B)",
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "#fff",
    cursor: "pointer",
  },
};
