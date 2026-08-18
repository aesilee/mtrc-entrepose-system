export default function Toast({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div style={styles.wrap}>
      <div style={styles.toast}>
        <span>{message}</span>
        <button type="button" style={styles.closeBtn} onClick={onDismiss} aria-label="Dismiss">×</button>
      </div>
    </div>
  );
}

const styles = {
  wrap: { position: "fixed", bottom: 24, right: 24, zIndex: 300 },
  toast: { display: "flex", alignItems: "center", gap: 12, background: "var(--color-primary-dark)", color: "#fff", padding: "12px 18px", borderRadius: "var(--radius-md, 10px)", boxShadow: "0 12px 30px rgba(0,0,0,0.25)", fontSize: 13, fontWeight: 600 },
  closeBtn: { background: "none", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", opacity: 0.8, padding: 0, lineHeight: 1 },
};