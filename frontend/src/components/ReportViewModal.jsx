import { useEffect, useState } from "react";
import api from "../api/axios.js";
import * as XLSX from "xlsx";
import ReportPreview from "./ReportPreview.jsx";

export default function ReportViewModal({ reportId, onClose }) {
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.get(`/reports/${reportId}`).then(({ data }) => setReport(data));
  }, [reportId]);

  function handleExportExcel() {
    if (!report) return;
    const ws = XLSX.utils.json_to_sheet(report.rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, report.title.slice(0, 31));
    XLSX.writeFile(wb, `${report.reportType}-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>{report?.title || "Report"}</div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div style={styles.body}>
          {report ? (
            <>
              <div className="no-print" style={styles.exportRow}>
                <button type="button" style={styles.secondaryBtn} onClick={() => window.print()}>Print / Export PDF</button>
                <button type="button" style={styles.secondaryBtn} onClick={handleExportExcel}>Export Excel</button>
              </div>
              <ReportPreview report={report} />
            </>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>Loading report…</div>
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
  exportRow: { display: "flex", gap: 10, marginBottom: 14 },
  secondaryBtn: { background: "var(--color-surface)", border: "1px solid var(--color-border)", padding: "9px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" },
};