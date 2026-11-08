import pool from "../config/db.js";
import { notifyIctAdmins, notifyUser } from "../utils/notify.js";

export async function recordAttendanceBulk(req, res) {
  const { sessionId, records } = req.body;

  if (!sessionId || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ message: "A session and at least one patient record are required." });
  }

  const connection = await pool.getConnection();
  try {
    const [sessCols] = await connection.query("SHOW COLUMNS FROM sessions LIKE 'topic_id'");
    const hasSessTopic = sessCols.length > 0;

    let sessSql = "SELECT session_name, session_type, session_date";
    if (hasSessTopic) {
      sessSql += ", topic_id, topic_name, facilitator_name";
    }
    sessSql += " FROM sessions WHERE id = ?";

    const [[session]] = await connection.query(sessSql, [sessionId]);
    if (!session) {
      connection.release();
      return res.status(404).json({ message: "Session not found." });
    }

    const SINGLE_PATIENT_TYPES = ["INDIVIDUAL_COUNSELING", "CONJOINT_FAMILY"];
    if (SINGLE_PATIENT_TYPES.includes(session.session_type) && records.length > 1) {
      connection.release();
      return res.status(400).json({ message: "Individual counseling and conjoint/family sessions can only be recorded for 1 client at a time." });
    }

    const [allAttCols] = await connection.query("SHOW COLUMNS FROM attendance");
    const attColNames = allAttCols.map((c) => c.Field);
    const hasAttTopic = attColNames.includes("topic_id");
    const hasRelapseRisk = attColNames.includes("relapse_risk");
    const hasDrugTestResult = attColNames.includes("drug_test_result");
    const hasFamilyAttended = attColNames.includes("family_attended");
    const hasChairperson = attColNames.includes("is_chairperson");

    // Guard: Enforce SHGM Chairperson 5-session term limit (Vol. 1 Sec 5.5.3)
    if (session.session_type === "SHGM" && hasChairperson) {
      for (const r of records) {
        if (r.isChairperson && r.status === "present") {
          const [[{ chairCount }]] = await connection.query(
            "SELECT COUNT(*) as chairCount FROM attendance WHERE patient_id = ? AND session_type = 'SHGM' AND is_chairperson = 1 AND status = 'present'",
            [r.patientId]
          );
          if (chairCount >= 5) {
            connection.release();
            return res.status(400).json({
              message: `The designated chairperson has already chaired ${chairCount} SHGM sessions, reaching the maximum 5-session clinical term limit (ENTREPOSE Vol. 1 Sec 5.5.3).`
            });
          }
        }
      }
    }

    await connection.beginTransaction();
    for (const r of records) {
      const isAttended = r.status === "present" || r.status === "late";
      const dtResult = isAttended ? (r.drugTestResult || "NEGATIVE") : null;

      const cols = ["patient_id", "session_id", "session_date", "session_type", "status", "notes", "recorded_by"];
      const vals = [
        r.patientId,
        sessionId,
        session.session_date,
        session.session_type || session.session_name,
        r.status,
        r.remarks || null,
        req.user.id
      ];

      if (hasAttTopic) {
        cols.push("topic_id", "topic_name", "facilitator_name");
        vals.push(session.topic_id || null, session.topic_name || null, session.facilitator_name || null);
      }
      if (hasRelapseRisk) {
        cols.push("relapse_risk");
        vals.push(r.relapseRisk || "SAFE");
      }
      if (hasDrugTestResult) {
        cols.push("drug_test_result");
        vals.push(dtResult);
      }
      if (hasFamilyAttended) {
        cols.push("family_attended", "family_member_name");
        vals.push(r.familyAttended ? 1 : 0, r.familyMemberName || null);
      }
      if (hasChairperson) {
        cols.push("is_chairperson");
        vals.push(r.isChairperson ? 1 : 0);
      }

      const placeholders = cols.map(() => "?").join(", ");
      await connection.query(
        `INSERT INTO attendance (${cols.join(", ")}) VALUES (${placeholders})`,
        vals
      );

      // Post-Session Urine Drug Screening (RDT) Protocol:
      // Every present patient undergoes drug testing immediately after the session.
      if (isAttended) {
        const substanceTested = r.substanceTested || (dtResult === "POSITIVE" ? "Multi-3: METH / THC / ECS" : "Multi-3 Rapid Drug Screen (THC, METH, ECS)");
        const actionTaken = dtResult === "POSITIVE"
          ? `Positive Multi-3 RDT (${substanceTested}): Flagged for Case Manager review & immediate clinical counseling`
          : "Negative: Client cleared under post-session Multi-3 protocol";
        const dtRemarks = r.drugTestRemarks || `Post-session Multi-3 RDT for ${session.session_type || session.session_name}${session.topic_name ? `: ${session.topic_name}` : ""}`;

        await connection.query(
          `INSERT INTO drug_test_logs (patient_id, test_date, test_type, substance_tested, result, action_taken, remarks, recorded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.patientId,
            session.session_date,
            "Post-Session Screening",
            substanceTested,
            dtResult,
            actionTaken,
            dtRemarks,
            req.user.id
          ]
        );
      }
    }
    await connection.commit();

    await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
      req.user.username,
      `Recorded attendance for ${records.length} patient(s) — session "${session.session_name}"`,
    ]);

    const presentCount = records.filter((r) => r.status === "present").length;
    const absentCount = records.filter((r) => r.status === "absent").length;
    const lateCount = records.filter((r) => r.status === "late").length;
    const excusedCount = records.filter((r) => r.status === "excused").length;
    const positiveCount = records.filter((r) => (r.status === "present" || r.status === "late") && r.drugTestResult === "POSITIVE").length;
    const negativeCount = (presentCount + lateCount) - positiveCount;

    await notifyIctAdmins(
      "reports", "attendance_summary",
      `Attendance recorded for "${session.session_name}" (${session.session_date}): ${presentCount} present, ${absentCount} absent, ${lateCount} late, ${excusedCount} excused — Drug tests: ${negativeCount} Negative, ${positiveCount} Positive — by ${req.user.username}`
    );

    // Batched notifications for absent patients' assigned case managers
    const absentRecords = records.filter((r) => r.status === "absent");
    if (absentRecords.length > 0) {
      const absentPatientIds = absentRecords.map((r) => r.patientId);
      const [absentPatients] = await pool.query(
        `SELECT id, full_name, assigned_case_manager_id FROM patients WHERE id IN (?) AND is_archived = FALSE`,
        [absentPatientIds]
      );
      for (const p of absentPatients) {
        if (p.assigned_case_manager_id && Number(p.assigned_case_manager_id) !== Number(req.user.id)) {
          await notifyUser(
            p.assigned_case_manager_id,
            "patients",
            "session_missed",
            `Patient "${p.full_name}" missed today's session "${session.session_name}"`
          );
        }

        // Phase 1.3 Flag: Check if client has 2 consecutive absences
        if (p.assigned_case_manager_id) {
          const [recentAtt] = await pool.query(
            "SELECT status FROM attendance WHERE patient_id = ? ORDER BY session_date DESC, id DESC LIMIT 2",
            [p.id]
          );
          if (recentAtt.length === 2 && recentAtt[0].status === "absent" && recentAtt[1].status === "absent") {
            await notifyUser(
              p.assigned_case_manager_id,
              "patients",
              "consecutive_absences",
              `Clinical Flag: "${p.full_name}" has accumulated 2 consecutive absences and requires clinical follow-up.`
            );
          }
        }
      }
    }

    // Phase 1.3 Flag: Check if any attended patient reached 43 core sessions (PDC Readiness)
    const presentRecords = records.filter((r) => r.status === "present");
    if (presentRecords.length > 0) {
      const presentPatientIds = presentRecords.map((r) => r.patientId);
      const [presentPatients] = await pool.query(
        `SELECT id, full_name, assigned_case_manager_id FROM patients WHERE id IN (?) AND is_archived = FALSE`,
        [presentPatientIds]
      );
      for (const p of presentPatients) {
        if (p.assigned_case_manager_id) {
          const [[{ coreCount }]] = await pool.query(
            `SELECT COUNT(*) as coreCount FROM attendance 
             WHERE patient_id = ? AND status = 'present' AND session_type IN ('CBT_GROUP', 'PSYCHO_EDUCATION')`,
            [p.id]
          );
          if (coreCount === 43) {
            await notifyUser(
              p.assigned_case_manager_id,
              "patients",
              "milestone_readiness",
              `Milestone Alert: "${p.full_name}" has completed 43 core sessions and is ready for Pre-Discharge Conference (PDC).`
            );
          }
        }
      }
    }

    // Relapse Risk Clinical Alert (ENTREPOSE Vol. 3A & Vol. 1 Sec 11.1)
    const atRiskRecords = records.filter((r) => r.relapseRisk === "AT_RISK" || r.relapseRisk === "USED");
    for (const r of atRiskRecords) {
      const [[patient]] = await pool.query(
        "SELECT id, full_name, assigned_case_manager_id FROM patients WHERE id = ?",
        [r.patientId]
      );
      if (patient?.assigned_case_manager_id) {
        const severityLabel = r.relapseRisk === "USED" ? "URGENT LAPSE/SLIP" : "AT RISK";
        await notifyUser(
          patient.assigned_case_manager_id,
          "patients",
          "relapse_risk_alert",
          `Relapse Risk Alert [${severityLabel}]: "${patient.full_name}" was rated "${r.relapseRisk}" in Schedule Book review for session "${session.session_name}". Immediate clinical follow-up required.`
        );
        try {
          const followUpReason = `Schedule Book Relapse Risk: ${r.relapseRisk} (${session.session_name || "Curriculum Session"})`;
          await pool.query(
            "INSERT INTO follow_ups (patient_id, assigned_to, reason, due_date, status) VALUES (?, ?, ?, CURDATE(), 'pending')",
            [r.patientId, patient.assigned_case_manager_id, followUpReason]
          );
        } catch (fErr) {
          console.warn("Could not auto-schedule follow-up:", fErr.message);
        }
      }
    }

    // Phase 1.3 Flag: Positive Drug Screening Clinical Alert (ENTREPOSE Protocol)
    const positiveDtRecords = records.filter(
      (r) => (r.status === "present" || r.status === "late") && r.drugTestResult === "POSITIVE"
    );
    for (const r of positiveDtRecords) {
      const [[patient]] = await pool.query(
        "SELECT id, full_name, assigned_case_manager_id FROM patients WHERE id = ?",
        [r.patientId]
      );
      if (patient?.assigned_case_manager_id) {
        const detectedSubstances = r.substanceTested || "Multi-3 Panel";
        await notifyUser(
          patient.assigned_case_manager_id,
          "patients",
          "drug_test_positive",
          `🚨 Multi-3 Drug Test Alert: "${patient.full_name}" tested POSITIVE for [${detectedSubstances}] following session "${session.session_name}" (${session.session_date}). Immediate clinical counseling & relapse intervention required.`
        );
        try {
          const dtFollowUpReason = `Multi-3 Positive Drug Test (${detectedSubstances}): ${session.session_name || "Clinical Session"} (${session.session_date})`;
          await pool.query(
            "INSERT INTO follow_ups (patient_id, assigned_to, reason, due_date, status) VALUES (?, ?, ?, CURDATE(), 'pending')",
            [r.patientId, patient.assigned_case_manager_id, dtFollowUpReason]
          );
        } catch (dtfErr) {
          console.warn("Could not auto-schedule positive drug test follow-up:", dtfErr.message);
        }
      }
    }

    res.status(201).json({ message: "Attendance recorded." });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Could not record attendance." });
  } finally {
    connection.release();
  }
}

