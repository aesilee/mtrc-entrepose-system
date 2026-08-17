import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import pool from "../config/db.js";

dotenv.config();

async function seedHimStaff() {
  const username = process.env.HIM_STAFF_USERNAME || "himstaff";
  const password = process.env.HIM_STAFF_PASSWORD || "ChangeMe123!";
  const fullName = process.env.HIM_STAFF_FULLNAME || "HIM Staff";

  const [existing] = await pool.query("SELECT id FROM users WHERE username = ?", [username]);
  if (existing.length > 0) {
    console.log(`User "${username}" already exists. Nothing to do.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (full_name, username, password_hash, role, status, must_reset_password)
     VALUES (?, ?, ?, 'him_staff', 'active', TRUE)`,
    [fullName, username, passwordHash]
  );

  console.log(`HIM Staff account created: ${username} / ${password}`);
  console.log("Log in once and change this password.");
  process.exit(0);
}

seedHimStaff().catch((err) => {
  console.error(err);
  process.exit(1);
});
