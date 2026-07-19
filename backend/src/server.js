import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import programRoutes from "./routes/programRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import progressNoteRoutes from "./routes/progressNoteRoutes.js";
import followUpRoutes from "./routes/followUpRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import auditLogRoutes from "./routes/auditLogRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/progress-notes", progressNoteRoutes);
app.use("/api/follow-ups", followUpRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/profile", profileRoutes);

import pool from "./config/db.js";

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Connected to MySQL database:", process.env.DB_NAME);
    connection.release();
  } catch (err) {
    console.error("❌ Could not connect to MySQL:", err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`MTRC ENTREPOSE API running on http://localhost:${PORT}`);
  });
}

start();
