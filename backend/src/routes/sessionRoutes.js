import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  createSession,
  getSessionTopics,
  getPatientAnnex1Progress,
  scheduleSession,
  rescheduleSession,
  listScheduledSessions,
  getUnresolvedSessions,
  getSessionDetails,
} from "../controllers/sessionController.js";

const router = Router();

router.use(verifyToken);
router.get("/topics", getSessionTopics);
router.get("/patient/:patientId/annex1", getPatientAnnex1Progress);
router.get("/scheduled", listScheduledSessions);
router.get("/unresolved", getUnresolvedSessions);
router.get("/:id", getSessionDetails);
router.post("/schedule", requireRole("case_manager", "ict_admin"), scheduleSession);
router.post("/:id/reschedule", requireRole("case_manager", "ict_admin"), rescheduleSession);
router.post("/", requireRole("case_manager", "ict_admin"), createSession);

export default router;