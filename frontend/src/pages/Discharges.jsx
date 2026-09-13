import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";

const PROGRAM_TYPES = [
  { key: "residential", label: "Residential" },
  { key: "outpatient", label: "Outpatient" },
  { key: "aftercare", label: "Aftercare" },
  { key: "medical_detox", label: "Medical Detox" },
];

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
            <div style={styles.emptyState}>No discharge records found.</div>
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
    color: "var(--color-text-muted)",
    fontSize: 14,
  },
};