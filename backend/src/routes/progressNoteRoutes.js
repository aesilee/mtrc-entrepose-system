import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { updateProgressNote } from "../controllers/progressNoteController.js";

const router = Router();

router.put("/:id", verifyToken, requireRole("case_manager", "ict_admin"), updateProgressNote);

export default router;