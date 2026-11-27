import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  recordAttendanceBulk,
  listAttendance,
  getAttendanceStats,
  updateAttendanceCompletion,
  getPatientAttendanceContext,
} from "../controllers/attendanceController.js";
import { archiveAttendance, restoreAttendance, cancelAttendance } from "../controllers/attendanceArchiveController.js";

const router = Router();

router.use(verifyToken);
// Attendance is a clinical record: Admitting personnel have no access (same rule as the patient profile).
const CLINICAL_ROLES = ["case_manager", "him_staff", "ict_admin"];
router.get("/", requireRole(...CLINICAL_ROLES), listAttendance);
router.get("/stats", requireRole(...CLINICAL_ROLES), getAttendanceStats);
router.get("/patient-context", requireRole(...CLINICAL_ROLES), getPatientAttendanceContext);
router.post("/bulk", requireRole("case_manager", "ict_admin"), recordAttendanceBulk);
router.put("/:id/completion", requireRole("case_manager", "ict_admin"), updateAttendanceCompletion);
// Edit actions on one record: cancel (stays listed as Session Cancelled) or archive (moved out; restorable from Archives).
router.put("/:id/cancel", requireRole("case_manager", "ict_admin"), cancelAttendance);
router.post("/:id/archive", requireRole("case_manager", "ict_admin"), archiveAttendance);
router.post("/archived/:id/restore", requireRole("case_manager", "ict_admin"), restoreAttendance);

export default router;