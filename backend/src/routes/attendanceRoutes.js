import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  recordAttendanceBulk,
  listAttendance,
  getAttendanceStats,
  updateAttendanceCompletion,
  getPatientAttendanceContext,
  getAttendancePolicy,
  updateAttendancePolicy,
} from "../controllers/attendanceController.js";

const router = Router();

router.use(verifyToken);
router.get("/", listAttendance);
router.get("/stats", getAttendanceStats);
router.get("/patient-context", getPatientAttendanceContext);
router.get("/policy", getAttendancePolicy);
router.put("/policy", requireRole("ict_admin", "case_manager"), updateAttendancePolicy);
router.post("/bulk", requireRole("case_manager", "ict_admin"), recordAttendanceBulk);
router.put("/:id/completion", requireRole("case_manager", "ict_admin"), updateAttendanceCompletion);

export default router;