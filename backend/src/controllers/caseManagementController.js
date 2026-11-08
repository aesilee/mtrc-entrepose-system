import pool from "../config/db.js";
import { notifyUser, notifyRoles } from "../utils/notify.js";

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

// 2. Session Summary
export async function getSessionSummary(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT session_type, COUNT(*) as count 
       FROM attendance 
       WHERE patient_id = ? AND status = 'present'
       GROUP BY session_type`,
      [id]
    );
    
    let cbtGroup = 0, psychoEd = 0, shgm = 0, indCounseling = 0, conjointFamily = 0;
    rows.forEach((r) => {
      switch (r.session_type) {
        case 'CBT_GROUP': cbtGroup = r.count; break;
        case 'PSYCHO_EDUCATION': psychoEd = r.count; break;
        case 'SHGM': shgm = r.count; break;
        case 'INDIVIDUAL_COUNSELING': indCounseling = r.count; break;
        case 'CONJOINT_FAMILY': conjointFamily = r.count; break;
      }
    });

    const attendedCore = cbtGroup + psychoEd; // Note: Assuming CBT-E falls under CBT_GROUP or is tracked separately. Adjusting based on logic.
    const percentage = Math.min(100, Math.round((attendedCore / 43) * 100));

    res.json({ 
      cbtGroup, 
      psychoEd, 
      shgm, 
      indCounseling, 
      conjointFamily,
      attendedCore,
      percentage 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not fetch session summary." });
  }
}

// 3. Log Session & SOAP Note
export async function logSessionWithNote(req, res) {
  const { 
    patientId, sessionDate, sessionType, status, remarks, 
    subjective, objective, assessment, plan 
  } = req.body;
  
  if (!patientId || !sessionDate || !sessionType || !status) {
    return res.status(400).json({ message: "Missing required attendance fields." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Generate a placeholder session record just for this attendance if it doesn't exist,
    // or we can insert a dummy one, but we really just need attendance to map to a session ID.
    // Let's create a one-off session for this note.
    const [sessionResult] = await connection.query(
      `INSERT INTO sessions (session_name, session_type, case_manager_id, session_date, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionType, sessionType, req.user.id, sessionDate, req.user.id]
    );
    const sessionId = sessionResult.insertId;

    await connection.query(
      `INSERT INTO attendance (patient_id, session_id, session_date, session_type, status, notes, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patientId, sessionId, sessionDate, sessionType, status, remarks || null, req.user.id]
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
        if (status === "absent") {
          const [recentAtt] = await pool.query(
            "SELECT status FROM attendance WHERE patient_id = ? ORDER BY session_date DESC, id DESC LIMIT 2",
            [patientId]
          );
          if (recentAtt.length === 2 && recentAtt[0].status === "absent" && recentAtt[1].status === "absent") {
            await notifyUser(
              p.assigned_case_manager_id,
              "patients",
              "consecutive_absences",
              `Clinical Flag: "${p.full_name}" has accumulated 2 consecutive absences and requires clinical follow-up.`
            );
          }
        } else if (status === "present") {
          const [[{ coreCount }]] = await pool.query(
            `SELECT COUNT(*) as coreCount FROM attendance 
             WHERE patient_id = ? AND status = 'present' AND session_type IN ('CBT_GROUP', 'PSYCHO_EDUCATION')`,
            [patientId]
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

// 4. Surveillance Drug Testing
export async function getDrugTests(req, res) {
  const { id } = req.params;
  try {
    const [tests] = await pool.query(
      `SELECT d.*, u.full_name AS recorded_by_name, DATEDIFF(d.test_date, p.admission_date) AS days_from_enrollment
       FROM drug_test_logs d
       JOIN patients p ON d.patient_id = p.id
       LEFT JOIN users u ON u.id = d.recorded_by
       WHERE d.patient_id = ?
       ORDER BY d.test_date DESC`,
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
  const { testDate, testType, substanceTested, result, actionTaken, remarks } = req.body;
  try {
    await pool.query(
      `INSERT INTO drug_test_logs (patient_id, test_date, test_type, substance_tested, result, action_taken, remarks, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        testDate, 
        testType || "Random Screening", 
        substanceTested, 
        result, 
        actionTaken || null, 
        remarks || null,
        req.user?.id || null
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
        `Logged ${result} drug test (${substanceTested || "Screening"}) for patient "${patient?.full_name || `#${id}`}"`,
        id
      ]
    );

    // Phase 1.3 & Phase 4 Alert: Positive Drug Test
    if (result === "POSITIVE" && patient) {
      if (patient.assigned_case_manager_id) {
        await notifyUser(
          patient.assigned_case_manager_id,
          "patients",
          "positive_drug_test",
          `Clinical Alert: Patient "${patient.full_name}" tested POSITIVE for ${substanceTested}. Schedule case conference.`
        );
      }
      await notifyRoles(
        ["ict_admin", "him_staff"],
        "patients",
        "positive_drug_test",
        `Clinical Alert: Patient "${patient.full_name}" tested POSITIVE for ${substanceTested}.`
      );
    }

    res.json({ message: "Drug test logged successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not log drug test." });
  }
}

