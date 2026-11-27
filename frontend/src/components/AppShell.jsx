import { useAuth } from "../context/AuthContext.jsx";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import useViewport from "../hooks/useViewport.js";

export default function AppShell({ title, description, children }) {
  const { user } = useAuth();
  const { isMobile } = useViewport();
  if (!user) return null;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F2F7F1" }}>
      <Sidebar user={user} />
      <div
        style={{
          flex: 1,
          height: "100vh",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(145deg, #F2F7F1 0%, #F7F6F1 52%, #EAF3EB 100%)",
        }}
      >
        {/* Top-right & Side Abstract Warm-Green Wave + Leaf Border Decoration */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <defs>
            <linearGradient id="mtrcTopWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8FB361" stopOpacity="0.18" />
              <stop offset="55%" stopColor="#357648" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#739E82" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="mtrcTopWaveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#357648" stopOpacity="0.14" />
              <stop offset="65%" stopColor="#8FB361" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="mtrcSideBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#739E82" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#8FB361" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Sweeping top-right warm green organic waves */}
          <path
            d="M880,0 C980,75 1120,45 1240,120 C1340,180 1395,280 1440,340 L1440,0 Z"
            fill="url(#mtrcTopWaveGrad)"
          />
          <path
            d="M1020,0 C1110,55 1210,40 1310,105 C1380,150 1415,220 1440,260 L1440,0 Z"
            fill="url(#mtrcTopWaveGrad2)"
          />

          {/* Subtle right-side & bottom-right abstract warm-green border wave */}
          <path
            d="M1440,480 C1390,560 1405,670 1335,755 C1265,840 1150,865 1060,900 L1440,900 Z"
            fill="url(#mtrcSideBorderGrad)"
          />
          <path
            d="M0,780 C95,825 210,855 340,900 L0,900 Z"
            fill="url(#mtrcSideBorderGrad)"
          />
        </svg>

        <Topbar title={title} description={description} />
        <main
          style={{
            padding: isMobile ? "16px 16px 84px" : "22px 30px 30px",
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            // No zIndex here on purpose: a zIndex would trap every dialog opened inside the page
            // below the top bar (zIndex 20). Being positioned and after the background SVG in the
            // DOM is enough to paint above the decoration.
            position: "relative",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
