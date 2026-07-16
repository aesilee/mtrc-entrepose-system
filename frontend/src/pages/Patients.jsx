import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AppShell from "../components/AppShell.jsx";
import EmptyState from "../components/EmptyState.jsx";
import api from "../api/axios.js";

const iconProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

const STATUS_COLORS = {
  pending: { bg: "#FFF3D6", color: "#9A6B00" },
  active: { bg: "var(--color-primary-tint)", color: "var(--color-primary-dark)" },
  completed: { bg: "#E1F0FF", color: "#0B5FA5" },
  dropped: { bg: "#FDE2E2", color: "#B3261E" },
  transferred: { bg: "#EDEAFB", color: "#5B3EC9" },
};

export default function Patients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canRegister = ["admitting", "ict_admin"].includes(user.role);

  const [patients, setPatients] = useState([]);
  const [caseManagers, setCaseManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [caseManagerFilter, setCaseManagerFilter] = useState("");
  const [municipalityFilter, setMunicipalityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    api.get("/patients").then(({ data }) => setPatients(data.patients)).finally(() => setLoading(false));
    api.get("/users/case-managers").then(({ data }) => setCaseManagers(data.caseManagers));
  }, []);

  const municipalities = useMemo(() => {
    const set = new Set(patients.map((p) => p.municipality).filter(Boolean));
    return [...set].sort();
  }, [patients]);

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        const matches =
          p.full_name?.toLowerCase().includes(q) || p.patient_code?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (statusFilter && p.enrollment_status !== statusFilter) return false;
      if (genderFilter && p.gender !== genderFilter) return false;
      if (caseManagerFilter && String(p.case_manager_id) !== caseManagerFilter) return false;
      if (municipalityFilter && p.municipality !== municipalityFilter) return false;
      if (dateFrom && (!p.admission_date || p.admission_date < dateFrom)) return false;
      if (dateTo && (!p.admission_date || p.admission_date > dateTo)) return false;
      return true;
    });
  }, [patients, search, statusFilter, genderFilter, caseManagerFilter, municipalityFilter, dateFrom, dateTo]);

  const activeFilterCount = [statusFilter, genderFilter, caseManagerFilter, municipalityFilter, dateFrom, dateTo].filter(Boolean).length;

  function clearFilters() {
    setStatusFilter("");
    setGenderFilter("");
    setCaseManagerFilter("");
    setMunicipalityFilter("");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <AppShell title="Patients" description="Manage patient records, admissions, and registrations.">
      <div style={{ ...styles.wrapper, height: "100%" }}>
        <div style={styles.toolbar}>
          <div style={styles.leftControls}>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                style={styles.filterBtn}
                onClick={() => setFiltersOpen((v) => !v)}
              >
                <svg {...iconProps} width="15" height="15">
                  <path d="M4 6h16M7 12h10M10 18h4" />
                </svg>
                Filters
                {activeFilterCount > 0 && <span style={styles.filterCount}>{activeFilterCount}</span>}
              </button>

              {filtersOpen && (
                <>
                  <div style={styles.menuBackdrop} onClick={() => setFiltersOpen(false)} />
                  <div style={styles.filterPanel}>
                    <div style={styles.filterPanelHeader}>
                      <span>Filters</span>
                      {activeFilterCount > 0 && (
                        <button type="button" style={styles.clearBtn} onClick={clearFilters}>Clear all</button>
                      )}
                    </div>

                    <label style={styles.filterLabel}>
                      Status
                      <select style={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="dropped">Dropped</option>
                        <option value="transferred">Transferred</option>
                      </select>
                    </label>

                    <label style={styles.filterLabel}>
                      Gender
                      <select style={styles.filterSelect} value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
                        <option value="">All genders</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </label>

                    <label style={styles.filterLabel}>
                      Case manager
                      <select style={styles.filterSelect} value={caseManagerFilter} onChange={(e) => setCaseManagerFilter(e.target.value)}>
                        <option value="">All case managers</option>
                        {caseManagers.map((cm) => (
                          <option key={cm.id} value={cm.id}>{cm.full_name}</option>
                        ))}
                      </select>
                    </label>

                    <label style={styles.filterLabel}>
                      Municipality
                      <select style={styles.filterSelect} value={municipalityFilter} onChange={(e) => setMunicipalityFilter(e.target.value)}>
                        <option value="">All municipalities</option>
                        {municipalities.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </label>

                    <label style={styles.filterLabel}>
                      Admission date range
                      <div style={styles.dateRange}>
                        <input type="date" style={styles.dateInput} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                        <span style={styles.dateSep}>–</span>
                        <input type="date" style={styles.dateInput} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                      </div>
                    </label>

                    <button type="button" style={styles.clearFooterBtn} onClick={clearFilters}>
                      Clear filters
                    </button>
                  </div>
                </>
              )}
            </div>

            <div style={styles.searchBox}>
              <svg {...iconProps} width="16" height="16" style={styles.searchIcon}>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                style={styles.searchInput}
                placeholder="Search by name or patient ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {canRegister && (
            <button type="button" style={styles.registerBtn} onClick={() => navigate("/patients/register")}>
              + Register Patient
            </button>
          )}
        </div>

        <div style={{ ...styles.tableCard, flex: 1, minHeight: 0 }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Patient ID</th>
                <th style={styles.th}>Full Name</th>
                <th style={styles.th}>Gender</th>
                <th style={styles.th}>Municipality</th>
                <th style={styles.th}>Admission Date</th>
                <th style={styles.th}>Case Manager</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Attendance</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td style={styles.emptyCell} colSpan={9}>Loading patients…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                          <circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.5 2.9-6 5.5-6s5.5 2.5 5.5 6" /><circle cx="17" cy="8" r="2.6" />
                        </svg>
                      }
                      title="No patients found"
                      description={search || statusFilter || genderFilter || caseManagerFilter || municipalityFilter || dateFrom || dateTo
                        ? "No patients match your current search or filters. Try adjusting them."
                        : "Once patients are registered, they'll show up here."}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const statusStyle = STATUS_COLORS[p.enrollment_status] || STATUS_COLORS.pending;
                  return (
                    <tr key={p.id} style={styles.row} onClick={() => navigate(`/patients/${p.id}`)}>
                      <td style={styles.td}>{p.patient_code}</td>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{p.full_name}</td>
                      <td style={{ ...styles.td, textTransform: "capitalize" }}>{p.gender}</td>
                      <td style={styles.td}>{p.municipality || "—"}</td>
                      <td style={styles.td}>{p.admission_date ? p.admission_date.slice(0, 10) : "—"}</td>
                      <td style={styles.td}>{p.case_manager_name || "Unassigned"}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.statusBadge, background: statusStyle.bg, color: statusStyle.color }}>
                          {p.enrollment_status}
                        </span>
                      </td>
                      <td style={styles.td}>{p.attendance_rate !== null ? `${p.attendance_rate}%` : "—"}</td>
                      <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                        <RowMenu
                          patientId={p.id}
                          isOpen={openMenuId === p.id}
                          onToggle={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}
                          onClose={() => setOpenMenuId(null)}
                          navigate={navigate}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function RowMenu({ patientId, isOpen, onToggle, onClose, navigate }) {
  const btnRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  function handleToggle() {
    if (!isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: rect.right - 140 });
    }
    onToggle();
  }

  return (
    <div style={{ position: "relative" }}>
      <button ref={btnRef} type="button" style={styles.menuBtn} onClick={handleToggle}>
        <svg {...iconProps} width="16" height="16">
          <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {isOpen &&
        createPortal(
          <>
            <div style={styles.menuBackdrop} onClick={onClose} />
            <div style={{ ...styles.menuPanel, position: "fixed", top: coords.top, left: coords.left }}>
              <button type="button" style={styles.menuItem} onClick={() => { onClose(); navigate(`/patients/${patientId}`); }}>
                View
              </button>
              <button type="button" style={{ ...styles.menuItem, color: "var(--color-danger, #B3261E)" }} disabled title="Coming soon">
                Archive
              </button>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

const styles = {
  wrapper: { display: "flex", flexDirection: "column", gap: 16 },
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  leftControls: { display: "flex", alignItems: "center", gap: 10, flex: 1 },
  filterBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "9px 14px",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--color-text)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  filterCount: {
    background: "var(--color-primary)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 999,
    padding: "1px 7px",
  },
  filterPanel: {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md, 10px)",
    boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
    padding: 16,
    width: 280,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    zIndex: 40,
  },
  filterPanelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 13,
    fontWeight: 700,
    color: "var(--color-text)",
    paddingBottom: 8,
    borderBottom: "1px solid var(--color-border)",
  },
  filterLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--color-text-muted)",
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "8px 12px",
    flex: 1,
    maxWidth: 380,
  },
  searchIcon: { color: "var(--color-text-muted)", flexShrink: 0 },
  searchInput: { border: "none", outline: "none", fontSize: 14, width: "100%", background: "transparent" },
  registerBtn: {
    background: "var(--color-primary)",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "var(--radius-sm)",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  filterSelect: {
    padding: "8px 10px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    fontSize: 13,
    background: "var(--color-surface)",
    width: "100%",
    boxSizing: "border-box",
  },
  dateRange: { display: "flex", alignItems: "center", gap: 6, width: "100%" },
  dateInput: {
    padding: "8px 8px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    fontSize: 12,
    background: "var(--color-surface)",
    flex: 1,
    minWidth: 0,
    boxSizing: "border-box",
  },
  dateSep: { color: "var(--color-text-muted)", flexShrink: 0 },
  clearBtn: {
    background: "none",
    border: "none",
    color: "var(--color-primary-dark)",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
  },
  clearFooterBtn: {
    marginTop: 4,
    background: "var(--color-primary-tint)",
    color: "var(--color-primary-dark)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    padding: "9px 0",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
  },
  tableCard: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md, 10px)",
    overflow: "auto",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "var(--color-text-muted)",
    borderBottom: "1px solid var(--color-border)",
    whiteSpace: "nowrap",
  },
  row: { cursor: "pointer" },
  td: {
    padding: "12px 16px",
    borderBottom: "1px solid var(--color-border)",
    color: "var(--color-text)",
    whiteSpace: "nowrap",
  },
  emptyCell: { padding: 32, textAlign: "center", color: "var(--color-text-muted)" },
  statusBadge: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "capitalize",
    padding: "4px 10px",
    borderRadius: 999,
  },
  menuBtn: {
    width: 28,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "none",
    border: "none",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text-muted)",
    cursor: "pointer",
  },
  menuBackdrop: { position: "fixed", inset: 0, zIndex: 9998 },
  menuPanel: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.15)",
    minWidth: 140,
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    padding: 4,
  },
  menuItem: {
    textAlign: "left",
    background: "none",
    border: "none",
    padding: "8px 10px",
    fontSize: 13,
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
  },
};