import React, { useState } from "react";

export const REPORT_DEFINITIONS = [
  {
    category: "Caseload & Census",
    items: [
      {
        id: "cases-managed",
        name: "Total Cases Managed During Month (Total Caseload)",
        code: "CASES_MANAGED",
        period: "Calendar Month (1st to last day of selected month)",
        formula: "Count of all unique substance-use patients actively served during any point in the calendar month",
        inclusions: [
          "Patients admitted on or before the last day of the reporting month",
          "Patients active throughout the entire month",
          "Patients who were discharged during the reporting month (as they received services prior to discharge)",
        ],
        exclusions: [
          "Patients admitted after the close of the reporting month",
          "Patients discharged prior to the 1st day of the reporting month",
          "Archived patients or non-substance use case types",
        ],
        rounding: "Whole integer (exact patient count)",
        notes: "Matches the monthly OP CM Tracker master caseload grid (e.g. 74 cases).",
      },
      {
        id: "active-census",
        name: "Month-End Active Census (As of Closing Date)",
        code: "ACTIVE_CENSUS_EOM",
        period: "Point-in-time as of 23:59:59 on the last day of the reporting month",
        formula: "Cases Managed During Month (74) − Discharges During Month (1) = Month-End Active Census (73)",
        inclusions: [
          "Patients admitted on or before the last day of the reporting month",
          "Patients who have NO discharge record, OR whose discharge date is strictly AFTER the end of the month",
        ],
        exclusions: [
          "Patients whose formal discharge date occurred on or before the end of the reporting month",
          "Archived patients",
        ],
        rounding: "Whole integer (exact patient count)",
        notes: "Explains the difference between 74 cases managed and 73 active census: exactly 1 client was discharged in the period.",
      },
      {
        id: "new-enrollees",
        name: "New Enrollees in Period",
        code: "NEW_ENROLLEES",
        period: "Calendar Month",
        formula: "Count of patients whose admission_date falls between the start and end of the reporting month",
        inclusions: ["First-time admissions whose official admission_date occurs in the selected calendar month"],
        exclusions: ["Carryover patients admitted in previous months", "Readmissions (tracked separately under DOH Form 4.1)"],
        rounding: "Whole integer",
      },
    ],
  },
  {
    category: "Attendance & Modality Performance",
    items: [
      {
        id: "cbt-attendance",
        name: "CBT Attendance (Sessions 1–28)",
        code: "CBT_GROUP",
        period: "Reporting Month",
        formula: "Target Scheduled = session_roster non-cancelled sessions. Actual Attended = Present/Late with CREDITED completion decision.",
        inclusions: [
          "Sessions with session_type = 'CBT_GROUP' mapped to approved DOH ENTREPOSE Core Topics 1 through 28",
        ],
        exclusions: [
          "Cancelled sessions",
          "Duplicate repetitions of already credited topics (is_duplicate_topic = 1; counted in physical attendance but not curriculum credit)",
          "Unfulfilled excused absences",
        ],
        rounding: "Sessions: exact count. Rate: rounded to 2 decimal places.",
        notes: "Corresponds to the standard attendance summary in the original DOH workbook.",
      },
      {
        id: "pe-attendance",
        name: "Psycho-Education (PE) Curriculum (Topics 1–12)",
        code: "PSYCHO_EDUCATION",
        period: "Reporting Month",
        formula: "Scheduled roster sessions vs. Credited completions for psycho-education topics 1 through 12.",
        inclusions: ["Sessions with session_type = 'PSYCHO_EDUCATION'"],
        exclusions: ["Cancelled sessions", "Unverified attendance"],
        rounding: "Exact count",
        notes: "Tracked alongside CBT in the unified 43 Core Requirements matrix.",
      },
      {
        id: "cbte-evaluations",
        name: "CBT-E Clinical Evaluations (1–3)",
        code: "CBTE_EVAL",
        period: "Reporting Month",
        formula: "Formal clinical assessments conducted at milestone stages: Week 5 (Recovery Status), Week 13 (Relapse Prevention), and Month 6–7 (Continuing Care Review).",
        inclusions: ["Records from patient_cbte_evaluations completed in the reporting month"],
        exclusions: ["Informal progress notes", "Routine group session attendance"],
        rounding: "Exact count",
        notes: "CBT-E is an individual clinical evaluation, distinct from group CBT sessions 1–28.",
      },
      {
        id: "unresolved-denominators",
        name: "Unresolved Session Denominators",
        code: "UNRESOLVED_DENOMINATOR",
        period: "Reporting Month up to Current Date",
        formula: "Count of rostered sessions where session_date <= today and session_status is completed/scheduled, but attendance status has not yet been encoded.",
        inclusions: ["Patients listed on session_roster with no matching attendance row"],
        exclusions: ["Cancelled sessions", "Future scheduled dates"],
        rounding: "Exact count",
        notes: "Alerts staff to missing attendance records so denominators remain completely accurate and auditable.",
      },
      {
        id: "attendance-rate",
        name: "Attendance Performance Rate (%)",
        code: "ATTENDANCE_RATE",
        period: "Reporting Month",
        formula: "(Actual Attended ÷ Target Scheduled) × 100",
        inclusions: ["Actual Attended numerator", "Target Scheduled denominator"],
        exclusions: ["Valid Denominator Rule: When Target Scheduled = 0, rate is defined as N/A (never 0% or 100%)"],
        rounding: "Rounded to 2 decimal places (e.g. 85.71%)",
        notes: "MTRC Standard Target: ≥80.00% attendance rate for outpatient graduation eligibility.",
      },
    ],
  },
  {
    category: "Interventions, Discharges & Surveillance",
    items: [
      {
        id: "interventions-conducted",
        name: "Intervention Conducted Indicator",
        code: "INTERVENTION_CONDUCTED",
        period: "Reporting Month",
        formula: "Boolean (1 or 0) indicating whether the patient received any qualifying clinical intervention during the month",
        inclusions: [
          "Group or individual sessions attended (CBT, PE, SHGM, ICA, Family)",
          "Documented home visits (patient_interventions with qualifies_for_monthly_tracker = 1)",
          "Clinical case conferences, family coordination, status reports, and external referrals",
          "Internal clinical consultations (Medical, Psychiatric, Dental, Psychological)",
          "Clinical progress notes written in period",
        ],
        exclusions: ["Administrative file creation without clinical interaction"],
        rounding: "Binary 1 (Yes) or 0 (No)",
        notes: "Per MTRC policy, a patient receiving a home visit but attending no group session still qualifies for this indicator.",
      },
      {
        id: "non-completers",
        name: "Non-Completers & Attrition",
        code: "NON_COMPLETERS",
        period: "Reporting Month",
        formula: "Discharged patients whose discharge status is NOT 'Completer (Graduated)'",
        inclusions: [
          "Non-compliance (unexcused absences / dropped out)",
          "Incarcerated (re-arrest / buy-bust / court custody)",
          "Referred to Other Program / Facility (e.g., transferred to residential)",
          "Medical Discharge / Death",
        ],
        exclusions: ["Completers (Graduated)"],
        rounding: "Exact count",
      },
      {
        id: "form-41-performance",
        name: "DOH Form 4.1 Statutory Performance Measure",
        code: "DOH_FORM_41",
        period: "Monthly Statutory Report",
        formula: "(Total Cases Managed ÷ Total Cases Managed) × 100% [Per Statutory DOH Template]",
        inclusions: ["Total Outpatient / Aftercare cases managed in period"],
        exclusions: ["When total cases managed = 0, rate is rendered as N/A"],
        rounding: "2 decimal places (100.00% or N/A)",
        notes: "CAUTION: Retained in compliance with official DOH template wording; HIM must validate any alternative denominator before formula alteration.",
      },
      {
        id: "form-101-cohort",
        name: "DOH Form 10.1 Adjusted 7-Month Completion Rate",
        code: "DOH_FORM_101",
        period: "Quarterly Evaluation (Q1–Q4)",
        formula: "(Actual Completers in Quarter ÷ Baseline Target Cohort Admitted 7 Months Prior) × 100",
        inclusions: ["Patients admitted exactly 7 months prior to the evaluation quarter"],
        exclusions: ["When cohort size = 0, rate is rendered as N/A"],
        rounding: "2 decimal places",
        notes: "Accounts for the mandatory 6–7 month outpatient duration required to complete 43 core sessions.",
      },
    ],
  },
];

