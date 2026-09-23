import React, { useState, useEffect } from "react";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";
import Select from "react-select";
import { useAuth } from "../context/AuthContext.jsx";

export default function Certificates() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [certType, setCertType] = useState("ENROLLMENT"); // ENROLLMENT | COMPLETION
  const [eligibility, setEligibility] = useState(null);
  
  const [generatedPayload, setGeneratedPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Load active/completed patients for dropdown
    api.get("/patients").then(res => {
      const opts = res.data.map(p => ({
        value: p.id,
        label: `${p.full_name} (${p.pwud_code || p.opd_number})`,
        data: p
      }));
      setPatients(opts);
    }).catch(err => console.error(err));
  }, []);

  // Fetch eligibility when patient or type changes
  useEffect(() => {
    setGeneratedPayload(null);
    if (!selectedPatient) {
      setEligibility(null);
      return;
    }
    api.get(`/certificates/${selectedPatient.value}/eligibility`)
      .then(res => setEligibility(res.data))
      .catch(err => {
        console.error(err);
        setEligibility(null);
      });
  }, [selectedPatient, certType]);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post(`/certificates/${selectedPatient.value}/generate`, {
        certificateType: certType,
        remarks: "Issued via system.",
        pleaBargainNote: certType === "COMPLETION" ? "In compliance with court mandate." : ""
      });
      if (res.data.success) {
        setGeneratedPayload(res.data.payload);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate certificate.");
    }
    setLoading(false);
  };

  const currentEligibility = eligibility ? (certType === "ENROLLMENT" ? eligibility.enrollment : eligibility.completion) : null;
  const isEligible = currentEligibility?.eligible;
  const reasons = currentEligibility?.reasons || (currentEligibility?.reason ? [currentEligibility.reason] : []);

  return (
    <AppShell title="Certificates Engine" description="Statutory Certificate Generation & Issuance">
      <div className="no-print" style={styles.controlPanel}>
        <div style={styles.formGroup}>
          <label>Select Patient</label>
          <Select 
            options={patients} 
            onChange={setSelectedPatient} 
            value={selectedPatient}
            placeholder="Search by Name or PWUD Code..."
          />
        </div>

        {selectedPatient && (
          <div style={styles.formGroup}>
            <label>Certificate Type</label>
            <div style={{ display: 'flex', gap: 15 }}>
              <label>
                <input type="radio" value="ENROLLMENT" checked={certType === "ENROLLMENT"} onChange={() => setCertType("ENROLLMENT")} /> Enrollment
              </label>
              <label>
                <input type="radio" value="COMPLETION" checked={certType === "COMPLETION"} onChange={() => setCertType("COMPLETION")} /> Completion
              </label>
            </div>
          </div>
        )}

        {selectedPatient && eligibility && !isEligible && (
          <div style={styles.warningBanner}>
            <strong>Ineligible for {certType} Certificate:</strong>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        {selectedPatient && isEligible && !generatedPayload && (
          <button style={styles.btnPrimary} onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating..." : `Generate ${certType} Certificate`}
          </button>
        )}
        
        {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}

        {generatedPayload && (
          <div style={styles.actions}>
            <button style={styles.btnPrint} onClick={() => window.print()}>🖨️ Print Certificate</button>
            <span style={{ fontSize: 13, color: 'gray' }}>Use "Save as PDF" in the print dialog to download.</span>
          </div>
        )}
      </div>

      {generatedPayload && (
        <div className="print-area" style={styles.certificateCanvas}>
          <div style={styles.certHeader}>
            <h3 style={{ margin: 0 }}>REPUBLIC OF THE PHILIPPINES</h3>
            <h4 style={{ margin: '5px 0' }}>DEPARTMENT OF HEALTH</h4>
            <h2 style={{ color: 'darkgreen', margin: '10px 0' }}>MALINAO TREATMENT AND REHABILITATION CENTER</h2>
            <p>Malinao, Albay</p>
          </div>

          <h1 style={styles.certTitle}>CERTIFICATE OF {generatedPayload.type}</h1>
          <p style={{ textAlign: 'right', fontWeight: 'bold' }}>Control No: {generatedPayload.controlNo}</p>
          
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
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: absolute; left: 0; top: 0; width: 100%;
            margin: 0 !important; padding: 20px !important;
            box-shadow: none !important; border: 2px solid black !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </AppShell>
  );
}

const styles = {
  controlPanel: { background: 'white', padding: 20, borderRadius: 8, border: '1px solid #ddd', marginBottom: 20 },
  formGroup: { marginBottom: 15 },
  warningBanner: { background: '#ffebee', color: '#c62828', padding: 15, borderRadius: 5, border: '1px solid #ef9a9a', marginBottom: 15 },
  btnPrimary: { background: 'var(--color-primary)', color: 'white', padding: '10px 20px', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' },
  btnPrint: { background: '#333', color: 'white', padding: '10px 20px', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', marginRight: 15 },
  actions: { marginTop: 20, display: 'flex', alignItems: 'center' },
  
  certificateCanvas: { 
    background: 'white', padding: '60px 80px', margin: '0 auto', maxWidth: 800,
    border: '10px double #2e7d32', borderRadius: 5, fontFamily: 'serif',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
  },
  certHeader: { textAlign: 'center', marginBottom: 40 },
  certTitle: { textAlign: 'center', fontSize: 32, letterSpacing: 2, textDecoration: 'underline', marginBottom: 30 },
  certBody: { fontSize: 18, lineHeight: '1.8', textAlign: 'justify', marginBottom: 60 },
  certSignatories: { display: 'flex', justifyContent: 'space-between', marginTop: 80 },
  sigBlock: { textAlign: 'center', width: 250 },
  sigLine: { borderBottom: '1px solid black', fontWeight: 'bold', fontSize: 18, marginBottom: 5, paddingBottom: 5 },
  sigTitle: { fontSize: 14, color: '#555' }
};
