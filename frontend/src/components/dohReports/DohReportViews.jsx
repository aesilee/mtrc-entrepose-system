import React, { useState } from "react";

// Facility Letterhead Header
export function FacilityHeader({ formTitle, formSubTitle, periodLabel }) {
  return (
    <div className="facility-header-block">
      <div className="header-text">
        <p className="republic-text">Republic of the Philippines</p>
        <p className="doh-text">Department of Health — Center for Health Development Bicol</p>
        <h2 className="facility-title">MALINAO TREATMENT AND REHABILITATION CENTER</h2>
        <p className="facility-sub">P-4, Comun, Malinao, Albay | Contact: (052) 736-0688 | doh.mtrc@gmail.com</p>
      </div>
      <div className="form-info-banner">
        <h3 className="form-heading">{formTitle}</h3>
        {formSubTitle && <h4 className="form-subheading">{formSubTitle}</h4>}
        <p className="form-period"><strong>Reporting Period:</strong> {periodLabel}</p>
      </div>
    </div>
  );
}

// Official Signatory Footer
export function SignatoryBlock() {
  return (
    <div className="signatory-container">
      <div className="signatory-col">
        <p className="signatory-label">Prepared By:</p>
        <div className="signatory-line"></div>
        <p className="signatory-name">HEALTH INFORMATION MANAGEMENT (HIM) / CASE MANAGER</p>
        <p className="signatory-role">ENTREPOSE PMIS Officer</p>
      </div>
      <div className="signatory-col">
        <p className="signatory-label">Reviewed By:</p>
        <div className="signatory-line"></div>
        <p className="signatory-name">HEAD, CLINICAL / OUTPATIENT SERVICES</p>
        <p className="signatory-role">Outpatient & Aftercare Program</p>
      </div>
      <div className="signatory-col">
        <p className="signatory-label">Approved By:</p>
        <div className="signatory-line"></div>
        <p className="signatory-name">FULBERT ALEC R. GILLEGO, RMT, MD, MSPH</p>
        <p className="signatory-role">Medical Center Chief III</p>
      </div>
    </div>
  );
}

