import { Router } from "express";
import { verifyToken, requireRole, requirePatientClinicalAccess } from "../middleware/auth.js";
import * as certController from "../controllers/certificateController.js";

const router = Router();
router.use(verifyToken);

// Phase 3: New End-to-End Certificates Engine Routes (Finding 1 & 2: Clinical access & guard verification)
router.get("/:id/eligibility", requirePatientClinicalAccess, certController.checkEligibility);
router.post("/:id/generate", requirePatientClinicalAccess, certController.generateCertificate);
router.get("/:id/history", requirePatientClinicalAccess, certController.getCertificateHistory);
router.get("/:id", certController.getCertificateById);

// (Legacy routes preserved if needed for archive/restore mechanisms)
import { archiveCertificate, restoreCertificate } from "../controllers/archiveController.js";
router.post("/:certId/archive", requireRole("case_manager", "him_staff", "ict_admin"), archiveCertificate);
router.post("/:certId/restore", requireRole("case_manager", "him_staff", "ict_admin"), restoreCertificate);

export default router;