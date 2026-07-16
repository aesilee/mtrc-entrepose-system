export default function EmptyState({ icon, title, description, action }) {
  return (
    <div style={styles.wrapper}>
      {icon && <div style={styles.iconRow}>{icon}</div>}
      <div style={styles.title}>{title}</div>
      {description && <div style={styles.description}>{description}</div>}
      {action && <div style={styles.action}>{action}</div>}
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "56px 24px",
    gap: 6,
  },
  iconRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "var(--color-primary-tint)",
    color: "var(--color-primary-dark)",
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: "var(--color-text)",
  },
  description: {
    fontSize: 13,
    color: "var(--color-text-muted)",
    maxWidth: 340,
    lineHeight: 1.6,
  },
  action: { marginTop: 12 },
};