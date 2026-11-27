import pool from "../config/db.js";
import { notifyUser, notifyRoles, notifyUserOnce } from "../utils/notify.js";
import { ensureAttendanceCompletionSchema, checkDuplicateCurriculumCredit } from "../utils/attendanceSchema.js";
import { getUnifiedPatientProgress, getBulkUnifiedPatientProgress } from "../utils/curriculumProgress.js";
import {
  ensureProgramDurationSchema,
  evaluatePatientDuration,
  calculateExpectedCompletionDate,
  toDateOnlyString,
} from "../utils/programDuration.js";
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
import {
  ensureInterventionSchema,
  INTERVENTION_TYPES,
  CONSULT_TYPES,
} from "../utils/interventionSchema.js";
import { recordPatientStatusChange } from "../utils/historicalReportSchema.js";
import { getCompletionGuardFailures, isEnrolledActive, findPatientsNotEnrolledOn } from "../utils/completionGuards.js";
import { legacyDischargeReasonCode, isCompleterOutcome, enrollmentStatusForOutcome } from "../utils/classification.js";

// 1. Milestones
export async function getMilestones(req, res) {
  const { id } = req.params;
  try {
    const [[milestones]] = await pool.query(
      `SELECT * FROM patient_milestones WHERE patient_id = ?`,
      [id]
    );
    const [history] = await pool.query(
      `SELECT h.*, u.full_name AS recorded_by_name
       FROM patient_milestone_history h
       LEFT JOIN users u ON u.id = h.recorded_by
       WHERE h.patient_id = ?
       ORDER BY h.recorded_at DESC`,
      [id]
    );
    res.json({ milestones: milestones || null, history: history || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not fetch milestones." });
  }
}

export async function updateMilestones(req, res) {
  const { id } = req.params;
  const {
    date_po, date_vlts_referral, date_initial_assessment, date_initial_tx_planning,
    date_initial_progress_report, date_case_conference, date_status_reporting,
    date_home_visit, date_followup_assessment, date_acp_planning, date_pdc,
    date_final_progress_report, date_referral_outside_mtrc
  } = req.body;

  try {
    await pool.query(
      `INSERT INTO patient_milestones (
        patient_id, date_po, date_vlts_referral, date_initial_assessment, 
        date_initial_tx_planning, date_initial_progress_report, date_case_conference, 
        date_status_reporting, date_home_visit, date_followup_assessment, 
        date_acp_planning, date_pdc, date_final_progress_report,
        date_referral_outside_mtrc
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        date_po=VALUES(date_po), date_vlts_referral=VALUES(date_vlts_referral),
        date_initial_assessment=VALUES(date_initial_assessment),
        date_initial_tx_planning=VALUES(date_initial_tx_planning),
        date_initial_progress_report=VALUES(date_initial_progress_report),
        date_case_conference=VALUES(date_case_conference),
        date_status_reporting=VALUES(date_status_reporting),
        date_home_visit=VALUES(date_home_visit),
        date_followup_assessment=VALUES(date_followup_assessment),
        date_acp_planning=VALUES(date_acp_planning), date_pdc=VALUES(date_pdc),
        date_final_progress_report=VALUES(date_final_progress_report),
        date_referral_outside_mtrc=VALUES(date_referral_outside_mtrc)`,
      [
        id, date_po || null, date_vlts_referral || null, date_initial_assessment || null,
        date_initial_tx_planning || null, date_initial_progress_report || null,
        date_case_conference || null, date_status_reporting || null, date_home_visit || null,
        date_followup_assessment || null, date_acp_planning || null, date_pdc || null,
        date_final_progress_report || null, date_referral_outside_mtrc || null
      ]
    );

    // Record milestone history for audit & historical monthly reporting
    const milestoneMap = {
      date_po, date_vlts_referral, date_initial_assessment, date_initial_tx_planning,
      date_initial_progress_report, date_case_conference, date_status_reporting,
      date_home_visit, date_followup_assessment, date_acp_planning, date_pdc,
      date_final_progress_report, date_referral_outside_mtrc
    };

    for (const [key, val] of Object.entries(milestoneMap)) {
      if (val) {
        await pool.query(
          `INSERT INTO patient_milestone_history (patient_id, milestone_key, milestone_date, recorded_by)
           VALUES (?, ?, ?, ?)`,
          [id, key, val, req.user?.id || null]
        ).catch(() => {});
      }
    }

    const [[pRow]] = await pool.query("SELECT full_name FROM patients WHERE id = ?", [id]);
    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patients', ?)",
      [
        req.user?.username || "Staff",
        `Updated clinical/legal milestones for patient "${pRow?.full_name || `#${id}`}"`,
        id
      ]
    );

    res.json({ message: "Milestones updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update milestones." });
  }
}

// 2. Session Summary (Unified 28 CBT + 3 CBT-E + 12 PE = 43 Core Calculation + Duration Summary)
export async function getSessionSummary(req, res) {
  const { id } = req.params;
  try {
    await ensureProgramDurationSchema();
    const [progress, [[patient]]] = await Promise.all([
      getUnifiedPatientProgress(pool, id),
      pool.query("SELECT * FROM patients WHERE id = ?", [id]),
    ]);
    const durationSummary = patient ? evaluatePatientDuration(patient) : null;
    res.json({
      ...progress,
      durationSummary,
      isCompletionEligible: Boolean(progress.isCoreComplete && durationSummary?.isDurationMet),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not fetch session summary." });
  }
}

// 3. Log Session & SOAP Note
export async function logSessionWithNote(req, res) {
  await ensureAttendanceCompletionSchema();
  const { 
    patientId, sessionDate, sessionType, status, remarks, 
    subjective, objective, assessment, plan,
    completionStatus, curriculumRequirement, arrivalTime,
    decisionReason, authorizedByName, isMakeup, makeupForAttendanceId
  } = req.body;
  
  if (!patientId || !sessionDate || !sessionType || !status) {
    return res.status(400).json({ message: "Missing required attendance fields." });
  }
  if ((await findPatientsNotEnrolledOn(pool, [patientId], sessionDate)).length > 0) {
    return res.status(409).json({ message: "This patient is not actively enrolled on that date (discharged or not yet finalized)." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const normalizedStatus = String(status).toLowerCase();
    const resolvedRequirement = curriculumRequirement ? String(curriculumRequirement).trim() : null;
    const [sessionResult] = await connection.query(
      `INSERT INTO sessions (session_name, session_type, curriculum_requirement, case_manager_id, session_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [resolvedRequirement || sessionType, sessionType, resolvedRequirement, req.user.id, sessionDate, req.user.id]
    );
    const sessionId = sessionResult.insertId;

    let resolvedCompletion = "NOT_CREDITED";
    if (normalizedStatus === "present") {
      resolvedCompletion = ["CREDITED", "NOT_CREDITED", "PENDING_REVIEW"].includes(completionStatus)
        ? completionStatus
        : "CREDITED";
    } else if (normalizedStatus === "late") {
      resolvedCompletion = ["CREDITED", "NOT_CREDITED", "PENDING_REVIEW"].includes(completionStatus)
        ? completionStatus
        : "PENDING_REVIEW";
    }

    let isDuplicateTopic = 0;
    let finalReason = decisionReason ? String(decisionReason).trim() : null;
    if (resolvedRequirement && (normalizedStatus === "present" || normalizedStatus === "late")) {
      const dupCheck = await checkDuplicateCurriculumCredit(connection, {
        patientId,
        curriculumRequirement: resolvedRequirement,
      });
      if (dupCheck.isDuplicate) {
        isDuplicateTopic = 1;
        resolvedCompletion = "NOT_CREDITED";
        if (!finalReason) {
          finalReason = `Repeat of already completed curriculum topic (${resolvedRequirement}) — no duplicate credit.`;
        }
      }
    }

    await connection.query(
      `INSERT INTO attendance (
         patient_id, session_id, session_date, session_type, curriculum_requirement,
         status, completion_status, arrival_time, decision_reason, authorized_by, authorized_by_name,
         is_makeup, makeup_for_attendance_id, is_duplicate_topic, notes, recorded_by
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId, sessionId, sessionDate, sessionType, resolvedRequirement,
        normalizedStatus, resolvedCompletion, arrivalTime || null, finalReason,
        req.user.id, authorizedByName || req.user.full_name || req.user.username,
        isMakeup ? 1 : 0, makeupForAttendanceId || null, isDuplicateTopic,
        remarks || null, req.user.id
      ]
    );

    if (subjective || objective || assessment || plan) {
      await connection.query(
        `INSERT INTO progress_notes (patient_id, case_manager_id, session_date, session_type, 
         observation, intervention_provided, patient_response, recommendations)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patientId, req.user.id, sessionDate, sessionType,
          objective || null, plan || null, subjective || null, assessment || null
        ]
      );
    }

    await connection.commit();

    // Background alert checks
    try {
      const [[p]] = await pool.query(
        "SELECT id, full_name, assigned_case_manager_id FROM patients WHERE id = ? AND is_archived = FALSE",
        [patientId]
      );
      if (p && p.assigned_case_manager_id) {
        if (normalizedStatus === "absent") {
          const [recentAtt] = await pool.query(
            "SELECT status FROM attendance WHERE patient_id = ? AND status != 'cancelled' ORDER BY session_date DESC, id DESC LIMIT 3",
            [patientId]
          );
          // Flag once per absence streak (not again on the 3rd, 4th... absence).
          if (
            recentAtt.length >= 2 &&
            recentAtt[0].status === "absent" &&
            recentAtt[1].status === "absent" &&
            (recentAtt.length === 2 || recentAtt[2].status !== "absent")
          ) {
            await notifyUser(
              p.assigned_case_manager_id,
              "patients",
              "consecutive_absences",
              `Clinical Flag: "${p.full_name}" has accumulated 2 consecutive absences and requires clinical follow-up.`
            );
          }
        } else if (resolvedCompletion === "CREDITED" && !isDuplicateTopic) {
          const progress = await getUnifiedPatientProgress(pool, patientId);
          if (progress.isCoreComplete) {
            await notifyUserOnce(
              p.assigned_case_manager_id,
              "patients",
              "milestone_readiness",
              `Milestone Alert: "${p.full_name}" has completed all 43 core curriculum requirements (28 CBT, 3 CBT-E, 12 PE) and is ready for Pre-Discharge Conference (PDC).`
            );
          }
        }
      }
    } catch (notifyErr) {
      console.error("Session notification error:", notifyErr);
    }

    res.json({ message: "Session and progress note logged successfully." });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Could not log session and note." });
  } finally {
    connection.release();
  }
}

// 4. Surveillance Drug Testing (Consistent Multi-3 Entry & Traceable Corrections)
export async function getDrugTests(req, res) {
  const { id } = req.params;
  try {
    await ensureDrugTestSchema();
    const [tests] = await pool.query(
      `SELECT d.*,
              COALESCE(d.tested_by_name, u.full_name) AS recorded_by_name,
              s.session_name AS linked_session_name,
              s.session_type AS linked_session_type,
              s.session_date AS linked_session_date,
              DATEDIFF(d.test_date, p.admission_date) AS days_from_enrollment
       FROM drug_test_logs d
       JOIN patients p ON d.patient_id = p.id
       LEFT JOIN users u ON u.id = d.recorded_by
       LEFT JOIN sessions s ON s.id = d.session_id
       WHERE d.patient_id = ?
       ORDER BY d.test_date DESC, d.id DESC`,
      [id]
    );
    res.json({ drugTests: tests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not fetch drug tests." });
  }
}

export async function addDrugTest(req, res) {
  const { id } = req.params;
  const {
    testDate,
    testTime,
    testType,
    result,
    positiveSubstances,
    positiveDrugs,
    substanceTested,
    sessionId,
    relatedVisit,
    testedByName,
    actionTaken,
    remarks,
  } = req.body;

  try {
    await ensureDrugTestSchema();

    const normResult = String(result || "").trim().toUpperCase();
    if (!normResult || !VALID_DRUG_TEST_RESULTS.has(normResult)) {
      return res.status(400).json({
        message: "Select an explicit Multi-3 drug test result (Negative, Positive, Pending, Invalid, or Not Performed).",
      });
    }

    if (!testDate) {
      return res.status(400).json({ message: "Test date is required." });
    }
    const notEnrolled = await findPatientsNotEnrolledOn(pool, [id], testDate);
    if (notEnrolled.length > 0) {
      return res.status(409).json({ message: "This patient is not actively enrolled on that date (discharged or not yet finalized)." });
    }

    const multi3 = buildMulti3SubstanceSummary(
      normResult,
      positiveSubstances || positiveDrugs || substanceTested
    );

    if (normResult === "POSITIVE" && multi3.codes.length === 0) {
      return res.status(400).json({
        message: "At least one positive substance (THC, METH, or ECS) must be selected for a POSITIVE result.",
      });
    }

    if (normResult === "POSITIVE" && !String(actionTaken || "").trim()) {
      return res.status(400).json({
        message: "Immediate clinical action taken is required when recording a POSITIVE drug test.",
      });
    }

    const staffName =
      String(testedByName || "").trim() ||
      req.user?.full_name ||
      req.user?.username ||
      "Authorized Staff";

    const finalSubstanceTested = multi3.substanceTested;
    const finalAction =
      String(actionTaken || "").trim() ||
      (normResult === "NEGATIVE"
        ? "Negative: Cleared on Multi-3 rapid screen (THC, METH, ECS)"
        : normResult === "PENDING"
        ? "Pending confirmatory / clinical review"
        : normResult === "INVALID"
        ? "Invalid specimen — repeat Multi-3 test required"
        : normResult === "NOT_PERFORMED"
        ? "Test not performed during visit"
        : null);

    await pool.query(
      `INSERT INTO drug_test_logs (
         patient_id, test_date, test_time, test_type,
         substance_tested, positive_substances, result,
         session_id, related_visit, tested_by_name,
         action_taken, remarks, recorded_by
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        testDate,
        testTime || null,
        testType || "Random Screening",
        finalSubstanceTested,
        multi3.positiveSubstancesStr,
        normResult,
        sessionId ? Number(sessionId) : null,
        relatedVisit ? String(relatedVisit).trim() : null,
        staffName,
        finalAction,
        remarks || null,
        req.user?.id || null,
      ]
    );

    const [[patient]] = await pool.query(
      "SELECT id, full_name, assigned_case_manager_id FROM patients WHERE id = ?",
      [id]
    );

    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patients', ?)",
      [
        req.user?.username || "Staff",
        `Logged ${normResult} Multi-3 drug test (${finalSubstanceTested}) on ${testDate}${testTime ? ` ${testTime}` : ""} by ${staffName} for patient "${patient?.full_name || `#${id}`}"`,
        id,
      ]
    );

    // Phase 1.3 & Phase 4 Alert: Positive Drug Test
    if (normResult === "POSITIVE" && patient) {
      if (patient.assigned_case_manager_id) {
        // Same alert type as the attendance flow, so both entry points group together.
        await notifyUser(
          patient.assigned_case_manager_id,
          "patients",
          "drug_test_positive",
          `Clinical Alert: Patient "${patient.full_name}" tested POSITIVE (${finalSubstanceTested}). Schedule case conference.`
        );
        // Same-day follow-up task, exactly as when the positive is recorded from attendance.
        try {
          await pool.query(
            "INSERT INTO follow_ups (patient_id, assigned_to, reason, due_date, status) VALUES (?, ?, ?, CURDATE(), 'pending')",
            [
              id,
              patient.assigned_case_manager_id,
              `Multi-3 Positive Drug Test (${finalSubstanceTested}): ${String(relatedVisit || "").trim() || testType || "Patient profile entry"} (${testDate})`,
            ]
          );
        } catch (fuErr) {
          console.error("Positive drug test follow-up creation failed:", fuErr);
        }
      }
      await notifyRoles(
        ["ict_admin", "him_staff"],
        "patients",
        "drug_test_positive",
        `Clinical Alert: Patient "${patient.full_name}" tested POSITIVE (${finalSubstanceTested}).`
      );
    }

    res.json({ message: "Multi-3 drug test logged successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not log drug test." });
  }
}

export async function updateDrugTest(req, res) {
  const { id, testId } = req.params;
  const {
    testDate,
    testTime,
    testType,
    result,
    positiveSubstances,
    positiveDrugs,
    substanceTested,
    sessionId,
    relatedVisit,
    testedByName,
    actionTaken,
    remarks,
    correctionReason,
  } = req.body;

  try {
    await ensureDrugTestSchema();

    const [[existing]] = await pool.query(
      "SELECT * FROM drug_test_logs WHERE id = ? AND patient_id = ?",
      [testId, id]
    );
    if (!existing) {
      return res.status(404).json({ message: "Drug test record not found." });
    }

    if (!String(correctionReason || "").trim()) {
      return res.status(400).json({
        message: "A documented reason for correction is required so all test modifications remain traceable.",
      });
    }

    const normResult = String(result || "").trim().toUpperCase();
    if (!normResult || !VALID_DRUG_TEST_RESULTS.has(normResult)) {
      return res.status(400).json({
        message: "Select an explicit Multi-3 drug test result.",
      });
    }

    const multi3 = buildMulti3SubstanceSummary(
      normResult,
      positiveSubstances || positiveDrugs || substanceTested
    );

    if (normResult === "POSITIVE" && multi3.codes.length === 0) {
      return res.status(400).json({
        message: "At least one positive substance (THC, METH, or ECS) must be selected for a POSITIVE result.",
      });
    }

    const correctorName =
      req.user?.full_name || req.user?.username || "Authorized Staff";
    const staffName =
      String(testedByName || "").trim() ||
      existing.tested_by_name ||
      correctorName;

    await pool.query(
      `UPDATE drug_test_logs
       SET test_date = ?,
           test_time = ?,
           test_type = ?,
           substance_tested = ?,
           positive_substances = ?,
           result = ?,
           session_id = ?,
           related_visit = ?,
           tested_by_name = ?,
           action_taken = ?,
           remarks = ?,
           is_corrected = 1,
           correction_reason = ?,
           corrected_by = ?,
           corrected_by_name = ?,
           corrected_at = NOW(),
           previous_result = COALESCE(previous_result, ?),
           previous_substance_tested = COALESCE(previous_substance_tested, ?)
       WHERE id = ? AND patient_id = ?`,
      [
        testDate || existing.test_date,
        testTime !== undefined ? testTime || null : existing.test_time,
        testType || existing.test_type,
        multi3.substanceTested,
        multi3.positiveSubstancesStr,
        normResult,
        sessionId !== undefined ? (sessionId ? Number(sessionId) : null) : existing.session_id,
        relatedVisit !== undefined ? (relatedVisit ? String(relatedVisit).trim() : null) : existing.related_visit,
        staffName,
        actionTaken !== undefined ? actionTaken || null : existing.action_taken,
        remarks !== undefined ? remarks || null : existing.remarks,
        String(correctionReason).trim(),
        req.user?.id || null,
        correctorName,
        existing.result,
        existing.substance_tested,
        testId,
        id,
      ]
    );

    const [[patient]] = await pool.query(
      "SELECT id, full_name FROM patients WHERE id = ?",
      [id]
    );

    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patients', ?)",
      [
        req.user?.username || "Staff",
        `Corrected drug test #${testId} for "${patient?.full_name || `#${id}`}": [${existing.result} / ${existing.substance_tested}] -> [${normResult} / ${multi3.substanceTested}] — Reason: ${String(correctionReason).trim()}`,
        id,
      ]
    );

    res.json({ message: "Drug test updated and correction logged in audit history." });
  } catch (err) {
    console.error("Error updating drug test:", err);
    res.status(500).json({ message: "Could not update drug test record." });
  }
}

// 5. CM Dashboard Flags
export async function getAttentionFlags(req, res) {
  try {
    await ensureProgramDurationSchema();
    const [patients] = await pool.query(
      `SELECT p.id as patient_id, p.full_name, p.patient_code, p.photo_url,
              p.admission_date, p.rehab_start_date, p.required_duration_months,
              p.duration_basis, p.extension_months, p.expected_completion_date
       FROM patients p 
       WHERE p.assigned_case_manager_id = ? AND p.enrollment_status = 'active'`,
      [req.user.id]
    );

    const progressMap = await getBulkUnifiedPatientProgress(
      pool,
      patients.map((p) => p.patient_id)
    ).catch(() => new Map());

    const flags = [];

    for (const p of patients) {
      // Check absences
      const [attendance] = await pool.query(
        `SELECT status FROM attendance WHERE patient_id = ? AND status != 'cancelled' ORDER BY session_date DESC LIMIT 2`,
        [p.patient_id]
      );
      if (attendance.length === 2 && attendance[0].status === 'absent' && attendance[1].status === 'absent') {
        flags.push({ ...p, issue: "2 Consecutive Absences (Needs Follow-up)", color: "yellow" });
      }

      // Check drug tests
      const [dt] = await pool.query(
        `SELECT id FROM drug_test_logs 
         WHERE patient_id = ? AND result = 'POSITIVE' AND test_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) 
         LIMIT 1`,
        [p.patient_id]
      );
      if (dt.length > 0) {
        flags.push({ ...p, issue: "Positive Drug Test (Schedule Conference)", color: "red" });
      }

      // Check unified curriculum milestones (28 CBT + 3 CBT-E + 12 PE = 43 Core) AND patient-specific duration
      const prog = progressMap.get(Number(p.patient_id));
      const dur = evaluatePatientDuration(p);
      const [[milestones]] = await pool.query(
        `SELECT date_pdc, date_initial_progress_report FROM patient_milestones WHERE patient_id = ?`,
        [p.patient_id]
      );

      if (prog?.isCoreComplete && dur?.isDurationMet && (!milestones || !milestones.date_pdc)) {
        flags.push({
          ...p,
          issue: `All 43 Core & ${dur.totalRequiredMonths}m Duration Met (Ready for PDC)`,
          color: "blue",
        });
      } else if (prog?.isCoreComplete && dur && !dur.isDurationMet && (!milestones || !milestones.date_pdc)) {
        flags.push({
          ...p,
          issue: `43/43 Core Met — Mandated Duration Pending (${dur.monthsElapsed}/${dur.totalRequiredMonths} mos · ${dur.durationBasisLabel})`,
          color: "yellow",
        });
      } else if (
        prog &&
        !prog.isCoreComplete &&
        prog.tallies.totalPhysicalAttended >= 43 &&
        (!milestones || !milestones.date_pdc)
      ) {
        flags.push({
          ...p,
          issue: `43+ Activities Attended, Core Incomplete (${prog.attendedCore}/43: CBT ${prog.cbtGroup}/28, CBT-E ${prog.cbteCompleted}/3, PE ${prog.psychoEd}/12)`,
          color: "yellow",
        });
      }

      // Check Initial Court Progress Report Due (>30 days enrolled)
      if (p.admission_date) {
        const daysEnrolled = Math.floor((new Date() - new Date(p.admission_date)) / (1000 * 60 * 60 * 24));
        if (daysEnrolled >= 30 && (!milestones || !milestones.date_initial_progress_report)) {
          flags.push({ ...p, issue: "Initial Court Report Due (>30d Enrolled)", color: "yellow" });
        }
      }
    }

    res.json({ patientsNeedingAttention: flags });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not fetch attention flags." });
  }
}

// 6. Formal Discharge
export async function dischargePatient(req, res) {
  const { id } = req.params;
  const { 
    dischargeDate, status, reason, treatmentDurationMonths, 
    interventionUponDischarge, courtNotified, transitionToAftercare 
  } = req.body;

  if (!dischargeDate || !status || !reason) {
    return res.status(400).json({ message: "Discharge date, status, and reason are required." });
  }

  // Exact comparison & canonical code evaluation (Finding 6: NON_COMPLETER is never counted as completer)
  const isCompleter = isCompleterOutcome(status, reason);
  const isAttritionReason = /non-compliance|abscond|drop|expel|arrest|buy-bust|incarcerat|death/i.test(reason || "");
  if (isCompleter && isAttritionReason) {
    return res.status(400).json({ message: "Incompatible discharge status and reason: A Completer cannot have a non-compliance, arrest, or disciplinary reason." });
  }
  if (!isCompleter && /completed program|completed mandated/i.test(reason || "")) {
    return res.status(400).json({ message: "Incompatible discharge status and reason: A Non-Completer cannot have 'Completed Program' as discharge reason." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Lock the patient row; refuse a second discharge or a discharge of a non-active patient.
    const [[dischargeTarget]] = await connection.query(
      "SELECT id, enrollment_status FROM patients WHERE id = ? FOR UPDATE",
      [id]
    );
    if (!dischargeTarget) {
      await connection.rollback();
      return res.status(404).json({ message: "Patient not found." });
    }
    const [[priorDischarge]] = await connection.query(
      "SELECT id FROM discharges WHERE patient_id = ? UNION SELECT id FROM patient_discharges WHERE patient_id = ? LIMIT 1",
      [id, id]
    );
    if (priorDischarge || !isEnrolledActive(dischargeTarget.enrollment_status)) {
      await connection.rollback();
      return res.status(409).json({ message: "This patient has already been discharged or is not actively enrolled." });
    }
    // A Completer discharge must meet the same statutory rules as the Certificate of Completion.
    if (isCompleter) {
      const unmet = await getCompletionGuardFailures(connection, id);
      if (unmet.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          message: "Patient does not yet meet the completion requirements. Discharge as Completer is not allowed.",
          guards: unmet,
        });
      }
    }

    const outcomeCode = isCompleter ? "COMPLETER" : "NON_COMPLETER";
    const reasonCode = legacyDischargeReasonCode(reason) || (isCompleter ? "COMPLETED_PROGRAM" : "NON_COMPLIANCE");

    await connection.query(
      `INSERT INTO patient_discharges (
        patient_id, discharge_date, status, reason, outcome, reason_code, treatment_duration_months, 
        intervention_upon_discharge, court_notified, transition_to_aftercare
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, dischargeDate, isCompleter ? "Completer" : "Non-Completer", reason, outcomeCode, reasonCode, treatmentDurationMonths || 0,
        interventionUponDischarge || null, courtNotified ? 1 : 0, transitionToAftercare ? 1 : 0
      ]
    );

    // Mirror to discharges table so record appears on Discharged Patients page (Finding 7: Atomic without swallowing errors)
    await connection.query(
      `INSERT INTO discharges (patient_id, program_type, discharge_type, discharge_date, remarks, discharged_by, outcome, reason_code)
       VALUES (?, 'outpatient', ?, ?, ?, ?, ?, ?)`,
      [id, isCompleter ? "Completer" : "Non-Completer", dischargeDate, reason || interventionUponDischarge || null, req.user?.username || req.user?.full_name || 'Staff', outcomeCode, reasonCode]
    );

    // Automatically stamp date_acp_planning ONLY if transitioning to aftercare
    // Do NOT automatically record a Pre-Discharge Conference (date_pdc) they never had!
    if (transitionToAftercare) {
      await connection.query(
        `INSERT INTO patient_milestones (patient_id, date_acp_planning)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE 
           date_acp_planning = COALESCE(date_acp_planning, VALUES(date_acp_planning))`,
        [id, dischargeDate]
      );
    }

    const enrollmentStatus = enrollmentStatusForOutcome(outcomeCode);
    const phaseUpdate = transitionToAftercare ? ", program_phase = 'Aftercare'" : "";

    await connection.query(
      `UPDATE patients SET enrollment_status = ?, current_status = ? ${phaseUpdate} WHERE id = ?`,
      [enrollmentStatus, enrollmentStatus, id]
    );

    // Synchronize historical status change (Finding 7)
    await recordPatientStatusChange(connection, {
      patientId: id,
      newStatus: enrollmentStatus,
      effectiveDate: dischargeDate,
      reason: `Discharged: ${isCompleter ? "Completer" : "Non-Completer"} (${reason})`,
      changedBy: req.user?.id,
    });

    const [[pRow]] = await connection.query("SELECT full_name FROM patients WHERE id = ?", [id]);
    await connection.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patients', ?)",
      [
        req.user?.username || "Staff",
        `Formally discharged patient "${pRow?.full_name || `#${id}`}" (${status}${reason ? ` — ${reason}` : ""})`,
        id
      ]
    );

    await connection.commit();
    res.json({ message: "Patient formally discharged." });
  } catch (err) {
    await connection.rollback();
    console.error("Discharge error:", err);
    res.status(500).json({ message: `Could not discharge patient: ${err.message}` });
  } finally {
    connection.release();
  }
}

// 7. Individualized Treatment Plan (ITP)
export async function getTreatmentPlan(req, res) {
  const { id } = req.params;
  try {
    let rows = [];
    try {
      const [result] = await pool.query(
        `SELECT tp.*, u.full_name AS case_manager_name, u.username AS case_manager_username
         FROM patient_treatment_plans tp
         LEFT JOIN users u ON u.id = tp.case_manager_id
         WHERE tp.patient_id = ?
         ORDER BY tp.created_at DESC
         LIMIT 1`,
        [id]
      );
      rows = result;
    } catch (dbErr) {
      if (dbErr.code === "ER_NO_SUCH_TABLE") {
        return res.json({ treatmentPlan: null, tableNotCreated: true });
      }
      throw dbErr;
    }

    const plan = rows[0] || null;
    if (!plan) {
      return res.json({ treatmentPlan: null });
    }

    let problemDomains = plan.problem_domains;
    if (typeof problemDomains === "string") {
      try { problemDomains = JSON.parse(problemDomains); } catch (_) { problemDomains = []; }
    }
    let interventionModalities = plan.intervention_modalities;
    if (typeof interventionModalities === "string") {
      try { interventionModalities = JSON.parse(interventionModalities); } catch (_) { interventionModalities = []; }
    }

    res.json({
      treatmentPlan: {
        ...plan,
        problem_domains: problemDomains || [],
        intervention_modalities: interventionModalities || [],
      }
    });
  } catch (err) {
    console.error("Error in getTreatmentPlan:", err);
    res.status(500).json({ message: "Could not fetch treatment plan." });
  }
}

export async function saveTreatmentPlan(req, res) {
  const { id } = req.params;
  const {
    plan_date,
    target_completion_date,
    agreed_start_date,
    required_duration_months,
    duration_basis,
    duration_basis_detail,
    problem_domains,
    primary_goals,
    intervention_modalities,
    relapse_prevention_plan,
    client_agreed,
    status
  } = req.body;

  if (!plan_date || !primary_goals) {
    return res.status(400).json({ message: "Plan date and primary goals are required." });
  }

  await ensureProgramDurationSchema();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[currentPatient]] = await connection.query("SELECT * FROM patients WHERE id = ?", [id]);
    const effectiveStart =
      agreed_start_date ||
      toDateOnlyString(currentPatient?.rehab_start_date) ||
      toDateOnlyString(currentPatient?.admission_date) ||
      plan_date;
    const effectiveReqMonths =
      Number(required_duration_months) > 0
        ? Number(required_duration_months)
        : Number(currentPatient?.required_duration_months) || 7;
    const extMonths = Number(currentPatient?.extension_months) || 0;
    const effectiveBasis = duration_basis || currentPatient?.duration_basis || "STANDARD_PROGRAM";
    const effectiveBasisDetail =
      duration_basis_detail !== undefined
        ? duration_basis_detail
        : currentPatient?.duration_basis_detail || null;
    const computedExpected =
      calculateExpectedCompletionDate(effectiveStart, effectiveReqMonths + extMonths) ||
      target_completion_date ||
      null;

    // Sync patient's duration & expected completion date
    if (currentPatient) {
      const prevDur = Number(currentPatient.required_duration_months) || 7;
      const prevBasis = currentPatient.duration_basis || "STANDARD_PROGRAM";
      const prevStart = toDateOnlyString(currentPatient.rehab_start_date);
      const prevExp = toDateOnlyString(currentPatient.expected_completion_date);

      await connection.query(
        `UPDATE patients
         SET rehab_start_date = COALESCE(?, rehab_start_date, DATE(admission_date)),
             required_duration_months = ?,
             duration_basis = ?,
             duration_basis_detail = ?,
             expected_completion_date = ?
         WHERE id = ?`,
        [
          effectiveStart,
          effectiveReqMonths,
          effectiveBasis,
          effectiveBasisDetail,
          computedExpected,
          id,
        ]
      );

      if (
        effectiveReqMonths !== prevDur ||
        effectiveBasis !== prevBasis ||
        (effectiveStart && effectiveStart !== prevStart)
      ) {
        await connection
          .query(
            `INSERT INTO patient_duration_history
               (patient_id, change_type, previous_duration_months, new_duration_months,
                extension_months, total_duration_months, previous_basis, new_basis,
                basis_detail, agreed_start_date, previous_expected_completion_date,
                new_expected_completion_date, reason, effective_date,
                approved_by_name, recorded_by, recorded_by_name)
             VALUES (?, 'REQUIREMENT_CHANGE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              prevDur,
              effectiveReqMonths,
              extMonths,
              effectiveReqMonths + extMonths,
              prevBasis,
              effectiveBasis,
              effectiveBasisDetail,
              effectiveStart,
              prevExp,
              computedExpected,
              "Updated via Individualized Treatment Plan (ITP)",
              plan_date,
              req.user?.full_name || req.user?.username || "Case Manager",
              req.user?.id || null,
              req.user?.full_name || req.user?.username || "Case Manager",
            ]
          )
          .catch(() => {});
      }
    }

    const pDomainsJson = JSON.stringify(Array.isArray(problem_domains) ? problem_domains : []);
    const iModalitiesJson = JSON.stringify(Array.isArray(intervention_modalities) ? intervention_modalities : []);

    const [[existing]] = await connection.query(
      "SELECT id FROM patient_treatment_plans WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1",
      [id]
    );

    if (existing) {
      await connection.query(
        `UPDATE patient_treatment_plans
         SET plan_date = ?,
             target_completion_date = ?,
             problem_domains = ?,
             primary_goals = ?,
             intervention_modalities = ?,
             relapse_prevention_plan = ?,
             client_agreed = ?,
             status = ?,
             case_manager_id = ?
         WHERE id = ?`,
        [
          plan_date,
          computedExpected || target_completion_date || null,
          pDomainsJson,
          primary_goals,
          iModalitiesJson,
          relapse_prevention_plan || null,
          client_agreed ? 1 : 0,
          status || "active",
          req.user.id,
          existing.id
        ]
      );
    } else {
      await connection.query(
        `INSERT INTO patient_treatment_plans (
          patient_id, case_manager_id, plan_date, target_completion_date,
          problem_domains, primary_goals, intervention_modalities,
          relapse_prevention_plan, client_agreed, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          req.user.id,
          plan_date,
          computedExpected || target_completion_date || null,
          pDomainsJson,
          primary_goals,
          iModalitiesJson,
          relapse_prevention_plan || null,
          client_agreed ? 1 : 0,
          status || "active"
        ]
      );
    }

    // Automatically synchronize date_initial_tx_planning into patient_milestones
    await connection.query(
      `INSERT INTO patient_milestones (patient_id, date_initial_tx_planning)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE date_initial_tx_planning = VALUES(date_initial_tx_planning)`,
      [id, plan_date]
    );

    // Record milestone history
    await connection.query(
      `INSERT INTO patient_milestone_history (patient_id, milestone_key, milestone_date, recorded_by)
       VALUES (?, 'date_initial_tx_planning', ?, ?)`,
      [id, plan_date, req.user.id]
    ).catch(() => {});

    // Audit log
    const [[pRow]] = await connection.query("SELECT full_name FROM patients WHERE id = ?", [id]);
    await connection.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patients', ?)",
      [
        req.user?.username || "Staff",
        `Formulated/Updated Individualized Treatment Plan (ITP) for patient "${pRow?.full_name || `#${id}`}"`,
        id
      ]
    );

    await connection.commit();
    res.json({ message: "Individualized Treatment Plan saved successfully and synchronized with clinical milestones." });
  } catch (err) {
    await connection.rollback();
    console.error("Error in saveTreatmentPlan:", err);
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({
        message: "The patient_treatment_plans table does not exist in MySQL. Please run the CREATE TABLE statement in MySQL Workbench first."
      });
    }
    res.status(500).json({ message: "Could not save treatment plan." });
  } finally {
    connection.release();
  }
}

// ==========================================
// CBT-E EVALUATIONS (ENTREPOSE Vol. 1 Sec 5.3 & Vol. 2A)
// ==========================================
function safeParseJson(val) {
  if (!val) return null;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}

export async function getPatientCbteEvaluations(req, res) {
  const { id } = req.params;
  try {
    await ensureCbteAndRiskSchema();
    const [tables] = await pool.query("SHOW TABLES LIKE 'patient_cbte_evaluations'");
    if (tables.length === 0) {
      return res.json({ evaluations: [] });
    }

    const [rows] = await pool.query(
      `SELECT e.*, COALESCE(e.evaluator_name, u.full_name, 'Authorized Evaluator') AS evaluator_name
       FROM patient_cbte_evaluations e
       LEFT JOIN users u ON u.id = e.evaluator_id
       WHERE e.patient_id = ?
       ORDER BY e.evaluation_date DESC, e.id DESC`,
      [id]
    );

    const parsed = rows.map((r) => ({
      ...r,
      worksheet_responses_json: safeParseJson(r.worksheet_responses_json),
      recovery_domains_json: safeParseJson(r.recovery_domains_json),
      coping_skills_json: safeParseJson(r.coping_skills_json),
    }));

    res.json({ evaluations: parsed });
  } catch (err) {
    console.error("Error in getPatientCbteEvaluations:", err);
    res.status(500).json({ message: "Could not retrieve CBT-E evaluations." });
  }
}

export async function savePatientCbteEvaluation(req, res) {
  const { id } = req.params;
  const {
    evaluationType,
    evaluationDate,
    evaluatorName,
    formBasis,
    approvedByClinicalLead,
    adaptationNotes,
    selfReportedStatus,
    staffRiskAssessment,
    worksheetResponsesJson,
    recoveryDomainsJson,
    copingSkillsJson,
    lifeGoalsText,
    clinicalJudgment,
    evaluatorRemarks,
  } = req.body;

  if (!evaluationType || !evaluationDate) {
    return res.status(400).json({ message: "Evaluation type and assessment date are required." });
  }
  if (!clinicalJudgment) {
    return res.status(400).json({
      message: "Please select an explicit Staff Clinical Assessment / Recommendation before saving.",
    });
  }
  if (!selfReportedStatus) {
    return res.status(400).json({
      message: "Please record the client's self-reported craving / relapse risk status before saving.",
    });
  }

  const normalizedSelfStatus = normalizeSelfReportedRisk(selfReportedStatus);
  const normalizedStaffRisk = normalizeStaffRiskAssessment(staffRiskAssessment);
  const resolvedEvaluatorName =
    String(evaluatorName || "").trim() || req.user?.full_name || req.user?.username || "Authorized Evaluator";
  const resolvedFormBasis =
    formBasis === "MTRC_APPROVED_LOCAL_ADAPTATION"
      ? "MTRC_APPROVED_LOCAL_ADAPTATION"
      : "SUPPLIED_ENTREPOSE_WORKSHEET";

  const connection = await pool.getConnection();
  try {
    await ensureCbteAndRiskSchema(connection);
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO patient_cbte_evaluations
        (patient_id, evaluation_type, evaluation_date, evaluator_id, evaluator_name,
         form_basis, approved_by_clinical_lead, adaptation_notes,
         self_reported_status, staff_risk_assessment, worksheet_responses_json,
         recovery_domains_json, coping_skills_json, life_goals_text,
         overall_score, clinical_judgment, evaluator_remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      [
        id,
        evaluationType,
        evaluationDate,
        req.user.id,
        resolvedEvaluatorName,
        resolvedFormBasis,
        approvedByClinicalLead ? String(approvedByClinicalLead).trim() : null,
        adaptationNotes ? String(adaptationNotes).trim() : null,
        normalizedSelfStatus,
        normalizedStaffRisk,
        worksheetResponsesJson ? JSON.stringify(worksheetResponsesJson) : null,
        recoveryDomainsJson ? JSON.stringify(recoveryDomainsJson) : null,
        copingSkillsJson ? JSON.stringify(copingSkillsJson) : null,
        lifeGoalsText ? String(lifeGoalsText).trim() : null,
        clinicalJudgment,
        evaluatorRemarks ? String(evaluatorRemarks).trim() : null,
      ]
    );

    // Synchronize clinical milestones
    if (evaluationType === "CBTE_1") {
      await connection.query(
        `INSERT INTO patient_milestones (patient_id, date_initial_assessment)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE date_initial_assessment = COALESCE(date_initial_assessment, VALUES(date_initial_assessment))`,
        [id, evaluationDate]
      );
    } else if (evaluationType === "CBTE_2") {
      await connection.query(
        `INSERT INTO patient_milestones (patient_id, date_followup_assessment)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE date_followup_assessment = VALUES(date_followup_assessment)`,
        [id, evaluationDate]
      );
    } else if (evaluationType === "CBTE_3") {
      await connection.query(
        `INSERT INTO patient_milestones (patient_id, date_acp_planning)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE date_acp_planning = VALUES(date_acp_planning)`,
        [id, evaluationDate]
      );
    }

    const [[pRow]] = await connection.query("SELECT full_name FROM patients WHERE id = ?", [id]);
    await connection.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patients', ?)",
      [
        req.user?.username || "Staff",
        `Recorded ${evaluationType} evaluation (${resolvedFormBasis}) for patient "${pRow?.full_name || `#${id}`}" — Self-Reported: ${normalizedSelfStatus}, Staff Judgment: ${clinicalJudgment}`,
        id,
      ]
    );

    await connection.commit();
    res.status(201).json({ id: result.insertId, message: `${evaluationType} evaluation recorded successfully.` });
  } catch (err) {
    await connection.rollback();
    console.error("Error in savePatientCbteEvaluation:", err);
    res.status(500).json({ message: "Could not save CBT-E evaluation." });
  } finally {
    connection.release();
  }
}

export async function updatePatientCbteEvaluation(req, res) {
  const { id, evalId } = req.params;
  const {
    evaluationType,
    evaluationDate,
    evaluatorName,
    formBasis,
    approvedByClinicalLead,
    adaptationNotes,
    selfReportedStatus,
    staffRiskAssessment,
    worksheetResponsesJson,
    recoveryDomainsJson,
    copingSkillsJson,
    lifeGoalsText,
    clinicalJudgment,
    evaluatorRemarks,
  } = req.body;

  if (!evaluationType || !evaluationDate || !clinicalJudgment || !selfReportedStatus) {
    return res.status(400).json({
      message: "Evaluation type, assessment date, self-reported status, and staff clinical judgment are required.",
    });
  }

  const normalizedSelfStatus = normalizeSelfReportedRisk(selfReportedStatus);
  const normalizedStaffRisk = normalizeStaffRiskAssessment(staffRiskAssessment);
  const resolvedEvaluatorName =
    String(evaluatorName || "").trim() || req.user?.full_name || req.user?.username || "Authorized Evaluator";
  const resolvedFormBasis =
    formBasis === "MTRC_APPROVED_LOCAL_ADAPTATION"
      ? "MTRC_APPROVED_LOCAL_ADAPTATION"
      : "SUPPLIED_ENTREPOSE_WORKSHEET";

  try {
    await ensureCbteAndRiskSchema();
    const [[existing]] = await pool.query(
      "SELECT * FROM patient_cbte_evaluations WHERE id = ? AND patient_id = ?",
      [evalId, id]
    );
    if (!existing) {
      return res.status(404).json({ message: "CBT-E evaluation record not found." });
    }

    await pool.query(
      `UPDATE patient_cbte_evaluations
       SET evaluation_type = ?,
           evaluation_date = ?,
           evaluator_name = ?,
           form_basis = ?,
           approved_by_clinical_lead = ?,
           adaptation_notes = ?,
           self_reported_status = ?,
           staff_risk_assessment = ?,
           worksheet_responses_json = ?,
           recovery_domains_json = ?,
           coping_skills_json = ?,
           life_goals_text = ?,
           overall_score = NULL,
           clinical_judgment = ?,
           evaluator_remarks = ?
       WHERE id = ? AND patient_id = ?`,
      [
        evaluationType,
        evaluationDate,
        resolvedEvaluatorName,
        resolvedFormBasis,
        approvedByClinicalLead ? String(approvedByClinicalLead).trim() : null,
        adaptationNotes ? String(adaptationNotes).trim() : null,
        normalizedSelfStatus,
        normalizedStaffRisk,
        worksheetResponsesJson ? JSON.stringify(worksheetResponsesJson) : null,
        recoveryDomainsJson ? JSON.stringify(recoveryDomainsJson) : null,
        copingSkillsJson ? JSON.stringify(copingSkillsJson) : null,
        lifeGoalsText ? String(lifeGoalsText).trim() : null,
        clinicalJudgment,
        evaluatorRemarks ? String(evaluatorRemarks).trim() : null,
        evalId,
        id,
      ]
    );

    const [[pRow]] = await pool.query("SELECT full_name FROM patients WHERE id = ?", [id]);
    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patients', ?)",
      [
        req.user?.username || "Staff",
        `Updated ${evaluationType} evaluation #${evalId} for patient "${pRow?.full_name || `#${id}`}"`,
        id,
      ]
    );

    res.json({ message: `${evaluationType} evaluation updated.` });
  } catch (err) {
    console.error("Error in updatePatientCbteEvaluation:", err);
    res.status(500).json({ message: "Could not update CBT-E evaluation." });
  }
}

// ==========================================
// COURT PROGRESS REPORTS (Vol. 1 Sec 7.2 & MTRC Ref Sec 08)
// ==========================================
export async function getCourtReportData(req, res) {
  const { id } = req.params;
  const { reportType = "INITIAL" } = req.query;

  try {
    // 1. Patient & Referral Profile
    const [[patient]] = await pool.query(
      `SELECT p.id, p.full_name, p.patient_code, p.pwud_code, p.gender, p.civil_status,
              p.birthdate, p.municipality, p.admission_date, p.admission_type, p.enrollment_status,
              p.assigned_case_manager_id, u.full_name AS case_manager_name,
              r.referring_organization, r.referring_professional, r.nature_of_confinement,
              r.dde_severity_diagnosis
       FROM patients p
       LEFT JOIN users u ON u.id = p.assigned_case_manager_id
       LEFT JOIN patient_referrals r ON r.patient_id = p.id
       WHERE p.id = ?`,
      [id]
    );

    if (!patient) return res.status(404).json({ message: "Patient not found." });

    // 2. Unified Curriculum & Attendance Summary
    const curriculumProgress = await getUnifiedPatientProgress(pool, id);
    const totalNonCancelled =
      curriculumProgress.tallies.totalPhysicalAttended +
      curriculumProgress.tallies.absentCount +
      curriculumProgress.tallies.excusedCount;
    const attStatsObj = {
      total_recorded: totalNonCancelled,
      present_count: curriculumProgress.tallies.totalPhysicalAttended,
      absent_count: curriculumProgress.tallies.absentCount,
      late_count: curriculumProgress.tallies.lateCount,
      excused_count: curriculumProgress.tallies.excusedCount,
      cbt_count: curriculumProgress.components.cbt.completed,
      cbte_count: curriculumProgress.components.cbte.completed,
      pe_count: curriculumProgress.components.pe.completed,
      core_completed: curriculumProgress.components.totalCore.completed,
      core_required: curriculumProgress.components.totalCore.required,
      shgm_count: curriculumProgress.supplementary.shgm,
      individual_count: curriculumProgress.supplementary.indCounseling,
      family_count: curriculumProgress.supplementary.conjointFamily,
    };

    // 3. Relapse Risk Counts (preserving distinction between Near-Use/Craving and Actual Use)
    await ensureCbteAndRiskSchema();
    let relapseStats = { safe: 0, atRisk: 0, nearlyUsed: 0, used: 0 };
    let staffRiskStats = { lowRisk: 0, moderateRisk: 0, highRisk: 0, acuteRisk: 0 };
    const [attCols] = await pool.query("SHOW COLUMNS FROM attendance");
    const attColNames = attCols.map((c) => c.Field);
    if (attColNames.includes("relapse_risk")) {
      const hasStaffRiskCol = attColNames.includes("staff_risk_assessment");
      const [[rs]] = await pool.query(
        `SELECT 
           SUM(relapse_risk = 'SAFE') as safe_count,
           SUM(relapse_risk = 'AT_RISK') as at_risk_count,
           SUM(relapse_risk = 'NEARLY_USED') as nearly_used_count,
           SUM(relapse_risk = 'USED') as used_count
           ${
             hasStaffRiskCol
               ? `, SUM(staff_risk_assessment = 'LOW_RISK') as low_risk_count,
                    SUM(staff_risk_assessment = 'MODERATE_RISK') as mod_risk_count,
                    SUM(staff_risk_assessment = 'HIGH_RISK') as high_risk_count,
                    SUM(staff_risk_assessment = 'ACUTE_RELAPSE_RISK') as acute_risk_count`
               : ""
           }
         FROM attendance WHERE patient_id = ?`,
        [id]
      );
      relapseStats = {
        safe: Number(rs?.safe_count) || 0,
        atRisk: Number(rs?.at_risk_count) || 0,
        nearlyUsed: Number(rs?.nearly_used_count) || 0,
        used: Number(rs?.used_count) || 0,
      };
      if (hasStaffRiskCol) {
        staffRiskStats = {
          lowRisk: Number(rs?.low_risk_count) || 0,
          moderateRisk: Number(rs?.mod_risk_count) || 0,
          highRisk: Number(rs?.high_risk_count) || 0,
          acuteRisk: Number(rs?.acute_risk_count) || 0,
        };
      }
    }

    // 4. Drug Tests
    const [drugTests] = await pool.query(
      `SELECT test_date, test_type, substance_tested, result, remarks
       FROM drug_test_logs WHERE patient_id = ? ORDER BY test_date ASC`,
      [id]
    );

    // 5. Milestones
    const [[milestones]] = await pool.query(
      `SELECT * FROM patient_milestones WHERE patient_id = ?`,
      [id]
    );

    // 6. Latest Treatment Plan
    let treatmentPlan = null;
    const [tpTables] = await pool.query("SHOW TABLES LIKE 'patient_treatment_plans'");
    if (tpTables.length > 0) {
      const [[tp]] = await pool.query(
        `SELECT * FROM patient_treatment_plans WHERE patient_id = ? ORDER BY plan_date DESC LIMIT 1`,
        [id]
      );
      treatmentPlan = tp || null;
    }

    // Calculate months elapsed & patient-specific duration requirement
    await ensureProgramDurationSchema();
    const durationSummary = evaluatePatientDuration(patient);
    const daysElapsed = durationSummary?.daysElapsed ?? 0;
    const monthsElapsed = durationSummary?.monthsElapsed ?? 0;
    const reqMonths = durationSummary?.totalRequiredMonths ?? 7;
    const basisLabel = durationSummary?.durationBasisLabel || "Standard ENTREPOSE Program";

    // Generate Standardized Recommendation Template based on Report Type & Patient-Specific Mandated Duration
    let defaultRecommendation = "";
    if (reportType === "INITIAL") {
      defaultRecommendation = `The client, ${patient.full_name}, has completed official intake and orientation, actively formulating their Individualized Treatment Plan (ITP) under a ${reqMonths}-month requirement (${basisLabel}; Expected Completion: ${durationSummary?.expectedCompletionDate || "—"}). Baseline urine drug testing and initial sessions demonstrate satisfactory orientation and compliance. Respectfully recommended that outpatient rehabilitation under the ENTREPOSE program be continued with mandatory monitoring.`;
    } else if (reportType === "MIDTERM") {
      const attRate = attStatsObj.total_recorded ? Math.round((attStatsObj.present_count / attStatsObj.total_recorded) * 100) : 0;
      defaultRecommendation = `At the midterm evaluation (${monthsElapsed} of ${reqMonths} required months elapsed — ${basisLabel}), client has demonstrated ${attRate}% attendance rate with ${attStatsObj.core_completed}/43 core curriculum requirements credited (CBT: ${attStatsObj.cbt_count}/28, CBT-E: ${attStatsObj.cbte_count}/3, PE: ${attStatsObj.pe_count}/12). Routine urine screening remains non-reactive. It is respectfully recommended that client be maintained on treatment towards expected completion (${durationSummary?.expectedCompletionDate || "—"}).`;
    } else {
      const isBothComplete = Boolean(curriculumProgress.isCoreComplete && durationSummary?.isDurationMet);
      defaultRecommendation = isBothComplete
        ? `Having completed the mandated ${reqMonths}-month ENTREPOSE outpatient requirement (${basisLabel}) with all 43 core requirements credited (28/28 CBT, 3/3 CBT-E, 12/12 PE), certified negative urine drug surveillance records, and completed Pre-Discharge Conference (PDC), it is respectfully recommended that the client be awarded the Certificate of Completion and formally endorsed to the 9-Month Community Aftercare Program (OP-ACP).`
        : `Client currently holds ${attStatsObj.core_completed}/43 credited core requirements (CBT: ${attStatsObj.cbt_count}/28, CBT-E: ${attStatsObj.cbte_count}/3, PE: ${attStatsObj.pe_count}/12) and has completed ${monthsElapsed} of ${reqMonths} mandated months (${basisLabel}; Expected Completion: ${durationSummary?.expectedCompletionDate || "—"}). ${curriculumProgress.missingRequirements.summaryText}`;
    }

    res.json({
      patient,
      attendance: attStatsObj,
      curriculumProgress,
      durationSummary,
      relapseStats,
      staffRiskStats,
      drugTests,
      milestones: milestones || {},
      treatmentPlan,
      monthsElapsed,
      daysElapsed,
      defaultRecommendation,
      reportType
    });
  } catch (err) {
    console.error("Error in getCourtReportData:", err);
    res.status(500).json({ message: "Could not compile court progress report data." });
  }
}

export async function saveCourtReport(req, res) {
  const { id } = req.params;
  const {
    reportType,
    courtBranch,
    criminalCaseNo,
    presidingJudge,
    reportDate,
    attendanceSummaryJson,
    drugTestSummaryJson,
    clinicalProgressNarrative,
    caseManagerRecommendation
  } = req.body;

  if (!reportType || !reportDate || !clinicalProgressNarrative) {
    return res.status(400).json({ message: "Report type, report date, and clinical narrative are required." });
  }

  const connection = await pool.getConnection();
  try {
    const year = new Date().getFullYear().toString().slice(-2);
    const typeCode = reportType === "INITIAL" ? "INIT" : reportType === "MIDTERM" ? "MID" : "FNL";
    const controlNo = `CPR-${typeCode}-${year}-${String(Date.now()).slice(-5)}`;

    const [tables] = await connection.query("SHOW TABLES LIKE 'court_progress_reports'");
    if (tables.length > 0) {
      await connection.query(
        `INSERT INTO court_progress_reports
          (patient_id, report_type, report_control_no, court_branch, criminal_case_no,
           presiding_judge, report_date, prepared_by, attendance_summary_json,
           drug_test_summary_json, clinical_progress_narrative, case_manager_recommendation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          reportType,
          controlNo,
          courtBranch || null,
          criminalCaseNo || null,
          presidingJudge || null,
          reportDate,
          req.user.id,
          attendanceSummaryJson ? JSON.stringify(attendanceSummaryJson) : null,
          drugTestSummaryJson ? JSON.stringify(drugTestSummaryJson) : null,
          clinicalProgressNarrative,
          caseManagerRecommendation
        ]
      );
    }

    // Auto-update corresponding milestone date
    if (reportType === "INITIAL") {
      await connection.query(
        `INSERT INTO patient_milestones (patient_id, date_initial_progress_report)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE date_initial_progress_report = VALUES(date_initial_progress_report)`,
        [id, reportDate]
      );
    } else if (reportType === "MIDTERM") {
      await connection.query(
        `INSERT INTO patient_milestones (patient_id, date_status_reporting)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE date_status_reporting = VALUES(date_status_reporting)`,
        [id, reportDate]
      );
    } else if (reportType === "FINAL") {
      await connection.query(
        `INSERT INTO patient_milestones (patient_id, date_final_progress_report)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE date_final_progress_report = VALUES(date_final_progress_report)`,
        [id, reportDate]
      );
    }

    const [[patient]] = await connection.query("SELECT full_name FROM patients WHERE id = ?", [id]);
    await connection.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patients', ?)",
      [
        req.user.username,
        `Generated ${reportType} Court Progress Report (${controlNo}) for ${patient?.full_name || `#${id}`}`,
        id
      ]
    );

    res.status(201).json({ success: true, controlNo, message: `${reportType} Court Progress Report successfully generated and milestone updated.` });
  } catch (err) {
    console.error("Error in saveCourtReport:", err);
    res.status(500).json({ message: "Could not save court progress report." });
  } finally {
    connection.release();
  }
}

// ==========================================
// INTERVENTIONS & CONSULTATIONS (Task 7: Record More Than Attendance)
// ==========================================
export async function getPatientInterventions(req, res) {
  const { id } = req.params;
  try {
    await ensureInterventionSchema();
    const [rows] = await pool.query(
      `SELECT i.*, u.full_name as recorder_name
       FROM patient_interventions i
       LEFT JOIN users u ON u.id = i.recorded_by
       WHERE i.patient_id = ?
       ORDER BY i.intervention_date DESC, i.id DESC`,
      [id]
    );

    const summary = {
      total: rows.length,
      homeVisits: rows.filter((r) => r.intervention_type === "HOME_VISIT").length,
      consultations: rows.filter(
        (r) => r.intervention_type === "CONSULTATION_INTERNAL" || Boolean(r.consult_type)
      ).length,
      familyCoordination: rows.filter((r) => r.intervention_type === "FAMILY_COORDINATION").length,
      caseConferences: rows.filter((r) => r.intervention_type === "CASE_CONFERENCE").length,
      statusReports: rows.filter((r) => r.intervention_type === "STATUS_REPORT_PREP").length,
      outsideReferrals: rows.filter((r) => r.intervention_type === "REFERRAL_OUTSIDE").length,
      treatmentPlanning: rows.filter((r) => r.intervention_type === "TREATMENT_PLANNING").length,
      assessments: rows.filter((r) => r.intervention_type === "ASSESSMENT_CLINICAL").length,
    };

    res.json({ interventions: rows, summary });
  } catch (err) {
    console.error("Error in getPatientInterventions:", err);
    res.status(500).json({ message: "Could not retrieve patient interventions." });
  }
}

export async function addPatientIntervention(req, res) {
  const { id } = req.params;
  const {
    interventionDate,
    interventionType,
    consultType,
    responsibleStaffId,
    responsibleStaffName,
    locationSetting,
    qualifiesForTracker = 1,
    remarks,
  } = req.body;

  if (!interventionDate || !interventionType || !responsibleStaffName) {
    return res.status(400).json({
      message: "Intervention date, type, and responsible staff member name are required.",
    });
  }

  const connection = await pool.getConnection();
  try {
    await ensureInterventionSchema(connection);
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO patient_interventions
        (patient_id, intervention_date, intervention_type, consult_type,
         responsible_staff_id, responsible_staff_name, location_setting,
         qualifies_for_monthly_tracker, remarks, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        interventionDate,
        interventionType,
        consultType || null,
        responsibleStaffId || req.user.id,
        String(responsibleStaffName).trim(),
        locationSetting || null,
        qualifiesForTracker ? 1 : 0,
        remarks ? String(remarks).trim() : null,
        req.user.id,
      ]
    );

    // If this intervention is a consultation, also log to patient_consult_logs for parity
    if (interventionType === "CONSULTATION_INTERNAL" || consultType) {
      await connection.query(
        `INSERT INTO patient_consult_logs
          (patient_id, consult_date, consult_type, notes, recorded_by)
         VALUES (?, ?, ?, ?, ?)`,
        [
          id,
          interventionDate,
          consultType || "M",
          remarks || `Consultation recorded: ${responsibleStaffName}`,
          req.user.id,
        ]
      ).catch(() => {});
    }

    // If this intervention corresponds to a recognized clinical milestone, synchronize history & latest milestone date
    const typeDef = INTERVENTION_TYPES.find((t) => t.value === interventionType);
    if (typeDef?.milestoneKey) {
      const milestoneCol = typeDef.milestoneKey;
      await connection.query(
        `INSERT INTO patient_milestone_history
          (patient_id, milestone_key, milestone_date, recorded_by)
         VALUES (?, ?, ?, ?)`,
        [id, milestoneCol, interventionDate, req.user.id]
      ).catch(() => {});

      await connection.query(
        `INSERT INTO patient_milestones (patient_id, ${milestoneCol})
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE ${milestoneCol} = GREATEST(COALESCE(${milestoneCol}, VALUES(${milestoneCol})), VALUES(${milestoneCol}))`,
        [id, interventionDate]
      ).catch(() => {});
    }

    const [[pRow]] = await connection.query("SELECT full_name FROM patients WHERE id = ?", [id]);
    await connection.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patients', ?)",
      [
        req.user.username,
        `Recorded ${interventionType} on ${interventionDate} by ${responsibleStaffName} for patient "${pRow?.full_name || `#${id}`}"`,
        id,
      ]
    );

    await connection.commit();
    res.status(201).json({
      id: result.insertId,
      message: "Intervention recorded successfully and synchronized with monthly tracker.",
    });
  } catch (err) {
    await connection.rollback();
    console.error("Error in addPatientIntervention:", err);
    res.status(500).json({ message: "Could not save intervention." });
  } finally {
    connection.release();
  }
}

export async function updatePatientIntervention(req, res) {
  const { id, interventionId } = req.params;
  const {
    interventionDate,
    interventionType,
    consultType,
    responsibleStaffName,
    locationSetting,
    qualifiesForTracker = 1,
    remarks,
  } = req.body;

  try {
    await ensureInterventionSchema();
    const [[existing]] = await pool.query(
      "SELECT * FROM patient_interventions WHERE id = ? AND patient_id = ?",
      [interventionId, id]
    );
    if (!existing) {
      return res.status(404).json({ message: "Intervention record not found." });
    }

    await pool.query(
      `UPDATE patient_interventions
       SET intervention_date = ?,
           intervention_type = ?,
           consult_type = ?,
           responsible_staff_name = ?,
           location_setting = ?,
           qualifies_for_monthly_tracker = ?,
           remarks = ?
       WHERE id = ? AND patient_id = ?`,
      [
        interventionDate || existing.intervention_date,
        interventionType || existing.intervention_type,
        consultType !== undefined ? consultType : existing.consult_type,
        responsibleStaffName || existing.responsible_staff_name,
        locationSetting !== undefined ? locationSetting : existing.location_setting,
        qualifiesForTracker !== undefined ? (qualifiesForTracker ? 1 : 0) : existing.qualifies_for_monthly_tracker,
        remarks !== undefined ? remarks : existing.remarks,
        interventionId,
        id,
      ]
    );

    res.json({ message: "Intervention record updated." });
  } catch (err) {
    console.error("Error in updatePatientIntervention:", err);
    res.status(500).json({ message: "Could not update intervention." });
  }
}

export async function deletePatientIntervention(req, res) {
  const { id, interventionId } = req.params;
  try {
    await ensureInterventionSchema();
    const [result] = await pool.query(
      "DELETE FROM patient_interventions WHERE id = ? AND patient_id = ?",
      [interventionId, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Intervention record not found." });
    }
    res.json({ message: "Intervention record deleted." });
  } catch (err) {
    console.error("Error in deletePatientIntervention:", err);
    res.status(500).json({ message: "Could not delete intervention." });
  }
}
