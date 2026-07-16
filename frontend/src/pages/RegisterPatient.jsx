import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";

const EMPTY_FORM = {
  firstName: "", middleName: "", lastName: "", gender: "", birthdate: "",
  civilStatus: "single", contactNumber: "", email: "", address: "", municipality: "",
  emergencyContactName: "", emergencyContactRelationship: "", emergencyContactNumber: "",
  admissionDate: "", referralSource: "", admissionType: "", programId: "",
  assignedCaseManagerId: "", admissionNotes: "",
  caseClassification: "", initialStatus: "", programPhase: "",
  expectedCompletionDate: "", sessionsRequired: "",
};

export default function RegisterPatient() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [programs, setPrograms] = useState([]);
  const [caseManagers, setCaseManagers] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/programs").then(({ data }) => setPrograms(data.programs));
    api.get("/users/case-managers").then(({ data }) => setCaseManagers(data.caseManagers));
  }, []);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/patients", form);
      navigate("/patients");
    } catch (err) {
      setError(err.response?.data?.message || "Could not register the patient.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Register Patient" description="Create a new patient record and admission profile.">
      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <div style={styles.error}>{error}</div>}

        <Section title="Personal Information">
          <Field label="First name" required>
            <input style={styles.input} value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required />
          </Field>
          <Field label="Middle name">
            <input style={styles.input} value={form.middleName} onChange={(e) => update("middleName", e.target.value)} />
          </Field>
          <Field label="Last name" required>
            <input style={styles.input} value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required />
          </Field>
          <Field label="Gender" required>
            <select style={styles.input} value={form.gender} onChange={(e) => update("gender", e.target.value)} required>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Birthdate" required>
            <input type="date" style={styles.input} value={form.birthdate} onChange={(e) => update("birthdate", e.target.value)} required />
          </Field>
          <Field label="Civil status">
            <select style={styles.input} value={form.civilStatus} onChange={(e) => update("civilStatus", e.target.value)}>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="widowed">Widowed</option>
              <option value="separated">Separated</option>
            </select>
          </Field>
          <Field label="Contact number">
            <input style={styles.input} value={form.contactNumber} onChange={(e) => update("contactNumber", e.target.value)} />
          </Field>
          <Field label="Email">
            <input type="email" style={styles.input} value={form.email} onChange={(e) => update("email", e.target.value)} />
          </Field>
          <Field label="Address" span={2}>
            <input style={styles.input} value={form.address} onChange={(e) => update("address", e.target.value)} />
          </Field>
          <Field label="Municipality">
            <input style={styles.input} value={form.municipality} onChange={(e) => update("municipality", e.target.value)} />
          </Field>
        </Section>

        <Section title="Emergency Contact">
          <Field label="Name">
            <input style={styles.input} value={form.emergencyContactName} onChange={(e) => update("emergencyContactName", e.target.value)} />
          </Field>
          <Field label="Relationship">
            <input style={styles.input} value={form.emergencyContactRelationship} onChange={(e) => update("emergencyContactRelationship", e.target.value)} />
          </Field>
          <Field label="Contact number">
            <input style={styles.input} value={form.emergencyContactNumber} onChange={(e) => update("emergencyContactNumber", e.target.value)} />
          </Field>
        </Section>

        <Section title="Admission">
          <Field label="Admission date">
            <input type="date" style={styles.input} value={form.admissionDate} onChange={(e) => update("admissionDate", e.target.value)} />
          </Field>
          <Field label="Referral source">
            <input style={styles.input} value={form.referralSource} onChange={(e) => update("referralSource", e.target.value)} />
          </Field>
          <Field label="Admission type">
            <input style={styles.input} value={form.admissionType} onChange={(e) => update("admissionType", e.target.value)} placeholder="e.g. Voluntary, Referred" />
          </Field>
          <Field label="Program">
            <select style={styles.input} value={form.programId} onChange={(e) => update("programId", e.target.value)}>
              <option value="">Select a program</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Assigned case manager">
            <select style={styles.input} value={form.assignedCaseManagerId} onChange={(e) => update("assignedCaseManagerId", e.target.value)}>
              <option value="">Select a case manager</option>
              {caseManagers.map((cm) => (
                <option key={cm.id} value={cm.id}>{cm.full_name}</option>
              ))}
            </select>
          </Field>
          <Field label="Admission notes" span={2}>
            <textarea style={{ ...styles.input, minHeight: 70 }} value={form.admissionNotes} onChange={(e) => update("admissionNotes", e.target.value)} />
          </Field>
        </Section>

        <Section title="Rehabilitation">
          <Field label="Case classification">
            <input style={styles.input} value={form.caseClassification} onChange={(e) => update("caseClassification", e.target.value)} />
          </Field>
          <Field label="Initial status">
            <input style={styles.input} value={form.initialStatus} onChange={(e) => update("initialStatus", e.target.value)} />
          </Field>
          <Field label="Program phase">
            <input style={styles.input} value={form.programPhase} onChange={(e) => update("programPhase", e.target.value)} />
          </Field>
          <Field label="Expected completion">
            <input type="date" style={styles.input} value={form.expectedCompletionDate} onChange={(e) => update("expectedCompletionDate", e.target.value)} />
          </Field>
          <Field label="Sessions required">
            <input type="number" min="0" style={styles.input} value={form.sessionsRequired} onChange={(e) => update("sessionsRequired", e.target.value)} />
          </Field>
        </Section>

        <div style={styles.actionsRow}>
          <button type="button" style={styles.cancelBtn} onClick={() => navigate("/patients")}>Cancel</button>
          <button type="submit" style={styles.submitBtn} disabled={saving}>
            {saving ? "Saving…" : "Register Patient"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      <div style={styles.grid}>{children}</div>
    </div>
  );
}

function Field({ label, required, span, children }) {
  return (
    <label style={{ ...styles.label, gridColumn: span ? `span ${span}` : undefined }}>
      {label} {required && <span style={styles.required}>*</span>}
      {children}
    </label>
  );
}

const styles = {
  form: { display: "flex", flexDirection: "column", gap: 24, maxWidth: 900, width: "100%", margin: "0 auto" },
  error: {
    background: "var(--color-danger-tint)",
    color: "var(--color-danger)",
    fontSize: 13,
    padding: "10px 14px",
    borderRadius: "var(--radius-sm)",
  },
  section: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--color-primary-dark)",
    marginBottom: 16,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "var(--color-text)",
  },
  required: { color: "var(--color-danger)" },
  input: {
    padding: "9px 10px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    fontSize: 14,
    fontFamily: "inherit",
  },
  actionsRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelBtn: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    padding: "10px 18px",
    borderRadius: "var(--radius-sm)",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },
  submitBtn: {
    background: "var(--color-primary)",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "var(--radius-sm)",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  },
};