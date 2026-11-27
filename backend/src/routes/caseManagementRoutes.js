import express from "express";
import { verifyToken, requireRole, requirePatientClinicalAccess } from "../middleware/auth.js";
import {
  getMilestones,
  updateMilestones,
  getSessionSummary,
  logSessionWithNote,
  getDrugTests,
  addDrugTest,
  updateDrugTest,
  getAttentionFlags,
  dischargePatient,
  getTreatmentPlan,
  saveTreatmentPlan,
  getPatientCbteEvaluations,
  savePatientCbteEvaluation,
  updatePatientCbteEvaluation,
  getPatientInterventions,
  addPatientIntervention,
  updatePatientIntervention,
  deletePatientIntervention,
  getCourtReportData,
  saveCourtReport,
} from "../controllers/caseManagementController.js";

const router = express.Router();

// Require authentication for all case management routes
router.use(verifyToken);

// CM Dashboard Flags
router.get("/attention", requireRole("case_manager", "ict_admin"), getAttentionFlags);

// Individualized Treatment Plan (ITP)
router.get("/patients/:id/treatment-plan", requirePatientClinicalAccess, getTreatmentPlan);
router.post("/patients/:id/treatment-plan", requirePatientClinicalAccess, requireRole("case_manager", "ict_admin"), saveTreatmentPlan);

// CBT-E Evaluations (Vol. 1 Sec 5.3 & Vol. 2A)
router.get("/patients/:id/cbte-evaluations", requirePatientClinicalAccess, getPatientCbteEvaluations);
router.post("/patients/:id/cbte-evaluations", requirePatientClinicalAccess, requireRole("case_manager", "ict_admin"), savePatientCbteEvaluation);
router.put("/patients/:id/cbte-evaluations/:evalId", requirePatientClinicalAccess, requireRole("case_manager", "ict_admin"), updatePatientCbteEvaluation);

// Automated Court Progress Reports (Vol. 1 Sec 7.2 & MTRC Ref Sec 08)
router.get("/patients/:id/court-report", requirePatientClinicalAccess, getCourtReportData);
router.post("/patients/:id/court-report", requirePatientClinicalAccess, requireRole("case_manager", "ict_admin", "him_staff"), saveCourtReport);

// Interventions & Consultations (Task 7: Record More Than Attendance)
router.get("/patients/:id/interventions", requirePatientClinicalAccess, getPatientInterventions);
router.post("/patients/:id/interventions", requirePatientClinicalAccess, requireRole("case_manager", "ict_admin"), addPatientIntervention);
router.put("/patients/:id/interventions/:interventionId", requirePatientClinicalAccess, requireRole("case_manager", "ict_admin"), updatePatientIntervention);
router.delete("/patients/:id/interventions/:interventionId", requirePatientClinicalAccess, requireRole("case_manager", "ict_admin"), deletePatientIntervention);

// Milestones
router.get("/patients/:id/milestones", requirePatientClinicalAccess, getMilestones);
router.put("/patients/:id/milestones", requirePatientClinicalAccess, requireRole("case_manager", "ict_admin"), updateMilestones);

// Session Summary
router.get("/patients/:id/sessions/summary", requirePatientClinicalAccess, getSessionSummary);

// Log Session & SOAP Note
router.post("/sessions/log", requireRole("case_manager", "ict_admin"), logSessionWithNote);

// Surveillance Drug Testing (Finding 1: Strict assignment & clinical permissions)
router.get("/patients/:id/drug-tests", requirePatientClinicalAccess, getDrugTests);
router.post("/patients/:id/drug-tests", requirePatientClinicalAccess, requireRole("case_manager", "ict_admin"), addDrugTest);
router.put("/patients/:id/drug-tests/:testId", requirePatientClinicalAccess, requireRole("case_manager", "ict_admin"), updateDrugTest);

// Formal Discharge
router.post("/patients/:id/discharge", requirePatientClinicalAccess, requireRole("case_manager", "ict_admin"), dischargePatient);

export default router;
