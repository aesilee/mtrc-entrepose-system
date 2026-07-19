import pool from "../config/db.js";

async function buildAttendanceReport({ dateFrom, dateTo, caseManagerId, programStatus, patientId }) {
  const where = [];
  const params = [];
  if (dateFrom && dateTo) { where.push("a.session_date BETWEEN ? AND ?"); params.push(dateFrom, dateTo); }
  if (caseManagerId) { where.push("s.case_manager_id = ?"); params.push(caseManagerId); }
  if (programStatus) { where.push("p.enrollment_status = ?"); params.push(programStatus); }
  if (patientId) { where.push("a.patient_id = ?"); params.push(patientId); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT a.session_date, a.status, s.session_name, p.full_name, p.patient_code
     FROM attendance a
     JOIN patients p ON p.id = a.patient_id
     LEFT JOIN sessions s ON s.id = a.session_id
     ${whereSql}
     ORDER BY a.session_date DESC`,
    params
  );

  const totalSessions = rows.length;
  const presentCount = rows.filter((r) => r.status === "present").length;
  const absentCount = rows.filter((r) => r.status === "absent").length;
  const excusedCount = rows.filter((r) => r.status === "excused").length;
  const lateCount = rows.filter((r) => r.status === "late").length;
  const attendanceRate = totalSessions ? Math.round((presentCount / totalSessions) * 100) : 0;

  return {
    title: "Attendance Report",
    description: `Attendance records${dateFrom && dateTo ? ` from ${dateFrom} to ${dateTo}` : ""}, showing session counts and presence rate across the filtered population.`,
    dateRangeLabel: dateFrom && dateTo ? `${dateFrom} – ${dateTo}` : "All time",
    stats: { totalSessions, presentCount, absentCount, excusedCount, lateCount, attendanceRate },
    chart: { type: "bar", data: [
      { label: "Present", value: presentCount }, { label: "Absent", value: absentCount },
      { label: "Excused", value: excusedCount }, { label: "Late", value: lateCount },
    ]},
    rows: rows.map((r) => ({ date: r.session_date, patient: r.full_name, patientCode: r.patient_code, session: r.session_name || "—", status: r.status })),
  };
}

async function buildPatientReport({ patientId }) {
  if (!patientId) throw Object.assign(new Error("Select a patient to generate this report."), { status: 400 });

  const [[patient]] = await pool.query(
    `SELECT p.*, u.full_name AS case_manager_name, pr.name AS program_name
     FROM patients p LEFT JOIN users u ON u.id = p.assigned_case_manager_id LEFT JOIN programs pr ON pr.id = p.program_id
     WHERE p.id = ?`, [patientId]
  );
  if (!patient) throw Object.assign(new Error("Patient not found."), { status: 404 });

  const [attendance] = await pool.query(`SELECT status FROM attendance WHERE patient_id = ?`, [patientId]);
  const total = attendance.length;
  const present = attendance.filter((a) => a.status === "present").length;
  const attendanceRate = total ? Math.round((present / total) * 100) : 0;
  const completionPct = patient.sessions_required ? Math.round((present / patient.sessions_required) * 100) : null;

  return {
    title: `Patient Report — ${patient.full_name}`,
    description: `Detailed profile and program progress for ${patient.full_name} (${patient.patient_code}).`,
    dateRangeLabel: "As of today",
    stats: {
      admissionDate: patient.admission_date, currentStatus: patient.current_status || patient.enrollment_status,
      caseManager: patient.case_manager_name || "Unassigned", completionPct, attendanceRate, totalSessions: total, presentSessions: present,
    },
    chart: { type: "pie", data: [{ label: "Present", value: present }, { label: "Missed", value: total - present }] },
    rows: [{ patientCode: patient.patient_code, name: patient.full_name, program: patient.program_name || "—",
      admissionDate: patient.admission_date, status: patient.enrollment_status,
      caseManager: patient.case_manager_name || "Unassigned", attendanceRate: `${attendanceRate}%` }],
  };
}

async function buildProgramReport({ dateFrom, dateTo, caseManagerId }) {
  const where = ["p.is_archived = FALSE"];
  const params = [];
  if (dateFrom && dateTo) { where.push("p.admission_date BETWEEN ? AND ?"); params.push(dateFrom, dateTo); }
  if (caseManagerId) { where.push("p.assigned_case_manager_id = ?"); params.push(caseManagerId); }
  const whereSql = `WHERE ${where.join(" AND ")}`;

  const [patients] = await pool.query(
    `SELECT p.enrollment_status, p.sessions_required,
            (SELECT COUNT(*) FROM attendance a WHERE a.patient_id = p.id) AS total_sessions,
            (SELECT COUNT(*) FROM attendance a WHERE a.patient_id = p.id AND a.status = 'present') AS present_sessions
     FROM patients p ${whereSql}`, params
  );

  const counts = { active: 0, completed: 0, dropped: 0, transferred: 0, pending: 0 };
  patients.forEach((p) => { counts[p.enrollment_status] = (counts[p.enrollment_status] || 0) + 1; });

  const completionRates = patients.filter((p) => p.sessions_required).map((p) => (p.present_sessions / p.sessions_required) * 100);
  const avgCompletion = completionRates.length ? Math.round(completionRates.reduce((a, b) => a + b, 0) / completionRates.length) : 0;
  const attendanceRates = patients.filter((p) => p.total_sessions > 0).map((p) => (p.present_sessions / p.total_sessions) * 100);
  const avgAttendance = attendanceRates.length ? Math.round(attendanceRates.reduce((a, b) => a + b, 0) / attendanceRates.length) : 0;

  return {
    title: "Program Report",
    description: `Program-wide caseload breakdown${dateFrom && dateTo ? ` for patients admitted between ${dateFrom} and ${dateTo}` : ""}, with average completion and attendance across all patients.`,
    dateRangeLabel: dateFrom && dateTo ? `${dateFrom} – ${dateTo}` : "All time",
    stats: { totalPatients: patients.length, ...counts, avgCompletion, avgAttendance },
    chart: { type: "pie", data: Object.entries(counts).filter(([, v]) => v > 0).map(([label, value]) => ({ label, value })) },
    rows: Object.entries(counts).map(([status, count]) => ({ status, count })),
  };
}

async function buildMonthlyReport({ dateFrom, dateTo }) {
  const from = dateFrom || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const to = dateTo || new Date().toISOString().slice(0, 10);

  const [[{ newAdmissions }]] = await pool.query(`SELECT COUNT(*) AS newAdmissions FROM patients WHERE admission_date BETWEEN ? AND ?`, [from, to]);
  const [[{ graduatedPatients }]] = await pool.query(`SELECT COUNT(*) AS graduatedPatients FROM patients WHERE enrollment_status = 'completed' AND updated_at BETWEEN ? AND ?`, [from, to]);
  const [attendance] = await pool.query(`SELECT status FROM attendance WHERE session_date BETWEEN ? AND ?`, [from, to]);
  const total = attendance.length;
  const present = attendance.filter((a) => a.status === "present").length;
  const attendanceRate = total ? Math.round((present / total) * 100) : 0;

  return {
    title: "Monthly Report",
    description: `Consolidated activity from ${from} to ${to}: new admissions, graduations, and attendance across all programs.`,
    dateRangeLabel: `${from} – ${to}`,
    stats: { newAdmissions, graduatedPatients, totalSessions: total, presentSessions: present, attendanceRate },
    chart: { type: "bar", data: [
      { label: "New Admissions", value: newAdmissions }, { label: "Graduated", value: graduatedPatients }, { label: "Sessions Present", value: present },
    ]},
    rows: [{ period: `${from} to ${to}`, newAdmissions, graduatedPatients, totalSessions: total, attendanceRate: `${attendanceRate}%` }],
  };
}

const BUILDERS = { attendance: buildAttendanceReport, patient: buildPatientReport, program: buildProgramReport, monthly: buildMonthlyReport };

export async function generateReport(req, res) {
  const { reportType, dateFrom, dateTo, caseManagerId, programStatus, patientId } = req.body;
  const builder = BUILDERS[reportType];
  if (!builder) return res.status(400).json({ message: "Invalid report type." });

  try {
    const report = await builder({ dateFrom, dateTo, caseManagerId, programStatus, patientId });

    const [result] = await pool.query(
      `INSERT INTO generated_reports
        (report_type, title, description, date_range_label, date_from, date_to,
         case_manager_id, program_status, patient_id, stats_json, chart_json, rows_json, generated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [reportType, report.title, report.description, report.dateRangeLabel, dateFrom || null, dateTo || null,
        caseManagerId || null, programStatus || null, patientId || null,
        JSON.stringify(report.stats), JSON.stringify(report.chart), JSON.stringify(report.rows), req.user.id]
    );

    await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
      req.user.username, `Generated a ${reportType} report: "${report.title}"`,
    ]);

    res.status(201).json({ id: result.insertId, reportType, ...report });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || "Could not generate the report." });
  }
}

