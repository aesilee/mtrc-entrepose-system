import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { getDashboardStats } from "../controllers/dashboardController.js";

const router = Router();

router.get("/stats", verifyToken, requireRole("ict_admin"), getDashboardStats);

export default router;