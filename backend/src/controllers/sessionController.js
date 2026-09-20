import pool from "../config/db.js";

const VALID_SESSION_TYPES = new Set([
  "CBT_GROUP",
  "PSYCHO_EDUCATION",
  "SHGM",
  "INDIVIDUAL_COUNSELING",
  "CONJOINT_FAMILY",
]);

const SESSION_TYPE_LABELS = {
  CBT_GROUP:             "CBT Group Session",
  PSYCHO_EDUCATION:      "Psycho-Education / PE Meeting",
  SHGM:                  "Self-Help Group Meeting",
  INDIVIDUAL_COUNSELING: "Individual Counseling",
  CONJOINT_FAMILY:       "Conjoint / Family Session",
};

export async function createSession(req, res) {
  const { sessionType, caseManagerId, sessionDate, sessionTime } = req.body;

  if (!sessionType || !VALID_SESSION_TYPES.has(sessionType)) {
    return res.status(400).json({ message: "Select a valid session type from the 5 therapeutic modalities." });
  }
  if (!sessionDate) {
    return res.status(400).json({ message: "Session date is required." });
  }

  const sessionName = SESSION_TYPE_LABELS[sessionType];

  try {
    const [result] = await pool.query(
      `INSERT INTO sessions (session_name, session_type, case_manager_id, session_date, session_time, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionName, sessionType, caseManagerId || null, sessionDate, sessionTime || null, req.user.id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not create the session." });
  }
}