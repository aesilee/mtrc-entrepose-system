import pool from "../config/db.js";

/**
 * Archive / restore / cancel a single attendance record.
 *
 * Archiving MOVES the row into `attendance_archive` (same columns + archive metadata) instead of
 * flagging it. Every report, credit total and rate in the system reads the `attendance` table, so an
 * archived record drops out of all of them automatically, and restoring moves it back unchanged.
 */

let archiveTableReady = false;
export async function ensureAttendanceArchiveTable(db = pool) {
  if (archiveTableReady) return;
  await db.query("CREATE TABLE IF NOT EXISTS attendance_archive LIKE attendance");
  const [cols] = await db.query("SHOW COLUMNS FROM attendance_archive");
  const have = new Set(cols.map((c) => c.Field));
  if (!have.has("archived_at")) await db.query("ALTER TABLE attendance_archive ADD COLUMN archived_at DATETIME NULL");
  if (!have.has("archived_by")) await db.query("ALTER TABLE attendance_archive ADD COLUMN archived_by INT NULL");
  if (!have.has("archive_reason")) await db.query("ALTER TABLE attendance_archive ADD COLUMN archive_reason TEXT NULL");
  archiveTableReady = true;
}

// Columns present in both tables (the live table can gain columns through runtime migrations).
async function sharedColumns(db) {
  const [live] = await db.query("SHOW COLUMNS FROM attendance");
  const [arch] = await db.query("SHOW COLUMNS FROM attendance_archive");
  const archSet = new Set(arch.map((c) => c.Field));
  return live.map((c) => c.Field).filter((f) => archSet.has(f));
}

function label(row) {
  const date = row.session_date ? new Date(row.session_date).toISOString().slice(0, 10) : "";
  const text = `Attendance — ${row.patient_name || `Patient #${row.patient_id}`} · ${row.topic_name || row.curriculum_requirement || row.session_type || "Session"} · ${date}`;
  return text.slice(0, 250); // archives.entity_label is VARCHAR(255)
}

export async function archiveAttendance(req, res) {
  const id = Number(req.params.id);
  const reason = String(req.body?.reason || "").trim();
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid attendance record." });
  if (!reason) return res.status(400).json({ message: "Give a reason for archiving this attendance record." });

  const connection = await pool.getConnection();
  try {
    await ensureAttendanceArchiveTable(connection);
    await connection.beginTransaction();

    const [[row]] = await connection.query(
      `SELECT a.*, p.full_name AS patient_name FROM attendance a JOIN patients p ON p.id = a.patient_id WHERE a.id = ? FOR UPDATE`,
      [id]
    );
    if (!row) {
      await connection.rollback();
      return res.status(404).json({ message: "Attendance record not found." });
    }

    // A missed session that a makeup is linked to cannot disappear from under that makeup.
    const [[linkedMakeup]] = await connection.query(
      "SELECT id FROM attendance WHERE makeup_for_attendance_id = ? LIMIT 1",
      [id]
    );
    if (linkedMakeup) {
      await connection.rollback();
      return res.status(409).json({ message: "A makeup session is linked to this record. Archive or cancel that makeup first." });
    }

    const cols = await sharedColumns(connection);
    const colList = cols.map((c) => `\`${c}\``).join(", ");
    await connection.query(
      `INSERT INTO attendance_archive (${colList}, archived_at, archived_by, archive_reason)
       SELECT ${colList}, NOW(), ?, ? FROM attendance WHERE id = ?`,
      [req.user.id, reason, id]
    );
    await connection.query("DELETE FROM attendance WHERE id = ?", [id]);
    await connection.query(
      "INSERT INTO archives (entity_type, entity_id, entity_label, reason, archived_by) VALUES ('attendance', ?, ?, ?, ?)",
      [id, label(row), reason, req.user.id]
    );
    await connection.query("INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'attendance', ?)", [
      req.user.username,
      `Archived attendance record #${id} (${label(row)}). Reason: ${reason}`,
      id,
    ]);

    await connection.commit();
    res.json({ message: "Attendance record archived. It no longer counts toward credits or reports." });
  } catch (err) {
    await connection.rollback().catch(() => {});
    console.error("archiveAttendance failed:", err);
    res.status(500).json({ message: "Could not archive this attendance record." });
  } finally {
    connection.release();
  }
}

