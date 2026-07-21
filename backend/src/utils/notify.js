import pool from "../config/db.js";

// Fans a notification out to every active ICT administrator.
export async function notifyIctAdmins(category, type, message) {
  try {
    const [admins] = await pool.query("SELECT id FROM users WHERE role = 'ict_admin' AND status = 'active'");
    if (!admins.length) return;
    const values = admins.map((a) => [a.id, type, message, category]);
    await pool.query("INSERT INTO notifications (recipient_id, type, message, category) VALUES ?", [values]);
  } catch (err) {
    console.error("notifyIctAdmins failed:", err);
  }
}