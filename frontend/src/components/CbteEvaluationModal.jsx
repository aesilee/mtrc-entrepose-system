import { useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

// ==============================================================================
// AUTHENTIC CLINICAL CONTENT: ENTREPOSE SERIES VOL. 2A
// Patient's Workbook for Cognitive Behavioral Therapy Sessions (March 2024, 2nd Ed.)
// Strictly Outpatient · Pages 219–232 (CBT-E Sessions 1, 2, and 3)
// ==============================================================================

// ------------------------------------------------------------------------------
// CBT-E SESSION 1: RECOVERY STATUS REVIEW (Pagsusuri ng Katayuan ng Paggaling)
// Vol. 2A, Pages 221–223
// ------------------------------------------------------------------------------
export const CBTE_1_LIFE_AREAS = [
  {
    key: "career",
    label: "1. Career / Trabaho",
    desc: "Work, employment, livelihood, or daily professional productivity",
  },
  {
    key: "friends",
    label: "2. Friends / Mga Kaibigan",
    desc: "Friendships, peer relationships, and social support network",
  },
  {
    key: "family",
    label: "3. Family / Pamilya",
    desc: "Family harmony, open communication, and home stability",
  },
  {
    key: "romantic_relationships",
    label: "4. Romantic relationships / Romantikong Relasyon",
    desc: "Spouse, partner, and intimate relationship dynamics",
  },
  {
    key: "drug_use_cravings",
    label: "5. Drug use/cravings / Paggamit ng Droga at Giyang",
    desc: "Urge management, craving control, and maintaining substance abstinence",
  },
  {
    key: "alcohol_use_cravings",
    label: "6. Alcohol use/cravings / Paggamit ng Alak at Giyang",
    desc: "Abstaining from alcohol and avoiding cross-substance triggers",
  },
  {
    key: "self_esteem",
    label: "7. Self-esteem / Pagpapahalaga sa Sarili",
    desc: "Personal dignity, self-confidence, and positive self-worth",
  },
  {
    key: "physical_health",
    label: "8. Physical health / Kalusugang Pisikal",
    desc: "Sleep hygiene, nutrition, exercise, medical checkups, and physical recovery",
  },
  {
    key: "psychological_wellbeing",
    label: "9. Psychological well-being / Sikolohikal na Kagalingan",
    desc: "Emotional regulation, stress reduction, and mental health stability",
  },
  {
    key: "sexual_fulfillment",
    label: "10. Sexual fulfillment / Sekswal na Kasiyahan",
    desc: "Healthy intimate boundaries and emotional fulfillment without substances",
  },
  {
    key: "spiritual_wellbeing",
    label: "11. Spiritual well-being / Espirituwal na Kagalingan",
    desc: "Inner peace, higher purpose, moral values, and spiritual strength",
  },
];

export const CBTE_1_RATING_LABELS = {
  1: "1 — Very Dissatisfied (Lubhang Hindi Nasisiyahan)",
  2: "2 — Somewhat Dissatisfied (Medyo Hindi Nasisiyahan)",
  3: "3 — Neutral (Katamtaman / Neutral)",
  4: "4 — Somewhat Satisfied (Medyo Nasisiyahan)",
  5: "5 — Very Satisfied (Lubhang Nasisiyahan)",
};

export const CBTE_1_STAGE_OPTIONS = [
  { value: "WITHDRAWAL", label: "Withdrawal Stage (Unang 1–2 Linggo / Pag-aadjust ng Katawan)" },
  { value: "HONEYMOON", label: "Honeymoon Stage (Pakiramdam na Wala Nang Problema / Overconfidence)" },
  { value: "THE_WALL", label: "Ang Pader / The Wall (Pagkabagot, Lungkot, at Malakas na Tukso)" },
  { value: "ADJUSTMENT", label: "Pag-aangkop / Readjustment (Pagbuo ng Bagong Rutina at Pamumuhay)" },
  { value: "RESOLUTION", label: "Resolusyon / Resolution (Matatag na Abstinence at Personal na Paglago)" },
];

export const CBTE_1_CRAVING_OPTIONS = [
  { value: "NONE", label: "Wala (None — No cravings experienced in past month)" },
  { value: "RARE", label: "Bihira (Rare — Once or twice, easily managed without urge)" },
  { value: "SOMETIMES", label: "Paminsan-minsan (Sometimes — Occasional urges requiring coping)" },
  { value: "OFTEN", label: "Madalas (Often — Frequent urges requiring active support)" },
  { value: "DAILY", label: "Araw-araw (Daily — Persistent strong cravings experienced)" },
];

// ------------------------------------------------------------------------------
// CBT-E SESSION 2: ANALYZING BEHAVIORS FOR RELAPSE PREVENTION
// (Pagsusuri sa mga Pag-uugali para sa Pag-iwas sa Relapse)
// Vol. 2A, Pages 225–227
// ------------------------------------------------------------------------------
export const CBTE_2_ACTIVITIES = [
  {
    key: "schedule_activities_daily",
    label: "Schedule activities daily",
    tagalog: "Mag-iskedyul ng mga gawain araw-araw upang maayos ang oras",
  },
  {
    key: "visit_physician",
    label: "Visit the physician for a checkup",
    tagalog: "Bumisita sa manggagamot / doktor para sa regular na pagsusuri ng kalusugan",
  },
  {
    key: "destroy_paraphernalia",
    label: "Destroy all drug paraphernalia",
    tagalog: "Sirain at itapon ang lahat ng kagamitan o gamit sa paggamit ng droga",
  },
  {
    key: "avoid_alcohol_users",
    label: "Avoid people who use alcohol",
    tagalog: "Iwasan ang mga taong umiinom ng alak o nag-aanyayang uminom",
  },
  {
    key: "avoid_drug_users",
    label: "Avoid people who use drugs",
    tagalog: "Iwasan ang mga taong gumagamit ng droga o dating barkada sa bisyo",
  },
  {
    key: "avoid_bars_clubs",
    label: "Avoid bars and clubs",
    tagalog: "Iwasan ang mga bar, club, at mga lugar na may alak o droga",
  },
  {
    key: "stop_alcohol",
    label: "Stop using alcohol",
    tagalog: "Itigil nang tuluyan ang pag-inom ng anumang alak",
  },
  {
    key: "stop_all_drugs",
    label: "Stop using all drugs",
    tagalog: "Itigil nang tuluyan ang paggamit ng lahat ng ipinagbabawal na gamot",
  },
  {
    key: "pay_financial_obligations",
    label: "Pay financial obligations promptly",
    tagalog: "Bayaran ang mga pinansyal na obligasyon at mga utang sa tamang oras",
  },
  {
    key: "identify_addictive_behaviors",
    label: "Identify addictive behaviors",
    tagalog: "Kilalanin ang mga gawi at pag-uugali na nagtutulak sa muling paggamit",
  },
  {
    key: "avoid_triggers",
    label: "Avoid triggers (when possible)",
    tagalog: "Iwasan ang mga trigger (tao, lugar, bagay, oras, damdamin) kung maaari",
  },
  {
    key: "thought_stopping",
    label: "Use thought-stopping techniques for cravings",
    tagalog: "Gamitin ang thought-stopping techniques (visualization, snapping, relaxation) kapag may giyang",
  },
  {
    key: "attend_aftercare",
    label: "Attend aftercare programs",
    tagalog: "Dumalo sa mga aftercare program (SIBOL / OP-ACP) pagkatapos ng outpatient treatment",
  },
  {
    key: "attend_self_help",
    label: "Attend self-help meetings",
    tagalog: "Dumalo sa mga regular na pagpupulong ng Narcotics Anonymous (NA) o Self-Help Groups",
  },
  {
    key: "exercise_daily",
    label: "Exercise daily",
    tagalog: "Mag-ehersisyo araw-araw para sa pisikal na kalakasan at pagpapabuti ng mood",
  },
  {
    key: "discuss_honestly_counselor",
    label: "Discuss thoughts, feelings, and behaviors honestly with your counselor",
    tagalog: "Maging tapat at bukas sa pagbabahagi ng kaisipan, damdamin, at gawi sa iyong counselor",
  },
];

export const CBTE_2_RELAPSE_CATEGORIES = [
  { key: "career_events", label: "Career events", tagalog: "Mga kaganapan sa trabaho, hanapbuhay, o kabuhayan" },
  { key: "personal_events", label: "Personal events", tagalog: "Mga personal o pampamilyang kaganapan at relasyon" },
  { key: "treatment_events", label: "Treatment events", tagalog: "Mga kaganapan kaugnay ng paggamot, sesyon, o pagdalo" },
  { key: "drug_related_behaviors", label: "Drug-related behaviors", tagalog: "Mga gawi kaugnay ng droga (pagpunta sa dating lugar, pagkontak)" },
  { key: "behavioral_patterns", label: "Behavioral patterns", tagalog: "Mga gawi sa araw-araw (pagliban sa gawain, pagpupuyat, pag-iisa)" },
  { key: "relapse_thoughts", label: "Relapse thoughts", tagalog: "Mga kaisipan ng paggamit o pagbibigay-katwiran sa muling paggamit" },
  { key: "health_status", label: "Health status", tagalog: "Kalagayang pangkalusugan (pagkakasakit, labis na pagod, stress, gutom)" },
];

// ------------------------------------------------------------------------------
// CBT-E SESSION 3: CONTINUING TREATMENT PLANNING
// (Pagpapatuloy ng Treatment Planning)
// Vol. 2A, Pages 229–232
// ------------------------------------------------------------------------------
export const CBTE_3_GOAL_AREAS = [
  { key: "family", label: "1. Family / Pamilya", desc: "Family relationships, home environment, parental/spousal roles" },
  { key: "work_career", label: "2. Work/Career / Trabaho", desc: "Employment, livelihood, career development, or business" },
  { key: "friendships", label: "3. Friendships / Pakikipagkaibigan", desc: "Sober friendships, positive peer connections, boundary setting" },
  { key: "financial_legal", label: "4. Financial, legal obligations / Pinansyal at Legal", desc: "Debts, budgeting, savings, court appearances, legal compliance" },
  { key: "education", label: "5. Education / Edukasyon", desc: "Vocational skills, schooling, certifications, or formal studies" },
  { key: "exercise", label: "6. Exercise / Ehersisyo", desc: "Physical fitness, sports, recreation, and health maintenance" },
  { key: "leisure", label: "7. Leisure activities / Libangan", desc: "Substance-free hobbies, relaxation, and healthy recreation" },
  { key: "self_help", label: "8. Self-help meetings / Mga Pagpupulong ng Self-Help", desc: "Narcotics Anonymous (NA) or 12-Step group participation" },
];

// ------------------------------------------------------------------------------
// SEPARATE CLINICAL STATUS & ASSESSMENT OPTIONS
// ------------------------------------------------------------------------------
export const SELF_REPORTED_STATUS_OPTIONS = [
  {
    value: "SAFE",
    label: "🟢 Safe / Abstinent (No cravings or high-risk exposure reported)",
  },
  {
    value: "AT_RISK",
    label: "🟡 At Risk (Exposed to triggers or high-risk situations — did NOT use substances)",
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

export const STAFF_RISK_ASSESSMENT_OPTIONS = [
  { value: "LOW_RISK", label: "Low Risk — Stable Recovery & Coping" },
  { value: "MODERATE_RISK", label: "Moderate Risk — Monitor Triggers & Reinforce Coping" },
  { value: "HIGH_RISK", label: "High Risk — Intensify Clinical Support & Follow-up" },
  { value: "ACUTE_RELAPSE_RISK", label: "Acute Relapse Risk — Immediate Clinical Intervention" },
];

export const CLINICAL_JUDGMENT_OPTIONS = [
  { value: "ON_TRACK", label: "✅ On Track — Continue Standard Outpatient Regimen" },
  { value: "NEEDS_INTENSIFICATION", label: "⚠️ Needs Intensification — Increase Individual Counseling" },
  { value: "RECOMMEND_DISCHARGE", label: "🎓 Recommend for PDC & Graduation (CBT-E 3 Only)" },
  { value: "REFER_RESIDENTIAL", label: "🚨 Severe Relapse Risk — Refer for Inpatient / Residential Evaluation" },
];

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

  // 1. Client Self-Reported Urge / Relapse Status
  const [selfReportedStatus, setSelfReportedStatus] = useState(
    existingEvaluation?.self_reported_status || ""
  );
  // 2. Staff Clinical Risk Assessment
  const [staffRiskAssessment, setStaffRiskAssessment] = useState(
    existingEvaluation?.staff_risk_assessment || ""
  );
  // 3. Staff Clinical Evaluation Decision
  const [clinicalJudgment, setClinicalJudgment] = useState(
    existingEvaluation?.clinical_judgment || ""
  );
  // Evaluator Remarks
  const [evaluatorRemarks, setEvaluatorRemarks] = useState(
    existingEvaluation?.evaluator_remarks || ""
  );

  // ----------------------------------------------------------------------------
  // CBT-E 1 STATE (Recovery Status Review)
  // ----------------------------------------------------------------------------
  const [cbte1Source, setCbte1Source] = useState({
    abstinence_duration: existingWs.abstinence_duration || "",
    recovery_stage: existingWs.recovery_stage || "",
    craving_frequency: existingWs.craving_frequency || "",
    most_improved_area: existingWs.most_improved_area || existingWs.life_changes_reflection || "",
    weakest_areas_plan: existingWs.weakest_areas_plan || existingWs.current_challenges || "",
    self_review_commitment: existingWs.self_review_commitment || "",
  });

  const [domainRatings, setDomainRatings] = useState(() => {
    const base = {};
    CBTE_1_LIFE_AREAS.forEach((a) => {
      base[a.key] = null;
    });
    const sourceMap = existingDomains || existingWs.domain_ratings;
    if (sourceMap && typeof sourceMap === "object") {
      CBTE_1_LIFE_AREAS.forEach((a) => {
        if (sourceMap[a.key] != null) base[a.key] = Number(sourceMap[a.key]);
      });
    }
    return base;
  });

  // ----------------------------------------------------------------------------
  // CBT-E 2 STATE (Analyzing Behaviors for Relapse Prevention)
  // ----------------------------------------------------------------------------
  const [activitiesChecklist, setActivitiesChecklist] = useState(() => {
    const base = {};
    CBTE_2_ACTIVITIES.forEach((act) => {
      base[act.key] = null; // null = unanswered, "NO_DIFFICULTY" | "HAS_DIFFICULTY"
    });
    const sourceSkills = existingWs.skills_checklist || existingWs.skills_responses || existingSkills;
    if (sourceSkills && typeof sourceSkills === "object") {
      CBTE_2_ACTIVITIES.forEach((act) => {
        const val = sourceSkills[act.key];
        if (val === "NO_DIFFICULTY" || val === "HAS_DIFFICULTY") {
          base[act.key] = val;
        } else if (val === "PRACTICED_CONSISTENTLY" || val === true) {
          base[act.key] = "NO_DIFFICULTY";
        } else if (val === "NOT_YET_PRACTICED" || val === false || val === "PRACTICED_SOMETIMES") {
          base[act.key] = "HAS_DIFFICULTY";
        }
      });
    }
    return base;
  });

  const [cbte2Source, setCbte2Source] = useState({
    difficulty_reasons: existingWs.difficulty_reasons || existingWs.situations_needing_caution || "",
    regular_review_benefits: existingWs.regular_review_benefits || existingWs.effective_coping_strategies || "",
    relapse_chart_benefits: existingWs.relapse_chart_benefits || "",
  });

  const [relapseChart, setRelapseChart] = useState(() => {
    const base = {};
    CBTE_2_RELAPSE_CATEGORIES.forEach((cat) => {
      base[cat.key] = {
        events: existingWs.relapse_chart?.[cat.key]?.events || "",
        feelings: existingWs.relapse_chart?.[cat.key]?.feelings || "",
      };
    });
    return base;
  });

  // ----------------------------------------------------------------------------
  // CBT-E 3 STATE (Continuing Treatment Planning)
  // ----------------------------------------------------------------------------
  const [goalsMatrix, setGoalsMatrix] = useState(() => {
    const base = {};
    CBTE_3_GOAL_AREAS.forEach((area) => {
      base[area.key] = {
        current_status: existingWs.goals_matrix?.[area.key]?.current_status || "",
        target_goal: existingWs.goals_matrix?.[area.key]?.target_goal || "",
        steps: existingWs.goals_matrix?.[area.key]?.steps || "",
        timeline: existingWs.goals_matrix?.[area.key]?.timeline || "",
      };
    });
    return base;
  });

  const [cbte3Source, setCbte3Source] = useState({
    barriers: existingWs.barriers || "",
    transformation: existingWs.transformation || "",
    aftercare_motivation: existingWs.aftercare_motivation || "",
    trc_helpful_feedback: existingWs.trc_helpful_feedback || "",
    na_contact_person: existingWs.na_contact_person || "",
    na_phone_number: existingWs.na_phone_number || "",
    na_physical_location: existingWs.na_physical_location || "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Calculate answered items
  function getCompletionStats() {
    if (evalType === "CBTE_1") {
      const sourceCount =
        (cbte1Source.abstinence_duration.trim() ? 1 : 0) +
        (cbte1Source.recovery_stage ? 1 : 0) +
        (cbte1Source.craving_frequency ? 1 : 0) +
        (cbte1Source.most_improved_area.trim() ? 1 : 0) +
        (cbte1Source.weakest_areas_plan.trim() ? 1 : 0) +
        (cbte1Source.self_review_commitment.trim() ? 1 : 0);
      const ratingsAnswered = Object.values(domainRatings).filter((v) => v !== null).length;
      return {
        answered: sourceCount + ratingsAnswered,
        total: 6 + CBTE_1_LIFE_AREAS.length,
        ratingsAnswered,
        ratingsTotal: CBTE_1_LIFE_AREAS.length,
      };
    }
    if (evalType === "CBTE_2") {
      const activitiesAnswered = Object.values(activitiesChecklist).filter((v) => v !== null).length;
      const reflAnswered =
        (cbte2Source.difficulty_reasons.trim() ? 1 : 0) +
        (cbte2Source.regular_review_benefits.trim() ? 1 : 0);
      return {
        answered: activitiesAnswered + reflAnswered,
        total: CBTE_2_ACTIVITIES.length + 2,
        activitiesAnswered,
        activitiesTotal: CBTE_2_ACTIVITIES.length,
      };
    }
    // CBT-E 3
    const matrixAnswered = Object.values(goalsMatrix).filter(
      (m) => m.target_goal.trim() || m.steps.trim()
    ).length;
    const reflectionsAnswered =
      (cbte3Source.barriers.trim() ? 1 : 0) +
      (cbte3Source.transformation.trim() ? 1 : 0) +
      (cbte3Source.trc_helpful_feedback.trim() ? 1 : 0);
    return {
      answered: matrixAnswered + reflectionsAnswered,
      total: CBTE_3_GOAL_AREAS.length + 3,
      matrixAnswered,
      matrixTotal: CBTE_3_GOAL_AREAS.length,
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
      setError("Please record the client's self-reported craving / relapse risk status before saving.");
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
        setError("Please answer the recovery continuity questions (Abstinence Duration, Recovery Stage, Craving Frequency).");
        return;
      }
      const unansweredRatings = CBTE_1_LIFE_AREAS.filter((a) => domainRatings[a.key] === null);
      if (unansweredRatings.length > 0) {
        setError(`Please complete the 11 Life Areas Satisfaction Rating (${unansweredRatings.length} area(s) unanswered).`);
        return;
      }
      if (!cbte1Source.most_improved_area.trim() || !cbte1Source.weakest_areas_plan.trim()) {
        setError("Please document the qualitative reflection on the most improved and weakest life areas.");
        return;
      }
    } else if (evalType === "CBTE_2") {
      const unansweredActs = CBTE_2_ACTIVITIES.filter((a) => activitiesChecklist[a.key] === null);
      if (unansweredActs.length > 0) {
        setError(`Please evaluate all 16 Relapse Prevention Activities (${unansweredActs.length} item(s) unanswered).`);
        return;
      }
      if (!cbte2Source.difficulty_reasons.trim()) {
        setError("Please answer why certain relapse prevention activities are difficult and what needs to change.");
        return;
      }
    } else if (evalType === "CBTE_3") {
      const filledAreas = Object.values(goalsMatrix).filter(
        (m) => m.target_goal.trim() && m.steps.trim()
      ).length;
      if (filledAreas < 4) {
        setError("Please complete at least 4 life areas in the Continuing Treatment Goals Matrix (Target Goal & Action Steps).");
        return;
      }
      if (!cbte3Source.transformation.trim()) {
        setError("Please document how the client is a different person now compared to when they started treatment.");
        return;
      }
    }

    setSaving(true);
    try {
      const worksheetResponsesJson =
        evalType === "CBTE_1"
          ? {
              worksheet_title: "Sesyon 1. Pagsusuri ng Katayuan ng Paggaling (Recovery Status Review)",
              source_standard: "ENTREPOSE Series Vol. 2A (Pages 221–223)",
              ...cbte1Source,
              domain_ratings: domainRatings,
            }
          : evalType === "CBTE_2"
          ? {
              worksheet_title: "Sesyon 2. Pagsusuri sa mga Pag-uugali para sa Pag-iwas sa Relapse",
              source_standard: "ENTREPOSE Series Vol. 2A (Pages 225–227)",
              skills_checklist: activitiesChecklist,
              ...cbte2Source,
              relapse_chart: relapseChart,
            }
          : {
              worksheet_title: "Sesyon 3. Pagpapatuloy ng Treatment Planning (Continuing Treatment Planning)",
              source_standard: "ENTREPOSE Series Vol. 2A (Pages 229–232)",
              goals_matrix: goalsMatrix,
              ...cbte3Source,
            };

      const lifeGoalsSummary =
        evalType === "CBTE_3"
          ? Object.entries(goalsMatrix)
              .filter(([_, data]) => data.target_goal.trim())
              .map(([key, data]) => {
                const areaInfo = CBTE_3_GOAL_AREAS.find((a) => a.key === key);
                return `${areaInfo?.label || key}: Goal: ${data.target_goal} | Steps: ${data.steps} | When: ${data.timeline || "Ongoing"}`;
              })
              .join("\n")
          : null;

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
        recoveryDomainsJson: evalType === "CBTE_1" ? domainRatings : null,
        copingSkillsJson:
          evalType === "CBTE_2"
            ? activitiesChecklist
            : evalType === "CBTE_3"
            ? goalsMatrix
            : null,
        lifeGoalsText: lifeGoalsSummary,
        overallScore: null, // Qualitative tool: no manufactured composite score
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
        {/* Header with Warm Botanical Green Theme */}
        <div style={styles.header}>
          <div>
            <div style={styles.title}>
              {readOnly
                ? "CBT-E Clinical Evaluation Record (ENTREPOSE Vol. 2A)"
                : existingEvaluation
                ? "Update CBT-E Clinical Evaluation"
                : "CBT-E Clinical Evaluation (ENTREPOSE Vol. 2A Source Forms)"}
            </div>
            <div style={styles.subtitle}>
              Client: <strong>{patient?.full_name}</strong> · Authentic Outpatient Workbook Tools (Vol. 2A Pages 219–232)
            </div>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>

        {/* Evaluation Type Tabs */}
        <div style={styles.tabBar}>
          {[
            {
              key: "CBTE_1",
              title: "CBT-E 1 (Sesyon 1 · Week 5)",
              desc: "Recovery Status Review (Pagsusuri ng Katayuan ng Paggaling)",
            },
            {
              key: "CBTE_2",
              title: "CBT-E 2 (Sesyon 2 · Week 13)",
              desc: "Relapse Prevention Behaviors (Pag-uugali para sa Pag-iwas sa Relapse)",
            },
            {
              key: "CBTE_3",
              title: "CBT-E 3 (Sesyon 3 · Month 6–7)",
              desc: "Continuing Treatment Planning (Pagpapatuloy ng Treatment Planning)",
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
              <div style={{ fontSize: 11, opacity: 0.9 }}>{tab.desc}</div>
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
                  placeholder="Case Manager / Authorized Clinician"
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
                    Supplied ENTREPOSE Vol. 2A Source Worksheets
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
                  Local Adaptation Reference / Clinical Note
                  <input
                    type="text"
                    style={styles.input}
                    value={adaptationNotes}
                    disabled={readOnly}
                    onChange={(e) => setAdaptationNotes(e.target.value)}
                    placeholder="Clinical justification for adaptation"
                  />
                </label>
              </div>
            )}

            <div style={styles.completionBanner}>
              <div>
                <strong>Worksheet Completion Status:</strong> {completionStats.answered} of{" "}
                {completionStats.total} required items answered
              </div>
              <div style={{ fontSize: 11.5, color: "#2A6A45", fontWeight: 600 }}>
                🌿 Qualitative worksheet responses preserved verbatim. No unvalidated composite score is generated.
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* CBT-E 1: SESYON 1. PAGSUSURI NG KATAYUAN NG PAGGALING              */}
          {/* ================================================================= */}
          {evalType === "CBTE_1" && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionBadge}>CBT-E 1 · Week 5</span>
                <span>Sesyon 1. Pagsusuri ng Katayuan ng Paggaling (Recovery Status Review)</span>
              </div>

              {/* Continuity Recovery Status Questions */}
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  A. Katayuan sa Abstinence at Yugto ng Paggaling (Clinical Recovery Baseline)
                </div>

                <div style={styles.grid3}>
                  <label style={styles.label}>
                    <span>
                      <strong>Gaano katagal ka nang hindi gumagamit ng droga at alak? *</strong>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
                        Continuous abstinence reported by client
                      </div>
                    </span>
                    <input
                      type="text"
                      style={styles.input}
                      value={cbte1Source.abstinence_duration}
                      disabled={readOnly}
                      onChange={(e) =>
                        setCbte1Source((prev) => ({ ...prev, abstinence_duration: e.target.value }))
                      }
                      placeholder="e.g., 5 linggo / 35 araw na abstinent"
                      required
                    />
                  </label>

                  <label style={styles.label}>
                    <span>
                      <strong>Daan Tungo sa Paggaling: Saang yugto ka naroroon? *</strong>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
                        Stage on the Road to Recovery (Workbook Sesyon 7)
                      </div>
                    </span>
                    <select
                      style={{
                        ...styles.input,
                        borderColor: cbte1Source.recovery_stage ? "#2A6A45" : "#CBD5E1",
                        background: cbte1Source.recovery_stage ? "#F4FAF5" : "#FFF",
                        fontWeight: 600,
                      }}
                      value={cbte1Source.recovery_stage}
                      disabled={readOnly}
                      onChange={(e) =>
                        setCbte1Source((prev) => ({ ...prev, recovery_stage: e.target.value }))
                      }
                      required
                    >
                      <option value="">— Pumili ng Yugto / Select Stage —</option>
                      {CBTE_1_STAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={styles.label}>
                    <span>
                      <strong>Dalas ng Giyang (Craving) sa nakalipas na buwan *</strong>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
                        Frequency of cravings or urges in past month
                      </div>
                    </span>
                    <select
                      style={{
                        ...styles.input,
                        borderColor: cbte1Source.craving_frequency ? "#2A6A45" : "#CBD5E1",
                        background: cbte1Source.craving_frequency ? "#F4FAF5" : "#FFF",
                        fontWeight: 600,
                      }}
                      value={cbte1Source.craving_frequency}
                      disabled={readOnly}
                      onChange={(e) =>
                        setCbte1Source((prev) => ({ ...prev, craving_frequency: e.target.value }))
                      }
                      required
                    >
                      <option value="">— Pumili ng Dalas / Select Frequency —</option>
                      {CBTE_1_CRAVING_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* Part I: 11 Life Areas Satisfaction Rating (Vol. 2A Page 222) */}
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  B. 11 Life Areas Satisfaction Rating (Rate 1 to 5 · Vol. 2A Page 222)
                </div>
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>
                  Rate how satisfied the client is with each of the following 11 life areas as of now:{" "}
                  <strong>1 = Very Dissatisfied</strong>, <strong>2 = Somewhat Dissatisfied</strong>,{" "}
                  <strong>3 = Neutral</strong>, <strong>4 = Somewhat Satisfied</strong>,{" "}
                  <strong>5 = Very Satisfied</strong>.
                </div>

                <div style={styles.itemsList}>
                  {CBTE_1_LIFE_AREAS.map((area) => {
                    const currentRating = domainRatings[area.key];
                    return (
                      <div
                        key={area.key}
                        style={{
                          ...styles.itemRow,
                          borderColor: currentRating === null ? "#F59E0B" : "#D5E5D6",
                          background: currentRating === null ? "#FFFBEB" : "#FFFFFF",
                        }}
                      >
                        <div style={{ flex: 1, paddingRight: 12 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#1B432C" }}>
                            {area.label}
                          </div>
                          <div style={{ fontSize: 11.5, color: "#64748B" }}>{area.desc}</div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {currentRating === null ? (
                            <span style={{ fontSize: 11, color: "#B45309", fontWeight: 700, marginRight: 4 }}>
                              Unanswered
                            </span>
                          ) : (
                            <span style={{ fontSize: 11.5, color: "#2A6A45", fontWeight: 700, marginRight: 6 }}>
                              {CBTE_1_RATING_LABELS[currentRating]?.split(" (")[0]}
                            </span>
                          )}

                          {[1, 2, 3, 4, 5].map((score) => (
                            <button
                              key={score}
                              type="button"
                              disabled={readOnly}
                              onClick={() =>
                                setDomainRatings((prev) => ({ ...prev, [area.key]: score }))
                              }
                              title={CBTE_1_RATING_LABELS[score]}
                              style={{
                                ...styles.scoreBtn,
                                ...(currentRating === score ? styles.scoreBtnActive : {}),
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

              {/* Part II: Vol. 2A Reflection Questions */}
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  C. Pagsusuri at Mga Plano sa Pagbabago (Vol. 2A Pages 222–223 Reflections)
                </div>

                <div style={styles.grid2}>
                  <label style={styles.label}>
                    <span>
                      <strong>1. Alin sa mga larangang ito ang pinaka-bumuti mula nang pumasok ka sa paggamot? *</strong>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
                        Which of these areas has improved the most since you entered treatment?
                      </div>
                    </span>
                    <textarea
                      style={{ ...styles.input, minHeight: 70 }}
                      value={cbte1Source.most_improved_area}
                      disabled={readOnly}
                      onChange={(e) =>
                        setCbte1Source((prev) => ({ ...prev, most_improved_area: e.target.value }))
                      }
                      placeholder="Ilarawan ang aspetong may pinakamalaking pagbuti (kalusugan, pamilya, tiwala sa sarili)…"
                      required
                    />
                  </label>

                  <label style={styles.label}>
                    <span>
                      <strong>2. Alin ang iyong pinakamahinang larangan? Paano mo ito planong pagbutihin? *</strong>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
                        Which are your weakest areas? How are you planning to improve them? How will you change yourself?
                      </div>
                    </span>
                    <textarea
                      style={{ ...styles.input, minHeight: 70 }}
                      value={cbte1Source.weakest_areas_plan}
                      disabled={readOnly}
                      onChange={(e) =>
                        setCbte1Source((prev) => ({ ...prev, weakest_areas_plan: e.target.value }))
                      }
                      placeholder="Ilarawan ang mga larangang kailangan pang palakasin at kongkretong hakbang upang baguhin ang sarili…"
                      required
                    />
                  </label>
                </div>

                <label style={{ ...styles.label, marginTop: 10 }}>
                  <span>
                    <strong>3. Magsasagawa ka ba ng regular na pagsusuri ng katayuan sa paggaling pagkatapos ng programa? *</strong>
                    <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
                      Will you conduct the self-review of your recovery status regularly after completing treatment? What will be the benefits?
                    </div>
                  </span>
                  <textarea
                    style={{ ...styles.input, minHeight: 60 }}
                    value={cbte1Source.self_review_commitment}
                    disabled={readOnly}
                    onChange={(e) =>
                      setCbte1Source((prev) => ({ ...prev, self_review_commitment: e.target.value }))
                    }
                    placeholder="Pahayag ng kliyente sa paninindigan sa buwanang self-review at mga kapakinabangan nito sa pag-iwas sa relapse…"
                  />
                </label>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* CBT-E 2: SESYON 2. PAGSUSURI SA MGA PAG-UUGALI PARA SA PAG-IWAS SA RELAPSE */}
          {/* ================================================================= */}
          {evalType === "CBTE_2" && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionBadge}>CBT-E 2 · Week 13</span>
                <span>Sesyon 2. Pagsusuri sa mga Pag-uugali para sa Pag-iwas sa Relapse</span>
              </div>

              {/* Part I: 16 Relapse Prevention Activities Checklist (Vol. 2A Page 226) */}
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  A. 16 Relapse Prevention Activities Checklist (Vol. 2A Page 226)
                </div>
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 10 }}>
                  Which things in the list below does the client have difficulties in doing regularly or adequately?
                  Mark each item as <strong>Doing Adequately</strong> or <strong>Has Difficulty / Needs Attention</strong>.
                </div>

                <div style={styles.itemsList}>
                  {CBTE_2_ACTIVITIES.map((act) => {
                    const currentStatus = activitiesChecklist[act.key];
                    return (
                      <div
                        key={act.key}
                        style={{
                          ...styles.itemRow,
                          borderColor: currentStatus === null ? "#F59E0B" : "#D5E5D6",
                          background: currentStatus === null ? "#FFFBEB" : "#FFFFFF",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <div style={{ flex: "1 1 340px" }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#1B432C" }}>
                            {act.label}
                          </div>
                          <div style={{ fontSize: 11.5, color: "#64748B" }}>{act.tagalog}</div>
                        </div>

                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {currentStatus === null && (
                            <span style={{ fontSize: 11, color: "#B45309", fontWeight: 700, marginRight: 4 }}>
                              Unanswered
                            </span>
                          )}

                          <button
                            type="button"
                            disabled={readOnly}
                            onClick={() =>
                              setActivitiesChecklist((prev) => ({ ...prev, [act.key]: "NO_DIFFICULTY" }))
                            }
                            style={{
                              ...styles.optionPillBtn,
                              ...(currentStatus === "NO_DIFFICULTY" ? styles.optionPillBtnSuccess : {}),
                            }}
                          >
                            ✓ Walang Hirap (Doing Adequately)
                          </button>

                          <button
                            type="button"
                            disabled={readOnly}
                            onClick={() =>
                              setActivitiesChecklist((prev) => ({ ...prev, [act.key]: "HAS_DIFFICULTY" }))
                            }
                            style={{
                              ...styles.optionPillBtn,
                              ...(currentStatus === "HAS_DIFFICULTY" ? styles.optionPillBtnWarning : {}),
                            }}
                          >
                            ⚠️ May Hirap (Has Difficulty)
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ ...styles.grid2, marginTop: 12 }}>
                  <label style={styles.label}>
                    <span>
                      <strong>Bakit ito mahirap? Ano ang kailangang magbago upang masimulan ang mga ito? *</strong>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
                        Why are they difficult? What might need to change for you to begin those things?
                      </div>
                    </span>
                    <textarea
                      style={{ ...styles.input, minHeight: 72 }}
                      value={cbte2Source.difficulty_reasons}
                      disabled={readOnly}
                      onChange={(e) =>
                        setCbte2Source((prev) => ({ ...prev, difficulty_reasons: e.target.value }))
                      }
                      placeholder="Ilarawan ang mga balakid at mga pagbabagong kailangan upang magawa ang mga gawain…"
                      required
                    />
                  </label>

                  <label style={styles.label}>
                    <span>
                      <strong>Magagawa mo bang regular na suriin ang iyong mga gawain sa pag-iwas sa relapse?</strong>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
                        Will you be able to review your relapse prevention activities regularly? What are the benefits?
                      </div>
                    </span>
                    <textarea
                      style={{ ...styles.input, minHeight: 72 }}
                      value={cbte2Source.regular_review_benefits}
                      disabled={readOnly}
                      onChange={(e) =>
                        setCbte2Source((prev) => ({ ...prev, regular_review_benefits: e.target.value }))
                      }
                      placeholder="Mga kapakinabangan ng regular na pagsusuri sa pagpapanatili ng abstinence…"
                    />
                  </label>
                </div>
              </div>

              {/* Part II: Relapse Analysis Chart (Vol. 2A Page 227) */}
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  B. Relapse Analysis Chart: Pagsusuri sa Konteksto ng Relapse o Muntikang Paggamit (Vol. 2A Page 227)
                </div>
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 10 }}>
                  Recall the events that occurred during the week immediately before the relapse (or high-risk craving episode)
                  and feelings at that time across the 7 life categories:
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {CBTE_2_RELAPSE_CATEGORIES.map((cat) => (
                    <div key={cat.key} style={styles.tableRowCard}>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: "#1B432C", marginBottom: 4 }}>
                        {cat.label} ({cat.tagalog})
                      </div>
                      <div style={styles.grid2}>
                        <input
                          type="text"
                          style={styles.input}
                          disabled={readOnly}
                          value={relapseChart[cat.key]?.events || ""}
                          onChange={(e) =>
                            setRelapseChart((prev) => ({
                              ...prev,
                              [cat.key]: { ...prev[cat.key], events: e.target.value },
                            }))
                          }
                          placeholder="Events during the week immediately before (Mga kaganapan bago ang insidente)…"
                        />
                        <input
                          type="text"
                          style={styles.input}
                          disabled={readOnly}
                          value={relapseChart[cat.key]?.feelings || ""}
                          onChange={(e) =>
                            setRelapseChart((prev) => ({
                              ...prev,
                              [cat.key]: { ...prev[cat.key], feelings: e.target.value },
                            }))
                          }
                          placeholder="Your feelings about the event at that time (Naramdaman noong panahong iyon)…"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <label style={{ ...styles.label, marginTop: 12 }}>
                  <span>
                    <strong>Magagawa mo bang sagutan ang Relapse Analysis Chart kung makaranas ka ng relapse?</strong>
                    <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
                      Will you be able to fill the Relapse Analysis Chart if you experience a relapse? What are the benefits of doing so?
                    </div>
                  </span>
                  <textarea
                    style={{ ...styles.input, minHeight: 55 }}
                    value={cbte2Source.relapse_chart_benefits}
                    disabled={readOnly}
                    onChange={(e) =>
                      setCbte2Source((prev) => ({ ...prev, relapse_chart_benefits: e.target.value }))
                    }
                    placeholder="Pahayag ng kliyente sa kahalagahan ng pag-aaral sa pattern ng relapse upang mapigilan ang pag-ulit nito…"
                  />
                </label>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* CBT-E 3: SESYON 3. PAGPAPATULOY NG TREATMENT PLANNING              */}
          {/* ================================================================= */}
          {evalType === "CBTE_3" && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionBadge}>CBT-E 3 · Month 6–7</span>
                <span>Sesyon 3. Pagpapatuloy ng Treatment Planning (Continuing Treatment Planning)</span>
              </div>

              {/* Part I: Continuing Treatment Goals Matrix (Vol. 2A Pages 229–230) */}
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  A. Continuing Treatment Goals Matrix across 8 Life Areas (Vol. 2A Pages 229–230)
                </div>
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>
                  Set concrete continuing treatment goals and action steps for each area of life after outpatient graduation:
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {CBTE_3_GOAL_AREAS.map((area) => (
                    <div key={area.key} style={styles.tableRowCard}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: "#1B432C" }}>
                        {area.label}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748B", marginBottom: 6 }}>{area.desc}</div>

                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1.6fr 0.8fr", gap: 8 }}>
                        <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11, fontWeight: 700, color: "#475569" }}>
                          Nasaan ka ngayon? (Current Status)
                          <input
                            type="text"
                            style={styles.inputSmall}
                            disabled={readOnly}
                            value={goalsMatrix[area.key]?.current_status || ""}
                            onChange={(e) =>
                              setGoalsMatrix((prev) => ({
                                ...prev,
                                [area.key]: { ...prev[area.key], current_status: e.target.value },
                              }))
                            }
                            placeholder="Current status…"
                          />
                        </label>

                        <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11, fontWeight: 700, color: "#475569" }}>
                          Saan nais makarating? (Target Goal)
                          <input
                            type="text"
                            style={styles.inputSmall}
                            disabled={readOnly}
                            value={goalsMatrix[area.key]?.target_goal || ""}
                            onChange={(e) =>
                              setGoalsMatrix((prev) => ({
                                ...prev,
                                [area.key]: { ...prev[area.key], target_goal: e.target.value },
                              }))
                            }
                            placeholder="Desired goal…"
                          />
                        </label>

                        <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11, fontWeight: 700, color: "#475569" }}>
                          Anong hakbang ang gagawin? (Steps Needed)
                          <input
                            type="text"
                            style={styles.inputSmall}
                            disabled={readOnly}
                            value={goalsMatrix[area.key]?.steps || ""}
                            onChange={(e) =>
                              setGoalsMatrix((prev) => ({
                                ...prev,
                                [area.key]: { ...prev[area.key], steps: e.target.value },
                              }))
                            }
                            placeholder="Action steps…"
                          />
                        </label>

                        <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11, fontWeight: 700, color: "#475569" }}>
                          Kailan? (When)
                          <input
                            type="text"
                            style={styles.inputSmall}
                            disabled={readOnly}
                            value={goalsMatrix[area.key]?.timeline || ""}
                            onChange={(e) =>
                              setGoalsMatrix((prev) => ({
                                ...prev,
                                [area.key]: { ...prev[area.key], timeline: e.target.value },
                              }))
                            }
                            placeholder="e.g., Buwan 1 / Agad"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Part II: Continuing Recovery & Program Reflections (Vol. 2A Pages 230–232) */}
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  B. Pagninilay sa Paggaling at Suporta sa Komunidad (Vol. 2A Pages 230–232 Reflections)
                </div>

                <div style={styles.grid2}>
                  <label style={styles.label}>
                    <span>
                      <strong>1. May kakaharapin ka bang mga balakid upang makamit ang mga layunin? Ano ang mga iyon?</strong>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
                        Will you face barriers to achieve those goals? What are those?
                      </div>
                    </span>
                    <textarea
                      style={{ ...styles.input, minHeight: 68 }}
                      value={cbte3Source.barriers}
                      disabled={readOnly}
                      onChange={(e) =>
                        setCbte3Source((prev) => ({ ...prev, barriers: e.target.value }))
                      }
                      placeholder="Ilista ang posibleng balakid (stress, kakulangan sa pondo, tukso) at solusyon…"
                    />
                  </label>

                  <label style={styles.label}>
                    <span>
                      <strong>2. Paano ka naging ibang tao ngayon kumpara noong nagsimula ka sa programa? *</strong>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
                        How are you a different person now than you were when you started the treatment program?
                      </div>
                    </span>
                    <textarea
                      style={{ ...styles.input, minHeight: 68 }}
                      value={cbte3Source.transformation}
                      disabled={readOnly}
                      onChange={(e) =>
                        setCbte3Source((prev) => ({ ...prev, transformation: e.target.value }))
                      }
                      placeholder="Pagbabago sa pag-iisip, pagpapahalaga, relasyon sa pamilya, at pamumuhay…"
                      required
                    />
                  </label>
                </div>

                <div style={{ ...styles.grid2, marginTop: 10 }}>
                  <label style={styles.label}>
                    <span>
                      <strong>3. Ipagpapatuloy mo ba ang pagdalo sa mga programa (Aftercare / NA)? Paano mo mamomotivate ang sarili?</strong>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
                        Will you continue to attend programs for your recovery? How can you motivate yourself to do so?
                      </div>
                    </span>
                    <textarea
                      style={{ ...styles.input, minHeight: 68 }}
                      value={cbte3Source.aftercare_motivation}
                      disabled={readOnly}
                      onChange={(e) =>
                        setCbte3Source((prev) => ({ ...prev, aftercare_motivation: e.target.value }))
                      }
                      placeholder="Plano sa paglahok sa 18-Month Aftercare Program at regular na NA meetings…"
                    />
                  </label>

                  <label style={styles.label}>
                    <span>
                      <strong>4. Anong aspeto ng paggamot sa TRC ang pinakamakatulong? May mga bahagi ba na hindi nakatulong?</strong>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
                        What aspects of treatment in the TRC have been most helpful? Were there parts that haven't been helpful?
                      </div>
                    </span>
                    <textarea
                      style={{ ...styles.input, minHeight: 68 }}
                      value={cbte3Source.trc_helpful_feedback}
                      disabled={readOnly}
                      onChange={(e) =>
                        setCbte3Source((prev) => ({ ...prev, trc_helpful_feedback: e.target.value }))
                      }
                      placeholder="Pagsusuri sa mga naging pinakamabisang sesyon, modyul, o suporta ng staff…"
                    />
                  </label>
                </div>

                {/* NA / Self-Help Group Details */}
                <div style={{ marginTop: 12, padding: "10px 12px", background: "#F4FAF5", border: "1px solid #D5E5D6", borderRadius: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1B432C", marginBottom: 6 }}>
                    Ugnayan sa Narcotics Anonymous (NA) / Self-Help Group Malapit sa Tirahan (Vol. 2A Homework Page 232)
                  </div>
                  <div style={styles.grid3}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11.5, fontWeight: 600, color: "#334155" }}>
                      Contact Person
                      <input
                        type="text"
                        style={styles.inputSmall}
                        disabled={readOnly}
                        value={cbte3Source.na_contact_person}
                        onChange={(e) =>
                          setCbte3Source((prev) => ({ ...prev, na_contact_person: e.target.value }))
                        }
                        placeholder="Pangalan ng Sponsor / Contact"
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11.5, fontWeight: 600, color: "#334155" }}>
                      Phone Number
                      <input
                        type="text"
                        style={styles.inputSmall}
                        disabled={readOnly}
                        value={cbte3Source.na_phone_number}
                        onChange={(e) =>
                          setCbte3Source((prev) => ({ ...prev, na_phone_number: e.target.value }))
                        }
                        placeholder="Numero ng Telepono"
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11.5, fontWeight: 600, color: "#334155" }}>
                      Physical Location / Meeting Venue
                      <input
                        type="text"
                        style={styles.inputSmall}
                        disabled={readOnly}
                        value={cbte3Source.na_physical_location}
                        onChange={(e) =>
                          setCbte3Source((prev) => ({ ...prev, na_physical_location: e.target.value }))
                        }
                        placeholder="Lugar o Barangay ng NA meeting"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SEPARATE CLINICAL STATUS & ASSESSMENT: 1. Self-Report, 2. Staff Risk, 3. Clinical Judgment */}
          {/* ================================================================= */}
          <div style={styles.separationBox}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: "#1B432C", textTransform: "uppercase", letterSpacing: 0.4 }}>
              Hiwalay na Pagtatala ng Relapse Risk at Klinikal na Desisyon (Self-Report vs. Staff Assessment)
            </div>
            <div style={{ fontSize: 11.5, color: "#3D5A45", marginBottom: 8, lineHeight: 1.4 }}>
              Ang kliyenteng nag-ulat ng matinding giyang o muntikang paggamit (<em>Nearly Used / Strong Craving</em>) nang hindi
              aktwal na gumamit ng droga ay iniingatan bilang <strong>Abstinence Maintained (Near-Use/Craving)</strong> at kailanman ay
              hindi itatala bilang paggamit ng droga. Ang obhetibong resulta ng laboratory Multi-3 drug test ay nakatala nang hiwalay sa talaan ng Drug Tests.
            </div>

            <div style={styles.grid3}>
              <label style={styles.label}>
                1. Client Self-Reported Urge / Relapse Status *
                <select
                  style={{
                    ...styles.input,
                    borderColor: selfReportedStatus ? "#2A6A45" : "#F59E0B",
                    background: selfReportedStatus ? "#F4FAF5" : "#FFFBEB",
                    fontWeight: 700,
                  }}
                  value={selfReportedStatus}
                  disabled={readOnly}
                  onChange={(e) => setSelfReportedStatus(e.target.value)}
                  required
                >
                  <option value="">— Pumili ng Ulat ng Kliyente —</option>
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
                    borderColor: staffRiskAssessment ? "#2A6A45" : "#F59E0B",
                    background: staffRiskAssessment ? "#F4FAF5" : "#FFFBEB",
                    fontWeight: 700,
                  }}
                  value={staffRiskAssessment}
                  disabled={readOnly}
                  onChange={(e) => setStaffRiskAssessment(e.target.value)}
                  required
                >
                  <option value="">— Pumili ng Pagsusuri ng Staff —</option>
                  {STAFF_RISK_ASSESSMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.label}>
                3. Staff Clinical Milestone Recommendation *
                <select
                  style={{
                    ...styles.input,
                    borderColor: clinicalJudgment ? "#2A6A45" : "#F59E0B",
                    background: clinicalJudgment ? "#F4FAF5" : "#FFFBEB",
                    fontWeight: 700,
                  }}
                  value={clinicalJudgment}
                  disabled={readOnly}
                  onChange={(e) => setClinicalJudgment(e.target.value)}
                  required
                >
                  <option value="">— Pumili ng Klinikal na Desisyon —</option>
                  {CLINICAL_JUDGMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <label style={styles.label}>
            Evaluator Clinical Synthesis & Remarks (Preserved Verbatim)
            <textarea
              style={{ ...styles.input, minHeight: 70 }}
              placeholder="Clinical synthesis, client progress, specific recommendations, and aftercare follow-up instructions…"
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
    background: "rgba(15, 30, 20, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 110,
    padding: 16,
  },
  modal: {
    background: "#FFFFFF",
    borderRadius: 12,
    width: 900,
    maxWidth: "96vw",
    maxHeight: "92vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 20px 45px rgba(27, 67, 44, 0.25)",
    border: "1px solid #D5E5D6",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "16px 24px",
    borderBottom: "1px solid #D5E5D6",
    background: "#F4FAF5",
  },
  title: { fontSize: 17, fontWeight: 800, color: "#1B432C" },
  subtitle: { fontSize: 12.5, color: "#4A6E55", marginTop: 2 },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 26,
    cursor: "pointer",
    color: "#52755D",
    lineHeight: 1,
  },
  tabBar: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    background: "#E8F4E8",
    padding: 6,
    gap: 6,
    borderBottom: "1px solid #D5E5D6",
  },
  tabBtn: {
    padding: "10px 12px",
    border: "1px solid transparent",
    borderRadius: 8,
    background: "transparent",
    cursor: "pointer",
    textAlign: "left",
    color: "#375540",
    transition: "all 0.15s",
  },
  tabBtnActive: {
    background: "#FFFFFF",
    color: "#1B432C",
    borderColor: "#A8DCB4",
    boxShadow: "0 2px 6px rgba(27, 67, 44, 0.08)",
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
    border: "1px solid #FCA5A5",
  },
  metaCard: {
    background: "#F9FCFA",
    border: "1px solid #D5E5D6",
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
    color: "#1B432C",
  },
  section: { display: "flex", flexDirection: "column", gap: 12 },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    fontWeight: 800,
    color: "#1B432C",
    background: "#E8F4E8",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #C8E6C9",
  },
  sectionBadge: {
    background: "#2A6A45",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: 800,
    padding: "2px 8px",
    borderRadius: 999,
  },
  card: {
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  cardHeader: {
    fontSize: 12.5,
    fontWeight: 800,
    color: "#1B432C",
    borderBottom: "1px solid #EBF2EC",
    paddingBottom: 6,
  },
  itemsList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 340,
    overflowY: "auto",
    paddingRight: 4,
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    transition: "border-color 0.15s",
  },
  tableRowCard: {
    padding: "10px 12px",
    background: "#F9FCFA",
    border: "1px solid #D5E5D6",
    borderRadius: 8,
  },
  scoreBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    border: "1px solid #CBD5E0",
    background: "#FFFFFF",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    color: "#334155",
    transition: "all 0.15s",
  },
  scoreBtnActive: {
    background: "#2A6A45",
    color: "#FFFFFF",
    borderColor: "#2A6A45",
    boxShadow: "0 2px 4px rgba(42, 106, 69, 0.25)",
  },
  optionPillBtn: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #CBD5E0",
    background: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: 600,
    color: "#334155",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  optionPillBtnSuccess: {
    background: "#2A6A45",
    color: "#FFFFFF",
    borderColor: "#2A6A45",
    fontWeight: 700,
  },
  optionPillBtnWarning: {
    background: "#B45309",
    color: "#FFFFFF",
    borderColor: "#B45309",
    fontWeight: 700,
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 12.5,
    fontWeight: 700,
    color: "#1B432C",
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
  inputSmall: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #CBD5E0",
    fontSize: 12,
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  },
  separationBox: {
    background: "#F4FAF5",
    border: "1.5px solid #A8DCB4",
    borderRadius: 10,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    paddingTop: 12,
    borderTop: "1px solid #D5E5D6",
  },
  secondaryBtn: {
    padding: "9px 16px",
    borderRadius: 6,
    border: "1px solid #CBD5E0",
    background: "#FFFFFF",
    fontWeight: 600,
    fontSize: 13,
    color: "#334155",
    cursor: "pointer",
  },
  primaryBtn: {
    padding: "9px 20px",
    borderRadius: 6,
    border: "none",
    background: "#2A6A45",
    color: "#FFFFFF",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(42, 106, 69, 0.2)",
  },
};
