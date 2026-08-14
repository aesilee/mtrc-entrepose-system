import { useAuth } from "../context/AuthContext.jsx";
import NotificationBell from "./NotificationBell.jsx";

export default function Topbar({ title, description }) {
  const { user } = useAuth();

  return (
    <header style={styles.header}>
      <div style={{ minWidth: 0 }}>
        <h1 style={styles.title}>{title}</h1>
        {description && <p style={styles.description}>{description}</p>}
      </div>
      <div style={styles.right}>
        {(user.role === "ict_admin" || user.role === "him_staff" || user.role === "case_manager") && <NotificationBell />}
        <span style={styles.name}>{user.fullName}</span>
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
    margin: 0,
  },
  menuBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    flexShrink: 0,
    background: "none",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text)",
    cursor: "pointer",
  },
  description: {
    fontSize: 13,
    color: "var(--color-text-muted)",
    marginTop: 2,
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
