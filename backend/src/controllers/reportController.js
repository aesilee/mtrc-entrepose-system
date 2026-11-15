import pool from "../config/db.js";
import { notifyIctAdmins, notifyRoles } from "../utils/notify.js";
import { getUnifiedPatientProgress, getBulkUnifiedPatientProgress } from "../utils/curriculumProgress.js";

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

  const [attendance] = await pool.query(`SELECT status FROM attendance WHERE patient_id = ? AND status != 'cancelled'`, [patientId]);
  const total = attendance.length;
  const present = attendance.filter((a) => a.status === "present" || a.status === "late").length;
  const attendanceRate = total ? Math.round((present / total) * 100) : 0;

  const progress = await getUnifiedPatientProgress(pool, patientId);
  const completionPct = progress.components.totalCore.percentage;

  return {
    title: `Patient Report — ${patient.full_name}`,
    description: `Detailed profile and unified 43-core curriculum progress (28 CBT, 3 CBT-E, 12 PE) for ${patient.full_name} (${patient.patient_code}).`,
    dateRangeLabel: "As of today",
    stats: {
      admissionDate: patient.admission_date,
      currentStatus: patient.current_status || patient.enrollment_status,
      caseManager: patient.case_manager_name || "Unassigned",
      completionPct,
      coreCompleted: `${progress.components.totalCore.completed} / 43`,
      cbtProgress: `${progress.components.cbt.completed} / 28`,
      cbteProgress: `${progress.components.cbte.completed} / 3`,
      peProgress: `${progress.components.pe.completed} / 12`,
      attendanceRate,
      totalSessions: total,
      presentSessions: present,
    },
    chart: { type: "pie", data: [{ label: "Present / Late", value: present }, { label: "Missed / Excused", value: Math.max(0, total - present) }] },
    rows: [{
      patientCode: patient.patient_code,
      name: patient.full_name,
      program: patient.program_name || "—",
      admissionDate: patient.admission_date,
      status: patient.enrollment_status,
      caseManager: patient.case_manager_name || "Unassigned",
      coreProgress: `${progress.components.totalCore.completed}/43 (CBT ${progress.components.cbt.completed}/28 · CBT-E ${progress.components.cbte.completed}/3 · PE ${progress.components.pe.completed}/12)`,
      attendanceRate: `${attendanceRate}%`,
    }],
  };
}

async function buildProgramReport({ dateFrom, dateTo, caseManagerId }) {
  const where = ["p.is_archived = FALSE"];
  const params = [];
  if (dateFrom && dateTo) { where.push("p.admission_date BETWEEN ? AND ?"); params.push(dateFrom, dateTo); }
  if (caseManagerId) { where.push("p.assigned_case_manager_id = ?"); params.push(caseManagerId); }
  const whereSql = `WHERE ${where.join(" AND ")}`;

  const [patients] = await pool.query(
    `SELECT p.id, p.enrollment_status, p.sessions_required,
            (SELECT COUNT(*) FROM attendance a WHERE a.patient_id = p.id AND a.status != 'cancelled') AS total_sessions,
            (SELECT COUNT(*) FROM attendance a WHERE a.patient_id = p.id AND a.status IN ('present', 'late')) AS present_sessions
     FROM patients p ${whereSql}`, params
  );

  const progressMap = await getBulkUnifiedPatientProgress(pool, patients.map((p) => p.id));

  const counts = { active: 0, completed: 0, dropped: 0, transferred: 0, pending: 0 };
  patients.forEach((p) => { counts[p.enrollment_status] = (counts[p.enrollment_status] || 0) + 1; });

  const completionRates = patients.map((p) => progressMap.get(Number(p.id))?.components?.totalCore?.percentage ?? 0);
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
  const [[{ graduatedPatients }]] = await pool.query(
    `SELECT COUNT(DISTINCT d.patient_id) AS graduatedPatients 
     FROM discharges d 
     WHERE (d.outcome = 'COMPLETER' OR (d.outcome IS NULL AND d.discharge_type NOT LIKE '%Non%' AND d.discharge_type NOT LIKE '%non_%' AND (d.discharge_type LIKE '%complet%' OR d.discharge_type LIKE '%graduat%'))) 
       AND d.discharge_date BETWEEN ? AND ?`, 
    [from, to]
  );
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

  // Finding 1: Strict role & assigned-patient authorization for exports and reports
  let effectiveCmId = caseManagerId;
  if (req.user.role === "case_manager") {
    effectiveCmId = req.user.id;
    if (patientId) {
      const [[patient]] = await pool.query(
        "SELECT assigned_case_manager_id FROM patients WHERE id = ?",
        [patientId]
      );
      if (patient && patient.assigned_case_manager_id && patient.assigned_case_manager_id !== req.user.id) {
        return res.status(403).json({ message: "Access denied. You are not the assigned case manager for this patient." });
      }
    }
  }

  try {
    const report = await builder({ dateFrom, dateTo, caseManagerId: effectiveCmId, programStatus, patientId });

    const [result] = await pool.query(
      `INSERT INTO generated_reports
        (report_type, title, description, date_range_label, date_from, date_to,
         case_manager_id, program_status, patient_id, stats_json, chart_json, rows_json, generated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [reportType, report.title, report.description, report.dateRangeLabel, dateFrom || null, dateTo || null,
        effectiveCmId || null, programStatus || null, patientId || null,
        JSON.stringify(report.stats), JSON.stringify(report.chart), JSON.stringify(report.rows), req.user.id]
    );

    await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
      req.user.username, `Generated a ${reportType} report: "${report.title}"`,
    ]);

    await notifyRoles(["ict_admin", "him_staff"], "reports", "report_generated", `Report generated: "${report.title}" — by ${req.user.username}`);

    res.status(201).json({ id: result.insertId, reportType, ...report });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || "Could not generate the report." });
  }
}

export async function listReports(req, res) {
  const { reportType, dateFrom, dateTo, caseManagerId, programStatus, patientId, search } = req.query;
  const where = ["gr.is_archived = FALSE"];
  const params = [];

  if (req.user.role === "case_manager") {
    where.push("(gr.case_manager_id = ? OR gr.generated_by = ?)");
    params.push(req.user.id, req.user.id);
  } else if (caseManagerId) {
    where.push("gr.case_manager_id = ?");
    params.push(caseManagerId);
  }

  if (reportType) { where.push("gr.report_type = ?"); params.push(reportType); }
  if (dateFrom) { where.push("gr.created_at >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("gr.created_at <= DATE_ADD(?, INTERVAL 1 DAY)"); params.push(dateTo); }
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