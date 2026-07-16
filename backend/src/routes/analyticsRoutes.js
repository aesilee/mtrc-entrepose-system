import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { getAnalytics } from "../controllers/analyticsController.js";

const router = Router();
router.get("/", verifyToken, requireRole("case_manager", "him_staff", "ict_admin"), getAnalytics);

export default router;