import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import { getProfile, updateProfile, changeOwnPassword, getMyActivity } from "../controllers/profileController.js";

const router = Router();
router.use(verifyToken);

router.get("/", getProfile);
router.put("/", updateProfile);
router.put("/password", changeOwnPassword);
router.get("/activity", getMyActivity);

export default router;