import React, { useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";
import * as XLSX from "xlsx";

const DOH_FORMS = [
  { id: "doh-form-4-1", name: "Form 4.1 (A & B) — Cases Managed" },
  { id: "doh-form-4-2", name: "Form 4.2 (B & C) — Service Provision" },
  { id: "doh-form-4-3-demographics", name: "Form 4.3 Part I — Demographics" },
  { id: "doh-form-4-3-employment", name: "Form 4.3 Part II — Employment" },
  { id: "doh-form-4-3-education", name: "Form 4.3 Part III — Education & Residence" },
  { id: "doh-form-4-3-substance", name: "Form 4.3 Part IV — Substance Profile" },
  { id: "doh-form-4-3-readmissions", name: "Form 4.3 Part V — Readmissions" },
  { id: "doh-form-4-3-comorbidities", name: "Form 4.3 Part VI — Clinical Comorbidities" },
  { id: "doh-form-10-1", name: "Form 10.1 — Quarterly Completion Rate" },
  { id: "doh-form-10-2", name: "Form 10.2 — Discharges Summary" },
  { id: "doh-form-11", name: "Form 11 — Drug Testing Surveillance Matrix" },
  { id: "program-census", name: "Program Census Summary" },
  { id: "non-completers", name: "Non-Completer Roster" },
  { id: "positive-dt", name: "Positive Drug Test Roster" }
];

export default function Reports() {
  const [selectedForm, setSelectedForm] = useState(DOH_FORMS[0].id);
  const [periodType, setPeriodType] = useState("monthly"); // monthly | quarterly
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
        setError("Failed to fetch report data.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while generating the report.");
    }
    setLoading(false);
  }

  function handleExportExcel() {
    if (!data) return;
    const tableElement = document.getElementById("report-table");
    if (!tableElement) return;
    const wb = XLSX.utils.table_to_book(tableElement, { sheet: "Report" });
    const periodLabel = isQuarterly ? `Q${quarter}_${year}` : `${month}_${year}`;
    XLSX.writeFile(wb, `MTRC_Report_${selectedForm}_${periodLabel}.xlsx`);
  }

  function handlePrint() {
    window.print();
  }

  const renderTable = () => {
    if (!data) return null;

    // Render logic per form type
    switch (selectedForm) {
      case "doh-form-4-1":
        return (
          <table id="report-table" className="doh-table">
            <thead>
              <tr>
                <th>Gender</th>
                <th>Court Status</th>
                <th>Modality</th>
                <th>New Admissions</th>
                <th>Readmissions</th>
                <th>Active Cases</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i}>
                  <td>{r.gender || 'Unknown'}</td>
                  <td>{r.court_status}</td>
                  <td>{r.modality}</td>
                  <td>{r.new_admissions}</td>
                  <td>{r.readmissions}</td>
                  <td>{r.active_cases}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "doh-form-4-2":
        return (
          <table id="report-table" className="doh-table">
            <thead>
              <tr>
                <th>Service Type</th>
                <th>Total Rendered</th>
              </tr>
            </thead>
            <tbody>
              {data.attendance.map((a, i) => (
                <tr key={i}>
                  <td>{a.session_type}</td>
                  <td>{a.count}</td>
                </tr>
              ))}
              <tr>
                <td>Surveillance Drug Tests</td>
                <td>{data.drugTests}</td>
              </tr>
            </tbody>
          </table>
        );
      case "doh-form-10-1":
        return (
          <table id="report-table" className="doh-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Cohort Size (Enrolled 7 months prior: {data.cohortStartFmt} to {data.cohortEndFmt})</td>
                <td>{data.cohort_size}</td>
              </tr>
              <tr>
                <td>Actual Completers this Quarter</td>
                <td>{data.completers}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Quarterly Completion Rate (%)</td>
                <td style={{ fontWeight: 'bold' }}>{data.rate.toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
        );
      case "doh-form-11":
        return (
          <table id="report-table" className="doh-table">
            <thead>
              <tr>
                <th>Time Window</th>
                <th>Positive (+)</th>
                <th>Negative (-)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Window 1: 1–60 Days</td>
                <td>{data.window1.positive}</td>
                <td>{data.window1.negative}</td>
              </tr>
              <tr>
                <td>Window 2: 61–120 Days</td>
                <td>{data.window2.positive}</td>
                <td>{data.window2.negative}</td>
              </tr>
              <tr>
                <td>Window 3: 121–180 Days</td>
                <td>{data.window3.positive}</td>
                <td>{data.window3.negative}</td>
              </tr>
              <tr>
                <td>Window 4: Beyond 180 Days (Includes Month 7)</td>
                <td>{data.window4.positive}</td>
                <td>{data.window4.negative}</td>
              </tr>
            </tbody>
          </table>
        );
      default:
        // Generic JSON dumper for simpler forms
        if (Array.isArray(data) && data.length > 0) {
          const keys = Object.keys(data[0]);
          return (
            <table id="report-table" className="doh-table">
              <thead>
                <tr>{keys.map(k => <th key={k}>{k.replace(/_/g, ' ').toUpperCase()}</th>)}</tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={i}>
                    {keys.map(k => <td key={k}>{r[k] !== null && r[k] !== undefined ? String(r[k]) : '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        } else if (typeof data === 'object' && !Array.isArray(data)) {
           const keys = Object.keys(data);
           return (
             <table id="report-table" className="doh-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {keys.map(k => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td>{data[k]}</td>
                  </tr>
                ))}
              </tbody>
             </table>
           )
        }
        return <div style={{ padding: 20 }}>No data to display.</div>;
    }
  };

  return (
    <AppShell title="DOH Reports Automation" description="Generate, print, and export statutory DOH forms.">
      <p className="no-print" style={{ margin: "0 0 12px", fontSize: 13 }}>
        <Link to="/reports/op-cm-tracker" style={{ color: "var(--color-primary-dark)", fontWeight: 700 }}>
          Open OP CM Tracker (Monthly Intervention)
        </Link>
      </p>
      <div className="no-print" style={styles.controlBar}>
        <div style={styles.filters}>
          <label style={styles.label}>
            Select Report
            <select style={styles.select} value={selectedForm} onChange={e => setSelectedForm(e.target.value)}>
              {DOH_FORMS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>

          <label style={styles.label}>
            Year
            <select style={styles.select} value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>

          {isQuarterly ? (
            <label style={styles.label}>
              Quarter
              <select style={styles.select} value={quarter} onChange={e => setQuarter(Number(e.target.value))}>
                {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
              </select>
            </label>
          ) : (
            <label style={styles.label}>
              Month
              <select style={styles.select} value={month} onChange={e => setMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
            </label>
          )}

          <button style={styles.generateBtn} onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>

        <div style={styles.actions}>
          <button style={styles.exportBtn} onClick={handleExportExcel} disabled={!data}>Export to Excel</button>
          <button style={styles.printBtn} onClick={handlePrint} disabled={!data}>Print / PDF</button>
        </div>
      </div>

      {error && <div style={{ color: 'red', marginBottom: 15 }}>{error}</div>}

      <div style={styles.reportContainer} className="print-area">
        {data && (
          <div className="print-header" style={{ display: 'none', textAlign: 'center', marginBottom: 20 }}>
            <h2>Malinao Treatment and Rehabilitation Center (MTRC)</h2>
            <h3>ENTREPOSE - Patient Monitoring Information System</h3>
            <h4>{DOH_FORMS.find(f => f.id === selectedForm)?.name}</h4>
            <p>Period: {isQuarterly ? `Q${quarter} ${year}` : `${month}/${year}`}</p>
          </div>
        )}

        {renderTable()}

        {data && (
          <div className="print-footer" style={{ display: 'none', marginTop: 50, paddingTop: 20, borderTop: '1px solid #ccc' }}>
            <p>Prepared By: HIM Staff / Case Manager</p>
            <p>Noted By: _______________</p>
          </div>
        )}
      </div>

      <style>{`
        .doh-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 14px;
        }
        .doh-table th, .doh-table td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }
        .doh-table th {
          background-color: var(--color-primary-tint);
          color: var(--color-primary-dark);
          font-weight: bold;
        }
        @media print {
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
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
          }
          .no-print { display: none !important; }
          .print-header, .print-footer { display: block !important; }
        }
      `}</style>
    </AppShell>
  );
}

const styles = {
  controlBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 15,
    background: 'var(--color-surface)', padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)',
    marginBottom: 20
  },
  filters: { display: 'flex', gap: 15, flexWrap: 'wrap', alignItems: 'flex-end' },
  label: { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, fontWeight: 'bold', color: 'var(--color-text-muted)' },
  select: { padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', minWidth: 150 },
  generateBtn: { padding: '9px 20px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: 'pointer' },
  actions: { display: 'flex', gap: 10 },
  exportBtn: { padding: '9px 15px', background: '#217346', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: 'pointer' },
  printBtn: { padding: '9px 15px', background: 'var(--color-text)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: 'pointer' },
  reportContainer: { background: 'white', padding: 30, borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', minHeight: 400 }
};
