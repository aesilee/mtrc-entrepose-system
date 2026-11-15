import pool from "../config/db.js";
import { ensureAttendanceCompletionSchema } from "../utils/attendanceSchema.js";
import { getUnifiedPatientProgress } from "../utils/curriculumProgress.js";

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

// Fallback topics from Annex 1 in case database table is not yet migrated in MySQL Workbench
const FALLBACK_TOPICS = [
  { id: 1, category: "ORIENTATION", topic_code: "ORIENTATION-01", topic_number: 1, title_tagalog: "Oryentasyon sa Programa", modality_type: "CBT_GROUP" },
  { id: 2, category: "CBT", topic_code: "CBT-01", topic_number: 1, title_tagalog: "Sesyon 1. Pag-iskedyul", modality_type: "CBT_GROUP" },
  { id: 3, category: "CBT", topic_code: "CBT-02", topic_number: 2, title_tagalog: "Sesyon 2. Mga Tukso", modality_type: "CBT_GROUP" },
  { id: 4, category: "CBT", topic_code: "CBT-03", topic_number: 3, title_tagalog: "Sesyon 3. Pagkaya sa Mga Tukso", modality_type: "CBT_GROUP" },
  { id: 5, category: "CBT", topic_code: "CBT-04", topic_number: 4, title_tagalog: "Sesyon 4. Pagkontrol sa Kaisipan", modality_type: "CBT_GROUP" },
  { id: 6, category: "CBT", topic_code: "CBT-05", topic_number: 5, title_tagalog: "Sesyon 5. External Triggers", modality_type: "CBT_GROUP" },
  { id: 7, category: "CBT", topic_code: "CBT-06", topic_number: 6, title_tagalog: "Sesyon 6. Internal Triggers", modality_type: "CBT_GROUP" },
  { id: 8, category: "CBT", topic_code: "CBT-07", topic_number: 7, title_tagalog: "Sesyon 7. Daan Tungo sa Paggaling", modality_type: "CBT_GROUP" },
  { id: 9, category: "CBT", topic_code: "CBT-08", topic_number: 8, title_tagalog: "Sesyon 8. Mga Meeting ng Self-Help Group", modality_type: "CBT_GROUP" },
  { id: 10, category: "CBT", topic_code: "CBT-09", topic_number: 9, title_tagalog: "Sesyon 9. Ang Karunungang 12-Steps", modality_type: "CBT_GROUP" },
  { id: 11, category: "CBT", topic_code: "CBT-10", topic_number: 10, title_tagalog: "Sesyon 10. Mga Karaniwang Hamon sa Pagpapanatili ng Abstinence", modality_type: "CBT_GROUP" },
  { id: 12, category: "CBT", topic_code: "CBT-11", topic_number: 11, title_tagalog: "Sesyon 11. Pag-iisip, Pakikiramdam, at Pagsasagawa", modality_type: "CBT_GROUP" },
  { id: 13, category: "CBT", topic_code: "CBT-12", topic_number: 12, title_tagalog: "Sesyon 12. Alak", modality_type: "CBT_GROUP" },
  { id: 14, category: "CBT", topic_code: "CBT-13", topic_number: 13, title_tagalog: "Sesyon 13. Pagkabagot", modality_type: "CBT_GROUP" },
  { id: 15, category: "CBT", topic_code: "CBT-14", topic_number: 14, title_tagalog: "Sesyon 14. Pag-iwas sa Relapse Drift", modality_type: "CBT_GROUP" },
  { id: 16, category: "CBT", topic_code: "CBT-15", topic_number: 15, title_tagalog: "Sesyon 15. Lapse and Relapse", modality_type: "CBT_GROUP" },
  { id: 17, category: "CBT", topic_code: "CBT-16", topic_number: 16, title_tagalog: "Sesyon 16. Trabaho at Paggaling", modality_type: "CBT_GROUP" },
  { id: 18, category: "CBT", topic_code: "CBT-17", topic_number: 17, title_tagalog: "Sesyon 17. Konsensya at Kahihiyan", modality_type: "CBT_GROUP" },
  { id: 19, category: "CBT", topic_code: "CBT-18", topic_number: 18, title_tagalog: "Sesyon 18. Pananatiling Abala", modality_type: "CBT_GROUP" },
  { id: 20, category: "CBT", topic_code: "CBT-19", topic_number: 19, title_tagalog: "Sesyon 19. Motibasyon para sa Paggaling", modality_type: "CBT_GROUP" },
  { id: 21, category: "CBT", topic_code: "CBT-20", topic_number: 20, title_tagalog: "Sesyon 20. Pagkamatapat", modality_type: "CBT_GROUP" },
  { id: 22, category: "CBT", topic_code: "CBT-21", topic_number: 21, title_tagalog: "Sesyon 21. Mga Argumento sa Alak", modality_type: "CBT_GROUP" },
  { id: 23, category: "CBT", topic_code: "CBT-22", topic_number: 22, title_tagalog: "Sesyon 22. Sex at Paggaling", modality_type: "CBT_GROUP" },
  { id: 24, category: "CBT", topic_code: "CBT-23", topic_number: 23, title_tagalog: "Sesyon 23. Pag-agap at Pag-iwas sa muling Paggamit", modality_type: "CBT_GROUP" },
  { id: 25, category: "CBT", topic_code: "CBT-24", topic_number: 24, title_tagalog: "Sesyon 24. Tiwala", modality_type: "CBT_GROUP" },
  { id: 26, category: "CBT", topic_code: "CBT-25", topic_number: 25, title_tagalog: "Sesyon 25. Maging Matalino, Hindi Malakas", modality_type: "CBT_GROUP" },
  { id: 27, category: "CBT", topic_code: "CBT-26", topic_number: 26, title_tagalog: "Sesyon 26. Ang Kahulugan ng Ispiritwalidad", modality_type: "CBT_GROUP" },
  { id: 28, category: "CBT", topic_code: "CBT-27", topic_number: 27, title_tagalog: "Sesyon 27. Pamamahala ng Buhay at Pera", modality_type: "CBT_GROUP" },
  { id: 29, category: "CBT", topic_code: "CBT-28", topic_number: 28, title_tagalog: "Sesyon 28. Pangangatwiran sa Muling Paggamit (1)", modality_type: "CBT_GROUP" },
  { id: 30, category: "CBT", topic_code: "CBT-29", topic_number: 29, title_tagalog: "Sesyon 29. Pag-aalaga sa Iyong Sarili", modality_type: "CBT_GROUP" },
  { id: 31, category: "CBT", topic_code: "CBT-30", topic_number: 30, title_tagalog: "Sesyon 30. Mga Emosyonal na Tukso", modality_type: "CBT_GROUP" },
  { id: 32, category: "CBT", topic_code: "CBT-31", topic_number: 31, title_tagalog: "Sesyon 31. Sakit", modality_type: "CBT_GROUP" },
  { id: 33, category: "CBT", topic_code: "CBT-32", topic_number: 32, title_tagalog: "Sesyon 32. Pagkilala sa Stress", modality_type: "CBT_GROUP" },
  { id: 34, category: "CBT", topic_code: "CBT-33", topic_number: 33, title_tagalog: "Sesyon 33. Pagbabawas ng Stress", modality_type: "CBT_GROUP" },
  { id: 35, category: "CBT", topic_code: "CBT-34", topic_number: 34, title_tagalog: "Sesyon 34. Pamamahala ng Galit", modality_type: "CBT_GROUP" },
  { id: 36, category: "CBT", topic_code: "CBT-35", topic_number: 35, title_tagalog: "Sesyon 35. Pagtanggap", modality_type: "CBT_GROUP" },
  { id: 37, category: "CBT", topic_code: "CBT-36", topic_number: 36, title_tagalog: "Sesyon 36. Pagkakaroon ng Mga Bagong Kaibigan", modality_type: "CBT_GROUP" },
  { id: 38, category: "CBT", topic_code: "CBT-37", topic_number: 37, title_tagalog: "Sesyon 37. Pag-aayos ng mga Relasyon", modality_type: "CBT_GROUP" },
  { id: 39, category: "CBT", topic_code: "CBT-38", topic_number: 38, title_tagalog: "Sesyon 38. Dasal ng Kahinahunan", modality_type: "CBT_GROUP" },
  { id: 40, category: "CBT", topic_code: "CBT-39", topic_number: 39, title_tagalog: "Sesyon 39. Hindi Mapigilang Pag-uugali", modality_type: "CBT_GROUP" },
  { id: 41, category: "CBT", topic_code: "CBT-40", topic_number: 40, title_tagalog: "Sesyon 40. Pagkaya sa mga Emosyon", modality_type: "CBT_GROUP" },
  { id: 42, category: "CBT", topic_code: "CBT-41", topic_number: 41, title_tagalog: "Sesyon 41. Depresyon", modality_type: "CBT_GROUP" },
  { id: 43, category: "CBT", topic_code: "CBT-42", topic_number: 42, title_tagalog: "Sesyon 42. Pangangatwiran sa Muling Paggamit (2)", modality_type: "CBT_GROUP" },
  { id: 44, category: "CBT", topic_code: "CBT-43", topic_number: 43, title_tagalog: "Sesyon 43. Ang Nakaraan, Pangkasalukuyan, at ang Hinaharap", modality_type: "CBT_GROUP" },
  { id: 45, category: "CBT", topic_code: "CBT-44", topic_number: 44, title_tagalog: "Sesyon 44. Mga Gawaing Nakakalibang", modality_type: "CBT_GROUP" },
  { id: 46, category: "CBT", topic_code: "CBT-45", topic_number: 45, title_tagalog: "Sesyon 45. Pagpaplano, Pamamahala sa Oras ng Pamamahinga", modality_type: "CBT_GROUP" },
  { id: 47, category: "CBT", topic_code: "CBT-46", topic_number: 46, title_tagalog: "Sesyon 46. Holidays at Paggaling", modality_type: "CBT_GROUP" },
  { id: 48, category: "CBT_E", topic_code: "CBTE-01", topic_number: 1, title_tagalog: "Sesyon 1. Pagsusuri ng Katayuan ng Paggaling", modality_type: "CBT_GROUP" },
  { id: 49, category: "CBT_E", topic_code: "CBTE-02", topic_number: 2, title_tagalog: "Sesyon 2. Pagsusuri sa mga Pag-uugali para sa Pag-iwas sa Muling Paggamit", modality_type: "CBT_GROUP" },
  { id: 50, category: "CBT_E", topic_code: "CBTE-03", topic_number: 3, title_tagalog: "Sesyon 3. Pagpapatuloy ng Treatment Planning", modality_type: "CBT_GROUP" },
  { id: 51, category: "PE_PATIENT", topic_code: "PE-PAT-01", topic_number: 1, title_tagalog: "Sesyon 1: Triggers/Mga Tukso at Cravings/Giyang (1)", modality_type: "PSYCHO_EDUCATION" },
  { id: 52, category: "PE_PATIENT", topic_code: "PE-PAT-02", topic_number: 2, title_tagalog: "Sesyon 2: Triggers/Mga Tukso at Cravings/Giyang (2)", modality_type: "PSYCHO_EDUCATION" },
  { id: 53, category: "PE_PATIENT", topic_code: "PE-PAT-03", topic_number: 3, title_tagalog: "Sesyon 3: Alak at Recovery (1)", modality_type: "PSYCHO_EDUCATION" },
  { id: 54, category: "PE_PATIENT", topic_code: "PE-PAT-04", topic_number: 4, title_tagalog: "Sesyon 4: Alak at Recovery (2)", modality_type: "PSYCHO_EDUCATION" },
  { id: 55, category: "PE_PATIENT", topic_code: "PE-PAT-05", topic_number: 5, title_tagalog: "Sesyon 5: Shabu at Cocaine (1)", modality_type: "PSYCHO_EDUCATION" },
  { id: 56, category: "PE_PATIENT", topic_code: "PE-PAT-06", topic_number: 6, title_tagalog: "Sesyon 6: Shabu at Cocaine (2)", modality_type: "PSYCHO_EDUCATION" },
  { id: 57, category: "PE_PATIENT", topic_code: "PE-PAT-07", topic_number: 7, title_tagalog: "Sesyon 7: Daan Tungo sa Recovery (1)", modality_type: "PSYCHO_EDUCATION" },
  { id: 58, category: "PE_PATIENT", topic_code: "PE-PAT-08", topic_number: 8, title_tagalog: "Sesyon 8: Daan Tungo sa Recovery (2)", modality_type: "PSYCHO_EDUCATION" },
  { id: 59, category: "PE_PATIENT", topic_code: "PE-PAT-09", topic_number: 9, title_tagalog: "Sesyon 9: Ang Pamilya at Recovery (1)", modality_type: "PSYCHO_EDUCATION" },
  { id: 60, category: "PE_PATIENT", topic_code: "PE-PAT-10", topic_number: 10, title_tagalog: "Sesyon 10: Ang Pamilya at Recovery (2)", modality_type: "PSYCHO_EDUCATION" },
  { id: 61, category: "PE_PATIENT", topic_code: "PE-PAT-11", topic_number: 11, title_tagalog: "Sesyon 11: Marijuana", modality_type: "PSYCHO_EDUCATION" },
  { id: 62, category: "PE_PATIENT", topic_code: "PE-PAT-12", topic_number: 12, title_tagalog: "Sesyon 12: Opioids at Club Drugs", modality_type: "PSYCHO_EDUCATION" },
  { id: 63, category: "PE_FAMILY", topic_code: "PE-FAM-01", topic_number: 1, title_tagalog: "Sesyon 1: Triggers/Mga Tukso (Family)", modality_type: "CONJOINT_FAMILY" },
  { id: 64, category: "PE_FAMILY", topic_code: "PE-FAM-02", topic_number: 2, title_tagalog: "Sesyon 2: Alak at Recovery (Family)", modality_type: "CONJOINT_FAMILY" },
  { id: 65, category: "SHGM", topic_code: "SHGM-01", topic_number: 1, title_tagalog: "Step 1 Chairperson", modality_type: "SHGM" },
  { id: 66, category: "SHGM", topic_code: "SHGM-02", topic_number: 2, title_tagalog: "Step 2 Chairperson", modality_type: "SHGM" }
];

