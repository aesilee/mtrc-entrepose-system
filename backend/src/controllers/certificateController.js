import pool from "../config/db.js";
import { ensureAttendanceCompletionSchema } from "../utils/attendanceSchema.js";
import { getUnifiedPatientProgress } from "../utils/curriculumProgress.js";
import {
  ensureProgramDurationSchema,
  evaluatePatientDuration,
} from "../utils/programDuration.js";

// 1. Eligibility Check Endpoint
export async function checkEligibility(req, res) {
  const patientId = req.params.id;
  try {
    await ensureAttendanceCompletionSchema();
    await ensureProgramDurationSchema();
    const [[patient]] = await pool.query(
      `SELECT p.*,
              m.date_pdc
       FROM patients p
       LEFT JOIN patient_milestones m ON m.patient_id = p.id
       WHERE p.id = ?`,
      [patientId]
    );

    if (!patient) return res.status(404).json({ message: "Patient not found." });

    const durationSummary = evaluatePatientDuration(patient);

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

    // Guard 2: Approved Patient-Specific Program Duration (e.g. 7 months standard, 12 months court-mandated, + approved extensions)
    if (!durationSummary.agreedStartDate) {
      completionGuards.push("Patient lacks an agreed program start date / admission date.");
    } else if (!durationSummary.isDurationMet) {
      const extLabel =
        durationSummary.extensionMonths > 0
          ? ` (${durationSummary.baseDurationMonths} mos base + ${durationSummary.extensionMonths} mos approved extension)`
          : "";
      completionGuards.push(
        `Mandated program duration of ${durationSummary.totalRequiredMonths} months${extLabel} [${durationSummary.durationBasisLabel}] not yet met. Current duration: ${durationSummary.monthsElapsed} of ${durationSummary.totalRequiredMonths} months elapsed (Agreed Start: ${durationSummary.agreedStartDate} · Expected Completion: ${durationSummary.expectedCompletionDate || "—"}).`
      );
    }

    // Guard 3: Core Curriculum Requirements (28 CBT + 3 CBT-E + 12 PE = 43 Credited non-duplicate requirements)
    const curriculumProgress = await getUnifiedPatientProgress(pool, patientId);
    const { cbt, cbte, pe, totalCore } = curriculumProgress.components;
    const pendingReview = curriculumProgress.tallies.pendingReviewCount;

    if (!curriculumProgress.isCoreComplete) {
      const pendingSuffix =
        pendingReview > 0 ? ` (${pendingReview} session(s) pending participation review)` : "";
      completionGuards.push(
        `Requires all 43 core curriculum requirements (28 CBT, 3 CBT-E, 12 PE). Current credited core: ${totalCore.completed}/43 — CBT: ${cbt.completed}/28, CBT-E: ${cbte.completed}/3, PE: ${pe.completed}/12${pendingSuffix}.`
      );
      if (cbt.remaining > 0) {
        const previewCbt = cbt.missingTopics
          .slice(0, 4)
          .map((t) => t.title)
          .join("; ");
        completionGuards.push(
          `Missing ${cbt.remaining} CBT requirement(s): ${previewCbt}${cbt.missingTopics.length > 4 ? ` (+${cbt.missingTopics.length - 4} more)` : ""}.`
        );
      }
      if (cbte.remaining > 0) {
        const missingCbteTitles = cbte.missingTopics.map((t) => t.shortTitle || t.title).join("; ");
        completionGuards.push(`Missing ${cbte.remaining} CBT-E evaluation(s): ${missingCbteTitles}.`);
      }
      if (pe.remaining > 0) {
        const previewPe = pe.missingTopics
          .slice(0, 4)
          .map((t) => t.title)
          .join("; ");
        completionGuards.push(
          `Missing ${pe.remaining} PE requirement(s): ${previewPe}${pe.missingTopics.length > 4 ? ` (+${pe.missingTopics.length - 4} more)` : ""}.`
        );
      }
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
      completion: { eligible: completionEligible, reasons: completionGuards },
      curriculumProgress,
      durationSummary,
    });
  } catch (error) {
    console.error("Eligibility check error:", error);
    res.status(500).json({ message: "Failed to check eligibility" });
  }
}