// 1. Form 4.1 View (A & B) — Percentage of Drug Abuse Cases Managed
export function Form41View({ data, periodLabel }) {
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'outpatient' | 'aftercare'
  const { outpatient: op, aftercare: ac } = data;

  return (
    <div className="doh-report-wrapper" id="report-table">
      <FacilityHeader
        formTitle="DOH FORM 4.1: PERCENTAGE OF DRUG ABUSE CASES MANAGED"
        formSubTitle="Performance Indicator: Total Outpatient & Aftercare PWUD Cases Managed"
        periodLabel={periodLabel}
      />

      <div className="no-print view-tab-bar">
        <button
          className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All (Outpatient & Aftercare)
        </button>
        <button
          className={`tab-btn ${activeTab === "outpatient" ? "active" : ""}`}
          onClick={() => setActiveTab("outpatient")}
        >
          Form 4.1 (A) — Outpatient Service
        </button>
        <button
          className={`tab-btn ${activeTab === "aftercare" ? "active" : ""}`}
          onClick={() => setActiveTab("aftercare")}
        >
          Form 4.1 (B) — Aftercare Service
        </button>
      </div>

      {(activeTab === "all" || activeTab === "outpatient") && (
        <div className="report-section">
          <div className="table-caption">
            <span>A. OUTPATIENT SERVICE</span>
            <span className="scope-tag">Outpatient Scope (Inpatient N/A)</span>
          </div>
          <table className="doh-official-table">
            <thead>
              <tr>
                <th rowSpan="2" className="th-category" style={{ width: "60%" }}>
                  Classification / Category of Enrolment
                </th>
                <th colSpan="3" className="th-center">
                  Outpatient Service Count
                </th>
              </tr>
              <tr>
                <th className="th-sub">Male</th>
                <th className="th-sub">Female</th>
                <th className="th-sub">Total</th>
              </tr>
            </thead>
            <tbody>
              {/* 1. NEW ENROLMENT */}
              <tr className="tr-header-group">
                <td colSpan="4">1. NEW ENROLMENT</td>
              </tr>
              <tr className="tr-sub-group">
                <td colSpan="4" style={{ paddingLeft: 24 }}>a. Court Mandated:</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 40 }}>1. Voluntary Confinement with Court Order</td>
                <td className="td-num">{op.new_court_voluntary.m}</td>
                <td className="td-num">{op.new_court_voluntary.f}</td>
                <td className="td-num-bold">{op.new_court_voluntary.total}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 40 }}>2. Compulsory Confinement with Court Order</td>
                <td className="td-num">{op.new_court_compulsory.m}</td>
                <td className="td-num">{op.new_court_compulsory.f}</td>
                <td className="td-num-bold">{op.new_court_compulsory.total}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 40 }}>3. Plea Bargaining Agreement (Court-Mandated)</td>
                <td className="td-num">{op.new_court_plea.m}</td>
                <td className="td-num">{op.new_court_plea.f}</td>
                <td className="td-num-bold">{op.new_court_plea.total}</td>
              </tr>
              <tr className="tr-subtotal">
                <td style={{ paddingLeft: 30 }}>Subtotal (Court Mandated)</td>
                <td className="td-num">{op.subtotal_court.m}</td>
                <td className="td-num">{op.subtotal_court.f}</td>
                <td className="td-num-bold">{op.subtotal_court.total}</td>
              </tr>

              <tr className="tr-sub-group">
                <td colSpan="4" style={{ paddingLeft: 24 }}>b. Non-Court Mandated:</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 40 }}>1. Voluntary (Self-Referral / Walk-in / School / Workplace)</td>
                <td className="td-num">{op.new_non_court_voluntary.m}</td>
                <td className="td-num">{op.new_non_court_voluntary.f}</td>
                <td className="td-num-bold">{op.new_non_court_voluntary.total}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 40 }}>2. Referral from LGU / Community Rehabilitation / ADAC</td>
                <td className="td-num">{op.new_non_court_lgu.m}</td>
                <td className="td-num">{op.new_non_court_lgu.f}</td>
                <td className="td-num-bold">{op.new_non_court_lgu.total}</td>
              </tr>
              <tr className="tr-subtotal">
                <td style={{ paddingLeft: 30 }}>Subtotal (Non-Court Mandated)</td>
                <td className="td-num">{op.subtotal_non_court.m}</td>
                <td className="td-num">{op.subtotal_non_court.f}</td>
                <td className="td-num-bold">{op.subtotal_non_court.total}</td>
              </tr>
              <tr className="tr-section-total">
                <td>TOTAL NEW ENROLMENT</td>
                <td className="td-num">{op.total_new.m}</td>
                <td className="td-num">{op.total_new.f}</td>
                <td className="td-num-bold">{op.total_new.total}</td>
              </tr>

              {/* 2. READMISSION */}
              <tr className="tr-header-group">
                <td colSpan="4">2. READMISSION</td>
              </tr>
              <tr className="tr-sub-group">
                <td colSpan="4" style={{ paddingLeft: 24 }}>a. Court Mandated:</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 40 }}>1. Voluntary Confinement with Court Order</td>
                <td className="td-num">{op.readm_court_voluntary.m}</td>
                <td className="td-num">{op.readm_court_voluntary.f}</td>
                <td className="td-num-bold">{op.readm_court_voluntary.total}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 40 }}>2. Compulsory Confinement with Court Order</td>
                <td className="td-num">{op.readm_court_compulsory.m}</td>
                <td className="td-num">{op.readm_court_compulsory.f}</td>
                <td className="td-num-bold">{op.readm_court_compulsory.total}</td>
              </tr>
              <tr className="tr-sub-group">
                <td colSpan="4" style={{ paddingLeft: 24 }}>b. Non-Court Mandated:</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 40 }}>1. Voluntary / Self-Referral</td>
                <td className="td-num">{op.readm_non_court_voluntary.m}</td>
                <td className="td-num">{op.readm_non_court_voluntary.f}</td>
                <td className="td-num-bold">{op.readm_non_court_voluntary.total}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 40 }}>2. Referral from LGU</td>
                <td className="td-num">{op.readm_non_court_lgu.m}</td>
                <td className="td-num">{op.readm_non_court_lgu.f}</td>
                <td className="td-num-bold">{op.readm_non_court_lgu.total}</td>
              </tr>
              <tr className="tr-section-total">
                <td>TOTAL READMISSION</td>
                <td className="td-num">{op.total_readm.m}</td>
                <td className="td-num">{op.total_readm.f}</td>
                <td className="td-num-bold">{op.total_readm.total}</td>
              </tr>

              {/* 3. RECOMMITMENT */}
              <tr className="tr-header-group">
                <td colSpan="4">3. RECOMMITMENT</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 24 }}>a. Court Mandated (Per court orders / re-entry)</td>
                <td className="td-num">{op.recommit_court.m}</td>
                <td className="td-num">{op.recommit_court.f}</td>
                <td className="td-num-bold">{op.recommit_court.total}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 24 }}>b. Non-Court Mandated</td>
                <td className="td-num">{op.recommit_non_court.m}</td>
                <td className="td-num">{op.recommit_non_court.f}</td>
                <td className="td-num-bold">{op.recommit_non_court.total}</td>
              </tr>
              <tr className="tr-section-total">
                <td>TOTAL RECOMMITMENT</td>
                <td className="td-num">{op.total_recommit.m}</td>
                <td className="td-num">{op.total_recommit.f}</td>
                <td className="td-num-bold">{op.total_recommit.total}</td>
              </tr>

              {/* TOTAL & CARRYOVER */}
              <tr className="tr-highlight">
                <td style={{ fontWeight: 700 }}>TOTAL (New Enrolment + Readmission + Recommitment)</td>
                <td className="td-num-bold">{op.total_new_readm_recommit.m}</td>
                <td className="td-num-bold">{op.total_new_readm_recommit.f}</td>
                <td className="td-num-bold">{op.total_new_readm_recommit.total}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>TOTAL NO. OF CASES BEFORE THE MONTH OF THE RATING PERIOD</td>
                <td className="td-num">{op.cases_before_period.m}</td>
                <td className="td-num">{op.cases_before_period.f}</td>
                <td className="td-num-bold">{op.cases_before_period.total}</td>
              </tr>
              <tr className="tr-grand-total">
                <td>GRAND TOTAL (Active Outpatient Caseload Managed)</td>
                <td className="td-num-bold">{op.grand_total.m}</td>
                <td className="td-num-bold">{op.grand_total.f}</td>
                <td className="td-num-bold">{op.grand_total.total}</td>
              </tr>
            </tbody>
          </table>

          <div className="formula-card">
            <p className="formula-title"><strong>PERFORMANCE INDICATOR COMPUTATION (OUTPATIENT SERVICE):</strong></p>
            <p className="formula-math">
              <strong>Formula:</strong> (Total Outpatient Cases Managed within Rating Period [{op.grand_total.total}] / Total Outpatient Cases Managed within Rating Period [{op.grand_total.total}]) &times; 100% = <strong>100.00%</strong>
            </p>
            <p className="formula-note">Statutory Target: 100% of admitted outpatient drug abuse cases managed within the rated cycle.</p>
          </div>
        </div>
      )}

      {(activeTab === "all" || activeTab === "aftercare") && (
        <div className="report-section" style={{ marginTop: 30 }}>
          <div className="table-caption">
            <span>B. AFTERCARE SERVICE</span>
            <span className="scope-tag aftercare-tag">Outpatient Aftercare Scope</span>
          </div>
          <table className="doh-official-table">
            <thead>
              <tr>
                <th rowSpan="2" className="th-category" style={{ width: "60%" }}>
                  Classification / Category of Enrolment
                </th>
                <th colSpan="3" className="th-center">
                  Aftercare Service Count
                </th>
              </tr>
              <tr>
                <th className="th-sub">Male</th>
                <th className="th-sub">Female</th>
                <th className="th-sub">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="tr-header-group">
                <td colSpan="4">1. NEW ENROLLMENT</td>
              </tr>
              <tr className="tr-sub-group">
                <td colSpan="4" style={{ paddingLeft: 24 }}>A. From Inpatient Care Services:</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 40 }}>I. Same Facility (MTRC Inpatient Graduate)</td>
                <td className="td-num">{ac.new_inpatient_same.m}</td>
                <td className="td-num">{ac.new_inpatient_same.f}</td>
                <td className="td-num-bold">{ac.new_inpatient_same.total}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 40 }}>II. Other Facility (External Inpatient Transfer)</td>
                <td className="td-num">{ac.new_inpatient_other.m}</td>
                <td className="td-num">{ac.new_inpatient_other.f}</td>
                <td className="td-num-bold">{ac.new_inpatient_other.total}</td>
              </tr>
              <tr className="tr-subtotal">
                <td style={{ paddingLeft: 30 }}>Subtotal (From Inpatient)</td>
                <td className="td-num">{ac.subtotal_inpatient.m}</td>
                <td className="td-num">{ac.subtotal_inpatient.f}</td>
                <td className="td-num-bold">{ac.subtotal_inpatient.total}</td>
              </tr>

              <tr className="tr-sub-group">
                <td colSpan="4" style={{ paddingLeft: 24 }}>B. From Outpatient Care Services:</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 40 }}>I. Same Facility (MTRC Outpatient 43-Session Completers)</td>
                <td className="td-num">{ac.new_outpatient_same.m}</td>
                <td className="td-num">{ac.new_outpatient_same.f}</td>
                <td className="td-num-bold">{ac.new_outpatient_same.total}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 40 }}>II. Other Facility</td>
                <td className="td-num">{ac.new_outpatient_other.m}</td>
                <td className="td-num">{ac.new_outpatient_other.f}</td>
                <td className="td-num-bold">{ac.new_outpatient_other.total}</td>
              </tr>
              <tr className="tr-subtotal">
                <td style={{ paddingLeft: 30 }}>Subtotal (From Outpatient)</td>
                <td className="td-num">{ac.subtotal_outpatient.m}</td>
                <td className="td-num">{ac.subtotal_outpatient.f}</td>
                <td className="td-num-bold">{ac.subtotal_outpatient.total}</td>
              </tr>
              <tr className="tr-section-total">
                <td>TOTAL NEW ENROLLMENT</td>
                <td className="td-num">{ac.total_new.m}</td>
                <td className="td-num">{ac.total_new.f}</td>
                <td className="td-num-bold">{ac.total_new.total}</td>
              </tr>

              <tr className="tr-header-group">
                <td colSpan="4">2. READMISSION</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 24 }}>Readmitted to Aftercare</td>
                <td className="td-num">{ac.readm_total.m}</td>
                <td className="td-num">{ac.readm_total.f}</td>
                <td className="td-num-bold">{ac.readm_total.total}</td>
              </tr>

              <tr className="tr-highlight">
                <td style={{ fontWeight: 700 }}>TOTAL (New Enrollment + Readmission)</td>
                <td className="td-num-bold">{ac.total_new_readm.m}</td>
                <td className="td-num-bold">{ac.total_new_readm.f}</td>
                <td className="td-num-bold">{ac.total_new_readm.total}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>TOTAL NO. OF AFTERCARE CASES BEFORE THE MONTH OF THE RATING PERIOD</td>
                <td className="td-num">{ac.cases_before_period.m}</td>
                <td className="td-num">{ac.cases_before_period.f}</td>
                <td className="td-num-bold">{ac.cases_before_period.total}</td>
              </tr>
              <tr className="tr-grand-total">
                <td>GRAND TOTAL (Active Aftercare Caseload Managed)</td>
                <td className="td-num-bold">{ac.grand_total.m}</td>
                <td className="td-num-bold">{ac.grand_total.f}</td>
                <td className="td-num-bold">{ac.grand_total.total}</td>
              </tr>
            </tbody>
          </table>

          <div className="formula-card">
            <p className="formula-title"><strong>PERFORMANCE INDICATOR COMPUTATION (AFTERCARE SERVICE):</strong></p>
            <p className="formula-math">
              <strong>Formula:</strong> (Total Aftercare Cases Managed [{ac.grand_total.total}] / Total Aftercare Cases Managed [{ac.grand_total.total}]) &times; 100% = <strong>100.00%</strong>
            </p>
          </div>
        </div>
      )}

      <SignatoryBlock />
    </div>
  );
}