export async function getSessionTopics(req, res) {
  const { modality, category } = req.query;

  try {
    const [tables] = await pool.query("SHOW TABLES LIKE 'session_topics'");
    if (tables.length === 0) {
      // Return filtered fallback topics if table not yet migrated
      let filtered = [...FALLBACK_TOPICS];
      if (modality) filtered = filtered.filter(t => t.modality_type === modality);
      if (category) filtered = filtered.filter(t => t.category === category);
      return res.json({ topics: filtered, source: "fallback" });
    }

    let sql = "SELECT * FROM session_topics WHERE is_active = TRUE";
    const params = [];
    if (modality) {
      sql += " AND modality_type = ?";
      params.push(modality);
    }
    if (category) {
      sql += " AND category = ?";
      params.push(category);
    }
    sql += " ORDER BY category, topic_number";
    const [rows] = await pool.query(sql, params);
    res.json({ topics: rows, source: "database" });
  } catch (err) {
    console.error("Error fetching session topics:", err);
    res.json({ topics: FALLBACK_TOPICS, source: "fallback_error" });
  }
}

export async function createSession(req, res) {
  const {
    sessionType,
    topicId,
    topicName,
    curriculumRequirement,
    facilitatorName,
    caseManagerId,
    sessionDate,
    sessionTime,
    sessionStatus,
    cancellationReason,
    authorizedByName,
  } = req.body;

  if (!sessionType || !VALID_SESSION_TYPES.has(sessionType)) {
    return res.status(400).json({ message: "Select a valid session type from the 5 therapeutic modalities." });
  }
  if (!sessionDate) {
    return res.status(400).json({ message: "Session date is required." });
  }

  const isCancelled = sessionStatus === "CANCELLED";
  if (isCancelled && !String(cancellationReason || "").trim()) {
    return res.status(400).json({ message: "Provide a cancellation reason when marking a session as cancelled." });
  }

  const matchedTopic = topicId
    ? FALLBACK_TOPICS.find((t) => String(t.id) === String(topicId))
    : null;

  const resolvedTopicName = topicName || matchedTopic?.title_tagalog || null;
  const resolvedCurriculumReq = curriculumRequirement
    || (matchedTopic ? `[${matchedTopic.topic_code}] ${matchedTopic.title_tagalog}` : null)
    || resolvedTopicName
    || SESSION_TYPE_LABELS[sessionType];

  const defaultName = SESSION_TYPE_LABELS[sessionType];
  const finalSessionName = resolvedTopicName ? `${defaultName}: ${resolvedTopicName}` : defaultName;
  const finalStatus = isCancelled ? "CANCELLED" : "COMPLETED";

  try {
    await ensureAttendanceCompletionSchema();

    const [sessCols] = await pool.query("SHOW COLUMNS FROM sessions");
    const sessColNames = new Set(sessCols.map((c) => c.Field));

    const cols = ["session_name", "session_type", "case_manager_id", "session_date", "session_time", "created_by"];
    const vals = [finalSessionName, sessionType, caseManagerId || null, sessionDate, sessionTime || null, req.user.id];

    if (sessColNames.has("topic_id")) {
      cols.push("topic_id", "topic_name", "facilitator_name");
      vals.push(topicId || null, resolvedTopicName, facilitatorName || null);
    }
    if (sessColNames.has("session_status")) {
      cols.push("session_status");
      vals.push(finalStatus);
    }
    if (sessColNames.has("curriculum_requirement")) {
      cols.push("curriculum_requirement");
      vals.push(resolvedCurriculumReq);
    }
    if (sessColNames.has("cancellation_reason")) {
      cols.push("cancellation_reason");
      vals.push(isCancelled ? String(cancellationReason).trim() : null);
    }
    if (sessColNames.has("authorized_by")) {
      cols.push("authorized_by");
      vals.push(req.user.id);
    }
    if (sessColNames.has("authorized_by_name")) {
      cols.push("authorized_by_name");
      vals.push(authorizedByName || req.user.full_name || req.user.username || null);
    }

    const placeholders = cols.map(() => "?").join(", ");
    const [result] = await pool.query(
      `INSERT INTO sessions (${cols.join(", ")}) VALUES (${placeholders})`,
      vals
    );
    const sessionId = result.insertId;

    // If expected patients are provided (pre-scheduled or assigned list), insert into session_roster
    const expectedIds = Array.isArray(req.body.expectedPatientIds) ? req.body.expectedPatientIds : [];
    if (expectedIds.length > 0) {
      for (const pid of expectedIds) {
        await pool.query(
          `INSERT IGNORE INTO session_roster (session_id, patient_id, assigned_by) VALUES (?, ?, ?)`,
          [sessionId, pid, req.user.id]
        ).catch(() => {});
      }
    }

    if (isCancelled) {
      await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
        req.user.username,
        `Cancelled session "${finalSessionName}" (${sessionDate}) — Reason: ${String(cancellationReason).trim()}`,
      ]).catch(() => {});
    }

    res.status(201).json({
      id: sessionId,
      sessionName: finalSessionName,
      sessionStatus: finalStatus,
      curriculumRequirement: resolvedCurriculumReq,
      expectedCount: expectedIds.length,
    });
  } catch (err) {
    console.error("Error creating session:", err);
    res.status(500).json({ message: "Could not create the session." });
  }
}

