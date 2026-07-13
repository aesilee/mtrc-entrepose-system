import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

export default function Topbar({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header style={styles.header}>
      <h1 style={styles.title}>{title}</h1>
      <div style={styles.right}>
        <span style={styles.name}>{user.fullName}</span>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 32px",
    borderBottom: "1px solid var(--color-border)",
    background: "var(--color-bg)",
  },
  title: {
    fontSize: 20,
    fontWeight: 800,
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  name: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--color-text-muted)",
  },
  logoutBtn: {
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    padding: "8px 14px",
    borderRadius: "var(--radius-sm)",
    fontSize: 13,
    fontWeight: 600,
  },
};
