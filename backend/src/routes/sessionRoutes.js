import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { createSession } from "../controllers/sessionController.js";

const router = Router();

router.use(verifyToken);
router.post("/", requireRole("case_manager", "ict_admin"), createSession);

export default router;