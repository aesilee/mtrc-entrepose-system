import React, { useState, useEffect } from "react";
import api from "../api/axios.js";

export default function StatutoryCertificateModal({ patient, initialType = "ENROLLMENT", reprintRecord = null, onClose, onIssued }) {
  const [certType, setCertType] = useState(reprintRecord?.certificate_type || initialType);
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generatedPayload, setGeneratedPayload] = useState(reprintRecord ? {
    controlNo: reprintRecord.certificate_control_no,
    type: reprintRecord.certificate_type,
    issuedDate: reprintRecord.issued_date,
    patientName: patient?.full_name || "—",
    pwudCode: patient?.pwud_code || patient?.patient_code || "—",
    admissionDate: patient?.admission_date,
    caseManager: patient?.assigned_case_manager_name || "Assigned Case Manager",
    issuerName: reprintRecord.issued_by_name || "Authorized Staff",
    remarks: reprintRecord.remarks || ""
  } : null);

  useEffect(() => {
    if (reprintRecord || !patient?.id) return;
    setLoading(true);
    setGeneratedPayload(null);
    setError("");
    api.get(`/certificates/${patient.id}/eligibility`)
      .then(res => setEligibility(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [patient?.id, certType, reprintRecord]);

  const currentEligibility = eligibility ? (certType === "ENROLLMENT" ? eligibility.enrollment : eligibility.completion) : null;
  const isEligible = currentEligibility?.eligible;
  const reasons = currentEligibility?.reasons || (currentEligibility?.reason ? [currentEligibility.reason] : []);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      const res = await api.post(`/certificates/${patient.id}/generate`, {
        certificateType: certType,
        remarks: "Issued via Patient Profile.",
        pleaBargainNote: certType === "COMPLETION" ? "In compliance with court mandate." : ""
      });
      if (res.data.success) {
        setGeneratedPayload(res.data.payload);
        if (onIssued) onIssued();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate certificate.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>
            Issue Certificate — {patient?.full_name} ({patient?.pwud_code || patient?.patient_code})
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={styles.body}>
          {!generatedPayload ? (
            <div>
              <div style={styles.typeSelector}>
                <button 
                  type="button" 
                  style={{ ...styles.typeTab, ...(certType === "ENROLLMENT" ? styles.typeTabActive : {}) }}
                  onClick={() => setCertType("ENROLLMENT")}
                >
                  Certificate of Enrollment
                </button>
                <button 
                  type="button" 
                  style={{ ...styles.typeTab, ...(certType === "COMPLETION" ? styles.typeTabActive : {}) }}
                  onClick={() => setCertType("COMPLETION")}
                >
                  Certificate of Completion
                </button>
              </div>

              {loading ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#666' }}>Checking eligibility requirements...</div>
              ) : (
                <>
                  {!isEligible && (
                    <div style={styles.warningBanner}>
                      <strong>Ineligible for {certType === "ENROLLMENT" ? "Enrollment" : "Completion"} Certificate:</strong>
                      <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                        {reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}

                  {isEligible && (
                    <div style={styles.eligibleNotice}>
                      Client meets all statutory requirements to receive a <strong>Certificate of {certType}</strong>.
                    </div>
                  )}

                  {error && <div style={{ color: 'red', marginBottom: 15 }}>{error}</div>}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                    <button type="button" style={styles.cancelBtn} onClick={onClose}>Cancel</button>
                    <button 
                      type="button" 
                      style={styles.generateBtn} 
                      onClick={handleGenerate} 
                      disabled={!isEligible || generating}
                    >
                      {generating ? "Generating..." : `Generate & Issue Certificate`}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div>
              <div className="no-print" style={styles.successBar}>
                <span>✅ Certificate issued successfully! Control No: <strong>{generatedPayload.controlNo}</strong></span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" style={styles.printBtn} onClick={() => window.print()}>🖨️ Print / Save PDF</button>
                  <button type="button" style={styles.cancelBtn} onClick={onClose}>Done</button>
                </div>
              </div>

              <div className="print-area" style={styles.certificateCanvas}>
                <div style={styles.certHeader}>
                  <h3 style={{ margin: 0 }}>REPUBLIC OF THE PHILIPPINES</h3>
                  <h4 style={{ margin: '5px 0' }}>DEPARTMENT OF HEALTH</h4>
                  <h2 style={{ color: 'darkgreen', margin: '10px 0' }}>MALINAO TREATMENT AND REHABILITATION CENTER</h2>
                  <p style={{ margin: 0, fontSize: 13 }}>Malinao, Albay</p>
                </div>

                <h1 style={styles.certTitle}>CERTIFICATE OF {generatedPayload.type}</h1>
                <p style={{ textAlign: 'right', fontWeight: 'bold', margin: '0 0 20px', fontSize: 13 }}>Control No: {generatedPayload.controlNo}</p>
                
                <div style={styles.certBody}>
                  <p>This is to certify that <strong>{generatedPayload.patientName.toUpperCase()}</strong>, 
                  bearing the PWUD Code <strong>{generatedPayload.pwudCode}</strong>, 
                  has {generatedPayload.type === "ENROLLMENT" ? "officially enrolled in" : "successfully completed"} the 
                  ENTREPOSE Outpatient Program at this facility.</p>

                  <p><strong>Date of Admission:</strong> {new Date(generatedPayload.admissionDate).toLocaleDateString()}</p>
                  {generatedPayload.type === "COMPLETION" && (
                    <p><strong>Date of Completion:</strong> {new Date(generatedPayload.issuedDate).toLocaleDateString()}</p>
                  )}
                  
                  <p>This certification is issued on <strong>{new Date(generatedPayload.issuedDate).toLocaleDateString()}</strong> upon the request of the interested party for whatever legal purpose it may serve.</p>
                </div>

                <div style={styles.certSignatories}>
                  <div style={styles.sigBlock}>
                    <div style={styles.sigLine}>{generatedPayload.issuerName}</div>
                    <div style={styles.sigTitle}>{generatedPayload.type === "ENROLLMENT" ? "Admitting Officer" : "Case Manager"}</div>
                  </div>
                  <div style={styles.sigBlock}>
                    <div style={styles.sigLine}>Dr. Center Chief</div>
                    <div style={styles.sigTitle}>Chief of Hospital</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important;
            margin: 0 !important; padding: 30px !important;
            box-shadow: none !important; border: 2px solid black !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "white", borderRadius: 12, width: 850, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #eee" },
  title: { fontSize: 16, fontWeight: 700, color: "#333" },
  closeBtn: { background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#666" },
  body: { padding: 24, overflowY: "auto", flex: 1 },
  typeSelector: { display: "flex", gap: 10, marginBottom: 20, borderBottom: "1px solid #eee", paddingBottom: 10 },
  typeTab: { padding: "8px 16px", border: "1px solid #ddd", background: "#f8f9fa", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 },
  typeTabActive: { background: "var(--color-primary, #217346)", color: "white", borderColor: "var(--color-primary, #217346)" },
  warningBanner: { background: "#ffebee", color: "#c62828", padding: 16, borderRadius: 6, border: "1px solid #ef9a9a", fontSize: 13, marginBottom: 20 },
  eligibleNotice: { background: "#e8f5e9", color: "#2e7d32", padding: 16, borderRadius: 6, border: "1px solid #c8e6c9", fontSize: 13, marginBottom: 20 },
  cancelBtn: { padding: "8px 16px", border: "1px solid #ccc", background: "white", borderRadius: 6, cursor: "pointer", fontWeight: 600 },
  generateBtn: { padding: "8px 20px", background: "var(--color-primary, #217346)", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 },
  successBar: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#e8f5e9", padding: "12px 18px", borderRadius: 6, marginBottom: 20 },
  printBtn: { padding: "8px 16px", background: "#333", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 },
  certificateCanvas: { background: 'white', padding: '40px 60px', margin: '0 auto', border: '8px double #2e7d32', borderRadius: 4, fontFamily: 'serif' },
  certHeader: { textAlign: 'center', marginBottom: 25 },
  certTitle: { textAlign: 'center', fontSize: 26, letterSpacing: 2, textDecoration: 'underline', margin: '15px 0 20px' },
  certBody: { fontSize: 16, lineHeight: '1.8', textAlign: 'justify', marginBottom: 40 },
  certSignatories: { display: 'flex', justifyContent: 'space-between', marginTop: 50 },
  sigBlock: { textAlign: 'center', width: 220 },
  sigLine: { borderBottom: '1px solid black', fontWeight: 'bold', fontSize: 16, marginBottom: 5, paddingBottom: 4 },
  sigTitle: { fontSize: 13, color: '#555' }
};
