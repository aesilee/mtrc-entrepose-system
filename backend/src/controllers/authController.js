import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid username or password." });
    }
    if (user.status === "inactive") {
      return res.status(403).json({ message: "This account has been deactivated. Contact your ICT administrator." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    await pool.query("UPDATE users SET last_login = NOW(), last_login_device = ? WHERE id = ?", [req.headers["user-agent"] || null, user.id]);
    await pool.query("INSERT INTO audit_log (actor_username, action) VALUES (?, ?)", [
      user.username,
      "Logged in",
    ]);

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        role: user.role,
        photoUrl: user.photo_url || null,
        mustResetPassword: !!user.must_reset_password,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong while logging in." });
  }
}

export async function me(req, res) {
  // req.user comes from the verifyToken middleware
  res.json({ user: req.user });
}
