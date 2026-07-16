import AppShell from "../components/AppShell.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function ComingSoon({ title, description }) {
  return (
    <AppShell title={title} description={description}>
      <div style={styles.card}>
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
              <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
          }
          title={`${title} is coming soon`}
          description="This module hasn't been built yet — it's next up as the rest of the system comes together."
        />
      </div>
    </AppShell>
  );
}

const styles = {
  card: {
    background: "var(--color-surface)",
    border: "1px dashed var(--color-border)",
    borderRadius: "var(--radius-lg)",
  },
};