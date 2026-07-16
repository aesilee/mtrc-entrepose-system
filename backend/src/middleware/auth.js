import jwt from "jsonwebtoken";
import pool from "../config/db.js";

// Confirms the request carries a valid token and attaches the decoded
// user (id, username, role) to req.user for later handlers to use.
export function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided." });
  }

  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    // Fire-and-forget — don't block the request on this
    pool.query("UPDATE users SET last_active = NOW() WHERE id = ?", [req.user.id]).catch(() => {});
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
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
