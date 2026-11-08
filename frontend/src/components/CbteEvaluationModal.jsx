import { useState } from "react";
import api from "../api/axios.js";

const CBTE_1_DOMAINS = [
  { key: "craving_control", label: "1. Pagkontrol sa Craving / Urges", desc: "Kakayahang labanan ang pagnanais na gumamit muli" },
  { key: "family_relations", label: "2. Relasyon sa Pamilya", desc: "Mabuting pakikitungo at komunikasyon sa tahanan" },
  { key: "physical_health", label: "3. Kalusugang Pisikal at Nutrisyon", desc: "Sapat na tulog, ehersisyo, at maayos na pangangatawan" },
  { key: "financial_mgmt", label: "4. Pamamahala sa Pananalapi", desc: "Responsableng paghawak at pagba-badyet ng pera" },
  { key: "productivity", label: "5. Trabaho / Produktibong Gawain", desc: "May hanapbuhay, nag-aaral, o gumagawa ng gawaing-bahay" },
  { key: "emotional_reg", label: "6. Pagkontrol sa Emosyon at Galit", desc: "Kahinahunan sa harap ng tensyon at problema" },
  { key: "trigger_avoidance", label: "7. Pag-iwas sa Triggers at Barkada", desc: "Hindi pumupunta sa dating tambayan at umiiwas sa bawal" },
  { key: "support_group", label: "8. Pagdalo sa Support Group / SHGM", desc: "Aktibong pakikibahagi sa NA 12-Step o peer support" },
  { key: "spiritual_growth", label: "9. Espiritwal na Paglago", desc: "Pananampalataya at paghahanap ng layunin sa buhay" },
  { key: "legal_compliance", label: "10. Pagsunod sa Batas at Korte", desc: "Pagsunod sa mga kondisyon ng Plea Bargaining / RTC" },
  { key: "honesty", label: "11. Katapatan sa Sarili at Case Manager", desc: "Pagsasabi ng totoo ukol sa nararamdaman at Schedule Book" },
];

const CBTE_2_SKILLS = [
  { key: "identify_hrs", label: "Nakatukoy ng 3+ High-Risk Situations (Lugar, Tao, Emosyon)" },
  { key: "internal_triggers", label: "May kamalayan sa Personal Triggers (Internal: stress, lungkot, pagod)" },
  { key: "refusal_skills", label: "Nakapagpakita ng epektibong Refusal Skills (Pagtanggi sa alok ng droga)" },
  { key: "emergency_network", label: "May aktibong Emergency Contact Network (Sponsor, Family, Case Manager)" },
  { key: "schedule_book_habit", label: "Konsistent at tapat na nagpapakita ng Schedule Book linggo-linggo" },
  { key: "craving_coping", label: "Gumagamit ng 4Ds sa pag-atake ng craving (Delay, Distract, Deep breathe, De-catastrophize)" },
  { key: "abstinence_maintained", label: "Walang naitalang relapse o slip sa nakalipas na mga sesyon" },
];

const CBTE_3_READINESS = [
  { key: "sessions_completed", label: "Nakakumpleto ng sapat na sesyon (Target: 43 Core Sessions)" },
  { key: "negative_drug_screens", label: "Lahat ng random drug test sa nakalipas na buwan ay NEGATIBO" },
  { key: "life_plan_prepared", label: "May kongkretong plano sa hanapbuhay, pamilya, at pamumuhay" },
  { key: "pdc_milestone_ready", label: "Handa na para sa Pre-Discharge Conference (PDC)" },
  { key: "aftercare_contract", label: "Pumirma at nangakong dadalo sa 9-Month Aftercare Program (OP-ACP)" },
];

