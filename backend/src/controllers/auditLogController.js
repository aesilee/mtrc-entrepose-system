import pool from "../config/db.js";

export async function listAuditLogs(req, res) {
  const { user, action, date, search } = req.query;
  const clauses = [];
  const params = [];

  if (user) { clauses.push("actor_username = ?"); params.push(user); }
  if (action) { clauses.push("action LIKE ?"); params.push(`%${action}%`); }
  if (date) { clauses.push("DATE(created_at) = ?"); params.push(date); }
  if (search) { clauses.push("(action LIKE ? OR actor_username LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `SELECT id, actor_username, action, created_at FROM audit_log ${where} ORDER BY created_at DESC LIMIT 500`,
    params
  );
  res.json({ logs: rows });
}

export async function listAuditActors(req, res) {
  const [rows] = await pool.query("SELECT DISTINCT actor_username FROM audit_log ORDER BY actor_username");
  res.json({ actors: rows.map((r) => r.actor_username) });
}