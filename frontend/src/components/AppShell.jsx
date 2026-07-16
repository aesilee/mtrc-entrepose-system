import { useAuth } from "../context/AuthContext.jsx";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

export default function AppShell({ title, description, children }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar user={user} />
      <div style={{ flex: 1, height: "100vh", display: "flex", flexDirection: "column" }}>
        <Topbar title={title} description={description} />
        <main
          style={{
            padding: 32,
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