export default function CbteEvaluationModal({ patient, onClose, onSaved }) {
  const [evalType, setEvalType] = useState("CBTE_1");
  const [evalDate, setEvalDate] = useState(new Date().toISOString().slice(0, 10));
  
  // CBT-E 1 scores (1 to 5)
  const [domainScores, setDomainScores] = useState(() => {
    const init = {};
    CBTE_1_DOMAINS.forEach((d) => { init[d.key] = 3; });
    return init;
  });

  // CBT-E 2 checklist
  const [skillsChecked, setSkillsChecked] = useState(() => {
    const init = {};
    CBTE_2_SKILLS.forEach((s) => { init[s.key] = true; });
    return init;
  });

  // CBT-E 3 readiness & goals
  const [readinessChecked, setReadinessChecked] = useState(() => {
    const init = {};
    CBTE_3_READINESS.forEach((r) => { init[r.key] = true; });
    return init;
  });
  const [lifeGoals, setLifeGoals] = useState("");

  const [clinicalJudgment, setClinicalJudgment] = useState("ON_TRACK");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Calculate CBT-E 1 average score
  const avgScore = (
    Object.values(domainScores).reduce((a, b) => a + Number(b), 0) / CBTE_1_DOMAINS.length
  ).toFixed(2);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        evaluationType: evalType,
        evaluationDate: evalDate,
        recoveryDomainsJson: evalType === "CBTE_1" ? domainScores : null,
        copingSkillsJson: evalType === "CBTE_2" ? skillsChecked : evalType === "CBTE_3" ? readinessChecked : null,
        lifeGoalsText: evalType === "CBTE_3" ? lifeGoals : null,
        overallScore: evalType === "CBTE_1" ? Number(avgScore) : null,
        clinicalJudgment,
        evaluatorRemarks: remarks,
      };

      await api.post(`/case-management/patients/${patient.id}/cbte-evaluations`, payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save CBT-E evaluation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>CBT Clinical Evaluation Form (CBT-E)</div>
            <div style={styles.subtitle}>
              Client: <strong>{patient.full_name}</strong> ({patient.patient_code || patient.pwud_code}) · 7-Month Curriculum Milestone
            </div>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Tab Selector */}
        <div style={styles.typeTabs}>
          <button
            type="button"
            style={{ ...styles.typeTab, ...(evalType === "CBTE_1" ? styles.typeTabActive : {}) }}
            onClick={() => setEvalType("CBTE_1")}
          >
            <strong>CBT-E 1</strong> (Week 5: Recovery Status)
          </button>
          <button
            type="button"
            style={{ ...styles.typeTab, ...(evalType === "CBTE_2" ? styles.typeTabActive : {}) }}
            onClick={() => setEvalType("CBTE_2")}
          >
            <strong>CBT-E 2</strong> (Week 13: Relapse Prevention)
          </button>
          <button
            type="button"
            style={{ ...styles.typeTab, ...(evalType === "CBTE_3" ? styles.typeTabActive : {}) }}
            onClick={() => setEvalType("CBTE_3")}
          >
            <strong>CBT-E 3</strong> (Month 6–7: Continuing Recovery)
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.body}>
          <div style={styles.metaRow}>
            <label style={styles.label}>
              Evaluation Date:
              <input
                type="date"
                style={styles.input}
                value={evalDate}
                onChange={(e) => setEvalDate(e.target.value)}
                required
              />
            </label>
            <div style={{ flex: 1 }} />
            {evalType === "CBTE_1" && (
              <div style={styles.scoreBadge}>
                Average Domain Rating: <strong>{avgScore} / 5.0</strong>
              </div>
            )}
          </div>

          {/* Form Variant: CBT-E 1 (11 Domains Likert) */}
          {evalType === "CBTE_1" && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                11-Domain Recovery Status Evaluation (ENTREPOSE Vol. 2A pp. 219–228)
              </div>
              <div style={styles.sectionDesc}>
                Rate the client's stability in each area from 1 (Severe Difficulty) to 5 (Fully Stable / Proficient).
              </div>

              <div style={styles.domainsList}>
                {CBTE_1_DOMAINS.map((d) => (
                  <div key={d.key} style={styles.domainRow}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.domainName}>{d.label}</div>
                      <div style={styles.domainDesc}>{d.desc}</div>
                    </div>
                    <div style={styles.likertGroup}>
                      {[1, 2, 3, 4, 5].map((val) => (
                        <label
                          key={val}
                          style={{
                            ...styles.likertLabel,
                            background: domainScores[d.key] === val ? "var(--color-primary)" : "#F7FAFC",
                            color: domainScores[d.key] === val ? "#fff" : "inherit",
                          }}
                        >
                          <input
                            type="radio"
                            name={`domain_${d.key}`}
                            value={val}
                            checked={domainScores[d.key] === val}
                            onChange={() => setDomainScores((prev) => ({ ...prev, [d.key]: val }))}
                            style={{ display: "none" }}
                          />
                          {val}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Variant: CBT-E 2 (Relapse Prevention Skills Checklist) */}
          {evalType === "CBTE_2" && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                Relapse Prevention Competency Checklist (ENTREPOSE Vol. 2A pp. 229–236)
              </div>
              <div style={styles.sectionDesc}>
                Verify behavioral competencies demonstrated by the client during Mid-Treatment review (Week 13).
              </div>

              <div style={styles.checklist}>
                {CBTE_2_SKILLS.map((s) => (
                  <label key={s.key} style={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={!!skillsChecked[s.key]}
                      onChange={(e) => setSkillsChecked((prev) => ({ ...prev, [s.key]: e.target.checked }))}
                    />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Form Variant: CBT-E 3 (Continuing Care & Aftercare Readiness) */}
          {evalType === "CBTE_3" && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                Discharge & Aftercare Readiness Review (ENTREPOSE Vol. 2A pp. 237–244)
              </div>
              <div style={styles.sectionDesc}>
                Assessing readiness for Pre-Discharge Conference (PDC) and enrollment into 9-Month OP-ACP.
              </div>

              <div style={styles.checklist}>
                {CBTE_3_READINESS.map((r) => (
                  <label key={r.key} style={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={!!readinessChecked[r.key]}
                      onChange={(e) => setReadinessChecked((prev) => ({ ...prev, [r.key]: e.target.checked }))}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</span>
                  </label>
                ))}
              </div>

              <label style={{ ...styles.label, marginTop: 14 }}>
                Continuing Recovery & Long-Term Life Goals:
                <textarea
                  style={{ ...styles.input, minHeight: 80 }}
                  placeholder="Specify client's 3-month, 6-month, and 1-year recovery and employment goals..."
                  value={lifeGoals}
                  onChange={(e) => setLifeGoals(e.target.value)}
                />
              </label>
            </div>
          )}

          {/* Clinical Judgment & Summary */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Case Manager Clinical Recommendation</div>
            <div style={styles.judgmentRow}>
              <label style={styles.label}>
                Clinical Decision:
                <select
                  style={{ ...styles.input, fontWeight: 700 }}
                  value={clinicalJudgment}
                  onChange={(e) => setClinicalJudgment(e.target.value)}
                >
                  <option value="ON_TRACK">✅ On Track (Satisfactory recovery progress)</option>
                  <option value="NEEDS_INTENSIFICATION">⚠️ Needs Intensification (Additional 1-on-1 counseling)</option>
                  <option value="RECOMMEND_DISCHARGE">🎓 Discharge Ready (Ready for PDC & graduation)</option>
                  <option value="REFER_RESIDENTIAL">🚨 Severe Risk (Recommend Residential Re-evaluation)</option>
                </select>
              </label>
            </div>

            <label style={{ ...styles.label, marginTop: 10 }}>
              Evaluator Remarks & Recommendations:
              <textarea
                style={{ ...styles.input, minHeight: 70 }}
                placeholder="Clinical observations, Schedule Book consistency, and next follow-up steps..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </label>
          </div>

          <div style={styles.footer}>
            <button type="button" style={styles.secondaryBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={styles.primaryBtn} disabled={saving}>
              {saving ? "Saving Evaluation…" : `Save ${evalType} Evaluation`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120 },
  modal: { background: "var(--color-surface, #fff)", borderRadius: 10, width: 740, maxWidth: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px 22px", borderBottom: "1px solid var(--color-border, #E2E8F0)", background: "#F8FAFC" },
  title: { fontSize: 17, fontWeight: 800, color: "#1A202C" },
  subtitle: { fontSize: 12, color: "#718096", marginTop: 2 },
  closeBtn: { background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#A0AEC0" },
  typeTabs: { display: "flex", background: "#EDF2F7", padding: "4px 8px", gap: 6, borderBottom: "1px solid #CBD5E0" },
  typeTab: { flex: 1, padding: "8px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: "#4A5568", borderRadius: 6 },
  typeTabActive: { background: "#fff", color: "var(--color-primary, #0D9488)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  error: { background: "#FEE2E2", color: "#991B1B", padding: "8px 20px", fontSize: 13 },
  body: { padding: "18px 22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 },
  metaRow: { display: "flex", alignItems: "center", gap: 14 },
  label: { display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "#2D3748" },
  input: { padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-border, #CBD5E0)", fontSize: 13, fontFamily: "inherit" },
  scoreBadge: { background: "#ECFDF5", border: "1px solid #A7F3D0", color: "#065F46", padding: "6px 14px", borderRadius: 999, fontSize: 13 },
  section: { background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14 },
  sectionTitle: { fontSize: 13, fontWeight: 800, color: "#2D3748" },
  sectionDesc: { fontSize: 11, color: "#718096", marginBottom: 12, marginTop: 2 },
  domainsList: { display: "flex", flexDirection: "column", gap: 8 },
  domainRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: "#fff", borderRadius: 6, border: "1px solid #EDF2F7", gap: 12 },
  domainName: { fontSize: 12, fontWeight: 700, color: "#2D3748" },
  domainDesc: { fontSize: 11, color: "#718096" },
  likertGroup: { display: "flex", gap: 4 },
  likertLabel: { width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 700, border: "1px solid #CBD5E0" },
  checklist: { display: "flex", flexDirection: "column", gap: 8 },
  checkRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#fff", borderRadius: 6, border: "1px solid #EDF2F7", cursor: "pointer" },
  judgmentRow: { marginTop: 6 },
  footer: { display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 10, borderTop: "1px solid #E2E8F0" },
  secondaryBtn: { background: "none", border: "1px solid #CBD5E0", padding: "9px 16px", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer" },
  primaryBtn: { background: "var(--color-primary, #0D9488)", color: "#fff", border: "none", padding: "9px 20px", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" },
};