// 5. CM Dashboard Flags
export async function getAttentionFlags(req, res) {
  try {
    // 1. Find consecutive absences
    // 2. Find positive drug tests within 30 days
    // 3. Find milestone readiness
    // Due to MySQL complexity, we'll fetch active patients and evaluate basic flags
    
    const [patients] = await pool.query(
      `SELECT p.id as patient_id, p.full_name, p.patient_code, p.photo_url, p.admission_date 
       FROM patients p 
       WHERE p.assigned_case_manager_id = ? AND p.enrollment_status = 'active'`,
      [req.user.id]
    );

    const flags = [];

    for (const p of patients) {
      // Check absences
      const [attendance] = await pool.query(
        `SELECT status FROM attendance WHERE patient_id = ? ORDER BY session_date DESC LIMIT 2`,
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

      // Check milestones
      const [sessions] = await pool.query(
        `SELECT COUNT(*) as cnt FROM attendance 
         WHERE patient_id = ? AND status = 'present' AND session_type IN ('CBT_GROUP', 'PSYCHO_EDUCATION')`,
        [p.patient_id]
      );
      
      const [[milestones]] = await pool.query(
        `SELECT date_pdc, date_initial_progress_report FROM patient_milestones WHERE patient_id = ?`,
        [p.patient_id]
      );

      if (sessions[0].cnt >= 43 && (!milestones || !milestones.date_pdc)) {
        flags.push({ ...p, issue: "43 Sessions Completed (Ready for PDC)", color: "blue" });
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

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO patient_discharges (
        patient_id, discharge_date, status, reason, treatment_duration_months, 
        intervention_upon_discharge, court_notified, transition_to_aftercare
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, dischargeDate, status, reason, treatmentDurationMonths || 0,
        interventionUponDischarge || null, courtNotified ? 1 : 0, transitionToAftercare ? 1 : 0
      ]
    );

    // Mirror to discharges table so record appears on Discharged Patients page
    await connection.query(
      `INSERT INTO discharges (patient_id, program_type, discharge_type, discharge_date, remarks, discharged_by)
       VALUES (?, 'outpatient', ?, ?, ?, ?)`,
      [id, status, dischargeDate, reason || interventionUponDischarge || null, req.user?.username || req.user?.full_name || 'Staff']
    ).catch(() => {});

    // Automatically stamp date_pdc and optional date_acp_planning in patient_milestones
    await connection.query(
      `INSERT INTO patient_milestones (patient_id, date_pdc, date_acp_planning)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         date_pdc = COALESCE(date_pdc, VALUES(date_pdc)),
         date_acp_planning = CASE WHEN ? = 1 THEN COALESCE(date_acp_planning, VALUES(date_acp_planning)) ELSE date_acp_planning END`,
      [id, dischargeDate, transitionToAftercare ? dischargeDate : null, transitionToAftercare ? 1 : 0]
    ).catch(() => {});

    const enrollmentStatus = status === 'Completer (Graduated)' ? 'completed' : 'dropped';
    const phaseUpdate = transitionToAftercare ? ", program_phase = 'Aftercare'" : "";

    await connection.query(
      `UPDATE patients SET enrollment_status = ? ${phaseUpdate} WHERE id = ?`,
      [enrollmentStatus, id]
    );

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
    console.error(err);
    res.status(500).json({ message: "Could not discharge patient." });
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

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

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
          target_completion_date || null,
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
          target_completion_date || null,
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
export async function getPatientCbteEvaluations(req, res) {
  const { id } = req.params;
  try {
    const [tables] = await pool.query("SHOW TABLES LIKE 'patient_cbte_evaluations'");
    if (tables.length === 0) {
      return res.json({ evaluations: [] });
    }

    const [rows] = await pool.query(
      `SELECT e.*, u.full_name AS evaluator_name
       FROM patient_cbte_evaluations e
       LEFT JOIN users u ON u.id = e.evaluator_id
       WHERE e.patient_id = ?
       ORDER BY e.evaluation_date DESC, e.id DESC`,
      [id]
    );

    res.json({ evaluations: rows });
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
    recoveryDomainsJson,
    copingSkillsJson,
    lifeGoalsText,
    overallScore,
    clinicalJudgment,
    evaluatorRemarks
  } = req.body;

  if (!evaluationType || !evaluationDate) {
    return res.status(400).json({ message: "Evaluation type and date are required." });
  }

  const connection = await pool.getConnection();
  try {
    const [tables] = await connection.query("SHOW TABLES LIKE 'patient_cbte_evaluations'");
    if (tables.length === 0) {
      connection.release();
      return res.status(500).json({
        message: "The patient_cbte_evaluations table does not exist in MySQL. Please run the CREATE TABLE statement in MySQL Workbench first."
      });
    }

    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO patient_cbte_evaluations
        (patient_id, evaluation_type, evaluation_date, evaluator_id,
         recovery_domains_json, coping_skills_json, life_goals_text,
         overall_score, clinical_judgment, evaluator_remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        evaluationType,
        evaluationDate,
        req.user.id,
        recoveryDomainsJson ? JSON.stringify(recoveryDomainsJson) : null,
        copingSkillsJson ? JSON.stringify(copingSkillsJson) : null,
        lifeGoalsText || null,
        overallScore || null,
        clinicalJudgment || "ON_TRACK",
        evaluatorRemarks || null
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
        `Recorded ${evaluationType} evaluation for patient "${pRow?.full_name || `#${id}`}" (${clinicalJudgment})`,
        id
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

    // 2. Attendance Summary
    const [attStats] = await pool.query(
      `SELECT 
         COUNT(*) as total_recorded,
         SUM(status = 'present') as present_count,
         SUM(status = 'absent') as absent_count,
         SUM(status = 'late') as late_count,
         SUM(status = 'excused') as excused_count,
         SUM(session_type = 'CBT_GROUP' AND status = 'present') as cbt_count,
         SUM(session_type = 'PSYCHO_EDUCATION' AND status = 'present') as pe_count,
         SUM(session_type = 'SHGM' AND status = 'present') as shgm_count,
         SUM(session_type = 'INDIVIDUAL_COUNSELING' AND status = 'present') as individual_count,
         SUM(session_type = 'CONJOINT_FAMILY' AND status = 'present') as family_count
       FROM attendance WHERE patient_id = ?`,
      [id]
    );

    // 3. Relapse Risk Counts (from Schedule Book logs)
    let relapseStats = { safe: 0, atRisk: 0, used: 0 };
    const [attCols] = await pool.query("SHOW COLUMNS FROM attendance LIKE 'relapse_risk'");
    if (attCols.length > 0) {
      const [[rs]] = await pool.query(
        `SELECT 
           SUM(relapse_risk = 'SAFE') as safe_count,
           SUM(relapse_risk = 'AT_RISK') as at_risk_count,
           SUM(relapse_risk = 'USED') as used_count
         FROM attendance WHERE patient_id = ?`,
        [id]
      );
      relapseStats = {
        safe: Number(rs?.safe_count) || 0,
        atRisk: Number(rs?.at_risk_count) || 0,
        used: Number(rs?.used_count) || 0
      };
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

    // Calculate months elapsed
    const admDate = patient.admission_date ? new Date(patient.admission_date) : new Date();
    const now = new Date();
    const daysElapsed = Math.max(0, Math.floor((now - admDate) / (1000 * 60 * 60 * 24)));
    const monthsElapsed = Math.floor(daysElapsed / 30);

    // Generate Standardized Recommendation Template based on Report Type (7-Month Adjusted)
    let defaultRecommendation = "";
    if (reportType === "INITIAL") {
      defaultRecommendation = `The client, ${patient.full_name}, has completed official intake and orientation, actively formulating their Individualized Treatment Plan (ITP). Baseline urine drug testing and initial sessions demonstrate satisfactory orientation and compliance. Respectfully recommended that outpatient rehabilitation under the 7-month ENTREPOSE program be continued with mandatory bi-monthly monitoring.`;
    } else if (reportType === "MIDTERM") {
      const attRate = attStats[0]?.total_recorded ? Math.round((attStats[0].present_count / attStats[0].total_recorded) * 100) : 0;
      defaultRecommendation = `At the midterm evaluation (${monthsElapsed} months elapsed), client has demonstrated ${attRate}% attendance rate with continuous adherence to the cognitive-behavioral curriculum. Routine urine screening remains non-reactive. It is respectfully recommended that client be maintained on the second phase of treatment towards completion.`;
    } else {
      defaultRecommendation = `Having completed the full 7-month ENTREPOSE outpatient curriculum with 43 core sessions attended, certified negative urine drug surveillance records, and completed Pre-Discharge Conference (PDC), it is respectfully recommended that the client be awarded the Certificate of Completion and formally endorsed to the 9-Month Community Aftercare Program (OP-ACP).`;
    }

    res.json({
      patient,
      attendance: attStats[0] || {},
      relapseStats,
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
