import { useEffect, useRef, useState } from "react";
import api from "../api/axios.js";
import CertificatePreview from "./CertificatePreview.jsx";
import { downloadElementAsPdf } from "../utils/pdf.js";

export default function CertificateViewModal({ certificateId, autoAction, onClose }) {
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    api.get(`/certificates/${certificateId}`)
      .then(({ data }) => {
        if (mounted) {
          setCertificate(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load certificate:", err);
        if (mounted) {
          setError(err.response?.data?.message || "Could not load certificate information.");
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [certificateId]);

  useEffect(() => {
    if (!certificate || !autoAction) return;
    if (autoAction === "print") {
      const t = setTimeout(() => window.print(), 350);
      return () => clearTimeout(t);
    }
    if (autoAction === "download") {
      const t = setTimeout(async () => {
        setDownloading(true);
        try {
          await downloadElementAsPdf(previewRef.current, `certificate-${certificate.patientCode}.pdf`);
        } finally {
          setDownloading(false);
        }
      }, 350);
      return () => clearTimeout(t);
    }
  }, [certificate, autoAction]);

  async function handleManualDownload() {
    if (!previewRef.current || !certificate) return;
    setDownloading(true);
    try {
      await downloadElementAsPdf(previewRef.current, `certificate-${certificate.patientCode || certificateId}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Error generating PDF. You can also print the certificate.");
    } finally {
      setDownloading(false);
    }
  }

  const title = certificate
    ? certificate.certificateType === "enrollment"
      ? "Certificate of Enrollment"
      : certificate.certificateType === "opd_consultation"
      ? "Outpatient Consultation Slip"
      : "Certificate of Completion"
    : "Certificate";

  return (
    <div className="modal-backdrop" style={styles.backdrop} onClick={onClose}>
      <div className="modal-dialog" style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className="no-print" style={styles.header}>
          <div style={styles.title}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {certificate && (
              <>
                <button
                  type="button"
                  style={styles.actionBtn}
                  onClick={() => window.print()}
                  disabled={downloading}
                >
                  Print
                </button>
                <button
                  type="button"
                  style={styles.primaryActionBtn}
                  onClick={handleManualDownload}
                  disabled={downloading}
                >
                  {downloading ? "Preparing…" : "Download PDF"}
                </button>
              </>
            )}
            <button type="button" style={styles.closeBtn} onClick={onClose}>×</button>
          </div>
        </div>
        <div className="modal-body-scroll" style={styles.body}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>Loading certificate…</div>
          ) : error ? (
            <div style={{ padding: 30, textAlign: "center", color: "var(--color-danger)" }}>
              <p style={{ fontWeight: 600 }}>{error}</p>
              <button
                type="button"
                style={{ marginTop: 12, padding: "6px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
                onClick={onClose}
              >
                Close
              </button>
            </div>
          ) : certificate ? (
            <>
              {downloading && <div className="no-print" style={styles.notice}>Preparing PDF…</div>}
              <div ref={previewRef}>
                <CertificatePreview certificate={certificate} />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "var(--color-surface)", borderRadius: "var(--radius-lg)", width: 640, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--color-border)" },
  title: { fontSize: 16, fontWeight: 800 },
  closeBtn: { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--color-text-muted)" },
  actionBtn: { padding: "6px 12px", fontSize: 12.5, fontWeight: 600, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--color-text)" },
  primaryActionBtn: { padding: "6px 12px", fontSize: 12.5, fontWeight: 600, background: "var(--color-primary)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "#fff" },
  body: { padding: 20, overflowY: "auto" },
  notice: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", fontSize: 13, padding: "8px 12px", borderRadius: "var(--radius-sm)", marginBottom: 14 },
};
