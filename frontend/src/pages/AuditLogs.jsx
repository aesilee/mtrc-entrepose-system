import { useEffect, useState } from "react";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";
import EmptyState from "../components/EmptyState.jsx";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/audit-logs/actors").then(({ data }) => setActors(data.actors));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (userFilter !== "all") params.user = userFilter;
    if (actionFilter) params.action = actionFilter;
    if (dateFilter) params.date = dateFilter;
    if (search) params.search = search;

    const t = setTimeout(() => {
      api.get("/audit-logs", { params }).then(({ data }) => {
        setLogs(data.logs);
        setLoading(false);
      });
    }, 300);

    return () => clearTimeout(t);
  }, [userFilter, actionFilter, dateFilter, search]);

  function clearFilters() {
    setUserFilter("all"); setActionFilter(""); setDateFilter(""); setSearch("");
  }
  const hasFilters = userFilter !== "all" || actionFilter || dateFilter || search;

  return (
    <AppShell title="Audit Logs" description="Track logins, updates, and record changes across the system.">
      <div style={styles.filterBar}>
        <input style={styles.searchInput} placeholder="Search actions or usernames…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select style={styles.select} value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
          <option value="all">All users</option>
          {actors.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input style={styles.select} placeholder="Filter by action keyword…" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} />
        <input type="date" style={styles.select} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        {hasFilters && <button style={styles.clearBtn} onClick={clearFilters}>Clear filters</button>}
      </div>

      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.loading}>Loading…</div>
        ) : logs.length === 0 ? (
          <EmptyState title="No audit entries found" description="Try adjusting your filters or search." />
        ) : (
          <table style={styles.table}>
            <thead>
              <tr><th style={styles.th}>Timestamp</th><th style={styles.th}>User</th><th style={styles.th}>Action</th></tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={styles.td}>{new Date(log.created_at).toLocaleString()}</td>
                  <td style={styles.td}>{log.actor_username}</td>
                  <td style={styles.td}>{log.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}

const styles = {
  filterBar: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 },
  searchInput: { flex: 2, minWidth: 220, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13 },
  select: { flex: 1, minWidth: 160, padding: "9px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13 },
  clearBtn: { background: "none", border: "1px solid var(--color-border)", padding: "9px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  tableCard: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" },
  loading: { padding: 40, textAlign: "center", color: "var(--color-text-muted)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-muted)", padding: "12px 20px", borderBottom: "1px solid var(--color-border)" },
  td: { padding: "12px 20px", fontSize: 13, borderBottom: "1px solid var(--color-border)" },
};