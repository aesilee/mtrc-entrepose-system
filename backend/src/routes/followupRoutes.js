import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { completeFollowUp } from "../controllers/followUpController.js";

const router = Router();

router.put("/:id/complete", verifyToken, requireRole("case_manager", "ict_admin"), completeFollowUp);

export default router;