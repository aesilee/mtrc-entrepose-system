import pool from "../config/db.js";

let historicalSchemaEnsured = false;

/**
 * Ensures schema tables for Task 9: Historical reports & effective date auditing:
 * 1. patient_case_manager_history: Tracks effective start and end dates of CM assignments.
 * 2. patient_status_history: Tracks effective enrollment status changes over time.
 * 3. report_snapshots: Preserves officially issued monthly report snapshots for HIM statutory compliance.
 */
export async function ensureHistoricalReportSchema(customConn = null) {
  if (historicalSchemaEnsured) return true;
  const db = customConn || pool;

  try {
    // 1. Table: patient_case_manager_history
    await db.query(`
      CREATE TABLE IF NOT EXISTS patient_case_manager_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        case_manager_id INT NULL,
        case_manager_name VARCHAR(150) NULL,
        start_date DATE NOT NULL,
        end_date DATE NULL,
        reason VARCHAR(255) NULL DEFAULT 'Initial Assignment',
        assigned_by INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pcmh_pt_dates (patient_id, start_date, end_date),
        INDEX idx_pcmh_cm (case_manager_id),
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(() => {});

    // 2. Table: patient_status_history
    await db.query(`
      CREATE TABLE IF NOT EXISTS patient_status_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        enrollment_status VARCHAR(50) NOT NULL,
        effective_date DATE NOT NULL,
        end_date DATE NULL,
        reason VARCHAR(255) NULL,
        changed_by INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_psh_pt_dates (patient_id, effective_date, end_date),
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(() => {});

    // 3. Table: report_snapshots
    await db.query(`
      CREATE TABLE IF NOT EXISTS report_snapshots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_type VARCHAR(50) NOT NULL DEFAULT 'OP_CM_TRACKER',
        reporting_month INT NOT NULL,
        reporting_year INT NOT NULL,
        case_manager_id INT NULL,
        case_manager_name VARCHAR(150) NULL,
        snapshot_title VARCHAR(255) NOT NULL,
        status ENUM('OFFICIAL_ISSUED', 'SUPERSEDED') NOT NULL DEFAULT 'OFFICIAL_ISSUED',
        version INT NOT NULL DEFAULT 1,
        summary_json JSON NOT NULL,
        grid_json JSON NULL,
        issued_by INT NOT NULL,
        issued_by_name VARCHAR(150) NULL DEFAULT 'Staff Member',
        notes TEXT NULL,
        issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rs_period (report_type, reporting_year, reporting_month, case_manager_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(() => {});

    // 4. Backfill existing patient case manager history if empty for existing patients
    const [existingCmHistory] = await db.query("SELECT COUNT(*) AS count FROM patient_case_manager_history").catch(() => [[{ count: 0 }]]);
    if (Number(existingCmHistory?.[0]?.count || 0) === 0) {
      await db.query(`
        INSERT INTO patient_case_manager_history (patient_id, case_manager_id, case_manager_name, start_date, end_date, reason)
        SELECT 
          p.id, 
          p.assigned_case_manager_id, 
          u.full_name,
          COALESCE(p.admission_date, DATE(p.created_at), CURRENT_DATE),
          NULL,
          'Initial historical migration'
        FROM patients p
        LEFT JOIN users u ON u.id = p.assigned_case_manager_id
        WHERE p.assigned_case_manager_id IS NOT NULL
      `).catch(() => {});
    }

    // 5. Backfill existing patient status history if empty
    const [existingStatusHistory] = await db.query("SELECT COUNT(*) AS count FROM patient_status_history").catch(() => [[{ count: 0 }]]);
    if (Number(existingStatusHistory?.[0]?.count || 0) === 0) {
      await db.query(`
        INSERT INTO patient_status_history (patient_id, enrollment_status, effective_date, end_date, reason)
        SELECT 
          p.id, 
          COALESCE(p.enrollment_status, 'active'),
          COALESCE(p.admission_date, DATE(p.created_at), CURRENT_DATE),
          (SELECT pd.discharge_date FROM patient_discharges pd WHERE pd.patient_id = p.id ORDER BY pd.discharge_date DESC LIMIT 1),
          'Initial historical migration'
        FROM patients p
      `).catch((err) => {
        console.warn("Backfill status history error:", err.message);
      });
    }

    historicalSchemaEnsured = true;
    return true;
  } catch (err) {
    console.warn("ensureHistoricalReportSchema warning:", err.message);
    return false;
  }
}

/**
 * Helper to record a new case manager assignment in history, closing the previous one.
 */
export async function recordCaseManagerAssignment(db, { patientId, newCaseManagerId, effectiveDate = null, reason = "Reassigned", assignedBy = null }) {
  const effDate = effectiveDate || new Date().toISOString().slice(0, 10);

  // Retrieve new Case Manager name
  let newCmName = "Unassigned";
  if (newCaseManagerId) {
    const [[cmUser]] = await db.query("SELECT full_name FROM users WHERE id = ?", [newCaseManagerId]).catch(() => [[]]);
    if (cmUser) newCmName = cmUser.full_name;
  }

  // Close previous open assignment for this patient
  await db.query(
    `UPDATE patient_case_manager_history
     SET end_date = ?
     WHERE patient_id = ? AND end_date IS NULL`,
    [effDate, patientId]
  ).catch(() => {});

  // Insert new active assignment
  await db.query(
    `INSERT INTO patient_case_manager_history
      (patient_id, case_manager_id, case_manager_name, start_date, end_date, reason, assigned_by)
     VALUES (?, ?, ?, ?, NULL, ?, ?)`,
    [patientId, newCaseManagerId || null, newCmName, effDate, reason, assignedBy || null]
  );
}

/**
 * Helper to record patient status change in history.
 */
export async function recordPatientStatusChange(db, { patientId, newStatus, effectiveDate = null, reason = null, changedBy = null }) {
  const effDate = effectiveDate || new Date().toISOString().slice(0, 10);

  // Close previous open status
  await db.query(
    `UPDATE patient_status_history
     SET end_date = ?
     WHERE patient_id = ? AND end_date IS NULL`,
    [effDate, patientId]
  ).catch(() => {});

  // Insert new active status
  await db.query(
    `INSERT INTO patient_status_history
      (patient_id, enrollment_status, effective_date, end_date, reason, changed_by)
     VALUES (?, ?, ?, NULL, ?, ?)`,
    [patientId, newStatus, effDate, reason, changedBy]
  );
}
