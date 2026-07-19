import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios.js";

const AuthContext = createContext(null);

// "Remember me" checked  -> localStorage (survives closing the browser)
// "Remember me" unchecked -> sessionStorage (cleared once the tab/browser closes)
function readStoredUser() {
  const fromLocal = localStorage.getItem("mtrc_user");
  if (fromLocal) return JSON.parse(fromLocal);

  const fromSession = sessionStorage.getItem("mtrc_user");
  if (fromSession) return JSON.parse(fromSession);

  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readStoredUser();
    setUser(stored);
    setLoading(false);
    if (stored) refreshPhoto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshPhoto() {
    try {
      const { data } = await api.get("/profile");
      updateStoredUser({ photoUrl: data.profile.photo_url || null });
    } catch {
      // not fatal — sidebar just falls back to initials
    }
  }

  async function login(username, password, rememberMe = true) {
    const { data } = await api.post("/auth/login", { username, password });

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("mtrc_token", data.token);
    storage.setItem("mtrc_user", JSON.stringify(data.user));

    setUser(data.user);
    return data.user;
  }

  function updateStoredUser(partial) {
    setUser((prev) => {
      const next = { ...prev, ...partial };
      if (localStorage.getItem("mtrc_user")) localStorage.setItem("mtrc_user", JSON.stringify(next));
      if (sessionStorage.getItem("mtrc_user")) sessionStorage.setItem("mtrc_user", JSON.stringify(next));
      return next;
    });
  }

  function logout() {
    localStorage.removeItem("mtrc_token");
    localStorage.removeItem("mtrc_user");
    sessionStorage.removeItem("mtrc_token");
    sessionStorage.removeItem("mtrc_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateStoredUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}