import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { listUsers, createUser, updateUser, resetPassword } from "../controllers/userController.js";

const router = Router();

// Every route here requires a valid token AND the ict_admin role
router.use(verifyToken, requireRole("ict_admin"));

router.get("/", listUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.post("/:id/reset-password", resetPassword);

export default router;
