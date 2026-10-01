import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AppShell from "../components/AppShell.jsx";
import EmptyState from "../components/EmptyState.jsx";
import api from "../api/axios.js";
import useViewport from "../hooks/useViewport.js";
import ArchiveConfirmModal from "../components/ArchiveConfirmModal.jsx";
import Toast from "../components/Toast.jsx";

const iconProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

const STATUS_COLORS = {
  pending: { bg: "#FFF3D6", color: "#9A6B00" },
  active: { bg: "var(--color-primary-tint)", color: "var(--color-primary-dark)" },
  completed: { bg: "#E1F0FF", color: "#0B5FA5" },
  dropped: { bg: "#FDE2E2", color: "#B3261E" },
  transferred: { bg: "#EDEAFB", color: "#5B3EC9" },
};

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "dropped", label: "Dropped" },
  { key: "pending", label: "Pending" },
];

const FLAG_STYLES = {
  blue: {
    bg: "#E8F1FC",
    color: "#185ABC",
    border: "#B9D7F9",
    dot: "#1A73E8",
  },
  amber: {
    bg: "#FEF7E0",
    color: "#B06000",
    border: "#FDE293",
    dot: "#F9AB00",
  },
  red: {
    bg: "#FCE8E6",
    color: "#C5221F",
    border: "#FAD2CF",
    dot: "#D93025",
  },
};

const REFERRAL_STATUS = {
  draft: { label: "Draft", bg: "#EDEAFB", color: "#5B3EC9" },
  ready_for_intake: { label: "Drug history next", bg: "#FFF3D6", color: "#9A6B00" },
  returned_for_correction: { label: "Needs correction", bg: "#FDE2E2", color: "#B3261E" },
  intake_in_progress: { label: "Intake in progress", bg: "#E1F0FF", color: "#0B5FA5" },
  intake_completed: { label: "Registration complete", bg: "var(--color-primary-tint)", color: "var(--color-primary-dark)" },
};

function getInitials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "—";
}

function RowAvatar({ name, photoUrl }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name} style={{ ...styles.rowAvatar, objectFit: "cover" }} />;
  }
  return <span style={styles.rowAvatar}>{getInitials(name)}</span>;
}

