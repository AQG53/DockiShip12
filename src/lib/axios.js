import axios from "axios";

export const TOKEN_KEY = "ds_access_token";
export const USER_KEY = "ds_user";
export const TENANT_KEY = "ds_tenant_id";

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getTenantId() {
  return localStorage.getItem(TENANT_KEY);
}

export function setTenantId(id) {
  localStorage.setItem(TENANT_KEY, id || "");
  window.dispatchEvent(new Event("tenant-changed"));
}

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" }
});

function decodeJwtPayload(token) {
  try {
    const payloadPart = String(token || "").split(".")[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function resolveTenantId() {
  const fromStorage = getTenantId();
  if (fromStorage) return fromStorage;

  try {
    const rawUser = localStorage.getItem(USER_KEY);
    const user = rawUser ? JSON.parse(rawUser) : null;
    const fromUser = user?.tenantId || user?.tenant?.id || user?.activeTenantId || "";
    if (fromUser) {
      localStorage.setItem(TENANT_KEY, fromUser);
      return fromUser;
    }
  } catch {
    // ignore parse errors and fallback to JWT claim
  }

  const token = getAccessToken();
  const payload = decodeJwtPayload(token);
  const fromToken = payload?.tenantId || "";
  if (fromToken) {
    localStorage.setItem(TENANT_KEY, fromToken);
    return fromToken;
  }

  return "";
}

axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  const tenantId = resolveTenantId();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  else delete config.headers.Authorization;
  if (tenantId) {
    config.headers = config.headers || {};
    config.headers["X-Tenant-ID"] = tenantId;
  }
  else delete config.headers["X-Tenant-ID"];
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const currentPath = window.location.pathname;

    if (status === 401 && !currentPath.includes('/login')) {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.dispatchEvent(new Event("auth-changed"));
      } finally {
        const LOGIN_ROUTE = "/login/owner";
        window.location.replace(LOGIN_ROUTE);
      }
    }
    return Promise.reject(error);
  }
);


export default axiosInstance;
