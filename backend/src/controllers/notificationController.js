import pool from "../config/db.js";

export async function listNotifications(req, res) {
  const { category } = req.query;
  const clauses = ["recipient_id = ?"];
  const params = [req.user.id];
  if (category && category !== "all") {
    clauses.push("category = ?");
    params.push(category);
  }
  const [rows] = await pool.query(
    `SELECT id, type, category, message, related_type, related_id, is_read, created_at
     FROM notifications WHERE ${clauses.join(" AND ")} ORDER BY created_at DESC LIMIT 100`,
    params
  );
  res.json({ notifications: rows });
}

export async function getUnreadCount(req, res) {
  const [[row]] = await pool.query(
    "SELECT COUNT(*) AS count FROM notifications WHERE recipient_id = ? AND is_read = FALSE",
    [req.user.id]
  );
  res.json({ count: row.count });
}

export async function markAllRead(req, res) {
  await pool.query("UPDATE notifications SET is_read = TRUE WHERE recipient_id = ? AND is_read = FALSE", [req.user.id]);
  res.json({ message: "All notifications marked as read." });
}

export async function markOneRead(req, res) {
  const { id } = req.params;
  await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = ? AND recipient_id = ?", [id, req.user.id]);
  res.json({ message: "Notification marked as read." });
}

export async function dismissNotification(req, res) {
  const { id } = req.params;
  await pool.query(
    "UPDATE notifications SET is_read = TRUE WHERE id = ? AND recipient_id = ?",
    [id, req.user.id]
  );
  res.json({ message: "Notification dismissed." });
}