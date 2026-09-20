import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import PatientWorkflowProgress from "../components/PatientWorkflowProgress.jsx";
import api from "../api/axios.js";

const EMPTY_FORM = {
  caseType: "substance_use",
  assignedCaseManagerId: "",
  attendingPhysician: "",
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  preferredName: "",
  gender: "",
  birthdate: "",
  civilStatus: "single",
  nationality: "",
  employmentStatus: "Employed",
  occupation: "",
  educationalAttainment: "",
  religion: "",
  livingArrangement: "",
  estimatedFamilyMonthlyIncome: "",
  numberOfSiblings: "",
  ordinalPosition: "",
  fatherName: "",
  fatherOccupation: "",
  motherName: "",
  motherOccupation: "",
  spouseName: "",
  spouseOccupation: "",
  contactNumber: "",
  email: "",
  address: "",
  region: "",
  province: "",
  municipality: "",
  barangay: "",
  streetAddress: "",
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

const SUFFIX_OPTIONS = ["Jr.", "Sr.", "II", "III", "IV", "V"];

const RELIGION_OPTIONS = [
  "Roman Catholic",
  "Islam",
  "Iglesia ni Cristo",
  "Protestant",
  "Aglipayan",
  "Seventh-day Adventist",
  "Other",
];

const EMPLOYMENT_STATUS_OPTIONS = [
  "Employed",
  "Unemployed",
  "Student",
  "Government",
  "Private",
];

const LIVING_ARRANGEMENT_OPTIONS = [
  "With Parents",
  "With Relatives",
  "Boarding House",
  "Living Alone",
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
  const { id } = useParams();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [caseManagers, setCaseManagers] = useState([]);

  // Fetch case managers for the PWUD assignment dropdown
  useEffect(() => {
    api.get("/users/case-managers")
      .then(({ data }) => setCaseManagers(data.caseManagers || []))
      .catch(() => {}); // non-critical — silently fail
  }, []);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    api.get(`/patients/${id}`)
      .then(({ data }) => {
        if (!active) return;
        const p = data.patient;
        if (!p) return;
        setForm({
          caseType: p.case_type || "substance_use",
          assignedCaseManagerId: p.assigned_case_manager_id ? String(p.assigned_case_manager_id) : "",
          attendingPhysician: p.attending_physician || "",
          firstName: p.first_name || "",
          middleName: p.middle_name || "",
          lastName: p.last_name || "",
          suffix: p.suffix || "",
          preferredName: p.preferred_name || "",
          gender: p.gender || "",
          birthdate: p.birthdate ? String(p.birthdate).slice(0, 10) : "",
          civilStatus: p.civil_status || "single",
          nationality: p.nationality || "",
          employmentStatus: p.employment_status || "Employed",
          occupation: p.occupation || "",
          educationalAttainment: p.educational_attainment || "",
          religion: p.religion || "",
          livingArrangement: p.living_arrangement || "",
          estimatedFamilyMonthlyIncome: p.estimated_family_monthly_income ?? "",
          numberOfSiblings: p.number_of_siblings ?? "",
          ordinalPosition: p.ordinal_position || "",
          fatherName: p.father_name || "",
          fatherOccupation: p.father_occupation || "",
          motherName: p.mother_name || "",
          motherOccupation: p.mother_occupation || "",
          spouseName: p.spouse_name || "",
          spouseOccupation: p.spouse_occupation || "",
          contactNumber: p.contact_number || "",
          email: p.email || "",
          address: p.address || "",
          region: p.region || "",
          province: p.province || "",
          municipality: p.municipality || "",
          barangay: p.barangay || "",
          streetAddress: p.street_address || "",
          postalCode: p.postal_code || "",
          emergencyContactName: p.emergency_contact_name || "",
          emergencyContactRelationship: p.emergency_contact_relationship || "",
          emergencyContactNumber: p.emergency_contact_number || "",
          emergencyContactEmail: p.emergency_contact_email || "",
          emergencyContactAddress: p.emergency_contact_address || "",
          emergencyContactMethod: p.emergency_contact_method || "",
          emergencyContactMethodOther: "",
          hasGuardian: Boolean(p.guardian_name),
          guardianName: p.guardian_name || "",
          guardianRelationship: p.guardian_relationship || "",
          guardianContactNumber: p.guardian_contact_number || "",
          guardianAddress: p.guardian_address || "",
        });
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || "Could not load patient record.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

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

    if (!form.assignedCaseManagerId) {
      setError("Select an assigned Case Manager before saving.");
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
        address: `${form.streetAddress}, ${form.barangay}, ${form.municipality}, ${form.province}, ${form.region}`,
        emergencyContactMethod: form.emergencyContactMethod === "other"
          ? form.emergencyContactMethodOther.trim()
          : form.emergencyContactMethod,
        caseType: "substance_use",
        assignedCaseManagerId: form.assignedCaseManagerId,
      };
      delete payload.emergencyContactMethodOther;
      delete payload.hasGuardian;
      delete payload.attendingPhysician;

      if (id) {
        await api.put(`/patients/${id}`, payload);
        navigate(`/patients/${id}/referral`);
      } else {
        const { data } = await api.post("/patients", payload);
        navigate(`/patients/${data.id}/referral`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not register the patient.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Demographics (IDADIN Part A)" description="Create the patient's background, identity, and contact record.">
      <form onSubmit={handleSubmit} style={styles.form}>
        <PatientWorkflowProgress currentStep={1} patientId={id} caseType={form.caseType} />
        {loading && <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Loading patient details…</div>}
        {error && <div role="alert" style={styles.error}>{error}</div>}

        {/* Program Identity — Scope Locked to ENTREPOSE SUD */}
        <section style={{ background: "var(--color-primary-tint)", border: "1.5px solid var(--color-primary)", borderRadius: "var(--radius-lg)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 18 }}>🏥</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-primary-dark)" }}>ENTREPOSE Outpatient Program — Substance Use Disorder (PWUD)</div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>All registrations are enrolled under the MTRC ENTREPOSE SUD pathway. A PWUD tracking code (OP-LGU-YY-NNN) will be assigned automatically.</div>
          </div>
        </section>

        <Section
          title="Background Information"
          description="Record IDADIN Part A identifying and basic demographic information."
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
            <select style={styles.input} value={form.suffix} onChange={(e) => update("suffix", e.target.value)}>
              <option value="">None</option>
              {SUFFIX_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
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
              <option value="live_in">Live-in</option>
              <option value="divorced">Divorced</option>
            </select>
          </Field>
          <Field label="Nationality">
            <input style={styles.input} value={form.nationality} onChange={(e) => update("nationality", e.target.value)} />
          </Field>
          <Field label="Employment status" required>
            <select style={styles.input} value={form.employmentStatus} onChange={(e) => update("employmentStatus", e.target.value)} required>
              <option value="">Select</option>
              {EMPLOYMENT_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>
          <Field label="Occupation" hint="Specific job title or role">
            <input autoComplete="organization-title" style={styles.input} value={form.occupation} onChange={(e) => update("occupation", e.target.value)} placeholder="e.g. Farmer, Driver, Teacher" />
          </Field>
          <Field label="Educational attainment">
            <select style={styles.input} value={form.educationalAttainment} onChange={(e) => update("educationalAttainment", e.target.value)}>
              <option value="">Select</option>
              {EDUCATION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>
          <Field label="Religion">
            <select style={styles.input} value={form.religion} onChange={(e) => update("religion", e.target.value)}>
              <option value="">Select</option>
              {RELIGION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>
          <Field label="Living arrangement">
            <select style={styles.input} value={form.livingArrangement} onChange={(e) => update("livingArrangement", e.target.value)}>
              <option value="">Select</option>
              {LIVING_ARRANGEMENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>
          <Field label="Estimated family monthly income" hint="Enter the estimated amount in Philippine pesos.">
            <input type="number" min="0" step="0.01" inputMode="decimal" style={styles.input} value={form.estimatedFamilyMonthlyIncome} onChange={(e) => update("estimatedFamilyMonthlyIncome", e.target.value)} placeholder="0.00" />
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
          <Field label="Region" required>
            <input style={styles.input} value={form.region} onChange={(e) => update("region", e.target.value)} required />
          </Field>
          <Field label="Province" required>
            <input autoComplete="address-level1" style={styles.input} value={form.province} onChange={(e) => update("province", e.target.value)} required />
          </Field>
          <Field label="City or municipality" required>
            <input autoComplete="address-level2" style={styles.input} value={form.municipality} onChange={(e) => update("municipality", e.target.value)} required />
          </Field>
          <Field label="Barangay" required>
            <input style={styles.input} value={form.barangay} onChange={(e) => update("barangay", e.target.value)} required />
          </Field>
          <Field label="House # / Street" required wide>
            <input autoComplete="street-address" style={styles.input} value={form.streetAddress} onChange={(e) => update("streetAddress", e.target.value)} required />
          </Field>
          <Field label="Postal code">
            <input inputMode="numeric" autoComplete="postal-code" style={styles.input} value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} />
          </Field>
        </Section>

        {/* Clinical Assignment */}
        <Section
          title="Clinical Assignment"
          description={form.caseType === "substance_use" ? "Assign a Case Manager who will oversee the patient's treatment. Required for PWUD cases." : "Record the Attending Physician for this outpatient case."}
        >
          {form.caseType === "substance_use" ? (
            <Field label="Assigned Case Manager" required>
              <select
                style={styles.input}
                value={form.assignedCaseManagerId}
                onChange={(e) => update("assignedCaseManagerId", e.target.value)}
                required
              >
                <option value="">Select Case Manager</option>
                {caseManagers.map((cm) => (
                  <option key={cm.id} value={String(cm.id)}>{cm.full_name}</option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Attending Physician" required>
              <input
                style={styles.input}
                value={form.attendingPhysician}
                onChange={(e) => update("attendingPhysician", e.target.value)}
                placeholder="e.g. Dr. Juan Dela Cruz"
                required
              />
            </Field>
          )}
        </Section>

        <Section
          title="Family Background"
          description="Record family background details required for IDADIN Form 6-06."
        >
          <Field label="Number of siblings">
            <input
              type="number"
              min="0"
              max="99"
              step="1"
              style={styles.input}
              value={form.numberOfSiblings}
              onChange={(e) => update("numberOfSiblings", e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Ordinal position in the family" hint="e.g., Eldest, 2nd, Youngest">
            <input
              style={styles.input}
              value={form.ordinalPosition}
              onChange={(e) => update("ordinalPosition", e.target.value)}
              placeholder="e.g. Eldest, 2nd child"
            />
          </Field>
          <Field label="Father's name">
            <input
              style={styles.input}
              value={form.fatherName}
              onChange={(e) => update("fatherName", e.target.value)}
              placeholder="Full name of father"
            />
          </Field>
          <Field label="Father's occupation">
            <input
              style={styles.input}
              value={form.fatherOccupation}
              onChange={(e) => update("fatherOccupation", e.target.value)}
              placeholder="Father's occupation"
            />
          </Field>
          <Field label="Mother's name">
            <input
              style={styles.input}
              value={form.motherName}
              onChange={(e) => update("motherName", e.target.value)}
              placeholder="Full maiden/current name of mother"
            />
          </Field>
          <Field label="Mother's occupation">
            <input
              style={styles.input}
              value={form.motherOccupation}
              onChange={(e) => update("motherOccupation", e.target.value)}
              placeholder="Mother's occupation"
            />
          </Field>
          {(form.civilStatus === "married" || form.civilStatus === "live_in") && (
            <>
              <Field label="Spouse's name">
                <input
                  style={styles.input}
                  value={form.spouseName}
                  onChange={(e) => update("spouseName", e.target.value)}
                  placeholder="Full name of spouse / partner"
                />
              </Field>
              <Field label="Spouse's occupation">
                <input
                  style={styles.input}
                  value={form.spouseOccupation}
                  onChange={(e) => update("spouseOccupation", e.target.value)}
                  placeholder="Spouse's occupation"
                />
              </Field>
            </>
          )}
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
            {saving ? "Saving…" : "Save Demographics & Continue"}
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
