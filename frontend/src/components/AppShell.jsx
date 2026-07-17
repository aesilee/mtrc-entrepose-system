import { useAuth } from "../context/AuthContext.jsx";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import useViewport from "../hooks/useViewport.js";

export default function AppShell({ title, description, children }) {
  const { user } = useAuth();
  const { isMobile } = useViewport();
  if (!user) return null;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar user={user} />
      <div style={{ flex: 1, height: "100vh", minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Topbar title={title} description={description} />
        <main
          style={{
            padding: isMobile ? "16px 16px 84px" : 32,
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}