import useOrgSettings from "../hooks/useOrgSettings.js";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function CertificatePreview({ certificate, compact }) {
  const org = useOrgSettings();
  const c = certificate;

  return (
    <div className="report-print-area" style={{ ...styles.card, padding: compact ? 24 : 36 }}>
      {org && (org.organization_name || org.organization_logo) && (
        <div style={styles.orgHeader}>
          {org.organization_logo ? (
            <img src={org.organization_logo} alt="Organization logo" style={styles.orgLogo} />
          ) : (
            <div style={styles.orgLogo} />
          )}
          <div style={styles.orgTextBlock}>
            <div style={styles.orgName}>{org.organization_name}</div>
            {org.organization_address && <div style={styles.orgLine}>{org.organization_address}</div>}
            <div style={styles.orgLine}>
              {[
                org.admission_no && `Admission: ${org.admission_no}`,
                org.administrative_no && `Administrative: ${org.administrative_no}`,
                org.organization_email,
              ].filter(Boolean).join("  |  ")}
            </div>
          </div>
          <div style={styles.orgLogo} />
        </div>
      )}

      <div style={styles.frame}>
        <div style={styles.eyebrow}>Certificate of Completion</div>
        <div style={styles.intro}>This is to certify that</div>
        <div style={styles.patientName}>{c.patientName}</div>
        <div style={styles.patientCode}>Patient ID: {c.patientCode}</div>
        <p style={styles.body}>
          has successfully completed the <strong>{c.program}</strong> program,
          having been admitted on <strong>{fmtDate(c.admissionDate)}</strong> and
          completing the program on <strong>{fmtDate(c.completionDate)}</strong>.
        </p>
        <p style={styles.remarks}>&ldquo;{c.remarks}&rdquo;</p>

        <div style={styles.footerRow}>
          <div style={styles.signatureBlock}>
            <div style={styles.signatureLine} />
            <div style={styles.signatureName}>{c.preparedBy}</div>
            <div style={styles.signatureLabel}>Prepared by</div>
          </div>
          <div style={styles.issuedBlock}>
            <div style={styles.issuedLabel}>Date issued</div>
            <div style={styles.issuedValue}>{fmtDate(c.issuedAt)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: { background: "var(--color-surface)" },
  orgHeader: { display: "flex", alignItems: "center", gap: 16, paddingBottom: 14, marginBottom: 18, borderBottom: "1px solid var(--color-border)" },
  orgLogo: { width: 56, height: 56, objectFit: "contain", background: "#fff", borderRadius: "var(--radius-sm)", flexShrink: 0 },
  orgTextBlock: { flex: 1, textAlign: "center" },
  orgName: { fontSize: 16, fontWeight: 800, color: "var(--color-text)", textTransform: "uppercase", letterSpacing: 0.3 },
  orgLine: { fontSize: 11, color: "var(--color-text-muted)", marginTop: 3 },

  frame: { border: "2px solid var(--color-primary-dark)", borderRadius: "var(--radius-md, 10px)", padding: "36px 32px", textAlign: "center" },
  eyebrow: { fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "var(--color-primary-dark)", marginBottom: 18 },
  intro: { fontSize: 13, color: "var(--color-text-muted)" },
  patientName: { fontSize: 26, fontWeight: 800, color: "var(--color-text)", margin: "10px 0 4px" },
  patientCode: { fontSize: 11, color: "var(--color-text-muted)", marginBottom: 20 },
  body: { fontSize: 13.5, color: "var(--color-text)", lineHeight: 1.8, maxWidth: 480, margin: "0 auto 18px" },
  remarks: { fontSize: 13, fontStyle: "italic", color: "var(--color-text-muted)", marginBottom: 34 },

  footerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 30, textAlign: "left" },
  signatureBlock: { minWidth: 200 },
  signatureLine: { borderTop: "1px solid var(--color-text)", width: 200, marginBottom: 6 },
  signatureName: { fontSize: 13, fontWeight: 700 },
  signatureLabel: { fontSize: 10.5, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4 },
  issuedBlock: { textAlign: "right" },
  issuedLabel: { fontSize: 10.5, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4 },
  issuedValue: { fontSize: 13, fontWeight: 700 },
};