import pool from "../config/db.js";

export async function createSession(req, res) {
  const { sessionName, programId, caseManagerId, sessionDate, sessionTime } = req.body;

  if (!sessionName || !sessionDate) {
    return res.status(400).json({ message: "Session name and date are required." });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO sessions (session_name, program_id, case_manager_id, session_date, session_time, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionName, programId || null, caseManagerId || null, sessionDate, sessionTime || null, req.user.id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not create the session." });
  }
}