import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";

const EMPTY_FORM = {
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  preferredName: "",
  gender: "",
  birthdate: "",
  civilStatus: "single",
  nationality: "",
  occupation: "",
  educationalAttainment: "",
  contactNumber: "",
  email: "",
  address: "",
  municipality: "",
  province: "",
  postalCode: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactNumber: "",
  emergencyContactEmail: "",
  emergencyContactAddress: "",
  emergencyContactMethod: "",
  emergencyContactMethodOther: "",
  hasGuardian: false,
  guardianName: "",
  guardianRelationship: "",
  guardianContactNumber: "",
  guardianAddress: "",
};

const PHONE_PATTERN = "[0-9+()\\- ]{7,30}";
const TODAY = new Date().toISOString().slice(0, 10);

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

function calculateAge(birthdate) {
  if (!birthdate) return null;
  const [year, month, day] = birthdate.split("-").map(Number);
  if (!year || !month || !day) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  const birthdayHasPassed = today.getMonth() + 1 > month
    || (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!birthdayHasPassed) age -= 1;
  return age;
}

export default function RegisterPatient() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const age = calculateAge(form.birthdate);
  const guardianRequired = age !== null && age < 18;
  const showGuardian = guardianRequired || form.hasGuardian;

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.birthdate > TODAY) {
      setError("Birthdate cannot be in the future.");
      return;
    }

    if (guardianRequired && (!form.guardianName || !form.guardianRelationship || !form.guardianContactNumber || !form.guardianAddress)) {
      setError("Complete the guardian information for a patient under 18 years old.");
      return;
    }

    if (form.emergencyContactMethod === "other" && !form.emergencyContactMethodOther.trim()) {
      setError("Specify the preferred contact method when Other is selected.");
      return;
    }

    setSaving(true);
    try {
      const formPayload = showGuardian
        ? form
        : {
            ...form,
            guardianName: "",
            guardianRelationship: "",
            guardianContactNumber: "",
            guardianAddress: "",
          };
      const payload = {
        ...formPayload,
        emergencyContactMethod: form.emergencyContactMethod === "other"
          ? form.emergencyContactMethodOther.trim()
          : form.emergencyContactMethod,
      };
      delete payload.emergencyContactMethodOther;
      delete payload.hasGuardian;
      const { data } = await api.post("/patients", payload);
      navigate(`/patients/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not register the patient.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Register Patient" description="Create the patient's identity and contact record.">
      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <div role="alert" style={styles.error}>{error}</div>}

        <Section
          title="Patient Identity"
          description="Record the patient's identifying and basic demographic information."
        >
          <Field label="First name" required>
            <input autoComplete="given-name" style={styles.input} value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required />
          </Field>
          <Field label="Middle name">
            <input autoComplete="additional-name" style={styles.input} value={form.middleName} onChange={(e) => update("middleName", e.target.value)} />
          </Field>
          <Field label="Last name" required>
            <input autoComplete="family-name" style={styles.input} value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required />
          </Field>
          <Field label="Suffix">
            <input style={styles.input} value={form.suffix} onChange={(e) => update("suffix", e.target.value)} placeholder="e.g. Jr., Sr., III" />
          </Field>
          <Field label="Preferred name">
            <input style={styles.input} value={form.preferredName} onChange={(e) => update("preferredName", e.target.value)} />
          </Field>
          <Field label="Birthdate" required>
            <input type="date" max={TODAY} autoComplete="bday" style={styles.input} value={form.birthdate} onChange={(e) => update("birthdate", e.target.value)} required />
          </Field>
          <Field label="Age" hint="Calculated automatically from the birthdate.">
            <div style={styles.readOnlyValue}>{age === null ? "—" : age}</div>
          </Field>
          <Field label="Sex" required>
            <select style={styles.input} value={form.gender} onChange={(e) => update("gender", e.target.value)} required>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Civil or marital status">
            <select style={styles.input} value={form.civilStatus} onChange={(e) => update("civilStatus", e.target.value)}>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="widowed">Widowed</option>
              <option value="separated">Separated</option>
            </select>
          </Field>
          <Field label="Nationality">
            <input style={styles.input} value={form.nationality} onChange={(e) => update("nationality", e.target.value)} />
          </Field>
          <Field label="Occupation">
            <input autoComplete="organization-title" style={styles.input} value={form.occupation} onChange={(e) => update("occupation", e.target.value)} />
          </Field>
          <Field label="Educational attainment">
            <select style={styles.input} value={form.educationalAttainment} onChange={(e) => update("educationalAttainment", e.target.value)}>
              <option value="">Select</option>
              {EDUCATION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>
        </Section>

        <Section
          title="Contact Information"
          description="Use current contact details that staff can rely on for administrative communication."
        >
          <Field label="Mobile number">
            <input type="tel" inputMode="tel" autoComplete="tel" pattern={PHONE_PATTERN} title="Enter 7 to 30 valid phone characters." style={styles.input} value={form.contactNumber} onChange={(e) => update("contactNumber", e.target.value)} />
          </Field>
          <Field label="Email">
            <input type="email" autoComplete="email" style={styles.input} value={form.email} onChange={(e) => update("email", e.target.value)} />
          </Field>
          <Field label="Home address" required wide>
            <input autoComplete="street-address" style={styles.input} value={form.address} onChange={(e) => update("address", e.target.value)} required />
          </Field>
          <Field label="City or municipality" required>
            <input autoComplete="address-level2" style={styles.input} value={form.municipality} onChange={(e) => update("municipality", e.target.value)} required />
          </Field>
          <Field label="Province" required>
            <input autoComplete="address-level1" style={styles.input} value={form.province} onChange={(e) => update("province", e.target.value)} required />
          </Field>
          <Field label="Postal code">
            <input inputMode="numeric" autoComplete="postal-code" style={styles.input} value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} />
          </Field>
        </Section>

        <Section
          title="Emergency Contact"
          description="Provide a reliable person to contact during an emergency."
        >
          <Field label="Name" required>
            <input style={styles.input} value={form.emergencyContactName} onChange={(e) => update("emergencyContactName", e.target.value)} required />
          </Field>
          <Field label="Relationship" required>
            <input style={styles.input} value={form.emergencyContactRelationship} onChange={(e) => update("emergencyContactRelationship", e.target.value)} required />
          </Field>
          <Field label="Contact number" required>
            <input type="tel" inputMode="tel" pattern={PHONE_PATTERN} title="Enter 7 to 30 valid phone characters." style={styles.input} value={form.emergencyContactNumber} onChange={(e) => update("emergencyContactNumber", e.target.value)} required />
          </Field>
          <Field label="Preferred contact method">
            <select style={styles.input} value={form.emergencyContactMethod} onChange={(e) => update("emergencyContactMethod", e.target.value)}>
              <option value="">Select</option>
              <option value="call">Phone call</option>
              <option value="sms">SMS or text message</option>
              <option value="email">Email</option>
              <option value="other">Other</option>
            </select>
          </Field>
          {form.emergencyContactMethod === "other" && (
            <Field label="Specify contact method" required>
              <input
                maxLength={30}
                style={styles.input}
                value={form.emergencyContactMethodOther}
                onChange={(e) => update("emergencyContactMethodOther", e.target.value)}
                placeholder="e.g. Messenger, Viber"
                required
              />
            </Field>
          )}
          {form.emergencyContactMethod === "email" && (
            <Field label="Emergency contact email" required>
              <input
                type="email"
                autoComplete="email"
                maxLength={255}
                style={styles.input}
                value={form.emergencyContactEmail}
                onChange={(e) => update("emergencyContactEmail", e.target.value)}
                placeholder="name@example.com"
                required
              />
            </Field>
          )}
          <Field label="Address" wide>
            <input style={styles.input} value={form.emergencyContactAddress} onChange={(e) => update("emergencyContactAddress", e.target.value)} />
          </Field>
        </Section>

        <Section
          title="Guardian or Representative"
          description="Required for patients under 18; optional for adults who have an authorized representative."
        >
          <div style={styles.guardianToggle}>
            <input
              id="has-guardian"
              type="checkbox"
              checked={showGuardian}
              disabled={guardianRequired}
              onChange={(e) => update("hasGuardian", e.target.checked)}
            />
            <label htmlFor="has-guardian" style={styles.guardianToggleLabel}>
              {guardianRequired ? "Guardian required because the patient is under 18" : "Patient has a guardian or authorized representative"}
            </label>
          </div>

          {showGuardian && (
            <>
              <Field label="Guardian name" required>
                <input style={styles.input} value={form.guardianName} onChange={(e) => update("guardianName", e.target.value)} required />
              </Field>
              <Field label="Relationship" required>
                <input style={styles.input} value={form.guardianRelationship} onChange={(e) => update("guardianRelationship", e.target.value)} required />
              </Field>
              <Field label="Contact number" required>
                <input type="tel" inputMode="tel" pattern={PHONE_PATTERN} title="Enter 7 to 30 valid phone characters." style={styles.input} value={form.guardianContactNumber} onChange={(e) => update("guardianContactNumber", e.target.value)} required />
              </Field>
              <Field label="Address" required wide>
                <input style={styles.input} value={form.guardianAddress} onChange={(e) => update("guardianAddress", e.target.value)} required />
              </Field>
            </>
          )}
        </Section>

        <div style={styles.actionsRow}>
          <button type="button" style={styles.cancelBtn} onClick={() => navigate("/patients")}>Cancel</button>
          <button type="submit" style={styles.submitBtn} disabled={saving}>
            {saving ? "Registering…" : "Register Patient"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}

function Section({ title, description, children }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      <div style={styles.sectionDescription}>{description}</div>
      <div className="registration-grid" style={styles.grid}>{children}</div>
    </section>
  );
}

function Field({ label, required, full, wide, hint, children }) {
  const className = [
    "registration-field",
    full ? "registration-field--full" : "",
    wide ? "registration-field--wide" : "",
  ].filter(Boolean).join(" ");

  return (
    <label className={className} style={styles.label}>
      <span>{label} {required && <span style={styles.required}>*</span>}</span>
      {children}
      {hint && <span style={styles.hint}>{hint}</span>}
    </label>
  );
}

const styles = {
  form: { display: "flex", flexDirection: "column", gap: 20, maxWidth: 1320, width: "100%", margin: "0 auto" },
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
    fontSize: 15,
    fontWeight: 700,
    color: "var(--color-primary-dark)",
  },
  sectionDescription: {
    color: "var(--color-text-muted)",
    fontSize: 12,
    lineHeight: 1.5,
    marginTop: 4,
    marginBottom: 16,
  },
  grid: {
    display: "grid",
    gap: 16,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
    fontSize: 13,
    fontWeight: 600,
    color: "var(--color-text)",
  },
  required: { color: "var(--color-danger)" },
  hint: { color: "var(--color-text-muted)", fontSize: 11, fontWeight: 400 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 11px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    color: "var(--color-text)",
    fontSize: 14,
    fontFamily: "inherit",
  },
  readOnlyValue: {
    padding: "10px 11px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    background: "var(--color-background)",
    color: "var(--color-text-muted)",
    fontSize: 14,
    fontWeight: 500,
  },
  guardianToggle: {
    gridColumn: "1 / -1",
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-primary-tint)",
  },
  guardianToggleLabel: { color: "var(--color-primary-dark)", fontSize: 13, fontWeight: 600, cursor: "pointer" },
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
