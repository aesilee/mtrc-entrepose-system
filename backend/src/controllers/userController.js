import bcrypt from "bcryptjs";
import pool from "../config/db.js";

const VALID_ROLES = ["admitting", "case_manager", "him_staff", "ict_admin"];

async function getMinPasswordLength() {
  try {
    const [rows] = await pool.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'min_password_length'"
    );
    const n = parseInt(rows[0]?.setting_value, 10);
    return Number.isFinite(n) && n > 0 ? n : 8;
  } catch {
    return 8;
  }
}

function buildFullName(firstName, lastName, fallback) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || fallback || "";
}

export async function listCaseManagers(req, res) {
  const [rows] = await pool.query(
    `SELECT id, full_name FROM users WHERE role = 'case_manager' AND status = 'active' ORDER BY full_name`
  );
  res.json({ caseManagers: rows });
}

export async function listUsers(req, res) {
  const [rows] = await pool.query(
    `SELECT id, employee_id, first_name, last_name, full_name, email, contact_number,
            username, role, status, last_login, created_at
     FROM users ORDER BY created_at DESC`
  );
  res.json({ users: rows });
}

export async function createUser(req, res) {
  const {
    employeeId, firstName, lastName, email, contactNumber,
    username, password, confirmPassword, role,
  } = req.body;

  if (!firstName || !lastName || !username || !password || !role) {
    return res.status(400).json({ message: "First name, last name, username, password, and role are required." });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: "Invalid role." });
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ message: "Password and confirm password do not match." });
  }

  const minLength = await getMinPasswordLength();
  if (password.length < minLength) {
    return res.status(400).json({ message: `Password must be at least ${minLength} characters.` });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const fullName = buildFullName(firstName, lastName);

    const [result] = await pool.query(
      `INSERT INTO users
        (employee_id, first_name, last_name, full_name, email, contact_number, username, password_hash, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [employeeId || null, firstName, lastName, fullName, email || null, contactNumber || null, username, passwordHash, role]
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
  const { employeeId, firstName, lastName, email, contactNumber, role, status } = req.body;

  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: "Invalid role." });
  }
  if (status && !["active", "inactive"].includes(status)) {
    return res.status(400).json({ message: "Invalid status." });
  }

  try {
    const [existingRows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    const existing = existingRows[0];
    if (!existing) {
      return res.status(404).json({ message: "User not found." });
    }

    const newFirstName = firstName !== undefined ? firstName : existing.first_name;
    const newLastName = lastName !== undefined ? lastName : existing.last_name;
    const fullName = buildFullName(newFirstName, newLastName, existing.full_name);

    await pool.query(
      `UPDATE users SET
        employee_id = COALESCE(?, employee_id),
        first_name = ?,
        last_name = ?,
        full_name = ?,
        email = COALESCE(?, email),
        contact_number = COALESCE(?, contact_number),
        role = COALESCE(?, role),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [employeeId || null, newFirstName || null, newLastName || null, fullName, email || null, contactNumber || null, role || null, status || null, id]
    );

    const changes = [];
    if (role && role !== existing.role) changes.push(`role changed to "${role}"`);
    if (status && status !== existing.status) changes.push(`account ${status === "active" ? "activated" : "deactivated"}`);
    if (firstName !== undefined || lastName !== undefined || email !== undefined || contactNumber !== undefined || employeeId !== undefined) {
      changes.push("employee information updated");
    }
    const summary = changes.length ? changes.join("; ") : "profile updated";

    await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
      req.user.username,
      `Updated user "${existing.username}" — ${summary}`,
    ]);

    res.json({ message: "User account updated." });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "That employee ID is already in use." });
    }
    console.error(err);
    res.status(500).json({ message: "Could not update the user account." });
  }
}

export async function resetPassword(req, res) {
  const { id } = req.params;
  const { newPassword, confirmPassword } = req.body;

  const minLength = await getMinPasswordLength();
  if (!newPassword || newPassword.length < minLength) {
    return res.status(400).json({ message: `New password must be at least ${minLength} characters.` });
  }
  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Password and confirm password do not match." });
  }

  const [rows] = await pool.query("SELECT username FROM users WHERE id = ?", [id]);
  if (!rows[0]) {
    return res.status(404).json({ message: "User not found." });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    "UPDATE users SET password_hash = ?, must_reset_password = TRUE WHERE id = ?",
    [passwordHash, id]
  );

  await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
    req.user.username,
    `Reset password for user "${rows[0].username}"`,
  ]);

  res.json({ message: "Password reset. The user must change it on next login." });
}