export async function listAttendance(req, res) {
  const { dateFilter, dateFrom, dateTo, programId, caseManagerId, status, search } = req.query;
  const today = new Date().toISOString().slice(0, 10);

  const where = [];
  const params = [];

  if (req.user.role === "case_manager") {
    where.push("p.assigned_case_manager_id = ?");
    params.push(req.user.id);
  }

  if (dateFilter === "today") {
    where.push("a.session_date = ?");
    params.push(today);
  } else if (dateFilter === "yesterday") {
    where.push("a.session_date = DATE_SUB(?, INTERVAL 1 DAY)");
    params.push(today);
  } else if (dateFilter === "week") {
    where.push("a.session_date >= DATE_SUB(?, INTERVAL 7 DAY)");
    params.push(today);
  } else if (dateFilter === "custom" && dateFrom && dateTo) {
    where.push("a.session_date BETWEEN ? AND ?");
    params.push(dateFrom, dateTo);
  }

  if (programId) { where.push("s.program_id = ?"); params.push(programId); }
  if (caseManagerId) { where.push("s.case_manager_id = ?"); params.push(caseManagerId); }
  if (status) { where.push("a.status = ?"); params.push(status); }
  if (search) {
    where.push("(p.full_name LIKE ? OR p.patient_code LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [allCols] = await pool.query("SHOW COLUMNS FROM attendance");
  const colNames = allCols.map((c) => c.Field);
  const extraCols = [];
  if (colNames.includes("relapse_risk")) extraCols.push("a.relapse_risk");
  if (colNames.includes("family_attended")) extraCols.push("a.family_attended");
  if (colNames.includes("family_member_name")) extraCols.push("a.family_member_name");
  if (colNames.includes("is_chairperson")) extraCols.push("a.is_chairperson");
  if (colNames.includes("drug_test_result")) extraCols.push("a.drug_test_result");
  const extraSql = extraCols.length ? ", " + extraCols.join(", ") : "";

  const [rows] = await pool.query(
    `SELECT a.id, a.status, a.notes, a.session_date,
            p.id AS patient_id, p.patient_code, p.full_name,
            s.session_name, s.session_time,
            pr.name AS program_name,
            u.full_name AS case_manager_name,
            dt.substance_tested
            ${extraSql}
     FROM attendance a
     JOIN patients p ON p.id = a.patient_id
     LEFT JOIN sessions s ON s.id = a.session_id
     LEFT JOIN programs pr ON pr.id = s.program_id
     LEFT JOIN users u ON u.id = s.case_manager_id
     LEFT JOIN (
       SELECT patient_id, test_date, MAX(substance_tested) as substance_tested
       FROM drug_test_logs
       WHERE test_type = 'Post-Session Screening'
       GROUP BY patient_id, test_date
     ) dt ON dt.patient_id = a.patient_id AND dt.test_date = a.session_date
     ${whereSql}
     ORDER BY a.session_date DESC, a.id DESC`,
    params
  );
  res.json({ attendance: rows });
}

export async function getAttendanceStats(req, res) {
  const today = new Date().toISOString().slice(0, 10);
  const scopeClause = req.user.role === "case_manager"
    ? "JOIN patients p ON p.id = a.patient_id AND p.assigned_case_manager_id = ?"
    : "";
  const scopeParams = req.user.role === "case_manager" ? [req.user.id] : [];

  const [[{ todaySessions }]] = await pool.query(
    `SELECT COUNT(DISTINCT a.session_id) AS todaySessions
     FROM attendance a ${scopeClause}
     WHERE a.session_date = ?`,
    [...scopeParams, today]
  );
  const [[{ total, present }]] = await pool.query(
    `SELECT COUNT(*) AS total, SUM(a.status = 'present') AS present
     FROM attendance a ${scopeClause}
     WHERE a.session_date = ?`,
    [...scopeParams, today]
  );
  const [[{ absentToday }]] = await pool.query(
    `SELECT SUM(a.status = 'absent') AS absentToday
     FROM attendance a ${scopeClause}
     WHERE a.session_date = ?`,
    [...scopeParams, today]
  );

  res.json({
    todaySessions: todaySessions || 0,
    todayRate: total ? Math.round((present / total) * 100) : null,
    presentToday: present || 0,
    absentToday: absentToday || 0,
  });
}