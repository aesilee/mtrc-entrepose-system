import { useEffect, useState, useMemo } from "react";
import AppShell from "../components/AppShell.jsx";
import RecordAttendanceModal from "../components/RecordAttendanceModal.jsx";
import ScheduleSessionModal from "../components/ScheduleSessionModal.jsx";
import RescheduleSessionModal from "../components/RescheduleSessionModal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import api from "../api/axios.js";
import useViewport from "../hooks/useViewport.js";
import { useAuth } from "../context/AuthContext.jsx";
import { MODALITY_CONFIG, getModalityConfig } from "../utils/modalityConfig.js";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const STATUS_COLORS = {
  present: { bg: "#E8F5E9", color: "#166534", label: "Present" },
  late: { bg: "#F4F7F4", color: "#2D4A3E", label: "Late" },
  excused: { bg: "#F0F4F1", color: "#374151", label: "Excused" },
  absent: { bg: "#FBF3F3", color: "#7F2323", label: "Absent" },
  cancelled: { bg: "#F8FAFC", color: "#64748B", label: "Session Cancelled" },
};

const COMPLETION_BADGES = {
  CREDITED: { bg: "#E8F5E9", color: "#166534", border: "#A7F3D0", label: "Credited" },
  PENDING_REVIEW: { bg: "#F8FAF8", color: "#2D4A3E", border: "#CBDAD0", label: "Pending Review" },
  NOT_CREDITED: { bg: "#FBF3F3", color: "#7F2323", border: "#F0C4C4", label: "Not Credited" },
};

const SESSION_STATUS_BADGES = {
  SCHEDULED: { bg: "#F4F7F4", color: "#1E3A2F", border: "#CBDAD0", label: "Scheduled" },
  COMPLETED: { bg: "#E8F5E9", color: "#166534", border: "#A7F3D0", label: "Completed" },
  RESCHEDULED: { bg: "#F1F5F2", color: "#374151", border: "#D1D5DB", label: "Rescheduled" },
  CANCELLED: { bg: "#F8FAFC", color: "#64748B", border: "#E2E8F0", label: "Cancelled" },
};

// Modality colors are centrally imported from utils/modalityConfig.js

