import express from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  getMilestones,
  updateMilestones,
  getSessionSummary,
  logSessionWithNote,
  getDrugTests,
  addDrugTest,
  getAttentionFlags,
  dischargePatient,
  getTreatmentPlan,
  saveTreatmentPlan,
  getPatientCbteEvaluations,
  savePatientCbteEvaluation,
  getCourtReportData,
  saveCourtReport,
} from "../controllers/caseManagementController.js";

const router = express.Router();

// Require authentication for all case management routes
router.use(verifyToken);

// CM Dashboard Flags
router.get("/attention", requireRole("case_manager", "ict_admin"), getAttentionFlags);

// Individualized Treatment Plan (ITP)
router.get("/patients/:id/treatment-plan", getTreatmentPlan);
router.post("/patients/:id/treatment-plan", requireRole("case_manager", "ict_admin"), saveTreatmentPlan);

// CBT-E Evaluations (Vol. 1 Sec 5.3 & Vol. 2A)
router.get("/patients/:id/cbte-evaluations", getPatientCbteEvaluations);
router.post("/patients/:id/cbte-evaluations", requireRole("case_manager", "ict_admin"), savePatientCbteEvaluation);

// Automated Court Progress Reports (Vol. 1 Sec 7.2 & MTRC Ref Sec 08)
router.get("/patients/:id/court-report", getCourtReportData);
router.post("/patients/:id/court-report", requireRole("case_manager", "ict_admin", "him_staff"), saveCourtReport);

// Milestones
router.get("/patients/:id/milestones", getMilestones);
router.put("/patients/:id/milestones", requireRole("case_manager", "ict_admin"), updateMilestones);

// Session Summary
router.get("/patients/:id/sessions/summary", getSessionSummary);

// Log Session & SOAP Note
router.post("/sessions/log", requireRole("case_manager", "ict_admin"), logSessionWithNote);

// Surveillance Drug Testing
router.get("/patients/:id/drug-tests", getDrugTests);
router.post("/patients/:id/drug-tests", requireRole("case_manager", "ict_admin"), addDrugTest);

// Formal Discharge
router.post("/patients/:id/discharge", requireRole("case_manager", "ict_admin"), dischargePatient);

export default router;