export default function ReportDefinitionsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const currentCategory = REPORT_DEFINITIONS[activeTab];
  const filteredItems = currentCategory.items.filter(
    (item) =>
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.formula.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 14,
          width: "100%",
          maxWidth: 900,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            background: "#F8FAFC",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>📘</span>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0F172A" }}>
                Report Definitions & Traceability Codebook
              </h3>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  background: "#EFF6FF",
                  color: "#1D4ED8",
                  padding: "2px 8px",
                  borderRadius: 999,
                  border: "1px solid #BFDBFE",
                }}
              >
                HIM Standard
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: "#64748B" }}>
              Official clinical definitions, inclusion/exclusion criteria, mathematical formulas, and rounding standards for all reported measures.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 13,
              fontWeight: 700,
              color: "#475569",
              cursor: "pointer",
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Search & Tabs */}
        <div style={{ padding: "14px 24px", borderBottom: "1px solid #E2E8F0", background: "#FFFFFF", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {REPORT_DEFINITIONS.map((cat, idx) => (
              <button
                key={cat.category}
                type="button"
                onClick={() => setActiveTab(idx)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "1px solid",
                  background: activeTab === idx ? "var(--color-primary-dark, #1E3A2F)" : "#F8FAFC",
                  color: activeTab === idx ? "#FFFFFF" : "#475569",
                  borderColor: activeTab === idx ? "var(--color-primary-dark, #1E3A2F)" : "#CBD5E1",
                  transition: "all 0.15s ease",
                }}
              >
                {cat.category} ({cat.items.length})
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search measures or formulas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid #CBD5E1",
              fontSize: 12.5,
              width: 240,
            }}
          />
        </div>

        {/* Content Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: 10,
                padding: "16px 18px",
                background: "#FFFFFF",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: "#0F172A" }}>
                    {item.name}
                  </h4>
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                    Code: <code>{item.code}</code> · Reporting Period: <strong>{item.period}</strong>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#F1F5F9", color: "#334155" }}>
                  Rounding: {item.rounding}
                </span>
              </div>

              {/* Formula */}
              <div
                style={{
                  background: "#F8FAFC",
                  borderLeft: "3px solid var(--color-primary, #2F6F4F)",
                  padding: "8px 12px",
                  borderRadius: "0 6px 6px 0",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#1E293B",
                  marginBottom: 10,
                }}
              >
                <strong>Formula / Definition:</strong> {item.formula}
              </div>

              {/* Inclusions & Exclusions */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6, padding: "8px 12px" }}>
                  <div style={{ fontWeight: 700, color: "#166534", marginBottom: 4 }}>✓ Included Records:</div>
                  <ul style={{ margin: 0, paddingLeft: 18, color: "#14532D" }}>
                    {item.inclusions.map((inc, i) => (
                      <li key={i}>{inc}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ background: "#FEF2F2", border: "1px solid #FECDD3", borderRadius: 6, padding: "8px 12px" }}>
                  <div style={{ fontWeight: 700, color: "#991B1B", marginBottom: 4 }}>✕ Exclusions:</div>
                  <ul style={{ margin: 0, paddingLeft: 18, color: "#7F1D1D" }}>
                    {item.exclusions.map((exc, i) => (
                      <li key={i}>{exc}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {item.notes && (
                <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 8, fontStyle: "italic" }}>
                  💡 <strong>HIM Audit Note:</strong> {item.notes}
                </div>
              )}
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748B", fontSize: 13 }}>
              No measures match your search query.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 24px",
            background: "#F8FAFC",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11.5,
            color: "#64748B",
          }}
        >
          <span>Governed by MTRC Health Information Management (HIM) Standard Operating Procedures.</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "var(--color-primary, #2F6F4F)",
              border: "none",
              color: "#FFFFFF",
              borderRadius: 6,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
