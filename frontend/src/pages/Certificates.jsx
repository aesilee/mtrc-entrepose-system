import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import CertificateGeneratorModal from "../components/CertificateGeneratorModal.jsx";
import CertificateViewModal from "../components/CertificateViewModal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import useViewport from "../hooks/useViewport.js";

const certificateIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
    <circle cx="12" cy="8" r="5" />
    <path d="M8.5 12.5L7 21l5-3 5 3-1.5-8.5" />
  </svg>
);

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function certificateTypeLabel(type) {
  return type === "enrollment" ? "Enrollment" : "Completion";
}

export default function Certificates() {
  const { user } = useAuth();
  const { isMobile } = useViewport();
  const location = useLocation();
  const navigate = useNavigate();
  const canGenerate = ["admitting", "him_staff", "ict_admin"].includes(user.role);
  const generationType = user.role === "admitting" ? "enrollment" : "completion";

  const [certificates, setCertificates] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [generatorPatientId, setGeneratorPatientId] = useState(null);
  const [viewingCertificateId, setViewingCertificateId] = useState(null);
  const [certificateAction, setCertificateAction] = useState(null);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [certificateResponse, patientResponse] = await Promise.all([
        api.get("/certificates"),
        api.get("/patients"),
      ]);
      setCertificates(certificateResponse.data.certificates || []);
      setPatients(patientResponse.data.patients || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load certificates.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const shouldGenerate = new URLSearchParams(location.search).get("generate") === "1";
    if (shouldGenerate && canGenerate) {
      setPickerOpen(true);
      navigate("/certificates", { replace: true });
    }
  }, [canGenerate, location.search, navigate]);

  const filteredCertificates = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return certificates;
    return certificates.filter((certificate) =>
      [
        certificate.patient_name,
        certificate.patient_code,
        certificate.program_name,
        certificate.certificate_type,
        certificate.issued_by_name,
      ].some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [certificates, search]);

  function openCertificate(id, action = null) {
    setViewingCertificateId(id);
    setCertificateAction(action);
  }

  function continueToGenerator() {
    if (!selectedPatientId) return;
    setGeneratorPatientId(selectedPatientId);
    setPickerOpen(false);
  }

  function closePicker() {
    setPickerOpen(false);
    setSelectedPatientId("");
  }

  return (
    <AppShell title="Certificates" description="Generate, view, print, and download patient certificates.">
      <div style={styles.page}>
        <div style={{ ...styles.toolbar, flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center" }}>
          <div style={styles.searchBox}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              style={styles.searchInput}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patient, ID, program, or certificate type"
            />
          </div>
          {canGenerate && (
            <button type="button" style={styles.primaryButton} onClick={() => setPickerOpen(true)}>
              + Generate {certificateTypeLabel(generationType)} Certificate
            </button>
          )}
        </div>

        {error && (
          <div role="alert" style={styles.errorBanner}>
            <span>{error}</span>
            <button type="button" style={styles.retryButton} onClick={loadData}>Retry</button>
          </div>
        )}

        <div style={styles.summaryRow}>
          <div style={styles.summaryCard}>
            <span style={styles.summaryValue}>{certificates.length}</span>
            <span style={styles.summaryLabel}>Total Certificates</span>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryValue}>{certificates.filter((item) => item.certificate_type === "enrollment").length}</span>
            <span style={styles.summaryLabel}>Enrollment Certificates</span>
          </div>
        </div>

        <div style={styles.tableCard}>
          {loading ? (
            <div style={styles.loadingText}>Loading certificates…</div>
          ) : filteredCertificates.length === 0 ? (
            <EmptyState
              icon={certificateIcon}
              title={search ? "No certificates match your search" : "No certificates issued yet"}
              description={search ? "Try another patient name, ID, or certificate type." : "Generated certificates will appear here."}
            />
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Patient</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Program</th>
                    <th style={styles.th}>Issued</th>
                    <th style={styles.th}>Prepared by</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCertificates.map((certificate) => (
                    <tr key={certificate.id} style={styles.row}>
                      <td style={styles.td}>
                        <button type="button" style={styles.patientLink} onClick={() => navigate(`/patients/${certificate.patient_id}`)}>
                          {certificate.patient_name}
                        </button>
                        <div style={styles.patientCode}>{certificate.patient_code}</div>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.typeBadge, ...(certificate.certificate_type === "enrollment" ? styles.enrollmentBadge : styles.completionBadge) }}>
                          {certificateTypeLabel(certificate.certificate_type)}
                        </span>
                      </td>
                      <td style={styles.td}>{certificate.program_name || "—"}</td>
                      <td style={styles.td}>{formatDate(certificate.issued_at)}</td>
                      <td style={styles.td}>{certificate.issued_by_name || certificate.prepared_by_name || "—"}</td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button type="button" style={styles.actionButton} onClick={() => openCertificate(certificate.id)}>View</button>
                          <button type="button" style={styles.actionButton} onClick={() => openCertificate(certificate.id, "print")}>Print</button>
                          <button type="button" style={styles.actionButton} onClick={() => openCertificate(certificate.id, "download")}>PDF</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {pickerOpen && (
        <div style={styles.backdrop} onClick={closePicker}>
          <div style={styles.pickerModal} onClick={(event) => event.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalTitle}>Choose a patient</div>
                <div style={styles.modalSubtitle}>Generate a Certificate of {certificateTypeLabel(generationType)}.</div>
              </div>
              <button type="button" style={styles.closeButton} onClick={closePicker}>×</button>
            </div>
            <label style={styles.fieldLabel}>
              Patient
              <select style={styles.select} value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)}>
                <option value="">Select a patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.patient_code} - {patient.full_name}
                  </option>
                ))}
              </select>
            </label>
            {patients.length === 0 && <div style={styles.helperText}>No active patient records are available.</div>}
            <div style={styles.modalActions}>
              <button type="button" style={styles.secondaryButton} onClick={closePicker}>Cancel</button>
              <button type="button" style={styles.primaryButton} onClick={continueToGenerator} disabled={!selectedPatientId}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {generatorPatientId && (
        <CertificateGeneratorModal
          patientId={generatorPatientId}
          certificateType={generationType}
          onClose={() => { setGeneratorPatientId(null); setSelectedPatientId(""); }}
          onGenerated={loadData}
        />
      )}

      {viewingCertificateId && (
        <CertificateViewModal
          certificateId={viewingCertificateId}
          autoAction={certificateAction}
          onClose={() => { setViewingCertificateId(null); setCertificateAction(null); }}
        />
      )}
    </AppShell>
  );
}

