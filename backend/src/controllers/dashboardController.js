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

  try {
    const [[{ assignedPatients }]] = await pool.query(
      `SELECT COUNT(*) AS assignedPatients
       FROM patients
       WHERE assigned_case_manager_id = ? AND is_archived = FALSE`,
      [cmId]
    );

    const [[{ todaysSessions }]] = await pool.query(
      `SELECT COUNT(DISTINCT s.id) AS todaysSessions
       FROM sessions s
       LEFT JOIN attendance a ON a.session_id = s.id
       LEFT JOIN patients p ON p.id = a.patient_id AND p.is_archived = FALSE
       WHERE s.session_date = CURDATE()
         AND (s.case_manager_id = ? OR p.assigned_case_manager_id = ?)`,
      [cmId, cmId]
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
      `SELECT patient_id, full_name, photo_url, issue, issue_date FROM (
         SELECT p.id AS patient_id, p.full_name, p.photo_url,
                'Missed Session' AS issue, a.session_date AS issue_date
         FROM attendance a
         JOIN patients p ON p.id = a.patient_id
         WHERE p.assigned_case_manager_id = ?
           AND p.is_archived = FALSE
           AND a.status = 'absent'
           AND a.session_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         UNION
         SELECT p.id, p.full_name, p.photo_url,
                'Follow-up Required' AS issue, f.due_date AS issue_date
         FROM follow_ups f
         JOIN patients p ON p.id = f.patient_id
         WHERE f.assigned_to = ?
           AND f.status = 'pending'
           AND p.is_archived = FALSE
         UNION
         SELECT p.id, p.full_name, p.photo_url,
                'Progress Overdue' AS issue, pn.next_follow_up_date AS issue_date
         FROM progress_notes pn
         JOIN patients p ON p.id = pn.patient_id
         WHERE p.assigned_case_manager_id = ?
           AND p.is_archived = FALSE
           AND pn.next_follow_up_date IS NOT NULL
           AND pn.next_follow_up_date < CURDATE()
           AND pn.id = (
             SELECT pn2.id FROM progress_notes pn2
             WHERE pn2.patient_id = p.id
             ORDER BY pn2.created_at DESC LIMIT 1
           )
       ) AS attention
       ORDER BY issue_date DESC
       LIMIT 10`,
      [cmId, cmId, cmId]
    );

    const [todaysSchedule] = await pool.query(
      `SELECT DISTINCT s.id, s.session_name, s.session_time, s.session_date, pr.name AS program_name
       FROM sessions s
       LEFT JOIN attendance a ON a.session_id = s.id
       LEFT JOIN patients p ON p.id = a.patient_id
       LEFT JOIN programs pr ON pr.id = s.program_id
       WHERE s.session_date = CURDATE()
         AND (s.case_manager_id = ? OR p.assigned_case_manager_id = ?)
       ORDER BY s.session_time, s.session_name`,
      [cmId, cmId]
    );

    const [recentPatients] = await pool.query(
      `SELECT p.id, p.patient_code, p.full_name, p.photo_url, p.enrollment_status,
              p.program_phase, pr.name AS program_name,
              GREATEST(
                COALESCE(p.updated_at, p.created_at),
                COALESCE((SELECT MAX(a.created_at) FROM attendance a WHERE a.patient_id = p.id), p.created_at),
                COALESCE((SELECT MAX(pn.updated_at) FROM progress_notes pn WHERE pn.patient_id = p.id), p.created_at),
                COALESCE((SELECT MAX(f.created_at) FROM follow_ups f WHERE f.patient_id = p.id), p.created_at)
              ) AS last_activity
       FROM patients p
       LEFT JOIN programs pr ON pr.id = p.program_id
       WHERE p.assigned_case_manager_id = ?
         AND p.is_archived = FALSE
       ORDER BY last_activity DESC, p.id DESC
       LIMIT 50`,
      [cmId]
    );

    const [recentProgressNotes] = await pool.query(
      `SELECT pn.id, pn.session_type, pn.note_type, pn.created_at, pn.updated_at,
              p.id AS patient_id, p.full_name AS patient_name, p.photo_url AS patient_photo_url
       FROM progress_notes pn
       JOIN patients p ON p.id = pn.patient_id
       WHERE p.assigned_case_manager_id = ?
         AND p.is_archived = FALSE
       ORDER BY COALESCE(pn.updated_at, pn.created_at) DESC
       LIMIT 6`,
      [cmId]
    );

    const [[caseStatusOverview]] = await pool.query(
      `SELECT
         SUM(CASE
           WHEN p.enrollment_status IN ('active', 'pending')
             AND NOT EXISTS (
               SELECT 1 FROM follow_ups f
               WHERE f.patient_id = p.id AND f.assigned_to = ? AND f.status = 'pending'
             )
           THEN 1 ELSE 0 END) AS active,
         SUM(CASE
           WHEN p.enrollment_status IN ('active', 'pending')
             AND EXISTS (
               SELECT 1 FROM follow_ups f
               WHERE f.patient_id = p.id AND f.assigned_to = ? AND f.status = 'pending'
             )
           THEN 1 ELSE 0 END) AS followUp,
         SUM(CASE WHEN p.enrollment_status = 'completed' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN p.enrollment_status = 'dropped' THEN 1 ELSE 0 END) AS dropped,
         SUM(CASE WHEN p.enrollment_status = 'transferred' THEN 1 ELSE 0 END) AS transferred
       FROM patients p
       WHERE p.assigned_case_manager_id = ? AND p.is_archived = FALSE`,
      [cmId, cmId, cmId]
    );

    const [recentCaseActivity] = await pool.query(
      `SELECT activity_id, patient_id, patient_name, activity_type,
              activity_label, activity_detail, activity_at
       FROM (
         SELECT CONCAT('note-', pn.id) AS activity_id,
                p.id AS patient_id, p.full_name AS patient_name,
                'progress_note' AS activity_type,
                'Progress note added' AS activity_label,
                COALESCE(pn.session_type, pn.note_type, 'Case progress') AS activity_detail,
                pn.created_at AS activity_at
         FROM progress_notes pn
         JOIN patients p ON p.id = pn.patient_id
         WHERE p.assigned_case_manager_id = ? AND p.is_archived = FALSE

         UNION ALL

         SELECT CONCAT('followup-', f.id),
                p.id, p.full_name,
                'follow_up',
                CASE WHEN f.status = 'completed' THEN 'Follow-up completed' ELSE 'Follow-up scheduled' END,
                COALESCE(f.reason, 'Case follow-up'),
                COALESCE(f.resolved_at, f.created_at)
         FROM follow_ups f
         JOIN patients p ON p.id = f.patient_id
         WHERE p.assigned_case_manager_id = ? AND p.is_archived = FALSE

         UNION ALL

         SELECT CONCAT('attendance-', a.id),
                p.id, p.full_name,
                'attendance',
                CONCAT('Attendance marked ', a.status),
                COALESCE(a.session_type, 'Program session'),
                a.created_at
         FROM attendance a
         JOIN patients p ON p.id = a.patient_id
         WHERE p.assigned_case_manager_id = ? AND p.is_archived = FALSE
       ) AS case_activity
       ORDER BY activity_at DESC
       LIMIT 12`,
      [cmId, cmId, cmId]
    );

    res.json({
      assignedPatients,
      todaysSessions,
      missedSessions,
      followUpsNeeded,
      patientsNeedingAttention,
      todaysSchedule,
      recentPatients,
      recentProgressNotes,
      caseStatusOverview: {
        active: Number(caseStatusOverview?.active || 0),
        followUp: Number(caseStatusOverview?.followUp || 0),
        completed: Number(caseStatusOverview?.completed || 0),
        dropped: Number(caseStatusOverview?.dropped || 0),
        transferred: Number(caseStatusOverview?.transferred || 0),
      },
      recentCaseActivity,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load case manager dashboard stats." });
  }
}

export async function getAdmittingStats(req, res) {
  try {
    const [[{ todayAdmissions }]] = await pool.query(
      `SELECT COUNT(*) AS todayAdmissions FROM patients WHERE DATE(created_at) = CURDATE() AND is_archived = FALSE`
    );

    const [[{ totalPatients }]] = await pool.query(
      `SELECT COUNT(*) AS totalPatients FROM patients WHERE is_archived = FALSE`
    );

    // Pending registrations: patients still in 'pending' status
    const [[{ pendingRegistrations }]] = await pool.query(
      `SELECT COUNT(*) AS pendingRegistrations FROM patients WHERE enrollment_status = 'pending' AND is_archived = FALSE`
    );

    const [[{ certsToday }]] = await pool.query(
      `SELECT COUNT(*) AS certsToday FROM certificates WHERE DATE(issued_at) = CURDATE()`
    );

    // Recent admissions, newest first, capped at 8
    const [recentAdmissions] = await pool.query(
      `SELECT p.id, p.patient_code, p.full_name, p.admission_date, p.enrollment_status, p.municipality,
              p.created_at
       FROM patients p
       WHERE p.is_archived = FALSE
       ORDER BY p.created_at DESC
       LIMIT 8`
    );

    // Patients that may still have missing info (no emergency contact or no program assigned)
    const [incompleteRecords] = await pool.query(
      `SELECT id, full_name, patient_code,
              CASE
                WHEN emergency_contact_name IS NULL OR emergency_contact_name = '' THEN 'Missing Emergency Contact'
                WHEN program_id IS NULL THEN 'No Program Assigned'
                WHEN initial_assessment IS NULL OR initial_assessment = '' THEN 'Missing Initial Assessment'
                ELSE 'Incomplete Record'
              END AS missing_info
       FROM patients
       WHERE is_archived = FALSE
         AND enrollment_status = 'pending'
         AND (
           emergency_contact_name IS NULL OR emergency_contact_name = ''
           OR program_id IS NULL
           OR initial_assessment IS NULL OR initial_assessment = ''
         )
       ORDER BY created_at DESC
       LIMIT 6`
    );

    const [pendingRegistrationRecords] = await pool.query(
      `SELECT id, full_name, patient_code, admission_date, enrollment_status, created_at
       FROM patients
       WHERE is_archived = FALSE
         AND enrollment_status = 'pending'
       ORDER BY created_at DESC
       LIMIT 10`
    );

    const [[registrationProcess]] = await pool.query(
      `SELECT
         SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS newRegistrations,
         SUM(CASE
           WHEN DATE(created_at) <> CURDATE() AND enrollment_status <> 'pending'
           THEN 1 ELSE 0
         END) AS completed,
         SUM(CASE
           WHEN DATE(created_at) <> CURDATE()
             AND enrollment_status = 'pending'
             AND emergency_contact_name IS NOT NULL AND emergency_contact_name <> ''
             AND program_id IS NOT NULL
             AND initial_assessment IS NOT NULL AND initial_assessment <> ''
           THEN 1 ELSE 0
         END) AS pending,
         SUM(CASE
           WHEN DATE(created_at) <> CURDATE()
             AND enrollment_status = 'pending'
             AND (
               emergency_contact_name IS NULL OR emergency_contact_name = ''
               OR program_id IS NULL
               OR initial_assessment IS NULL OR initial_assessment = ''
             )
           THEN 1 ELSE 0
         END) AS incomplete
       FROM patients
       WHERE is_archived = FALSE`
    );

    const [todayAdmissionActivity] = await pool.query(
      `SELECT activity_id, patient_id, patient_name, activity_label, activity_detail, activity_at
       FROM (
         SELECT CONCAT('registered-', p.id) AS activity_id,
                p.id AS patient_id,
                p.full_name AS patient_name,
                'Patient registered' AS activity_label,
                p.patient_code AS activity_detail,
                p.created_at AS activity_at
         FROM patients p
         WHERE p.is_archived = FALSE
           AND DATE(p.created_at) = CURDATE()

         UNION ALL

         SELECT CONCAT('updated-', p.id) AS activity_id,
                p.id AS patient_id,
                p.full_name AS patient_name,
                'Registration updated' AS activity_label,
                p.enrollment_status AS activity_detail,
                p.updated_at AS activity_at
         FROM patients p
         WHERE p.is_archived = FALSE
           AND DATE(p.updated_at) = CURDATE()
           AND p.updated_at > p.created_at

         UNION ALL

         SELECT CONCAT('certificate-', c.id) AS activity_id,
                c.patient_id,
                c.patient_name,
                'Enrollment certificate generated' AS activity_label,
                c.patient_code AS activity_detail,
                c.issued_at AS activity_at
         FROM certificates c
         WHERE c.certificate_type = 'enrollment'
           AND DATE(c.issued_at) = CURDATE()
       ) AS activity
       ORDER BY activity_at DESC
       LIMIT 10`
    );

    // Admission-related notifications for this user
    const [recentNotifications] = await pool.query(
      `SELECT id, type, category, message, is_read, created_at
       FROM notifications
       WHERE recipient_id = ?
         AND category IN ('patients', 'certificates')
       ORDER BY created_at DESC
       LIMIT 6`,
      [req.user.id]
    );

    res.json({
      todayAdmissions,
      totalPatients,
      pendingRegistrations,
      certsToday,
      recentAdmissions,
      incompleteRecords,
      pendingRegistrationRecords,
      registrationProcess: {
        newRegistrations: Number(registrationProcess?.newRegistrations || 0),
        completed: Number(registrationProcess?.completed || 0),
        pending: Number(registrationProcess?.pending || 0),
        incomplete: Number(registrationProcess?.incomplete || 0),
      },
      todayAdmissionActivity,
      recentNotifications,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load admitting dashboard stats." });
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
