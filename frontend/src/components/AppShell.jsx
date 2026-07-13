import { useAuth } from "../context/AuthContext.jsx";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

export default function AppShell({ title, children }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div style={{ display: "flex" }}>
      <Sidebar user={user} />
      <div style={{ flex: 1, minHeight: "100vh" }}>
        <Topbar title={title} />
        <main style={{ padding: 32 }}>{children}</main>
      </div>
    </div>
  );
}
