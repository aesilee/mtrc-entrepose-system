import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("mtrc_token") || sessionStorage.getItem("mtrc_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Keep the session alive while the user is active, and send them back to login when it has expired.
api.interceptors.response.use(
  (response) => {
    const fresh = response.headers?.["x-refreshed-token"];
    if (fresh) {
      // Only renew the login that made this request. A slow request from a previous account must not
      // overwrite the token of whoever is signed in now (e.g. after logging out and into another account).
      const sentWith = String(response.config?.headers?.Authorization || "").replace(/^Bearer\s+/, "");
      if (sentWith && localStorage.getItem("mtrc_token") === sentWith) localStorage.setItem("mtrc_token", fresh);
      else if (sentWith && sessionStorage.getItem("mtrc_token") === sentWith) sessionStorage.setItem("mtrc_token", fresh);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const hadToken = localStorage.getItem("mtrc_token") || sessionStorage.getItem("mtrc_token");
    if (status === 401 && hadToken && !url.includes("/auth/login")) {
      ["mtrc_token", "mtrc_user"].forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login?expired=1");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
