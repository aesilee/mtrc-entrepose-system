import { useState } from "react";

export default function TabbedPage({ tabs }) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key);
  const active = tabs.find((t) => t.key === activeTab);

  return (
    <div style={styles.wrapper}>
      <div style={styles.tabCard}>
        <div style={styles.tabBar}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab.key ? styles.tabButtonActive : {}),
              }}
            >
              {tab.icon && <span style={styles.tabIcon}>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    ...styles.countBadge,
                    ...(activeTab === tab.key ? styles.countBadgeActive : {}),
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.panel}>
        {active ? (
          <div style={styles.placeholder}>
            <div style={styles.placeholderTitle}>{active.label}</div>
            <div style={styles.placeholderText}>
              This tab is a template placeholder — build out the {active.label.toLowerCase()} module here.
            </div>
          </div>
        ) : (
          <div style={styles.placeholderText}>No tabs configured.</div>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: { padding: "28px 32px" },
  tabCard: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 16,
    padding: 8,
    marginBottom: 24,
    display: "inline-block",
  },
  tabBar: {
    display: "flex",
    gap: 4,
  },
  tabButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 600,
    color: "var(--color-text-muted)",
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "color 0.15s ease, border-color 0.15s ease",
  },
  tabButtonActive: {
    color: "var(--color-text)",
    borderBottom: "2px solid var(--color-primary-dark)",
  },
  tabIcon: {
    display: "flex",
    alignItems: "center",
    width: 16,
    height: 16,
    flexShrink: 0,
  },
  countBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--color-text-muted)",
    background: "var(--color-primary-tint)",
    padding: "2px 7px",
    borderRadius: 999,
  },
  countBadgeActive: {
    color: "var(--color-primary-dark)",
    background: "var(--color-primary-tint)",
  },
  panel: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md, 10px)",
    minHeight: 320,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    textAlign: "center",
    padding: 40,
    maxWidth: 380,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "var(--color-text)",
    marginBottom: 6,
  },
  placeholderText: {
    fontSize: 13,
    color: "var(--color-text-muted)",
  },
};