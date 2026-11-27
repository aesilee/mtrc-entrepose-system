import express from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  getOpCmTracker,
  getOpCmTrackerSummary,
  getOpCmTrackerDrilldown,
  issueOpCmTrackerSnapshot,
  listOpCmTrackerSnapshots,
  getOpCmTrackerSnapshotById,
} from "../controllers/opCmTrackerController.js";

const router = express.Router();

router.use(verifyToken);
router.use(requireRole("him_staff", "ict_admin", "case_manager"));

router.get("/op-cm-tracker", getOpCmTracker);
router.get("/op-cm-tracker/summary", getOpCmTrackerSummary);
router.get("/op-cm-tracker/drilldown", getOpCmTrackerDrilldown);
router.post("/op-cm-tracker/snapshots", requireRole("him_staff", "ict_admin"), issueOpCmTrackerSnapshot);
router.get("/op-cm-tracker/snapshots", listOpCmTrackerSnapshots);
router.get("/op-cm-tracker/snapshots/:id", getOpCmTrackerSnapshotById);

export default router;
