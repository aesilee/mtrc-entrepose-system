import { useEffect, useState } from "react";
import AppShell from "../components/AppShell.jsx";
import api from "../api/axios.js";
import EmptyState from "../components/EmptyState.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function fmtDateTime(d) { return d ? new Date(d).toLocaleString() : "—"; }

export default function Archives() {
  const { user } = useAuth();
  const canManage = user.role === "ict_admin";

  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    api.get("/archives").then(({ data }) => setArchives(data.archives)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const filtered = archives.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (a.entity_label || "").toLowerCase().includes(q) || (a.archived_by_name || "").toLowerCase().includes(q);
  });

  async function handleRestore(a) {
    if (!window.confirm(`Restore "${a.entity_label}" from archives?`)) return;
    setBusyId(a.id);
    setError("");
    try {
      await api.post(`/archives/patients/${a.entity_id}/restore`);
      setNotice("Record restored.");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not restore this record.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell
      title="Archives"
      description={
        canManage
          ? "Archived patient records. Restore a record to bring it back into active use."
          : user.role === "case_manager"
          ? "Archived records for patients assigned to you."
          : "Archived patient records (read-only)."
      }
    >
      <div style={styles.filterBar}>
        <input
          style={styles.searchInput}
          placeholder="Search by name or who archived it…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {notice && <div style={styles.notice}>{notice}</div>}
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.loading}>Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No archived records" description="Nothing has been archived yet." />
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Record</th>
                <th style={styles.th}>Reason</th>
                <th style={styles.th}>Archived by</th>
                <th style={styles.th}>Archived on</th>
                {canManage && <th style={styles.th}></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td style={styles.td}>{a.entity_label}</td>
                  <td style={styles.td}>{a.reason || "—"}</td>
                  <td style={styles.td}>{a.archived_by_name || a.archived_by_username || "—"}</td>
                  <td style={styles.td}>{fmtDateTime(a.archived_at)}</td>
                  {canManage && (
                    <td style={styles.td}>
                      <button type="button" style={styles.restoreBtn} onClick={() => handleRestore(a)} disabled={busyId === a.id}>
                        {busyId === a.id ? "Restoring…" : "Restore"}
                      </button>
                    </td>
                  )}
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
  filterBar: { display: "flex", gap: 10, marginBottom: 20 },
  searchInput: { flex: 1, maxWidth: 400, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 13 },
  notice: { background: "var(--color-primary-tint)", color: "var(--color-primary-dark)", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, marginBottom: 16 },
  error: { background: "#FDE2E2", color: "#B3261E", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, marginBottom: 16 },
  tableCard: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" },
  loading: { padding: 40, textAlign: "center", color: "var(--color-text-muted)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-muted)", padding: "12px 20px", borderBottom: "1px solid var(--color-border)" },
  td: { padding: "12px 20px", fontSize: 13, borderBottom: "1px solid var(--color-border)" },
  restoreBtn: { background: "none", border: "1px solid var(--color-border)", padding: "6px 12px", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 600, cursor: "pointer" },
};