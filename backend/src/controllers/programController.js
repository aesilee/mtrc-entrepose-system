import pool from "../config/db.js";

export async function listPrograms(req, res) {
  const [rows] = await pool.query(
    `SELECT id, name FROM programs WHERE is_active = TRUE ORDER BY name`
  );
  res.json({ programs: rows });
}