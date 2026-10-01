import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";

const iconProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

export default function Discharges() {
  const navigate = useNavigate();
  const [discharges, setDischarges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadDischarges();
  }, []);

  function loadDischarges() {
    setLoading(true);
    api.get("/discharges")
      .then((res) => setDischarges(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Error loading discharges:", err))
      .finally(() => setLoading(false));
  }

  const completerCount = useMemo(() => {
    return discharges.filter((d) => /complete|graduat/i.test(d.discharge_type || "")).length;
  }, [discharges]);

  const droppedCount = useMemo(() => {
    return discharges.filter((d) => !/complete|graduat/i.test(d.discharge_type || "")).length;
  }, [discharges]);

  const filteredDischarges = useMemo(() => {
    return discharges.filter((d) => {
      const isCompleter = /complete|graduat/i.test(d.discharge_type || "");
      if (statusFilter === "completed" && !isCompleter) return false;
      if (statusFilter === "dropped" && isCompleter) return false;

      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const nameMatch = d.full_name?.toLowerCase().includes(query);
        const codeMatch = d.patient_code?.toLowerCase().includes(query);
        const reasonMatch = d.remarks?.toLowerCase().includes(query) || d.discharge_type?.toLowerCase().includes(query);
        return nameMatch || codeMatch || reasonMatch;
      }
      return true;
    });
  }, [discharges, statusFilter, search]);

  return (
    <AppShell
      title="Discharged Patients"
      description="View and manage clients discharged from the MTRC ENTREPOSE Outpatient Program."
    >
      <div style={styles.wrapper}>
        {/* KPI Metrics Row — Outpatient Only */}
        <div style={styles.kpiRow}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiIcon}>
              <svg {...iconProps} width="20" height="20">
                <path d="M12 2v20M2 12h20" />
              </svg>
            </div>
            <div>
              <div style={styles.kpiValue}>{discharges.length}</div>
              <div style={styles.kpiLabel}>Total Outpatient Discharges</div>
            </div>
          </div>

          <div style={styles.kpiCard}>
            <div style={{ ...styles.kpiIcon, background: "#E8F1FC", color: "#185ABC" }}>
              <svg {...iconProps} width="20" height="20">
                <path d="M9 12l2 2 4-4M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
              </svg>
            </div>
            <div>
              <div style={styles.kpiValue}>{completerCount}</div>
              <div style={styles.kpiLabel}>Completers (Graduated)</div>
            </div>
          </div>

          <div style={styles.kpiCard}>
            <div style={{ ...styles.kpiIcon, background: "#FCE8E6", color: "#C5221F" }}>
              <svg {...iconProps} width="20" height="20">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </div>
            <div>
              <div style={styles.kpiValue}>{droppedCount}</div>
              <div style={styles.kpiLabel}>Dropped / Non-Compliance</div>
            </div>
          </div>
        </div>

        {/* Toolbar with Search and Status Filter */}
        <div style={styles.toolbar}>
          <div style={styles.searchBox}>
            <svg {...iconProps} width="16" height="16" style={styles.searchIcon}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              style={styles.searchInput}
              placeholder="Search discharged patient by name, patient ID, or remarks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select
              style={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Outpatient Discharges</option>
              <option value="completed">Completers (Graduated)</option>
              <option value="dropped">Dropped / Non-compliance</option>
            </select>
          </div>
        </div>

        {/* Discharge Table */}
        <div style={{ ...styles.tableCard, flex: 1, minHeight: 0 }}>
          {loading ? (
            <div style={styles.emptyState}>Loading discharge records…</div>
          ) : filteredDischarges.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                <svg {...iconProps} width="24" height="24">
                  <path d="M9 12l2 2 4-4M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
                </svg>
              </div>
              <div style={styles.emptyTitle}>No outpatient discharge records found</div>
              <div style={styles.emptySubtitle}>
                {search || statusFilter !== "all"
                  ? "No records match the current filter or search criteria."
                  : "Discharged outpatient clients will show up here."}
              </div>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: "30%" }}>Patient</th>
                  <th style={{ ...styles.th, width: "22%" }}>Discharge Status</th>
                  <th style={{ ...styles.th, width: "16%" }}>Discharge Date</th>
                  <th style={{ ...styles.th, width: "16%" }}>Discharged By</th>
                  <th style={{ ...styles.th, width: "16%" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDischarges.map((d) => {
                  const isCompleter = /complete|graduat/i.test(d.discharge_type || "");
                  return (
                    <tr
                      key={d.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate(`/patients/${d.patient_id}`)}
                    >
                      <td style={{ ...styles.td, fontWeight: 600 }}>
                        <div style={{ color: "var(--color-text)" }}>{d.full_name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", fontWeight: 500 }}>
                          {d.patient_code || "—"}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            background: isCompleter ? "#E1F0FF" : "#FDE2E2",
                            color: isCompleter ? "#0B5FA5" : "#B3261E",
                          }}
                        >
                          {d.discharge_type || "Outpatient Discharge"}
                        </span>
                        {d.remarks && (
                          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 4 }}>
                            {d.remarks}
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>
                        {d.discharge_date ? new Date(d.discharge_date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                      </td>
                      <td style={styles.td}>{d.discharged_by || "Staff"}</td>
                      <td style={styles.td}>
                        <button
                          type="button"
                          style={styles.viewBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/patients/${d.patient_id}`);
                          }}
                        >
                          View Profile →
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm, 6px)",
    padding: "6px 12px",
    flex: 1,
    minWidth: 260,
  },
  searchIcon: { color: "var(--color-text-muted)", flexShrink: 0 },
  searchInput: {
    border: "none",
    background: "transparent",
    fontSize: 13,
    fontFamily: "inherit",
    width: "100%",
    outline: "none",
    color: "var(--color-text)",
  },
  filterSelect: {
    padding: "8px 12px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm, 6px)",
    background: "var(--color-surface)",
    fontSize: 13,
    fontFamily: "inherit",
    color: "var(--color-text)",
    cursor: "pointer",
  },
  tableCard: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md, 10px)",
    overflow: "auto",
  },
  table: { width: "100%", minWidth: 700, borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "var(--color-text-muted)",
    borderBottom: "1px solid var(--color-border)",
    background: "var(--color-surface)",
  },
  td: {
    padding: "12px 16px",
    borderBottom: "1px solid var(--color-border)",
    color: "var(--color-text)",
    verticalAlign: "middle",
  },
  statusBadge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "999px",
    fontSize: 12,
    fontWeight: 600,
  },
  viewBtn: {
    padding: "5px 10px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm, 6px)",
    background: "var(--color-surface)",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
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