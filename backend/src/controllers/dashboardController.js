import pool from "../config/db.js";

export async function getDashboardStats(req, res) {
  try {
    const [[{ totalUsers }]] = await pool.query(
      `SELECT COUNT(*) AS totalUsers FROM users WHERE status = 'active'`
    );
    const [[{ onlineUsers }]] = await pool.query(
      `SELECT COUNT(*) AS onlineUsers FROM users WHERE last_active >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)`
    );
    const [[{ totalPatients }]] = await pool.query(
      `SELECT COUNT(*) AS totalPatients FROM patients WHERE is_archived = FALSE`
    );

    res.json({
      totalUsers,
      onlineUsers,
      totalPatients,
      systemStatus: "Operational",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load dashboard stats." });
  }
}

export async function getCaseManagerStats(req, res) {
  const cmId = req.user.id;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const [[{ assignedPatients }]] = await pool.query(
      `SELECT COUNT(*) AS assignedPatients
       FROM patients
       WHERE assigned_case_manager_id = ? AND is_archived = FALSE
         AND enrollment_status IN ('active', 'pending')`,
      [cmId]
    );

    const [[{ todaysSessions }]] = await pool.query(
      `SELECT COUNT(DISTINCT COALESCE(a.session_id, a.id)) AS todaysSessions
       FROM attendance a
       JOIN patients p ON p.id = a.patient_id
       WHERE p.assigned_case_manager_id = ? AND a.session_date = ?`,
      [cmId, today]
    );

    const [[{ missedSessions }]] = await pool.query(
      `SELECT COUNT(*) AS missedSessions
       FROM attendance a
       JOIN patients p ON p.id = a.patient_id
       WHERE p.assigned_case_manager_id = ?
         AND a.status = 'absent'
         AND p.is_archived = FALSE
         AND p.enrollment_status IN ('active', 'pending')`,
      [cmId]
    );

    const [[{ followUpsNeeded }]] = await pool.query(
      `SELECT COUNT(*) AS followUpsNeeded
       FROM follow_ups f
       JOIN patients p ON p.id = f.patient_id
       WHERE f.assigned_to = ? AND f.status = 'pending' AND p.is_archived = FALSE`,
      [cmId]
    );

    const [patientsNeedingAttention] = await pool.query(
      `SELECT patient_id, full_name, issue, issue_date FROM (
         SELECT p.id AS patient_id, p.full_name,
                'Missed Session' AS issue, a.session_date AS issue_date
         FROM attendance a
         JOIN patients p ON p.id = a.patient_id
         WHERE p.assigned_case_manager_id = ?
           AND a.status = 'absent'
           AND a.session_date >= DATE_SUB(?, INTERVAL 7 DAY)
         UNION
         SELECT p.id, p.full_name,
                'Follow-up Required' AS issue, f.due_date AS issue_date
         FROM follow_ups f
         JOIN patients p ON p.id = f.patient_id
         WHERE f.assigned_to = ? AND f.status = 'pending'
         UNION
         SELECT p.id, p.full_name,
                'Progress Overdue' AS issue, pn.next_follow_up_date AS issue_date
         FROM progress_notes pn
         JOIN patients p ON p.id = pn.patient_id
         WHERE p.assigned_case_manager_id = ?
           AND pn.next_follow_up_date IS NOT NULL
           AND pn.next_follow_up_date < ?
           AND pn.id = (
             SELECT pn2.id FROM progress_notes pn2
             WHERE pn2.patient_id = p.id
             ORDER BY pn2.created_at DESC LIMIT 1
           )
       ) AS attention
       ORDER BY issue_date DESC
       LIMIT 10`,
      [cmId, today, cmId, cmId, today]
    );

    const [todaysSchedule] = await pool.query(
      `SELECT DISTINCT s.id, s.session_name, s.session_time, s.session_date, pr.name AS program_name
       FROM sessions s
       LEFT JOIN attendance a ON a.session_id = s.id
       LEFT JOIN patients p ON p.id = a.patient_id
       LEFT JOIN programs pr ON pr.id = s.program_id
       WHERE s.session_date = ?
         AND (s.case_manager_id = ? OR p.assigned_case_manager_id = ?)
       ORDER BY s.session_time, s.session_name`,
      [today, cmId, cmId]
    );

    const [recentProgressNotes] = await pool.query(
      `SELECT pn.id, pn.session_type, pn.note_type, pn.created_at,
              p.id AS patient_id, p.full_name AS patient_name
       FROM progress_notes pn
       JOIN patients p ON p.id = pn.patient_id
       WHERE p.assigned_case_manager_id = ? OR pn.case_manager_id = ?
       ORDER BY pn.created_at DESC
       LIMIT 5`,
      [cmId, cmId]
    );

    const [recentNotifications] = await pool.query(
      `SELECT id, type, category, message, is_read, created_at
       FROM notifications
       WHERE recipient_id = ?
       ORDER BY created_at DESC
       LIMIT 5`,
      [cmId]
    );

    res.json({
      assignedPatients,
      todaysSessions,
      missedSessions,
      followUpsNeeded,
      patientsNeedingAttention,
      todaysSchedule,
      recentProgressNotes,
      recentNotifications,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load case manager dashboard stats." });
  }
}

export async function getHimStaffStats(req, res) {
  try {
    const [[{ reportsToday }]] = await pool.query(
      `SELECT COUNT(*) AS reportsToday FROM generated_reports WHERE DATE(created_at) = CURDATE()`
    );
    const [[{ certificatesIssued }]] = await pool.query(
      `SELECT COUNT(*) AS certificatesIssued FROM certificates WHERE DATE(issued_at) = CURDATE()`
    );
    const [[{ pendingUpdates }]] = await pool.query(
      `SELECT COUNT(*) AS pendingUpdates FROM patients WHERE enrollment_status = 'pending' AND is_archived = FALSE`
    );

    const [recentPatientUpdates] = await pool.query(
      `SELECT id, full_name, enrollment_status, updated_at
       FROM patients WHERE is_archived = FALSE
       ORDER BY updated_at DESC LIMIT 5`
    );

    const [recentCertificates] = await pool.query(
      `SELECT id, patient_name, certificate_type, issued_at
       FROM certificates ORDER BY issued_at DESC LIMIT 5`
    );

    const [recentActivity] = await pool.query(
      `SELECT actor_username, action, created_at
       FROM audit_log ORDER BY created_at DESC LIMIT 8`
    );

    res.json({
      reportsToday, certificatesIssued, pendingUpdates,
      recentPatientUpdates, recentCertificates, recentActivity,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load HIM staff dashboard stats." });
  }
}