const styles = {
  page: { display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 1440, margin: "0 auto", boxSizing: "border-box" },
  toolbar: { display: "flex", justifyContent: "space-between", gap: 12 },
  searchBox: { display: "flex", alignItems: "center", gap: 9, flex: 1, maxWidth: 560, padding: "9px 12px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", boxSizing: "border-box" },
  searchInput: { flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: "var(--color-text)", fontSize: 13, fontFamily: "inherit" },
  primaryButton: { background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  secondaryButton: { background: "var(--color-surface)", color: "var(--color-text)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  errorBanner: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 14px", background: "#FDE2E2", color: "#B3261E", borderRadius: "var(--radius-sm)", fontSize: 13 },
  retryButton: { background: "none", border: "none", color: "inherit", fontWeight: 700, cursor: "pointer" },
  summaryRow: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, maxWidth: 520 },
  summaryCard: { display: "flex", alignItems: "baseline", gap: 10, height: 72, padding: "14px 16px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", boxSizing: "border-box" },
  summaryValue: { fontSize: 24, fontWeight: 800, color: "var(--color-text)" },
  summaryLabel: { fontSize: 12, color: "var(--color-text-muted)" },
  tableCard: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden", minHeight: 300 },
  tableWrap: { width: "100%", overflow: "auto" },
  table: { width: "100%", minWidth: 900, borderCollapse: "collapse", tableLayout: "fixed" },
  th: { padding: "12px 16px", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontSize: 11, fontWeight: 700, textAlign: "left", textTransform: "uppercase", letterSpacing: 0.4 },
  row: { borderBottom: "1px solid var(--color-border)" },
  td: { padding: "13px 16px", color: "var(--color-text)", fontSize: 13, verticalAlign: "middle", overflow: "hidden", textOverflow: "ellipsis" },
  patientLink: { display: "block", maxWidth: "100%", padding: 0, border: "none", background: "none", color: "var(--color-text)", fontWeight: 700, fontSize: 13, textAlign: "left", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  patientCode: { marginTop: 3, color: "var(--color-text-muted)", fontSize: 11 },
  typeBadge: { display: "inline-block", padding: "4px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700 },
  enrollmentBadge: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)" },
  completionBadge: { background: "#E1F0FF", color: "#0B5FA5" },
  actions: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  actionButton: { padding: "6px 9px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)", color: "var(--color-primary-dark)", fontSize: 11, fontWeight: 700, cursor: "pointer" },
  loadingText: { padding: 48, color: "var(--color-text-muted)", textAlign: "center", fontSize: 13 },
  backdrop: { position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.4)" },
  pickerModal: { width: 460, maxWidth: "100%", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", padding: 20, boxSizing: "border-box" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18 },
  modalTitle: { fontSize: 17, fontWeight: 800, color: "var(--color-text)" },
  modalSubtitle: { marginTop: 4, color: "var(--color-text-muted)", fontSize: 12 },
  closeButton: { border: "none", background: "none", color: "var(--color-text-muted)", fontSize: 22, cursor: "pointer" },
  fieldLabel: { display: "flex", flexDirection: "column", gap: 7, color: "var(--color-text)", fontSize: 13, fontWeight: 600 },
  select: { width: "100%", padding: "10px 11px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)", color: "var(--color-text)", fontSize: 13 },
  helperText: { marginTop: 8, color: "var(--color-text-muted)", fontSize: 12 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 },
};
