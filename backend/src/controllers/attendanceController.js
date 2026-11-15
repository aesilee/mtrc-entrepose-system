import pool from "../config/db.js";
import { notifyIctAdmins, notifyUser } from "../utils/notify.js";
import {
  ensureAttendanceCompletionSchema,
  checkDuplicateCurriculumCredit,
  DEFAULT_ATTENDANCE_POLICY,
} from "../utils/attendanceSchema.js";
import { getUnifiedPatientProgress } from "../utils/curriculumProgress.js";
import {
  ensureDrugTestSchema,
  buildMulti3SubstanceSummary,
  VALID_DRUG_TEST_RESULTS,
} from "../utils/drugTestHelper.js";
import {
  ensureCbteAndRiskSchema,
  normalizeSelfReportedRisk,
  normalizeStaffRiskAssessment,
} from "../utils/cbteAndRiskSchema.js";

export async function recordAttendanceBulk(req, res) {
  const { sessionId, records, sessionCancelled, cancellationReason, authorizedByName } = req.body;

  if (!sessionId) {
    return res.status(400).json({ message: "A session ID is required." });
  }
  if (!sessionCancelled && (!Array.isArray(records) || records.length === 0)) {
    return res.status(400).json({ message: "At least one patient record is required unless the session was cancelled by the center." });
  }

  const connection = await pool.getConnection();
  try {
    await ensureAttendanceCompletionSchema(connection);
    await ensureDrugTestSchema(connection);
    await ensureCbteAndRiskSchema(connection);

    const [[session]] = await connection.query(
      `SELECT id, session_name, session_type, session_date, session_time,
              topic_id, topic_name, facilitator_name,
              session_status, curriculum_requirement, cancellation_reason, authorized_by_name
       FROM sessions WHERE id = ?`,
      [sessionId]
    );
    if (!session) {
      connection.release();
      return res.status(404).json({ message: "Session not found." });
    }

    const isCenterCancelled = Boolean(sessionCancelled || session.session_status === "CANCELLED");
    const safeRecords = Array.isArray(records) ? records : [];

    const SINGLE_PATIENT_TYPES = ["INDIVIDUAL_COUNSELING", "CONJOINT_FAMILY"];
    if (!isCenterCancelled && SINGLE_PATIENT_TYPES.includes(session.session_type) && safeRecords.length > 1) {
      connection.release();
      return res.status(400).json({ message: "Individual counseling and conjoint/family sessions can only be recorded for 1 client at a time." });
    }

    // Guard: Enforce SHGM Chairperson 5-session term limit (Vol. 1 Sec 5.5.3)
    if (!isCenterCancelled && session.session_type === "SHGM") {
      for (const r of safeRecords) {
        if (r.isChairperson && (r.status === "present" || r.status === "late")) {
          const [[{ chairCount }]] = await connection.query(
            "SELECT COUNT(*) as chairCount FROM attendance WHERE patient_id = ? AND session_type = 'SHGM' AND is_chairperson = 1 AND status IN ('present', 'late')",
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

    const defaultAuthStaff = authorizedByName || session.authorized_by_name || req.user.full_name || req.user.username;

    await connection.beginTransaction();

    // Idempotency guard: prevent duplicate attendance and drug-test rows if form is resubmitted or re-recorded
    const patientIds = safeRecords.map((r) => r.patientId).filter(Boolean);
    if (patientIds.length > 0) {
      await connection.query(
        `DELETE FROM attendance WHERE session_id = ? AND patient_id IN (?)`,
        [sessionId, patientIds]
      );
      await connection.query(
        `DELETE FROM drug_test_logs WHERE session_id = ? AND patient_id IN (?)`,
        [sessionId, patientIds]
      );
    }

    if (isCenterCancelled) {
      const cancelNote = String(cancellationReason || session.cancellation_reason || "Session cancelled by center — patients are not marked absent").trim();
      await connection.query(
        `UPDATE sessions
         SET session_status = 'CANCELLED',
             cancellation_reason = ?,
             authorized_by = ?,
             authorized_by_name = ?
         WHERE id = ?`,
        [cancelNote, req.user.id, defaultAuthStaff, sessionId]
      );

      for (const r of safeRecords) {
        await connection.query(
          `INSERT IGNORE INTO session_roster (session_id, patient_id, assigned_by) VALUES (?, ?, ?)`,
          [sessionId, r.patientId, req.user.id]
        ).catch(() => {});

        const reqLabel = r.curriculumRequirement || session.curriculum_requirement || session.topic_name || session.session_name || session.session_type;
        await connection.query(
          `INSERT INTO attendance (
             patient_id, session_id, session_date, session_type,
             topic_id, topic_name, facilitator_name,
             status, completion_status, curriculum_requirement,
             decision_reason, authorized_by, authorized_by_name,
             notes, recorded_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, 'cancelled', 'NOT_CREDITED', ?, ?, ?, ?, ?, ?)`,
          [
            r.patientId,
            sessionId,
            session.session_date,
            session.session_type || session.session_name,
            session.topic_id || null,
            session.topic_name || null,
            session.facilitator_name || null,
            reqLabel,
            cancelNote,
            req.user.id,
            defaultAuthStaff,
            r.remarks || cancelNote,
            req.user.id,
          ]
        );
      }

      await connection.commit();

      await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
        req.user.username,
        `Recorded center-cancelled session "${session.session_name}" (${session.session_date}) — ${safeRecords.length} patient(s) marked Session Cancelled (not absent)`,
      ]);

      return res.status(201).json({
        message: "Center-cancelled session recorded. Patients were not marked absent.",
        cancelled: true,
      });
    }

    let duplicateWarnings = [];

    for (const r of safeRecords) {
      const rawStatus = r.status;
      if (!["present", "late", "absent", "excused", "cancelled"].includes(rawStatus)) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          message: "Select a valid attendance status (Present, Late, Absent, or Excused) for each patient.",
        });
      }
      const isAttended = rawStatus === "present" || rawStatus === "late";
      const rawDtResult = isAttended ? String(r.drugTestResult || "").trim().toUpperCase() : null;
      const dtResult =
        isAttended && VALID_DRUG_TEST_RESULTS.has(rawDtResult)
          ? rawDtResult
          : isAttended
          ? null
          : null;

      if (isAttended && !dtResult) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          message: "Select an explicit Multi-3 drug test result (Negative, Positive, Pending, Invalid, or Not Performed) for each attended patient.",
        });
      }

      const multi3Summary = isAttended
        ? buildMulti3SubstanceSummary(dtResult, r.positiveSubstances || r.positiveDrugs || r.substanceTested)
        : null;

      if (isAttended && dtResult === "POSITIVE" && (!multi3Summary || multi3Summary.codes.length === 0)) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          message: "At least one positive substance (THC, METH, or ECS) must be selected for a POSITIVE Multi-3 drug test.",
        });
      }

      let isMakeup = Boolean(r.isMakeup);
      let makeupForId = isMakeup && r.makeupForAttendanceId ? Number(r.makeupForAttendanceId) : null;

      let effectiveTopicId = session.topic_id || null;
      let effectiveTopicName = session.topic_name || null;
      let effectiveRequirement =
        r.curriculumRequirement ||
        session.curriculum_requirement ||
        session.topic_name ||
        session.session_name ||
        session.session_type;

      let makeupAlreadyFulfilled = false;
      if (isMakeup && makeupForId) {
        const [[origRow]] = await connection.query(
          `SELECT a.id, a.patient_id, a.session_date, a.session_type, a.status,
                  COALESCE(a.topic_id, s.topic_id) AS topic_id,
                  COALESCE(a.topic_name, s.topic_name) AS topic_name,
                  COALESCE(a.curriculum_requirement, a.topic_name, s.topic_name, s.session_name, a.session_type) AS curriculum_requirement
           FROM attendance a
           LEFT JOIN sessions s ON s.id = a.session_id
           WHERE a.id = ? AND a.patient_id = ?`,
          [makeupForId, r.patientId]
        );

        if (origRow) {
          if (!effectiveTopicId && origRow.topic_id) effectiveTopicId = origRow.topic_id;
          if (!effectiveTopicName && origRow.topic_name) effectiveTopicName = origRow.topic_name;
          if ((!r.curriculumRequirement && !session.topic_id) && origRow.curriculum_requirement) {
            effectiveRequirement = origRow.curriculum_requirement;
          }

          // Check if this missed requirement already has a CREDITED makeup
          const [[existingMakeup]] = await connection.query(
            `SELECT id, session_date FROM attendance
             WHERE makeup_for_attendance_id = ? AND completion_status = 'CREDITED' LIMIT 1`,
            [makeupForId]
          );
          if (existingMakeup) {
            makeupAlreadyFulfilled = true;
          }
        } else {
          makeupForId = null;
        }
      }

      // Check duplicate curriculum credit for this patient & topic
      let isDuplicateTopic = 0;
      let duplicateRecord = null;
      if (isAttended) {
        const dupCheck = await checkDuplicateCurriculumCredit(connection, {
          patientId: r.patientId,
          topicId: effectiveTopicId,
          topicName: effectiveTopicName,
          curriculumRequirement: effectiveRequirement,
        });
        if (dupCheck.isDuplicate) {
          isDuplicateTopic = 1;
          duplicateRecord = dupCheck.existingRecord;
        }
      }

      // Resolve completion decision, reason, and authorized staff
      let finalCompletionStatus = "CREDITED";
      let finalDecisionReason = r.decisionReason ? String(r.decisionReason).trim() : null;
      let finalAuthStaff = r.authorizedByName ? String(r.authorizedByName).trim() : null;
      const arrivalTime = rawStatus === "late" ? (r.arrivalTime || null) : null;

      if (rawStatus === "absent") {
        finalCompletionStatus = "NOT_CREDITED";
      } else if (rawStatus === "excused") {
        finalCompletionStatus = "NOT_CREDITED";
        if (!finalDecisionReason) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            message: "A documented reason is required when excusing an absence.",
          });
        }
      } else if (rawStatus === "cancelled") {
        finalCompletionStatus = "NOT_CREDITED";
      } else if (isDuplicateTopic) {
        finalCompletionStatus = "NOT_CREDITED";
        const priorDate = duplicateRecord?.session_date
          ? String(duplicateRecord.session_date).slice(0, 10)
          : "a prior session";
        finalDecisionReason =
          finalDecisionReason ||
          `Repeated topic (already credited on ${priorDate}) — no duplicate curriculum credit`;
        duplicateWarnings.push(r.patientId);
      } else if (makeupAlreadyFulfilled) {
        finalCompletionStatus = "NOT_CREDITED";
        finalDecisionReason =
          finalDecisionReason ||
          "Original missed requirement was already credited via an earlier makeup session";
      } else if (rawStatus === "late") {
        finalCompletionStatus = ["CREDITED", "NOT_CREDITED", "PENDING_REVIEW"].includes(r.completionStatus)
          ? r.completionStatus
          : "PENDING_REVIEW";
        if (finalCompletionStatus === "CREDITED" && !finalDecisionReason) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            message: "A documented reason is required when crediting a late arrival.",
          });
        }
      } else {
        // rawStatus === "present"
        finalCompletionStatus = ["CREDITED", "NOT_CREDITED", "PENDING_REVIEW"].includes(r.completionStatus)
          ? r.completionStatus
          : "CREDITED";
      }

      const reviewedAt =
        finalCompletionStatus === "CREDITED" || finalCompletionStatus === "NOT_CREDITED"
          ? new Date()
          : null;

      const normalizedSelfRisk = normalizeSelfReportedRisk(r.relapseRisk);
      const normalizedStaffRisk = normalizeStaffRiskAssessment(r.staffRiskAssessment);
      r.relapseRisk = normalizedSelfRisk;
      r.staffRiskAssessment = normalizedStaffRisk;

      await connection.query(
        `INSERT INTO attendance (
           patient_id, session_id, session_date, session_type,
           topic_id, topic_name, facilitator_name,
           status, completion_status, curriculum_requirement,
           arrival_time, decision_reason, authorized_by, authorized_by_name,
           is_makeup, makeup_for_attendance_id, is_duplicate_topic, reviewed_at,
           relapse_risk, staff_risk_assessment, drug_test_result, family_attended, family_member_name,
           is_chairperson, notes, recorded_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r.patientId,
          sessionId,
          session.session_date,
          session.session_type || session.session_name,
          effectiveTopicId,
          effectiveTopicName,
          session.facilitator_name || null,
          rawStatus,
          finalCompletionStatus,
          effectiveRequirement,
          arrivalTime,
          finalDecisionReason,
          finalAuthStaff ? req.user.id : null,
          finalAuthStaff,
          isMakeup ? 1 : 0,
          makeupForId,
          isDuplicateTopic ? 1 : 0,
          reviewedAt,
          normalizedSelfRisk,
          normalizedStaffRisk,
          dtResult,
          r.familyAttended ? 1 : 0,
          r.familyMemberName || null,
          r.isChairperson ? 1 : 0,
          r.playerRemarks || r.patientRemarks || r.remarks || null,
          req.user.id,
        ]
      );

      // Post-Session Urine Drug Screening (RDT) Protocol:
      if (isAttended && dtResult) {
        const substanceTested = multi3Summary?.substanceTested || "Multi-3 Rapid Drug Screen (THC, METH, ECS)";
        const positiveSubstancesStr = multi3Summary?.positiveSubstancesStr || null;
        const relatedVisitLabel = `${session.session_type || session.session_name}${effectiveTopicName ? `: ${effectiveTopicName}` : ""}`;
        const testedByStaff =
          String(r.testedByName || r.authorizedByName || defaultAuthStaff || "").trim() ||
          req.user.full_name ||
          req.user.username;
        const testTimeVal = r.drugTestTime || session.session_time || null;

        const actionTaken =
          dtResult === "POSITIVE"
            ? `Positive Multi-3 RDT (${substanceTested}): Flagged for Case Manager review & immediate clinical counseling`
            : dtResult === "PENDING"
            ? "Pending confirmatory / clinical review"
            : dtResult === "INVALID"
            ? "Invalid specimen — repeat Multi-3 test required"
            : dtResult === "NOT_PERFORMED"
            ? "Test not performed during session visit"
            : "Negative: Client cleared under post-session Multi-3 protocol";

        const dtRemarks =
          r.drugTestRemarks ||
          `Post-session Multi-3 RDT for ${relatedVisitLabel}`;

        await connection.query(
          `INSERT INTO drug_test_logs (
             patient_id, test_date, test_time, test_type,
             substance_tested, positive_substances, result,
             session_id, related_visit, tested_by_name,
             action_taken, remarks, recorded_by
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.patientId,
            session.session_date,
            testTimeVal,
            "Post-Session Screening",
            substanceTested,
            positiveSubstancesStr,
            dtResult,
            sessionId,
            relatedVisitLabel,
            testedByStaff,
            actionTaken,
            dtRemarks,
            req.user.id,
          ]
        );
      }
    }

    // Ensure all recorded patients are tracked in session_roster
    for (const r of safeRecords) {
      await connection.query(
        `INSERT IGNORE INTO session_roster (session_id, patient_id, assigned_by) VALUES (?, ?, ?)`,
        [sessionId, r.patientId, req.user.id]
      ).catch(() => {});
    }

    // Evaluate total expected vs recorded for this session
    const [[rosterStats]] = await connection.query(
      `SELECT COUNT(DISTINCT sr.patient_id) AS expected_count,
              COUNT(DISTINCT a.patient_id) AS recorded_count
       FROM session_roster sr
       LEFT JOIN attendance a ON a.session_id = sr.session_id AND a.patient_id = sr.patient_id
       WHERE sr.session_id = ?`,
      [sessionId]
    );

    const sessionExpectedCount = Number(rosterStats?.expected_count || safeRecords.length);
    const sessionRecordedCount = Number(rosterStats?.recorded_count || safeRecords.length);
    const sessionUnresolvedCount = Math.max(0, sessionExpectedCount - sessionRecordedCount);

    if (sessionUnresolvedCount === 0 && session.session_status !== "CANCELLED" && session.session_status !== "RESCHEDULED") {
      await connection.query(
        `UPDATE sessions SET session_status = 'COMPLETED' WHERE id = ?`,
        [sessionId]
      );
    }

    await connection.commit();

    const presentCount = safeRecords.filter((r) => r.status === "present").length;
    const absentCount = safeRecords.filter((r) => r.status === "absent").length;
    const lateCount = safeRecords.filter((r) => r.status === "late").length;
    const excusedCount = safeRecords.filter((r) => r.status === "excused").length;
    const positiveCount = safeRecords.filter((r) => (r.status === "present" || r.status === "late") && r.drugTestResult === "POSITIVE").length;
    const negativeCount = (presentCount + lateCount) - positiveCount;

    await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
      req.user.username,
      `Recorded attendance for ${safeRecords.length} patient(s) — session "${session.session_name}" (${presentCount} present, ${lateCount} late, ${excusedCount} excused, ${absentCount} absent)`,
    ]);

    await notifyIctAdmins(
      "reports", "attendance_summary",
      `Attendance recorded for "${session.session_name}" (${session.session_date}): ${presentCount} present, ${absentCount} absent, ${lateCount} late, ${excusedCount} excused — Drug tests: ${negativeCount} Negative, ${positiveCount} Positive — by ${req.user.username}`
    );

    // Batched notifications for absent patients' assigned case managers
    const absentRecords = safeRecords.filter((r) => r.status === "absent");
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

        // Check if client has 2 consecutive unexcused absences (excluding cancelled sessions)
        if (p.assigned_case_manager_id) {
          const [recentAtt] = await pool.query(
            "SELECT status FROM attendance WHERE patient_id = ? AND status != 'cancelled' ORDER BY session_date DESC, id DESC LIMIT 2",
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

    // Check if any attended patient reached 43 CREDITED core sessions (PDC Readiness)
    const attendedRecs = safeRecords.filter((r) => r.status === "present" || r.status === "late");
    if (attendedRecs.length > 0) {
      const attendedPatientIds = attendedRecs.map((r) => r.patientId);
      const [presentPatients] = await pool.query(
        `SELECT id, full_name, assigned_case_manager_id FROM patients WHERE id IN (?) AND is_archived = FALSE`,
        [attendedPatientIds]
      );
      for (const p of presentPatients) {
        if (p.assigned_case_manager_id) {
          const progress = await getUnifiedPatientProgress(pool, p.id);
          if (progress.isCoreComplete) {
            await notifyUser(
              p.assigned_case_manager_id,
              "patients",
              "milestone_readiness",
              `Milestone Alert: "${p.full_name}" has completed all 43 core curriculum requirements (28 CBT, 3 CBT-E, 12 PE) and is ready for Pre-Discharge Conference (PDC).`
            );
          }
        }
      }
    }

    // Relapse Risk Clinical Alert (ENTREPOSE Vol. 3A & Vol. 1 Sec 11.1 — Distinguishing Near-Use/Craving from Actual Use)
    const atRiskRecords = safeRecords.filter(
      (r) =>
        r.relapseRisk === "AT_RISK" ||
        r.relapseRisk === "NEARLY_USED" ||
        r.relapseRisk === "USED"
    );
    for (const r of atRiskRecords) {
      const [[patient]] = await pool.query(
        "SELECT id, full_name, assigned_case_manager_id FROM patients WHERE id = ?",
        [r.patientId]
      );
      if (patient?.assigned_case_manager_id) {
        const isActualUse = r.relapseRisk === "USED";
        const isNearUse = r.relapseRisk === "NEARLY_USED";
        const severityLabel = isActualUse
          ? "ACTUAL SUBSTANCE USE / LAPSE"
          : isNearUse
          ? "NEAR-USE / STRONG CRAVING (NO SUBSTANCE USE)"
          : "AT RISK (TRIGGER EXPOSURE — NO USE)";
        const alertMsg = isNearUse
          ? `Schedule Book Craving Support [${severityLabel}]: "${patient.full_name}" reported strong craving / near-use WITHOUT using substances in session "${session.session_name}". Abstinence was maintained; supportive coping review recommended.`
          : `Relapse Risk Alert [${severityLabel}]: "${patient.full_name}" was recorded as "${r.relapseRisk}" in Schedule Book review for session "${session.session_name}". Clinical follow-up recommended.`;

        await notifyUser(
          patient.assigned_case_manager_id,
          "patients",
          "relapse_risk_alert",
          alertMsg
        );
        try {
          const followUpReason = isNearUse
            ? `Schedule Book Near-Use / Strong Craving (Abstinence Maintained — No Substance Use): ${session.session_name || "Curriculum Session"}`
            : isActualUse
            ? `Schedule Book Self-Reported Substance Use / Lapse: ${session.session_name || "Curriculum Session"}`
            : `Schedule Book At-Risk Review (Trigger Exposure — No Use): ${session.session_name || "Curriculum Session"}`;
          await pool.query(
            "INSERT INTO follow_ups (patient_id, assigned_to, reason, due_date, status) VALUES (?, ?, ?, CURDATE(), 'pending')",
            [r.patientId, patient.assigned_case_manager_id, followUpReason]
          );
        } catch (fErr) {
          console.warn("Could not auto-schedule follow-up:", fErr.message);
        }
      }
    }

    // Positive Drug Screening Clinical Alert (ENTREPOSE Protocol)
    const positiveDtRecords = safeRecords.filter(
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

    res.status(201).json({
      message: sessionUnresolvedCount > 0
        ? `Attendance recorded for ${safeRecords.length} patient(s). Note: ${sessionUnresolvedCount} scheduled patient(s) remain unresolved.`
        : "Attendance and completion decisions recorded.",
      recordedCount: safeRecords.length,
      expectedCount: sessionExpectedCount,
      unresolvedCount: sessionUnresolvedCount,
      duplicateTopicPreventedCount: duplicateWarnings.length,
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Could not record attendance." });
  } finally {
    connection.release();
  }
}

export async function updateAttendanceCompletion(req, res) {
  const { id } = req.params;
  const {
    status,
    completionStatus,
    arrivalTime,
    decisionReason,
    authorizedByName,
    curriculumRequirement,
    isMakeup,
    makeupForAttendanceId,
    relapseRisk,
    staffRiskAssessment,
    notes,
  } = req.body;

  try {
    await ensureAttendanceCompletionSchema();
    await ensureCbteAndRiskSchema();

    const [[existing]] = await pool.query(
      `SELECT a.*, p.full_name AS patient_name, p.assigned_case_manager_id,
              COALESCE(a.topic_id, s.topic_id) AS resolved_topic_id,
              COALESCE(a.topic_name, s.topic_name) AS resolved_topic_name,
              COALESCE(a.curriculum_requirement, a.topic_name, s.topic_name, s.session_name, a.session_type) AS resolved_requirement
       FROM attendance a
       JOIN patients p ON p.id = a.patient_id
       LEFT JOIN sessions s ON s.id = a.session_id
       WHERE a.id = ?`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({ message: "Attendance record not found." });
    }

    if (
      req.user.role === "case_manager" &&
      existing.assigned_case_manager_id &&
      Number(existing.assigned_case_manager_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({ message: "You can only review participation for your assigned caseload." });
    }

    const nextStatus = status && ["present", "late", "absent", "excused", "cancelled"].includes(status)
      ? status
      : existing.status;

    let nextCompletion = completionStatus && ["CREDITED", "NOT_CREDITED", "PENDING_REVIEW"].includes(completionStatus)
      ? completionStatus
      : existing.completion_status;

    if (["absent", "excused", "cancelled"].includes(nextStatus)) {
      if (completionStatus === "CREDITED") {
        return res.status(400).json({
          message: `Cannot grant curriculum credit directly to an "${nextStatus}" record. Record a linked makeup attendance instead so the original ${nextStatus} record remains preserved.`
        });
      }
      nextCompletion = "NOT_CREDITED";
    }

    const nextReason = decisionReason !== undefined ? String(decisionReason || "").trim() : existing.decision_reason;
    const nextAuthStaff = authorizedByName !== undefined
      ? String(authorizedByName || "").trim()
      : (existing.authorized_by_name || req.user.full_name || req.user.username);

    if (
      (nextCompletion === "CREDITED" || nextCompletion === "NOT_CREDITED") &&
      (nextStatus === "late" || nextStatus === "excused" || (nextStatus === "present" && nextCompletion === "NOT_CREDITED")) &&
      !nextReason
    ) {
      return res.status(400).json({
        message: "A documented reason is required when granting or withholding credit for late, excused, or non-credited attendance."
      });
    }

    if ((nextStatus === "late" || nextStatus === "excused" || nextCompletion !== "PENDING_REVIEW") && !nextAuthStaff) {
      return res.status(400).json({
        message: "An authorized staff member / supervisor name is required when recording a completion or excuse decision."
      });
    }

    const nextRequirement = curriculumRequirement !== undefined
      ? String(curriculumRequirement || "").trim() || existing.resolved_requirement
      : existing.resolved_requirement;

    const nextIsMakeup = isMakeup !== undefined ? (isMakeup ? 1 : 0) : existing.is_makeup;
    const nextMakeupForId = makeupForAttendanceId !== undefined
      ? (makeupForAttendanceId ? Number(makeupForAttendanceId) : null)
      : existing.makeup_for_attendance_id;

    // Duplicate credit check if granting CREDITED
    let isDuplicateTopic = existing.is_duplicate_topic || 0;
    if (nextCompletion === "CREDITED") {
      const dupCheck = await checkDuplicateCurriculumCredit(pool, {
        patientId: existing.patient_id,
        topicId: existing.resolved_topic_id,
        topicName: existing.resolved_topic_name,
        curriculumRequirement: nextRequirement,
        excludeAttendanceId: existing.id,
      });

      if (dupCheck.isDuplicate) {
        const priorDate = dupCheck.existingRecord?.session_date
          ? String(dupCheck.existingRecord.session_date).slice(0, 10)
          : "an earlier session";
        return res.status(400).json({
          message: `Duplicate Credit Prevented: "${existing.patient_name}" already received credit for "${nextRequirement}" on ${priorDate}. The same curriculum requirement cannot receive duplicate credit.`
        });
      }

      if (nextIsMakeup && nextMakeupForId) {
        const [[existingMakeup]] = await pool.query(
          `SELECT id, session_date FROM attendance
           WHERE makeup_for_attendance_id = ? AND completion_status = 'CREDITED' AND id != ? LIMIT 1`,
          [nextMakeupForId, existing.id]
        );
        if (existingMakeup) {
          return res.status(400).json({
            message: `Duplicate Makeup Credit Prevented: That missed session was already fulfilled by another credited makeup on ${String(existingMakeup.session_date).slice(0, 10)}.`
          });
        }
      }
      isDuplicateTopic = 0;
    }

    const nextArrivalTime = arrivalTime !== undefined
      ? (nextStatus === "late" ? arrivalTime || null : null)
      : existing.arrival_time;
    const nextNotes = notes !== undefined ? notes : existing.notes;
    const nextRelapseRisk =
      relapseRisk !== undefined ? normalizeSelfReportedRisk(relapseRisk) : existing.relapse_risk || null;
    const nextStaffRisk =
      staffRiskAssessment !== undefined
        ? normalizeStaffRiskAssessment(staffRiskAssessment)
        : existing.staff_risk_assessment || null;

    await pool.query(
      `UPDATE attendance
       SET status = ?,
           completion_status = ?,
           curriculum_requirement = ?,
           arrival_time = ?,
           decision_reason = ?,
           authorized_by = ?,
           authorized_by_name = ?,
           is_makeup = ?,
           makeup_for_attendance_id = ?,
           is_duplicate_topic = ?,
           relapse_risk = ?,
           staff_risk_assessment = ?,
           reviewed_at = NOW(),
           notes = ?
       WHERE id = ?`,
      [
        nextStatus,
        nextCompletion,
        nextRequirement,
        nextArrivalTime,
        nextReason || null,
        req.user.id,
        nextAuthStaff || null,
        nextIsMakeup,
        nextMakeupForId,
        isDuplicateTopic,
        nextRelapseRisk,
        nextStaffRisk,
        nextNotes || null,
        id,
      ]
    );

    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patients', ?)",
      [
        req.user.username,
        `Reviewed attendance #${id} for "${existing.patient_name}": Status=${nextStatus}, Completion=${nextCompletion}${nextReason ? ` (${nextReason})` : ""} — Authorized by ${nextAuthStaff}`,
        existing.patient_id,
      ]
    );

    // Check if patient reached all 43 credited core requirements (28 CBT + 3 CBT-E + 12 PE)
    if (nextCompletion === "CREDITED" && existing.assigned_case_manager_id) {
      const progress = await getUnifiedPatientProgress(pool, existing.patient_id);
      if (progress.isCoreComplete) {
        await notifyUser(
          existing.assigned_case_manager_id,
          "patients",
          "milestone_readiness",
          `Milestone Alert: "${existing.patient_name}" has completed all 43 core curriculum requirements (28 CBT, 3 CBT-E, 12 PE) and is ready for Pre-Discharge Conference (PDC).`
        );
      }
    }

    res.json({ message: "Participation review and completion decision saved." });
  } catch (err) {
    console.error("Error updating attendance completion:", err);
    res.status(500).json({ message: "Could not update completion decision." });
  }
}

export async function getPatientAttendanceContext(req, res) {
  const { patientId } = req.query;
  try {
    await ensureAttendanceCompletionSchema();

    const where = ["p.is_archived = FALSE"];
    const params = [];

    if (req.user.role === "case_manager") {
      where.push("p.assigned_case_manager_id = ?");
      params.push(req.user.id);
    }
    if (patientId) {
      where.push("a.patient_id = ?");
      params.push(patientId);
    }

    const [rows] = await pool.query(
      `SELECT a.id, a.patient_id, a.session_date, a.session_type, a.status,
              COALESCE(a.completion_status, CASE WHEN a.status = 'present' THEN 'CREDITED' ELSE 'NOT_CREDITED' END) AS completion_status,
              COALESCE(a.topic_id, s.topic_id) AS topic_id,
              COALESCE(a.topic_name, s.topic_name) AS topic_name,
              COALESCE(a.curriculum_requirement, a.topic_name, s.topic_name, s.session_name, a.session_type) AS curriculum_requirement,
              a.is_makeup, a.makeup_for_attendance_id, a.is_duplicate_topic, a.decision_reason
       FROM attendance a
       JOIN patients p ON p.id = a.patient_id
       LEFT JOIN sessions s ON s.id = a.session_id
       WHERE ${where.join(" AND ")}
       ORDER BY a.session_date DESC, a.id DESC`,
      params
    );

    const creditedTopicsByPatient = {};
    const fulfilledAttendanceIds = new Set();

    for (const r of rows) {
      if (r.completion_status === "CREDITED" && r.makeup_for_attendance_id) {
        fulfilledAttendanceIds.add(Number(r.makeup_for_attendance_id));
      }
      if (r.completion_status === "CREDITED" && !r.is_duplicate_topic && (r.status === "present" || r.status === "late")) {
        if (!creditedTopicsByPatient[r.patient_id]) creditedTopicsByPatient[r.patient_id] = [];
        creditedTopicsByPatient[r.patient_id].push({
          attendanceId: r.id,
          topicId: r.topic_id,
          topicName: r.topic_name,
          curriculumRequirement: r.curriculum_requirement,
          sessionType: r.session_type,
          sessionDate: r.session_date ? String(r.session_date).slice(0, 10) : null,
        });
      }
    }

    const outstandingByPatient = {};
    for (const r of rows) {
      const isMissedOrUncredited =
        r.status === "absent" ||
        r.status === "excused" ||
        (r.status === "late" && r.completion_status === "NOT_CREDITED") ||
        (r.status === "present" && r.completion_status === "NOT_CREDITED" && !r.is_duplicate_topic);

      if (!isMissedOrUncredited) continue;
      if (fulfilledAttendanceIds.has(Number(r.id))) continue;

      // Also check if the exact topic was already credited in another session for this patient
      const patientCredited = creditedTopicsByPatient[r.patient_id] || [];
      const alreadyCreditedTopic = r.topic_id
        ? patientCredited.some((c) => Number(c.topicId) === Number(r.topic_id))
        : false;
      if (alreadyCreditedTopic) continue;

      if (!outstandingByPatient[r.patient_id]) outstandingByPatient[r.patient_id] = [];
      outstandingByPatient[r.patient_id].push({
        attendanceId: r.id,
        sessionDate: r.session_date ? String(r.session_date).slice(0, 10) : "",
        sessionType: r.session_type,
        topicId: r.topic_id,
        topicName: r.topic_name,
        curriculumRequirement: r.curriculum_requirement,
        status: r.status,
        decisionReason: r.decision_reason,
      });
    }

    res.json({
      creditedTopicsByPatient,
      outstandingByPatient,
    });
  } catch (err) {
    console.error("Error fetching patient attendance context:", err);
    res.status(500).json({ message: "Could not load patient attendance context." });
  }
}

export async function getAttendancePolicy(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'attendance_policy' LIMIT 1"
    ).catch(() => [[]]);

    if (rows && rows.length > 0 && rows[0].setting_value) {
      try {
        const parsed = JSON.parse(rows[0].setting_value);
        return res.json({ policy: { ...DEFAULT_ATTENDANCE_POLICY, ...parsed } });
      } catch {
        // fallback to default
      }
    }
    res.json({ policy: DEFAULT_ATTENDANCE_POLICY });
  } catch (err) {
    res.json({ policy: DEFAULT_ATTENDANCE_POLICY });
  }
}

export async function updateAttendancePolicy(req, res) {
  const {
    lateGraceMinutes,
    lateWithinGraceDecision,
    lateBeyondGraceDecision,
    requireReasonForLateDecision,
    requireSupervisorForExcuse,
    preventDuplicateTopicCredit,
    approvedBySupervisor,
    policyEffectiveDate,
    policySummary,
  } = req.body;

  const updatedPolicy = {
    lateGraceMinutes: Number.isFinite(Number(lateGraceMinutes)) ? Number(lateGraceMinutes) : 15,
    lateWithinGraceDecision: ["CREDITED", "PENDING_REVIEW", "NOT_CREDITED"].includes(lateWithinGraceDecision)
      ? lateWithinGraceDecision
      : "CREDITED",
    lateBeyondGraceDecision: ["CREDITED", "PENDING_REVIEW", "NOT_CREDITED"].includes(lateBeyondGraceDecision)
      ? lateBeyondGraceDecision
      : "PENDING_REVIEW",
    requireReasonForLateDecision: Boolean(requireReasonForLateDecision ?? true),
    requireSupervisorForExcuse: Boolean(requireSupervisorForExcuse ?? true),
    preventDuplicateTopicCredit: Boolean(preventDuplicateTopicCredit ?? true),
    approvedBySupervisor: String(approvedBySupervisor || DEFAULT_ATTENDANCE_POLICY.approvedBySupervisor).trim(),
    policyEffectiveDate: policyEffectiveDate || new Date().toISOString().slice(0, 10),
    policySummary: String(policySummary || DEFAULT_ATTENDANCE_POLICY.policySummary).trim(),
  };

  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS system_settings (
         setting_key VARCHAR(100) PRIMARY KEY,
         setting_value TEXT,
         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
       )`
    ).catch(() => {});

    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value)
       VALUES ('attendance_policy', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(updatedPolicy)]
    );

    await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
      req.user.username,
      `Updated MTRC Attendance & Participation Policy (Approved by: ${updatedPolicy.approvedBySupervisor})`,
    ]);

    res.json({ message: "Attendance policy updated.", policy: updatedPolicy });
  } catch (err) {
    console.error("Error updating attendance policy:", err);
    res.status(500).json({ message: "Could not save attendance policy." });
  }
}

export async function listAttendance(req, res) {
  const { dateFilter, dateFrom, dateTo, programId, caseManagerId, status, completionStatus, search } = req.query;
  const today = new Date().toISOString().slice(0, 10);

  await ensureAttendanceCompletionSchema();

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
  if (completionStatus) { where.push("a.completion_status = ?"); params.push(completionStatus); }
  if (search) {
    where.push("(p.full_name LIKE ? OR p.patient_code LIKE ? OR a.curriculum_requirement LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT a.id, a.status, a.notes, a.session_date, a.session_type,
            COALESCE(a.completion_status, CASE WHEN a.status = 'present' THEN 'CREDITED' ELSE 'NOT_CREDITED' END) AS completion_status,
            COALESCE(a.curriculum_requirement, a.topic_name, s.topic_name, s.session_name, a.session_type) AS curriculum_requirement,
            a.arrival_time, a.decision_reason, a.authorized_by, a.authorized_by_name,
            a.is_makeup, a.makeup_for_attendance_id, a.is_duplicate_topic, a.reviewed_at,
            a.relapse_risk, a.family_attended, a.family_member_name, a.is_chairperson, a.drug_test_result,
            COALESCE(a.topic_id, s.topic_id) AS topic_id,
            COALESCE(a.topic_name, s.topic_name) AS topic_name,
            p.id AS patient_id, p.patient_code, p.full_name,
            s.session_name, s.session_time, s.session_status, s.cancellation_reason,
            pr.name AS program_name,
            COALESCE(u.full_name, cm_p.full_name) AS case_manager_name,
            dt.substance_tested,
            orig.session_date AS makeup_origin_date,
            COALESCE(orig.curriculum_requirement, orig.topic_name, orig.session_type) AS makeup_origin_requirement,
            orig.status AS makeup_origin_status,
            mk.id AS fulfilled_by_makeup_id,
            mk.session_date AS fulfilled_by_makeup_date
     FROM attendance a
     JOIN patients p ON p.id = a.patient_id
     LEFT JOIN sessions s ON s.id = a.session_id
     LEFT JOIN programs pr ON pr.id = s.program_id
     LEFT JOIN users u ON u.id = s.case_manager_id
     LEFT JOIN users cm_p ON cm_p.id = p.assigned_case_manager_id
     LEFT JOIN attendance orig ON orig.id = a.makeup_for_attendance_id
     LEFT JOIN (
       SELECT makeup_for_attendance_id, MIN(id) AS id, MIN(session_date) AS session_date
       FROM attendance
       WHERE completion_status = 'CREDITED' AND makeup_for_attendance_id IS NOT NULL
       GROUP BY makeup_for_attendance_id
     ) mk ON mk.makeup_for_attendance_id = a.id
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
  await ensureAttendanceCompletionSchema();

  const today = new Date().toISOString().slice(0, 10);
  const scopeClause = req.user.role === "case_manager"
    ? "JOIN patients p ON p.id = a.patient_id AND p.assigned_case_manager_id = ?"
    : "";
  const scopeParams = req.user.role === "case_manager" ? [req.user.id] : [];

  const rosterScope = req.user.role === "case_manager"
    ? "JOIN patients p ON p.id = sr.patient_id AND p.assigned_case_manager_id = ?"
    : "JOIN patients p ON p.id = sr.patient_id";
  const rosterParams = req.user.role === "case_manager" ? [req.user.id] : [];

  // 1. Scheduled sessions and expected roster for today (non-cancelled, non-rescheduled)
  const [[todayRoster]] = await pool.query(
    `SELECT COUNT(DISTINCT sr.patient_id) AS expectedToday,
            COUNT(DISTINCT a.patient_id) AS recordedToday,
            COUNT(DISTINCT s.id) AS scheduledSessionsToday
     FROM session_roster sr
     JOIN sessions s ON s.id = sr.session_id
     ${rosterScope}
     LEFT JOIN attendance a ON a.session_id = sr.session_id AND a.patient_id = sr.patient_id
     WHERE s.session_date = ? AND s.session_status NOT IN ('CANCELLED', 'RESCHEDULED') AND p.is_archived = FALSE`,
    [...rosterParams, today]
  );

  // 2. All past & today sessions where an expected patient has NO attendance record (unresolved)
  const [[allUnres]] = await pool.query(
    `SELECT COUNT(*) AS totalUnresolvedAll
     FROM session_roster sr
     JOIN sessions s ON s.id = sr.session_id
     ${rosterScope}
     LEFT JOIN attendance a ON a.session_id = sr.session_id AND a.patient_id = sr.patient_id
     WHERE s.session_date <= CURDATE()
       AND s.session_status NOT IN ('CANCELLED', 'RESCHEDULED')
       AND p.is_archived = FALSE
       AND a.id IS NULL`,
    rosterParams
  );

  const [[{ todaySessions }]] = await pool.query(
    `SELECT COUNT(DISTINCT a.session_id) AS todaySessions
     FROM attendance a ${scopeClause}
     WHERE a.session_date = ? AND a.status != 'cancelled'`,
    [...scopeParams, today]
  );
  const [[{ total, present, credited, pendingReview }]] = await pool.query(
    `SELECT COUNT(CASE WHEN a.status != 'cancelled' THEN 1 END) AS total,
            SUM(a.status IN ('present', 'late')) AS present,
            SUM(a.completion_status = 'CREDITED' AND COALESCE(a.is_duplicate_topic, 0) = 0) AS credited,
            SUM(a.completion_status = 'PENDING_REVIEW') AS pendingReview
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
  const [[{ pendingReviewAll }]] = await pool.query(
    `SELECT COUNT(*) AS pendingReviewAll
     FROM attendance a ${scopeClause}
     WHERE a.completion_status = 'PENDING_REVIEW'`,
    scopeParams
  );

  const expectedToday = Math.max(Number(todayRoster?.expectedToday || 0), Number(total || 0));
  const recordedToday = Number(total || todayRoster?.recordedToday || 0);
  const unresolvedToday = Math.max(0, expectedToday - recordedToday);
  const totalUnresolvedAll = Number(allUnres?.totalUnresolvedAll || 0);

  res.json({
    todaySessions: todayRoster?.scheduledSessionsToday || todaySessions || 0,
    todayRate: expectedToday ? Math.round(((present || 0) / expectedToday) * 100) : null,
    expectedToday,
    recordedToday,
    unresolvedToday,
    totalUnresolvedAll,
    presentToday: present || 0,
    creditedToday: credited || 0,
    pendingReviewToday: pendingReview || 0,
    pendingReviewAll: pendingReviewAll || 0,
    absentToday: absentToday || 0,
  });
}
