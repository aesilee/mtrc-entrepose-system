import { useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const CBTE_1_SOURCE_QUESTIONS = [
  {
    key: "recovery_stage",
    promptTagalog: "1. Daan Tungo sa Paggaling: Saang yugto ng paggaling sa tingin mo ikaw ay naroroon ngayon?",
    promptEnglish: "Stage on the Road to Recovery (Workbook Sesyon 1 / Sesyon 7 reference)",
    options: [
      { value: "WITHDRAWAL", label: "Withdrawal Stage (Unang 1–2 Linggo / Pag-aadjust ng Katawan)" },
      { value: "HONEYMOON", label: "Honeymoon Stage (Pakiramdam na Wala Nang Problema / Overconfidence)" },
      { value: "THE_WALL", label: "Ang Pader / The Wall (Pagkabagot, Lungkot, at Malakas na Tukso)" },
      { value: "ADJUSTMENT", label: "Pag-aangkop / Adjustment (Pagbuo ng Bagong Rutina at Pamumuhay)" },
      { value: "RESOLUTION", label: "Resolusyon / Resolution (Matatag na Abstinence at Paglago)" },
    ],
  },
  {
    key: "craving_frequency",
    promptTagalog: "2. Sa nakalipas na buwan, gaano kadalas kang nakaranas ng giyang (craving) o tukso na gumamit?",
    promptEnglish: "Self-reported frequency of cravings or urges in the past month",
    options: [
      { value: "NONE", label: "Wala (None — No cravings experienced)" },
      { value: "RARE", label: "Bihira (Rare — Once or twice, easily managed)" },
      { value: "SOMETIMES", label: "Paminsan-minsan (Sometimes — Occasional urges)" },
      { value: "OFTEN", label: "Madalas (Often — Frequent urges requiring active coping)" },
      { value: "DAILY", label: "Araw-araw (Daily — Persistent strong cravings)" },
    ],
  },
];

const CBTE_1_DOMAINS = [
  {
    key: "craving_control",
    label: "1. Pagkontrol sa Giyang at Kaisipan (Craving & Thought Control)",
    desc: "Ability to recognize and manage urges using thought-stopping and delay techniques",
  },
  {
    key: "trigger_avoidance",
    label: "2. Pag-iwas sa External at Internal Triggers (Trigger Avoidance)",
    desc: "Active avoidance of high-risk people, places, things, and unmanaged emotional triggers",
  },
  {
    key: "schedule_compliance",
    label: "3. Pagsunod sa Pang-araw-araw na Schedule Book (Daily Schedule Adherence)",
    desc: "Structuring daily hours to eliminate idle time and boredom",
  },
  {
    key: "family_relations",
    label: "4. Ugnayan at Komunikasyon sa Pamilya (Family Relationships)",
    desc: "Restoring trust, open communication, and healthy family roles",
  },
  {
    key: "emotional_regulation",
    label: "5. Pamamahala ng Galit, Lungkot, at Stress (Emotional Regulation)",
    desc: "Handling anger, boredom, anxiety, and stress without substance use",
  },
  {
    key: "physical_health",
    label: "6. Pangangalaga sa Sarili at Kalusugan (Physical Health & Self-Care)",
    desc: "Sleep hygiene, nutrition, exercise, and physical recovery",
  },
  {
    key: "honesty_accountability",
    label: "7. Pagkamatapat at Pagtanggap ng Pananagutan (Honesty & Accountability)",
    desc: "Truthfulness in group sharing, Schedule Book logging, and clinical sessions",
  },
  {
    key: "shgm_participation",
    label: "8. Pakikilahok sa Self-Help Group at 12-Steps (SHGM Engagement)",
    desc: "Active attendance and peer support engagement in Self-Help Group Meetings",
  },
  {
    key: "productivity_work",
    label: "9. Trabaho, Pag-aaral, at Makabuluhang Gawain (Work & Daily Productivity)",
    desc: "Fulfilling work, school, or household responsibilities consistently",
  },
  {
    key: "financial_responsibility",
    label: "10. Pamamahala ng Buhay at Pera (Financial Responsibility)",
    desc: "Responsible handling of money without triggering substance urges",
  },
  {
    key: "legal_compliance",
    label: "11. Pagsunod sa Patakaran ng MTRC at Hukuman (Program & Legal Compliance)",
    desc: "Punctual attendance and adherence to court/rehabilitation conditions",
  },
];

const CBTE_2_SKILLS = [
  {
    key: "schedule_book",
    label: "1. Paggamit ng pang-araw-araw na Schedule Book upang maiwasan ang bakanteng oras at pagkabagot (Daily Schedule Book usage to prevent idle time)",
  },
  {
    key: "external_triggers",
    label: "2. Pagkilala at pag-iwas sa mga External Triggers — dating barkada, lugar, at kagamitan (Avoiding External Triggers: people, places, things)",
  },
  {
    key: "internal_triggers",
    label: "3. Pagkilala sa mga Internal Triggers — galit, lungkot, pagod, stress bago lumala ang tukso (Recognizing Internal Triggers / emotional states early)",
  },
  {
    key: "thought_stopping",
    label: "4. Paggamit ng Thought Stopping at pagpapalit ng kaisipan kapag may giyang (Applying Thought Stopping & cognitive restructuring)",
  },
  {
    key: "alcohol_abstinence",
    label: "5. Pag-iwas sa alak at iba pang pamalit na bisyo na nagpapahina ng pagpipigil (Maintaining abstinence from alcohol and cross-triggers)",
  },
  {
    key: "support_network",
    label: "6. Pakikipag-ugnayan sa pamilya, Case Manager, o Sober Support Person sa oras ng tukso (Reaching out to sober support network during urges)",
  },
  {
    key: "shgm_12steps",
    label: "7. Aktibong pakikilahok sa Self-Help Group Meetings (SHGM) at 12-Steps (Consistent participation in SHGM and 12-Step recovery)",
  },
  {
    key: "relapse_drift_check",
    label: "8. Pagbantay sa mga babala ng Relapse Drift at pagiging tapat sa sarili (Monitoring Relapse Drift warning signs and practicing honesty)",
  },
];

const CBTE_2_RESPONSE_OPTIONS = [
  { value: "PRACTICED_CONSISTENTLY", label: "Palaging Ginagawa (Consistently Practiced)" },
  { value: "PRACTICED_SOMETIMES", label: "Paminsan-minsan (Partially Practiced)" },
  { value: "NOT_YET_PRACTICED", label: "Hindi Pa Nagagawa (Not Yet Practiced)" },
];

const CBTE_3_READINESS = [
  {
    key: "sustaining_habits",
    label: "1. May malinaw na pang-araw-araw na gawaing ipagpapatuloy upang mapanatili ang abstinence (Clear daily recovery routine to sustain abstinence)",
  },
  {
    key: "high_risk_plan",
    label: "2. May konkretong plano sa pagharap sa mga darating na High-Risk Situations at tukso (Concrete relapse prevention plan for future high-risk situations)",
  },
  {
    key: "family_reintegration",
    label: "3. Maayos na komunikasyon at suporta mula sa pamilya o tahanan (Healthy family communication and home support system)",
  },
  {
    key: "livelihood_purpose",
    label: "4. May nakalatag na plano sa trabaho, pag-aaral, o makabuluhang gawain sa komunidad (Plan for employment, education, or community productivity)",
  },
  {
    key: "acp_commitment",
    label: "5. Handa at nakahandang pumasok sa 9-Month Community Aftercare Program (SIBOL / OP-ACP) (Committed to 9-Month Community Aftercare & follow-up)",
  },
];

const CBTE_3_RESPONSE_OPTIONS = [
  { value: "YES", label: "Oo — Handa (Yes / Demonstrated)" },
  { value: "PARTIAL", label: "Bahagya — Kailangan ng Gabay (Partial / Needs Support)" },
  { value: "NO", label: "Hindi Pa (Not Yet Demonstrated)" },
];

const SELF_REPORTED_STATUS_OPTIONS = [
  {
    value: "SAFE",
    label: "🟢 Safe / Abstinent (No cravings or high-risk exposure reported)",
  },
  {
    value: "AT_RISK",
    label: "🟡 At Risk (Exposed to triggers or skipped schedule — did NOT use substances)",
  },
  {
    value: "NEARLY_USED",
    label: "🟠 Nearly Used / Strong Craving (Experienced strong urge — did NOT use substances)",
  },
  {
    value: "USED",
    label: "🔴 Actual Use / Slip (Client reported actual substance use / lapse)",
  },
];

const STAFF_RISK_ASSESSMENT_OPTIONS = [
  { value: "LOW_RISK", label: "Low Risk — Stable Recovery & Coping" },
  { value: "MODERATE_RISK", label: "Moderate Risk — Monitor Triggers & Reinforce Coping" },
  { value: "HIGH_RISK", label: "High Risk — Intensify Clinical Support & Follow-up" },
  { value: "ACUTE_RELAPSE_RISK", label: "Acute Relapse Risk — Immediate Clinical Intervention" },
];

function buildEmptyDomainScores() {
  return CBTE_1_DOMAINS.reduce((acc, d) => ({ ...acc, [d.key]: null }), {});
}

function buildEmptySkillsResponses() {
  return CBTE_2_SKILLS.reduce((acc, s) => ({ ...acc, [s.key]: null }), {});
}

function buildEmptyReadinessResponses() {
  return CBTE_3_READINESS.reduce((acc, r) => ({ ...acc, [r.key]: null }), {});
}

export default function CbteEvaluationModal({
  patient,
  existingEvaluation = null,
  readOnly = false,
  onClose,
  onSaved,
}) {
  const { user } = useAuth();
  const existingWs = existingEvaluation?.worksheet_responses_json || {};
  const existingDomains = existingEvaluation?.recovery_domains_json || {};
  const existingSkills = existingEvaluation?.coping_skills_json || {};

  const [evalType, setEvalType] = useState(existingEvaluation?.evaluation_type || "CBTE_1");
  const [evalDate, setEvalDate] = useState(
    existingEvaluation?.evaluation_date
      ? String(existingEvaluation.evaluation_date).slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [evaluatorName, setEvaluatorName] = useState(
    existingEvaluation?.evaluator_name || user?.full_name || user?.username || ""
  );
  const [formBasis, setFormBasis] = useState(
    existingEvaluation?.form_basis || "SUPPLIED_ENTREPOSE_WORKSHEET"
  );
  const [approvedByClinicalLead, setApprovedByClinicalLead] = useState(
    existingEvaluation?.approved_by_clinical_lead ||
      "Fulbert Alec R. Gillego, RMT, MD, MSPH (Medical Center Chief III / Clinical Lead)"
  );
  const [adaptationNotes, setAdaptationNotes] = useState(
    existingEvaluation?.adaptation_notes || ""
  );

  // Separate Clinical Dimensions:
  // 1. Client Self-Reported Schedule Book / Craving Status (Unanswered by default!)
  const [selfReportedStatus, setSelfReportedStatus] = useState(
    existingEvaluation?.self_reported_status || ""
  );
  // 2. Staff Clinical Risk Assessment (Unanswered by default!)
  const [staffRiskAssessment, setStaffRiskAssessment] = useState(
    existingEvaluation?.staff_risk_assessment || ""
  );
  // 3. Staff Clinical Evaluation Decision (Unanswered by default!)
  const [clinicalJudgment, setClinicalJudgment] = useState(
    existingEvaluation?.clinical_judgment || ""
  );

  // CBT-E 1 Source Worksheet Questions + 11 Domains (All start unanswered!)
  const [cbte1Source, setCbte1Source] = useState({
    abstinence_duration: existingWs.abstinence_duration || "",
    recovery_stage: existingWs.recovery_stage || "",
    craving_frequency: existingWs.craving_frequency || "",
    life_changes_reflection: existingWs.life_changes_reflection || "",
    current_challenges: existingWs.current_challenges || "",
  });

  const [domainScores, setDomainScores] = useState(() => {
    const base = buildEmptyDomainScores();
    if (existingEvaluation && existingDomains && typeof existingDomains === "object") {
      for (const k of Object.keys(base)) {
        if (existingDomains[k] != null) base[k] = Number(existingDomains[k]);
      }
    }
    return base;
  });

  // CBT-E 2 Source Worksheet Questions (All start unanswered!)
  const [skillsResponses, setSkillsResponses] = useState(() => {
    const base = buildEmptySkillsResponses();
    const sourceSkills = existingWs.skills_responses || existingSkills;
    if (existingEvaluation && sourceSkills && typeof sourceSkills === "object") {
      for (const k of Object.keys(base)) {
        const val = sourceSkills[k];
        if (typeof val === "string") {
          base[k] = val;
        } else if (val === true) {
          base[k] = "PRACTICED_CONSISTENTLY";
        } else if (val === false) {
          base[k] = "NOT_YET_PRACTICED";
        }
      }
    }
    return base;
  });
  const [cbte2Source, setCbte2Source] = useState({
    effective_coping_strategies: existingWs.effective_coping_strategies || "",
    situations_needing_caution: existingWs.situations_needing_caution || "",
  });

  // CBT-E 3 Source Worksheet Questions (All start unanswered!)
  const [readinessResponses, setReadinessResponses] = useState(() => {
    const base = buildEmptyReadinessResponses();
    const sourceReadiness = existingWs.readiness_responses || existingSkills;
    if (existingEvaluation && sourceReadiness && typeof sourceReadiness === "object") {
      for (const k of Object.keys(base)) {
        const val = sourceReadiness[k];
        if (typeof val === "string") {
          base[k] = val;
        } else if (val === true) {
          base[k] = "YES";
        } else if (val === false) {
          base[k] = "NO";
        }
      }
    }
    return base;
  });
  const [lifeGoalsText, setLifeGoalsText] = useState(existingEvaluation?.life_goals_text || "");
  const [emergencySupportPlan, setEmergencySupportPlan] = useState(
    existingWs.emergency_support_plan || ""
  );

  const [evaluatorRemarks, setEvaluatorRemarks] = useState(
    existingEvaluation?.evaluator_remarks || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Calculate unanswered vs answered items for the active worksheet
  function getCompletionStats() {
    if (evalType === "CBTE_1") {
      const sourceAnswered =
        (cbte1Source.abstinence_duration.trim() ? 1 : 0) +
        (cbte1Source.recovery_stage ? 1 : 0) +
        (cbte1Source.craving_frequency ? 1 : 0) +
        (cbte1Source.life_changes_reflection.trim() ? 1 : 0);
      const domainsAnswered = Object.values(domainScores).filter((v) => v !== null).length;
      return {
        answered: sourceAnswered + domainsAnswered,
        total: 4 + CBTE_1_DOMAINS.length,
        domainsAnswered,
        domainsTotal: CBTE_1_DOMAINS.length,
      };
    }
    if (evalType === "CBTE_2") {
      const skillsAnswered = Object.values(skillsResponses).filter((v) => v !== null).length;
      const openAnswered = cbte2Source.effective_coping_strategies.trim() ? 1 : 0;
      return {
        answered: skillsAnswered + openAnswered,
        total: CBTE_2_SKILLS.length + 1,
      };
    }
    const readinessAnswered = Object.values(readinessResponses).filter((v) => v !== null).length;
    const goalsAnswered = lifeGoalsText.trim() ? 1 : 0;
    return {
      answered: readinessAnswered + goalsAnswered,
      total: CBTE_3_READINESS.length + 1,
    };
  }

  const completionStats = getCompletionStats();

  async function handleSubmit(e) {
    e.preventDefault();
    if (readOnly) return;
    setError("");

    if (!evalDate) {
      setError("Assessment date is required.");
      return;
    }
    if (!evaluatorName.trim()) {
      setError("Evaluator name is required.");
      return;
    }
    if (!selfReportedStatus) {
      setError(
        "Please select the Client's Self-Reported Schedule Book / Craving Status (unanswered items must be completed)."
      );
      return;
    }
    if (!staffRiskAssessment) {
      setError("Please select the Staff Clinical Risk Assessment.");
      return;
    }
    if (!clinicalJudgment) {
      setError("Please select the Staff Clinical Evaluation Decision / Recommendation.");
      return;
    }

    if (evalType === "CBTE_1") {
      if (!cbte1Source.abstinence_duration.trim() || !cbte1Source.recovery_stage || !cbte1Source.craving_frequency) {
        setError("Please complete the CBT-E 1 source worksheet recovery status questions before saving.");
        return;
      }
      const unansweredDomains = CBTE_1_DOMAINS.filter((d) => domainScores[d.key] === null);
      if (unansweredDomains.length > 0) {
        setError(
          `Please answer all 11 recovery domain items (${unansweredDomains.length} item(s) still unanswered).`
        );
        return;
      }
    } else if (evalType === "CBTE_2") {
      const unansweredSkills = CBTE_2_SKILLS.filter((s) => skillsResponses[s.key] === null);
      if (unansweredSkills.length > 0) {
        setError(
          `Please evaluate all 8 relapse prevention behavior items (${unansweredSkills.length} item(s) still unanswered).`
        );
        return;
      }
    } else if (evalType === "CBTE_3") {
      const unansweredReadiness = CBTE_3_READINESS.filter((r) => readinessResponses[r.key] === null);
      if (unansweredReadiness.length > 0) {
        setError(
          `Please answer all 5 continuing treatment & aftercare readiness items (${unansweredReadiness.length} item(s) still unanswered).`
        );
        return;
      }
      if (!lifeGoalsText.trim()) {
        setError("Please document the client's Continuing Recovery & Life Goals for CBT-E 3.");
        return;
      }
    }

    setSaving(true);
    try {
      const worksheetResponsesJson =
        evalType === "CBTE_1"
          ? {
              worksheet_title: "Sesyon 1. Pagsusuri ng Katayuan ng Paggaling",
              ...cbte1Source,
              domain_ratings: domainScores,
            }
          : evalType === "CBTE_2"
          ? {
              worksheet_title: "Sesyon 2. Pagsusuri sa mga Pag-uugali para sa Pag-iwas sa Muling Paggamit",
              skills_responses: skillsResponses,
              ...cbte2Source,
            }
          : {
              worksheet_title: "Sesyon 3. Pagpapatuloy ng Treatment Planning",
              readiness_responses: readinessResponses,
              continuing_life_goals: lifeGoalsText.trim(),
              emergency_support_plan: emergencySupportPlan.trim(),
            };

      const payload = {
        evaluationType: evalType,
        evaluationDate: evalDate,
        evaluatorName: evaluatorName.trim(),
        formBasis,
        approvedByClinicalLead: approvedByClinicalLead.trim() || null,
        adaptationNotes: adaptationNotes.trim() || null,
        selfReportedStatus,
        staffRiskAssessment,
        worksheetResponsesJson,
        recoveryDomainsJson: evalType === "CBTE_1" ? domainScores : null,
        copingSkillsJson:
          evalType === "CBTE_2"
            ? skillsResponses
            : evalType === "CBTE_3"
            ? readinessResponses
            : null,
        lifeGoalsText: evalType === "CBTE_3" ? lifeGoalsText.trim() : null,
        overallScore: null, // Never present an unapproved application-invented score as an official clinical measure
        clinicalJudgment,
        evaluatorRemarks: evaluatorRemarks.trim() || null,
      };

      if (existingEvaluation?.id) {
        await api.put(
          `/case-management/patients/${patient.id}/cbte-evaluations/${existingEvaluation.id}`,
          payload
        );
      } else {
        await api.post(`/case-management/patients/${patient.id}/cbte-evaluations`, payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save CBT-E evaluation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>
              {readOnly
                ? "CBT-E Clinical Evaluation Record (Source Worksheet)"
                : existingEvaluation
                ? "Update CBT-E Clinical Evaluation"
                : "CBT-E Clinical Evaluation (ENTREPOSE Vol. 2A Source Forms)"}
            </div>
            <div style={styles.subtitle}>
              Client: <strong>{patient?.full_name}</strong> · All items start unanswered and preserve exact responses
            </div>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        {/* Evaluation Type Tabs */}
        <div style={styles.tabBar}>
          {[
            {
              key: "CBTE_1",
              title: "CBT-E 1 (Sesyon 1)",
              desc: "Pagsusuri ng Katayuan ng Paggaling",
            },
            {
              key: "CBTE_2",
              title: "CBT-E 2 (Sesyon 2)",
              desc: "Pag-uugali sa Pag-iwas sa Relapse",
            },
            {
              key: "CBTE_3",
              title: "CBT-E 3 (Sesyon 3)",
              desc: "Pagpapatuloy ng Treatment Planning",
            },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              disabled={readOnly || Boolean(existingEvaluation)}
              onClick={() => setEvalType(tab.key)}
              style={{
                ...styles.tabBtn,
                ...(evalType === tab.key ? styles.tabBtnActive : {}),
                ...(readOnly || existingEvaluation ? { cursor: "default" } : {}),
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13 }}>{tab.title}</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>{tab.desc}</div>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={styles.body}>
          {error && <div style={styles.error}>{error}</div>}

          {/* Assessment Metadata & Form Basis Approval */}
          <div style={styles.metaCard}>
            <div style={styles.grid3}>
              <label style={styles.label}>
                Assessment Date *
                <input
                  type="date"
                  style={styles.input}
                  value={evalDate}
                  disabled={readOnly}
                  onChange={(e) => setEvalDate(e.target.value)}
                  required
                />
              </label>

              <label style={styles.label}>
                Authorized Evaluator *
                <input
                  type="text"
                  style={styles.input}
                  value={evaluatorName}
                  disabled={readOnly}
                  onChange={(e) => setEvaluatorName(e.target.value)}
                  placeholder="Name of Case Manager / Evaluator"
                  required
                />
              </label>

              <label style={styles.label}>
                Approved Form Content Basis *
                <select
                  style={styles.input}
                  value={formBasis}
                  disabled={readOnly}
                  onChange={(e) => setFormBasis(e.target.value)}
                >
                  <option value="SUPPLIED_ENTREPOSE_WORKSHEET">
                    Supplied ENTREPOSE Vol. 2A Source Worksheet
                  </option>
                  <option value="MTRC_APPROVED_LOCAL_ADAPTATION">
                    MTRC Clinical Lead Approved Local Adaptation
                  </option>
                </select>
              </label>
            </div>

            {formBasis === "MTRC_APPROVED_LOCAL_ADAPTATION" && (
              <div style={{ ...styles.grid2, marginTop: 10 }}>
                <label style={styles.label}>
                  Approved By (MTRC Clinical Lead)
                  <input
                    type="text"
                    style={styles.input}
                    value={approvedByClinicalLead}
                    disabled={readOnly}
                    onChange={(e) => setApprovedByClinicalLead(e.target.value)}
                  />
                </label>
                <label style={styles.label}>
                  Local Adaptation Reference / Notes
                  <input
                    type="text"
                    style={styles.input}
                    value={adaptationNotes}
                    disabled={readOnly}
                    onChange={(e) => setAdaptationNotes(e.target.value)}
                    placeholder="e.g., Added structured 11-domain qualitative rubric alongside Sesyon 1 questions"
                  />
                </label>
              </div>
            )}

            <div style={styles.completionBanner}>
              <div>
                <strong>Worksheet Completion Status:</strong> {completionStats.answered} of{" "}
                {completionStats.total} required items answered
              </div>
              <div style={{ fontSize: 11.5, color: "#475569" }}>
                ℹ️ Qualitative worksheet responses are preserved directly (no unvalidated composite score is generated).
              </div>
            </div>
          </div>

          {/* CBT-E 1: Sesyon 1. Pagsusuri ng Katayuan ng Paggaling */}
          {evalType === "CBTE_1" && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                Bahagi I — Source Worksheet: Sesyon 1. Pagsusuri ng Katayuan ng Paggaling (Evaluation of Recovery Status)
              </div>

              <div style={styles.questionCard}>
                <label style={styles.label}>
                  <div>
                    <strong>0. Gaano katagal ka nang hindi gumagamit ng droga at alak?</strong>
                    <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 500 }}>
                      Length of continuous abstinence reported by the client (e.g., "5 linggo / 35 araw na abstinent")
                    </div>
                  </div>
                  <input
                    type="text"
                    style={styles.input}
                    value={cbte1Source.abstinence_duration}
                    disabled={readOnly}
                    onChange={(e) =>
                      setCbte1Source((prev) => ({ ...prev, abstinence_duration: e.target.value }))
                    }
                    placeholder="Enter client's reported duration of abstinence…"
                  />
                </label>
              </div>

              {CBTE_1_SOURCE_QUESTIONS.map((q) => (
                <div key={q.key} style={styles.questionCard}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}>{q.promptTagalog}</div>
                  <div style={{ fontSize: 11.5, color: "#64748B", marginBottom: 8 }}>{q.promptEnglish}</div>
                  <select
                    style={{
                      ...styles.input,
                      borderColor: cbte1Source[q.key] ? "#166534" : "#CBD5E0",
                      background: cbte1Source[q.key] ? "#F0FDF4" : "#FFF",
                    }}
                    value={cbte1Source[q.key]}
                    disabled={readOnly}
                    onChange={(e) =>
                      setCbte1Source((prev) => ({ ...prev, [q.key]: e.target.value }))
                    }
                  >
                    <option value="">— Unanswered: Select client response —</option>
                    {q.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <div style={styles.grid2}>
                <label style={styles.label}>
                  <span>
                    <strong>3. Mga Positibong Pagbabago sa Buhay (Positive Changes Since Entering Program) *</strong>
                  </span>
                  <textarea
                    style={{ ...styles.input, minHeight: 68 }}
                    value={cbte1Source.life_changes_reflection}
                    disabled={readOnly}
                    onChange={(e) =>
                      setCbte1Source((prev) => ({ ...prev, life_changes_reflection: e.target.value }))
                    }
                    placeholder="Document client's reflection on changes in health, family, daily routine, and outlook…"
                  />
                </label>
                <label style={styles.label}>
                  <span>
                    <strong>4. Mga Kasalukuyang Hamon o Tukso (Current Challenges / Triggers Being Faced)</strong>
                  </span>
                  <textarea
                    style={{ ...styles.input, minHeight: 68 }}
                    value={cbte1Source.current_challenges}
                    disabled={readOnly}
                    onChange={(e) =>
                      setCbte1Source((prev) => ({ ...prev, current_challenges: e.target.value }))
                    }
                    placeholder="Document specific triggers, stressors, or difficulties identified during the session…"
                  />
                </label>
              </div>

              <div style={{ ...styles.sectionTitle, marginTop: 10 }}>
                Bahagi II — 11 Recovery Life Domains Check (All Items Start Unanswered: 1 = Matinding Hamon to 5 = Matatag)
              </div>
              <div style={styles.domainList}>
                {CBTE_1_DOMAINS.map((d) => {
                  const currentVal = domainScores[d.key];
                  return (
                    <div
                      key={d.key}
                      style={{
                        ...styles.domainRow,
                        borderColor: currentVal === null ? "#FCD34D" : "#E2E8F0",
                        background: currentVal === null ? "#FFFBEB" : "#FFFFFF",
                      }}
                    >
                      <div style={{ flex: 1, paddingRight: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#2D3748" }}>{d.label}</div>
                        <div style={{ fontSize: 11.5, color: "#718096" }}>{d.desc}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {currentVal === null && (
                          <span style={{ fontSize: 11, color: "#B45309", fontWeight: 700, marginRight: 4 }}>
                            Unanswered
                          </span>
                        )}
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={score}
                            type="button"
                            disabled={readOnly}
                            onClick={() =>
                              setDomainScores((prev) => ({ ...prev, [d.key]: score }))
                            }
                            style={{
                              ...styles.scoreBtn,
                              ...(currentVal === score ? styles.scoreBtnActive : {}),
                            }}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CBT-E 2: Sesyon 2. Pagsusuri sa mga Pag-uugali para sa Pag-iwas sa Muling Paggamit */}
          {evalType === "CBTE_2" && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                Source Worksheet: Sesyon 2. Pagsusuri sa mga Pag-uugali para sa Pag-iwas sa Muling Paggamit
              </div>
              <div style={styles.domainList}>
                {CBTE_2_SKILLS.map((s) => {
                  const val = skillsResponses[s.key];
                  return (
                    <div
                      key={s.key}
                      style={{
                        ...styles.domainRow,
                        flexDirection: "column",
                        alignItems: "stretch",
                        gap: 8,
                        borderColor: val === null ? "#FCD34D" : "#E2E8F0",
                        background: val === null ? "#FFFBEB" : "#FFFFFF",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>{s.label}</span>
                        {val === null && (
                          <span style={{ fontSize: 11, color: "#B45309", fontWeight: 700, whiteSpace: "nowrap" }}>
                            Unanswered
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {CBTE_2_RESPONSE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={readOnly}
                            onClick={() =>
                              setSkillsResponses((prev) => ({ ...prev, [s.key]: opt.value }))
                            }
                            style={{
                              ...styles.optionPillBtn,
                              ...(val === opt.value ? styles.optionPillBtnActive : {}),
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={styles.grid2}>
                <label style={styles.label}>
                  <span>
                    <strong>Pinakamabisang Paraan sa Pag-iwas sa Relapse (Most Effective Coping Strategies Used) *</strong>
                  </span>
                  <textarea
                    style={{ ...styles.input, minHeight: 72 }}
                    value={cbte2Source.effective_coping_strategies}
                    disabled={readOnly}
                    onChange={(e) =>
                      setCbte2Source((prev) => ({
                        ...prev,
                        effective_coping_strategies: e.target.value,
                      }))
                    }
                    placeholder="Record client's specific relapse prevention behaviors that worked best…"
                  />
                </label>
                <label style={styles.label}>
                  <span>
                    <strong>Mga Sitwasyong Kailangan Pang Pag-ingatan (High-Risk Situations Still Needing Work)</strong>
                  </span>
                  <textarea
                    style={{ ...styles.input, minHeight: 72 }}
                    value={cbte2Source.situations_needing_caution}
                    disabled={readOnly}
                    onChange={(e) =>
                      setCbte2Source((prev) => ({
                        ...prev,
                        situations_needing_caution: e.target.value,
                      }))
                    }
                    placeholder="Record remaining triggers or relapse drift warning signs to monitor…"
                  />
                </label>
              </div>
            </div>
          )}

          {/* CBT-E 3: Sesyon 3. Pagpapatuloy ng Treatment Planning */}
          {evalType === "CBTE_3" && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                Source Worksheet: Sesyon 3. Pagpapatuloy ng Treatment Planning (Continuing Recovery & Aftercare Plan)
              </div>
              <div style={styles.domainList}>
                {CBTE_3_READINESS.map((r) => {
                  const val = readinessResponses[r.key];
                  return (
                    <div
                      key={r.key}
                      style={{
                        ...styles.domainRow,
                        flexDirection: "column",
                        alignItems: "stretch",
                        gap: 8,
                        borderColor: val === null ? "#FCD34D" : "#E2E8F0",
                        background: val === null ? "#FFFBEB" : "#FFFFFF",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>{r.label}</span>
                        {val === null && (
                          <span style={{ fontSize: 11, color: "#B45309", fontWeight: 700, whiteSpace: "nowrap" }}>
                            Unanswered
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {CBTE_3_RESPONSE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={readOnly}
                            onClick={() =>
                              setReadinessResponses((prev) => ({ ...prev, [r.key]: opt.value }))
                            }
                            style={{
                              ...styles.optionPillBtn,
                              ...(val === opt.value ? styles.optionPillBtnActive : {}),
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={styles.grid2}>
                <label style={styles.label}>
                  <span>
                    <strong>Mga Layunin sa Pagpapatuloy ng Paggaling (Continuing Recovery & Aftercare Goals) *</strong>
                  </span>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder="Document client's post-rehab goals, employment/reintegration plans, and OP-ACP schedule commitment…"
                    value={lifeGoalsText}
                    disabled={readOnly}
                    onChange={(e) => setLifeGoalsText(e.target.value)}
                  />
                </label>
                <label style={styles.label}>
                  <span>
                    <strong>Emergency Support Network & Crisis Plan (Mga Taong Maaaring Hingian ng Tulong)</strong>
                  </span>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder="List sober support contacts, family members, and steps client will take if strong cravings arise…"
                    value={emergencySupportPlan}
                    disabled={readOnly}
                    onChange={(e) => setEmergencySupportPlan(e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}

          {/* SEPARATE CLINICAL INFORMATION: 1. Self-Reported Risk, 2. Staff Assessment, 3. Clinical Decision */}
          <div style={styles.separationBox}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#1E293B", textTransform: "uppercase", letterSpacing: 0.4 }}>
              Separate Risk & Clinical Documentation (Self-Report vs. Staff Assessment)
            </div>
            <div style={{ fontSize: 11.5, color: "#475569", marginBottom: 8 }}>
              A client reporting a strong craving or near-use (<em>Nearly Used / Muntik nang Gumamit</em>) without actual substance use is preserved as <strong>Abstinence Maintained (Near-Use/Craving)</strong> and never recorded as drug use. Objective Multi-3 drug test results remain logged separately under Drug Tests.
            </div>

            <div style={styles.grid3}>
              <label style={styles.label}>
                1. Client Self-Reported Status (Schedule Book) *
                <select
                  style={{
                    ...styles.input,
                    borderColor: selfReportedStatus ? "#0D9488" : "#F59E0B",
                    background: selfReportedStatus ? "#F0FDFA" : "#FFFBEB",
                    fontWeight: 600,
                  }}
                  value={selfReportedStatus}
                  disabled={readOnly}
                  onChange={(e) => setSelfReportedStatus(e.target.value)}
                  required
                >
                  <option value="">— Select Client Self-Report —</option>
                  {SELF_REPORTED_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.label}>
                2. Staff Clinical Risk Assessment *
                <select
                  style={{
                    ...styles.input,
                    borderColor: staffRiskAssessment ? "#0D9488" : "#F59E0B",
                    background: staffRiskAssessment ? "#F0FDFA" : "#FFFBEB",
                    fontWeight: 600,
                  }}
                  value={staffRiskAssessment}
                  disabled={readOnly}
                  onChange={(e) => setStaffRiskAssessment(e.target.value)}
                  required
                >
                  <option value="">— Select Staff Risk Assessment —</option>
                  {STAFF_RISK_ASSESSMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.label}>
                3. Staff Milestone Recommendation *
                <select
                  style={{
                    ...styles.input,
                    borderColor: clinicalJudgment ? "#0D9488" : "#F59E0B",
                    background: clinicalJudgment ? "#F0FDFA" : "#FFFBEB",
                    fontWeight: 700,
                  }}
                  value={clinicalJudgment}
                  disabled={readOnly}
                  onChange={(e) => setClinicalJudgment(e.target.value)}
                  required
                >
                  <option value="">— Select Clinical Decision —</option>
                  <option value="ON_TRACK">✅ On Track — Continue Standard Outpatient Regimen</option>
                  <option value="NEEDS_INTENSIFICATION">
                    ⚠️ Needs Intensification — Increase Individual Counseling
                  </option>
                  <option value="RECOMMEND_DISCHARGE">
                    🎓 Recommend for PDC & Graduation (CBT-E 3 Only)
                  </option>
                  <option value="REFER_RESIDENTIAL">
                    🚨 Severe Relapse Risk — Refer for Inpatient / Residential Eval
                  </option>
                </select>
              </label>
            </div>
          </div>

          <label style={styles.label}>
            Evaluator Clinical Synthesis & Remarks (Preserved Verbatim)
            <textarea
              style={{ ...styles.input, minHeight: 75 }}
              placeholder="Enter clinical observations, behavioral progress, and recommendations…"
              value={evaluatorRemarks}
              disabled={readOnly}
              onChange={(e) => setEvaluatorRemarks(e.target.value)}
            />
          </label>

          <div style={styles.footer}>
            <button type="button" style={styles.secondaryBtn} onClick={onClose}>
              {readOnly ? "Close" : "Cancel"}
            </button>
            {!readOnly && (
              <button type="submit" style={styles.primaryBtn} disabled={saving}>
                {saving
                  ? "Saving Evaluation…"
                  : existingEvaluation
                  ? `Update ${evalType.replace("_", "-")} Evaluation`
                  : `Save ${evalType.replace("_", "-")} & Sync Milestone`}
              </button>
            )}
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
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 110,
    padding: 16,
  },
  modal: {
    background: "#fff",
    borderRadius: 12,
    width: 860,
    maxWidth: "96vw",
    maxHeight: "92vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 20px 45px rgba(0,0,0,0.22)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "16px 24px",
    borderBottom: "1px solid #E2E8F0",
    background: "#F8FAFC",
  },
  title: { fontSize: 17, fontWeight: 800, color: "#1A202C" },
  subtitle: { fontSize: 12.5, color: "#718096", marginTop: 2 },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 24,
    cursor: "pointer",
    color: "#718096",
    lineHeight: 1,
  },
  tabBar: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    background: "#EDF2F7",
    padding: 6,
    gap: 6,
    borderBottom: "1px solid #E2E8F0",
  },
  tabBtn: {
    padding: "10px 12px",
    border: "1px solid transparent",
    borderRadius: 8,
    background: "transparent",
    cursor: "pointer",
    textAlign: "left",
    color: "#4A5568",
    transition: "all 0.15s",
  },
  tabBtnActive: {
    background: "#fff",
    color: "#0D9488",
    borderColor: "#CBD5E0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  body: {
    padding: "18px 24px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  error: {
    background: "#FEE2E2",
    color: "#991B1B",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
  },
  metaCard: {
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: 10,
    padding: "12px 14px",
  },
  completionBanner: {
    marginTop: 10,
    paddingTop: 8,
    borderTop: "1px dashed #CBD5E1",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    fontSize: 12.5,
    color: "#0F172A",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 12.5,
    fontWeight: 700,
    color: "#2D3748",
  },
  input: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #CBD5E0",
    fontSize: 13,
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  },
  section: { display: "flex", flexDirection: "column", gap: 10 },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: 800,
    textTransform: "uppercase",
    color: "#1E293B",
    letterSpacing: 0.4,
    background: "#EDF2F7",
    padding: "6px 10px",
    borderRadius: 6,
  },
  questionCard: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #E2E8F0",
    background: "#FFFFFF",
  },
  domainList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 320,
    overflowY: "auto",
    paddingRight: 4,
  },
  domainRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 8,
  },
  scoreBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    border: "1px solid #CBD5E0",
    background: "#fff",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    color: "#4A5568",
  },
  scoreBtnActive: {
    background: "#0D9488",
    color: "#fff",
    borderColor: "#0D9488",
  },
  optionPillBtn: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #CBD5E0",
    background: "#FFFFFF",
    fontSize: 12,
    fontWeight: 600,
    color: "#334155",
    cursor: "pointer",
  },
  optionPillBtnActive: {
    background: "#0D9488",
    color: "#FFFFFF",
    borderColor: "#0D9488",
    fontWeight: 700,
  },
  separationBox: {
    background: "#F0FDF4",
    border: "1px solid #BBF7D0",
    borderRadius: 10,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    paddingTop: 12,
    borderTop: "1px solid #E2E8F0",
  },
  secondaryBtn: {
    padding: "9px 16px",
    borderRadius: 6,
    border: "1px solid #CBD5E0",
    background: "#fff",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },
  primaryBtn: {
    padding: "9px 20px",
    borderRadius: 6,
    border: "none",
    background: "#0D9488",
    color: "#fff",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  },
};
