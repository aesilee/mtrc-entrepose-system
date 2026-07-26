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