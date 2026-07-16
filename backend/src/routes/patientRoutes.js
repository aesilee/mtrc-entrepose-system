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
} from "../controllers/patientController.js";

const router = Router();

router.use(verifyToken);

router.get("/", listPatients);
router.post("/", requireRole("admitting", "ict_admin"), createPatient);
router.get("/:id", getPatient);
router.put("/:id", requireRole("admitting", "case_manager", "ict_admin"), updatePatient);
router.get("/:id/attendance", getPatientAttendance);
router.get("/:id/progress-notes", getPatientProgressNotes);
router.get("/:id/certificates", getPatientCertificates);
router.get("/:id/history", getPatientHistory);

export default router;