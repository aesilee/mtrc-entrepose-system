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
// Attendance is a clinical record: Admitting personnel have no access (same rule as the patient profile).
const CLINICAL_ROLES = ["case_manager", "him_staff", "ict_admin"];
router.get("/", requireRole(...CLINICAL_ROLES), listAttendance);
router.get("/stats", requireRole(...CLINICAL_ROLES), getAttendanceStats);
router.get("/patient-context", requireRole(...CLINICAL_ROLES), getPatientAttendanceContext);
router.get("/policy", getAttendancePolicy);
// The participation policy is approved by the Medical Center Chief; only ICT encodes the approved values.
router.put("/policy", requireRole("ict_admin"), updateAttendancePolicy);
router.post("/bulk", requireRole("case_manager", "ict_admin"), recordAttendanceBulk);
router.put("/:id/completion", requireRole("case_manager", "ict_admin"), updateAttendanceCompletion);

export default router;