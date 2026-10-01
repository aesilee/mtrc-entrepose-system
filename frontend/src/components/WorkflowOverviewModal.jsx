import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios.js";

const SECTIONS = [
  {
    step: 1,
    title: "1. Demographics",
    subtitle: "IDADIN Part A — Identity, Background & Family Profile",
    summary:
      "Captures the client's core personal identity, socio-demographic characteristics, family structure, and contact information required under Dangerous Drugs Board (DDB) IDADIN Form 6-06 Part A.",
    categories: [
      {
        name: "Personal Information",
        fields: ["First Name, Middle Name, Last Name, Suffix", "Preferred Name / Alias", "Sex / Gender", "Birthdate & Auto-Calculated Age", "Civil Status (Single, Married, Separated, Widowed)", "Nationality & Religion"],
      },
      {
        name: "Education & Socioeconomic",
        fields: ["Educational Attainment (Elementary to Postgraduate)", "Employment Status & Current Occupation", "Living Arrangement (With Parents, Relatives, Alone, Boarding)", "Estimated Monthly Family Income (PHP)"],
      },
      {
        name: "Family Composition & Background",
        fields: ["Total Number of Siblings & Ordinal Birth Position", "Father's Full Name & Occupation", "Mother's Full Maiden Name & Occupation", "Spouse's Full Name & Occupation (if applicable)"],
      },
      {
        name: "Contact & Guardian Details",
        fields: ["Residential Address (Region, Province, Municipality, Barangay, Street, Postal Code)", "Client Contact Number & Email Address", "Emergency Contact Name, Relationship, Contact Number & Preferred Contact Method", "Guardian Profile (Mandatory for minors under 18 years old)"],
      },
    ],
  },
  {
    step: 2,
    title: "2. Admission History",
    subtitle: "Referral Source, Legal Mandate & Baseline Medical Clearance",
    summary:
      "Documents how the client entered the rehabilitation facility, legal trial court mandates, prior confinement/escape history, and baseline medical and drug testing clearance.",
    categories: [
      {
        name: "Referral Details & Legal Mandate",
        fields: [
          "Referral Source: Voluntary Walk-In, Court-Mandated (Plea Bargaining / Section 54/57), LGU-Referred (CADAC/MADAC/BADAC), Workplace, or NGO",
          "Referring Agency / Court Branch / Organization",
          "Official Court Case Number & Presiding Judge",
          "Nature of Confinement & Legal Documentation Status",
        ],
      },
      {
        name: "Confinement & Treatment History",
        fields: [
          "Type of Service: Outpatient Service (ENTREPOSE), Inpatient, or Aftercare (ACP)",
          "Admission Type: New Admission, Readmission (Relapse), or Recommitment",
          "Number of Prior Rehabilitation Admissions",
          "Number of Prior Drug-Related Hospitalizations & Escapes",
        ],
      },
      {
        name: "Baseline Screening & Medical Clearance",
        fields: [
          "Attending Physician & Official Medical Clearance Status",
          "Baseline Drug Screening Test Date & Reference Number",
          "Substances Tested: Methamphetamine (Shabu), THC (Cannabis), and Others",
          "Initial Drug Test Finding (Positive / Negative / Dilute)",
        ],
      },
    ],
  },
  {
    step: 3,
    title: "3. Drug Use History",
    subtitle: "IDADIN Part B — Substance Use Profile & Dynamics",
    summary:
      "Records the client's substance abuse history over the 12 months prior to admission in strict compliance with Dangerous Drugs Board (DDB) Form 6-06 Part B standards.",
    categories: [
      {
        name: "Substances of Abuse Matrix",
        fields: [
          "Selection from 43 DDB-standard substances (Shabu, Cannabis, Opioids, Benzodiazepines, Cocaine, Inhalants/Rugby, etc.)",
          "Primary Substance of Abuse (Highest dependency/severity)",
          "Secondary & Concurrent Substances of Abuse",
          "Route of Administration (Inhalation/Smoking, Ingestion, Injection, Snorting)",
        ],
      },
      {
        name: "Usage Timeline & Pattern",
        fields: [
          "Age at First Substance Use",
          "Date of Most Recent Drug Use",
          "Total Duration of Drug Use (Months / Years)",
          "Frequency of Use (Daily, 2-4 times a week, Weekly, Monthly, Occasionally)",
        ],
      },
      {
        name: "Environmental, Source & Financial Factors",
        fields: [
          "Primary Stated Reason for Using (Peer pressure, Curiosity, Family problems, Stress, etc.)",
          "Source of Drugs (Friend/Peer, Pusher/Dealer, Co-worker, Relative)",
          "Geographic Source Location (Province & City/Municipality of Drug Purchase)",
          "Means Used to Support Drug Habit (Salary, Allowance, Family Support, Illegal Activity)",
          "Estimated Daily Drug Expenditure (PHP)",
        ],
      },
    ],
  },
  {
    step: 4,
    title: "4. Clinical Triage",
    subtitle: "Screening Scores, Vital Signs, MSE & Comorbidities",
    summary:
      "Clinical evaluation integrating WHO ASSIST scores, DOH Drug Dependency Examination (DDE) severity classifications, baseline vital signs, and psychiatric/medical comorbidities.",
    categories: [
      {
        name: "Clinical Diagnostic Classifications",
        fields: [
          "ASSIST Risk Score & Level: Low Risk, Moderate Risk, or High Risk",
          "DDE Severity Diagnosis: Mild Substance Dependence, Moderate Dependence, or Severe Dependence",
          "Socioeconomic Classification (Class A, B, C1, C2, D, or Indigent)",
          "Recommended Treatment Disposition & Track",
        ],
      },
      {
        name: "Triage Vitals & Mental Status Examination",
        fields: [
          "Blood Pressure (mmHg), Pulse Rate (bpm), Respiratory Rate (cpm)",
          "Body Temperature (°C) & Weight (kg)",
          "Mental Status Examination (MSE) Remarks & Clinical Observations",
        ],
      },
      {
        name: "Medical, Surgical & Psychiatric Comorbidities (13 Conditions)",
        fields: [
          "Hypertension, Diabetes Mellitus, Pulmonary Tuberculosis, Bronchial Asthma",
          "Cardiovascular Diseases, Hepatitis B, Hepatitis C, HIV / AIDS",
          "Gastrointestinal Disorders, Dental / Oral Pathologies, Musculoskeletal Conditions",
          "Genitourinary Disorders, Previous Major Surgeries, and Psychiatric Comorbidities",
        ],
      },
    ],
  },
  {
    step: 5,
    title: "5. Consents & Finalization",
    subtitle: "Caseload Assignment, Orientation Scheduling & Certificate Issuance",
    summary:
      "Final activation step where the patient is assigned to a designated Case Manager, program orientation is scheduled, signed statutory consent forms are verified, and enrollment certificates are generated.",
    categories: [
      {
        name: "Case Manager & Orientation Scheduling",
        fields: [
          "Assigned Case Manager (Allocated from active Case Management staff)",
          "Scheduled Program Orientation (PO) Date",
        ],
      },
      {
        name: "Statutory Consents Verification",
        fields: [
          "Service Agreement signed & filed",
          "Pledge of Commitment signed & filed",
          "Data Privacy Consent signed & filed",
          "(Or General Medical & Psychiatric Consent for General OPD registrations)",
        ],
      },
      {
        name: "Caseload Activation & Deliverables",
        fields: [
          "Automatic assignment of official PWUD tracking code (OP-LGU-YY-NNN)",
          "Automatic activation into Case Manager's active caseload (43 Core Sessions)",
          "Inclusion in DOH Monthly Compliance Reports (Form 4.1, 4.2, 4.3)",
          "Automatic generation of printable Certificate of Enrollment / Outpatient Consultation Slip",
        ],
      },
    ],
  },
];

