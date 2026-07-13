import bcrypt from "bcryptjs";
import pool from "../config/db.js";

const VALID_ROLES = ["admitting", "case_manager", "him_staff", "ict_admin"];

export async function listUsers(req, res) {
  const [rows] = await pool.query(
    `SELECT id, employee_id, full_name, username, role, status, last_login, created_at
     FROM users ORDER BY created_at DESC`
  );
  res.json({ users: rows });
}

export async function createUser(req, res) {
  const { employeeId, fullName, username, role, temporaryPassword } = req.body;

  if (!fullName || !username || !role || !temporaryPassword) {
    return res.status(400).json({ message: "Full name, username, role, and a temporary password are required." });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: "Invalid role." });
  }

  try {
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const [result] = await pool.query(
      `INSERT INTO users (employee_id, full_name, username, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`,
      [employeeId || null, fullName, username, passwordHash, role]
    );

    await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
      req.user.username,
      `Created user account "${username}" (${role})`,
    ]);

    res.status(201).json({ id: result.insertId, message: "User account created." });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "That username or employee ID already exists." });
    }
    console.error(err);
    res.status(500).json({ message: "Could not create the user account." });
  }
}

export async function updateUser(req, res) {
  const { id } = req.params;
  const { fullName, role, status } = req.body;

  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: "Invalid role." });
  }

  try {
    await pool.query(
      `UPDATE users SET
        full_name = COALESCE(?, full_name),
        role = COALESCE(?, role),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [fullName || null, role || null, status || null, id]
    );

    await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
      req.user.username,
      `Updated user account #${id}`,
    ]);

    res.json({ message: "User account updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update the user account." });
  }
}

export async function resetPassword(req, res) {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters." });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    "UPDATE users SET password_hash = ?, must_reset_password = TRUE WHERE id = ?",
    [passwordHash, id]
  );

  await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
    req.user.username,
    `Reset password for user #${id}`,
  ]);

  res.json({ message: "Password reset. The user must change it on next login." });
}
