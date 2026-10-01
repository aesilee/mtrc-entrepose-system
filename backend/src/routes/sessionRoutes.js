import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { createSession, getSessionTopics, getPatientAnnex1Progress } from "../controllers/sessionController.js";

const router = Router();

router.use(verifyToken);
router.get("/topics", getSessionTopics);
router.get("/patient/:patientId/annex1", getPatientAnnex1Progress);
router.post("/", requireRole("case_manager", "ict_admin"), createSession);

export default router;