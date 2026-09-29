import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import useViewport from "../hooks/useViewport.js";

import dohSeal from "../assets/logos/doh_seal.jpg";
import mtrcLogo from "../assets/logos/mtrc_logo.jpg";
import bagongPilipinas from "../assets/logos/bagong_pilipinas.png";
import tuvNordLogo from "../assets/logos/tuv_nord_iso9001.jpg";

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.4 19.4 0 0 1 4.22-5.36M9.9 4.24A10.6 10.6 0 0 1 12 4c7 0 11 8 11 8a19.5 19.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

const OFFICIAL_LOGOS = [
  { src: dohSeal, alt: "Department of Health", title: "Department of Health" },
  { src: mtrcLogo, alt: "Malinao Treatment and Rehabilitation Center", title: "MTRC Malinao" },
  { src: bagongPilipinas, alt: "Bagong Pilipinas", title: "Bagong Pilipinas" },
  { src: tuvNordLogo, alt: "TÜV NORD ISO 9001 Certified", title: "ISO 9001 Certified" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useViewport();
  const isCompact = isMobile || isTablet;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  useEffect(() => {
    const remembered = localStorage.getItem("mtrc_remembered_username");
    if (remembered) {
      setUsername(remembered);
      setRememberMe(true);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password, rememberMe);

      if (rememberMe) {
        localStorage.setItem("mtrc_remembered_username", username);
      } else {
        localStorage.removeItem("mtrc_remembered_username");
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid username or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.container}>
      {/* Top & Bottom Accent Border Stripes */}
      <div style={styles.topAccentBar} />
      <div style={styles.bottomAccentBar} />

      {/* Centered Login Card */}
      <div style={{ ...styles.card, flexDirection: isCompact ? "column" : "row" }}>
        
        {/* ================= LEFT INSTITUTIONAL PANEL ================= */}
        <div style={{ ...styles.heroPanel, padding: isCompact ? "32px 24px" : "48px 42px" }}>
          <div style={styles.heroContent}>
            {/* Logos Bar (Bigger, more prominent) */}
            <div style={styles.logosRow}>
              {OFFICIAL_LOGOS.map((logo) => (
                <div key={logo.title} style={styles.logoItem} title={logo.title}>
                  <img src={logo.src} alt={logo.alt} style={styles.logoImg} />
                </div>
              ))}
            </div>

            {/* Structured Institutional Identity */}
            <div style={styles.identityBlock}>
              <span style={styles.kicker}>REPUBLIC OF THE PHILIPPINES • DEPARTMENT OF HEALTH</span>
              <h1 style={styles.facilityTitle}>Malinao Treatment &amp; Rehabilitation Center</h1>
              <div style={styles.accentLine} />
              <p style={styles.systemSubtitle}>Patient Management &amp; Case Monitoring System</p>
            </div>
          </div>
        </div>

        {/* ================= RIGHT LOGIN FORM PANEL ================= */}
        <div style={{ ...styles.formPanel, padding: isCompact ? "32px 24px" : "48px 42px" }}>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>Log in</h2>
            <p style={styles.formSubtitle}>Enter your credentials to access your account.</p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Username Input */}
            <div style={styles.field}>
              <label htmlFor="login-username" style={styles.label}>
                Username
              </label>
              <div
                style={{
                  ...styles.inputWrap,
                  borderColor: focusedInput === "username" ? "#2f6f4f" : "#d9e0da",
                  boxShadow: focusedInput === "username" ? "0 0 0 3px rgba(47, 111, 79, 0.12)" : "none",
                }}
              >
                <span style={styles.inputIcon}>
                  <UserIcon />
                </span>
                <input
                  id="login-username"
                  type="text"
                  style={styles.input}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedInput("username")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="Enter your username"
                  autoFocus
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div style={styles.field}>
              <label htmlFor="login-password" style={styles.label}>
                Password
              </label>
              <div
                style={{
                  ...styles.inputWrap,
                  borderColor: focusedInput === "password" ? "#2f6f4f" : "#d9e0da",
                  boxShadow: focusedInput === "password" ? "0 0 0 3px rgba(47, 111, 79, 0.12)" : "none",
                }}
              >
                <span style={styles.inputIcon}>
                  <LockIcon />
                </span>
                <input
                  id="login-password"
                  style={styles.input}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <label style={styles.rememberRow}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={styles.checkbox}
              />
              <span style={styles.rememberText}>Remember me</span>
            </label>

            {/* Error Message */}
            {error && (
              <div style={styles.error} role="alert">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              style={{
                ...styles.submitBtn,
                opacity: submitting ? 0.75 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Logging in…" : "Log in"}
            </button>
          </form>

          <p style={styles.footnote}>
            Accounts are created by the ICT Administrator. Contact them if you need access.
          </p>
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    width: "100%",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ffffff", // Pure white, no icons, no patterns
    padding: "24px 16px",
    fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
  },

  // ---------------- TOP & BOTTOM ACCENT BORDERS ----------------
  topAccentBar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    background: "linear-gradient(90deg, #163823 0%, #2f6f4f 50%, #163823 100%)",
    boxShadow: "0 2px 10px rgba(22, 56, 35, 0.15)",
    zIndex: 10,
  },
  bottomAccentBar: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    height: 5,
    background: "linear-gradient(90deg, #163823 0%, #2f6f4f 50%, #163823 100%)",
    boxShadow: "0 -2px 10px rgba(22, 56, 35, 0.15)",
    zIndex: 10,
  },

  // ---------------- LOGIN CARD ----------------
  card: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    width: "100%",
    maxWidth: 880, // Slightly wider for spacious, balanced layout
    background: "#ffffff",
    borderRadius: 16,
    boxShadow: "0 20px 50px -12px rgba(22, 56, 35, 0.15), 0 0 1px 1px rgba(0, 0, 0, 0.04)",
    overflow: "hidden",
    borderTop: "4px solid #2f6f4f",
    borderBottom: "4px solid #2f6f4f",
    borderLeft: "1px solid rgba(47, 111, 79, 0.14)",
    borderRight: "1px solid rgba(47, 111, 79, 0.14)",
  },

  // ---------------- LEFT INSTITUTIONAL PANEL ----------------
  heroPanel: {
    flex: 1.1,
    background: "linear-gradient(155deg, #183a26 0%, #234f39 100%)",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  heroContent: {
    display: "flex",
    flexDirection: "column",
    gap: 36, // Well-proportioned space between logos and text
  },

  logosRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  logoItem: {
    width: 58, // Prominent, clear logo size
    height: 58,
    borderRadius: "50%",
    background: "#ffffff",
    padding: 4.5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.22)",
    border: "2px solid rgba(255, 255, 255, 0.9)",
    opacity: 0.96,
  },
  logoImg: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    objectFit: "contain",
  },

  identityBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  kicker: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "1.6px",
    color: "rgba(255, 255, 255, 0.8)",
    textTransform: "uppercase",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  facilityTitle: {
    fontSize: 27, // Bold, formal, large title
    fontWeight: 700,
    lineHeight: 1.3,
    color: "#ffffff",
    margin: 0,
    fontFamily: "'Merriweather', 'Georgia', 'Times New Roman', serif",
  },
  accentLine: {
    width: 54,
    height: 3.5,
    background: "rgba(255, 255, 255, 0.45)",
    margin: "14px 0 10px",
    borderRadius: 2,
  },
  systemSubtitle: {
    fontSize: 15,
    fontWeight: 500,
    color: "rgba(255, 255, 255, 0.9)",
    margin: 0,
    lineHeight: 1.5,
  },

  // ---------------- RIGHT LOGIN FORM PANEL ----------------
  formPanel: {
    flex: 1,
    background: "#ffffff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  formHeader: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 26, // Bigger form title
    fontWeight: 800,
    color: "#18201a",
    margin: 0,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    letterSpacing: "-0.01em",
  },
  formSubtitle: {
    fontSize: 13.5,
    color: "#6b7280",
    marginTop: 6,
    marginBottom: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18, // Comfortable field spacing
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
  },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    background: "#ffffff",
    border: "1.5px solid #d9e0da",
    borderRadius: 8,
    padding: "0 14px",
    height: 44, // Comfortable input height
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  inputIcon: {
    color: "#9ca3af",
    display: "flex",
    alignItems: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    height: "100%",
    border: "none",
    outline: "none",
    fontSize: 14,
    color: "#111827",
    background: "transparent",
    fontFamily: "inherit",
  },
  eyeBtn: {
    background: "none",
    border: "none",
    padding: 4,
    display: "flex",
    alignItems: "center",
    color: "#9ca3af",
    borderRadius: 4,
    cursor: "pointer",
  },
  rememberRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    userSelect: "none",
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: "#2f6f4f",
    cursor: "pointer",
  },
  rememberText: {
    fontSize: 13,
    color: "#4b5563",
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    fontSize: 12.5,
    padding: "9px 12px",
    borderRadius: 6,
    lineHeight: 1.4,
  },
  submitBtn: {
    height: 46, // Comfortable button height
    background: "#2f6f4f",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    fontSize: 14.5,
    fontWeight: 700,
    letterSpacing: "0.2px",
    transition: "background 0.2s ease",
    marginTop: 4,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  footnote: {
    marginTop: 22,
    fontSize: 11.5,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 1.45,
    margin: "22px 0 0",
  },
};