import { useRef, useState } from "react";
import api from "../api/axios.js";
import CertificatePreview from "./CertificatePreview.jsx";
import { downloadElementAsPdf } from "../utils/pdf.js";

const DEFAULT_REMARKS = "Successfully completed all required rehabilitation activities";

export default function CertificateGeneratorModal({ patientId, onClose, onGenerated }) {
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState(DEFAULT_REMARKS);
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const previewRef = useRef(null);

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post(`/patients/${patientId}/certificates`, { completionDate, remarks });
      setCertificate(data);
      onGenerated();
    } catch (err) {
      setError(err.response?.data?.message || "Could not generate the certificate.");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleDownload() {
    if (!certificate) return;
    setDownloading(true);
    try {
      await downloadElementAsPdf(previewRef.current, `certificate-${certificate.patientCode}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={{ ...styles.modal, width: certificate ? 920 : 480 }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>Generate Certificate</div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={{ ...styles.body, flexDirection: certificate ? "row" : "column" }}>
          <div style={{ ...styles.formCol, width: certificate ? 320 : "100%" }}>
            {error && <div style={styles.error}>{error}</div>}

            <label style={styles.label}>
              Completion date
              <input type="date" style={styles.input} value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} />
            </label>

            <label style={styles.label}>
              Remarks
              <textarea style={{ ...styles.input, minHeight: 70 }} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </label>

            {!certificate && (
              <button type="button" style={styles.generateBtn} onClick={handleGenerate} disabled={loading}>
                {loading ? "Generating…" : "Generate Certificate"}
              </button>
            )}

            {certificate && (
              <div className="no-print" style={styles.exportRow}>
                <button type="button" style={styles.secondaryBtn} onClick={handlePrint}>Print</button>
                <button type="button" style={styles.secondaryBtn} onClick={handleDownload} disabled={downloading}>
                  {downloading ? "Preparing…" : "Download PDF"}
                </button>
                <button type="button" style={styles.saveBtn} onClick={onClose}>Save</button>
              </div>
            )}
          </div>

          {certificate && (
            <div style={styles.previewCol}>
              <div ref={previewRef}>
                <CertificatePreview certificate={certificate} compact />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "var(--color-surface)", borderRadius: "var(--radius-lg)", maxHeight: "88vh", maxWidth: "94vw", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.2s ease" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--color-border)" },
  title: { fontSize: 16, fontWeight: 800 },
  closeBtn: { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--color-text-muted)" },
  body: { display: "flex", flexWrap: "wrap", overflow: "auto", flex: 1 },
  formCol: { padding: 20, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", borderRight: "1px solid var(--color-border)", flexShrink: 0 },
  previewCol: { flex: 1, padding: 20, overflowY: "auto" },
  error: { background: "#FDE2E2", color: "#B3261E", fontSize: 13, padding: "8px 12px", borderRadius: "var(--radius-sm)" },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 },
  input: { padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13, fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
  generateBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  exportRow: { display: "flex", flexDirection: "column", gap: 8, paddingTop: 6, borderTop: "1px solid var(--color-border)" },
  secondaryBtn: { background: "var(--color-surface)", border: "1px solid var(--color-border)", padding: "9px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  saveBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "9px 16px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer" },
};