import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { getAnalyticsOverview, getMonthlyAdmissions, getAttendanceTrend } from "../controllers/analyticsController.js";

const router = Router();
router.use(verifyToken, requireRole("case_manager", "him_staff", "ict_admin"));

router.get("/overview", getAnalyticsOverview);
router.get("/monthly-admissions", getMonthlyAdmissions);
router.get("/attendance-trend", getAttendanceTrend);

export default router;