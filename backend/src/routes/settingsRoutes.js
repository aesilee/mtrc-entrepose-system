import { Router } from "express";
import express from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { getSettings, getPublicSettings, updateSettings, backupDatabase, restoreDatabase } from "../controllers/settingsController.js";

const router = Router();

// No auth — the login page needs the org name/logo before a token exists.
router.get("/public", getPublicSettings);

// Any authenticated user — the sidebar logo and report headers need this.
router.get("/", verifyToken, getSettings);

// ICT admin only — these change or expose the whole system.
router.put("/", verifyToken, requireRole("ict_admin"), updateSettings);
router.get("/backup", verifyToken, requireRole("ict_admin"), backupDatabase);
router.post("/restore", verifyToken, requireRole("ict_admin"), express.text({ type: "*/*", limit: "50mb" }), restoreDatabase);

export default router;