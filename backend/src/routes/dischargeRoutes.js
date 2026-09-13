import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  listDischarges,
  getDischarge,
  createDischarge,
} from "../controllers/dischargeController.js";

const router = Router();

router.use(verifyToken);

router.get("/", listDischarges);
router.get("/:id", getDischarge);
router.post("/", requireRole("case_manager", "him_staff", "ict_admin"), createDischarge);

export default router;