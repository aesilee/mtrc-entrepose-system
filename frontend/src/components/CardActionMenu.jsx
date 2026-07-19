import { useEffect, useRef, useState } from "react";

const iconProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

export default function CardActionMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={styles.wrap} onClick={(e) => e.stopPropagation()}>
      <button type="button" style={styles.dotsBtn} onClick={() => setOpen((v) => !v)} aria-label="Actions">
        <svg {...iconProps} width="18" height="18">
          <circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {open && (
        <div style={styles.menu}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              style={{ ...styles.menuItem, ...(item.danger ? styles.menuItemDanger : {}) }}
              onClick={() => { setOpen(false); item.onClick(); }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { position: "absolute", top: 10, right: 10 },
  dotsBtn: { width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--color-text-muted)" },
  menu: { position: "absolute", top: "calc(100% + 4px)", right: 0, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", boxShadow: "0 10px 24px rgba(0,0,0,0.15)", minWidth: 170, overflow: "hidden", zIndex: 20 },
  menuItem: { display: "block", width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 13, fontWeight: 600, background: "none", border: "none", cursor: "pointer", color: "var(--color-text)" },
  menuItemDanger: { color: "var(--color-danger, #B3261E)" },
};