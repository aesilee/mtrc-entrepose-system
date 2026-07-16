import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { generateReport, listReports, getReport } from "../controllers/reportController.js";

const router = Router();
router.use(verifyToken, requireRole("him_staff", "ict_admin"));

router.get("/", listReports);
router.post("/generate", generateReport);
router.get("/:id", getReport);

export default router;