import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { listArchives, archivePatient, restorePatient, listFinishedPatients } from "../controllers/archiveController.js";

const router = Router();
router.use(verifyToken, requireRole("ict_admin", "him_staff", "case_manager"));

router.get("/", listArchives);
router.get("/finished-patients", listFinishedPatients);
router.post("/patients/:id/archive", requireRole("ict_admin"), archivePatient);
router.post("/patients/:id/restore", requireRole("ict_admin"), restorePatient);

export default router;