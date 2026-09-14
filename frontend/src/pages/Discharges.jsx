import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";

const PROGRAM_TYPES = [
  { key: "residential", label: "Residential" },
  { key: "outpatient", label: "Outpatient" },
  { key: "aftercare", label: "Aftercare" },
  { key: "medical_detox", label: "Medical Detox" },
];

const ICONS = {
  total: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M9 12l2 2 4-4M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
    </svg>
  ),
  residential: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M3 12l9-9 9 9M5 10v10h14V10" />
    </svg>
  ),
  outpatient: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M12 2v20M2 12h20" />
    </svg>
  ),
  aftercare: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 10-7.78 7.78L12 21l8.84-8.61a5.5 5.5 0 000-7.78z" />
    </svg>
  ),
  medical_detox: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M2 12h6m8 0h6M4.93 19.07l4.24-4.24m5.66-5.66l4.24-4.24" />
    </svg>
  ),
};

export default function Discharges() {
  const [discharges, setDischarges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState([]);

  useEffect(() => {
    loadDischarges();
  }, []);

  function loadDischarges() {
    setLoading(true);
    api.get("/discharges")
      .then((res) => setDischarges(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }

  function toggleFilter(key) {
    setActiveFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  const filteredDischarges = useMemo(() => {
    if (activeFilters.length === 0) return discharges;
    return discharges.filter((d) => activeFilters.includes(d.program_type));
  }, [discharges, activeFilters]);

  return (
    <AppShell
      title="Discharged Patients"
      description="View and filter patients discharged from residential, outpatient, aftercare, or medical detox programs."
    >
      <div style={styles.wrapper}>

        <div style={styles.kpiRow}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiIcon}>{ICONS.total}</div>
            <div>
              <div style={styles.kpiValue}>{discharges.length}</div>
              <div style={styles.kpiLabel}>Total Discharged</div>
            </div>
          </div>
          {PROGRAM_TYPES.map((type) => {
            const count = discharges.filter((d) => d.program_type === type.key).length;
            return (
              <div key={type.key} style={styles.kpiCard}>
                <div style={styles.kpiIcon}>{ICONS[type.key]}</div>
                <div>
                  <div style={styles.kpiValue}>{count}</div>
                  <div style={styles.kpiLabel}>{type.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.toolbar}>
          <div style={styles.filterGroup}>
            {PROGRAM_TYPES.map((type) => {
              const active = activeFilters.includes(type.key);
              return (
                <label
                  key={type.key}
                  style={{ ...styles.filterChip, ...(active ? styles.filterChipActive : {}) }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleFilter(type.key)}
                    style={{ accentColor: "var(--color-primary)" }}
                  />
                  {type.label}
                </label>
              );
            })}
          </div>
        </div>

        <div style={{ ...styles.tableCard, flex: 1, minHeight: 0 }}>
          {loading ? (
            <div style={styles.emptyState}>Loading discharge records...</div>
          ) : filteredDischarges.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>{ICONS.total}</div>
              <div style={styles.emptyTitle}>No discharge records found</div>
              <div style={styles.emptySubtitle}>Discharged patients will show up here.</div>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Patient</th>
                  <th style={styles.th}>Program</th>
                  <th style={styles.th}>Discharge Type</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Discharged By</th>
                </tr>
              </thead>
              <tbody>
                {filteredDischarges.map((d) => (
                  <tr key={d.id}>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{d.full_name}</td>
                    <td style={styles.td}>
                      <span style={styles.programBadge}>
                        {d.program_type.replace("_", " ")}
                      </span>
                    </td>
                    <td style={styles.td}>{d.discharge_type}</td>
                    <td style={styles.td}>{new Date(d.discharge_date).toLocaleDateString()}</td>
                    <td style={styles.td}>{d.discharged_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}

const styles = {
  wrapper: { display: "flex", flexDirection: "column", gap: 16, height: "100%" },
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
  },
  kpiCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md, 10px)",
    padding: 16,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: "var(--radius-sm)",
    background: "var(--color-primary-tint)",
    color: "var(--color-primary-dark)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  kpiValue: { fontSize: 22, fontWeight: 800, color: "var(--color-text)" },
  kpiLabel: { fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 },
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  filterGroup: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  filterChip: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--color-text)",
    cursor: "pointer",
  },
  filterChipActive: {
    background: "var(--color-primary-tint)",
    borderColor: "var(--color-primary)",
    color: "var(--color-primary-dark)",
  },
  tableCard: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md, 10px)",
    overflow: "auto",
  },
  table: { width: "100%", minWidth: 760, tableLayout: "fixed", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "var(--color-text-muted)",
    borderBottom: "1px solid var(--color-border)",
  },
  td: {
    padding: "12px 16px",
    borderBottom: "1px solid var(--color-border)",
    color: "var(--color-text)",
    wordBreak: "break-word",
    verticalAlign: "top",
  },
  programBadge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "999px",
    fontSize: 12,
    fontWeight: 600,
    textTransform: "capitalize",
    background: "var(--color-primary-tint)",
    color: "var(--color-primary-dark)",
  },
  emptyState: {
    padding: 48,
    textAlign: "center",
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "var(--color-primary-tint)",
    color: "var(--color-primary-dark)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 14px",
  },
  emptyTitle: { fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: "var(--color-text-muted)" },
};