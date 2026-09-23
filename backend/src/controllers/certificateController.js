import pool from "../config/db.js";

// Helper: Calculate months between two dates
function getMonthsDiff(start, end) {
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 30);
}

// 1. Eligibility Check Endpoint
export async function checkEligibility(req, res) {
  const patientId = req.params.id;
  try {
    const [[patient]] = await pool.query(
      `SELECT p.id, p.enrollment_status, p.current_status, p.admission_date,
              m.date_pdc
       FROM patients p
       LEFT JOIN patient_milestones m ON m.patient_id = p.id
       WHERE p.id = ?`,
      [patientId]
    );

    if (!patient) return res.status(404).json({ message: "Patient not found." });

    // ENROLLMENT ELIGIBILITY
    // Must be active (or completed, but usually active). Basically, as long as they have an admission date.
    const enrollmentEligible = !!patient.admission_date;
    const enrollmentReason = enrollmentEligible ? null : "Patient lacks an official admission date. Complete the intake workflow first.";

    // COMPLETION ELIGIBILITY
    const completionGuards = [];

    // Guard 1: Status (Optional: mostly we check if they are active and ready to graduate, or already completed)
    if (patient.current_status !== 'active' && patient.current_status !== 'completed' && patient.current_status !== 'COMPLETER') {
      completionGuards.push("Patient must be 'active' or 'completed' to graduate.");
    }

    // Guard 2: Treatment Duration (7 months minimum)
    const monthsElapsed = getMonthsDiff(new Date(patient.admission_date), new Date());
    if (monthsElapsed < 7) {
      completionGuards.push(`Minimum 7 months required. Current duration: ~${monthsElapsed} months.`);
    }

    // Guard 3: Core Sessions (28 CBT + 12 PE + 3 CBT-E = 43)
    const [[{ total_sessions }]] = await pool.query(
      "SELECT COUNT(*) as total_sessions FROM attendance WHERE patient_id = ? AND status = 'present'",
      [patientId]
    );
    if (total_sessions < 43) {
      completionGuards.push(`Requires 43 attended sessions. Client has attended ${total_sessions}.`);
    }

    // Guard 4: No Positive Drug Tests
    const [[{ positive_tests }]] = await pool.query(
      "SELECT COUNT(*) as positive_tests FROM drug_test_logs WHERE patient_id = ? AND result = 'POSITIVE'",
      [patientId]
    );
    if (positive_tests > 0) {
      completionGuards.push(`Client has ${positive_tests} POSITIVE urine drug test(s) on record.`);
    }

    // Guard 5: PDC Milestone
    if (!patient.date_pdc) {
      completionGuards.push("Pre-Discharge Conference (PDC) milestone date is missing from Case Management.");
    }

    const completionEligible = completionGuards.length === 0;

    res.json({
      enrollment: { eligible: enrollmentEligible, reason: enrollmentReason },
      completion: { eligible: completionEligible, reasons: completionGuards }
    });
  } catch (error) {
    console.error("Eligibility check error:", error);
    res.status(500).json({ message: "Failed to check eligibility" });
  }
}

// 2. Generation Endpoint
export async function generateCertificate(req, res) {
  const patientId = req.params.id;
  const { certificateType, remarks, pleaBargainNote } = req.body;
  // certificateType must be ENROLLMENT or COMPLETION

  if (certificateType === "ENROLLMENT" && !["admitting", "ict_admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Only Admitting personnel can issue Enrollment certificates." });
  }
  if (certificateType === "COMPLETION" && !["case_manager", "him_staff", "ict_admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Only Case Managers or HIM staff can issue Completion certificates." });
  }

  try {
    const [[patient]] = await pool.query(
      `SELECT p.*, u.full_name as case_manager_name 
       FROM patients p 
       LEFT JOIN users u ON p.assigned_case_manager_id = u.id 
       WHERE p.id = ?`,
      [patientId]
    );

    if (!patient) return res.status(404).json({ message: "Patient not found." });

    // Generate statutory control number: CERT-[TYPE]-[YY]-[SEQ]
    const year = new Date().getFullYear().toString().slice(-2);
    const typeCode = certificateType === "ENROLLMENT" ? "ENR" : "CMP";
    
    const [[{ current_count }]] = await pool.query(
      "SELECT COUNT(*) as current_count FROM certificate_issuances WHERE certificate_control_no LIKE ?",
      [`CERT-${typeCode}-${year}-%`]
    );
    const sequence = String(current_count + 1).padStart(5, "0");
    const controlNo = `CERT-${typeCode}-${year}-${sequence}`;

    const [[issuer]] = await pool.query("SELECT full_name FROM users WHERE id = ?", [req.user.id]);
    const issuerName = issuer.full_name || req.user.username;

    // Insert into DB
    const [insertResult] = await pool.query(
      `INSERT INTO certificate_issuances 
        (patient_id, certificate_type, certificate_control_no, issued_date, issued_by, signatory_name, remarks)
       VALUES (?, ?, ?, CURDATE(), ?, ?, ?)`,
      [patientId, certificateType, controlNo, req.user.id, issuerName, remarks || null]
    );

    // Audit Log
    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, ?, ?)",
      [req.user.username, `Issued ${certificateType} Certificate (Control: ${controlNo}) for ${patient.full_name}`, "certificate_issuances", insertResult.insertId]
    );

    // Build payload for frontend rendering
    const payload = {
      controlNo,
      type: certificateType,
      issuedDate: new Date().toISOString(),
      patientName: patient.full_name,
      pwudCode: patient.pwud_code,
      admissionDate: patient.admission_date,
      caseManager: patient.case_manager_name,
      referralSource: patient.referral_source,
      issuerName,
      pleaBargainNote: pleaBargainNote || "",
      remarks
    };

    res.status(201).json({ success: true, payload });
  } catch (error) {
    console.error("Certificate generation error:", error);
    res.status(500).json({ message: "Failed to generate certificate." });
  }
}

// 3. History Endpoint
export async function getCertificateHistory(req, res) {
  const patientId = req.params.id;
  try {
    const [history] = await pool.query(
      `SELECT c.id, c.certificate_type, c.certificate_control_no, c.issued_date, 
              u.full_name as issued_by_name, c.remarks, c.created_at
       FROM certificate_issuances c
       JOIN users u ON c.issued_by = u.id
       WHERE c.patient_id = ?
       ORDER BY c.created_at DESC`,
      [patientId]
    );
    res.json({ success: true, history });
  } catch (error) {
    console.error("History fetch error:", error);
    res.status(500).json({ message: "Failed to fetch certificate history." });
  }
}