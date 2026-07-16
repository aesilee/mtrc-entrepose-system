import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { recordAttendanceBulk, listAttendance, getAttendanceStats } from "../controllers/attendanceController.js";

const router = Router();

router.use(verifyToken);
router.get("/", listAttendance);
router.get("/stats", getAttendanceStats);
router.post("/bulk", requireRole("case_manager", "ict_admin"), recordAttendanceBulk);

export default router;