export async function listReports(req, res) {
  const { reportType, dateFrom, dateTo, caseManagerId, programStatus, patientId, search } = req.query;
  const where = [];
  const params = [];

  if (reportType) { where.push("gr.report_type = ?"); params.push(reportType); }
  if (dateFrom) { where.push("gr.created_at >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("gr.created_at <= DATE_ADD(?, INTERVAL 1 DAY)"); params.push(dateTo); }
  if (caseManagerId) { where.push("gr.case_manager_id = ?"); params.push(caseManagerId); }
  if (programStatus) { where.push("gr.program_status = ?"); params.push(programStatus); }
  if (patientId) { where.push("gr.patient_id = ?"); params.push(patientId); }
  if (search) { where.push("gr.title LIKE ?"); params.push(`%${search}%`); }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT gr.id, gr.report_type, gr.title, gr.description, gr.date_range_label, gr.created_at,
            u.full_name AS generated_by_name
     FROM generated_reports gr
     LEFT JOIN users u ON u.id = gr.generated_by
     ${whereSql}
     ORDER BY gr.created_at DESC`,
    params
  );
  res.json({ reports: rows });
}

export async function getReport(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT gr.*, u.full_name AS generated_by_name
     FROM generated_reports gr LEFT JOIN users u ON u.id = gr.generated_by
     WHERE gr.id = ?`, [id]
  );
  if (!rows[0]) return res.status(404).json({ message: "Report not found." });

  const r = rows[0];
  res.json({
    id: r.id, reportType: r.report_type, title: r.title, description: r.description,
    dateRangeLabel: r.date_range_label, generatedBy: r.generated_by_name, createdAt: r.created_at,
    stats: r.stats_json, chart: r.chart_json, rows: r.rows_json,
  });
}

export async function deleteReport(req, res) {
  const { id } = req.params;
  const [[report]] = await pool.query("SELECT title FROM generated_reports WHERE id = ?", [id]);
  if (!report) return res.status(404).json({ message: "Report not found." });

  try {
    await pool.query("DELETE FROM generated_reports WHERE id = ?", [id]);
    await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
      req.user.username, `Deleted a generated report: "${report.title}"`,
    ]);
    res.json({ message: "Report deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete the report." });
  }
}