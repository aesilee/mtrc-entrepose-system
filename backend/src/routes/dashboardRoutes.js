import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { getDashboardStats, getHimStaffStats, getCaseManagerStats } from "../controllers/dashboardController.js";

const router = Router();

router.get("/stats", verifyToken, requireRole("ict_admin"), getDashboardStats);
router.get("/him-stats", verifyToken, requireRole("him_staff", "ict_admin"), getHimStaffStats);
router.get("/case-manager-stats", verifyToken, requireRole("case_manager", "ict_admin"), getCaseManagerStats);

export default router;