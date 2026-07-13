import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password);
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
        <div style={styles.logoMark}>M</div>
        <h1 style={styles.title}>MTRC ENTREPOSE</h1>
        <p style={styles.subtitle}>Patient &amp; Case Monitoring System</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Username
            <input
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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
