import jwt from "jsonwebtoken";
import pool from "../config/db.js";

// Confirms the request carries a valid token and actively verifies that the account
// is still active and has not had its session revoked (Task 12 / Finding 8).
export async function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided." });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: "Invalid token payload." });
    }

    // Actively verify account status & session revocation in the database
    const [[user]] = await pool.query(
      "SELECT id, username, full_name, role, status, password_changed_at FROM users WHERE id = ?",
      [decoded.id]
    );

    if (!user) {
      return res.status(401).json({ message: "User account no longer exists." });
    }

    if (user.status !== "active") {
      return res.status(401).json({ message: "Account is inactive or has been deactivated. Access revoked." });
    }

    // Check if password was changed after token issuance
    if (user.password_changed_at && decoded.iat) {
      const pwdChangedSec = Math.floor(new Date(user.password_changed_at).getTime() / 1000);
      if (pwdChangedSec > decoded.iat) {
        return res.status(401).json({ message: "Session revoked due to security update or password change. Please log in again." });
      }
    }

    req.user = {
      ...decoded,
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
      full_name: user.full_name || decoded.full_name || user.username,
      fullName: user.full_name || decoded.fullName || user.username,
    };

    // Fire-and-forget last_active update
    pool.query("UPDATE users SET last_active = NOW() WHERE id = ?", [user.id]).catch(() => {});
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

// Usage: requireRole("ict_admin") or requireRole("ict_admin", "him_staff")
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have access to this feature." });
    }
    next();
  };
}

// Enforces role-based clinical access and assigned-case-manager boundaries (Finding 1 / Step 12).
// HIM Staff and ICT Admin have facility-wide clinical oversight.
// Case Managers can only access and modify clinical records of patients assigned to them.
export async function requirePatientClinicalAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const allowedRoles = ["case_manager", "him_staff", "ict_admin"];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "Clinical records access restricted to case managers, HIM staff, and administrators." });
  }

  // Administrators and HIM staff have facility-wide oversight
  if (req.user.role === "ict_admin" || req.user.role === "him_staff") {
    return next();
  }

  // For case managers, strictly enforce assignment
  const patientId = req.params.id || req.params.patientId || req.body?.patientId;
  if (!patientId) {
    return next();
  }

  try {
    const [[patient]] = await pool.query(
      "SELECT id, assigned_case_manager_id, full_name, enrollment_status FROM patients WHERE id = ?",
      [patientId]
    );

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    if (patient.assigned_case_manager_id && Number(patient.assigned_case_manager_id) !== Number(req.user.id)) {
      return res.status(403).json({
        message: "Access denied. You are not the assigned case manager for this patient.",
      });
    }

    req.targetPatient = patient;
    next();
  } catch (error) {
    console.error("requirePatientClinicalAccess error:", error);
    return res.status(500).json({ message: "Error verifying clinical permissions." });
  }
}
