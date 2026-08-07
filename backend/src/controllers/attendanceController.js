import pool from "../config/db.js";
import { notifyIctAdmins, notifyUser } from "../utils/notify.js";

export async function recordAttendanceBulk(req, res) {
  const { sessionId, records } = req.body;

  if (!sessionId || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ message: "A session and at least one patient record are required." });
  }

  const connection = await pool.getConnection();
  try {
    const [[session]] = await connection.query(
      `SELECT session_name, session_date FROM sessions WHERE id = ?`,
      [sessionId]
    );
    if (!session) {
      connection.release();
      return res.status(404).json({ message: "Session not found." });
    }

    await connection.beginTransaction();
    for (const r of records) {
      await connection.query(
        `INSERT INTO attendance (patient_id, session_id, session_date, session_type, status, notes, recorded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [r.patientId, sessionId, session.session_date, session.session_name, r.status, r.remarks || null, req.user.id]
      );
    }
    await connection.commit();

    await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
      req.user.username,
      `Recorded attendance for ${records.length} patient(s) — session "${session.session_name}"`,
    ]);

    const presentCount = records.filter((r) => r.status === "present").length;
    const absentCount = records.filter((r) => r.status === "absent").length;
    const lateCount = records.filter((r) => r.status === "late").length;
    const excusedCount = records.filter((r) => r.status === "excused").length;
    await notifyIctAdmins(
      "reports", "attendance_summary",
      `Attendance recorded for "${session.session_name}" (${session.session_date}): ${presentCount} present, ${absentCount} absent, ${lateCount} late, ${excusedCount} excused — by ${req.user.username}`
    );

    // Batched notifications for absent patients' assigned case managers
    const absentRecords = records.filter((r) => r.status === "absent");
    if (absentRecords.length > 0) {
      const absentPatientIds = absentRecords.map((r) => r.patientId);
      const [absentPatients] = await pool.query(
        `SELECT id, full_name, assigned_case_manager_id FROM patients WHERE id IN (?) AND is_archived = FALSE`,
        [absentPatientIds]
      );
      for (const p of absentPatients) {
        if (p.assigned_case_manager_id && Number(p.assigned_case_manager_id) !== Number(req.user.id)) {
          await notifyUser(
            p.assigned_case_manager_id,
            "patients",
            "session_missed",
            `Patient "${p.full_name}" missed today's session "${session.session_name}"`
          );
        }
      }
    }

    res.status(201).json({ message: "Attendance recorded." });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Could not record attendance." });
  } finally {
    connection.release();
  }
}

export async function listAttendance(req, res) {
  const { dateFilter, dateFrom, dateTo, programId, caseManagerId, status, search } = req.query;
  const today = new Date().toISOString().slice(0, 10);

  const where = [];
  const params = [];

  if (req.user.role === "case_manager") {
    where.push("p.assigned_case_manager_id = ?");
    params.push(req.user.id);
  }

  if (dateFilter === "today") {
    where.push("a.session_date = ?");
    params.push(today);
  } else if (dateFilter === "yesterday") {
    where.push("a.session_date = DATE_SUB(?, INTERVAL 1 DAY)");
    params.push(today);
  } else if (dateFilter === "week") {
    where.push("a.session_date >= DATE_SUB(?, INTERVAL 7 DAY)");
    params.push(today);
  } else if (dateFilter === "custom" && dateFrom && dateTo) {
    where.push("a.session_date BETWEEN ? AND ?");
    params.push(dateFrom, dateTo);
  }

  if (programId) { where.push("s.program_id = ?"); params.push(programId); }
  if (caseManagerId) { where.push("s.case_manager_id = ?"); params.push(caseManagerId); }
  if (status) { where.push("a.status = ?"); params.push(status); }
  if (search) {
    where.push("(p.full_name LIKE ? OR p.patient_code LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT a.id, a.status, a.notes, a.session_date,
            p.id AS patient_id, p.patient_code, p.full_name,
            s.session_name, s.session_time,
            pr.name AS program_name,
            u.full_name AS case_manager_name
     FROM attendance a
     JOIN patients p ON p.id = a.patient_id
     LEFT JOIN sessions s ON s.id = a.session_id
     LEFT JOIN programs pr ON pr.id = s.program_id
     LEFT JOIN users u ON u.id = s.case_manager_id
     ${whereSql}
     ORDER BY a.session_date DESC, a.id DESC`,
    params
  );
  res.json({ attendance: rows });
}

export async function getAttendanceStats(req, res) {
  const today = new Date().toISOString().slice(0, 10);
  const scopeClause = req.user.role === "case_manager"
    ? "JOIN patients p ON p.id = a.patient_id AND p.assigned_case_manager_id = ?"
    : "";
  const scopeParams = req.user.role === "case_manager" ? [req.user.id] : [];

  const [[{ todaySessions }]] = await pool.query(
    `SELECT COUNT(DISTINCT a.session_id) AS todaySessions
     FROM attendance a ${scopeClause}
     WHERE a.session_date = ?`,
    [...scopeParams, today]
  );
  const [[{ total, present }]] = await pool.query(
    `SELECT COUNT(*) AS total, SUM(a.status = 'present') AS present
     FROM attendance a ${scopeClause}
     WHERE a.session_date = ?`,
    [...scopeParams, today]
  );
  const [[{ absentToday }]] = await pool.query(
    `SELECT SUM(a.status = 'absent') AS absentToday
     FROM attendance a ${scopeClause}
     WHERE a.session_date = ?`,
    [...scopeParams, today]
  );

  res.json({
    todaySessions: todaySessions || 0,
    todayRate: total ? Math.round((present / total) * 100) : null,
    presentToday: present || 0,
    absentToday: absentToday || 0,
  });
}