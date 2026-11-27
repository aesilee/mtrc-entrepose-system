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

// Fans a notification out to every active user in the given roles.
export async function notifyRoles(roles, category, type, message) {
  try {
    const placeholders = roles.map(() => "?").join(", ");
    const [users] = await pool.query(
      `SELECT id FROM users WHERE role IN (${placeholders}) AND status = 'active'`,
      roles
    );
    if (!users.length) return;
    const values = users.map((u) => [u.id, type, message, category]);
    await pool.query("INSERT INTO notifications (recipient_id, type, message, category) VALUES ?", [values]);
  } catch (err) {
    console.error("notifyRoles failed:", err);
  }
}

// Sends a targeted notification to a single specific user with null protection.
export async function notifyUser(userId, category, type, message) {
  if (!userId) return;
  try {
    await pool.query(
      "INSERT INTO notifications (recipient_id, type, message, category) VALUES (?, ?, ?, ?)",
      [userId, type, message, category]
    );
  } catch (err) {
    console.error("notifyUser failed:", err);
  }
}
// Like notifyUser, but skips the insert when this user already received the identical alert
// (used for one-time milestones such as "ready for PDC").
export async function notifyUserOnce(userId, category, type, message) {
  if (!userId) return;
  try {
    const [[existing]] = await pool.query(
      "SELECT id FROM notifications WHERE recipient_id = ? AND type = ? AND message = ? LIMIT 1",
      [userId, type, message]
    );
    if (existing) return;
  } catch (err) {
    console.error("notifyUserOnce lookup failed:", err);
  }
  await notifyUser(userId, category, type, message);
}
