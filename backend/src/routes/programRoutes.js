import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import { listPrograms } from "../controllers/programController.js";

const router = Router();

router.get("/", verifyToken, listPrograms);

export default router;