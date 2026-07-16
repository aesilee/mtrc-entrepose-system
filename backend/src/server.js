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

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

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