/**
 * Schedule a future or planned session with an expected cohort/patient list
 * Sets session_status = 'SCHEDULED' and populates session_roster
 */
export async function scheduleSession(req, res) {
  const {
    sessionType,
    topicId,
    topicName,
    curriculumRequirement,
    facilitatorName,
    caseManagerId,
    sessionDate,
    sessionTime,
    expectedPatientIds,
    notes,
  } = req.body;

  if (!sessionType || !VALID_SESSION_TYPES.has(sessionType)) {
    return res.status(400).json({ message: "Select a valid session type from the 5 therapeutic modalities." });
  }
  if (!sessionDate) {
    return res.status(400).json({ message: "Session date is required." });
  }

  const patientIds = Array.isArray(expectedPatientIds) ? expectedPatientIds.filter(Boolean) : [];
  if (patientIds.length === 0) {
    return res.status(400).json({ message: "Select at least one expected patient to schedule this session." });
  }

  const SINGLE_PATIENT_TYPES = ["INDIVIDUAL_COUNSELING", "CONJOINT_FAMILY"];
  if (SINGLE_PATIENT_TYPES.includes(sessionType) && patientIds.length > 1) {
    return res.status(400).json({ message: "Individual counseling and conjoint/family sessions can only have 1 expected patient." });
  }

  const matchedTopic = topicId
    ? FALLBACK_TOPICS.find((t) => String(t.id) === String(topicId))
    : null;

  const resolvedTopicName = topicName || matchedTopic?.title_tagalog || null;
  const resolvedCurriculumReq = curriculumRequirement
    || (matchedTopic ? `[${matchedTopic.topic_code}] ${matchedTopic.title_tagalog}` : null)
    || resolvedTopicName
    || SESSION_TYPE_LABELS[sessionType];

  const defaultName = SESSION_TYPE_LABELS[sessionType];
  const finalSessionName = resolvedTopicName ? `${defaultName}: ${resolvedTopicName}` : defaultName;

  const connection = await pool.getConnection();
  try {
    await ensureAttendanceCompletionSchema(connection);
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO sessions (
         session_name, session_type, case_manager_id, session_date, session_time,
         topic_id, topic_name, facilitator_name, session_status, curriculum_requirement, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?)`,
      [
        finalSessionName,
        sessionType,
        caseManagerId || null,
        sessionDate,
        sessionTime || null,
        topicId || null,
        resolvedTopicName,
        facilitatorName || null,
        resolvedCurriculumReq,
        req.user.id,
      ]
    );

    const sessionId = result.insertId;

    for (const pid of patientIds) {
      await connection.query(
        `INSERT IGNORE INTO session_roster (session_id, patient_id, assigned_by) VALUES (?, ?, ?)`,
        [sessionId, pid, req.user.id]
      );
    }

    await connection.commit();

    await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
      req.user.username,
      `Scheduled session "${finalSessionName}" on ${sessionDate} with ${patientIds.length} expected patient(s)`,
    ]).catch(() => {});

    res.status(201).json({
      id: sessionId,
      sessionName: finalSessionName,
      sessionStatus: "SCHEDULED",
      curriculumRequirement: resolvedCurriculumReq,
      expectedCount: patientIds.length,
      sessionDate,
      sessionTime,
    });
  } catch (err) {
    await connection.rollback();
    console.error("Error scheduling session:", err);
    res.status(500).json({ message: "Could not schedule the session." });
  } finally {
    connection.release();
  }
}

/**
 * Reschedule a session to a new date/time
 * Marks original session as 'RESCHEDULED', creates a new 'SCHEDULED' session,
 * links them together, and preserves the expected roster and original schedule date.
 */
export async function rescheduleSession(req, res) {
  const { id } = req.params;
  const { newDate, newTime, reason, authorizedByName } = req.body;

  if (!newDate) {
    return res.status(400).json({ message: "A new scheduled session date is required." });
  }
  if (!String(reason || "").trim()) {
    return res.status(400).json({ message: "A documented reason for rescheduling is required." });
  }

  const connection = await pool.getConnection();
  try {
    await ensureAttendanceCompletionSchema(connection);

    const [[orig]] = await connection.query(
      `SELECT * FROM sessions WHERE id = ?`,
      [id]
    );
    if (!orig) {
      connection.release();
      return res.status(404).json({ message: "Session not found." });
    }

    if (orig.session_status === "COMPLETED") {
      connection.release();
      return res.status(400).json({ message: "Cannot reschedule a session that is already completed." });
    }

    await connection.beginTransaction();

    const authStaff = authorizedByName || req.user.full_name || req.user.username;

    // 1. Create the new session carrying over all topic, requirement, and program details
    const [newResult] = await connection.query(
      `INSERT INTO sessions (
         session_name, session_type, case_manager_id, session_date, session_time,
         topic_id, topic_name, facilitator_name, session_status, curriculum_requirement,
         original_session_id, original_session_date, authorized_by, authorized_by_name, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?, ?, ?, ?, ?)`,
      [
        orig.session_name,
        orig.session_type,
        orig.case_manager_id,
        newDate,
        newTime || orig.session_time || null,
        orig.topic_id,
        orig.topic_name,
        orig.facilitator_name,
        orig.curriculum_requirement,
        orig.id,
        orig.session_date,
        req.user.id,
        authStaff,
        req.user.id,
      ]
    );

    const newSessionId = newResult.insertId;

    // 2. Copy over all expected patients in session_roster from the original session
    const [rosterRows] = await connection.query(
      `SELECT patient_id FROM session_roster WHERE session_id = ?`,
      [id]
    );
    for (const r of rosterRows) {
      await connection.query(
        `INSERT IGNORE INTO session_roster (session_id, patient_id, assigned_by) VALUES (?, ?, ?)`,
        [newSessionId, r.patient_id, req.user.id]
      );
    }

    // 3. Mark the original session as RESCHEDULED and link to the new session
    await connection.query(
      `UPDATE sessions
       SET session_status = 'RESCHEDULED',
           rescheduled_to_session_id = ?,
           rescheduled_date = ?,
           rescheduled_reason = ?,
           authorized_by = ?,
           authorized_by_name = ?
       WHERE id = ?`,
      [newSessionId, newDate, String(reason).trim(), req.user.id, authStaff, id]
    );

    await connection.commit();

    await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
      req.user.username,
      `Rescheduled session "${orig.session_name}" from ${orig.session_date} to ${newDate} (${rosterRows.length} expected patients moved) — Reason: ${String(reason).trim()}`,
    ]).catch(() => {});

    res.json({
      message: "Session successfully rescheduled. Original schedule preserved in history.",
      originalSessionId: orig.id,
      newSessionId,
      newDate,
      newTime: newTime || orig.session_time,
      expectedCount: rosterRows.length,
    });
  } catch (err) {
    await connection.rollback();
    console.error("Error rescheduling session:", err);
    res.status(500).json({ message: "Could not reschedule session." });
  } finally {
    connection.release();
  }
}

/**
 * List all sessions with their status, expected count, recorded count, and unresolved count
 */
export async function listScheduledSessions(req, res) {
  const { dateFrom, dateTo, status, sessionType, caseManagerId } = req.query;

  try {
    await ensureAttendanceCompletionSchema();

    const where = [];
    const params = [];

    if (dateFrom && dateTo) {
      where.push("s.session_date BETWEEN ? AND ?");
      params.push(dateFrom, dateTo);
    } else if (dateFrom) {
      where.push("s.session_date >= ?");
      params.push(dateFrom);
    } else if (dateTo) {
      where.push("s.session_date <= ?");
      params.push(dateTo);
    }

    if (status) {
      where.push("s.session_status = ?");
      params.push(status);
    }

    if (sessionType) {
      where.push("s.session_type = ?");
      params.push(sessionType);
    }

    if (caseManagerId) {
      where.push("s.case_manager_id = ?");
      params.push(caseManagerId);
    } else if (req.user.role === "case_manager") {
      where.push("(s.case_manager_id = ? OR s.created_by = ?)");
      params.push(req.user.id, req.user.id);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT s.id, s.session_name, s.session_type, s.session_date, s.session_time,
              COALESCE(s.session_status, 'COMPLETED') AS session_status,
              s.curriculum_requirement, s.topic_id, s.topic_name, s.facilitator_name,
              s.case_manager_id, u.full_name AS case_manager_name,
              s.cancellation_reason, s.rescheduled_to_session_id, s.rescheduled_date,
              s.rescheduled_reason, s.original_session_id, s.original_session_date,
              s.authorized_by_name,
              COUNT(DISTINCT sr.patient_id) AS expected_count,
              COUNT(DISTINCT a.patient_id) AS recorded_count,
              SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) AS attended_count,
              SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
              SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) AS excused_count,
              SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count,
              GREATEST(0, COUNT(DISTINCT sr.patient_id) - COUNT(DISTINCT a.patient_id)) AS unresolved_count
       FROM sessions s
       LEFT JOIN users u ON u.id = s.case_manager_id
       LEFT JOIN session_roster sr ON sr.session_id = s.id
       LEFT JOIN attendance a ON a.session_id = s.id AND a.patient_id = sr.patient_id
       ${whereSql}
       GROUP BY s.id
       ORDER BY s.session_date DESC, s.session_time ASC, s.id DESC`,
      params
    );

    res.json({ sessions: rows });
  } catch (err) {
    console.error("Error listing sessions:", err);
    res.status(500).json({ message: "Could not retrieve sessions list." });
  }
}

