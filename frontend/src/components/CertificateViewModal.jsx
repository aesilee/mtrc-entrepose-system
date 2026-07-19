import { useEffect, useRef, useState } from "react";
import api from "../api/axios.js";
import CertificatePreview from "./CertificatePreview.jsx";
import { downloadElementAsPdf } from "../utils/pdf.js";

export default function CertificateViewModal({ certificateId, autoAction, onClose }) {
  const [certificate, setCertificate] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    api.get(`/certificates/${certificateId}`).then(({ data }) => setCertificate(data));
  }, [certificateId]);

  useEffect(() => {
    if (!certificate || !autoAction) return;
    if (autoAction === "print") {
      const t = setTimeout(() => window.print(), 300);
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
      }, 300);
      return () => clearTimeout(t);
    }
  }, [certificate, autoAction]);

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>Certificate of Completion</div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div style={styles.body}>
          {certificate ? (
            <>
              {downloading && <div className="no-print" style={styles.notice}>Preparing PDF…</div>}
              <div ref={previewRef}>
                <CertificatePreview certificate={certificate} />
              </div>
            </>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>Loading certificate…</div>
          )}
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
  body: { padding: 20, overflowY: "auto" },
  notice: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", fontSize: 13, padding: "8px 12px", borderRadius: "var(--radius-sm)", marginBottom: 14 },
};