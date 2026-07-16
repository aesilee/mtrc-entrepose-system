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