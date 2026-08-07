import pool from "../config/db.js";

function monthLabel(y, m) {
  return new Date(y, m - 1, 1).toLocaleString("default", { month: "short", year: "numeric" });
}

function getMonthRange(dateFrom, dateTo) {
  const end = dateTo ? new Date(dateTo) : new Date();
  const start = dateFrom ? new Date(dateFrom) : new Date(end.getFullYear(), end.getMonth() - 11, 1);
  const months = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return months;
}

// ---- Snapshot data: current totals, no date range needed ----
export async function getAnalyticsOverview(req, res) {
  try {
    const patientClauses = ["p.is_archived = FALSE"];
    const patientParams = [];
    if (req.user.role === "case_manager") {
      patientClauses.push("p.assigned_case_manager_id = ?");
      patientParams.push(req.user.id);
    }

    const [patients] = await pool.query(
      `SELECT p.id, p.gender, p.municipality, p.birthdate, p.enrollment_status,
              p.rehab_start_date, p.sessions_required, p.updated_at,
              p.assigned_case_manager_id, u.full_name AS case_manager_name,
              (SELECT COUNT(*) FROM attendance a WHERE a.patient_id = p.id) AS total_sessions,
              (SELECT COUNT(*) FROM attendance a WHERE a.patient_id = p.id AND a.status = 'present') AS present_sessions
       FROM patients p
       LEFT JOIN users u ON u.id = p.assigned_case_manager_id
       WHERE ${patientClauses.join(" AND ")}`,
      patientParams
    );

    const total = patients.length;
    const statusCounts = { active: 0, completed: 0, dropped: 0, transferred: 0, pending: 0 };
    patients.forEach((p) => { statusCounts[p.enrollment_status] = (statusCounts[p.enrollment_status] || 0) + 1; });

    const completionRate = total ? Math.round((statusCounts.completed / total) * 100) : 0;

    const withAttendance = patients.filter((p) => p.total_sessions > 0);
    const avgAttendance = withAttendance.length
      ? Math.round(withAttendance.reduce((sum, p) => sum + (p.present_sessions / p.total_sessions) * 100, 0) / withAttendance.length)
      : 0;

    const withRehabStart = patients.filter((p) => p.rehab_start_date);
    const avgDurationMonths = withRehabStart.length
      ? Math.round(
          withRehabStart.reduce((sum, p) => {
            const start = new Date(p.rehab_start_date);
            const end = p.enrollment_status === "completed" ? new Date(p.updated_at) : new Date();
            return sum + Math.max((end - start) / (1000 * 60 * 60 * 24 * 30), 0);
          }, 0) / withRehabStart.length
        )
      : 0;

    const nearCompletion = patients.filter(
      (p) => p.enrollment_status === "active" && p.sessions_required &&
        p.present_sessions / p.sessions_required >= 0.8 && p.present_sessions / p.sessions_required < 1
    ).length;

    const municipalityCounts = {};
    patients.forEach((p) => {
      const m = p.municipality || "Unspecified";
      municipalityCounts[m] = (municipalityCounts[m] || 0) + 1;
    });
    const municipalityDistribution = Object.entries(municipalityCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([label, value]) => ({ label, value }));

    const genderCounts = { male: 0, female: 0, other: 0 };
    patients.forEach((p) => { genderCounts[p.gender] = (genderCounts[p.gender] || 0) + 1; });

    const ageBuckets = { "Under 18": 0, "18-25": 0, "26-35": 0, "36-45": 0, "46+": 0 };
    patients.forEach((p) => {
      if (!p.birthdate) return;
      const age = Math.floor((new Date() - new Date(p.birthdate)) / (1000 * 60 * 60 * 24 * 365.25));
      if (age < 18) ageBuckets["Under 18"]++;
      else if (age <= 25) ageBuckets["18-25"]++;
      else if (age <= 35) ageBuckets["26-35"]++;
      else if (age <= 45) ageBuckets["36-45"]++;
      else ageBuckets["46+"]++;
    });

    const cmMap = {};
    patients.forEach((p) => {
      if (!p.assigned_case_manager_id || p.total_sessions === 0) return;
      const key = p.case_manager_name || "Unassigned";
      if (!cmMap[key]) cmMap[key] = { present: 0, total: 0 };
      cmMap[key].present += p.present_sessions;
      cmMap[key].total += p.total_sessions;
    });
    const attendanceByCaseManager = Object.entries(cmMap)
      .map(([label, v]) => ({ label, value: Math.round((v.present / v.total) * 100) }))
      .sort((a, b) => b.value - a.value);

    let highestAttendancePatient = null;
    withAttendance.forEach((p) => {
      const rate = Math.round((p.present_sessions / p.total_sessions) * 100);
      if (!highestAttendancePatient || rate > highestAttendancePatient.rate) {
        highestAttendancePatient = { id: p.id, rate };
      }
    });
    let highestAttendanceName = "—";
    if (highestAttendancePatient) {
      const [[hp]] = await pool.query("SELECT full_name FROM patients WHERE id = ?", [highestAttendancePatient.id]);
      highestAttendanceName = hp?.full_name || "—";
    }

    const mostCommonAgeBucket = Object.entries(ageBuckets).sort((a, b) => b[1] - a[1])[0];
    const mostActiveMunicipality = municipalityDistribution[0];

    res.json({
      kpis: { completionRate, completedPatients: statusCounts.completed, avgAttendance, avgDurationMonths, nearCompletion },
      patientStatus: Object.entries(statusCounts).filter(([, v]) => v > 0).map(([label, value]) => ({ label, value })),
      municipalityDistribution,
      genderDistribution: Object.entries(genderCounts).filter(([, v]) => v > 0).map(([label, value]) => ({ label, value })),
      ageDistribution: Object.entries(ageBuckets).map(([label, value]) => ({ label, value })),
      attendanceByCaseManager,
      recentStats: {
        highestAttendance: highestAttendancePatient ? `${highestAttendanceName} (${highestAttendancePatient.rate}%)` : "—",
        mostCommonAge: mostCommonAgeBucket ? mostCommonAgeBucket[0] : "—",
        mostActiveMunicipality: mostActiveMunicipality ? `${mostActiveMunicipality.label} (${mostActiveMunicipality.value})` : "—",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load analytics overview." });
  }
}

// ---- Time-series: each has its own date range ----
export async function getMonthlyAdmissions(req, res) {
  const { dateFrom, dateTo } = req.query;
  const months = getMonthRange(dateFrom, dateTo);
  const rangeStart = `${months[0].year}-${String(months[0].month).padStart(2, "0")}-01`;

  const clauses = ["admission_date >= ?"];
  const params = [rangeStart];
  if (req.user.role === "case_manager") {
    clauses.push("assigned_case_manager_id = ?");
    params.push(req.user.id);
  }

  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(admission_date, '%Y-%m') AS ym, COUNT(*) AS count
     FROM patients WHERE ${clauses.join(" AND ")} GROUP BY ym`,
    params
  );
  const map = Object.fromEntries(rows.map((r) => [r.ym, r.count]));

  res.json({
    data: months.map(({ year, month }) => {
      const key = `${year}-${String(month).padStart(2, "0")}`;
      return { label: monthLabel(year, month), value: map[key] || 0 };
    }),
  });
}

export async function getAttendanceTrend(req, res) {
  const { dateFrom, dateTo } = req.query;
  const months = getMonthRange(dateFrom, dateTo);
  const rangeStart = `${months[0].year}-${String(months[0].month).padStart(2, "0")}-01`;

  const scopeJoin = req.user.role === "case_manager"
    ? "JOIN patients p ON p.id = a.patient_id AND p.assigned_case_manager_id = ?"
    : "";
  const scopeParams = req.user.role === "case_manager" ? [req.user.id] : [];

  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(a.session_date, '%Y-%m') AS ym,
            SUM(a.status = 'present') AS present, COUNT(*) AS total
     FROM attendance a ${scopeJoin}
     WHERE a.session_date >= ? GROUP BY ym`,
    [...scopeParams, rangeStart]
  );
  const map = Object.fromEntries(rows.map((r) => [r.ym, r.total ? Math.round((r.present / r.total) * 100) : 0]));

  res.json({
    data: months.map(({ year, month }) => {
      const key = `${year}-${String(month).padStart(2, "0")}`;
      return { label: monthLabel(year, month), value: map[key] ?? 0 };
    }),
  });
}