import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  listPatients,
  createPatient,
  updatePatient,
  getPatient,
  getPatientAttendance,
  getPatientProgressNotes,
  getPatientCertificates,
  getPatientHistory,
  getPatientTimeline,
} from "../controllers/patientController.js";
import { createProgressNote } from "../controllers/progressNoteController.js";
import { getPatientFollowUps, createFollowUp } from "../controllers/followUpController.js";

const router = Router();

router.use(verifyToken);

router.get("/", listPatients);
router.post("/", requireRole("admitting", "ict_admin"), createPatient);
router.get("/:id", getPatient);
router.put("/:id", requireRole("admitting", "case_manager", "ict_admin"), updatePatient);
router.get("/:id/attendance", getPatientAttendance);
router.get("/:id/progress-notes", getPatientProgressNotes);
router.post("/:id/progress-notes", requireRole("case_manager", "ict_admin"), createProgressNote);
router.get("/:id/follow-ups", getPatientFollowUps);
router.post("/:id/follow-ups", requireRole("case_manager", "ict_admin"), createFollowUp);
router.get("/:id/certificates", getPatientCertificates);
router.get("/:id/history", getPatientHistory);
router.get("/:id/timeline", getPatientTimeline);

export default router;