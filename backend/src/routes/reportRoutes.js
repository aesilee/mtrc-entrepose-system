import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { generateReport, listReports, getReport } from "../controllers/reportController.js";
import { archiveReport, restoreReport } from "../controllers/archiveController.js";

const router = Router();
router.use(verifyToken, requireRole("him_staff", "ict_admin"));

router.get("/", listReports);
router.post("/generate", generateReport);
router.get("/:id", getReport);
router.post("/:id/archive", archiveReport);
router.post("/:id/restore", restoreReport);

export default router;