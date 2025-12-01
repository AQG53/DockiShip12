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
    invitedAt: u.invitedAt || u.invited_at || null,
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
  const body = { email };
  const res = await axiosInstance.post("/auth/password/request", body, {
    headers: { Authorization: undefined, "X-Tenant-ID": undefined },
  });
  return res.data;
}

export async function resetPassword({ token, newPassword }) {
  const body = { token, newPassword };
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
  if (!roleId) throw new Error("Missing roleId");
  const res = await axiosInstance.delete(`/roles/${roleId}`);
  return res?.data?.ok === true;
}

export async function updateMyProfile({ fullName, phone, country }) {
  const raw = localStorage.getItem(USER_KEY);
  let userId = null;
  try {
    const u = raw ? JSON.parse(raw) : null;
    userId = u?.id || u?.userId || null;
  } catch { }

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

export async function listProducts({ page, perPage, search, status, supplierId } = {}) {
  const params = {};
  if (page != null) params.page = page;
  if (perPage != null) params.perPage = perPage;
  if (search) params.search = search;
  if (status) params.status = status;
  if (supplierId) params.supplierId = supplierId;

  const res = await axiosInstance.get("/products", { params });
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

// Warehouses
// =====================
export async function listWarehouses({ search, status } = {}) {
  const params = {};
  if (search) params.search = search;
  if (status) params.status = status;
  const res = await axiosInstance.get("/warehouses", { params });
  const payload = res?.data ?? {};
  const rows = payload?.data ?? payload ?? [];
  return Array.isArray(rows) ? rows : [];
}

export async function createWarehouse(payload) {
  const res = await axiosInstance.post("/warehouses", payload);
  return res?.data?.data ?? res?.data ?? {};
}

export async function updateWarehouse(id, payload) {
  if (!id) throw new Error("Missing warehouse id");
  const res = await axiosInstance.patch(`/warehouses/${id}`, payload);
  return res?.data?.data ?? res?.data ?? {};
}

export async function archiveWarehouse(id) {
  if (!id) throw new Error("Missing warehouse id");
  const res = await axiosInstance.patch(`/warehouses/${id}/archive`);
  return res?.data?.ok === true || res?.status === 200 || res?.status === 204;
}

export async function getWarehouseStock(id) {
  if (!id) throw new Error("Missing warehouse id");
  const res = await axiosInstance.get(`/warehouses/${id}/stock`);
  return res.data;
}

// Purchase Orders
// =====================
export async function listPurchaseOrders({ page, perPage, search, status, supplierId, sortBy, sortOrder } = {}) {
  const params = {};
  if (page != null) params.page = page;
  if (perPage != null) params.perPage = perPage;
  if (search) params.search = search;
  if (status) params.status = status;
  if (supplierId) params.supplierId = supplierId;
  if (sortBy) params.sortBy = sortBy;
  if (sortOrder) params.sortOrder = sortOrder;

  const res = await axiosInstance.get("/purchase-orders", { params });
  const payload = res?.data ?? {};

  // Handle both old (array) and new (paginated) response formats
  const rows = Array.isArray(payload) ? payload : (payload.data || []);
  const meta = payload.meta || {
    page: 1,
    perPage: rows.length || 25,
    total: rows.length,
    totalPages: 1
  };

  return { rows, meta };
}

export async function getPurchaseOrder(id) {
  if (!id) throw new Error("Missing purchase order id");
  const res = await axiosInstance.get(`/purchase-orders/${id}`);
  return res?.data?.data ?? res?.data ?? {};
}

export async function createPurchaseOrder(payload) {
  const res = await axiosInstance.post("/purchase-orders", payload);
  return res?.data?.data ?? res?.data ?? {};
}

export async function updatePurchaseOrderStatus(id, status, notes) {
  if (!id) throw new Error("Missing purchase order id");
  const res = await axiosInstance.patch(`/purchase-orders/${id}/status`, { status, notes });
  return res?.data?.data ?? res?.data ?? {};
}

export async function updatePurchaseOrder(id, payload) {
  if (!id) throw new Error("Missing purchase order id");
  const res = await axiosInstance.patch(`/purchase-orders/${id}`, payload);
  return res?.data?.data ?? res?.data ?? {};
}

export async function deletePurchaseOrder(id) {
  if (!id) throw new Error("Missing purchase order id");
  const res = await axiosInstance.delete(`/purchase-orders/${id}`);
  return res?.data?.ok === true || res?.status === 200 || res?.status === 204;
}

export async function receivePurchaseOrderItems(id, items, amountPaid) {
  if (!id) throw new Error("Missing purchase order id");
  const res = await axiosInstance.post(`/purchase-orders/${id}/receive`, {
    items,
    ...(amountPaid !== undefined && { amountPaid })
  });
  return res?.data?.data ?? res?.data ?? {};
}

export async function updatePurchaseOrderPayment(id, amountPaid) {
  if (!id) throw new Error("Missing purchase order id");
  const res = await axiosInstance.patch(`/purchase-orders/${id}/payment`, { amountPaid });
  return res?.data?.data ?? res?.data ?? {};
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
    const rel = (img0?.url || "").replace(/^\/*/, "/");
    return {
      id: p.id,
      name: p.name,
      sku: p.sku || "",
      stock: Number.isFinite(p.stock) ? p.stock : (p.stock ?? 0),
      imagePath: rel || null,
    };
  });
}

export async function unlinkSupplierProduct(supplierId, productId) {
  if (!supplierId || !productId) throw new Error('Missing supplierId or productId');
  const res = await axiosInstance.delete(`/suppliers/${supplierId}/products/${productId}`);
  return res?.data ?? { ok: true };
}

/** Optional: if you really want to LINK products (bulk) */
export async function linkSupplierProducts(supplierId, productIds = [], opts = {}) {
  if (!supplierId) throw new Error('Missing supplierId');
  const body = { productIds };
  if (opts && typeof opts === 'object') {
    if (opts.lastPurchasePrice != null) body.lastPurchasePrice = opts.lastPurchasePrice;
    if (opts.currency) body.currency = opts.currency;
  }
  const res = await axiosInstance.post(`/suppliers/${supplierId}/products`, body);
  return res?.data ?? { ok: true };
}


// =====================
// Marketplace Channels
// =====================

/**
 * Search/list marketplace channels for this tenant.
 * Filters: q (name contains), provider, page, perPage (optional)
 */
export async function searchMarketplaceChannels({ q, page = 1, perPage = 200 } = {}) {
  const params = {};
  if (q) params.q = q;
  if (page != null) params.page = page;
  if (perPage != null) params.perPage = perPage;

  const res = await axiosInstance.get('/products/marketplaces/channels', { params });
  const payload = res?.data ?? {};
  const inner = payload?.data ?? payload;

  const rows =
    inner?.data ??
    inner?.items ??
    inner?.rows ??
    inner?.channels ??
    (Array.isArray(inner) ? inner : []);

  return Array.isArray(rows) ? rows : [];
}

/**
 * Create a marketplace channel (name + provider are required).
 */
export async function createMarketplaceChannel({ name, marketplace }) {
  const val = (marketplace || name || "").trim();
  if (!val) throw new Error('Missing channel name');

  const res = await axiosInstance.post('/products/marketplaces/channels', {
    marketplace: val,
  });
  return res?.data?.data ?? res?.data ?? {};
}

// =====================
// Marketplace Listings (per product)
// =====================

/**
 * List all marketplace listings for a product.
 * Optional: filter by variantId.
 */
export async function listProductMarketplaceListings(productId, { variantId } = {}) {
  if (!productId) throw new Error('Missing productId');
  const params = {};
  if (variantId) params.variantId = variantId;

  const res = await axiosInstance.get(`/products/${productId}/marketplaces/listings`, { params });
  const payload = res?.data?.data ?? res?.data ?? [];

  // Backend returns an object: { productListings: [...], variantListings: [...] }
  // Normalize to a flat array for UI convenience and back-compat with callers
  if (Array.isArray(payload)) {
    return payload;
  }
  const productListings = Array.isArray(payload?.productListings) ? payload.productListings : [];
  const variantListings = Array.isArray(payload?.variantListings) ? payload.variantListings : [];
  const rows = [...productListings, ...variantListings].map((l) => ({
    ...l,
    // friendly aliases for UI that previously assumed these keys
    sku: l.externalSku,
    variantId: l.productVariantId ?? null,
  }));
  return rows;
}

/**
 * Add a listing for a product (or a variant if variantId provided).
 * payload: { channelId, sku, units, variantId? }
 */
export async function addProductMarketplaceListing(productId, payload) {
  if (!productId) throw new Error('Missing productId');
  const { variantId, ...rest } = payload || {};
  const path = variantId
    ? `/products/${productId}/marketplaces/listings/variant`
    : `/products/${productId}/marketplaces/listings/product`;

  const res = await axiosInstance.post(path, variantId ? { ...rest, variantId } : rest);
  return res?.data?.data ?? res?.data ?? {};
}

/**
 * Update a listing.
 * payload: { channelId?, sku?, units? }
 */
export async function updateProductMarketplaceListing(productId, listingId, payload) {
  if (!productId) throw new Error('Missing productId');
  if (!listingId) throw new Error('Missing listingId');
  const res = await axiosInstance.patch(
    `/products/${productId}/marketplaces/listings/${listingId}`,
    payload
  );
  return res?.data?.data ?? res?.data ?? {};
}

/**
 * Delete a listing.
 */
export async function deleteProductMarketplaceListing(productId, listingId) {
  if (!productId) throw new Error('Missing productId');
  if (!listingId) throw new Error('Missing listingId');
  const res = await axiosInstance.delete(
    `/products/${productId}/marketplaces/listings/${listingId}`
  );
  return res?.data?.ok === true || res?.status === 200 || res?.status === 204;
}

/**
 * Optional: bulk upsert for variant rows in one go.
 * rows: Array<{ variantId, channelId, sku, units }>
 */
export async function upsertProductVariantMarketplaceListings(productId, rows = []) {
  if (!productId) throw new Error('Missing productId');
  const res = await axiosInstance.post(
    `/products/${productId}/marketplaces/listings/bulk`,
    { rows }
  );
  return res?.data?.data ?? res?.data ?? [];
}

// Product Names list (distinct product names from listings)
export async function searchListingProductNames({ q } = {}) {
  const params = {};
  if (q) params.q = q;
  const res = await axiosInstance.get('/products/marketplaces/product-names', { params });
  const payload = res?.data ?? {};
  const inner = payload?.data ?? payload;
  const rows = Array.isArray(inner) ? inner : (inner?.providers ?? []);
  // Normalize to plain strings when possible
  return rows.map((r) => (typeof r === 'string' ? r : (r?.provider ?? ''))).filter(Boolean);
}
