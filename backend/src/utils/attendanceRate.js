/**
 * Single HIM-approved attendance-rate definition (Tasks 3 & 8).
 *
 * HIM decision: the attendance rate counts CBT group sessions ONLY, matching MTRC's own
 * OP CM Tracker sheet. PE, SHGM, individual and family sessions are tracked separately
 * but are NOT part of the attendance rate.
 *
 *   Attendance rate = CBT sessions attended ÷ CBT sessions expected × 100
 *
 *   expected  = distinct CBT group sessions the patient was expected at (pre-scheduled roster
 *               or an attendance record), dated on or before today, EXCLUDING center-cancelled
 *               and rescheduled sessions.
 *   attended  = of those, sessions recorded Present or Late with completion CREDITED and not a
 *               repeated topic (the tracker's "Actual Attended" column).
 *
 * The analytics page, patient list, patient profile, dashboard, monthly tracker and its export
 * must all use this module.
 */

export const ATTENDANCE_RATE_SESSION_TYPES = ["CBT_GROUP"];

export const ATTENDANCE_RATE_DEFINITION = {
  key: "CBT_ONLY",
  label: "CBT attendance rate",
  sessionTypes: ATTENDANCE_RATE_SESSION_TYPES,
  formula: "CBT sessions attended (credited) ÷ CBT sessions expected × 100",
  description:
    "HIM-approved definition: counts CBT group sessions only, as on MTRC's OP CM Tracker sheet. " +
    "Expected sessions are scheduled-roster or recorded CBT sessions up to today, excluding center-cancelled and rescheduled sessions. " +
    "Attended sessions are Present/Late with curriculum credit (repeated topics excluded).",
};

/** Returns a percentage with up to 2 decimals, or null when nothing was expected. */
export function computeAttendanceRate(attended, expected) {
  const a = Number(attended || 0);
  const e = Number(expected || 0);
  if (e <= 0) return null;
  return Math.round((a / e) * 10000) / 100;
}

/**
 * Computes CBT attendance rates for many patients in one pass.
 *
 * @param {import("mysql2/promise").Pool} db
 * @param {number[]} patientIds
 * @param {{ start?: string, end?: string }} [range] inclusive YYYY-MM-DD bounds (optional)
 * @returns {Promise<Map<number, { expected: number, attended: number, rate: number|null }>>}
 */
export async function getAttendanceRates(db, patientIds, range = {}) {
  const result = new Map();
  const ids = (patientIds || []).map(Number).filter(Boolean);
  for (const id of ids) result.set(id, { expected: 0, attended: 0, rate: null });
  if (ids.length === 0) return result;

  const { start = null, end = null } = range;
  const rangeSql = (col) =>
    `${start ? ` AND ${col} >= ?` : ""}${end ? ` AND ${col} <= ?` : ""}`;
  const rangeParams = [...(start ? [start] : []), ...(end ? [end] : [])];

  // Expected sessions: union of pre-scheduled roster entries and recorded attendance,
  // keyed by session so a recorded roster patient is counted once.
  const [expectedRows] = await db.query(
    `SELECT x.patient_id, COUNT(*) AS expected
     FROM (
       SELECT sr.patient_id, CONCAT('S', s.id) AS k
       FROM session_roster sr
       JOIN sessions s ON s.id = sr.session_id
       WHERE sr.patient_id IN (?)
         AND s.session_type IN (?)
         AND s.session_date <= CURDATE()
         AND COALESCE(s.session_status, 'COMPLETED') NOT IN ('CANCELLED', 'RESCHEDULED')
         ${rangeSql("s.session_date")}
       UNION
       SELECT a.patient_id, IF(a.session_id IS NULL, CONCAT('A', a.id), CONCAT('S', a.session_id)) AS k
       FROM attendance a
       LEFT JOIN sessions s ON s.id = a.session_id
       WHERE a.patient_id IN (?)
         AND a.session_type IN (?)
         AND a.status <> 'cancelled'
         AND a.session_date <= CURDATE()
         AND COALESCE(s.session_status, 'COMPLETED') NOT IN ('CANCELLED', 'RESCHEDULED')
         ${rangeSql("a.session_date")}
     ) x
     GROUP BY x.patient_id`,
    [ids, ATTENDANCE_RATE_SESSION_TYPES, ...rangeParams, ids, ATTENDANCE_RATE_SESSION_TYPES, ...rangeParams]
  );

  const [attendedRows] = await db.query(
    `SELECT a.patient_id, COUNT(DISTINCT IF(a.session_id IS NULL, CONCAT('A', a.id), CONCAT('S', a.session_id))) AS attended
     FROM attendance a
     LEFT JOIN sessions s ON s.id = a.session_id
     WHERE a.patient_id IN (?)
       AND a.session_type IN (?)
       AND a.status IN ('present', 'late')
       AND a.completion_status = 'CREDITED'
       AND COALESCE(a.is_duplicate_topic, 0) = 0
       AND a.session_date <= CURDATE()
       AND COALESCE(s.session_status, 'COMPLETED') NOT IN ('CANCELLED', 'RESCHEDULED')
       ${rangeSql("a.session_date")}
     GROUP BY a.patient_id`,
    [ids, ATTENDANCE_RATE_SESSION_TYPES, ...rangeParams]
  );

  for (const r of expectedRows) {
    const entry = result.get(Number(r.patient_id));
    if (entry) entry.expected = Number(r.expected || 0);
  }
  for (const r of attendedRows) {
    const entry = result.get(Number(r.patient_id));
    if (entry) entry.attended = Number(r.attended || 0);
  }
  for (const entry of result.values()) {
    entry.rate = computeAttendanceRate(entry.attended, entry.expected);
  }
  return result;
}

/** Aggregate rate across a set of patients (sum attended ÷ sum expected). */
export function aggregateAttendanceRate(rateMap) {
  let attended = 0;
  let expected = 0;
  for (const v of rateMap.values()) {
    attended += v.attended;
    expected += v.expected;
  }
  return { attended, expected, rate: computeAttendanceRate(attended, expected) };
}
