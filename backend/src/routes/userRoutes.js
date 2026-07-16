import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { listUsers, createUser, updateUser, resetPassword, listCaseManagers } from "../controllers/userController.js";

const router = Router();

// Available to any authenticated user (used to populate "Assigned Case Manager" dropdowns)
router.get("/case-managers", verifyToken, listCaseManagers);

// Every route below requires a valid token AND the ict_admin role
router.use(verifyToken, requireRole("ict_admin"));

router.get("/", listUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.post("/:id/reset-password", resetPassword);

export default router;
