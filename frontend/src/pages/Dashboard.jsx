import AppShell from "../components/AppShell.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABELS } from "../config/roles.js";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <AppShell title="Dashboard" description="Overview of enrollment, attendance, and program activity.">
      <div style={styles.card}>
        <h2 style={styles.heading}>Welcome, {user.fullName.split(" ")[0]}</h2>
        <p style={styles.text}>
          You're signed in as <strong>{ROLE_LABELS[user.role]}</strong>. Real
          summary statistics (enrollment, attendance rate, flagged sessions)
          will appear here once the Client Profiling and Attendance modules
          are connected.
        </p>
      </div>
    </AppShell>
  );
}

const styles = {
  card: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: 32,
    maxWidth: 640,
  },
  heading: {
    fontSize: 18,
    marginBottom: 10,
  },
  text: {
    color: "var(--color-text-muted)",
    fontSize: 14,
    lineHeight: 1.6,
  },
};
