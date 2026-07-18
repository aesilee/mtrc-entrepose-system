import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.4 19.4 0 0 1 4.22-5.36M9.9 4.24A10.6 10.6 0 0 1 12 4c7 0 11 8 11 8a19.5 19.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);

  useEffect(() => {
    api.get("/settings/public").then(({ data }) => setOrg(data.settings)).catch(() => {});
  }, []);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    const remembered = localStorage.getItem("mtrc_remembered_username");
    if (remembered) {
      setUsername(remembered);
      setRememberMe(true);
    }
  }, []);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      setError(err.response?.data?.message || "Unable to log in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {org?.organization_logo ? (
          <img src={org.organization_logo} alt="Organization logo" style={{ ...styles.logoMark, objectFit: "contain", background: "#fff" }} />
        ) : (
          <div style={styles.logoMark}>M</div>
        )}
        <h1 style={styles.title}>{org?.organization_name || "MTRC ENTREPOSE"}</h1>
        <p style={styles.subtitle}>Patient &amp; Case Monitoring System</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Username
            <input
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              required
            />
          </label>

          <label style={styles.label}>
            Password
            <div style={styles.passwordWrap}>
              <input
                style={styles.passwordInput}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          </label>

          <label style={styles.rememberRow}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={styles.checkbox}
            />
            Remember me
          </label>

          {error && <div style={styles.error}>{error}</div>}

          <button style={styles.submitBtn} type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Log in"}
          </button>
        </form>

        <p style={styles.footnote}>
          Accounts are created by your ICT Administrator. Contact them if you
          don't have login credentials.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--color-bg)",
  },
  card: {
    width: 380,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "36px 32px",
    textAlign: "center",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  logoMark: {
    width: 44,
    height: 44,
    margin: "0 auto 16px",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-primary)",
    color: "#fff",
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: 800,
    color: "var(--color-primary-dark)",
  },
  subtitle: {
    fontSize: 13,
    color: "var(--color-text-muted)",
    marginTop: 4,
    marginBottom: 28,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    textAlign: "left",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "var(--color-text)",
  },
  input: {
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    fontSize: 14,
  },
  passwordWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  passwordInput: {
    width: "100%",
    padding: "10px 40px 10px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    fontSize: 14,
  },
  eyeBtn: {
    position: "absolute",
    right: 8,
    background: "none",
    border: "none",
    padding: 4,
    display: "flex",
    alignItems: "center",
    color: "var(--color-text-muted)",
  },
  rememberRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 500,
    color: "var(--color-text-muted)",
    cursor: "pointer",
  },
  checkbox: {
    width: 15,
    height: 15,
    accentColor: "var(--color-primary)",
  },
  error: {
    background: "var(--color-danger-tint)",
    color: "var(--color-danger)",
    fontSize: 13,
    padding: "8px 10px",
    borderRadius: "var(--radius-sm)",
  },
  submitBtn: {
    marginTop: 4,
    padding: "11px 12px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: "var(--color-primary)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
  },
  footnote: {
    marginTop: 24,
    fontSize: 12,
    color: "var(--color-text-muted)",
  },
};