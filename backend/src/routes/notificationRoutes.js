import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import { listNotifications, getUnreadCount, markAllRead, markOneRead } from "../controllers/notificationController.js";

const router = Router();
router.use(verifyToken);

router.get("/", listNotifications);
router.get("/unread-count", getUnreadCount);
router.put("/mark-all-read", markAllRead);
router.put("/:id/read", markOneRead);

export default router;