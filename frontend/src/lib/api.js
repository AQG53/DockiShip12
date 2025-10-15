import axiosInstance, { TOKEN_KEY, USER_KEY, TENANT_KEY } from "./axios";
import { jwtDecode } from "jwt-decode";

export async function login_owner({ email, password, tenantId }) {
  const body = tenantId ? { email, password, tenantId } : { email, password };

  const res = await axiosInstance.post("/auth/owner/login", body, {
    headers: { Authorization: undefined, "X-Tenant-ID": undefined }
  });

  const { access_token, user, tenant, needTenantSelection, ownedTenants } = res.data || {};

  if (access_token) {
    localStorage.setItem(TOKEN_KEY, access_token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    const finalTenantId = (tenant && tenant.id) || tenantId;
    if (finalTenantId) localStorage.setItem(TENANT_KEY, finalTenantId);
    window.dispatchEvent(new Event("auth-changed"));
  }

  return res.data || {};
}

export async function login_member({ email, password, tenantId }) {
  const body = tenantId ? { email, password, tenantId } : { email, password };

  const res = await axiosInstance.post("/auth/member/login", body, {
    headers: { Authorization: undefined, "X-Tenant-ID": undefined }
  });
  const { access_token, user, tenant, needTenantSelection, ownedTenants } = res.data || {};

  if (access_token) {
    localStorage.setItem(TOKEN_KEY, access_token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    const finalTenantId = (tenant && tenant.id) || tenantId;
    if (finalTenantId) localStorage.setItem(TENANT_KEY, finalTenantId);
    window.dispatchEvent(new Event("auth-changed"));
  }

  return res.data || {};
}

export async function signup_owner({ fullName, email, password }) {
  const res = await axiosInstance.post(
    "/auth/owner/register",
    { fullName, email, password },
    {
      headers: {
        Authorization: undefined,
        "X-Tenant-ID": undefined,
      },
      skipAuthRedirect: true,
      validateStatus: () => true,
    }
  );
  const { access_token, user } = res.data || {};

  if (access_token) {
    localStorage.setItem(TOKEN_KEY, access_token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("auth-changed"));
  }


  return res.data;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("auth-changed"));
}
export function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function getRoles() {
  const res = await axiosInstance.get("/roles");

  const raw = res.data;
  const rows =
    raw?.data?.data ||
    raw?.data ||
    raw || [];

  return (Array.isArray(rows) ? rows : []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? r.roleDescription ?? "",
    createdAt: r.createdAt ?? r.created_at ?? r.createdOn ?? null,
    permissions: r.permissions || r.permissionNames || [],
  }));
}

export async function listRoles() {
  const res = await axiosInstance.get("/roles");
  return res.data?.data ?? res.data ?? [];
}

export async function listPermissions() {
  const res = await axiosInstance.get("/permissions");
  const raw = res.data?.data ?? res.data ?? [];
  const names = raw.map(p => typeof p === "string" ? p : p?.name).filter(Boolean);
  return names;
}

export async function createRole(payload) {
  const res = await axiosInstance.post("/roles", payload);
  return res.data?.data ?? res.data;
}

export async function updateRoleFull(roleId, { name, description, permissionNames }) {
  const res = await axiosInstance.patch(`/roles/${roleId}`, {
    name,
    description,
    permissionNames,
  });
  return res.data;
}

export async function createTenant({ tenantName, description }) {
  const res = await axiosInstance.post("/tenants", {
    tenantName,
    description,
  });
  return res.data;
}

function getCurrentUserId() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const usr = JSON.parse(raw);
    return usr?.id || usr?.userId || null;
  } catch {
    return null;
  }
}

export async function listUsers() {
  const res = await axiosInstance.get("/users");
  const arr = Array.isArray(res?.data?.data) ? res.data.data : [];

  const selfId = getCurrentUserId();
  const filtered = arr.filter((u) => (u.userId || u.id) !== selfId);

  return filtered.map((u) => ({
    id: u.userId || u.id || null,
    email: u.email || "",
    fullName: u.fullName || "",
    isActive: !!u.isActive,
    membershipId: u.membershipId || "",
    status: u.status || (u.isActive ? "active" : "inactive"),
    roles: (Array.isArray(u.roles) ? u.roles : []).map((name) => ({
      id: name,
      name,
    })),
    raw: u,
  }));
}

export async function inviteMember({ email, fullName }) {
  const res = await axiosInstance.post("/users/invite", { email, fullName });
  return res.data?.data ?? res.data;
}

export async function findUserByEmail(email) {
  const res = await axiosInstance.get("/users", { params: { q: email } });
  const rows = res.data?.data ?? [];
  return Array.isArray(rows) ? rows.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null : null;
}

export async function assignRolesToUser(userId, roleIds) {
  const res = await axiosInstance.post(`/users/${userId}/roles/add`, { roleIds });
  return res.data?.data ?? res.data;
}

export async function requestPasswordReset({ email }) {
  const body =  { email };
  const res = await axiosInstance.post("/auth/password/request", body, {
    headers: { Authorization: undefined, "X-Tenant-ID": undefined },
  });
  return res.data;
}

export async function resetPassword({token, password}) {
  const body = {token, password};
  const res = await axiosInstance.post("/auth/password/reset", body, {
    headers: { Authorization: undefined, "X-Tenant-ID": undefined },
  });
  return res.data;
}
