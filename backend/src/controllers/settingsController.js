import { spawn } from "child_process";
import pool from "../config/db.js";

const DEFAULT_SETTINGS = {
  organization_name: "MTRC ENTREPOSE",
  organization_address: "",
  organization_email: "",
  organization_logo: "",
  admission_no: "",
  administrative_no: "",
  min_password_length: "8",
  session_timeout_minutes: "60",
  max_login_attempts: "5",
  notif_attendance_reminders: "1",
  notif_followup_reminders: "1",
  notif_certificate_reminders: "1",
};
const ALLOWED_KEYS = Object.keys(DEFAULT_SETTINGS);
const PUBLIC_KEYS = ["organization_name", "organization_logo", "organization_address", "organization_email", "admission_no", "administrative_no"];

export async function getSettings(req, res) {
  try {
    const [rows] = await pool.query("SELECT setting_key, setting_value FROM system_settings");
    const settings = { ...DEFAULT_SETTINGS };
    rows.forEach((r) => { if (ALLOWED_KEYS.includes(r.setting_key)) settings[r.setting_key] = r.setting_value; });
    res.json({ settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load settings. Make sure the system_settings table exists (see the schema migration)." });
  }
}

export async function getPublicSettings(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN (?)`,
      [PUBLIC_KEYS]
    );
    const settings = {};
    PUBLIC_KEYS.forEach((k) => { settings[k] = DEFAULT_SETTINGS[k]; });
    rows.forEach((r) => { settings[r.setting_key] = r.setting_value; });
    res.json({ settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load organization settings." });
  }
}

export async function updateSettings(req, res) {
  const updates = req.body || {};
  const entries = Object.entries(updates).filter(([key]) => ALLOWED_KEYS.includes(key));

  if (!entries.length) {
    return res.status(400).json({ message: "No valid settings were provided." });
  }

  try {
    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO system_settings (setting_key, setting_value, updated_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
        [key, String(value), req.user.id]
      );
    }

    const keysList = entries.map(([k]) => k).join(", ");
    const summary = `Updated system settings (${keysList})`.slice(0, 250);
    await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
      req.user.username,
      summary,
    ]);

    res.json({ message: "Settings saved." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.sqlMessage || "Could not save settings." });
  }
}

export function backupDatabase(req, res) {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  const filename = `mtrc_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;
  const args = ["-h", DB_HOST || "localhost", "-P", DB_PORT || "3306", "-u", DB_USER, DB_NAME];

  const dump = spawn("mysqldump", args, { env: { ...process.env, MYSQL_PWD: DB_PASSWORD } });

  let started = false;
  dump.stdout.once("data", () => {
    started = true;
    res.setHeader("Content-Type", "application/sql");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  });
  dump.stdout.pipe(res);

  let stderrOutput = "";
  dump.stderr.on("data", (d) => { stderrOutput += d.toString(); });

  dump.on("error", () => {
    if (!res.headersSent) {
      res.status(500).json({ message: "mysqldump was not found. Make sure MySQL's bin folder is on your system PATH." });
    }
  });

  dump.on("close", async (code) => {
    if (code === 0 && started) {
      await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [req.user.username, "Backed up the database"]);
    } else if (!res.headersSent) {
      res.status(500).json({ message: stderrOutput || "Database backup failed." });
    }
  });
}

export function restoreDatabase(req, res) {
  const sqlContent = typeof req.body === "string" ? req.body : "";
  if (!sqlContent.trim()) {
    return res.status(400).json({ message: "No SQL file content received." });
  }

  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  const args = ["-h", DB_HOST || "localhost", "-P", DB_PORT || "3306", "-u", DB_USER, DB_NAME];

  const restore = spawn("mysql", args, { env: { ...process.env, MYSQL_PWD: DB_PASSWORD } });

  let errorOutput = "";
  restore.stderr.on("data", (d) => { errorOutput += d.toString(); });

  restore.on("error", () => {
    res.status(500).json({ message: "The mysql client was not found. Make sure MySQL's bin folder is on your system PATH." });
  });

  restore.on("close", async (code) => {
    if (code === 0) {
      await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [req.user.username, "Restored the database from an uploaded backup file"]);
      res.json({ message: "Database restored successfully." });
    } else if (!res.headersSent) {
      res.status(500).json({ message: `Restore failed: ${errorOutput.slice(0, 500)}` });
    }
  });

  restore.stdin.write(sqlContent);
  restore.stdin.end();
}