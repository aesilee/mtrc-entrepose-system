import pool from "../config/db.js";
import { notifyRoles } from "../utils/notify.js";
import { recordPatientStatusChange } from "../utils/historicalReportSchema.js";
import { getCompletionGuardFailures, isEnrolledActive } from "../utils/completionGuards.js";
import { legacyDischargeReasonCode, isCompleterOutcome, enrollmentStatusForOutcome } from "../utils/classification.js";

function cleanText(value) {
  return typeof value === "string" ? value.trim() : value;
}

// List all discharges, optionally filtered by program_type
export async function listDischarges(req, res) {
  const { programType, patientId } = req.query;

  try {
    let query = `
      SELECT d.id, d.patient_id, d.program_type, d.discharge_type, d.discharge_date,
             d.remarks, d.discharged_by, d.created_at,
             p.full_name, p.patient_code
      FROM discharges d
      JOIN patients p ON p.id = d.patient_id
    `;
    const params = [];

        const conditions = [];
    if (programType) {
      conditions.push("d.program_type = ?");
      params.push(programType);
    }
    if (patientId) {
      conditions.push("d.patient_id = ?");
      params.push(patientId);
    }
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY d.discharge_date DESC";

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not retrieve discharge records." });
  }
}

// Get a single discharge record by id
export async function getDischarge(req, res) {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT d.*, p.full_name, p.patient_code
       FROM discharges d
       JOIN patients p ON p.id = d.patient_id
       WHERE d.id = ?`,
      [id]
    );

    if (!rows[0]) return res.status(404).json({ message: "Discharge record not found." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not retrieve discharge record." });
  }
}

// Create a new discharge record (Findings 6 & 7: Exact outcome code check & atomic transaction)
export async function createDischarge(req, res) {
  const { patientId, programType, dischargeType, dischargeDate, remarks, outcome } = req.body;

  if (!patientId || !programType || !dischargeType || !dischargeDate) {
    return res.status(400).json({ message: "Patient, program type, discharge type, and discharge date are required." });
  }

  // Exact comparison & canonical code evaluation (Finding 6: NON_COMPLETER is never counted as completer)
  const isCompleter = isCompleterOutcome(outcome || dischargeType, remarks);
  const outcomeCode = isCompleter ? "COMPLETER" : "NON_COMPLETER";
  const reasonCode = legacyDischargeReasonCode(remarks || dischargeType) || (isCompleter ? "COMPLETED_PROGRAM" : "NON_COMPLIANCE");

  const isAttritionRemarks = /non-compliance|abscond|drop|expel|arrest|buy-bust|incarcerat|death/i.test(remarks || "");
  if (isCompleter && isAttritionRemarks) {
    return res.status(400).json({ message: "Incompatible discharge status: A Completer cannot have non-compliance or disciplinary remarks." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[patient]] = await connection.query(
      "SELECT full_name, patient_code FROM patients WHERE id = ? FOR UPDATE",
      [patientId]
    );

    if (!patient) {
      await connection.rollback();
      return res.status(404).json({ message: "Patient not found." });
    }

    const [[existing]] = await connection.query(
      "SELECT id FROM discharges WHERE patient_id = ?",
      [patientId]
    );
    if (existing) {
      await connection.rollback();
      return res.status(409).json({ message: "This patient has already been discharged." });
    }

    // Lock the patient row; refuse a second discharge or a discharge of a non-active patient.
    const [[dischargeTarget]] = await connection.query(
      "SELECT id, enrollment_status FROM patients WHERE id = ? FOR UPDATE",
      [patientId]
    );
    if (!dischargeTarget) {
      await connection.rollback();
      return res.status(404).json({ message: "Patient not found." });
    }
    const [[priorDischarge]] = await connection.query(
      "SELECT id FROM discharges WHERE patient_id = ? UNION SELECT id FROM patient_discharges WHERE patient_id = ? LIMIT 1",
      [patientId, patientId]
    );
    if (priorDischarge || !isEnrolledActive(dischargeTarget.enrollment_status)) {
      await connection.rollback();
      return res.status(409).json({ message: "This patient has already been discharged or is not actively enrolled." });
    }
    // A Completer discharge must meet the same statutory rules as the Certificate of Completion.
    if (isCompleter) {
      const unmet = await getCompletionGuardFailures(connection, patientId);
      if (unmet.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          message: "Patient does not yet meet the completion requirements. Discharge as Completer is not allowed.",
          guards: unmet,
        });
      }
    }

    const [result] = await connection.query(
      `INSERT INTO discharges (patient_id, program_type, discharge_type, discharge_date, remarks, discharged_by, outcome, reason_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [patientId, programType, isCompleter ? "Completer" : "Non-Completer", dischargeDate, cleanText(remarks) || null, req.user.username, outcomeCode, reasonCode]
    );

    // Harmonize patient enrollment_status and mirror to patient_discharges for reporting
    const enrollmentStatus = enrollmentStatusForOutcome(outcomeCode);
    await connection.query(
      "UPDATE patients SET enrollment_status = ?, current_status = ? WHERE id = ?",
      [enrollmentStatus, enrollmentStatus, patientId]
    );

    // Synchronize historical status change without swallowing errors (Finding 7)
    await recordPatientStatusChange(connection, {
      patientId,
      newStatus: enrollmentStatus,
      effectiveDate: dischargeDate,
      reason: `Discharged: ${isCompleter ? "Completer" : "Non-Completer"}${remarks ? ` — ${remarks}` : ""}`,
      changedBy: req.user.id,
    });

    // Synchronize to patient_discharges without swallowing errors (Finding 7)
    await connection.query(
      `INSERT INTO patient_discharges (patient_id, discharge_date, status, reason, outcome, reason_code, intervention_upon_discharge)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patientId, dischargeDate, isCompleter ? "Completer" : "Non-Completer", cleanText(remarks) || dischargeType, outcomeCode, reasonCode, cleanText(remarks) || null]
    );

    await connection.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, ?, ?)",
      [req.user.username, `Discharged patient "${patient.full_name}" (${programType} — ${dischargeType})`, "discharges", result.insertId]
    );

    await connection.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'patients', ?)",
      [req.user.username, `Discharged patient "${patient.full_name}" (${programType} — ${dischargeType})`, patientId]
    );

    await connection.commit();

    notifyRoles(
      ["ict_admin", "him_staff", "admitting"],
      "discharges",
      "patient_discharged",
      `Patient discharged: "${patient.full_name}" (${patient.patient_code}) — ${dischargeType} — by ${req.user.username}`
    ).catch(() => {});

    res.status(201).json({ id: result.insertId, message: "Discharge record created." });
  } catch (err) {
    await connection.rollback();
    console.error("Discharge error:", err);
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ message: "The discharges table migration has not been applied." });
    }
    res.status(500).json({ message: `Discharge synchronization failed: ${err.message}` });
  } finally {
    connection.release();
  }
}