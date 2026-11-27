import pool from "../config/db.js";

// Settings → "Session timeout (minutes)": how long a login stays valid without activity.
// Cached briefly so every request does not hit system_settings.
let cached = { minutes: 60, at: 0 };
export async function getSessionTimeoutMinutes() {
  if (Date.now() - cached.at < 60_000) return cached.minutes;
  try {
    const [rows] = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'session_timeout_minutes'");
    const n = parseInt(rows[0]?.setting_value, 10);
    cached = { minutes: Number.isFinite(n) ? Math.min(Math.max(n, 5), 1440) : 60, at: Date.now() };
  } catch {
    cached = { minutes: cached.minutes || 60, at: Date.now() };
  }
  return cached.minutes;
}

/** Forget the cached value (called after the setting is saved). */
export function resetSessionTimeoutCache() {
  cached.at = 0;
}
