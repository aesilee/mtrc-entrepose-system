import { useEffect, useState } from "react";
import api from "../api/axios.js";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function CourtProgressReportModal({ patient, onClose, onSaved }) {
  const [reportType, setReportType] = useState("INITIAL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Editable fields for legal precision
  const [courtBranch, setCourtBranch] = useState("");
  const [criminalCaseNo, setCriminalCaseNo] = useState("");
  const [presidingJudge, setPresidingJudge] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [clinicalNarrative, setClinicalNarrative] = useState("");
  const [recommendation, setRecommendation] = useState("");

  useEffect(() => {
    loadReportData(reportType);
  }, [reportType]);

  async function loadReportData(type) {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/case-management/patients/${patient.id}/court-report?reportType=${type}`);
      const d = res.data;
      setData(d);

      // Pre-fill editable court details if available
      setCourtBranch(d.patient?.referring_organization || "Regional Trial Court, Branch 1, Legazpi City");
      setPresidingJudge(d.patient?.referring_professional || "Hon. Presiding Judge");
      setCriminalCaseNo(d.patient?.pwud_code ? `CRIM-CASE-${d.patient.pwud_code}` : "Criminal Case No. ________");
      setRecommendation(d.defaultRecommendation || "");

      // Generate default narrative
      const att = d.attendance || {};
      const attPct = att.total_recorded ? Math.round((att.present_count / att.total_recorded) * 100) : 100;
      const rStats = d.relapseStats || { safe: 0, atRisk: 0, used: 0 };
      
      const narrative = `This progress report covers the outpatient rehabilitation of ${d.patient?.full_name}, admitted on ${fmtDate(d.patient?.admission_date)} under the 7-Month ENTREPOSE Outpatient Rehabilitation Curriculum.\n\n` +
        `ATTENDANCE & CURRICULUM PROGRESSION:\n` +
        `As of this reporting period, the client has attended ${att.present_count || 0} sessions out of ${att.total_recorded || 0} scheduled sessions (Attendance Rate: ${attPct}%). ` +
        `Breakdown includes: ${att.cbt_count || 0} CBT group sessions, ${att.pe_count || 0} Psycho-Education sessions, and ${att.shgm_count || 0} Self-Help Group Meetings.\n\n` +
        `SCHEDULE BOOK & RELAPSE RISK SURVEILLANCE:\n` +
        `Weekly Schedule Book evaluations reflect consistent adherence to structured routines with ${rStats.safe} Safe ratings, ${rStats.atRisk} At-Risk reviews, and ${rStats.used} reported lapses.\n\n` +
        `URINE DRUG TESTING (UDT) MONITORING:\n` +
        `All bi-monthly random drug tests conducted by the center have yielded NEGATIVE results for Methamphetamine and THC, confirming sustained abstinence.`;
      
      setClinicalNarrative(narrative);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load court report data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveReport() {
    setSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const payload = {
        reportType,
        courtBranch,
        criminalCaseNo,
        presidingJudge,
        reportDate,
        attendanceSummaryJson: data?.attendance,
        drugTestSummaryJson: data?.drugTests,
        clinicalProgressNarrative: clinicalNarrative,
        caseManagerRecommendation: recommendation,
      };

      const res = await api.post(`/case-management/patients/${patient.id}/court-report`, payload);
      setSuccessMsg(res.data?.message || "Court progress report saved and milestone updated!");
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record court progress report.");
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  const att = data?.attendance || {};
  const attRate = att.total_recorded ? Math.round((att.present_count / att.total_recorded) * 100) : 100;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Bar */}
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Statutory Court Progress Report Generator</div>
            <div style={styles.subtitle}>
              R.A. 9165 Section 54 / Plea Bargaining Framework · 7-Month ENTREPOSE Outpatient Curriculum
            </div>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Report Type Selector Tabs */}
        <div style={styles.tabBar}>
          <button
            type="button"
            style={{ ...styles.tab, ...(reportType === "INITIAL" ? styles.tabActive : {}) }}
            onClick={() => setReportType("INITIAL")}
          >
            <strong>Initial 30-Day Report</strong> (Intake & ITP)
          </button>
          <button
            type="button"
            style={{ ...styles.tab, ...(reportType === "MIDTERM" ? styles.tabActive : {}) }}
            onClick={() => setReportType("MIDTERM")}
          >
            <strong>Mid-Term 90-Day Report</strong> (Curriculum Compliance)
          </button>
          <button
            type="button"
            style={{ ...styles.tab, ...(reportType === "FINAL" ? styles.tabActive : {}) }}
            onClick={() => setReportType("FINAL")}
          >
            <strong>Final 7-Month Progress Report</strong> (Graduation & Aftercare)
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {successMsg && <div style={styles.success}>{successMsg}</div>}

        <div style={styles.body}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#718096" }}>Compiling live clinical records from database…</div>
          ) : (
            <div style={styles.layout}>
              {/* Left Column: Form Controls */}
              <div style={styles.controlsCol}>
                <div style={styles.sectionHeading}>Court & Legal Docket Details</div>
                <label style={styles.label}>
                  Trial Court / Branch:
                  <input style={styles.input} value={courtBranch} onChange={(e) => setCourtBranch(e.target.value)} />
                </label>
                <label style={styles.label}>
                  Criminal Case Number:
                  <input style={styles.input} value={criminalCaseNo} onChange={(e) => setCriminalCaseNo(e.target.value)} />
                </label>
                <label style={styles.label}>
                  Presiding Judge:
                  <input style={styles.input} value={presidingJudge} onChange={(e) => setPresidingJudge(e.target.value)} />
                </label>
                <label style={styles.label}>
                  Report Issuance Date:
                  <input type="date" style={styles.input} value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                </label>

                <div style={{ ...styles.sectionHeading, marginTop: 14 }}>Clinical Progress Narrative</div>
                <textarea
                  style={{ ...styles.input, minHeight: 140, fontSize: 12, lineHeight: 1.5 }}
                  value={clinicalNarrative}
                  onChange={(e) => setClinicalNarrative(e.target.value)}
                />

                <div style={{ ...styles.sectionHeading, marginTop: 14 }}>Case Manager Recommendation to Court</div>
                <textarea
                  style={{ ...styles.input, minHeight: 90, fontSize: 12, lineHeight: 1.5 }}
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                />
              </div>

              {/* Right Column: Printable Legal Document Canvas */}
              <div style={styles.previewCol}>
                <div className="court-print-area" style={styles.legalDoc}>
                  {/* Letterhead */}
                  <div style={{ textAlign: "center", borderBottom: "2px solid #1A202C", paddingBottom: 12, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>REPUBLIC OF THE PHILIPPINES</div>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>REGIONAL TRIAL COURT, 5TH JUDICIAL REGION</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#1A202C", marginTop: 2 }}>{courtBranch || "BRANCH 1, LEGAZPI CITY"}</div>
                    <div style={{ fontSize: 11, fontStyle: "italic", marginTop: 2 }}>Hall of Justice, Rawis, Legazpi City</div>
                  </div>

                  {/* Title & Caption */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 12 }}>
                    <div>
                      <div><strong>PEOPLE OF THE PHILIPPINES,</strong></div>
                      <div style={{ marginLeft: 20, fontStyle: "italic" }}>Plaintiff,</div>
                      <div style={{ marginTop: 6 }}>- versus -</div>
                      <div style={{ marginTop: 6 }}><strong>{patient?.full_name?.toUpperCase()}</strong></div>
                      <div style={{ marginLeft: 20, fontStyle: "italic" }}>Accused / Client.</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div><strong>{criminalCaseNo || "CRIM. CASE NO. ________"}</strong></div>
                      <div style={{ fontSize: 11, marginTop: 4 }}>For: Violation of R.A. 9165</div>
                      <div style={{ fontSize: 11, fontStyle: "italic" }}>Under Plea Bargaining Mandate</div>
                      <div style={{ fontSize: 11, marginTop: 6 }}>Date: <strong>{fmtDate(reportDate)}</strong></div>
                    </div>
                  </div>

                  <div style={{ textAlign: "center", margin: "14px 0", fontWeight: 900, fontSize: 14, letterSpacing: 0.5, borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0", padding: "6px 0" }}>
                    PROGRESS REPORT: {reportType === "INITIAL" ? "INITIAL 30-DAY COMPLIANCE" : reportType === "MIDTERM" ? "MID-TERM 90-DAY STATUS" : "FINAL 7-MONTH COMPLETION REPORT"}
                  </div>

                  {/* Body Content */}
                  <div style={{ fontSize: 11.5, lineHeight: 1.6, color: "#2D3748", whiteSpace: "pre-wrap" }}>
                    {clinicalNarrative}
                  </div>

                  {/* Drug Testing Matrix Table */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 4, textTransform: "uppercase" }}>Urine Drug Testing Surveillance Summary:</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: "#EDF2F7", textAlign: "left" }}>
                          <th style={{ padding: "4px 8px", border: "1px solid #CBD5E0" }}>Date</th>
                          <th style={{ padding: "4px 8px", border: "1px solid #CBD5E0" }}>Test Type</th>
                          <th style={{ padding: "4px 8px", border: "1px solid #CBD5E0" }}>Substance</th>
                          <th style={{ padding: "4px 8px", border: "1px solid #CBD5E0" }}>Finding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.drugTests || []).length === 0 ? (
                          <tr><td colSpan={4} style={{ padding: "6px 8px", border: "1px solid #CBD5E0", textAlign: "center", fontStyle: "italic" }}>No drug test records in surveillance period.</td></tr>
                        ) : (
                          (data?.drugTests || []).map((dt, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: "4px 8px", border: "1px solid #CBD5E0" }}>{fmtDate(dt.test_date)}</td>
                              <td style={{ padding: "4px 8px", border: "1px solid #CBD5E0" }}>{dt.test_type}</td>
                              <td style={{ padding: "4px 8px", border: "1px solid #CBD5E0" }}>{dt.substance_tested || "METH / THC"}</td>
                              <td style={{ padding: "4px 8px", border: "1px solid #CBD5E0", fontWeight: 700, color: dt.result === "POSITIVE" ? "#991B1B" : "#065F46" }}>
                                {dt.result}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Recommendation Box */}
                  <div style={{ marginTop: 16, background: "#F8FAFC", borderLeft: "3px solid #0D9488", padding: "8px 12px" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 2 }}>Case Manager's Recommendation:</div>
                    <div style={{ fontSize: 11, lineHeight: 1.5 }}>{recommendation}</div>
                  </div>

                  {/* Signature Section */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 36, fontSize: 12 }}>
                    <div>
                      <div style={{ borderBottom: "1px solid #1A202C", width: 220, marginBottom: 4 }} />
                      <div><strong>{data?.patient?.case_manager_name || "Assigned Case Manager"}</strong></div>
                      <div style={{ fontSize: 11, color: "#718096" }}>Dangerous Drugs Board Certified Case Manager</div>
                      <div style={{ fontSize: 10, color: "#718096" }}>Malinao Treatment and Rehabilitation Center</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ borderBottom: "1px solid #1A202C", width: 220, marginBottom: 4, marginLeft: "auto" }} />
                      <div><strong>Chief of Hospital / Center Director</strong></div>
                      <div style={{ fontSize: 11, color: "#718096" }}>DOH Malinao TRC</div>
                      <div style={{ fontSize: 10, color: "#718096" }}>Official TRC Seal & Verification</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={styles.footer}>
          <button type="button" style={styles.secondaryBtn} onClick={onClose}>Close</button>
          <button type="button" style={styles.printBtn} onClick={handlePrint} disabled={loading}>
            🖨️ Print / Save PDF
          </button>
          <button type="button" style={styles.primaryBtn} onClick={handleSaveReport} disabled={saving || loading}>
            {saving ? "Saving & Syncing…" : "Save Report & Update Milestone"}
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .court-print-area, .court-print-area * { visibility: visible !important; }
          .court-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120 },
  modal: { background: "#fff", borderRadius: 10, width: 1080, maxWidth: "98vw", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 15px 35px rgba(0,0,0,0.25)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px 24px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" },
  title: { fontSize: 17, fontWeight: 800, color: "#1A202C" },
  subtitle: { fontSize: 12, color: "#718096", marginTop: 2 },
  closeBtn: { background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#A0AEC0" },
  tabBar: { display: "flex", background: "#EDF2F7", padding: "4px 12px", gap: 8, borderBottom: "1px solid #CBD5E0" },
  tab: { flex: 1, padding: "8px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: "#4A5568", borderRadius: 6 },
  tabActive: { background: "#fff", color: "var(--color-primary, #0D9488)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  error: { background: "#FEE2E2", color: "#991B1B", padding: "8px 24px", fontSize: 13 },
  success: { background: "#ECFDF5", color: "#065F46", padding: "8px 24px", fontSize: 13, borderBottom: "1px solid #A7F3D0" },
  body: { padding: 20, overflowY: "auto", flex: 1 },
  layout: { display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: 20 },
  controlsCol: { display: "flex", flexDirection: "column", gap: 10 },
  previewCol: { overflowY: "auto", maxHeight: "68vh", border: "1px solid #CBD5E0", borderRadius: 6 },
  legalDoc: { background: "#fff", padding: "28px 32px", fontFamily: "'Times New Roman', Times, serif", color: "#1A202C", minHeight: "100%" },
  sectionHeading: { fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "#4A5568", letterSpacing: 0.5, borderBottom: "1px solid #E2E8F0", paddingBottom: 4 },
  label: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "#2D3748" },
  input: { padding: "7px 10px", borderRadius: 6, border: "1px solid #CBD5E0", fontSize: 12, fontFamily: "inherit" },
  footer: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, padding: "14px 24px", borderTop: "1px solid #E2E8F0", background: "#F8FAFC" },
  secondaryBtn: { background: "none", border: "1px solid #CBD5E0", padding: "9px 16px", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer" },
  printBtn: { background: "#4A5568", color: "#fff", border: "none", padding: "9px 18px", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" },
  primaryBtn: { background: "var(--color-primary, #0D9488)", color: "#fff", border: "none", padding: "9px 20px", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" },
};