// 2. Form 4.2 View — Service Provision to PWUDs
export function Form42View({ data, periodLabel }) {
  const [activeTab, setActiveTab] = useState("all");
  const { outpatient: op, aftercare: ac } = data;

  return (
    <div className="doh-report-wrapper" id="report-table">
      <FacilityHeader
        formTitle="DOH FORM 4.2: SERVICE PROVISION TO PERSONS WHO USE DRUGS (PWUDs)"
        formSubTitle="Monthly Modality Tallies (Attendance × Interventions Rendered)"
        periodLabel={periodLabel}
      />

      <div className="no-print view-tab-bar">
        <button className={`tab-btn ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>All Modalities</button>
        <button className={`tab-btn ${activeTab === "outpatient" ? "active" : ""}`} onClick={() => setActiveTab("outpatient")}>B. Outpatient Service</button>
        <button className={`tab-btn ${activeTab === "aftercare" ? "active" : ""}`} onClick={() => setActiveTab("aftercare")}>C. Aftercare Service (SIBOL/ACP)</button>
      </div>

      {(activeTab === "all" || activeTab === "outpatient") && (
        <div className="report-section">
          <div className="table-caption">
            <span>B. OUTPATIENT SERVICE PROVISION</span>
            <span className="scope-tag">Outpatient Sessions & Interventions</span>
          </div>
          <table className="doh-official-table">
            <thead>
              <tr>
                <th className="th-category" style={{ width: "65%" }}>Modality / Type of Service Rendered</th>
                <th className="th-sub">Male</th>
                <th className="th-sub">Female</th>
                <th className="th-sub">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="tr-header-group"><td colSpan="4">A. SCREENING, ASSESSMENT & DDE</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>1. ASSIST — Low Risk</td><td className="td-num">{op.assist_low.m}</td><td className="td-num">{op.assist_low.f}</td><td className="td-num-bold">{op.assist_low.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>2. ASSIST — Moderate Risk</td><td className="td-num">{op.assist_moderate.m}</td><td className="td-num">{op.assist_moderate.f}</td><td className="td-num-bold">{op.assist_moderate.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>3. ASSIST — High Risk</td><td className="td-num">{op.assist_high.m}</td><td className="td-num">{op.assist_high.f}</td><td className="td-num-bold">{op.assist_high.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>4. Brief Intervention / Motivational Interviewing (MI)</td><td className="td-num">{op.brief_intervention.m}</td><td className="td-num">{op.brief_intervention.f}</td><td className="td-num-bold">{op.brief_intervention.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>5. Social Worker Evaluation (&lt; 18 years old)</td><td className="td-num">{op.social_worker_eval.m}</td><td className="td-num">{op.social_worker_eval.f}</td><td className="td-num-bold">{op.social_worker_eval.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>6. Drug Dependency Examination (DDE) — Mild</td><td className="td-num">{op.dde_mild.m}</td><td className="td-num">{op.dde_mild.f}</td><td className="td-num-bold">{op.dde_mild.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>7. Drug Dependency Examination (DDE) — Moderate</td><td className="td-num">{op.dde_moderate.m}</td><td className="td-num">{op.dde_moderate.f}</td><td className="td-num-bold">{op.dde_moderate.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>8. Drug Dependency Examination (DDE) — Severe</td><td className="td-num">{op.dde_severe.m}</td><td className="td-num">{op.dde_severe.f}</td><td className="td-num-bold">{op.dde_severe.total}</td></tr>

              <tr className="tr-header-group"><td colSpan="4">B. MEDICAL AND MENTAL HEALTH ASSESSMENT</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>1. Medical Assessment / General Physical Examination</td><td className="td-num">{op.medical_assessment.m}</td><td className="td-num">{op.medical_assessment.f}</td><td className="td-num-bold">{op.medical_assessment.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>2. Mental Health Assessment (WHO Self-Report Questionnaire - SRQ)</td><td className="td-num">{op.mental_assessment.m}</td><td className="td-num">{op.mental_assessment.f}</td><td className="td-num-bold">{op.mental_assessment.total}</td></tr>

              <tr className="tr-header-group"><td colSpan="4">C. STRUCTURED OUTPATIENT MODALITIES</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>1. Cognitive Behavioral Therapy (CBT-E Modules)</td><td className="td-num">{op.cbte_sessions.m}</td><td className="td-num">{op.cbte_sessions.f}</td><td className="td-num-bold">{op.cbte_sessions.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>2. Individual / Conjoint Counseling Sessions</td><td className="td-num">{op.individual_counseling.m}</td><td className="td-num">{op.individual_counseling.f}</td><td className="td-num-bold">{op.individual_counseling.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>3. Self-Help Group Meetings (SHGM)</td><td className="td-num">{op.shgm.m}</td><td className="td-num">{op.shgm.f}</td><td className="td-num-bold">{op.shgm.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>4. Family Education / Psycho-Education</td><td className="td-num">{op.psycho_education.m}</td><td className="td-num">{op.psycho_education.f}</td><td className="td-num-bold">{op.psycho_education.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>5. Life Skills Training</td><td className="td-num">{op.life_skills.m}</td><td className="td-num">{op.life_skills.f}</td><td className="td-num-bold">{op.life_skills.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>6. Addiction Severity Index (ASI) Interview</td><td className="td-num">{op.asi_interview.m}</td><td className="td-num">{op.asi_interview.f}</td><td className="td-num-bold">{op.asi_interview.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>7. Home Visit / Family Follow-up</td><td className="td-num">{op.home_visit.m}</td><td className="td-num">{op.home_visit.f}</td><td className="td-num-bold">{op.home_visit.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>8. Program Orientation & Case Management</td><td className="td-num">{op.program_orientation.m}</td><td className="td-num">{op.program_orientation.f}</td><td className="td-num-bold">{op.program_orientation.total}</td></tr>

              <tr className="tr-header-group"><td colSpan="4">SUPPORT SERVICES (Surveillance & Health)</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>a. Surveillance Drug Testing (Tests Rendered)</td><td className="td-num">{op.drug_tests.m}</td><td className="td-num">{op.drug_tests.f}</td><td className="td-num-bold">{op.drug_tests.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>b. Psychiatric Evaluation & Consultation</td><td className="td-num">{op.psychiatric_eval.m}</td><td className="td-num">{op.psychiatric_eval.f}</td><td className="td-num-bold">{op.psychiatric_eval.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>c. HIV Screening & Pre/Post-Test Counseling</td><td className="td-num">{op.hiv_screening.m}</td><td className="td-num">{op.hiv_screening.f}</td><td className="td-num-bold">{op.hiv_screening.total}</td></tr>

              <tr className="tr-grand-total">
                <td>GRAND TOTAL (Outpatient Interventions Rendered)</td>
                <td className="td-num-bold">{op.grand_total.m}</td>
                <td className="td-num-bold">{op.grand_total.f}</td>
                <td className="td-num-bold">{op.grand_total.total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {(activeTab === "all" || activeTab === "aftercare") && (
        <div className="report-section" style={{ marginTop: 30 }}>
          <div className="table-caption">
            <span>C. AFTERCARE SERVICE PROVISION (SIBOL / ACP)</span>
            <span className="scope-tag aftercare-tag">Aftercare Services</span>
          </div>
          <table className="doh-official-table">
            <thead>
              <tr>
                <th className="th-category" style={{ width: "65%" }}>Modality / Type of Service Rendered</th>
                <th className="th-sub">Male</th>
                <th className="th-sub">Female</th>
                <th className="th-sub">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{ paddingLeft: 24 }}>1. Medical and Mental Health Assessment</td><td className="td-num">{ac.medical_mental_health.m}</td><td className="td-num">{ac.medical_mental_health.f}</td><td className="td-num-bold">{ac.medical_mental_health.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>2. MIOP (Matrix Intensive Outpatient Program)</td><td className="td-num">{ac.miop.m}</td><td className="td-num">{ac.miop.f}</td><td className="td-num-bold">{ac.miop.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>3. Family Dialogue & Support Sessions</td><td className="td-num">{ac.family_dialogue.m}</td><td className="td-num">{ac.family_dialogue.f}</td><td className="td-num-bold">{ac.family_dialogue.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>4. Individual Counseling & Case Review</td><td className="td-num">{ac.individual_counseling.m}</td><td className="td-num">{ac.individual_counseling.f}</td><td className="td-num-bold">{ac.individual_counseling.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>5. Pre-Discharge & Transition Conference</td><td className="td-num">{ac.pre_discharge_conf.m}</td><td className="td-num">{ac.pre_discharge_conf.f}</td><td className="td-num-bold">{ac.pre_discharge_conf.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>6. Home Visits & Community Re-entry Tracking</td><td className="td-num">{ac.home_visit.m}</td><td className="td-num">{ac.home_visit.f}</td><td className="td-num-bold">{ac.home_visit.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>7. Surveillance Drug Testing</td><td className="td-num">{ac.surveillance_drug_test.m}</td><td className="td-num">{ac.surveillance_drug_test.f}</td><td className="td-num-bold">{ac.surveillance_drug_test.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>8. Case Conference & Multidisciplinary Review</td><td className="td-num">{ac.case_conference.m}</td><td className="td-num">{ac.case_conference.f}</td><td className="td-num-bold">{ac.case_conference.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>9. SIBOL Session — Virtual (E-SIBOL)</td><td className="td-num">{ac.sibol_virtual.m}</td><td className="td-num">{ac.sibol_virtual.f}</td><td className="td-num-bold">{ac.sibol_virtual.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>10. SIBOL Session — Face-to-Face</td><td className="td-num">{ac.sibol_f2f.m}</td><td className="td-num">{ac.sibol_f2f.f}</td><td className="td-num-bold">{ac.sibol_f2f.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>11. Skills & Vocational Training / TESDA</td><td className="td-num">{ac.skills_vocational.m}</td><td className="td-num">{ac.skills_vocational.f}</td><td className="td-num-bold">{ac.skills_vocational.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>12. Spiritual / Pastoral Counseling</td><td className="td-num">{ac.spiritual_pastoral.m}</td><td className="td-num">{ac.spiritual_pastoral.f}</td><td className="td-num-bold">{ac.spiritual_pastoral.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>13. Recovery Coaching & Peer Navigation</td><td className="td-num">{ac.recovery_coaching.m}</td><td className="td-num">{ac.recovery_coaching.f}</td><td className="td-num-bold">{ac.recovery_coaching.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>14. Family Support Group Meetings</td><td className="td-num">{ac.family_support.m}</td><td className="td-num">{ac.family_support.f}</td><td className="td-num-bold">{ac.family_support.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>15. Livelihood & Employment Assistance Referral</td><td className="td-num">{ac.livelihood_referral.m}</td><td className="td-num">{ac.livelihood_referral.f}</td><td className="td-num-bold">{ac.livelihood_referral.total}</td></tr>
              <tr><td style={{ paddingLeft: 24 }}>16. Community Outreach & Volunteer Program</td><td className="td-num">{ac.community_outreach.m}</td><td className="td-num">{ac.community_outreach.f}</td><td className="td-num-bold">{ac.community_outreach.total}</td></tr>

              <tr className="tr-grand-total">
                <td>GRAND TOTAL (Aftercare Interventions Rendered)</td>
                <td className="td-num-bold">{ac.grand_total.m}</td>
                <td className="td-num-bold">{ac.grand_total.f}</td>
                <td className="td-num-bold">{ac.grand_total.total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <SignatoryBlock />
    </div>
  );
}

// 3. Form 4.3 Part I — Demographics (Age Group & Civil Status)
export function Form43DemographicsView({ data, periodLabel }) {
  const [activeTab, setActiveTab] = useState("outpatient");
  const sec = data[activeTab] || data.outpatient;
  const STATUSES = ["Single", "Married", "Widowed", "Separated/Annulled", "Common-law/Live-in", "Unknown"];

  return (
    <div className="doh-report-wrapper" id="report-table">
      <FacilityHeader
        formTitle="DOH FORM 4.3 PART I: DEMOGRAPHIC AND CLINICAL PROFILE"
        formSubTitle="Cross-tabulation: Age Bracket × Civil Status × Gender"
        periodLabel={periodLabel}
      />

      <div className="no-print view-tab-bar">
        <button className={`tab-btn ${activeTab === "outpatient" ? "active" : ""}`} onClick={() => setActiveTab("outpatient")}>B. Outpatient Service</button>
        <button className={`tab-btn ${activeTab === "aftercare" ? "active" : ""}`} onClick={() => setActiveTab("aftercare")}>C. Aftercare Service</button>
      </div>

      <div className="report-section" style={{ overflowX: "auto" }}>
        <div className="table-caption">
          <span>{activeTab === "aftercare" ? "C. AFTERCARE SERVICE" : "B. OUTPATIENT SERVICE"}</span>
          <span className="scope-tag">{activeTab.toUpperCase()} SCOPE</span>
        </div>
        <table className="doh-official-table">
          <thead>
            <tr>
              <th rowSpan="2" className="th-category" style={{ minWidth: 100 }}>Age Bracket</th>
              {STATUSES.map(s => (
                <th key={s} colSpan="2" className="th-center">{s}</th>
              ))}
              <th colSpan="2" className="th-center">TOTAL</th>
              <th rowSpan="2" className="th-center" style={{ minWidth: 80 }}>GRAND TOTAL</th>
            </tr>
            <tr>
              {STATUSES.map(s => (
                <React.Fragment key={s}>
                  <th className="th-sub">M</th>
                  <th className="th-sub">F</th>
                </React.Fragment>
              ))}
              <th className="th-sub">M</th>
              <th className="th-sub">F</th>
            </tr>
          </thead>
          <tbody>
            {sec.rows.map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{r.age_bracket}</td>
                {STATUSES.map(s => (
                  <React.Fragment key={s}>
                    <td className="td-num">{r[`${s}_m`]}</td>
                    <td className="td-num">{r[`${s}_f`]}</td>
                  </React.Fragment>
                ))}
                <td className="td-num-bold">{r.total_m}</td>
                <td className="td-num-bold">{r.total_f}</td>
                <td className="td-num-bold" style={{ backgroundColor: "#f0fdf4" }}>{r.grand_total}</td>
              </tr>
            ))}
            <tr className="tr-grand-total">
              <td>{sec.totals.age_bracket}</td>
              {STATUSES.map(s => (
                <React.Fragment key={s}>
                  <td className="td-num-bold">{sec.totals[`${s}_m`]}</td>
                  <td className="td-num-bold">{sec.totals[`${s}_f`]}</td>
                </React.Fragment>
              ))}
              <td className="td-num-bold">{sec.totals.total_m}</td>
              <td className="td-num-bold">{sec.totals.total_f}</td>
              <td className="td-num-bold" style={{ backgroundColor: "#dcfce7" }}>{sec.totals.grand_total}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SignatoryBlock />
    </div>
  );
}

// 4. Form 4.3 Part II — Employment Status
export function Form43EmploymentView({ data, periodLabel }) {
  const { rows, totals } = data;

  return (
    <div className="doh-report-wrapper" id="report-table">
      <FacilityHeader
        formTitle="DOH FORM 4.3 PART II: PWUDs EMPLOYMENT STATUS"
        formSubTitle="Cross-tabulation: Employment Category × Modality (Outpatient & Aftercare)"
        periodLabel={periodLabel}
      />

      <div className="report-section">
        <table className="doh-official-table">
          <thead>
            <tr>
              <th rowSpan="2" className="th-category" style={{ width: "40%" }}>Employment Status</th>
              <th colSpan="3" className="th-center">B. Outpatient Service</th>
              <th colSpan="3" className="th-center">C. Aftercare Service</th>
              <th rowSpan="2" className="th-center" style={{ width: "12%" }}>GRAND TOTAL</th>
            </tr>
            <tr>
              <th className="th-sub">Male</th>
              <th className="th-sub">Female</th>
              <th className="th-sub">Total</th>
              <th className="th-sub">Male</th>
              <th className="th-sub">Female</th>
              <th className="th-sub">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{r.category}</td>
                <td className="td-num">{r.outpatient_m}</td>
                <td className="td-num">{r.outpatient_f}</td>
                <td className="td-num-bold">{r.outpatient_total}</td>
                <td className="td-num">{r.aftercare_m}</td>
                <td className="td-num">{r.aftercare_f}</td>
                <td className="td-num-bold">{r.aftercare_total}</td>
                <td className="td-num-bold" style={{ backgroundColor: "#f0fdf4" }}>{r.grand_total}</td>
              </tr>
            ))}
            <tr className="tr-grand-total">
              <td>{totals.category}</td>
              <td className="td-num-bold">{totals.outpatient_m}</td>
              <td className="td-num-bold">{totals.outpatient_f}</td>
              <td className="td-num-bold">{totals.outpatient_total}</td>
              <td className="td-num-bold">{totals.aftercare_m}</td>
              <td className="td-num-bold">{totals.aftercare_f}</td>
              <td className="td-num-bold">{totals.aftercare_total}</td>
              <td className="td-num-bold" style={{ backgroundColor: "#dcfce7" }}>{totals.grand_total}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SignatoryBlock />
    </div>
  );
}

// 5. Form 4.3 Part III — Education & Residence
export function Form43EducationView({ data, periodLabel }) {
  const [activeTab, setActiveTab] = useState("outpatient");
  const sec = data[activeTab] || data.outpatient;

  const COLS = [
    { label: "Elem Undergrad", key: "elem_under" },
    { label: "Elem Grad", key: "elem_grad" },
    { label: "HS Undergrad", key: "hs_under" },
    { label: "HS Grad", key: "hs_grad" },
    { label: "Col Undergrad", key: "col_under" },
    { label: "Col Grad", key: "col_grad" },
    { label: "Vocational", key: "voc" },
    { label: "Post-Graduate", key: "post_grad" },
    { label: "TOTAL", key: "total" }
  ];

  return (
    <div className="doh-report-wrapper" id="report-table">
      <FacilityHeader
        formTitle="DOH FORM 4.3 PART III: RESIDENCE AND EDUCATIONAL STATUS"
        formSubTitle="Cross-tabulation: Residence Area × Educational Attainment"
        periodLabel={periodLabel}
      />

      <div className="no-print view-tab-bar">
        <button className={`tab-btn ${activeTab === "outpatient" ? "active" : ""}`} onClick={() => setActiveTab("outpatient")}>B. Outpatient Service</button>
        <button className={`tab-btn ${activeTab === "aftercare" ? "active" : ""}`} onClick={() => setActiveTab("aftercare")}>C. Aftercare Service</button>
      </div>

      <div className="report-section" style={{ overflowX: "auto" }}>
        <table className="doh-official-table">
          <thead>
            <tr>
              <th className="th-category" style={{ minWidth: 120 }}>Residence</th>
              {COLS.map(c => (
                <th key={c.key} className="th-center">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 600 }}>RURAL</td>
              {COLS.map(c => (
                <td key={c.key} className={`td-num ${c.key === "total" ? "td-num-bold" : ""}`}>{sec.rural[c.key]}</td>
              ))}
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>URBAN</td>
              {COLS.map(c => (
                <td key={c.key} className={`td-num ${c.key === "total" ? "td-num-bold" : ""}`}>{sec.urban[c.key]}</td>
              ))}
            </tr>
            <tr className="tr-grand-total">
              <td>TOTAL</td>
              {COLS.map(c => (
                <td key={c.key} className="td-num-bold" style={{ backgroundColor: c.key === "total" ? "#dcfce7" : undefined }}>{sec.total[c.key]}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <SignatoryBlock />
    </div>
  );
}

// 6. Form 4.3 Part IV — Substance of Abuse & Duration of Use
export function Form43SubstanceView({ data, periodLabel }) {
  const [activeTab, setActiveTab] = useState("outpatient");
  const sec = data[activeTab] || data.outpatient;

  const DRUG_COLS = [
    { label: "Meth (Shabu)", key: "methamphetamine" },
    { label: "Cannabis / THC", key: "cannabis" },
    { label: "Ecstasy", key: "ecstasy" },
    { label: "Cocaine", key: "cocaine" },
    { label: "Opiates", key: "opiates" },
    { label: "Other Amphet.", key: "other_amphetamines" },
    { label: "Poly-Users", key: "poly_users" },
    { label: "Others/Alcohol", key: "others_alcohol" },
    { label: "TOTAL", key: "total" }
  ];

  return (
    <div className="doh-report-wrapper" id="report-table">
      <FacilityHeader
        formTitle="DOH FORM 4.3 PART IV: SUBSTANCE OF ABUSE AND DURATION OF USE"
        formSubTitle="Cross-tabulation: Duration of Use × Primary Substance Class"
        periodLabel={periodLabel}
      />

      <div className="no-print view-tab-bar">
        <button className={`tab-btn ${activeTab === "outpatient" ? "active" : ""}`} onClick={() => setActiveTab("outpatient")}>B. Outpatient Service</button>
        <button className={`tab-btn ${activeTab === "aftercare" ? "active" : ""}`} onClick={() => setActiveTab("aftercare")}>C. Aftercare Service</button>
      </div>

      <div className="report-section" style={{ overflowX: "auto" }}>
        <table className="doh-official-table">
          <thead>
            <tr>
              <th className="th-category" style={{ minWidth: 140 }}>Duration of Drug Use</th>
              {DRUG_COLS.map(c => (
                <th key={c.key} className="th-center">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sec.rows.map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{r.duration}</td>
                {DRUG_COLS.map(c => (
                  <td key={c.key} className={`td-num ${c.key === "total" ? "td-num-bold" : ""}`}>{r[c.key]}</td>
                ))}
              </tr>
            ))}
            <tr className="tr-grand-total">
              <td>{sec.totals.duration}</td>
              {DRUG_COLS.map(c => (
                <td key={c.key} className="td-num-bold" style={{ backgroundColor: c.key === "total" ? "#dcfce7" : undefined }}>{sec.totals[c.key]}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <SignatoryBlock />
    </div>
  );
}

// 7. Form 4.3 Part V — Readmission or Recommitment Count
export function Form43ReadmissionsView({ data, periodLabel }) {
  const { rows, totals } = data;

  return (
    <div className="doh-report-wrapper" id="report-table">
      <FacilityHeader
        formTitle="DOH FORM 4.3 PART V: READMISSION OR RECOMMITMENT COUNT"
        formSubTitle="Historical Frequency of Rehabilitation Admissions"
        periodLabel={periodLabel}
      />

      <div className="report-section">
        <table className="doh-official-table">
          <thead>
            <tr>
              <th rowSpan="2" className="th-category" style={{ width: "35%" }}>Number of Prior Admissions</th>
              <th colSpan="3" className="th-center">B. Outpatient Service</th>
              <th colSpan="3" className="th-center">C. Aftercare Service</th>
              <th rowSpan="2" className="th-center" style={{ width: "15%" }}>COMBINED TOTAL</th>
            </tr>
            <tr>
              <th className="th-sub">Male</th>
              <th className="th-sub">Female</th>
              <th className="th-sub">Total</th>
              <th className="th-sub">Male</th>
              <th className="th-sub">Female</th>
              <th className="th-sub">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{r.times}</td>
                <td className="td-num">{r.outpatient_m}</td>
                <td className="td-num">{r.outpatient_f}</td>
                <td className="td-num-bold">{r.outpatient_total}</td>
                <td className="td-num">{r.aftercare_m}</td>
                <td className="td-num">{r.aftercare_f}</td>
                <td className="td-num-bold">{r.aftercare_total}</td>
                <td className="td-num-bold" style={{ backgroundColor: "#f0fdf4" }}>{r.combined_total}</td>
              </tr>
            ))}
            <tr className="tr-grand-total">
              <td>{totals.times}</td>
              <td className="td-num-bold">{totals.outpatient_m}</td>
              <td className="td-num-bold">{totals.outpatient_f}</td>
              <td className="td-num-bold">{totals.outpatient_total}</td>
              <td className="td-num-bold">{totals.aftercare_m}</td>
              <td className="td-num-bold">{totals.aftercare_f}</td>
              <td className="td-num-bold">{totals.aftercare_total}</td>
              <td className="td-num-bold" style={{ backgroundColor: "#dcfce7" }}>{totals.combined_total}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SignatoryBlock />
    </div>
  );
}

// 8. Form 4.3 Part VI — Clinical Comorbidities (Medical & Psychiatric)
export function Form43ComorbiditiesView({ data, periodLabel }) {
  const [activeTab, setActiveTab] = useState("outpatient");
  const sec = data[activeTab] || data.outpatient;

  return (
    <div className="doh-report-wrapper" id="report-table">
      <FacilityHeader
        formTitle="DOH FORM 4.3 PART VI: COMPLICATIONS AND CO-MORBIDITIES"
        formSubTitle="Medical & Psychiatric Morbidity Disposition"
        periodLabel={periodLabel}
      />

      <div className="no-print view-tab-bar">
        <button className={`tab-btn ${activeTab === "outpatient" ? "active" : ""}`} onClick={() => setActiveTab("outpatient")}>B. Outpatient Service</button>
        <button className={`tab-btn ${activeTab === "aftercare" ? "active" : ""}`} onClick={() => setActiveTab("aftercare")}>C. Aftercare Service</button>
      </div>

      <div className="report-section">
        <div className="table-caption">
          <span>1. MEDICAL CO-MORBIDITIES</span>
        </div>
        <table className="doh-official-table">
          <thead>
            <tr>
              <th rowSpan="2" className="th-category" style={{ width: "40%" }}>Condition / Disease Classification</th>
              <th colSpan="2" className="th-center">Management within Facility</th>
              <th colSpan="2" className="th-center">Referred to Specialty Facility</th>
              <th colSpan="2" className="th-center">Referred to Attending MD</th>
              <th colSpan="3" className="th-center">TOTAL</th>
            </tr>
            <tr>
              <th className="th-sub">M</th>
              <th className="th-sub">F</th>
              <th className="th-sub">M</th>
              <th className="th-sub">F</th>
              <th className="th-sub">M</th>
              <th className="th-sub">F</th>
              <th className="th-sub">M</th>
              <th className="th-sub">F</th>
              <th className="th-sub">Total</th>
            </tr>
          </thead>
          <tbody>
            {sec.medical.map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{r.condition}</td>
                <td className="td-num">{r.facility_m}</td>
                <td className="td-num">{r.facility_f}</td>
                <td className="td-num">{r.specialty_m}</td>
                <td className="td-num">{r.specialty_f}</td>
                <td className="td-num">{r.attending_m}</td>
                <td className="td-num">{r.attending_f}</td>
                <td className="td-num-bold">{r.total_m}</td>
                <td className="td-num-bold">{r.total_f}</td>
                <td className="td-num-bold" style={{ backgroundColor: "#f0fdf4" }}>{r.grand_total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="table-caption" style={{ marginTop: 24 }}>
          <span>2. PSYCHIATRIC CO-MORBIDITIES</span>
        </div>
        <table className="doh-official-table">
          <thead>
            <tr>
              <th rowSpan="2" className="th-category" style={{ width: "40%" }}>Psychiatric Condition</th>
              <th colSpan="2" className="th-center">Management within Facility</th>
              <th colSpan="2" className="th-center">Referred to Specialty Facility</th>
              <th colSpan="2" className="th-center">Referred to Attending MD</th>
              <th colSpan="3" className="th-center">TOTAL</th>
            </tr>
            <tr>
              <th className="th-sub">M</th>
              <th className="th-sub">F</th>
              <th className="th-sub">M</th>
              <th className="th-sub">F</th>
              <th className="th-sub">M</th>
              <th className="th-sub">F</th>
              <th className="th-sub">M</th>
              <th className="th-sub">F</th>
              <th className="th-sub">Total</th>
            </tr>
          </thead>
          <tbody>
            {sec.psychiatric.map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{r.condition}</td>
                <td className="td-num">{r.facility_m}</td>
                <td className="td-num">{r.facility_f}</td>
                <td className="td-num">{r.specialty_m}</td>
                <td className="td-num">{r.specialty_f}</td>
                <td className="td-num">{r.attending_m}</td>
                <td className="td-num">{r.attending_f}</td>
                <td className="td-num-bold">{r.total_m}</td>
                <td className="td-num-bold">{r.total_f}</td>
                <td className="td-num-bold" style={{ backgroundColor: "#f0fdf4" }}>{r.grand_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SignatoryBlock />
    </div>
  );
}

// 9. Form 10.1 — Quarterly Completion Rate
export function Form101View({ data, periodLabel }) {
  const { quarters, annualTotal, selectedQuarter } = data;

  return (
    <div className="doh-report-wrapper" id="report-table">
      <FacilityHeader
        formTitle="DOH FORM 10.1: QUARTERLY PROGRAM COMPLETION RATE"
        formSubTitle="Performance Evaluation (Outpatient 43 Sessions / 7-Month Adjusted Cohort)"
        periodLabel={periodLabel}
      />

      <div className="report-section">
        <div className="table-caption">
          <span>B. OUTPATIENT PROGRAM COMPLETION RATE (QUARTERLY)</span>
          <span className="scope-tag">Cohort Admitted 7 Months Prior</span>
        </div>
        <table className="doh-official-table">
          <thead>
            <tr>
              <th rowSpan="2" className="th-category" style={{ width: "20%" }}>Quarter & Evaluation Period</th>
              <th rowSpan="2" className="th-center" style={{ width: "18%" }}>Target Cohort (Enrolled 7 Mos Prior)</th>
              <th colSpan="3" className="th-center">Target Expected to Complete</th>
              <th colSpan="3" className="th-center">Actual Completers (43 Sessions)</th>
              <th rowSpan="2" className="th-sub" style={{ width: "8%" }}>Non-Completers</th>
              <th rowSpan="2" className="th-center" style={{ width: "10%" }}>Completion Rate (%)</th>
              <th rowSpan="2" className="th-center" style={{ width: "12%" }}>Remarks</th>
            </tr>
            <tr>
              <th className="th-sub">M</th>
              <th className="th-sub">F</th>
              <th className="th-sub">Total</th>
              <th className="th-sub">M</th>
              <th className="th-sub">F</th>
              <th className="th-sub">Total</th>
            </tr>
          </thead>
          <tbody>
            {quarters.map((q, i) => {
              const isSelected = q.quarter === `Q${selectedQuarter}`;
              return (
                <tr key={i} className={isSelected ? "tr-highlight" : ""}>
                  <td style={{ fontWeight: 600 }}>
                    {q.label} ({q.quarter})
                    {isSelected && <span className="current-badge">SELECTED</span>}
                  </td>
                  <td style={{ fontSize: 12, color: "#64748b" }}>{q.cohort_range}</td>
                  <td className="td-num">{q.target_m}</td>
                  <td className="td-num">{q.target_f}</td>
                  <td className="td-num-bold">{q.target_total}</td>
                  <td className="td-num">{q.actual_m}</td>
                  <td className="td-num">{q.actual_f}</td>
                  <td className="td-num-bold">{q.actual_total}</td>
                  <td className="td-num">{q.non_completers}</td>
                  <td className="td-num-bold" style={{ backgroundColor: q.completion_rate >= 100 ? "#dcfce7" : "#fef3c7" }}>
                    {q.completion_rate}%
                  </td>
                  <td style={{ fontSize: 12 }}>{q.remarks}</td>
                </tr>
              );
            })}
            <tr className="tr-grand-total">
              <td>{annualTotal.label}</td>
              <td style={{ fontSize: 12 }}>Annual Summary</td>
              <td className="td-num-bold">{annualTotal.target_m}</td>
              <td className="td-num-bold">{annualTotal.target_f}</td>
              <td className="td-num-bold">{annualTotal.target_total}</td>
              <td className="td-num-bold">{annualTotal.actual_m}</td>
              <td className="td-num-bold">{annualTotal.actual_f}</td>
              <td className="td-num-bold">{annualTotal.actual_total}</td>
              <td className="td-num-bold">{annualTotal.non_completers}</td>
              <td className="td-num-bold" style={{ backgroundColor: "#dcfce7" }}>{annualTotal.completion_rate}%</td>
              <td style={{ fontWeight: 600 }}>{annualTotal.remarks}</td>
            </tr>
          </tbody>
        </table>

        <div className="formula-card">
          <p className="formula-title"><strong>STATUTORY 7-MONTH COHORT COMPLETION FORMULA:</strong></p>
          <p className="formula-math">
            <strong>Formula:</strong> (Actual PWUDs Completing 43 Sessions in Quarter / Target Cohort Enrolled 7 Months Prior) &times; 100%
          </p>
          <p className="formula-note">DOH Statutory Standard: Patients who complete the 43 core psycho-social outpatient modalities within the 7-month cycle are officially certified as Program Completers.</p>
        </div>
      </div>

      <SignatoryBlock />
    </div>
  );
}

// 10. Form 10.2 — Discharges Summary & Roster
export function Form102View({ data, periodLabel }) {
  const { roster, consolidated, totals } = data;

  return (
    <div className="doh-report-wrapper" id="report-table">
      <FacilityHeader
        formTitle="DOH FORM 10.2: DISCHARGES FROM THE PROGRAM"
        formSubTitle="Discharge Reason Consolidation & Patient Registry"
        periodLabel={periodLabel}
      />

      <div className="report-section">
        <div className="table-caption">
          <span>PART A: CONSOLIDATED DISCHARGE REASONS</span>
        </div>
        <table className="doh-official-table">
          <thead>
            <tr>
              <th rowSpan="2" className="th-category" style={{ width: "40%" }}>Reason / Status for Discharge</th>
              <th colSpan="3" className="th-center">B. Outpatient Service</th>
              <th colSpan="3" className="th-center">C. Aftercare Service</th>
              <th rowSpan="2" className="th-center" style={{ width: "12%" }}>GRAND TOTAL</th>
            </tr>
            <tr>
              <th className="th-sub">Male</th>
              <th className="th-sub">Female</th>
              <th className="th-sub">Total</th>
              <th className="th-sub">Male</th>
              <th className="th-sub">Female</th>
              <th className="th-sub">Total</th>
            </tr>
          </thead>
          <tbody>
            {consolidated.map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{i + 1}. {r.reason}</td>
                <td className="td-num">{r.outpatient_m}</td>
                <td className="td-num">{r.outpatient_f}</td>
                <td className="td-num-bold">{r.outpatient_total}</td>
                <td className="td-num">{r.aftercare_m}</td>
                <td className="td-num">{r.aftercare_f}</td>
                <td className="td-num-bold">{r.aftercare_total}</td>
                <td className="td-num-bold" style={{ backgroundColor: "#f0fdf4" }}>{r.grand_total}</td>
              </tr>
            ))}
            <tr className="tr-grand-total">
              <td>{totals.reason}</td>
              <td className="td-num-bold">{totals.outpatient_m}</td>
              <td className="td-num-bold">{totals.outpatient_f}</td>
              <td className="td-num-bold">{totals.outpatient_total}</td>
              <td className="td-num-bold">{totals.aftercare_m}</td>
              <td className="td-num-bold">{totals.aftercare_f}</td>
              <td className="td-num-bold">{totals.aftercare_total}</td>
              <td className="td-num-bold" style={{ backgroundColor: "#dcfce7" }}>{totals.grand_total}</td>
            </tr>
          </tbody>
        </table>

        <div className="table-caption" style={{ marginTop: 30 }}>
          <span>PART B: DISCHARGED PATIENT REGISTRY (ROSTER)</span>
        </div>
        {roster.length === 0 ? (
          <div className="empty-roster-box">No patient discharges recorded in this reporting period.</div>
        ) : (
          <table className="doh-official-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>No.</th>
                <th>Patient Code</th>
                <th>Gender</th>
                <th>Modality</th>
                <th>Admission Date</th>
                <th>Discharge Date</th>
                <th>Duration (Mos)</th>
                <th>Reason for Discharge</th>
                <th>Intervention upon Discharge</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((p, i) => (
                <tr key={p.id || i}>
                  <td className="td-num">{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{p.patient_code}</td>
                  <td>{p.gender || "—"}</td>
                  <td>{p.modality === "aftercare" ? "Aftercare" : "Outpatient"}</td>
                  <td>{p.admission_date ? new Date(p.admission_date).toISOString().slice(0, 10) : "—"}</td>
                  <td>{p.discharge_date ? new Date(p.discharge_date).toISOString().slice(0, 10) : "—"}</td>
                  <td className="td-num">{p.treatment_duration_months || 7}</td>
                  <td>{p.reason || p.status}</td>
                  <td>{p.intervention_upon_discharge || "Transferred to Aftercare / Completed"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <SignatoryBlock />
    </div>
  );
}

// 11. Form 11 — Surveillance Matrix
export function Form11View({ data, periodLabel }) {
  const { windows, totals, roster } = data;

  return (
    <div className="doh-report-wrapper" id="report-table">
      <FacilityHeader
        formTitle="DOH FORM 11: CONSOLIDATED REPORT ON ILLEGAL DRUG USE"
        formSubTitle="Post-Admission Surveillance Matrix across 4 Time Windows"
        periodLabel={periodLabel}
      />

      <div className="report-section">
        <div className="table-caption">
          <span>SURVEILLANCE DRUG TESTING MATRIX</span>
          <span className="scope-tag">Random Surveillance Tests</span>
        </div>
        <table className="doh-official-table">
          <thead>
            <tr>
              <th rowSpan="2" className="th-category" style={{ width: "24%" }}>Surveillance Window</th>
              <th rowSpan="2" className="th-sub">Total Tested</th>
              <th colSpan="6" className="th-center">Positive by Substance</th>
              <th rowSpan="2" className="th-sub" style={{ backgroundColor: "#fee2e2" }}>Positive (+)</th>
              <th rowSpan="2" className="th-sub" style={{ backgroundColor: "#dcfce7" }}>Negative (-)</th>
              <th rowSpan="2" className="th-sub">Positivity Rate (%)</th>
            </tr>
            <tr>
              <th className="th-sub" title="Methamphetamine">M</th>
              <th className="th-sub" title="Cannabis/THC">T</th>
              <th className="th-sub" title="Ecstasy">E</th>
              <th className="th-sub" title="Cocaine">C</th>
              <th className="th-sub" title="Opiates">O</th>
              <th className="th-sub" title="Amphetamines">A</th>
            </tr>
          </thead>
          <tbody>
            {windows.map((w, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{w.label}</td>
                <td className="td-num-bold">{w.tested}</td>
                <td className="td-num">{w.meth}</td>
                <td className="td-num">{w.thc}</td>
                <td className="td-num">{w.ecstasy}</td>
                <td className="td-num">{w.cocaine}</td>
                <td className="td-num">{w.opiates}</td>
                <td className="td-num">{w.amphetamines}</td>
                <td className="td-num-bold" style={{ color: w.positive > 0 ? "#dc2626" : "inherit" }}>{w.positive}</td>
                <td className="td-num-bold" style={{ color: "#16a34a" }}>{w.negative}</td>
                <td className="td-num-bold">{w.positive_rate}%</td>
              </tr>
            ))}
            <tr className="tr-grand-total">
              <td>{totals.label}</td>
              <td className="td-num-bold">{totals.tested}</td>
              <td className="td-num-bold">{totals.meth}</td>
              <td className="td-num-bold">{totals.thc}</td>
              <td className="td-num-bold">{totals.ecstasy}</td>
              <td className="td-num-bold">{totals.cocaine}</td>
              <td className="td-num-bold">{totals.opiates}</td>
              <td className="td-num-bold">{totals.amphetamines}</td>
              <td className="td-num-bold" style={{ color: totals.positive > 0 ? "#dc2626" : "inherit" }}>{totals.positive}</td>
              <td className="td-num-bold" style={{ color: "#16a34a" }}>{totals.negative}</td>
              <td className="td-num-bold">{totals.positive_rate}%</td>
            </tr>
          </tbody>
        </table>

        <div className="table-caption" style={{ marginTop: 30 }}>
          <span>ROSTER OF SURVEILLANCE DRUG TESTS CONDUCTED</span>
        </div>
        {roster.length === 0 ? (
          <div className="empty-roster-box">No surveillance drug tests logged in this reporting window.</div>
        ) : (
          <table className="doh-official-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>No.</th>
                <th>Patient Code</th>
                <th>Gender</th>
                <th>Test Date</th>
                <th>Days Elapsed</th>
                <th>Window</th>
                <th>Substance Tested</th>
                <th>Result</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((r, i) => (
                <tr key={i}>
                  <td className="td-num">{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{r.patient_code}</td>
                  <td>{r.gender || "—"}</td>
                  <td>{r.test_date}</td>
                  <td className="td-num">{r.days_elapsed}</td>
                  <td><span className="window-badge">{r.window}</span></td>
                  <td>{r.substance_tested}</td>
                  <td>
                    <span className={`dt-pill ${r.result === "POSITIVE" ? "dt-pos" : "dt-neg"}`}>
                      {r.result}
                    </span>
                  </td>
                  <td>{r.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <SignatoryBlock />
    </div>
  );
}

// 12. Generic Official View for Census, Non-Completers, Positive DT
export function GenericOfficialView({ data, title, periodLabel }) {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div className="doh-report-wrapper" id="report-table">
        <FacilityHeader formTitle={title} periodLabel={periodLabel} />
        <div className="empty-roster-box">No records logged for this reporting period.</div>
        <SignatoryBlock />
      </div>
    );
  }

  const isArray = Array.isArray(data);
  const keys = isArray ? Object.keys(data[0]) : Object.keys(data);

  return (
    <div className="doh-report-wrapper" id="report-table">
      <FacilityHeader formTitle={title} periodLabel={periodLabel} />
      <div className="report-section">
        {isArray ? (
          <table className="doh-official-table">
            <thead>
              <tr>
                {keys.map(k => (
                  <th key={k} className="th-category">{k.replace(/_/g, " ").toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i}>
                  {keys.map(k => (
                    <td key={k}>{r[k] !== null && r[k] !== undefined ? String(r[k]) : "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="doh-official-table">
            <thead>
              <tr>
                <th className="th-category" style={{ width: "60%" }}>Metric / Category</th>
                <th className="th-center">Count / Value</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k}>
                  <td style={{ fontWeight: 600 }}>{k.replace(/_/g, " ").toUpperCase()}</td>
                  <td className="td-num-bold">{String(data[k])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <SignatoryBlock />
    </div>
  );
}
