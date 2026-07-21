import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { notifyIctAdmins } from "../utils/notify.js";

const PROFILE_FIELDS = `id, employee_id, first_name, last_name, full_name, gender, birthdate, address,
            email, contact_number, photo_url, username, role, status, created_at,
            password_changed_at, last_login, last_login_device`;

export async function getProfile(req, res) {
  const [rows] = await pool.query(`SELECT ${PROFILE_FIELDS} FROM users WHERE id = ?`, [req.user.id]);
  if (!rows[0]) return res.status(404).json({ message: "Profile not found." });
  res.json({ profile: rows[0] });
}

export async function updateProfile(req, res) {
  const { firstName, lastName, gender, birthdate, address, contactNumber, email, photoUrl } = req.body;
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  try {
    await pool.query(
      `UPDATE users SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        full_name = COALESCE(NULLIF(?, ''), full_name),
        gender = ?, birthdate = ?, address = ?, contact_number = ?, email = ?,
        photo_url = COALESCE(?, photo_url)
       WHERE id = ?`,
      [firstName || null, lastName || null, fullName, gender || null, birthdate || null, address || null, contactNumber || null, email || null, photoUrl !== undefined ? photoUrl : null, req.user.id]
    );

    await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
      req.user.username, "Updated their own profile information",
    ]);

    const [rows] = await pool.query(`SELECT ${PROFILE_FIELDS} FROM users WHERE id = ?`, [req.user.id]);
    res.json({ message: "Profile updated.", profile: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update your profile." });
  }
}

export async function changeOwnPassword(req, res) {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current and new password are required." });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "New password and confirm password do not match." });
  }

  let minLength = 8;
  try {
    const [rows] = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'min_password_length'");
    const n = parseInt(rows[0]?.setting_value, 10);
    if (Number.isFinite(n) && n > 0) minLength = n;
  } catch {
    // fall back to default minLength
  }
  if (newPassword.length < minLength) {
    return res.status(400).json({ message: `New password must be at least ${minLength} characters.` });
  }

  const [rows] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);
  const user = rows[0];
  if (!user) return res.status(404).json({ message: "User not found." });

  const matches = await bcrypt.compare(currentPassword, user.password_hash);
  if (!matches) return res.status(401).json({ message: "Current password is incorrect." });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    "UPDATE users SET password_hash = ?, password_changed_at = NOW(), must_reset_password = FALSE WHERE id = ?",
    [passwordHash, req.user.id]
  );

  await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
    req.user.username, "Changed their own password",
  ]);

  await notifyIctAdmins("users", "password_changed", `Password changed successfully for "${req.user.username}"`);

  res.json({ message: "Password changed." });
}

export async function getMyActivity(req, res) {
  const [rows] = await pool.query(
    "SELECT id, action, created_at FROM audit_log WHERE actor_username = ? ORDER BY created_at DESC LIMIT 15",
    [req.user.username]
  );
  res.json({ activity: rows });
}