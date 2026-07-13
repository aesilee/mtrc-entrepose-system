// Run once with: npm run seed:admin
// Creates the very first ICT Admin account so someone can log in and
// then create everyone else's accounts through the User Management page.
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import pool from "../config/db.js";

dotenv.config();

async function seed() {
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.SEED_ADMIN_FULLNAME || "ICT Administrator";

  const [existing] = await pool.query("SELECT id FROM users WHERE username = ?", [username]);
  if (existing.length > 0) {
    console.log(`User "${username}" already exists. Nothing to do.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (full_name, username, password_hash, role, status, must_reset_password)
     VALUES (?, ?, ?, 'ict_admin', 'active', TRUE)`,
    [fullName, username, passwordHash]
  );

  console.log(`ICT Admin account created: ${username} / ${password}`);
  console.log("Log in once and change this password.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
