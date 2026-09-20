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
  dischargePatient
} from "../controllers/caseManagementController.js";

const router = express.Router();

// Require authentication for all case management routes
router.use(verifyToken);

// CM Dashboard Flags
router.get("/attention", requireRole("case_manager", "ict_admin"), getAttentionFlags);

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
