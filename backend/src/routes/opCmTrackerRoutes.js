import express from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { getOpCmTracker, getOpCmTrackerSummary } from "../controllers/opCmTrackerController.js";

const router = express.Router();

router.use(verifyToken);
router.use(requireRole("him_staff", "ict_admin", "case_manager"));

router.get("/op-cm-tracker", getOpCmTracker);
router.get("/op-cm-tracker/summary", getOpCmTrackerSummary);

export default router;