export default function Patients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canRegister = ["admitting", "ict_admin"].includes(user.role);

  const [patients, setPatients] = useState([]);
  const [caseManagers, setCaseManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { isMobile } = useViewport();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [caseManagerFilter, setCaseManagerFilter] = useState("");
  const [municipalityFilter, setMunicipalityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [flagFilter, setFlagFilter] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [municipalities, setMunicipalities] = useState([]);

  function loadPatients(targetPage = page, targetLimit = limit) {
    setLoading(true);
    const params = {
      page: targetPage,
      limit: targetLimit,
    };
    if (search.trim()) params.search = search.trim();
    if (statusFilter) params.status = statusFilter;
    if (genderFilter) params.gender = genderFilter;
    if (caseManagerFilter) params.caseManagerId = caseManagerFilter;
    if (municipalityFilter) params.municipality = municipalityFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (flagFilter) params.flag = flagFilter;

    api.get("/patients", { params })
      .then(({ data }) => {
        setPatients(data.patients || []);
        if (data.pagination) {
          setTotal(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
          setPage(data.pagination.page);
        }
        if (data.municipalities) {
          setMunicipalities(data.municipalities);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadPatients(1, limit);
    }, 200);
    return () => clearTimeout(t);
  }, [search, statusFilter, genderFilter, caseManagerFilter, municipalityFilter, dateFrom, dateTo, flagFilter, limit]);

  useEffect(() => {
    api.get("/users/case-managers").then(({ data }) => setCaseManagers(data.caseManagers));
  }, []);

  const [archivingPatientId, setArchivingPatientId] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleArchivePatient(reason) {
    await api.post(`/archives/patients/${archivingPatientId}/archive`, { reason });
    setArchivingPatientId(null);
    setToast("Patient archived.");
    loadPatients(page, limit);
  }

  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
    loadPatients(newPage, limit);
  }

  function handleLimitChange(newLimit) {
    setLimit(newLimit);
    setPage(1);
    loadPatients(1, newLimit);
  }

  const activeFilterCount = [statusFilter, genderFilter, caseManagerFilter, municipalityFilter, dateFrom, dateTo, flagFilter].filter(Boolean).length;

  function clearFilters() {
    setStatusFilter("");
    setGenderFilter("");
    setCaseManagerFilter("");
    setMunicipalityFilter("");
    setDateFrom("");
    setDateTo("");
    setFlagFilter("");
  }

  return (
    <AppShell
      title={user.role === "case_manager" ? "My Patients" : "Patients"}
      description={
        user.role === "case_manager"
          ? "View and manage patients assigned to you."
          : "Manage patient records, admissions, and registrations."
      }
    >
      <div style={{ ...styles.wrapper, height: "100%" }}>
        <div style={{ ...styles.toolbar, flexWrap: isMobile ? "wrap" : "nowrap" }}>
          <div style={{ ...styles.leftControls, flexWrap: isMobile ? "wrap" : "nowrap", width: isMobile ? "100%" : "auto" }}>
            <button
              type="button"
              style={styles.dischargedBtn}
              onClick={() => navigate("/patients/discharges")}
            >
              View Discharged Patients
            </button>
            <div style={{ position: "relative", zIndex: filtersOpen ? 50 : 2 }}>
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
                  <div style={styles.filterBackdrop} onClick={() => setFiltersOpen(false)} />
                  <div style={styles.filterPanel} onClick={(e) => e.stopPropagation()}>
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
                      Clinical attention flag
                      <select style={styles.filterSelect} value={flagFilter} onChange={(e) => setFlagFilter(e.target.value)}>
                        <option value="">All patients</option>
                        <option value="any">Has any clinical flag</option>
                        <option value="pdc_ready">Ready for PDC (43 core sessions)</option>
                        <option value="at_risk_absent">At Risk: 2 Consecutive Absences</option>
                        <option value="positive_rdt">Positive Drug Test (Past 30d)</option>
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

        <div style={styles.tabBar}>
          <div style={styles.statusTabs}>
            {STATUS_TABS.map((tab) => {
              const isSelected = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  style={{
                    ...styles.statusTabBtn,
                    ...(isSelected ? styles.statusTabBtnActive : {}),
                  }}
                  onClick={() => setStatusFilter(tab.key)}
                >
                  {tab.label}
                  {isSelected && total > 0 && (
                    <span style={styles.tabBadge}>{total}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ ...styles.tableCard, flex: 1, minHeight: 0 }}>
          <table style={styles.table}>
            <colgroup>
              <col style={{ width: 140 }} />
              <col style={{ width: 280 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 90 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={styles.th}>Patient ID</th>
                <th style={styles.th}>Full Name</th>
                <th style={styles.th}>Gender</th>
                <th style={styles.th}>Municipality</th>
                <th style={styles.th}>Admission Date</th>
                <th style={styles.th}>Case Manager</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Admission Type</th>
                <th style={styles.th}>Category</th>
                <th style={{ ...styles.th, ...styles.actionsTh }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td style={styles.emptyCell} colSpan={10}>Loading patients…</td></tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <EmptyState
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                          <circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.5 2.9-6 5.5-6s5.5 2.5 5.5 6" /><circle cx="17" cy="8" r="2.6" />
                        </svg>
                      }
                      title="No patients found"
                      description={search || statusFilter || genderFilter || caseManagerFilter || municipalityFilter || dateFrom || dateTo || flagFilter
                        ? "No patients match your current search or filters. Try adjusting them."
                        : "Once patients are registered, they'll show up here."}
                    />
                  </td>
                </tr>
              ) : (
                patients.map((p) => {
                  const statusStyle = STATUS_COLORS[p.enrollment_status] || STATUS_COLORS.pending;
                  const referralStyle = REFERRAL_STATUS[p.referral_status];
                  return (
                    <tr key={p.id} style={styles.row} onClick={() => navigate(`/patients/${p.id}`)}>
                      <td style={{ ...styles.td, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.pwud_code || p.patient_code}</td>
                      <td style={{ ...styles.td, fontWeight: 600 }}>
                        <div style={styles.nameCell}>
                          <RowAvatar name={p.full_name} photoUrl={p.photo_url} />
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.full_name}</span>
                            {p.flags && p.flags.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                                {p.flags.map((flag) => {
                                  const flagStyle = FLAG_STYLES[flag.type] || FLAG_STYLES.blue;
                                  return (
                                    <span
                                      key={flag.key}
                                      title={flag.title}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: "2px 6px",
                                        borderRadius: 4,
                                        background: flagStyle.bg,
                                        color: flagStyle.color,
                                        border: `1px solid ${flagStyle.border}`,
                                        lineHeight: 1.2,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: flagStyle.dot }} />
                                      {flag.label}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...styles.td, textTransform: "capitalize" }}>{p.gender}</td>
                      <td style={styles.td}>{p.municipality || "—"}</td>
                      <td style={styles.td}>{p.admission_date ? p.admission_date.slice(0, 10) : "—"}</td>
                      <td style={styles.td}>{p.case_manager_name || "Unassigned"}</td>
                      <td style={styles.td}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                          <span style={{ ...styles.statusBadge, background: statusStyle.bg, color: statusStyle.color }}>
                            {p.enrollment_status}
                          </span>
                          {p.discharge_date && (
                            <span
                              style={styles.dischargeSubtext}
                              title={`Discharged on ${p.discharge_date ? p.discharge_date.slice(0, 10) : ''}${p.discharge_type ? ` — ${p.discharge_type}` : ''}`}
                            >
                              {p.discharge_type || p.discharge_date.slice(0, 10)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        {p.type_of_patient || "—"}
                      </td>
                      <td style={styles.td}>
                        {p.admission_type ? p.admission_type.replace('_', ' ') : "—"}
                      </td>
                      <td style={{ ...styles.td, ...styles.actionsTd }} onClick={(e) => e.stopPropagation()}>
                        <RowMenu
                          patientId={p.id}
                          isPending={p.enrollment_status === "pending" || !p.admission_date}
                          isOpen={openMenuId === p.id}
                          onToggle={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}
                          onClose={() => setOpenMenuId(null)}
                          navigate={navigate}
                          onArchiveClick={() => setArchivingPatientId(p.id)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        <div style={styles.paginationBar}>
          <div style={styles.paginationInfo}>
            Showing <span style={{ fontWeight: 700 }}>{total === 0 ? 0 : (page - 1) * limit + 1}</span> to{" "}
            <span style={{ fontWeight: 700 }}>{Math.min(page * limit, total)}</span> of{" "}
            <span style={{ fontWeight: 700 }}>{total}</span> patients
          </div>

          <div style={styles.paginationControls}>
            <div style={styles.limitWrapper}>
              <span style={styles.limitLabel}>Rows per page:</span>
              <select
                style={styles.limitSelect}
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div style={styles.pageButtons}>
              <button
                type="button"
                style={{ ...styles.pageBtn, opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? "not-allowed" : "pointer" }}
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                title="Previous page"
              >
                ← Prev
              </button>
              <span style={styles.pageIndicator}>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
              <button
                type="button"
                style={{ ...styles.pageBtn, opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? "not-allowed" : "pointer" }}
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                title="Next page"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>

      {archivingPatientId && (
        <ArchiveConfirmModal
          title="Archive patient"
          description="This patient will be hidden from the main Patients list. Their record and history stay intact and can be restored from the Archives page."
          onConfirm={handleArchivePatient}
          onClose={() => setArchivingPatientId(null)}
        />
      )}
      <Toast message={toast} onDismiss={() => setToast("")} />
    </AppShell>
  );
}

function RowMenu({ patientId, isPending, isOpen, onToggle, onClose, navigate, onArchiveClick }) {
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
              {isPending && (
                <button
                  type="button"
                  style={{ ...styles.menuItem, color: "var(--color-primary-dark, #234f39)", fontWeight: 600 }}
                  onClick={() => { onClose(); navigate(`/patients/${patientId}/referral`); }}
                >
                  Resume Intake
                </button>
              )}
              <button type="button" style={styles.menuItem} onClick={() => { onClose(); navigate(`/patients/${patientId}/referral`); }}>
                Admission history
              </button>
              <button
                type="button"
                style={{ ...styles.menuItem, color: "var(--color-danger, #B3261E)" }}
                onClick={() => { onClose(); onArchiveClick(); }}
              >
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
  tabBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid var(--color-border)",
    paddingBottom: 8,
    gap: 8,
  },
  statusTabs: {
    display: "flex",
    gap: 6,
    overflowX: "auto",
  },
  statusTabBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: "var(--radius-sm, 6px)",
    padding: "6px 12px",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--color-text-muted)",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  statusTabBtnActive: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    color: "var(--color-primary)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  tabBadge: {
    background: "var(--color-primary-tint, #e6f4ea)",
    color: "var(--color-primary-dark, #137333)",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 999,
    padding: "1px 6px",
    lineHeight: 1.2,
  },
  dischargeSubtext: {
    fontSize: 11,
    color: "var(--color-text-muted)",
    maxWidth: 130,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
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
  filterBackdrop: { position: "fixed", inset: 0, zIndex: 30 },
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
    maxWidth: "88vw",
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
  dischargedBtn: {
    background: "var(--color-surface)",
    color: "var(--color-primary)",
    border: "1.5px solid var(--color-primary)",
    padding: "9px 14px",
    borderRadius: "var(--radius-sm)",
    fontWeight: 600,
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
    cursor: "pointer",
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
  table: { width: "100%", minWidth: 1380, tableLayout: "fixed", borderCollapse: "collapse", fontSize: 13 },
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
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  row: { cursor: "pointer" },
  td: {
    padding: "12px 16px",
    borderBottom: "1px solid var(--color-border)",
    color: "var(--color-text)",
    wordBreak: "break-word",
    verticalAlign: "top",
  },
  actionsTh: { padding: "12px 8px", textAlign: "center" },
  actionsTd: { padding: "8px", textAlign: "center" },
  nameCell: { display: "flex", alignItems: "flex-start", gap: 10 },
  rowAvatar: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "var(--color-primary-tint)",
    color: "var(--color-primary-dark)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 800,
    flexShrink: 0,
    marginTop: 2,
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
  paginationBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    padding: "10px 16px",
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md, 10px)",
    fontSize: 13,
    color: "var(--color-text)",
  },
  paginationInfo: {
    color: "var(--color-text-muted)",
    fontSize: 13,
  },
  paginationControls: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  limitWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    color: "var(--color-text-muted)",
  },
  limitLabel: {
    fontWeight: 600,
  },
  limitSelect: {
    padding: "4px 8px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    fontSize: 12,
    background: "var(--color-surface)",
    cursor: "pointer",
  },
  pageButtons: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  pageBtn: {
    padding: "5px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    color: "var(--color-text)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  pageIndicator: {
    fontSize: 12,
    color: "var(--color-text-muted)",
    padding: "0 4px",
  },
};
