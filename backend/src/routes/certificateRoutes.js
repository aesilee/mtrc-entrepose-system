import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import * as certController from "../controllers/certificateController.js";

const router = Router();
router.use(verifyToken);

// Phase 3: New End-to-End Certificates Engine Routes
router.get("/:id/eligibility", certController.checkEligibility);
router.post("/:id/generate", certController.generateCertificate);
router.get("/:id/history", certController.getCertificateHistory);

// (Legacy routes preserved if needed for archive/restore mechanisms)
import { archiveCertificate, restoreCertificate } from "../controllers/archiveController.js";
router.post("/:certId/archive", requireRole("case_manager", "him_staff", "ict_admin"), archiveCertificate);
router.post("/:certId/restore", requireRole("case_manager", "him_staff", "ict_admin"), restoreCertificate);

export default router;