/**
 * Get unresolved sessions: past sessions (session_date <= CURDATE()) where
 * expected patients were scheduled but attendance was never recorded for them.
 */
export async function getUnresolvedSessions(req, res) {
  try {
    await ensureAttendanceCompletionSchema();

    const scopeClauses = [];
    const scopeParams = [];

    if (req.user.role === "case_manager") {
      scopeClauses.push("(s.case_manager_id = ? OR s.created_by = ? OR p.assigned_case_manager_id = ?)");
      scopeParams.push(req.user.id, req.user.id, req.user.id);
    }

    const scopeSql = scopeClauses.length ? `AND ${scopeClauses.join(" AND ")}` : "";

    const [unresolvedPatients] = await pool.query(
      `SELECT s.id AS session_id, s.session_name, s.session_type, s.session_date, s.session_time,
              s.curriculum_requirement, s.facilitator_name,
              u.full_name AS case_manager_name,
              p.id AS patient_id, p.patient_code, p.pwud_code, p.full_name AS patient_name,
              p.assigned_case_manager_id
       FROM session_roster sr
       JOIN sessions s ON s.id = sr.session_id
       JOIN patients p ON p.id = sr.patient_id
       LEFT JOIN users u ON u.id = s.case_manager_id
       LEFT JOIN attendance a ON a.session_id = s.id AND a.patient_id = sr.patient_id
       WHERE s.session_date <= CURDATE()
         AND s.session_status NOT IN ('CANCELLED', 'RESCHEDULED')
         AND p.is_archived = FALSE
         AND a.id IS NULL
         ${scopeSql}
       ORDER BY s.session_date DESC, s.id DESC, p.full_name ASC`,
      scopeParams
    );

    // Group by session
    const sessionsMap = new Map();
    for (const row of unresolvedPatients) {
      if (!sessionsMap.has(row.session_id)) {
        sessionsMap.set(row.session_id, {
          sessionId: row.session_id,
          sessionName: row.session_name,
          sessionType: row.session_type,
          sessionDate: String(row.session_date).slice(0, 10),
          sessionTime: row.session_time,
          curriculumRequirement: row.curriculum_requirement,
          facilitatorName: row.facilitator_name,
          caseManagerName: row.case_manager_name,
          unresolvedPatients: [],
        });
      }
      sessionsMap.get(row.session_id).unresolvedPatients.push({
        patientId: row.patient_id,
        patientCode: row.patient_code,
        pwudCode: row.pwud_code,
        patientName: row.patient_name,
      });
    }

    const unresolvedSessions = Array.from(sessionsMap.values()).map((sess) => ({
      ...sess,
      unresolvedCount: sess.unresolvedPatients.length,
    }));

    const totalUnresolvedPatients = unresolvedPatients.length;

    res.json({
      unresolvedSessions,
      totalUnresolvedSessions: unresolvedSessions.length,
      totalUnresolvedPatients,
    });
  } catch (err) {
    console.error("Error fetching unresolved sessions:", err);
    res.status(500).json({ message: "Could not retrieve unresolved attendance." });
  }
}

