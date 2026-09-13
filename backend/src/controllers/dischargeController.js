import pool from "../config/db.js";
import { notifyRoles } from "../utils/notify.js";

function cleanText(value) {
  return typeof value === "string" ? value.trim() : value;
}

// List all discharges, optionally filtered by program_type
export async function listDischarges(req, res) {
  const { programType } = req.query;

  try {
    let query = `
      SELECT d.id, d.patient_id, d.program_type, d.discharge_type, d.discharge_date,
             d.remarks, d.discharged_by, d.created_at,
             p.full_name, p.patient_code
      FROM discharges d
      JOIN patients p ON p.id = d.patient_id
    `;
    const params = [];

    if (programType) {
      query += " WHERE d.program_type = ?";
      params.push(programType);
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

// Create a new discharge record
export async function createDischarge(req, res) {
  const { patientId, programType, dischargeType, dischargeDate, remarks } = req.body;

  if (!patientId || !programType || !dischargeType || !dischargeDate) {
    return res.status(400).json({ message: "Patient, program type, discharge type, and discharge date are required." });
  }

  try {
    const [[patient]] = await pool.query(
      "SELECT full_name, patient_code FROM patients WHERE id = ?",
      [patientId]
    );

    if (!patient) return res.status(404).json({ message: "Patient not found." });

    const [result] = await pool.query(
      `INSERT INTO discharges (patient_id, program_type, discharge_type, discharge_date, remarks, discharged_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [patientId, programType, dischargeType, dischargeDate, cleanText(remarks) || null, req.user.username]
    );

    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, ?, ?)",
      [req.user.username, `Discharged patient "${patient.full_name}" (${programType} — ${dischargeType})`, "discharges", result.insertId]
    );

    await notifyRoles(
      ["ict_admin", "him_staff", "admitting"],
      "discharges",
      "patient_discharged",
      `Patient discharged: "${patient.full_name}" (${patient.patient_code}) — ${dischargeType} — by ${req.user.username}`
    );

    res.status(201).json({ id: result.insertId, message: "Discharge record created." });
  } catch (err) {
    console.error(err);
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ message: "The discharges table migration has not been applied." });
    }
    res.status(500).json({ message: "Could not create discharge record." });
  }
}