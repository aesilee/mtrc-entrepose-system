import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { listCertificates, getCertificate, deleteCertificate } from "../controllers/certificateController.js";

const router = Router();
router.use(verifyToken);

router.get("/", requireRole("admitting", "him_staff", "ict_admin"), listCertificates);
router.get("/:id", requireRole("admitting", "him_staff", "ict_admin"), getCertificate);
router.delete("/:id", requireRole("case_manager", "him_staff", "ict_admin"), deleteCertificate);

export default router;
