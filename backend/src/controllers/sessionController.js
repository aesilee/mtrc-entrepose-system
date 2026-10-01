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
  const { sessionType, topicId, topicName, facilitatorName, caseManagerId, sessionDate, sessionTime } = req.body;

  if (!sessionType || !VALID_SESSION_TYPES.has(sessionType)) {
    return res.status(400).json({ message: "Select a valid session type from the 5 therapeutic modalities." });
  }
  if (!sessionDate) {
    return res.status(400).json({ message: "Session date is required." });
  }

  const defaultName = SESSION_TYPE_LABELS[sessionType];
  const finalSessionName = topicName ? `${defaultName}: ${topicName}` : defaultName;

  try {
    const [sessCols] = await pool.query("SHOW COLUMNS FROM sessions LIKE 'topic_id'");
    const hasTopicCols = sessCols.length > 0;

    let result;
    if (hasTopicCols) {
      [result] = await pool.query(
        `INSERT INTO sessions (session_name, session_type, topic_id, topic_name, facilitator_name, case_manager_id, session_date, session_time, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [finalSessionName, sessionType, topicId || null, topicName || null, facilitatorName || null, caseManagerId || null, sessionDate, sessionTime || null, req.user.id]
      );
    } else {
      [result] = await pool.query(
        `INSERT INTO sessions (session_name, session_type, case_manager_id, session_date, session_time, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [finalSessionName, sessionType, caseManagerId || null, sessionDate, sessionTime || null, req.user.id]
      );
    }

    res.status(201).json({ id: result.insertId, sessionName: finalSessionName });
  } catch (err) {
    console.error("Error creating session:", err);
    res.status(500).json({ message: "Could not create the session." });
  }
}

export async function getPatientAnnex1Progress(req, res) {
  const { patientId } = req.params;

  try {
    const [[patient]] = await pool.query(
      `SELECT id, first_name, last_name, patient_code, admission_date FROM patients WHERE id = ?`,
      [patientId]
    );

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Query attendance records for this patient where status = 'present'
    const [attendances] = await pool.query(
      `SELECT a.id, a.session_date, a.session_type, a.status, a.notes,
              COALESCE(a.topic_id, s.topic_id) as topic_id,
              COALESCE(a.topic_name, s.topic_name) as topic_name,
              COALESCE(a.facilitator_name, s.facilitator_name, u.full_name) as facilitator_name
       FROM attendance a
       LEFT JOIN sessions s ON a.session_id = s.id
       LEFT JOIN users u ON a.recorded_by = u.id
       WHERE a.patient_id = ? AND a.status = 'present'
       ORDER BY a.session_date ASC`,
      [patientId]
    );

    // Calculate core attendance tallies
    const cbtCount = attendances.filter(a => a.session_type === "CBT_GROUP").length;
    const peCount = attendances.filter(a => a.session_type === "PSYCHO_EDUCATION").length;
    const shgmCount = attendances.filter(a => a.session_type === "SHGM").length;
    const indivCount = attendances.filter(a => a.session_type === "INDIVIDUAL_COUNSELING").length;
    const familyCount = attendances.filter(a => a.session_type === "CONJOINT_FAMILY").length;

    // Core session requirement is 43 core sessions total (target: 28 CBT, 12 PE, 3 CBT-E)
    const coreCompleted = cbtCount + peCount; // combined core modules
    const isPdcReady = coreCompleted >= 43;

    res.json({
      patient: {
        id: patient.id,
        fullName: `${patient.first_name} ${patient.last_name}`,
        patientCode: patient.patient_code,
        admissionDate: patient.admission_date
      },
      tallies: {
        cbtCount,
        peCount,
        shgmCount,
        indivCount,
        familyCount,
        coreCompleted,
        totalRequired: 43,
        isPdcReady,
        completionPercentage: Math.min(100, Math.round((coreCompleted / 43) * 100))
      },
      completedSessions: attendances
    });
  } catch (err) {
    console.error("Error fetching patient Annex 1 progress:", err);
    res.status(500).json({ message: "Could not fetch attendance progress." });
  }
}