export default function Attendance() {
  const { isMobile, isTablet } = useViewport();
  const { user } = useAuth();
  const canManageAttendance = user?.role === "case_manager" || user?.role === "ict_admin";
  const canApprovePolicy = user?.role === "ict_admin";

  const statCols = isMobile ? 1 : isTablet ? 2 : 4;
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [caseManagers, setCaseManagers] = useState([]);
  const [outstandingByPatient, setOutstandingByPatient] = useState({});
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Scheduling & Roster state
  const [activeTab, setActiveTab] = useState("records"); // "records" | "scheduled"
  const [scheduleViewMode, setScheduleViewMode] = useState("calendar"); // "calendar" | "table"
  const [selectedScheduleDate, setSelectedScheduleDate] = useState("");
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);
  const [hasAutoJumped, setHasAutoJumped] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [rescheduleTargetSession, setRescheduleTargetSession] = useState(null);
  const [attendanceTargetSession, setAttendanceTargetSession] = useState(null);
  const [scheduledSessions, setScheduledSessions] = useState([]);
  const [unresolvedData, setUnresolvedData] = useState({ unresolvedSessions: [], totalUnresolvedPatients: 0 });

  // Participation Review Modal State
  const [reviewRecord, setReviewRecord] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    status: "present",
    completionStatus: "CREDITED",
    arrivalTime: "",
    decisionReason: "",
    authorizedByName: "",
    isMakeup: false,
    makeupForAttendanceId: "",
  });
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Policy Approval Modal State
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    lateGraceMinutes: 15,
    maxLateForAutoReviewMinutes: 30,
    lateDefaultDecision: "PENDING_REVIEW",
    approvedByTitle: "MTRC Designated Supervisor",
    approvedByName: "",
    policyNotes: "",
  });
  const [policySaving, setPolicySaving] = useState(false);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [caseManagerFilter, setCaseManagerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [completionFilter, setCompletionFilter] = useState("");

  function loadData() {
    setLoading(true);
    const params = {};
    if (dateFilter) params.dateFilter = dateFilter;
    if (dateFilter === "custom") {
      params.dateFrom = dateFrom;
      params.dateTo = dateTo;
    }
    if (programFilter) params.programId = programFilter;
    if (caseManagerFilter) params.caseManagerId = caseManagerFilter;
    if (statusFilter) params.status = statusFilter;
    if (completionFilter) params.completionStatus = completionFilter;
    if (search) params.search = search;

    api
      .get("/attendance", { params })
      .then(({ data }) => setRecords(data.attendance || []))
      .finally(() => setLoading(false));

    api
      .get("/sessions/scheduled")
      .then(({ data }) => setScheduledSessions(data.sessions || []))
      .catch(() => {});

    api
      .get("/sessions/unresolved")
      .then(({ data }) => setUnresolvedData(data || { unresolvedSessions: [], totalUnresolvedPatients: 0 }))
      .catch(() => {});

    api.get("/attendance/stats").then(({ data }) => {
      setStats(data);
      if (data?.policy) {
        setPolicy(data.policy);
        setPolicyForm((prev) => ({
          ...prev,
          ...data.policy,
          approvedByName: data.policy.approvedByName || user?.full_name || user?.username || "",
        }));
      }
    });

    api
      .get("/attendance/patient-context")
      .then(({ data }) => {
        if (data?.outstandingByPatient) setOutstandingByPatient(data.outstandingByPatient);
      })
      .catch(() => {});
  }

  useEffect(loadData, [
    dateFilter,
    dateFrom,
    dateTo,
    programFilter,
    caseManagerFilter,
    statusFilter,
    completionFilter,
    search,
  ]);

  useEffect(() => {
    api.get("/programs").then(({ data }) => setPrograms(data.programs || []));
    api.get("/users/case-managers").then(({ data }) => setCaseManagers(data.caseManagers || []));
  }, []);

  // Auto-focus calendar on sessions month if any exist and user hasn't explicitly navigated
  useEffect(() => {
    if (!hasAutoJumped && scheduledSessions && scheduledSessions.length > 0) {
      const firstValid = scheduledSessions.find((s) => s.session_date);
      if (firstValid) {
        const d = new Date(firstValid.session_date);
        if (!isNaN(d.getTime())) {
          setCalendarDate(new Date(d.getFullYear(), d.getMonth(), 1));
          setHasAutoJumped(true);
        }
      }
    }
  }, [scheduledSessions, hasAutoJumped]);

  const filteredScheduledSessions = useMemo(() => {
    return scheduledSessions.filter((s) => {
      if (statusFilter && s.session_status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = (s.session_name || "").toLowerCase();
        const type = (s.session_type || "").toLowerCase();
        const topic = (s.curriculum_requirement || s.topic_name || "").toLowerCase();
        const fac = (s.facilitator_name || s.case_manager_name || "").toLowerCase();
        const dateStr = s.session_date ? String(s.session_date).slice(0, 10) : "";
        if (
          !name.includes(q) &&
          !type.includes(q) &&
          !topic.includes(q) &&
          !fac.includes(q) &&
          !dateStr.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [scheduledSessions, statusFilter, search]);

  const todayDateStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const sessionsByDate = useMemo(() => {
    const map = {};
    for (const s of filteredScheduledSessions) {
      if (!s.session_date) continue;
      let dateStr = "";
      if (typeof s.session_date === "string") {
        dateStr = s.session_date.slice(0, 10);
      } else if (s.session_date instanceof Date) {
        dateStr = s.session_date.toISOString().slice(0, 10);
      } else {
        dateStr = String(s.session_date).slice(0, 10);
      }
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(s);
    }
    return map;
  }, [filteredScheduledSessions]);

  const calendarCells = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells = [];

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(prevDate.getDate()).padStart(2, "0")}`;
      cells.push({
        day: dayNum,
        dateStr,
        isCurrentMonth: false,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      const dateStr = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, "0")}-${String(curDate.getDate()).padStart(2, "0")}`;
      cells.push({
        day: d,
        dateStr,
        isCurrentMonth: true,
      });
    }

    // Trailing days from next month
    const totalCells = cells.length > 35 ? 42 : 35;
    let nextDayNum = 1;
    while (cells.length < totalCells) {
      const nextDate = new Date(year, month + 1, nextDayNum);
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;
      cells.push({
        day: nextDayNum,
        dateStr,
        isCurrentMonth: false,
      });
      nextDayNum++;
    }

    return cells;
  }, [calendarDate]);

  const activeFilterCount = [
    dateFilter,
    programFilter,
    caseManagerFilter,
    statusFilter,
    completionFilter,
  ].filter(Boolean).length;

  function clearFilters() {
    setDateFilter("");
    setDateFrom("");
    setDateTo("");
    setProgramFilter("");
    setCaseManagerFilter("");
    setStatusFilter("");
    setCompletionFilter("");
  }

  function openReviewModal(rec) {
    setReviewRecord(rec);
    setReviewError("");
    setReviewForm({
      status: rec.status || "present",
      completionStatus: rec.completion_status || (rec.status === "present" ? "CREDITED" : "NOT_CREDITED"),
      arrivalTime: rec.arrival_time || "",
      decisionReason: rec.decision_reason || "",
      authorizedByName: rec.authorized_by_name || user?.full_name || user?.username || "",
      isMakeup: Boolean(rec.is_makeup),
      makeupForAttendanceId: rec.makeup_for_attendance_id ? String(rec.makeup_for_attendance_id) : "",
    });
  }

  async function handleSaveReview(e) {
    e.preventDefault();
    if (!reviewRecord) return;
    setReviewSaving(true);
    setReviewError("");
    try {
      await api.put(`/attendance/${reviewRecord.id}/completion`, reviewForm);
      setReviewRecord(null);
      loadData();
    } catch (err) {
      setReviewError(err.response?.data?.message || "Could not update participation decision.");
    } finally {
      setReviewSaving(false);
    }
  }

  async function handleSavePolicy(e) {
    e.preventDefault();
    setPolicySaving(true);
    try {
      const { data } = await api.put("/attendance/policy", policyForm);
      if (data?.policy) setPolicy(data.policy);
      setPolicyModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Could not save attendance policy.");
    } finally {
      setPolicySaving(false);
    }
  }

  return (
    <AppShell
      title="Attendance & Curriculum Completion"
      description="Record physical attendance separately from curriculum completion credit, review late arrivals, link makeups, and prevent duplicate credit."
    >
      <div style={styles.wrapper}>
        {/* MTRC Approved Attendance Policy Banner */}
        <div style={styles.policyBanner}>
          <div style={styles.policyBannerLeft}>
            <span style={styles.policyBadgePill}>MTRC Approved Policy</span>
            <span style={styles.policyText}>
              <strong>Grace Period:</strong> {policy?.lateGraceMinutes ?? 15} mins ·{" "}
              <strong>Late Arrival Rule:</strong> Case Manager reviews participation ({policy?.lateDefaultDecision === "CREDITED" ? "Credited" : "Pending Review"} by default) ·{" "}
              <strong>Repeat Topics:</strong> No duplicate curriculum credit ·{" "}
              <strong>Makeups:</strong> Linked to original missed requirement (absence preserved) ·{" "}
              <strong>Approved by:</strong> {policy?.approvedByName ? `${policy.approvedByName} (${policy?.approvedByTitle || "Supervisor"})` : policy?.approvedByTitle || "MTRC Designated Supervisor"}
            </span>
          </div>
          {canApprovePolicy && (
            <button
              type="button"
              style={styles.policyEditBtn}
              onClick={() => setPolicyModalOpen(true)}
            >
              ⚙️ Attendance Policy
            </button>
          )}
        </div>

        {/* Summary Stat Cards */}
        <div style={{ ...styles.statsRow, gridTemplateColumns: `repeat(${statCols}, 1fr)` }}>
          <StatCard
            label="Today's Scheduled Sessions"
            value={stats ? `${stats.todaySessions ?? 0} Sessions` : "—"}
            sub={
              stats?.expectedToday
                ? `${stats.expectedToday} expected roster patients`
                : "Scheduled / conducted today"
            }
          />
          <StatCard
            label="Today's Attendance Rate"
            value={stats && stats.todayRate !== null ? `${stats.todayRate}%` : "—"}
            sub={
              stats?.expectedToday
                ? `${stats.presentToday || 0} attended of ${stats.expectedToday} expected`
                : "Present + Late (accurate denominator)"
            }
          />
          <StatCard
            label="Today's Recorded vs Expected"
            value={stats ? `${stats.recordedToday ?? 0} / ${stats.expectedToday ?? 0}` : "—"}
            sub={
              stats?.unresolvedToday > 0
                ? `${stats.unresolvedToday} unrecorded today`
                : "All scheduled recorded"
            }
          />
          <StatCard
            label="Pending Roster Encoding"
            value={stats ? `${stats.totalUnresolvedAll ?? 0} Pending` : "—"}
            sub="Pre-scheduled sessions awaiting attendance"
          />
        </div>

        {/* Toolbar */}
        <div style={{ ...styles.toolbar, flexWrap: isMobile ? "wrap" : "nowrap" }}>
          <div
            style={{
              ...styles.leftControls,
              flexWrap: isMobile ? "wrap" : "nowrap",
              width: isMobile ? "100%" : "auto",
            }}
          >
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
                {activeFilterCount > 0 && (
                  <span style={styles.filterCount}>{activeFilterCount}</span>
                )}
              </button>
              {filtersOpen && (
                <>
                  <div
                    style={styles.menuBackdrop}
                    onClick={() => setFiltersOpen(false)}
                  />
                  <div style={styles.filterPanel}>
                    <div style={styles.filterPanelHeader}>
                      <span>Filters</span>
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          style={styles.clearBtn}
                          onClick={clearFilters}
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    <label style={styles.filterLabel}>
                      Session date
                      <select
                        style={styles.filterSelect}
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                      >
                        <option value="">Any date</option>
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="week">This week</option>
                        <option value="custom">Custom date</option>
                      </select>
                    </label>

                    {dateFilter === "custom" && (
                      <div style={styles.dateRange}>
                        <input
                          type="date"
                          style={styles.dateInput}
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                        <span style={styles.dateSep}>–</span>
                        <input
                          type="date"
                          style={styles.dateInput}
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                      </div>
                    )}

                    <label style={styles.filterLabel}>
                      Program
                      <select
                        style={styles.filterSelect}
                        value={programFilter}
                        onChange={(e) => setProgramFilter(e.target.value)}
                      >
                        <option value="">All programs</option>
                        {programs.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={styles.filterLabel}>
                      Case manager
                      <select
                        style={styles.filterSelect}
                        value={caseManagerFilter}
                        onChange={(e) => setCaseManagerFilter(e.target.value)}
                      >
                        <option value="">All case managers</option>
                        {caseManagers.map((cm) => (
                          <option key={cm.id} value={cm.id}>
                            {cm.full_name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={styles.filterLabel}>
                      Attendance status
                      <select
                        style={styles.filterSelect}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="">All attendance statuses</option>
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="excused">Excused</option>
                        <option value="absent">Absent</option>
                        <option value="cancelled">Session Cancelled</option>
                      </select>
                    </label>

                    <label style={styles.filterLabel}>
                      Completion decision
                      <select
                        style={styles.filterSelect}
                        value={completionFilter}
                        onChange={(e) => setCompletionFilter(e.target.value)}
                      >
                        <option value="">All completion decisions</option>
                        <option value="CREDITED">Credited</option>
                        <option value="PENDING_REVIEW">Pending Review</option>
                        <option value="NOT_CREDITED">Not Credited</option>
                      </select>
                    </label>

                    <button
                      type="button"
                      style={styles.clearFooterBtn}
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Quick Completion Filter Pills */}
            <div style={styles.quickPillsRow}>
              {[
                { key: "", label: "All" },
                { key: "CREDITED", label: "Credited" },
                {
                  key: "PENDING_REVIEW",
                  label: `Pending Review${
                    stats?.totalPendingReview ? ` (${stats.totalPendingReview})` : ""
                  }`,
                },
                { key: "NOT_CREDITED", label: "Not Credited" },
              ].map((pill) => {
                const active = completionFilter === pill.key;
                return (
                  <button
                    key={pill.key || "all"}
                    type="button"
                    style={{
                      ...styles.quickPillBtn,
                      ...(active ? styles.quickPillBtnActive : {}),
                    }}
                    onClick={() => setCompletionFilter(pill.key)}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            <div style={styles.searchBox}>
              <svg {...iconProps} width="16" height="16" style={styles.searchIcon}>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                style={styles.searchInput}
                placeholder="Search by patient, code, or curriculum topic…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {canManageAttendance && (
              <button
                type="button"
                style={styles.scheduleBtn}
                onClick={() => {
                  setSelectedScheduleDate("");
                  setScheduleModalOpen(true);
                }}
              >
                + Schedule Session
              </button>
            )}
            {user.role !== "him_staff" && (
              <button
                type="button"
                style={styles.recordBtn}
                onClick={() => {
                  setAttendanceTargetSession(null);
                  setModalOpen(true);
                }}
              >
                + Record Attendance
              </button>
            )}
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div style={styles.viewTabsRow}>
          <button
            type="button"
            style={{
              ...styles.viewTabBtn,
              ...(activeTab === "records" ? styles.viewTabBtnActive : {}),
            }}
            onClick={() => setActiveTab("records")}
          >
            Attendance & Completion Records ({records.length})
          </button>
          <button
            type="button"
            style={{
              ...styles.viewTabBtn,
              ...(activeTab === "scheduled" ? styles.viewTabBtnActive : {}),
            }}
            onClick={() => setActiveTab("scheduled")}
          >
            Scheduled Sessions & Rosters ({scheduledSessions.length})
            {stats?.totalUnresolvedAll > 0 && (
              <span style={styles.unresolvedPill}>
                {stats.totalUnresolvedAll} Pending
              </span>
            )}
          </button>
        </div>

        {/* Attendance & Completion Table */}
        {activeTab === "records" && (
        <div style={{ ...styles.tableCard, flex: 1, minHeight: 0 }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: "16%" }}>Patient</th>
                <th style={{ ...styles.th, width: "22%" }}>Session & Curriculum Requirement</th>
                <th style={{ ...styles.th, width: "12%" }}>Case Manager</th>
                <th style={{ ...styles.th, width: "10%" }}>Date</th>
                <th style={{ ...styles.th, width: "13%" }}>Attendance Status</th>
                <th style={{ ...styles.th, width: "16%" }}>Completion Decision</th>
                <th style={{ ...styles.th, width: "11%" }}>Actions / Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td style={styles.emptyCell} colSpan={7}>
                    Loading attendance & completion records…
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          width="24"
                          height="24"
                        >
                          <rect x="3" y="5" width="18" height="16" rx="2" />
                          <path d="M3 10h18" />
                          <path d="M8 3v4M16 3v4" />
                        </svg>
                      }
                      title="No attendance records match your filters"
                      description="Click Record Attendance to log a session, or adjust your filters to see existing records."
                    />
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const statusStyle = STATUS_COLORS[r.status] || STATUS_COLORS.present;
                  const compKey =
                    r.completion_status ||
                    (r.status === "present" ? "CREDITED" : "NOT_CREDITED");
                  const compBadge = COMPLETION_BADGES[compKey] || COMPLETION_BADGES.NOT_CREDITED;
                  const requirementLabel =
                    r.curriculum_requirement || r.topic_name || r.session_name || "General Session";

                  return (
                    <tr key={r.id}>
                      {/* Patient */}
                      <td style={styles.td}>
                        <div style={{ fontWeight: 700, color: "var(--color-text)" }}>
                          {r.full_name}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                          {r.patient_code}
                          {r.pwud_code ? ` · ${r.pwud_code}` : ""}
                        </div>
                      </td>

                      {/* Session & Curriculum Requirement */}
                      <td style={styles.td}>
                        <div style={{ fontWeight: 600, color: "var(--color-text)", lineHeight: 1.35 }}>
                          {requirementLabel}
                        </div>
                        {r.session_type && MODALITY_CONFIG[r.session_type] ? (
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: "4px",
                              padding: "1px 7px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background: MODALITY_CONFIG[r.session_type].bg,
                              color: MODALITY_CONFIG[r.session_type].text,
                              border: `1px solid ${MODALITY_CONFIG[r.session_type].border}`,
                            }}
                          >
                            {MODALITY_CONFIG[r.session_type].label}
                          </span>
                        ) : (
                          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                            {r.session_type || r.program_name || "Outpatient"}
                          </div>
                        )}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
                          {Boolean(r.is_makeup) && (
                            <span style={styles.makeupTag}>
                              Makeup
                              {r.makeup_origin_date
                                ? ` for ${String(r.makeup_origin_date).slice(0, 10)}`
                                : ""}
                            </span>
                          )}
                          {Boolean(r.is_duplicate_topic) && (
                            <span style={styles.duplicateTag}>
                              Repeat Topic (No Dup Credit)
                            </span>
                          )}
                          {r.fulfilled_by_makeup_id && (
                            <span style={styles.fulfilledTag}>
                              Made up on {String(r.fulfilled_by_makeup_date || "").slice(0, 10)}
                            </span>
                          )}
                          {(r.status === "absent" || r.status === "excused") &&
                            !r.fulfilled_by_makeup_id && (
                              <span style={styles.outstandingTag}>
                                Requirement Outstanding
                              </span>
                            )}
                        </div>
                      </td>

                      {/* Case Manager */}
                      <td style={styles.td}>{r.case_manager_name || "—"}</td>

                      {/* Date & Time */}
                      <td style={styles.td}>
                        <div style={{ fontWeight: 600 }}>
                          {r.session_date ? String(r.session_date).slice(0, 10) : "—"}
                        </div>
                        {r.session_time && (
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                            Sched: {String(r.session_time).slice(0, 5)}
                          </div>
                        )}
                      </td>

                      {/* Physical Attendance Status */}
                      <td style={styles.td}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            alignItems: "flex-start",
                          }}
                        >
                          <span
                            style={{
                              ...styles.statusBadge,
                              background: statusStyle.bg,
                              color: statusStyle.color,
                            }}
                          >
                            {statusStyle.label || r.status}
                          </span>
                          {r.status === "late" && r.arrival_time && (
                            <span style={styles.arrivalTimePill}>
                              Arrived: {String(r.arrival_time).slice(0, 5)}
                            </span>
                          )}
                          {r.drug_test_result && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "10.5px",
                                fontWeight: 700,
                                background:
                                  r.drug_test_result === "POSITIVE" ? "#FBF3F3" : "#F0FDF4",
                                color:
                                  r.drug_test_result === "POSITIVE" ? "#7F2323" : "#166534",
                                border: `1px solid ${
                                  r.drug_test_result === "POSITIVE" ? "#F0C4C4" : "#BBF7D0"
                                }`,
                              }}
                            >
                              {r.drug_test_result === "POSITIVE"
                                ? `Multi-3: Pos${
                                    r.substance_tested && r.substance_tested.includes(":")
                                      ? ` (${r.substance_tested.split(":")[1].trim()})`
                                      : ""
                                  }`
                                : "Multi-3: Neg"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Completion Decision */}
                      <td style={styles.td}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                            alignItems: "flex-start",
                          }}
                        >
                          <span
                            style={{
                              ...styles.completionBadge,
                              background: compBadge.bg,
                              color: compBadge.color,
                              border: `1px solid ${compBadge.border}`,
                            }}
                          >
                            {compBadge.label}
                          </span>
                          {r.decision_reason && (
                            <div style={styles.reasonText}>{r.decision_reason}</div>
                          )}
                          {r.authorized_by_name && (
                            <div style={styles.authStaffText}>
                              Auth: <strong>{r.authorized_by_name}</strong>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Remarks & Review Action */}
                      <td style={styles.td}>
                        {r.notes && (
                          <div style={{ fontSize: 12, color: "var(--color-text)", marginBottom: 6 }}>
                            {r.notes}
                          </div>
                        )}
                        {canManageAttendance ? (
                          <button
                            type="button"
                            style={styles.reviewActionBtn}
                            onClick={() => openReviewModal(r)}
                          >
                            Review
                          </button>
                        ) : (
                          !r.notes && <span style={{ color: "var(--color-text-muted)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* Scheduled Sessions & Rosters Section */}
        {activeTab === "scheduled" && (
          <div style={styles.scheduledSectionWrapper}>
            {/* Embedded CSS for interactive calendar hover animations */}
            <style>{`
              .cal-day-cell {
                transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
              }
              .cal-day-cell:hover {
                background-color: #F0FDF4 !important;
                border-color: #86EFAC !important;
                box-shadow: 0 2px 8px rgba(22, 101, 52, 0.08);
              }
              .cal-day-cell .cal-cell-btn {
                opacity: 0.7;
                transition: opacity 0.15s ease, transform 0.1s ease;
              }
              .cal-day-cell:hover .cal-cell-btn {
                opacity: 1;
              }
              .cal-session-chip {
                transition: transform 0.12s ease, box-shadow 0.12s ease;
              }
              .cal-session-chip:hover {
                transform: translateY(-1px);
                box-shadow: 0 3px 8px rgba(0,0,0,0.12);
              }
              .cal-sessions-list::-webkit-scrollbar {
                width: 3px;
              }
              .cal-sessions-list::-webkit-scrollbar-track {
                background: transparent;
              }
              .cal-sessions-list::-webkit-scrollbar-thumb {
                background: #CBD5E1;
                border-radius: 3px;
              }
            `}</style>

            {/* Sub-Header: Segmented View Mode Toggle & Calendar Month Navigation */}
            <div style={{ ...styles.subViewHeader, flexWrap: isMobile ? "wrap" : "nowrap" }}>
              {/* Segmented View Mode Switcher */}
              <div style={styles.segmentedToggleWrap}>
                <button
                  type="button"
                  style={{
                    ...styles.segmentedToggleBtn,
                    ...(scheduleViewMode === "calendar" ? styles.segmentedToggleBtnActive : {}),
                  }}
                  onClick={() => setScheduleViewMode("calendar")}
                >
                  <span>Calendar View</span>
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.segmentedToggleBtn,
                    ...(scheduleViewMode === "table" ? styles.segmentedToggleBtnActive : {}),
                  }}
                  onClick={() => setScheduleViewMode("table")}
                >
                  <span>Breakdown of Records</span>
                  <span
                    style={{
                      ...styles.segmentedBadge,
                      background: scheduleViewMode === "table" ? "rgba(255,255,255,0.25)" : "#DCFCE7",
                      color: scheduleViewMode === "table" ? "#ffffff" : "#166534",
                    }}
                  >
                    {filteredScheduledSessions.length}
                  </span>
                </button>
              </div>

              {/* Month Controls (Calendar View) */}
              {scheduleViewMode === "calendar" && (
                <div style={styles.calendarControlsWrap}>
                  <div style={styles.calendarNavButtons}>
                    <button
                      type="button"
                      style={styles.calendarNavBtn}
                      title="Previous Month"
                      onClick={() =>
                        setCalendarDate(
                          new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1)
                        )
                      }
                    >
                      ‹
                    </button>
                    <span style={styles.calendarMonthHeading}>
                      {calendarDate.toLocaleString("en-US", { month: "long", year: "numeric" })}
                    </span>
                    <button
                      type="button"
                      style={styles.calendarNavBtn}
                      title="Next Month"
                      onClick={() =>
                        setCalendarDate(
                          new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1)
                        )
                      }
                    >
                      ›
                    </button>
                    <button
                      type="button"
                      style={styles.todayJumpBtn}
                      onClick={() => setCalendarDate(new Date())}
                    >
                      Today
                    </button>
                  </div>

                  <div style={styles.calendarHintText}>
                    Click any day cell to schedule a session on that date
                  </div>
                </div>
              )}
            </div>

            {/* Modality Legend & Status Bar (Calendar View) */}
            {scheduleViewMode === "calendar" && (
              <div style={styles.calendarLegendBar}>
                <div style={styles.legendWrap}>
                  <span style={styles.legendLabel}>Modalities:</span>
                  <span style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, background: MODALITY_CONFIG.CBT_GROUP.badgeBg }} /> CBT Group
                  </span>
                  <span style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, background: MODALITY_CONFIG.PSYCHO_EDUCATION.badgeBg }} /> Psycho-Ed (PE)
                  </span>
                  <span style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, background: MODALITY_CONFIG.SHGM.badgeBg }} /> Self-Help (SHGM)
                  </span>
                  <span style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, background: MODALITY_CONFIG.INDIVIDUAL_COUNSELING.badgeBg }} /> Ind. Counseling
                  </span>
                  <span style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, background: MODALITY_CONFIG.CONJOINT_FAMILY.badgeBg }} /> Conjoint / Family
                  </span>
                </div>

                <div style={styles.legendStatsRight}>
                  <span>
                    Total Scheduled: <strong>{scheduledSessions.length}</strong>
                  </span>
                  {stats?.totalUnresolvedAll > 0 && (
                    <span style={styles.unresolvedBadgeSmall}>
                      {stats.totalUnresolvedAll} Pending Rosters
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* METHOD 1: CALENDAR VIEW */}
            {scheduleViewMode === "calendar" && (
              <div style={styles.calendarCard}>
                {/* Weekday Names Header */}
                <div style={styles.calendarWeekdaysRow}>
                  {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((dayName, idx) => (
                    <div
                      key={dayName}
                      style={{
                        ...styles.calendarWeekdayCell,
                        color: idx === 0 || idx === 6 ? "#94A3B8" : "var(--color-text-muted)",
                      }}
                    >
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* 35 or 42 Day Cells Grid */}
                <div style={styles.calendarGrid}>
                  {calendarCells.map((cell) => {
                    const isToday = cell.dateStr === todayDateStr;
                    const daySessions = sessionsByDate[cell.dateStr] || [];

                    return (
                      <div
                        key={cell.dateStr}
                        className="cal-day-cell"
                        style={{
                          ...styles.calendarDayCell,
                          backgroundColor: cell.isCurrentMonth ? "#ffffff" : "#F8FAFC",
                          opacity: cell.isCurrentMonth ? 1 : 0.72,
                          cursor: canManageAttendance ? "pointer" : "default",
                        }}
                        onClick={() => {
                          if (!canManageAttendance) return;
                          setSelectedScheduleDate(cell.dateStr);
                          setScheduleModalOpen(true);
                        }}
                      >
                        {/* Day Cell Header */}
                        <div style={styles.calendarDayHeader}>
                          <div
                            style={
                              isToday
                                ? styles.calendarDayNumToday
                                : cell.isCurrentMonth
                                ? styles.calendarDayNumCurrent
                                : styles.calendarDayNumOther
                            }
                          >
                            {cell.day}
                          </div>

                          {canManageAttendance && (
                            <button
                              type="button"
                              className="cal-cell-btn"
                              style={styles.cellAddBtn}
                              title={`Schedule a new session on ${cell.dateStr}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedScheduleDate(cell.dateStr);
                                setScheduleModalOpen(true);
                              }}
                            >
                              + Sched
                            </button>
                          )}
                        </div>

                        {/* Sessions scheduled on this day */}
                        <div className="cal-sessions-list" style={styles.calendarSessionsList}>
                          {daySessions.map((s) => {
                            const modCfg = getModalityConfig(s.session_type);
                            const unresolved = Number(s.unresolved_count || 0);
                            const expected = Number(s.expected_count || 0);
                            const recorded = Number(s.recorded_count || 0);

                            return (
                              <div
                                key={s.id}
                                className="cal-session-chip"
                                style={{
                                  ...styles.calendarSessionCard,
                                  background: modCfg.bg,
                                  borderLeft: `3px solid ${modCfg.badgeBg}`,
                                  borderColor: modCfg.border,
                                }}
                                title={`${s.session_name} (${modCfg.label})\nTime: ${
                                  s.session_time ? String(s.session_time).slice(0, 5) : "—"
                                }\nRoster: ${expected} expected, ${recorded} recorded`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSessionDetail(s);
                                }}
                              >
                                <div style={styles.sessionCardTop}>
                                  <span style={styles.sessionCardTime}>
                                    {s.session_time ? String(s.session_time).slice(0, 5) : "—"}
                                  </span>
                                  <span
                                    style={{
                                      ...styles.sessionStatusPill,
                                      background:
                                        s.session_status === "COMPLETED"
                                          ? "#E8F5E9"
                                          : s.session_status === "RESCHEDULED"
                                          ? "#F1F5F2"
                                          : s.session_status === "CANCELLED"
                                          ? "#F8FAFC"
                                          : "#F4F7F4",
                                      color:
                                        s.session_status === "COMPLETED"
                                          ? "#166534"
                                          : s.session_status === "RESCHEDULED"
                                          ? "#374151"
                                          : s.session_status === "CANCELLED"
                                          ? "#64748B"
                                          : "#1E3A2F",
                                    }}
                                  >
                                    {s.session_status === "COMPLETED"
                                      ? "Completed"
                                      : s.session_status === "RESCHEDULED"
                                      ? "Rescheduled"
                                      : s.session_status === "CANCELLED"
                                      ? "Cancelled"
                                      : "Scheduled"}
                                  </span>
                                </div>

                                <div style={{ ...styles.sessionCardTitle, color: modCfg.text }}>
                                  {s.curriculum_requirement || s.topic_name || s.session_name}
                                </div>

                                <div style={styles.sessionCardFooter}>
                                  {unresolved > 0 ? (
                                    <span style={styles.unresolvedBadgeMini}>
                                      {unresolved} unrecorded
                                    </span>
                                  ) : s.session_status === "COMPLETED" ? (
                                    <span style={styles.completedBadgeMini}>
                                      {recorded}/{expected} recorded
                                    </span>
                                  ) : (
                                    <span style={styles.expectedBadgeMini}>
                                      {expected} expected
                                    </span>
                                  )}
                                  {s.facilitator_name && (
                                    <span
                                      style={styles.facilitatorMiniText}
                                      title={s.facilitator_name}
                                    >
                                      {s.facilitator_name.split(" ")[0]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {daySessions.length === 0 && canManageAttendance && (
                            <div className="cal-schedule-hint" style={styles.cellEmptyHint}>
                              Click to schedule
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* METHOD 2: BREAKDOWN OF RECORDS TABLE */}
            {scheduleViewMode === "table" && (
              <div style={{ ...styles.tableCard, flex: 1, minHeight: 0 }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: "22%" }}>Session & Modality</th>
                      <th style={{ ...styles.th, width: "12%" }}>Date & Time</th>
                      <th style={{ ...styles.th, width: "12%" }}>Status</th>
                      <th style={{ ...styles.th, width: "20%" }}>
                        Expected vs. Recorded (Denominator)
                      </th>
                      <th style={{ ...styles.th, width: "16%" }}>Curriculum / Facilitator</th>
                      <th style={{ ...styles.th, width: "18%" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td style={styles.emptyCell} colSpan={6}>
                          Loading scheduled sessions…
                        </td>
                      </tr>
                    ) : filteredScheduledSessions.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <EmptyState
                            icon={
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                width="24"
                                height="24"
                              >
                                <rect x="3" y="5" width="18" height="16" rx="2" />
                                <path d="M3 10h18" />
                                <path d="M8 3v4M16 3v4" />
                              </svg>
                            }
                            title="No scheduled sessions match"
                            description="Click '+ Schedule Session' to assign an expected patient roster before recording attendance."
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredScheduledSessions.map((s) => {
                        const statusBadge =
                          SESSION_STATUS_BADGES[s.session_status] || SESSION_STATUS_BADGES.SCHEDULED;
                        const unresolved = Number(s.unresolved_count || 0);
                        const expected = Number(s.expected_count || 0);
                        const recorded = Number(s.recorded_count || 0);

                        return (
                          <tr key={s.id} style={styles.tr}>
                            <td style={styles.td}>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: "13px",
                                  color: "var(--color-text)",
                                }}
                              >
                                {s.session_name}
                              </div>
                              {s.session_type && MODALITY_CONFIG[s.session_type] ? (
                                <span
                                  style={{
                                    display: "inline-block",
                                    marginTop: "4px",
                                    padding: "2px 7px",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    background: MODALITY_CONFIG[s.session_type].bg,
                                    color: MODALITY_CONFIG[s.session_type].text,
                                    border: `1px solid ${MODALITY_CONFIG[s.session_type].border}`,
                                  }}
                                >
                                  {MODALITY_CONFIG[s.session_type].label}
                                </span>
                              ) : (
                                <div style={{ fontSize: "11.5px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                                  {s.session_type}
                                </div>
                              )}
                              {s.original_session_id && (
                                <div
                                  style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}
                                >
                                  ↳ Rescheduled from original date (
                                  {s.original_session_date
                                    ? String(s.original_session_date).slice(0, 10)
                                    : "prior session"}
                                  )
                                </div>
                              )}
                            </td>
                            <td style={styles.td}>
                              <div style={{ fontSize: "12.5px", fontWeight: 600 }}>
                                {s.session_date ? String(s.session_date).slice(0, 10) : "—"}
                              </div>
                              {s.session_time && (
                                <div
                                  style={{ fontSize: "11.5px", color: "var(--color-text-muted)" }}
                                >
                                  {String(s.session_time).slice(0, 5)}
                                </div>
                              )}
                            </td>
                            <td style={styles.td}>
                              <span
                                style={{
                                  ...styles.statusBadge,
                                  background: statusBadge.bg,
                                  color: statusBadge.color,
                                  border: `1px solid ${statusBadge.border}`,
                                }}
                              >
                                {statusBadge.label}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                <div style={{ fontSize: "12px" }}>
                                  <strong>{expected}</strong> expected · <strong>{recorded}</strong>{" "}
                                  recorded
                                </div>
                                {unresolved > 0 ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      padding: "2px 7px",
                                      borderRadius: "4px",
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      background: "#F4F7F4",
                                      color: "#2D4A3E",
                                      border: "1px solid #CBDAD0",
                                      width: "fit-content",
                                    }}
                                  >
                                    {unresolved} to be recorded
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      padding: "2px 7px",
                                      borderRadius: "4px",
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      background: "#E8F5E9",
                                      color: "#166534",
                                      border: "1px solid #BBF7D0",
                                      width: "fit-content",
                                    }}
                                  >
                                    Full Roster Encoded
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={styles.td}>
                              <div style={{ fontSize: "12px", color: "var(--color-text)" }}>
                                {s.curriculum_requirement || s.topic_name || "—"}
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                                Facilitator: {s.facilitator_name || s.case_manager_name || "—"}
                              </div>
                            </td>
                            <td style={styles.td}>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "6px",
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                }}
                              >
                                {s.session_status === "SCHEDULED" && canManageAttendance && (
                                  <>
                                    <button
                                      type="button"
                                      style={styles.tableActionRecordBtn}
                                      onClick={() => {
                                        setAttendanceTargetSession(s);
                                        setModalOpen(true);
                                      }}
                                    >
                                      Record
                                    </button>
                                    <button
                                      type="button"
                                      style={styles.tableActionRescheduleBtn}
                                      onClick={() => setRescheduleTargetSession(s)}
                                    >
                                      Reschedule
                                    </button>
                                  </>
                                )}
                                {s.session_status === "RESCHEDULED" && (
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "#475569",
                                      lineHeight: 1.3,
                                    }}
                                  >
                                    Rescheduled to:{" "}
                                    <strong>
                                      {s.rescheduled_date
                                        ? String(s.rescheduled_date).slice(0, 10)
                                        : "new date"}
                                    </strong>
                                    {s.rescheduled_reason && (
                                      <div style={{ color: "var(--color-text-muted)" }}>
                                        Reason: {s.rescheduled_reason}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {s.session_status === "COMPLETED" && (
                                  <span
                                    style={{
                                      fontSize: "11.5px",
                                      color: "#166534",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Fully Encoded
                                  </span>
                                )}
                                {s.session_status === "CANCELLED" && (
                                  <div style={{ fontSize: "11px", color: "#64748B" }}>
                                    {s.cancellation_reason || "Session cancelled by center"}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schedule Session Modal */}
      {scheduleModalOpen && (
        <ScheduleSessionModal
          initialDate={selectedScheduleDate}
          onClose={() => {
            setScheduleModalOpen(false);
            setSelectedScheduleDate("");
          }}
          onScheduled={() => {
            setScheduleModalOpen(false);
            setSelectedScheduleDate("");
            loadData();
          }}
        />
      )}

      {/* Session Quick Detail Modal (from Calendar View click) */}
      {selectedSessionDetail && (
        <div style={styles.modalBackdrop} onClick={() => setSelectedSessionDetail(null)}>
          <div style={styles.sessionDetailModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.sessionDetailHeader}>
              <div>
                {(() => {
                  const mcfg = getModalityConfig(selectedSessionDetail.session_type);
                  return (
                    <span
                      style={{
                        ...styles.modalityPillDetail,
                        background: mcfg.bg,
                        color: mcfg.text,
                        border: `1px solid ${mcfg.border}`,
                      }}
                    >
                      {mcfg.label}
                    </span>
                  );
                })()}
                <h3 style={styles.sessionDetailTitle}>
                  {selectedSessionDetail.session_name}
                </h3>
                <div style={styles.sessionDetailSubtitle}>
                  <strong>
                    {selectedSessionDetail.session_date
                      ? String(selectedSessionDetail.session_date).slice(0, 10)
                      : "—"}
                  </strong>
                  {selectedSessionDetail.session_time && (
                    <span> · {String(selectedSessionDetail.session_time).slice(0, 5)}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                style={styles.closeBtn}
                onClick={() => setSelectedSessionDetail(null)}
              >
                ×
              </button>
            </div>

            <div style={styles.sessionDetailBody}>
              <div style={styles.detailGrid}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Curriculum / Annex 1 Topic</span>
                  <span style={styles.detailVal}>
                    {selectedSessionDetail.curriculum_requirement ||
                      selectedSessionDetail.topic_name ||
                      "—"}
                  </span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Assigned Facilitator / Case Manager</span>
                  <span style={styles.detailVal}>
                    {selectedSessionDetail.facilitator_name ||
                      selectedSessionDetail.case_manager_name ||
                      "—"}
                  </span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Session Status</span>
                  <span style={styles.detailVal}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background:
                          SESSION_STATUS_BADGES[selectedSessionDetail.session_status]?.bg ||
                          "#EFF6FF",
                        color:
                          SESSION_STATUS_BADGES[selectedSessionDetail.session_status]?.color ||
                          "#1D4ED8",
                        border: `1px solid ${
                          SESSION_STATUS_BADGES[selectedSessionDetail.session_status]?.border ||
                          "#93C5FD"
                        }`,
                      }}
                    >
                      {SESSION_STATUS_BADGES[selectedSessionDetail.session_status]?.label ||
                        selectedSessionDetail.session_status}
                    </span>
                  </span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Roster Denominator Count</span>
                  <span style={styles.detailVal}>
                    <strong>{selectedSessionDetail.expected_count}</strong> expected ·{" "}
                    <strong>{selectedSessionDetail.recorded_count}</strong> recorded{" "}
                    {Number(selectedSessionDetail.unresolved_count) > 0 ? (
                      <span style={{ color: "#B45309", fontWeight: 700 }}>
                        ({selectedSessionDetail.unresolved_count} unrecorded)
                      </span>
                    ) : (
                      <span style={{ color: "#166534", fontWeight: 700 }}>
                        (Complete)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {selectedSessionDetail.original_session_id && (
                <div style={styles.rescheduleNoticeBox}>
                  ↳ <strong>Rescheduled from original date:</strong>{" "}
                  {String(selectedSessionDetail.original_session_date || "").slice(0, 10)}
                </div>
              )}

              {selectedSessionDetail.rescheduled_to_session_id && (
                <div style={styles.rescheduleNoticeBox}>
                  ↳ <strong>Rescheduled to new date:</strong>{" "}
                  {String(selectedSessionDetail.rescheduled_date || "").slice(0, 10)}
                  {selectedSessionDetail.rescheduled_reason && (
                    <div style={{ marginTop: 4, fontSize: 11.5 }}>
                      Reason: {selectedSessionDetail.rescheduled_reason}
                    </div>
                  )}
                </div>
              )}

              {selectedSessionDetail.cancellation_reason && (
                <div
                  style={{
                    ...styles.rescheduleNoticeBox,
                    borderColor: "#CBD5E1",
                    background: "#F1F5F9",
                    color: "#475569",
                  }}
                >
                  <strong>Cancellation Reason:</strong>{" "}
                  {selectedSessionDetail.cancellation_reason}
                </div>
              )}
            </div>

            <div style={styles.sessionDetailFooter}>
              <button
                type="button"
                style={styles.cancelModalBtn}
                onClick={() => setSelectedSessionDetail(null)}
              >
                Close
              </button>

              {canManageAttendance && (
                <button
                  type="button"
                  style={styles.scheduleAnotherBtn}
                  onClick={() => {
                    const sessionDateStr = selectedSessionDetail.session_date
                      ? String(selectedSessionDetail.session_date).slice(0, 10)
                      : "";
                    setSelectedScheduleDate(sessionDateStr);
                    setSelectedSessionDetail(null);
                    setScheduleModalOpen(true);
                  }}
                >
                  Schedule Another on this Date
                </button>
              )}

              {canManageAttendance &&
                selectedSessionDetail.session_status === "SCHEDULED" && (
                  <>
                    <button
                      type="button"
                      style={styles.tableActionRescheduleBtn}
                      onClick={() => {
                        setRescheduleTargetSession(selectedSessionDetail);
                        setSelectedSessionDetail(null);
                      }}
                    >
                      Reschedule
                    </button>
                    <button
                      type="button"
                      style={styles.tableActionRecordBtn}
                      onClick={() => {
                        setAttendanceTargetSession(selectedSessionDetail);
                        setSelectedSessionDetail(null);
                        setModalOpen(true);
                      }}
                    >
                      Record Attendance
                    </button>
                  </>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Session Modal */}
      {rescheduleTargetSession && (
        <RescheduleSessionModal
          session={rescheduleTargetSession}
          onClose={() => setRescheduleTargetSession(null)}
          onRescheduled={() => {
            setRescheduleTargetSession(null);
            loadData();
          }}
        />
      )}

      {/* Record Attendance Modal */}
      {modalOpen && (
        <RecordAttendanceModal
          existingSession={attendanceTargetSession}
          onClose={() => {
            setModalOpen(false);
            setAttendanceTargetSession(null);
          }}
          onSaved={() => {
            setModalOpen(false);
            setAttendanceTargetSession(null);
            loadData();
          }}
        />
      )}

      {/* Participation & Completion Review Modal */}
      {reviewRecord && (
        <div style={styles.modalBackdrop} onClick={() => setReviewRecord(null)}>
          <div style={styles.smallModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.smallModalHeader}>
              <div>
                <div style={styles.smallModalTitle}>Review Participation & Completion Credit</div>
                <div style={styles.smallModalSub}>
                  {reviewRecord.full_name} · {String(reviewRecord.session_date || "").slice(0, 10)} ·{" "}
                  {reviewRecord.curriculum_requirement || reviewRecord.session_name}
                </div>
              </div>
              <button
                type="button"
                style={styles.closeBtn}
                onClick={() => setReviewRecord(null)}
              >
                ×
              </button>
            </div>

            {reviewError && <div style={styles.errorBanner}>{reviewError}</div>}

            <form onSubmit={handleSaveReview} style={styles.smallModalBody}>
              <div style={styles.grid2}>
                <label style={styles.fieldLabel}>
                  Attendance Status
                  <select
                    style={styles.fieldInput}
                    value={reviewForm.status}
                    onChange={(e) => {
                      const nextSt = e.target.value;
                      setReviewForm((prev) => ({
                        ...prev,
                        status: nextSt,
                        completionStatus:
                          nextSt === "absent" || nextSt === "excused" || nextSt === "cancelled"
                            ? "NOT_CREDITED"
                            : prev.completionStatus,
                      }));
                    }}
                  >
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="excused">Excused</option>
                    <option value="absent">Absent</option>
                    <option value="cancelled">Session Cancelled (Center)</option>
                  </select>
                </label>

                <label style={styles.fieldLabel}>
                  Completion Decision
                  <select
                    style={styles.fieldInput}
                    value={reviewForm.completionStatus}
                    disabled={
                      reviewForm.status === "absent" ||
                      reviewForm.status === "excused" ||
                      reviewForm.status === "cancelled"
                    }
                    onChange={(e) =>
                      setReviewForm((prev) => ({ ...prev, completionStatus: e.target.value }))
                    }
                  >
                    <option value="CREDITED">Credited (Requirement Completed)</option>
                    <option value="PENDING_REVIEW">Pending Review</option>
                    <option value="NOT_CREDITED">Not Credited</option>
                  </select>
                </label>
              </div>

              {reviewForm.status === "late" && (
                <label style={styles.fieldLabel}>
                  Actual Arrival Time
                  <input
                    type="time"
                    style={styles.fieldInput}
                    value={reviewForm.arrivalTime}
                    onChange={(e) =>
                      setReviewForm((prev) => ({ ...prev, arrivalTime: e.target.value }))
                    }
                  />
                </label>
              )}

              {(reviewForm.status === "present" || reviewForm.status === "late") && (
                <div style={styles.makeupBox}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={reviewForm.isMakeup}
                      onChange={(e) =>
                        setReviewForm((prev) => ({ ...prev, isMakeup: e.target.checked }))
                      }
                    />
                    Link as Makeup Attendance for an earlier missed/unfulfilled requirement
                  </label>

                  {reviewForm.isMakeup && (
                    <div style={{ marginTop: 8 }}>
                      <select
                        style={styles.fieldInput}
                        value={reviewForm.makeupForAttendanceId}
                        onChange={(e) =>
                          setReviewForm((prev) => ({
                            ...prev,
                            makeupForAttendanceId: e.target.value,
                          }))
                        }
                      >
                        <option value="">— Select original missed/outstanding session —</option>
                        {(outstandingByPatient[reviewRecord.patient_id] || []).map((item) => (
                          <option key={item.attendanceId} value={String(item.attendanceId)}>
                            {item.sessionDate} · {item.requirement} ({item.status.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <label style={styles.fieldLabel}>
                Reason for Credit Decision / Excuse Approval
                <textarea
                  rows={2}
                  style={styles.fieldInput}
                  placeholder="State why credit is granted/withheld, or state the approved excuse reason..."
                  value={reviewForm.decisionReason}
                  onChange={(e) =>
                    setReviewForm((prev) => ({ ...prev, decisionReason: e.target.value }))
                  }
                />
              </label>

              <label style={styles.fieldLabel}>
                Authorized Staff Member (Case Manager / Supervisor)
                <input
                  type="text"
                  style={styles.fieldInput}
                  placeholder="Authorized staff full name"
                  value={reviewForm.authorizedByName}
                  onChange={(e) =>
                    setReviewForm((prev) => ({ ...prev, authorizedByName: e.target.value }))
                  }
                />
              </label>

              <div style={styles.smallModalFooter}>
                <button
                  type="button"
                  style={styles.cancelModalBtn}
                  onClick={() => setReviewRecord(null)}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.saveModalBtn} disabled={reviewSaving}>
                  {reviewSaving ? "Saving…" : "Save Completion Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MTRC Attendance Policy Approval Modal */}
      {policyModalOpen && (
        <div style={styles.modalBackdrop} onClick={() => setPolicyModalOpen(false)}>
          <div style={styles.smallModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.smallModalHeader}>
              <div>
                <div style={styles.smallModalTitle}>MTRC Approved Attendance & Participation Policy</div>
                <div style={styles.smallModalSub}>
                  Configure participation rules for late arrivals, duplicate credit prevention, and supervisor approval.
                </div>
              </div>
              <button
                type="button"
                style={styles.closeBtn}
                onClick={() => setPolicyModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSavePolicy} style={styles.smallModalBody}>
              <div style={styles.grid2}>
                <label style={styles.fieldLabel}>
                  Late Arrival Grace Period (Minutes)
                  <input
                    type="number"
                    min="0"
                    max="120"
                    style={styles.fieldInput}
                    value={policyForm.lateGraceMinutes}
                    onChange={(e) =>
                      setPolicyForm((prev) => ({
                        ...prev,
                        lateGraceMinutes: Number(e.target.value),
                      }))
                    }
                  />
                </label>

                <label style={styles.fieldLabel}>
                  Default Late Completion Status
                  <select
                    style={styles.fieldInput}
                    value={policyForm.lateDefaultDecision}
                    onChange={(e) =>
                      setPolicyForm((prev) => ({
                        ...prev,
                        lateDefaultDecision: e.target.value,
                      }))
                    }
                  >
                    <option value="PENDING_REVIEW">Pending Review (Case Manager decides)</option>
                    <option value="CREDITED">Credited (within grace period)</option>
                    <option value="NOT_CREDITED">Not Credited (unless overridden)</option>
                  </select>
                </label>
              </div>

              <div style={styles.grid2}>
                <label style={styles.fieldLabel}>
                  Approving Supervisor Name
                  <input
                    type="text"
                    style={styles.fieldInput}
                    placeholder="Name of MTRC Designated Supervisor"
                    value={policyForm.approvedByName || ""}
                    onChange={(e) =>
                      setPolicyForm((prev) => ({ ...prev, approvedByName: e.target.value }))
                    }
                  />
                </label>

                <label style={styles.fieldLabel}>
                  Supervisor Title / Designation
                  <input
                    type="text"
                    style={styles.fieldInput}
                    placeholder="MTRC Designated Supervisor / Chief of Hospital"
                    value={policyForm.approvedByTitle || ""}
                    onChange={(e) =>
                      setPolicyForm((prev) => ({ ...prev, approvedByTitle: e.target.value }))
                    }
                  />
                </label>
              </div>

              <label style={styles.fieldLabel}>
                Policy Summary & Participation Rules
                <textarea
                  rows={3}
                  style={styles.fieldInput}
                  value={policyForm.policyNotes || ""}
                  onChange={(e) =>
                    setPolicyForm((prev) => ({ ...prev, policyNotes: e.target.value }))
                  }
                />
              </label>

              <div style={styles.smallModalFooter}>
                <button
                  type="button"
                  style={styles.cancelModalBtn}
                  onClick={() => setPolicyModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.saveModalBtn} disabled={policySaving}>
                  {policySaving ? "Saving…" : "Approve & Save Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
      {sub && <div style={styles.statSub}>{sub}</div>}
    </div>
  );
}

const styles = {
  wrapper: { display: "flex", flexDirection: "column", gap: 14, height: "100%" },
  policyBanner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    background: "#F0FDF4",
    border: "1px solid #BBF7D0",
    borderRadius: "var(--radius-md, 10px)",
    padding: "10px 14px",
  },
  policyBannerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    flex: 1,
  },
  policyBadgePill: {
    background: "#164E33",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 9px",
    borderRadius: 999,
    whiteSpace: "nowrap",
  },
  policyText: {
    fontSize: 12,
    color: "#1E293B",
    lineHeight: 1.4,
  },
  policyEditBtn: {
    background: "#ffffff",
    color: "#164E33",
    border: "1px solid #86EFAC",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 },
  statCard: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "14px 16px",
  },
  statValue: { fontSize: 21, fontWeight: 800, color: "var(--color-text)" },
  statLabel: { fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", marginTop: 3 },
  statSub: { fontSize: 11, color: "#64748B", marginTop: 4 },

  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  leftControls: { display: "flex", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" },
  filterBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "8px 13px",
    fontSize: 13,
    fontWeight: 600,
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
  menuBackdrop: { position: "fixed", inset: 0, zIndex: 30 },
  filterPanel: {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md, 10px)",
    boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
    padding: 16,
    width: 290,
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

  quickPillsRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  quickPillBtn: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 999,
    padding: "6px 11px",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--color-text-muted)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  quickPillBtnActive: {
    background: "#164E33",
    borderColor: "#164E33",
    color: "#ffffff",
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
    maxWidth: 340,
  },
  searchIcon: { color: "var(--color-text-muted)", flexShrink: 0 },
  searchInput: {
    border: "none",
    outline: "none",
    fontSize: 13.5,
    width: "100%",
    background: "transparent",
  },

  recordBtn: {
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
  scheduleBtn: {
    background: "#166534",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "var(--radius-sm)",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxShadow: "0 2px 4px rgba(22, 101, 52, 0.2)",
  },
  unresolvedAlertBanner: {
    background: "#FFFBEB",
    border: "1px solid #FCD34D",
    borderRadius: "var(--radius-md, 10px)",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  unresolvedAlertLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  unresolvedAlertBtn: {
    background: "#D97706",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "7px 14px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  viewTabsRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    borderBottom: "1px solid var(--color-border)",
    paddingBottom: 4,
  },
  viewTabBtn: {
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  viewTabBtnActive: {
    color: "#166534",
    borderBottomColor: "#166534",
    fontWeight: 700,
  },
  unresolvedPill: {
    background: "#F0FDF4",
    color: "#166534",
    border: "1px solid #BBF7D0",
    borderRadius: 999,
    padding: "1px 8px",
    fontSize: "11px",
    fontWeight: 700,
  },
  tableActionRecordBtn: {
    background: "#166534",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "5px 10px",
    fontSize: "11.5px",
    fontWeight: 700,
    cursor: "pointer",
  },
  tableActionRescheduleBtn: {
    background: "#ffffff",
    color: "#1E3A2F",
    border: "1px solid #CBDAD0",
    borderRadius: "6px",
    padding: "5px 10px",
    fontSize: "11.5px",
    fontWeight: 600,
    cursor: "pointer",
  },

  tableCard: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md, 10px)",
    overflow: "auto",
  },
  table: {
    width: "100%",
    minWidth: 880,
    tableLayout: "fixed",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "12px 14px",
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
  td: {
    padding: "12px 14px",
    borderBottom: "1px solid var(--color-border)",
    wordBreak: "break-word",
    verticalAlign: "top",
  },
  emptyCell: { padding: 32, textAlign: "center", color: "var(--color-text-muted)" },
  statusBadge: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "capitalize",
    padding: "3px 9px",
    borderRadius: 999,
  },
  arrivalTimePill: {
    fontSize: 10.5,
    fontWeight: 600,
    color: "#2D4A3E",
    background: "#F4F7F4",
    border: "1px solid #CBDAD0",
    padding: "2px 6px",
    borderRadius: 4,
  },
  completionBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 9px",
    borderRadius: 999,
  },
  reasonText: {
    fontSize: 11.5,
    color: "#334155",
    lineHeight: 1.35,
  },
  authStaffText: {
    fontSize: 11,
    color: "#64748B",
  },
  makeupTag: {
    fontSize: 10.5,
    fontWeight: 600,
    background: "#F4F7F4",
    color: "#2D4A3E",
    border: "1px solid #CBDAD0",
    padding: "2px 6px",
    borderRadius: 4,
  },
  duplicateTag: {
    fontSize: 10.5,
    fontWeight: 600,
    background: "#F4F7F4",
    color: "#475569",
    border: "1px solid #CBDAD0",
    padding: "2px 6px",
    borderRadius: 4,
  },
  fulfilledTag: {
    fontSize: 10.5,
    fontWeight: 600,
    background: "#F0FDF4",
    color: "#166534",
    border: "1px solid #BBF7D0",
    padding: "2px 6px",
    borderRadius: 4,
  },
  outstandingTag: {
    fontSize: 10.5,
    fontWeight: 600,
    background: "#FBF3F3",
    color: "#7F2323",
    border: "1px solid #F0C4C4",
    padding: "2px 6px",
    borderRadius: 4,
  },
  reviewActionBtn: {
    background: "#F4F7F4",
    color: "#164E33",
    border: "1px solid #CBDAD0",
    borderRadius: 6,
    padding: "5px 10px",
    fontSize: 11.5,
    fontWeight: 600,
    cursor: "pointer",
  },

  // Modal styles
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 110,
    padding: 16,
  },
  smallModal: {
    background: "#ffffff",
    borderRadius: 14,
    width: 540,
    maxWidth: "95vw",
    boxShadow: "0 20px 40px rgba(0,0,0,0.22)",
    border: "1px solid #E2E8F0",
    overflow: "hidden",
  },
  smallModalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "16px 20px",
    borderBottom: "1px solid #EDF2F7",
  },
  smallModalTitle: {
    fontSize: 15.5,
    fontWeight: 800,
    color: "#164E33",
  },
  smallModalSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 22,
    color: "#94A3B8",
    cursor: "pointer",
    lineHeight: 1,
  },
  errorBanner: {
    background: "#FEF2F2",
    color: "#B91C1C",
    padding: "10px 20px",
    fontSize: 12.5,
    fontWeight: 600,
    borderBottom: "1px solid #FECACA",
  },
  smallModalBody: {
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  fieldLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    fontSize: 12,
    fontWeight: 700,
    color: "#334155",
  },
  fieldInput: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #CBD5E1",
    fontSize: 13,
    color: "#1E293B",
    background: "#ffffff",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  makeupBox: {
    background: "#F4F7F4",
    border: "1px solid #CBDAD0",
    borderRadius: 8,
    padding: "10px 12px",
  },
  smallModalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 6,
    paddingTop: 12,
    borderTop: "1px solid #EDF2F7",
  },
  cancelModalBtn: {
    background: "#ffffff",
    border: "1px solid #CBD5E1",
    color: "#475569",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  saveModalBtn: {
    background: "#164E33",
    border: "none",
    color: "#ffffff",
    padding: "8px 18px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  // Calendar View & Breakdown Methods
  scheduledSectionWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    flex: 1,
    minHeight: 0,
  },
  subViewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
    padding: "4px 0",
  },
  segmentedToggleWrap: {
    display: "inline-flex",
    alignItems: "center",
    background: "#F1F5F9",
    borderRadius: 10,
    padding: 3,
    border: "1px solid #E2E8F0",
    gap: 3,
  },
  segmentedToggleBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    color: "#64748B",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  },
  segmentedToggleBtnActive: {
    background: "#166534",
    color: "#ffffff",
    fontWeight: 700,
    boxShadow: "0 2px 4px rgba(22, 101, 52, 0.22)",
  },
  segmentedBadge: {
    padding: "1px 7px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    marginLeft: 2,
  },
  calendarControlsWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  calendarNavButtons: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    padding: "3px 6px",
  },
  calendarNavBtn: {
    background: "none",
    border: "none",
    fontSize: 18,
    fontWeight: 700,
    color: "#1E293B",
    cursor: "pointer",
    padding: "2px 8px",
    borderRadius: 4,
    lineHeight: 1,
  },
  calendarMonthHeading: {
    fontSize: 14,
    fontWeight: 800,
    color: "#164E33",
    padding: "0 8px",
    minWidth: 135,
    textAlign: "center",
  },
  todayJumpBtn: {
    background: "#F0FDF4",
    border: "1px solid #BBF7D0",
    color: "#166534",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 11.5,
    fontWeight: 700,
    cursor: "pointer",
  },
  calendarHintText: {
    fontSize: 12,
    color: "#64748B",
  },
  calendarLegendBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    padding: "7px 14px",
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    fontSize: 11.5,
  },
  legendWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  legendLabel: {
    fontWeight: 700,
    color: "#475569",
    marginRight: 2,
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    color: "#334155",
    fontWeight: 600,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    display: "inline-block",
  },
  legendStatsRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#64748B",
  },
  unresolvedBadgeSmall: {
    background: "#F0FDF4",
    color: "#166534",
    border: "1px solid #BBF7D0",
    padding: "2px 8px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 11,
  },
  calendarCard: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md, 10px)",
    overflow: "auto",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  calendarWeekdaysRow: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: "1px",
    background: "var(--color-border)",
    borderBottom: "1px solid var(--color-border)",
    position: "sticky",
    top: 0,
    zIndex: 2,
    width: "100%",
    minWidth: 700,
    boxSizing: "border-box",
  },
  calendarWeekdayCell: {
    background: "#F8FAFC",
    padding: "10px 8px",
    fontSize: 11,
    fontWeight: 700,
    textAlign: "center",
    letterSpacing: 0.5,
    minWidth: 0,
    boxSizing: "border-box",
  },
  calendarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: "1px",
    background: "var(--color-border)",
    width: "100%",
    minWidth: 700,
    boxSizing: "border-box",
  },
  calendarDayCell: {
    aspectRatio: "1 / 1",
    minHeight: 125,
    padding: "7px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 5,
    boxSizing: "border-box",
    minWidth: 0,
    overflow: "hidden",
  },
  calendarDayHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    minWidth: 0,
    flexShrink: 0,
  },
  calendarDayNumToday: {
    background: "#166534",
    color: "#ffffff",
    width: 22,
    height: 22,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11.5,
    fontWeight: 800,
    flexShrink: 0,
  },
  calendarDayNumCurrent: {
    fontSize: 12,
    fontWeight: 700,
    color: "#1E293B",
  },
  calendarDayNumOther: {
    fontSize: 11.5,
    fontWeight: 600,
    color: "#94A3B8",
  },
  cellAddBtn: {
    background: "#DCFCE7",
    color: "#166534",
    border: "1px solid #86EFAC",
    borderRadius: 4,
    padding: "1px 5px",
    fontSize: 10,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  calendarSessionsList: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflowY: "auto",
  },
  calendarSessionCard: {
    borderRadius: 6,
    padding: "4px 6px",
    border: "1px solid",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    cursor: "pointer",
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
  },
  sessionCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
  },
  sessionCardTime: {
    fontSize: 10,
    fontWeight: 700,
    color: "#1E293B",
    whiteSpace: "nowrap",
  },
  sessionStatusPill: {
    fontSize: 9,
    fontWeight: 700,
    padding: "1px 4px",
    borderRadius: 4,
    whiteSpace: "nowrap",
  },
  sessionCardTitle: {
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.25,
    overflow: "hidden",
    textOverflow: "ellipsis",
    wordBreak: "break-word",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    marginTop: 1,
  },
  sessionCardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 3,
    marginTop: 1,
    minWidth: 0,
  },
  unresolvedBadgeMini: {
    background: "#F4F7F4",
    color: "#2D4A3E",
    border: "1px solid #CBDAD0",
    padding: "1px 4px",
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  completedBadgeMini: {
    background: "#E8F5E9",
    color: "#166534",
    border: "1px solid #BBF7D0",
    padding: "1px 4px",
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  expectedBadgeMini: {
    background: "#F1F5F9",
    color: "#475569",
    padding: "1px 4px",
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  facilitatorMiniText: {
    fontSize: 9,
    color: "#64748B",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 55,
  },
  cellEmptyHint: {
    fontSize: 10,
    color: "#166534",
    textAlign: "center",
    padding: "6px 2px",
    fontWeight: 600,
    border: "1px dashed #BBF7D0",
    borderRadius: 6,
    background: "#F0FDF4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    minHeight: 32,
    boxSizing: "border-box",
  },
  sessionDetailModal: {
    background: "#ffffff",
    borderRadius: 14,
    width: 580,
    maxWidth: "95vw",
    boxShadow: "0 20px 40px rgba(0,0,0,0.22)",
    border: "1px solid #E2E8F0",
    overflow: "hidden",
  },
  sessionDetailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "18px 20px",
    borderBottom: "1px solid #EDF2F7",
  },
  modalityPillDetail: {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 999,
    display: "inline-block",
    marginBottom: 6,
  },
  sessionDetailTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 800,
    color: "#164E33",
  },
  sessionDetailSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 4,
  },
  sessionDetailBody: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  detailItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "#64748B",
  },
  detailVal: {
    fontSize: 13,
    color: "#1E293B",
  },
  rescheduleNoticeBox: {
    background: "#F4F7F4",
    border: "1px solid #CBDAD0",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#2D4A3E",
    fontSize: 12.5,
  },
  sessionDetailFooter: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    padding: "14px 20px",
    borderTop: "1px solid #EDF2F7",
    background: "#F8FAFC",
    flexWrap: "wrap",
  },
  scheduleAnotherBtn: {
    background: "#F0FDF4",
    color: "#166534",
    border: "1px solid #BBF7D0",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
};
