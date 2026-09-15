import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  finalizeEnrollment,
  getPatientIntake,
  saveClinicalTriage,
  saveDrugUseHistory,
} from "../controllers/intakeController.js";

const router = Router();
router.use(verifyToken);

router.get("/patient/:patientId", getPatientIntake);
router.put("/patient/:patientId/drug-history", requireRole("admitting", "ict_admin"), saveDrugUseHistory);
router.put("/patient/:patientId/clinical-triage", requireRole("admitting", "ict_admin"), saveClinicalTriage);
router.post("/patient/:patientId/finalize", requireRole("admitting", "ict_admin"), finalizeEnrollment);

export default router;