export async function restoreAttendance(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid attendance record." });

  const connection = await pool.getConnection();
  try {
    await ensureAttendanceArchiveTable(connection);
    await connection.beginTransaction();

    const [[row]] = await connection.query("SELECT * FROM attendance_archive WHERE id = ? FOR UPDATE", [id]);
    if (!row) {
      await connection.rollback();
      return res.status(404).json({ message: "Archived attendance record not found." });
    }
    const [[clash]] = await connection.query("SELECT id FROM attendance WHERE id = ?", [id]);
    if (clash) {
      await connection.rollback();
      return res.status(409).json({ message: "This attendance record already exists." });
    }

    const cols = await sharedColumns(connection);
    const colList = cols.map((c) => `\`${c}\``).join(", ");
    await connection.query(`INSERT INTO attendance (${colList}) SELECT ${colList} FROM attendance_archive WHERE id = ?`, [id]);
    await connection.query("DELETE FROM attendance_archive WHERE id = ?", [id]);
    await connection.query(
      "UPDATE archives SET restored_at = NOW(), restored_by = ? WHERE entity_type = 'attendance' AND entity_id = ? AND restored_at IS NULL",
      [req.user.id, id]
    );
    await connection.query("INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'attendance', ?)", [
      req.user.username,
      `Restored archived attendance record #${id}`,
      id,
    ]);

    await connection.commit();
    res.json({ message: "Attendance record restored." });
  } catch (err) {
    await connection.rollback().catch(() => {});
    console.error("restoreAttendance failed:", err);
    res.status(500).json({ message: "Could not restore this attendance record." });
  } finally {
    connection.release();
  }
}

/** Marks one patient's record for that session as "Session Cancelled": never absent, never credited. */
export async function cancelAttendance(req, res) {
  const id = Number(req.params.id);
  const reason = String(req.body?.reason || "").trim();
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid attendance record." });
  if (!reason) return res.status(400).json({ message: "Give a reason for cancelling this attendance record." });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[row]] = await connection.query(
      `SELECT a.*, p.full_name AS patient_name FROM attendance a JOIN patients p ON p.id = a.patient_id WHERE a.id = ? FOR UPDATE`,
      [id]
    );
    if (!row) {
      await connection.rollback();
      return res.status(404).json({ message: "Attendance record not found." });
    }
    if (row.status === "cancelled") {
      await connection.rollback();
      return res.status(409).json({ message: "This attendance record is already cancelled." });
    }

    const staffName = req.user.full_name || req.user.username;
    await connection.query(
      `UPDATE attendance
       SET status = 'cancelled', completion_status = 'NOT_CREDITED', decision_reason = ?,
           authorized_by = ?, authorized_by_name = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [reason, req.user.id, staffName, id]
    );

    // A drug test logged for this session can no longer stand: void it, keeping the original result on record.
    if (row.session_id) {
      await connection.query(
        `UPDATE drug_test_logs SET
           is_corrected = 1, previous_result = result, previous_substance_tested = substance_tested,
           result = 'NOT_PERFORMED', correction_reason = ?, corrected_by = ?, corrected_by_name = ?, corrected_at = NOW()
         WHERE session_id = ? AND patient_id = ? AND result <> 'NOT_PERFORMED'`,
        [`Attendance cancelled: ${reason}`, req.user.id, staffName, row.session_id, row.patient_id]
      ).catch(() => {}); // older databases without the correction columns: leave the test as is
    }

    await connection.query("INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, 'attendance', ?)", [
      req.user.username,
      `Cancelled attendance record #${id} (${label(row)}; was ${row.status}/${row.completion_status}). Reason: ${reason}`,
      id,
    ]);

    await connection.commit();
    res.json({ message: "Attendance marked as Session Cancelled. It is not counted as absent or credited." });
  } catch (err) {
    await connection.rollback().catch(() => {});
    console.error("cancelAttendance failed:", err);
    res.status(500).json({ message: "Could not cancel this attendance record." });
  } finally {
    connection.release();
  }
}