// 2. Generation Endpoint (Finding 2 / Step 11: Validates eligibility & recorded approval inside the issuance operation)
export async function generateCertificate(req, res) {
  const patientId = req.params.id;
  const { certificateType, remarks, pleaBargainNote, approvedByName, signatoryName, recordedApprovalConfirmed } = req.body;
  // certificateType must be ENROLLMENT or COMPLETION

  if (!["ENROLLMENT", "COMPLETION"].includes(certificateType)) {
    return res.status(400).json({ message: "Invalid certificate type. Must be ENROLLMENT or COMPLETION." });
  }

  if (certificateType === "ENROLLMENT" && !["admitting", "ict_admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Only Admitting personnel can issue Enrollment certificates." });
  }
  if (certificateType === "COMPLETION" && !["case_manager", "him_staff", "ict_admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Only Case Managers, HIM staff, or Administrators can issue Completion certificates." });
  }

  try {
    await ensureAttendanceCompletionSchema();
    await ensureProgramDurationSchema();

    const [[patient]] = await pool.query(
      `SELECT p.*, 
              u.full_name as case_manager_name,
              m.date_pdc
       FROM patients p 
       LEFT JOIN users u ON p.assigned_case_manager_id = u.id 
       LEFT JOIN patient_milestones m ON m.patient_id = p.id
       WHERE p.id = ?`,
      [patientId]
    );

    if (!patient) return res.status(404).json({ message: "Patient not found." });

    // Validate enrollment certificate requirements
    if (certificateType === "ENROLLMENT") {
      if (!patient.admission_date) {
        return res.status(400).json({
          message: "Patient lacks an official admission date. Complete the intake workflow first.",
        });
      }
    }

    // Validate completion certificate statutory guards & recorded approval (Finding 2)
    if (certificateType === "COMPLETION") {
      const completionGuards = [];

      // Guard 1: Status
      if (patient.current_status !== 'active' && patient.current_status !== 'completed' && patient.current_status !== 'COMPLETER') {
        completionGuards.push("Patient must have 'active' or 'completed' status to graduate.");
      }

      // Guard 2: Program duration check
      const durationSummary = evaluatePatientDuration(patient);
      if (!durationSummary.agreedStartDate) {
        completionGuards.push("Patient lacks an agreed program start date / admission date.");
      } else if (!durationSummary.isDurationMet) {
        const extLabel =
          durationSummary.extensionMonths > 0
            ? ` (${durationSummary.baseDurationMonths} mos base + ${durationSummary.extensionMonths} mos approved extension)`
            : "";
        completionGuards.push(
          `Mandated program duration of ${durationSummary.totalRequiredMonths} months${extLabel} not yet met. (${durationSummary.monthsElapsed} of ${durationSummary.totalRequiredMonths} months elapsed).`
        );
      }

      // Guard 3: Core Curriculum Requirements (28 CBT + 3 CBT-E + 12 PE = 43 Credited core requirements)
      const curriculumProgress = await getUnifiedPatientProgress(pool, patientId);
      if (!curriculumProgress.isCoreComplete) {
        const { cbt, cbte, pe, totalCore } = curriculumProgress.components;
        completionGuards.push(
          `Requires all 43 core curriculum requirements (28 CBT, 3 CBT-E, 12 PE). Current credited core: ${totalCore.completed}/43 — CBT: ${cbt.completed}/28, CBT-E: ${cbte.completed}/3, PE: ${pe.completed}/12.`
        );
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

      // Guard 6: Recorded Approval Verification
      const effectiveApproval = (signatoryName || approvedByName || req.user.full_name || "").trim();
      if (!recordedApprovalConfirmed && !effectiveApproval) {
        completionGuards.push("Recorded supervisor or clinical lead approval is required to issue a completion certificate.");
      }

      if (completionGuards.length > 0) {
        return res.status(400).json({
          message: "Patient is ineligible for Certificate of Completion.",
          guards: completionGuards,
        });
      }
    }

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
    const issuerName = issuer?.full_name || req.user.full_name || req.user.username;
    const finalSignatory = (signatoryName || approvedByName || issuerName).trim();

    // Insert into DB
    const [insertResult] = await pool.query(
      `INSERT INTO certificate_issuances 
        (patient_id, certificate_type, certificate_control_no, issued_date, issued_by, signatory_name, remarks)
       VALUES (?, ?, ?, CURDATE(), ?, ?, ?)`,
      [patientId, certificateType, controlNo, req.user.id, finalSignatory, remarks || null]
    );

    // Audit Log
    await pool.query(
      "INSERT INTO audit_log (actor_username, action, table_name, record_id) VALUES (?, ?, ?, ?)",
      [
        req.user.username,
        `Issued ${certificateType} Certificate (Control: ${controlNo}) for ${patient.full_name} with recorded approval by ${finalSignatory}`,
        "certificate_issuances",
        insertResult.insertId,
      ]
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
      signatoryName: finalSignatory,
      pleaBargainNote: pleaBargainNote || "",
      remarks,
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

// 4. Certificate Record By ID (for viewing / printing enrollment or completion certificates)
export async function getCertificateById(req, res) {
  const certId = req.params.id;
  try {
    const [[cert]] = await pool.query(
      `SELECT c.*,
              p.full_name AS patient_fallback_name,
              p.patient_code AS patient_fallback_code,
              p.admission_date AS patient_fallback_admission_date,
              pr.name AS program_fallback_name,
              u.full_name AS issuer_name
       FROM certificates c
       LEFT JOIN patients p ON p.id = c.patient_id
       LEFT JOIN programs pr ON pr.id = p.program_id
       LEFT JOIN users u ON u.id = c.issued_by
       WHERE c.id = ?`,
      [certId]
    );

    if (!cert) return res.status(404).json({ message: "Certificate not found." });

    res.json({
      id: cert.id,
      patientId: cert.patient_id,
      certificateType: cert.certificate_type,
      patientName: cert.patient_name || cert.patient_fallback_name || "Patient",
      patientCode: cert.patient_code || cert.patient_fallback_code || "—",
      program: cert.program_name || cert.program_fallback_name || "Outpatient Rehabilitation (ENTREPOSE)",
      admissionDate: cert.admission_date || cert.patient_fallback_admission_date,
      completionDate: cert.completion_date,
      remarks: cert.remarks,
      preparedBy: cert.prepared_by_name || cert.issuer_name || "Center Staff",
      issuedAt: cert.issued_at,
    });
  } catch (error) {
    console.error("Certificate fetch error:", error);
    res.status(500).json({ message: "Failed to fetch certificate." });
  }
}