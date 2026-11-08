import React, { useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";
import * as XLSX from "xlsx";
import {
  Form41View,
  Form42View,
  Form43DemographicsView,
  Form43EmploymentView,
  Form43EducationView,
  Form43SubstanceView,
  Form43ReadmissionsView,
  Form43ComorbiditiesView,
  Form101View,
  Form102View,
  Form11View,
  GenericOfficialView
} from "../components/dohReports/DohReportViews.jsx";

const DOH_FORMS = [
  { id: "doh-form-4-1", name: "Form 4.1 (A & B) — Percentage of Cases Managed (Outpatient & Aftercare)" },
  { id: "doh-form-4-2", name: "Form 4.2 (B & C) — Service Provision to PWUDs" },
  { id: "doh-form-4-3-demographics", name: "Form 4.3 Part I — Demographic Profile (Age & Civil Status)" },
  { id: "doh-form-4-3-employment", name: "Form 4.3 Part II — PWUDs Employment Status" },
  { id: "doh-form-4-3-education", name: "Form 4.3 Part III — Residence & Educational Status" },
  { id: "doh-form-4-3-substance", name: "Form 4.3 Part IV — Substance of Abuse & Duration of Use" },
  { id: "doh-form-4-3-readmissions", name: "Form 4.3 Part V — Readmission or Recommitment Count" },
  { id: "doh-form-4-3-comorbidities", name: "Form 4.3 Part VI — Clinical Comorbidities (Medical & Psych)" },
  { id: "doh-form-10-1", name: "Form 10.1 — Program Completion Rate (Quarterly 7-Month Adjusted)" },
  { id: "doh-form-10-2", name: "Form 10.2 — Discharges from the Program (Outpatient & ACP)" },
  { id: "doh-form-11", name: "Form 11 — Consolidated Surveillance Matrix (Post-Admission Drug Tests)" },
  { id: "program-census", name: "Program Census Summary" },
  { id: "non-completers", name: "Non-Completer Roster" },
  { id: "positive-dt", name: "Positive Drug Test Surveillance Roster" }
];

export default function Reports() {
  const [selectedForm, setSelectedForm] = useState(DOH_FORMS[0].id);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    setData(null);
    setError("");
  }, [selectedForm]);

  const isQuarterly = selectedForm === "doh-form-10-1";

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const periodLabel = isQuarterly
    ? `${quarter === 1 ? "1st" : quarter === 2 ? "2nd" : quarter === 3 ? "3rd" : "4th"} Quarter ${year} (Q${quarter} ${year})`
    : `${monthNames[month - 1]} ${year}`;

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const params = isQuarterly ? { quarter, year } : { month, year };
      const res = await api.get(`/reports/${selectedForm}`, { params });
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError("Failed to fetch report data from server.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while generating the report. Please try again.");
    }
    setLoading(false);
  }

  function handleExportExcel() {
    if (!data) return;
    const reportElem = document.getElementById("report-table");
    if (!reportElem) return;

    const tables = reportElem.querySelectorAll("table");
    if (tables.length === 0) return;

    const wb = XLSX.utils.book_new();

    if (tables.length === 1) {
      const ws = XLSX.utils.table_to_sheet(tables[0]);
      XLSX.utils.book_append_sheet(wb, ws, "DOH_Report");
    } else {
      tables.forEach((tbl, idx) => {
        const ws = XLSX.utils.table_to_sheet(tbl);
        XLSX.utils.book_append_sheet(wb, ws, `Table_${idx + 1}`);
      });
    }

    const cleanLabel = isQuarterly ? `Q${quarter}_${year}` : `${monthNames[month - 1]}_${year}`;
    XLSX.writeFile(wb, `MTRC_DOH_${selectedForm}_${cleanLabel}.xlsx`);
  }

  function handlePrint() {
    window.print();
  }

  const renderTable = () => {
    if (!data) return null;

    switch (selectedForm) {
      case "doh-form-4-1":
        return <Form41View data={data} periodLabel={periodLabel} />;
      case "doh-form-4-2":
        return <Form42View data={data} periodLabel={periodLabel} />;
      case "doh-form-4-3-demographics":
        return <Form43DemographicsView data={data} periodLabel={periodLabel} />;
      case "doh-form-4-3-employment":
        return <Form43EmploymentView data={data} periodLabel={periodLabel} />;
      case "doh-form-4-3-education":
        return <Form43EducationView data={data} periodLabel={periodLabel} />;
      case "doh-form-4-3-substance":
        return <Form43SubstanceView data={data} periodLabel={periodLabel} />;
      case "doh-form-4-3-readmissions":
        return <Form43ReadmissionsView data={data} periodLabel={periodLabel} />;
      case "doh-form-4-3-comorbidities":
        return <Form43ComorbiditiesView data={data} periodLabel={periodLabel} />;
      case "doh-form-10-1":
        return <Form101View data={data} periodLabel={periodLabel} />;
      case "doh-form-10-2":
        return <Form102View data={data} periodLabel={periodLabel} />;
      case "doh-form-11":
        return <Form11View data={data} periodLabel={periodLabel} />;
      case "program-census":
        return <GenericOfficialView data={data} title="PROGRAM CENSUS SUMMARY" periodLabel={periodLabel} />;
      case "non-completers":
        return <GenericOfficialView data={data} title="NON-COMPLETERS ROSTER" periodLabel={periodLabel} />;
      case "positive-dt":
        return <GenericOfficialView data={data} title="POSITIVE DRUG TEST SURVEILLANCE ROSTER" periodLabel={periodLabel} />;
      default:
        return <GenericOfficialView data={data} title="DOH STATUTORY REPORT" periodLabel={periodLabel} />;
    }
  };

  return (
    <AppShell title="DOH Reports Automation" description="Generate, print, and export official DOH Outpatient statutory forms.">
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 13 }}>
          <Link to="/reports/op-cm-tracker" style={{ color: "var(--color-primary-dark)", fontWeight: 700, textDecoration: "none" }}>
            ← Open OP CM Tracker (Monthly Intervention)
          </Link>
        </p>
        <span style={{ fontSize: 12, color: "#64748b", background: "#f1f5f9", padding: "4px 10px", borderRadius: 4, fontWeight: 600 }}>
          Facility: DOH - Malinao TRC | Outpatient Scope
        </span>
      </div>

      <div className="no-print" style={styles.controlBar}>
        <div style={styles.filters}>
          <label style={styles.label}>
            Select DOH Statutory Form
            <select style={styles.select} value={selectedForm} onChange={e => setSelectedForm(e.target.value)}>
              {DOH_FORMS.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Year
            <select style={styles.select} value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2023, 2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>

          {isQuarterly ? (
            <label style={styles.label}>
              Rating Quarter
              <select style={styles.select} value={quarter} onChange={e => setQuarter(Number(e.target.value))}>
                <option value={1}>1st Quarter (Jan – Mar)</option>
                <option value={2}>2nd Quarter (Apr – Jun)</option>
                <option value={3}>3rd Quarter (Jul – Sep)</option>
                <option value={4}>4th Quarter (Oct – Dec)</option>
              </select>
            </label>
          ) : (
            <label style={styles.label}>
              Rating Month
              <select style={styles.select} value={month} onChange={e => setMonth(Number(e.target.value))}>
                {monthNames.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </label>
          )}

          <button style={styles.generateBtn} onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating Report..." : "Generate Report"}
          </button>
        </div>

        <div style={styles.actions}>
          <button style={styles.exportBtn} onClick={handleExportExcel} disabled={!data}>
            <svg style={{ width: 16, height: 16, marginRight: 6 }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1.8 14l-1.8-3-1.8 3h-1.7l2.6-4.2-2.4-3.8h1.7l1.6 2.8 1.6-2.8h1.7l-2.4 3.8 2.6 4.2h-1.7zM13 9V3.5L18.5 9H13z"/>
            </svg>
            Export to Excel
          </button>
          <button style={styles.printBtn} onClick={handlePrint} disabled={!data}>
            <svg style={{ width: 16, height: 16, marginRight: 6 }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
            </svg>
            Print / PDF Official Form
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: "#b91c1c", backgroundColor: "#fee2e2", padding: "12px 16px", borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      {!data && !loading && (
        <div style={styles.emptyPrompt}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>📋</div>
          <h3 style={{ margin: "0 0 6px", color: "#1e293b", fontSize: 18 }}>Select Reporting Parameters & Click "Generate Report"</h3>
          <p style={{ margin: 0, color: "#64748b", fontSize: 14, maxWidth: 560 }}>
            Automated statutory DOH Outpatient and Outpatient-Aftercare reports are rendered strictly formatted to the official institutional template of DOH - Malinao Treatment and Rehabilitation Center.
          </p>
        </div>
      )}

      {loading && (
        <div style={styles.emptyPrompt}>
          <div className="spinner" style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTopColor: "var(--color-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 12 }}></div>
          <p style={{ margin: 0, fontWeight: 600, color: "#334155" }}>Retrieving and tabulating clinical data from PMIS...</p>
        </div>
      )}

      {data && (
        <div style={styles.reportContainer} className="print-area">
          {renderTable()}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .doh-report-wrapper {
          width: 100%;
          color: #0f172a;
          font-family: inherit;
        }

        .facility-header-block {
          text-align: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #0f172a;
        }
        .republic-text {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .doh-text {
          margin: 2px 0 4px;
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          text-transform: uppercase;
        }
        .facility-title {
          margin: 4px 0 2px;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 0.8px;
          color: #047857;
        }
        .facility-sub {
          margin: 0;
          font-size: 12px;
          color: #64748b;
        }
        .form-info-banner {
          margin-top: 14px;
          padding: 8px 12px;
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
        }
        .form-heading {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 0.3px;
        }
        .form-subheading {
          margin: 3px 0 0;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
        }
        .form-period {
          margin: 4px 0 0;
          font-size: 13px;
          color: #0f172a;
        }

        .view-tab-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
        }
        .tab-btn {
          padding: 7px 16px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .tab-btn.active {
          background: #047857;
          border-color: #047857;
          color: #ffffff;
        }

        .report-section {
          margin-bottom: 24px;
        }
        .table-caption {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 8px;
          padding-left: 2px;
        }
        .scope-tag {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          background: #e0e7ff;
          color: #3730a3;
        }
        .scope-tag.aftercare-tag {
          background: #fef3c7;
          color: #92400e;
        }

        .doh-official-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
          line-height: 1.4;
          background: #ffffff;
        }
        .doh-official-table th,
        .doh-official-table td {
          border: 1px solid #94a3b8;
          padding: 6px 10px;
        }
        .doh-official-table th {
          background-color: #f1f5f9;
          color: #0f172a;
          font-weight: 700;
          text-align: left;
        }
        .th-category {
          text-align: left !important;
        }
        .th-center {
          text-align: center !important;
        }
        .th-sub {
          text-align: center !important;
          background-color: #f8fafc !important;
          font-weight: 600;
        }

        .td-num {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .td-num-bold {
          text-align: right;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }

        .tr-header-group td {
          background-color: #f8fafc;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 0.2px;
        }
        .tr-sub-group td {
          font-weight: 700;
          color: #334155;
        }
        .tr-subtotal td {
          background-color: #fafaf9;
          font-weight: 700;
          color: #1e293b;
        }
        .tr-section-total td {
          background-color: #f1f5f9;
          font-weight: 800;
          border-top: 1.5px solid #64748b;
          border-bottom: 1.5px solid #64748b;
        }
        .tr-highlight td {
          background-color: #f0fdf4;
        }
        .tr-grand-total td {
          background-color: #e2e8f0;
          font-weight: 900;
          font-size: 13px;
          border-top: 2px solid #0f172a;
          border-bottom: 2px double #0f172a;
        }

        .current-badge {
          margin-left: 8px;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          background: #047857;
          color: #ffffff;
        }

        .formula-card {
          margin-top: 16px;
          padding: 12px 16px;
          background: #f8fafc;
          border: 1px dashed #94a3b8;
          border-radius: 6px;
          font-size: 12.5px;
        }
        .formula-title {
          margin: 0 0 6px;
          color: #1e293b;
          font-size: 13px;
        }
        .formula-math {
          margin: 0 0 4px;
          font-size: 13px;
          color: #0f172a;
          line-height: 1.6;
        }
        .formula-note {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          font-style: italic;
        }

        .window-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 6px;
          background: #e2e8f0;
          border-radius: 4px;
        }
        .dt-pill {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .dt-pos {
          background-color: #fee2e2;
          color: #dc2626;
          border: 1px solid #f87171;
        }
        .dt-neg {
          background-color: #dcfce7;
          color: #16a34a;
          border: 1px solid #86efac;
        }

        .empty-roster-box {
          padding: 20px;
          text-align: center;
          color: #64748b;
          font-size: 13px;
          font-style: italic;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
        }

        .signatory-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #cbd5e1;
          page-break-inside: avoid;
        }
        .signatory-col {
          text-align: center;
        }
        .signatory-label {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          margin: 0 0 40px;
          text-align: left;
        }
        .signatory-line {
          height: 1px;
          background: #0f172a;
          margin-bottom: 6px;
        }
        .signatory-name {
          font-size: 12.5px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          text-transform: uppercase;
        }
        .signatory-role {
          font-size: 11.5px;
          color: #475569;
          margin: 2px 0 0;
        }

        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .doh-official-table {
            font-size: 10px !important;
          }
          .doh-official-table th, .doh-official-table td {
            padding: 4px 6px !important;
          }
          .signatory-container {
            margin-top: 30px !important;
          }
        }
      `}</style>
    </AppShell>
  );
}

const styles = {
  controlBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: 16,
    background: "#ffffff",
    padding: "20px 24px",
    borderRadius: "var(--radius-lg, 12px)",
    border: "1px solid var(--color-border, #e2e8f0)",
    marginBottom: 24,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
  },
  filters: { display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: "700", color: "#334155" },
  select: { padding: "9px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", minWidth: 200, fontSize: 13, background: "#ffffff", color: "#0f172a" },
  generateBtn: {
    padding: "9px 22px",
    background: "#047857",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontWeight: "700",
    fontSize: 13,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
  },
  actions: { display: "flex", gap: 10 },
  exportBtn: {
    display: "flex",
    alignItems: "center",
    padding: "9px 16px",
    background: "#15803d",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontWeight: "700",
    fontSize: 13,
    cursor: "pointer"
  },
  printBtn: {
    display: "flex",
    alignItems: "center",
    padding: "9px 16px",
    background: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontWeight: "700",
    fontSize: 13,
    cursor: "pointer"
  },
  reportContainer: {
    background: "#ffffff",
    padding: "36px 40px",
    borderRadius: "var(--radius-lg, 12px)",
    border: "1px solid var(--color-border, #e2e8f0)",
    minHeight: 500,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
  },
  emptyPrompt: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    background: "#ffffff",
    padding: "60px 24px",
    borderRadius: "var(--radius-lg, 12px)",
    border: "1px dashed #cbd5e1"
  }
};
