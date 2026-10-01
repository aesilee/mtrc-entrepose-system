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
              p.admission_date, p.rehab_start_date, p.sessions_required, p.updated_at,
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
    patients.forEach((p) => {
      const st = p.enrollment_status || "pending";
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    const activeCaseload = statusCounts.active || 0;
    const completedPatients = statusCounts.completed || 0;
    const droppedPatients = statusCounts.dropped || 0;
    const totalDischarged = completedPatients + droppedPatients;

    // Clinical retention rate: active + completed out of total enrolled
    const retentionRate = total > 0
      ? Math.round(((activeCaseload + completedPatients) / total) * 100)
      : 100;

    // Completion / graduation rate out of all discharged cases
    const completionRate = totalDischarged > 0
      ? Math.round((completedPatients / totalDischarged) * 100)
      : (total ? Math.round((completedPatients / total) * 100) : 0);

    const withAttendance = patients.filter((p) => p.total_sessions > 0);
    const avgAttendance = withAttendance.length
      ? Math.round(withAttendance.reduce((sum, p) => sum + (p.present_sessions / p.total_sessions) * 100, 0) / withAttendance.length)
      : 0;

    const withStart = patients.filter((p) => p.admission_date || p.rehab_start_date);
    const avgDurationMonths = withStart.length
      ? Math.round(
          withStart.reduce((sum, p) => {
            const start = new Date(p.admission_date || p.rehab_start_date);
            const end = (p.enrollment_status === "completed" || p.enrollment_status === "dropped") ? new Date(p.updated_at) : new Date();
            return sum + Math.max((end - start) / (1000 * 60 * 60 * 24 * 30), 0);
          }, 0) / withStart.length
        )
      : 0;

    const nearCompletion = patients.filter(
      (p) => p.enrollment_status === "active" && (p.sessions_required || 43) &&
        p.present_sessions / (p.sessions_required || 43) >= 0.8 && p.present_sessions / (p.sessions_required || 43) < 1
    ).length;

    // Drug test abstinence metrics
    const dtClauses = ["p.is_archived = FALSE"];
    const dtParams = [];
    if (req.user.role === "case_manager") {
      dtClauses.push("p.assigned_case_manager_id = ?");
      dtParams.push(req.user.id);
    }
    const [[dtStats]] = await pool.query(
      `SELECT COUNT(*) AS total_tests,
              SUM(CASE WHEN UPPER(TRIM(dt.result)) = 'NEGATIVE' THEN 1 ELSE 0 END) AS negative_tests,
              SUM(CASE WHEN UPPER(TRIM(dt.result)) = 'POSITIVE' THEN 1 ELSE 0 END) AS positive_tests
       FROM drug_test_logs dt
       JOIN patients p ON p.id = dt.patient_id
       WHERE ${dtClauses.join(" AND ")}`,
      dtParams
    );
    const totalDrugTests = Number(dtStats?.total_tests || 0);
    const negativeDrugTests = Number(dtStats?.negative_tests || 0);
    const drugTestAbstinenceRate = totalDrugTests > 0
      ? Math.round((negativeDrugTests / totalDrugTests) * 100)
      : 100;

    // Primary substance distribution
    const [substanceRows] = await pool.query(
      `SELECT ps.drug_used, COUNT(*) AS count
       FROM patient_substances ps
       JOIN patients p ON p.id = ps.patient_id
       WHERE ${patientClauses.join(" AND ")} AND ps.drug_used IS NOT NULL AND ps.drug_used != ''
       GROUP BY ps.drug_used
       ORDER BY count DESC
       LIMIT 8`,
      patientParams
    );
    const substanceDistribution = substanceRows.map((r) => ({
      label: r.drug_used,
      value: Number(r.count),
    }));

    // Legal admission classification
    const [admissionRows] = await pool.query(
      `SELECT p.id,
              COALESCE(p.admission_type, r.admission_type) AS admission_type,
              r.nature_of_confinement,
              COALESCE(r.referral_source, p.referral_source) AS referral_source,
              r.type_of_patient
       FROM patients p
       LEFT JOIN patient_referrals r ON r.patient_id = p.id
       WHERE ${patientClauses.join(" AND ")}`,
      patientParams
    );

    const admissionCounts = { "Court-Mandated": 0, "Voluntary": 0, "LGU-Referred": 0 };
    admissionRows.forEach((p) => {
      const nature = (p.nature_of_confinement || "").toLowerCase();
      const source = (p.referral_source || p.type_of_patient || "").toLowerCase();
      const admType = (p.admission_type || "").toLowerCase();

      if (
        nature.includes("court") ||
        nature.includes("plea bargaining") ||
        nature.includes("compulsory") ||
        nature.includes("arrested") ||
        nature.includes("suspended sentence") ||
        source.includes("court") ||
        admType.includes("court")
      ) {
        admissionCounts["Court-Mandated"]++;
      } else if (source.includes("lgu")) {
        admissionCounts["LGU-Referred"]++;
      } else if (
        nature.includes("without court order") ||
        nature.includes("self-referral") ||
        source === "voluntary" ||
        admType === "voluntary"
      ) {
        admissionCounts["Voluntary"]++;
      } else {
        admissionCounts["Court-Mandated"]++;
      }
    });

    const admissionClassification = Object.entries(admissionCounts)
      .filter(([, v]) => v > 0)
      .map(([label, value]) => ({ label, value }));

    // Service modality breakdown
    const [modalityRows] = await pool.query(
      `SELECT a.session_type, COUNT(*) AS count
       FROM attendance a
       JOIN patients p ON p.id = a.patient_id
       WHERE a.status = 'present' AND ${patientClauses.join(" AND ")}
       GROUP BY a.session_type
       ORDER BY count DESC`,
      patientParams
    );

    const MODALITY_LABELS = {
      CBT_GROUP: "CBT Group",
      PSYCHO_EDUCATION: "Psycho-Ed",
      SHGM: "Self-Help (SHGM)",
      INDIVIDUAL_COUNSELING: "Individual",
      CONJOINT_FAMILY: "Family Session",
    };

    const modalityVolume = modalityRows.map((r) => {
      const label = MODALITY_LABELS[r.session_type] || (r.session_type ? r.session_type.replace(/_/g, " ") : "Other");
      return { label, value: Number(r.count) };
    });

    // 43-Session Curriculum Phase progression for active cohort
    const [cohortRows] = await pool.query(
      `SELECT p.id,
              (SELECT COUNT(*) FROM attendance a
               WHERE a.patient_id = p.id
                 AND a.status = 'present'
                 AND a.session_type IN ('CBT_GROUP', 'PSYCHO_EDUCATION')) AS core_sessions
       FROM patients p
       WHERE ${patientClauses.join(" AND ")} AND p.enrollment_status = 'active'`,
      patientParams
    );

    let phase1 = 0; // 1-14 sessions
    let phase2 = 0; // 15-28 sessions
    let phase3 = 0; // 29-42 sessions
    let pdcReady = 0; // 43+ sessions

    cohortRows.forEach((r) => {
      const s = Number(r.core_sessions || 0);
      if (s >= 43) pdcReady++;
      else if (s >= 29) phase3++;
      else if (s >= 15) phase2++;
      else phase1++;
    });

    const curriculumPhases = [
      { label: "Phase 1 (1-14)", value: phase1 },
      { label: "Phase 2 (15-28)", value: phase2 },
      { label: "Phase 3 (29-42)", value: phase3 },
      { label: "PDC Ready (43+)", value: pdcReady },
    ];

    // Query discharge breakdown
    const dischargeClauses = [];
    const dischargeParams = [];
    let dischargeJoin = "";
    if (req.user.role === "case_manager") {
      dischargeJoin = "JOIN patients p ON p.id = d.patient_id";
      dischargeClauses.push("p.assigned_case_manager_id = ?");
      dischargeParams.push(req.user.id);
    }
    const [dischargeRows] = await pool.query(
      `SELECT d.discharge_type, COUNT(*) as count 
       FROM discharges d ${dischargeJoin}
       ${dischargeClauses.length ? "WHERE " + dischargeClauses.join(" AND ") : ""}
       GROUP BY d.discharge_type`,
      dischargeParams
    );
    const dischargeDistribution = dischargeRows.map((r) => ({ label: r.discharge_type, value: r.count }));

    function normalizeMunicipality(name) {
      if (!name || !name.trim()) return "Unspecified";
      return name.trim()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }

    const municipalityData = {};
    patients.forEach((p) => {
      const m = normalizeMunicipality(p.municipality);
      if (!municipalityData[m]) {
        municipalityData[m] = { count: 0, totalSessions: 0, presentSessions: 0 };
      }
      municipalityData[m].count += 1;
      municipalityData[m].totalSessions += Number(p.total_sessions || 0);
      municipalityData[m].presentSessions += Number(p.present_sessions || 0);
    });

    const municipalityDistribution = Object.entries(municipalityData)
      .sort((a, b) => b[1].count - a[1].count || b[1].totalSessions - a[1].totalSessions)
      .slice(0, 10)
      .map(([label, info]) => {
        const percentage = total > 0 ? Math.round((info.count / total) * 100) : 0;
        return {
          label,
          value: info.count,
          count: info.count,
          percentage,
          sessionCount: info.totalSessions,
          presentSessions: info.presentSessions,
        };
      });

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
    const topSubstance = substanceDistribution[0]?.label || "—";
    const topAdmissionType = admissionClassification[0]?.label || "—";

    res.json({
      kpis: {
        retentionRate,
        completionRate,
        completedPatients,
        activeCaseload,
        totalDischarged,
        avgAttendance,
        avgDurationMonths,
        nearCompletion,
        drugTestAbstinenceRate,
        totalDrugTests,
      },
      patientStatus: Object.entries(statusCounts).filter(([, v]) => v > 0).map(([label, value]) => ({ label, value })),
      dischargeDistribution,
      municipalityDistribution,
      genderDistribution: Object.entries(genderCounts).filter(([, v]) => v > 0).map(([label, value]) => ({ label, value })),
      ageDistribution: Object.entries(ageBuckets).map(([label, value]) => ({ label, value })),
      substanceDistribution,
      admissionClassification,
      modalityVolume,
      curriculumPhases,
      attendanceByCaseManager,
      recentStats: {
        highestAttendance: highestAttendancePatient ? `${highestAttendanceName} (${highestAttendancePatient.rate}%)` : "—",
        mostCommonAge: mostCommonAgeBucket ? mostCommonAgeBucket[0] : "—",
        mostActiveMunicipality: mostActiveMunicipality ? `${mostActiveMunicipality.label} (${mostActiveMunicipality.value})` : "—",
        topSubstance,
        topAdmissionType,
        totalDrugTests,
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

export async function getMonthlyDischarges(req, res) {
  const { dateFrom, dateTo } = req.query;
  const months = getMonthRange(dateFrom, dateTo);
  const rangeStart = `${months[0].year}-${String(months[0].month).padStart(2, "0")}-01`;

  const clauses = ["d.discharge_date >= ?"];
  const params = [rangeStart];
  let joinPatient = "";

  if (req.user.role === "case_manager") {
    joinPatient = "JOIN patients p ON p.id = d.patient_id";
    clauses.push("p.assigned_case_manager_id = ?");
    params.push(req.user.id);
  }

  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(d.discharge_date, '%Y-%m') AS ym, COUNT(*) AS count
     FROM discharges d ${joinPatient}
     WHERE ${clauses.join(" AND ")}
     GROUP BY ym`,
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