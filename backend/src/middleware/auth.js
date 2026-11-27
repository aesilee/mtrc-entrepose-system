import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { caseloadIdsFor } from "../utils/sharedCaseload.js";
import { getSessionTimeoutMinutes } from "../utils/sessionTimeout.js";

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

    // Sliding idle timeout: once half of the session has passed, hand the client a fresh token
    // (X-Refreshed-Token) so active users are not logged out mid-task; idle users still expire.
    try {
      const minutes = await getSessionTimeoutMinutes();
      const secondsLeft = (decoded.exp || 0) - Math.floor(Date.now() / 1000);
      if (secondsLeft < (minutes * 60) / 2) {
        const fresh = jwt.sign(
          { id: user.id, username: user.username, role: user.role, fullName: user.full_name },
          process.env.JWT_SECRET,
          { expiresIn: `${minutes}m` }
        );
        res.setHeader("X-Refreshed-Token", fresh);
      }
    } catch {
      // refreshing is best-effort; the current token is still valid
    }

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

// Certificate routes: Admitting personnel issue enrollment certificates, so they may reach these
// routes without clinical access (the certificate controller limits them to ENROLLMENT and hides
// completion details). Every other role goes through the normal clinical access check.
export function requireCertificateAccess(req, res, next) {
  if (req.user?.role === "admitting") return next();
  return requirePatientClinicalAccess(req, res, next);
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

    const inCaseload = caseloadIdsFor(req.user.id).includes(Number(patient.assigned_case_manager_id));

    if (patient.assigned_case_manager_id && !inCaseload) {
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
