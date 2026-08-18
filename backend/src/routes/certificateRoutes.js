import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { getCertificate } from "../controllers/certificateController.js";
import { archiveCertificate, restoreCertificate } from "../controllers/archiveController.js";

const router = Router();
router.use(verifyToken);

router.get("/:id", getCertificate);
router.post("/:id/archive", requireRole("case_manager", "him_staff", "ict_admin"), archiveCertificate);
router.post("/:id/restore", requireRole("case_manager", "him_staff", "ict_admin"), restoreCertificate);

export default router;