export default function WorkflowOverviewModal({ initialStep = 1, currentPatientId = null, onClose }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialStep);
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(currentPatientId || "");
  const [loadingPatients, setLoadingPatients] = useState(false);

  useEffect(() => {
    setActiveTab(initialStep);
  }, [initialStep]);

  useEffect(() => {
    let mounted = true;
    setLoadingPatients(true);
    api.get("/patients?limit=20")
      .then(({ data }) => {
        if (!mounted) return;
        const list = Array.isArray(data) ? data : (data?.patients || []);
        setPatients(list);
        if (!selectedPatientId && list.length > 0) {
          setSelectedPatientId(String(list[0].id));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingPatients(false);
      });
    return () => { mounted = false; };
  }, []);

  const currentSection = SECTIONS.find((s) => s.step === activeTab) || SECTIONS[0];

  function handleNavigateToPatientStep(step) {
    if (!selectedPatientId) return;
    onClose();
    switch (step) {
      case 1: navigate(`/patients/${selectedPatientId}/demographics`); break;
      case 2: navigate(`/patients/${selectedPatientId}/referral`); break;
      case 3: navigate(`/patients/${selectedPatientId}/intake/drug-history`); break;
      case 4: navigate(`/patients/${selectedPatientId}/intake/clinical-triage`); break;
      case 5: navigate(`/patients/${selectedPatientId}/intake/finalize`); break;
      default: break;
    }
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.tag}>PATIENT ENROLLMENT WORKFLOW</div>
            <h2 style={styles.title}>All Sections of Patient Registration</h2>
            <div style={styles.description}>
              The ENTREPOSE registration workflow consists of 5 sequential clinical and administrative sections. Select any section below to preview its required fields and standards.
            </div>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose} title="Close Overview">×</button>
        </div>

        {/* Section Tabs */}
        <div style={styles.tabsBar}>
          {SECTIONS.map((sec) => {
            const isActive = sec.step === activeTab;
            return (
              <button
                key={sec.step}
                type="button"
                style={{
                  ...styles.tabBtn,
                  ...(isActive ? styles.tabBtnActive : {}),
                }}
                onClick={() => setActiveTab(sec.step)}
              >
                <span style={styles.tabLabel}>{sec.title}</span>
              </button>
            );
          })}
        </div>

        {/* Section Content Body */}
        <div style={styles.body}>
          <div style={styles.sectionHeaderBanner}>
            <div style={{ flex: 1 }}>
              <div style={styles.sectionSubtitle}>{currentSection.subtitle}</div>
              <h3 style={styles.sectionTitle}>{currentSection.title}</h3>
              <p style={styles.sectionSummary}>{currentSection.summary}</p>
            </div>
          </div>

          <div style={styles.categoriesGrid}>
            {currentSection.categories.map((cat, idx) => (
              <div key={idx} style={styles.categoryCard}>
                <div style={styles.categoryHeader}>
                  <span style={styles.catDot}>•</span>
                  <span style={styles.categoryName}>{cat.name}</span>
                </div>
                <ul style={styles.fieldsList}>
                  {cat.fields.map((f, fIdx) => (
                    <li key={fIdx} style={styles.fieldItem}>
                      <span style={styles.checkIcon}>✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Quick Jump to Existing Patient Section */}
          {patients.length > 0 && (
            <div style={styles.jumpBanner}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}>
                  Inspect with an existing patient's record:
                </div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                  Select a client to jump directly into Section {activeTab} of their profile.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select
                  style={styles.selectPatient}
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.patient_code || p.pwud_code || `ID: ${p.id}`})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  style={styles.jumpBtn}
                  onClick={() => handleNavigateToPatientStep(activeTab)}
                >
                  Open {currentSection.title} →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={styles.footer}>
          <div style={{ fontSize: 12.5, color: "#64748B" }}>
            Currently viewing: <strong>Section {activeTab} of 5</strong>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {activeTab > 1 && (
              <button
                type="button"
                style={styles.secondaryBtn}
                onClick={() => setActiveTab(activeTab - 1)}
              >
                ← Previous Section
              </button>
            )}
            {activeTab < 5 ? (
              <button
                type="button"
                style={styles.primaryBtn}
                onClick={() => setActiveTab(activeTab + 1)}
              >
                Next Section →
              </button>
            ) : (
              <button
                type="button"
                style={styles.primaryBtn}
                onClick={onClose}
              >
                Return to Form
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.65)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
  },
  modal: {
    background: "#ffffff",
    borderRadius: "14px",
    width: "100%",
    maxWidth: 820,
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    border: "1px solid #e2e8f0",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "20px 24px 16px",
    borderBottom: "1px solid #f1f5f9",
    background: "#fafafa",
  },
  tag: {
    fontSize: 11,
    fontWeight: 800,
    color: "var(--color-primary, #15803d)",
    letterSpacing: "0.8px",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
  },
  description: {
    fontSize: 12.5,
    color: "#64748b",
    marginTop: 4,
    maxWidth: 680,
    lineHeight: 1.45,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 26,
    color: "#94a3b8",
    cursor: "pointer",
    lineHeight: 1,
    padding: 4,
  },
  tabsBar: {
    display: "flex",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
    padding: "0 16px",
    overflowX: "auto",
  },
  tabBtn: {
    display: "flex",
    alignItems: "center",
    padding: "12px 18px",
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    fontSize: 13,
    fontWeight: 600,
    color: "#64748b",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.15s ease",
  },
  tabBtnActive: {
    color: "var(--color-primary, #15803d)",
    borderBottomColor: "var(--color-primary, #15803d)",
    background: "#ffffff",
    fontWeight: 700,
  },
  tabLabel: {
    fontSize: 13,
  },
  body: {
    padding: "20px 24px",
    overflowY: "auto",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  sectionHeaderBanner: {
    padding: "16px 20px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "10px",
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#166534",
    letterSpacing: "0.5px",
  },
  sectionTitle: {
    margin: "4px 0 6px",
    fontSize: 16,
    fontWeight: 800,
    color: "#14532d",
  },
  sectionSummary: {
    margin: 0,
    fontSize: 13,
    color: "#166534",
    lineHeight: 1.5,
  },
  categoriesGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  categoryCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "14px 16px",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  },
  categoryHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottom: "1px solid #f1f5f9",
  },
  catDot: {
    color: "var(--color-primary, #15803d)",
    fontWeight: 800,
    fontSize: 16,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1e293b",
  },
  fieldsList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  fieldItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    fontSize: 12,
    color: "#334155",
    lineHeight: 1.4,
  },
  checkIcon: {
    color: "var(--color-primary, #15803d)",
    fontWeight: 800,
    fontSize: 12,
    marginTop: 1,
  },
  jumpBanner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 18px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    marginTop: 8,
    flexWrap: "wrap",
    gap: 12,
  },
  selectPatient: {
    padding: "7px 12px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    fontSize: 12.5,
    fontFamily: "inherit",
    background: "#ffffff",
    maxWidth: 260,
  },
  jumpBtn: {
    padding: "7px 14px",
    background: "#0284c7",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: 12.5,
    cursor: "pointer",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 24px",
    borderTop: "1px solid #f1f5f9",
    background: "#fafafa",
  },
  secondaryBtn: {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    fontSize: 12.5,
    fontWeight: 600,
    color: "#334155",
    cursor: "pointer",
  },
  primaryBtn: {
    padding: "8px 18px",
    borderRadius: "6px",
    border: "none",
    background: "var(--color-primary, #15803d)",
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
  },
};
