import AppShell from "../components/AppShell.jsx";

export default function ComingSoon({ title, description }) {
  return (
    <AppShell title={title} description={description}>
      <div style={styles.card}>
        <p style={styles.text}>
          {title} hasn't been built yet. This is next once Login and User
          Management are working end to end.
        </p>
      </div>
    </AppShell>
  );
}

const styles = {
  card: {
    background: "var(--color-surface)",
    border: "1px dashed var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: 32,
  },
  text: {
    color: "var(--color-text-muted)",
    fontSize: 14,
  },
};
