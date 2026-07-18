import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { listAuditLogs, listAuditActors } from "../controllers/auditLogController.js";

const router = Router();
router.use(verifyToken, requireRole("ict_admin"));

router.get("/", listAuditLogs);
router.get("/actors", listAuditActors);

export default router;