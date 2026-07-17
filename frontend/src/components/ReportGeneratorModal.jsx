import { useEffect, useState } from "react";
import api from "../api/axios.js";
import * as XLSX from "xlsx";
import ReportPreview from "./ReportPreview.jsx";

const REPORT_TYPES = [
  { key: "attendance", label: "Attendance Report" },
  { key: "patient", label: "Patient Report" },
  { key: "program", label: "Program Report" },
  { key: "monthly", label: "Monthly Report" },
];

export default function ReportGeneratorModal({ onClose, onGenerated }) {
  const [reportType, setReportType] = useState("attendance");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [caseManagerId, setCaseManagerId] = useState("");
  const [programStatus, setProgramStatus] = useState("");
  const [patientId, setPatientId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");

  const [caseManagers, setCaseManagers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/users/case-managers").then(({ data }) => setCaseManagers(data.caseManagers));
    api.get("/patients").then(({ data }) => setPatients(data.patients));
  }, []);

  const showPatientField = reportType === "attendance" || reportType === "patient";
  const filteredPatients = patients.filter((p) =>
    !patientSearch || p.full_name.toLowerCase().includes(patientSearch.toLowerCase()) || p.patient_code.toLowerCase().includes(patientSearch.toLowerCase())
  );

  async function handleGenerate() {
    if (reportType === "patient" && !patientId) {
      setError("Select a patient to generate this report.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/reports/generate", {
        reportType, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined,
        caseManagerId: caseManagerId || undefined, programStatus: programStatus || undefined, patientId: patientId || undefined,
      });
      setReport(data);
      onGenerated();
    } catch (err) {
      setError(err.response?.data?.message || "Could not generate the report.");
    } finally {
      setLoading(false);
    }
  }

  function handleExportExcel() {
    if (!report) return;
    const ws = XLSX.utils.json_to_sheet(report.rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, report.title.slice(0, 31));
    XLSX.writeFile(wb, `${reportType}-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={{ ...styles.modal, width: report ? 920 : 480 }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>Generate Report</div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={{ ...styles.body, flexDirection: report ? "row" : "column" }}>
          <div style={{ ...styles.formCol, width: report ? 320 : "100%" }}>
            {error && <div style={styles.error}>{error}</div>}

            <label style={styles.label}>
              Report type
              <select style={styles.input} value={reportType} onChange={(e) => { setReportType(e.target.value); setReport(null); }}>
                {REPORT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </label>

            {reportType !== "patient" && (
              <label style={styles.label}>
                Date range
                <div style={styles.dateRange}>
                  <input type="date" style={styles.input} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  <span>–</span>
                  <input type="date" style={styles.input} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </label>
            )}

            {reportType !== "program" && reportType !== "monthly" && (
              <label style={styles.label}>
                Case manager
                <select style={styles.input} value={caseManagerId} onChange={(e) => setCaseManagerId(e.target.value)}>
                  <option value="">All case managers</option>
                  {caseManagers.map((cm) => <option key={cm.id} value={cm.id}>{cm.full_name}</option>)}
                </select>
              </label>
            )}

            {reportType === "attendance" && (
              <label style={styles.label}>
                Program status
                <select style={styles.input} value={programStatus} onChange={(e) => setProgramStatus(e.target.value)}>
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="dropped">Dropped</option>
                  <option value="transferred">Transferred</option>
                </select>
              </label>
            )}

            {showPatientField && (
              <label style={{ ...styles.label, position: "relative" }}>
                Patient {reportType === "patient" && <span style={{ color: "var(--color-danger, #B3261E)" }}>*</span>}
                <input
                  style={styles.input}
                  placeholder="Search patient…"
                  value={patientSearch}
                  onChange={(e) => { setPatientSearch(e.target.value); setPatientId(""); }}
                />
                {patientSearch && !patientId && (
                  <div style={styles.patientDropdown}>
                    {filteredPatients.slice(0, 6).map((p) => (
                      <button key={p.id} type="button" style={styles.patientOption} onClick={() => { setPatientId(p.id); setPatientSearch(p.full_name); }}>
                        {p.full_name} <span style={{ color: "var(--color-text-muted)" }}>({p.patient_code})</span>
                      </button>
                    ))}
                    {filteredPatients.length === 0 && <div style={styles.patientOption}>No matches</div>}
                  </div>
                )}
              </label>
            )}

            <button type="button" style={styles.generateBtn} onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating…" : report ? "Regenerate" : "Generate Report"}
            </button>

            {report && (
              <div className="no-print" style={styles.exportRow}>
                <button type="button" style={styles.secondaryBtn} onClick={handlePrint}>Print / Export PDF</button>
                <button type="button" style={styles.secondaryBtn} onClick={handleExportExcel}>Export Excel</button>
              </div>
            )}
          </div>

          {report && (
            <div style={styles.previewCol}>
              <ReportPreview report={report} compact />
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
  dateRange: { display: "flex", alignItems: "center", gap: 6 },
  patientDropdown: { position: "absolute", top: "100%", left: 0, right: 0, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", boxShadow: "0 10px 24px rgba(0,0,0,0.15)", zIndex: 20, maxHeight: 180, overflowY: "auto" },
  patientOption: { display: "block", width: "100%", textAlign: "left", padding: "8px 10px", fontSize: 13, background: "none", border: "none", cursor: "pointer" },
  generateBtn: { background: "var(--color-primary)", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  exportRow: { display: "flex", flexDirection: "column", gap: 8, paddingTop: 6, borderTop: "1px solid var(--color-border)" },
  secondaryBtn: { background: "var(--color-surface)", border: "1px solid var(--color-border)", padding: "9px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" },
};