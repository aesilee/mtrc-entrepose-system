import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  getAnalyticsOverview,
  getMonthlyAdmissions,
  getAttendanceTrend,
  getMonthlyDischarges
} from "../controllers/analyticsController.js";

const router = Router();
router.use(verifyToken, requireRole("case_manager", "him_staff", "ict_admin"));

router.get("/overview", getAnalyticsOverview);
router.get("/monthly-admissions", getMonthlyAdmissions);
router.get("/attendance-trend", getAttendanceTrend);
router.get("/monthly-discharges", getMonthlyDischarges);

export default router;