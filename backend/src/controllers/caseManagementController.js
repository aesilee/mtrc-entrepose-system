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
    res.json({ milestones: milestones || null });
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
      `SELECT d.*, DATEDIFF(d.test_date, p.admission_date) AS days_from_enrollment
       FROM drug_test_logs d
       JOIN patients p ON d.patient_id = p.id
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
  const { testDate, substanceTested, result, actionTaken, remarks } = req.body;
  try {
    await pool.query(
      `INSERT INTO drug_test_logs (patient_id, test_date, substance_tested, result, action_taken, remarks)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, testDate, substanceTested, result, actionTaken || null, remarks || null]
    );

    // Phase 1.3 & Phase 4 Alert: Positive Drug Test
    if (result === "POSITIVE") {
      const [[patient]] = await pool.query(
        "SELECT id, full_name, assigned_case_manager_id FROM patients WHERE id = ?",
        [id]
      );
      if (patient) {
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
      `SELECT p.id as patient_id, p.full_name, p.patient_code, p.photo_url 
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
        `SELECT date_pdc FROM patient_milestones WHERE patient_id = ?`,
        [p.patient_id]
      );

      if (sessions[0].cnt >= 43 && (!milestones || !milestones.date_pdc)) {
        flags.push({ ...p, issue: "43 Sessions Completed (Ready for PDC)", color: "blue" });
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

    const enrollmentStatus = status === 'Completer (Graduated)' ? 'completed' : 'dropped';
    const phaseUpdate = transitionToAftercare ? ", treatment_phase = 'Aftercare'" : "";

    await connection.query(
      `UPDATE patients SET enrollment_status = ? ${phaseUpdate} WHERE id = ?`,
      [enrollmentStatus, id]
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
