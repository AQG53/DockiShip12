import axiosInstance, { TOKEN_KEY, USER_KEY, TENANT_KEY } from "./axios";

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

export async function login_member({ email, password }) {
  const res = await axiosInstance.post("/auth/member/login", { email, password }, {
    headers: { Authorization: undefined, "X-Tenant-ID": undefined }
  });
  const { access_token, user } = res.data || {};

  localStorage.setItem(TOKEN_KEY, access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  window.dispatchEvent(new Event("auth-changed"));

  return { access_token, user };
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