/**
 * Get details of a single scheduled session including its expected roster and recorded attendance
 */
export async function getSessionDetails(req, res) {
  const { id } = req.params;

  try {
    await ensureAttendanceCompletionSchema();

    const [[session]] = await pool.query(
      `SELECT s.*, u.full_name AS case_manager_name,
              orig.session_name AS original_session_name,
              resch.session_name AS rescheduled_to_session_name
       FROM sessions s
       LEFT JOIN users u ON u.id = s.case_manager_id
       LEFT JOIN sessions orig ON orig.id = s.original_session_id
       LEFT JOIN sessions resch ON resch.id = s.rescheduled_to_session_id
       WHERE s.id = ?`,
      [id]
    );

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    const [roster] = await pool.query(
      `SELECT p.id, p.patient_code, p.pwud_code, p.full_name,
              p.assigned_case_manager_id, u.full_name AS case_manager_name,
              a.id AS attendance_id, a.status, a.completion_status, a.arrival_time,
              a.decision_reason, a.authorized_by_name, a.is_makeup, a.is_duplicate_topic,
              a.drug_test_result, a.relapse_risk, a.notes,
              CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END AS is_recorded
       FROM session_roster sr
       JOIN patients p ON p.id = sr.patient_id
       LEFT JOIN users u ON u.id = p.assigned_case_manager_id
       LEFT JOIN attendance a ON a.session_id = sr.session_id AND a.patient_id = sr.patient_id
       WHERE sr.session_id = ?
       ORDER BY p.full_name ASC`,
      [id]
    );

    const expectedCount = roster.length;
    const recordedCount = roster.filter((r) => r.is_recorded === 1).length;
    const unresolvedCount = expectedCount - recordedCount;

    res.json({
      session,
      roster,
      summary: {
        expectedCount,
        recordedCount,
        unresolvedCount,
        allRecorded: expectedCount > 0 && unresolvedCount === 0,
      },
    });
  } catch (err) {
    console.error("Error fetching session details:", err);
    res.status(500).json({ message: "Could not retrieve session details." });
  }
}

