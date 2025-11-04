import axiosInstance, { TOKEN_KEY, USER_KEY, TENANT_KEY, getTenantId } from "./axios";
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
  localStorage.removeItem(TENANT_KEY);
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
  const res = await axiosInstance.put(`/roles/${roleId}/permissions`, {
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
    createdAt: u.createdAt,
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
  const res = await axiosInstance.put(`/users/${userId}/roles`, { roleIds });
  return res.data?.data ?? res.data;
}

export async function requestPasswordReset({ email }) {
  const body =  { email };
  const res = await axiosInstance.post("/auth/password/request", body, {
    headers: { Authorization: undefined, "X-Tenant-ID": undefined },
  });
  return res.data;
}

export async function resetPassword({token, newPassword}) {
  const body = {token, newPassword};
  const res = await axiosInstance.post("/auth/password/reset", body, {
    headers: { Authorization: undefined, "X-Tenant-ID": undefined },
  });
  return res.data;
}

export async function authCheck() {
  const res = await axiosInstance.get("/auth/check");
  const data = res?.data || {};
  return {
    valid: !!data.valid,
    user: data.user || null,
    tenant: data.tenant || null,
    roles: Array.isArray(data.roles) ? data.roles : [],
    perms: Array.isArray(data.perms) ? data.perms : [],
    raw: data,
  };
}

export async function deleteUser(userId) {
  if (!userId) throw new Error("Missing userId");
  const res = await axiosInstance.delete(`/users/${userId}`);
  return res?.data?.ok === true;
}

export async function deleteRole(roleId) {
  if(!roleId) throw new Error("Missing roleId");
  const res = await axiosInstance.delete(`/roles/${roleId}`);
  return res?.data?.ok === true;
}

export async function updateMyProfile({ fullName, phone, country }) {
  const raw = localStorage.getItem(USER_KEY);
  let userId = null;
  try {
    const u = raw ? JSON.parse(raw) : null;
    userId = u?.id || u?.userId || null;
  } catch {}

  if (!userId) throw new Error('No current user');

  const res = await axiosInstance.patch(`/users/${userId}`, {
    fullName,
    phone,
    country,
  });
  return res.data;
}

export async function updateTenant({ name, description, currency, timezone }) {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error("No active tenantId");

  const res = await axiosInstance.patch(`/tenants/${tenantId}`, {
    name,
    description,
    currency,
    timezone, 
  });
  return res.data?.data ?? res.data ?? {};
}

export async function deleteCurrentTenant() {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error("No active tenantId");

  const res = await axiosInstance.delete(`/tenants/${tenantId}`);
  return res?.status === 200 || res?.status === 204 || res?.data?.ok === true;
}

export async function acceptInvite({ token }) {
  if (!token) throw new Error("Missing invitation token");
  const res = await axiosInstance.post(
    "/invitations/accept",
    { token },
    { headers: { Authorization: undefined, "X-Tenant-ID": undefined } }
  );
  return res?.data ?? {};
}

export async function listProducts({ page, perPage, search, status } = {}) {
  const params = {};
  if (page != null) params.page = page;
  if (perPage != null) params.perPage = perPage;
  if (search) params.search = search;
  if (status) params.status = status;

  const res = await axiosInstance.get("/products");
  const payload = res?.data ?? {};
  const inner = payload?.data ?? payload;

  const rows =
    inner?.data ??
    inner?.items ??
    inner?.rows ??
    (Array.isArray(inner) ? inner : []);

  const meta = {
    page: inner?.page ?? payload?.page ?? null,
    perPage: inner?.perPage ?? payload?.perPage ?? null,
    total: inner?.total ?? payload?.total ?? rows.length ?? 0,
  };

  return { rows: Array.isArray(rows) ? rows : [], meta };
}

export async function deleteProduct(productId) {
  if (!productId) throw new Error("Missing productId");
  const res = await axiosInstance.delete(`/products/${productId}`);
  return res?.status === 200 || res?.status === 204 || res?.data?.ok === true;
}

export async function getProductMetaEnums() {
  const res = await axiosInstance.get("/products/meta/enums");
  return res?.data ?? {};
}

export async function createProduct(payload) {
  const res = await axiosInstance.post("/products", payload);
  return res?.data?.data ?? res?.data ?? {};
}

export async function getProductById(productId) {
  const res = await axiosInstance.get(`/products/${productId}`);
  const data = res?.data?.data ?? res?.data ?? {};
  return data;
}

export async function updateProductParent(productId, payload) {
  const res = await axiosInstance.patch(`/products/${productId}`, payload);
  return res?.data?.data ?? res?.data ?? {};
}

export async function updateProductVariant(productId, variantId, payload) {
  const res = await axiosInstance.patch(`/products/${productId}/variants/${variantId}`, payload);
  return res?.data?.data ?? res?.data ?? {};
}

export async function addProductVariant(productId, payload) {
  const res = await axiosInstance.post(`/products/${productId}/variants`, payload);
  return res?.data?.data ?? res?.data ?? {};
}

// ---------- Images ----------
export async function uploadProductImages(productId, files, { variantId } = {}) {
  if (!productId) throw new Error('Missing productId');
  if (!files || files.length === 0) return [];
  const form = new FormData();
  Array.from(files).forEach((f) => form.append('images', f));
  if (variantId) form.append('variantId', variantId);
  const res = await axiosInstance.post(`/products/${productId}/images${variantId ? `?variantId=${encodeURIComponent(variantId)}` : ''}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res?.data?.data ?? res?.data ?? [];
}

export async function listProductImages(productId) {
  const res = await axiosInstance.get(`/products/${productId}/images`);
  return res?.data?.data ?? res?.data ?? [];
}

export async function deleteProductImage(productId, imageId) {
  const res = await axiosInstance.delete(`/products/${productId}/images/${imageId}`);
  return res?.data?.ok === true || res?.status === 200 || res?.status === 204;
}

// =====================
// Suppliers
// =====================
export async function listSuppliers() {
  const res = await axiosInstance.get('/suppliers');
  const payload = res?.data ?? {};
  const rows = payload?.data ?? payload ?? [];
  return Array.isArray(rows) ? rows : [];
}

export async function createSupplier(payload) {
  const res = await axiosInstance.post('/suppliers', payload);
  return res?.data?.data ?? res?.data ?? {};
}

export async function updateSupplier(id, payload) {
  if (!id) throw new Error('Missing supplier id');
  const res = await axiosInstance.patch(`/suppliers/${id}`, payload);
  return res?.data?.data ?? res?.data ?? {};
}

export async function archiveSupplier(id) {
  if (!id) throw new Error('Missing supplier id');
  const res = await axiosInstance.patch(`/suppliers/${id}/archive`);
  return res?.data?.ok === true || res?.status === 200 || res?.status === 204;
}

/** ---------- Supplier ⇄ Products ---------- **/
// export async function listSupplierProducts(supplierId, params = {}) {
//   if (!supplierId) throw new Error('Missing supplierId');
//   const { q } = params;
//   const res = await axiosInstance.get(`/suppliers/${supplierId}/products`, { params: { q } });
//   // normalize for UI
//   const arr = res?.data?.data ?? res?.data ?? [];
//   return (Array.isArray(arr) ? arr : []).map(p => ({
//     id: p.id,
//     name: p.name,
//     stock: p.stock ?? 0,
//     imageUrl: Array.isArray(p.images) && p.images[0]?.url ? p.images[0].url : p.imageUrl ?? null,
//   }));
// }

export async function listSupplierProducts(supplierId, params = {}) {
  if (!supplierId) throw new Error('Missing supplierId');
  const { q } = params;
  const res = await axiosInstance.get(`/suppliers/${supplierId}/products`, { params: { q } });

  const arr = res?.data?.data ?? res?.data ?? [];
  return (Array.isArray(arr) ? arr : []).map(p => {
    const img0 = Array.isArray(p.images) ? p.images[0] : null;
    // ensure one leading slash, no doubles
    const rel = (img0?.url || "").replace(/^\/*/, "/");
    return {
      id: p.id,
      name: p.name,
      stock: Number.isFinite(p.stock) ? p.stock : (p.stock ?? 0),
      imagePath: rel || null,        // keep as relative path
    };
  });
}

export async function unlinkSupplierProduct(supplierId, productId) {
  if (!supplierId || !productId) throw new Error('Missing supplierId or productId');
  const res = await axiosInstance.delete(`/suppliers/${supplierId}/products/${productId}`);
  return res?.data ?? { ok: true };
}

/** Optional: if you really want to LINK products (bulk) */
export async function linkSupplierProducts(supplierId, productIds = []) {
  if (!supplierId) throw new Error('Missing supplierId');
  const res = await axiosInstance.post(`/suppliers/${supplierId}/products`, { productIds });
  return res?.data ?? { ok: true };
}
