import { Router } from "express";
import { verifyToken, requireRole, requirePatientClinicalAccess, requireCertificateAccess } from "../middleware/auth.js";
import * as certController from "../controllers/certificateController.js";

const router = Router();
router.use(verifyToken);

// Phase 3: New End-to-End Certificates Engine Routes (Finding 1 & 2: Clinical access & guard verification)
router.get("/:id/eligibility", requireCertificateAccess, certController.checkEligibility);
router.post("/:id/generate", requireCertificateAccess, certController.generateCertificate);
router.get("/:id/history", requireCertificateAccess, certController.getCertificateHistory);
router.get("/:id", certController.getCertificateById);

// (Legacy routes preserved if needed for archive/restore mechanisms)
import { archiveCertificate, restoreCertificate, archiveCertificateIssuance, restoreCertificateIssuance } from "../controllers/archiveController.js";
// Issued certificates shown on the Patient Profile (certificate_issuances)
router.post("/issuances/:certId/archive", requireRole("case_manager", "him_staff", "ict_admin"), archiveCertificateIssuance);
router.post("/issuances/:certId/restore", requireRole("case_manager", "him_staff", "ict_admin"), restoreCertificateIssuance);
// Legacy auto-enrollment records (certificates table)
router.post("/:certId/archive", requireRole("case_manager", "him_staff", "ict_admin"), archiveCertificate);
router.post("/:certId/restore", requireRole("case_manager", "him_staff", "ict_admin"), restoreCertificate);

export default router;