export async function getPatientAnnex1Progress(req, res) {
  const { patientId } = req.params;

  try {
    await ensureAttendanceCompletionSchema();

    const [[patient]] = await pool.query(
      `SELECT id, first_name, last_name, patient_code, admission_date FROM patients WHERE id = ?`,
      [patientId]
    );

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    const [attendances] = await pool.query(
      `SELECT a.id, a.session_date, a.session_type, a.status,
              COALESCE(a.completion_status, CASE WHEN a.status = 'present' THEN 'CREDITED' ELSE 'NOT_CREDITED' END) AS completion_status,
              COALESCE(a.curriculum_requirement, a.topic_name, s.topic_name, s.session_name, a.session_type) AS curriculum_requirement,
              a.arrival_time, a.decision_reason, a.authorized_by_name,
              a.is_makeup, a.makeup_for_attendance_id, a.is_duplicate_topic,
              a.notes,
              COALESCE(a.topic_id, s.topic_id) as topic_id,
              COALESCE(a.topic_name, s.topic_name) as topic_name,
              COALESCE(a.facilitator_name, s.facilitator_name, u.full_name) as facilitator_name
       FROM attendance a
       LEFT JOIN sessions s ON a.session_id = s.id
       LEFT JOIN users u ON a.recorded_by = u.id
       WHERE a.patient_id = ?
       ORDER BY a.session_date ASC, a.id ASC`,
      [patientId]
    );

    const unifiedProgress = await getUnifiedPatientProgress(pool, patientId);
    const creditedRows = attendances.filter(
      (a) => a.completion_status === "CREDITED" && !a.is_duplicate_topic && (a.status === "present" || a.status === "late")
    );

    res.json({
      patient: {
        id: patient.id,
        fullName: `${patient.first_name} ${patient.last_name}`,
        patientCode: patient.patient_code,
        admissionDate: patient.admission_date,
      },
      components: unifiedProgress.components,
      supplementary: unifiedProgress.supplementary,
      missingRequirements: unifiedProgress.missingRequirements,
      tallies: {
        cbtCount: unifiedProgress.components.cbt.completed,
        cbteCount: unifiedProgress.components.cbte.completed,
        peCount: unifiedProgress.components.pe.completed,
        shgmCount: unifiedProgress.supplementary.shgm,
        indivCount: unifiedProgress.supplementary.indCounseling,
        familyCount: unifiedProgress.supplementary.conjointFamily,
        coreCompleted: unifiedProgress.components.totalCore.completed,
        attendedCount: unifiedProgress.tallies.totalPhysicalAttended,
        pendingReviewCount: unifiedProgress.tallies.pendingReviewCount,
        repeatCount: unifiedProgress.tallies.repeatCount,
        makeupCreditedCount: unifiedProgress.tallies.makeupCreditedCount,
        missedCount: unifiedProgress.tallies.absentCount,
        excusedCount: unifiedProgress.tallies.excusedCount,
        cancelledCount: unifiedProgress.tallies.cancelledCount,
        totalRequired: 43,
        isPdcReady: unifiedProgress.isPdcReady,
        completionPercentage: unifiedProgress.components.totalCore.percentage,
      },
      completedSessions: creditedRows,
      allAttendance: attendances,
    });
  } catch (err) {
    console.error("Error fetching patient Annex 1 progress:", err);
    res.status(500).json({ message: "Could not fetch attendance progress." });
  }
}