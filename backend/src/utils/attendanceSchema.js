import pool from "../config/db.js";

let schemaEnsured = false;


export async function ensureAttendanceCompletionSchema(customConn = null) {
  if (schemaEnsured) return true;
  const db = customConn || pool;
  try {
    // 1. Ensure sessions table columns
    const [sessCols] = await db.query("SHOW COLUMNS FROM sessions");
    const sessColMap = new Map(sessCols.map((c) => [c.Field, c]));

    if (!sessColMap.has("topic_id")) {
      await db.query("ALTER TABLE sessions ADD COLUMN topic_id INT NULL").catch(() => {});
    }
    if (!sessColMap.has("topic_name")) {
      await db.query("ALTER TABLE sessions ADD COLUMN topic_name VARCHAR(255) NULL").catch(() => {});
    }
    if (!sessColMap.has("facilitator_name")) {
      await db.query("ALTER TABLE sessions ADD COLUMN facilitator_name VARCHAR(150) NULL").catch(() => {});
    }
    if (!sessColMap.has("session_status")) {
      await db.query("ALTER TABLE sessions ADD COLUMN session_status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED'").catch(() => {});
    }
    if (!sessColMap.has("curriculum_requirement")) {
      await db.query("ALTER TABLE sessions ADD COLUMN curriculum_requirement VARCHAR(180) NULL").catch(() => {});
    }
    if (!sessColMap.has("cancellation_reason")) {
      await db.query("ALTER TABLE sessions ADD COLUMN cancellation_reason VARCHAR(255) NULL").catch(() => {});
    }
    if (!sessColMap.has("authorized_by")) {
      await db.query("ALTER TABLE sessions ADD COLUMN authorized_by INT NULL").catch(() => {});
    }
    if (!sessColMap.has("authorized_by_name")) {
      await db.query("ALTER TABLE sessions ADD COLUMN authorized_by_name VARCHAR(150) NULL").catch(() => {});
    }
    if (!sessColMap.has("rescheduled_to_session_id")) {
      await db.query("ALTER TABLE sessions ADD COLUMN rescheduled_to_session_id INT NULL").catch(() => {});
    }
    if (!sessColMap.has("rescheduled_date")) {
      await db.query("ALTER TABLE sessions ADD COLUMN rescheduled_date DATE NULL").catch(() => {});
    }
    if (!sessColMap.has("rescheduled_reason")) {
      await db.query("ALTER TABLE sessions ADD COLUMN rescheduled_reason VARCHAR(255) NULL").catch(() => {});
    }
    if (!sessColMap.has("original_session_id")) {
      await db.query("ALTER TABLE sessions ADD COLUMN original_session_id INT NULL").catch(() => {});
    }
    if (!sessColMap.has("original_session_date")) {
      await db.query("ALTER TABLE sessions ADD COLUMN original_session_date DATE NULL").catch(() => {});
    }

    // 2. Ensure session_roster table exists to track who was expected to attend
    await db.query(`
      CREATE TABLE IF NOT EXISTS session_roster (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        patient_id INT NOT NULL,
        assigned_by INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_session_patient (session_id, patient_id),
        KEY idx_session_id (session_id),
        KEY idx_patient_id (patient_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).catch(() => {});

    // Backfill session_roster from existing attendance records so historical sessions have expected rosters
    await db.query(`
      INSERT IGNORE INTO session_roster (session_id, patient_id, created_at)
      SELECT DISTINCT session_id, patient_id, MIN(created_at)
      FROM attendance
      WHERE session_id IS NOT NULL AND patient_id IS NOT NULL
      GROUP BY session_id, patient_id
    `).catch(() => {});

    // 3. Ensure attendance table columns
    const [attCols] = await db.query("SHOW COLUMNS FROM attendance");
    const attColMap = new Map(attCols.map((c) => [c.Field, c]));

    // Ensure status supports 'present', 'late', 'absent', 'excused', 'cancelled'
    const statusCol = attColMap.get("status");
    if (statusCol && String(statusCol.Type).toLowerCase().startsWith("enum") && !String(statusCol.Type).toLowerCase().includes("cancelled")) {
      await db.query("ALTER TABLE attendance MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'present'").catch(() => {});
    }

    // Ensure drug_test_result supports 'PENDING', 'INVALID', 'NOT_PERFORMED', 'NEGATIVE', 'POSITIVE'
    const drugTestCol = attColMap.get("drug_test_result");
    if (drugTestCol && String(drugTestCol.Type).toLowerCase().startsWith("enum")) {
      await db.query("ALTER TABLE attendance MODIFY COLUMN drug_test_result VARCHAR(40) NULL").catch(() => {});
    }

    if (!attColMap.has("topic_id")) {
      await db.query("ALTER TABLE attendance ADD COLUMN topic_id INT NULL").catch(() => {});
    }
    if (!attColMap.has("topic_name")) {
      await db.query("ALTER TABLE attendance ADD COLUMN topic_name VARCHAR(255) NULL").catch(() => {});
    }
    if (!attColMap.has("facilitator_name")) {
      await db.query("ALTER TABLE attendance ADD COLUMN facilitator_name VARCHAR(150) NULL").catch(() => {});
    }

    const addedCompletionStatus = !attColMap.has("completion_status");
    if (addedCompletionStatus) {
      await db.query("ALTER TABLE attendance ADD COLUMN completion_status VARCHAR(30) NOT NULL DEFAULT 'CREDITED'").catch(() => {});
    }
    if (!attColMap.has("curriculum_requirement")) {
      await db.query("ALTER TABLE attendance ADD COLUMN curriculum_requirement VARCHAR(180) NULL").catch(() => {});
    }
    if (!attColMap.has("arrival_time")) {
      await db.query("ALTER TABLE attendance ADD COLUMN arrival_time VARCHAR(20) NULL").catch(() => {});
    }
    if (!attColMap.has("decision_reason")) {
      await db.query("ALTER TABLE attendance ADD COLUMN decision_reason VARCHAR(255) NULL").catch(() => {});
    }
    if (!attColMap.has("authorized_by")) {
      await db.query("ALTER TABLE attendance ADD COLUMN authorized_by INT NULL").catch(() => {});
    }
    if (!attColMap.has("authorized_by_name")) {
      await db.query("ALTER TABLE attendance ADD COLUMN authorized_by_name VARCHAR(150) NULL").catch(() => {});
    }
    if (!attColMap.has("is_makeup")) {
      await db.query("ALTER TABLE attendance ADD COLUMN is_makeup TINYINT(1) NOT NULL DEFAULT 0").catch(() => {});
    }
    if (!attColMap.has("makeup_for_attendance_id")) {
      await db.query("ALTER TABLE attendance ADD COLUMN makeup_for_attendance_id INT NULL").catch(() => {});
    }
    if (!attColMap.has("is_duplicate_topic")) {
      await db.query("ALTER TABLE attendance ADD COLUMN is_duplicate_topic TINYINT(1) NOT NULL DEFAULT 0").catch(() => {});
    }
    if (!attColMap.has("is_carryover")) {
      await db.query("ALTER TABLE attendance ADD COLUMN is_carryover TINYINT(1) NOT NULL DEFAULT 0").catch(() => {});
    }
    if (!attColMap.has("reviewed_at")) {
      await db.query("ALTER TABLE attendance ADD COLUMN reviewed_at DATETIME NULL").catch(() => {});
    }

    // Ensure patient_cbte_evaluations has is_carryover column for explicit carryover
    await db.query(`
      ALTER TABLE patient_cbte_evaluations ADD COLUMN is_carryover TINYINT(1) NOT NULL DEFAULT 0
    `).catch(() => {});

    // 3. Ensure consistent data normalization for non-credited statuses
    await db.query(
      `UPDATE attendance
       SET completion_status = 'NOT_CREDITED'
       WHERE status IN ('absent', 'excused', 'cancelled')
         AND completion_status != 'NOT_CREDITED'`
    ).catch(() => {});

    if (addedCompletionStatus) {
      await db.query(
        `UPDATE attendance
         SET completion_status = 'PENDING_REVIEW'
         WHERE status = 'late' AND decision_reason IS NULL`
      ).catch(() => {});
    }

    // Backfill curriculum_requirement where missing
    await db.query(
      `UPDATE attendance a
       LEFT JOIN sessions s ON s.id = a.session_id
       SET a.curriculum_requirement = COALESCE(a.topic_name, s.topic_name, s.session_name, a.session_type)
       WHERE a.curriculum_requirement IS NULL`
    ).catch(() => {});

    schemaEnsured = true;
    return true;
  } catch (err) {
    console.warn("ensureAttendanceCompletionSchema warning:", err.message);
    return false;
  }
}

export async function checkDuplicateCurriculumCredit(
  db,
  { patientId, topicId, topicName, curriculumRequirement, excludeAttendanceId = null }
) {
  if (!patientId) return { isDuplicate: false, existingRecord: null };

  const numericTopicId = topicId ? Number(topicId) : null;
  const cleanReq = curriculumRequirement ? String(curriculumRequirement).trim() : "";
  const cleanTopic = topicName ? String(topicName).trim() : "";

  // Only enforce duplicate-topic guard when a specific curriculum topic/requirement is identified
  // (generic sessions like "General session" or open Individual Counseling without a specific topic ID are repeatable)
  const genericNames = new Set([
    "",
    "CBT_GROUP",
    "PSYCHO_EDUCATION",
    "SHGM",
    "INDIVIDUAL_COUNSELING",
    "CONJOINT_FAMILY",
    "CBT Group Session",
    "Psycho-Education / PE Meeting",
    "Self-Help Group Meeting",
    "Individual Counseling",
    "Conjoint / Family Session",
    "General session (no specific topic)",
  ]);

  const hasSpecificTopic = Boolean(numericTopicId) ||
    (cleanReq && !genericNames.has(cleanReq)) ||
    (cleanTopic && !genericNames.has(cleanTopic));

  if (!hasSpecificTopic) {
    return { isDuplicate: false, existingRecord: null };
  }

  const matchClauses = [];
  const params = [patientId];

  if (numericTopicId) {
    matchClauses.push("COALESCE(a.topic_id, s.topic_id) = ?");
    params.push(numericTopicId);
  }
  if (cleanReq && !genericNames.has(cleanReq)) {
    matchClauses.push("a.curriculum_requirement = ?");
    params.push(cleanReq);
  }
  if (cleanTopic && !genericNames.has(cleanTopic)) {
    matchClauses.push("COALESCE(a.topic_name, s.topic_name) = ?");
    params.push(cleanTopic);
  }

  if (matchClauses.length === 0) {
    return { isDuplicate: false, existingRecord: null };
  }

  let sql = `
    SELECT a.id, a.session_date, a.session_type, a.status, a.completion_status,
           COALESCE(a.curriculum_requirement, a.topic_name, s.topic_name, s.session_name) AS requirement_label
    FROM attendance a
    LEFT JOIN sessions s ON s.id = a.session_id
    WHERE a.patient_id = ?
      AND a.completion_status = 'CREDITED'
      AND a.status IN ('present', 'late')
      AND (${matchClauses.join(" OR ")})
  `;

  if (excludeAttendanceId) {
    sql += " AND a.id != ?";
    params.push(excludeAttendanceId);
  }

  sql += " ORDER BY a.session_date ASC, a.id ASC LIMIT 1";

  const [rows] = await db.query(sql, params);
  if (rows.length > 0) {
    return { isDuplicate: true, existingRecord: rows[0] };
  }
  return { isDuplicate: false, existingRecord: null };
}
