import { Router } from "express";
import { verifyToken, requireRole, requirePatientClinicalAccess, requireCertificateAccess } from "../middleware/auth.js";
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
  getPatientDurationHistory,
  recordPatientDurationChange,
  getPatientAssignmentHistory,
} from "../controllers/patientController.js";
import { generateCertificate } from "../controllers/certificateController.js";
import { createProgressNote } from "../controllers/progressNoteController.js";
import { getPatientFollowUps, createFollowUp } from "../controllers/followUpController.js";

const router = Router();

router.use(verifyToken);

router.get("/", listPatients);
router.post("/", requireRole("admitting", "ict_admin"), createPatient);
router.get("/:id", getPatient);
router.put("/:id", requireRole("admitting", "case_manager", "ict_admin"), updatePatient);
router.get("/:id/attendance", requirePatientClinicalAccess, getPatientAttendance);
router.get("/:id/progress-notes", requirePatientClinicalAccess, getPatientProgressNotes);
router.post("/:id/progress-notes", requirePatientClinicalAccess, requireRole("case_manager", "ict_admin"), createProgressNote);
router.get("/:id/follow-ups", getPatientFollowUps);
router.post("/:id/follow-ups", requireRole("case_manager", "ict_admin"), createFollowUp);
router.get("/:id/certificates", requireCertificateAccess, getPatientCertificates);
router.post("/:id/certificates", requireCertificateAccess, requireRole("admitting", "case_manager", "him_staff", "ict_admin"), generateCertificate);
router.get("/:id/history", getPatientHistory);
router.get("/:id/timeline", requirePatientClinicalAccess, getPatientTimeline);
router.get("/:id/assignment-history", getPatientAssignmentHistory);
router.get("/:id/duration-history", getPatientDurationHistory);
router.post("/:id/duration-change", requireRole("admitting", "case_manager", "ict_admin"), recordPatientDurationChange);

export default router;