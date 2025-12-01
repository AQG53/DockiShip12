import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react";
import { ChevronDown, Check, Search, Plus, Store, Loader } from "lucide-react";
import CreateProductModal from "../components/CreateProductModal";
import ViewProductModal from "../components/ViewProductsModal";
import { NoData } from "../../../components/NoData";
import { useProducts, useDeleteProduct } from "../hooks/useProducts";
import { ConfirmModal } from "../../../components/ConfirmModal";
import toast from "react-hot-toast";
import { useAuthCheck } from "../../auth/hooks/useAuthCheck";
import { randomId } from "../../../lib/id";
import { Button } from "../../../components/ui/Button";
import { ActionMenu } from "../../../components/ui/ActionMenu";
import { HeadlessSelect } from "../../../components/ui/HeadlessSelect";

export default function ProductList() {
  const { data: auth } = useAuthCheck({ refetchOnWindowFocus: false });
  const isOwner = useMemo(
    () => Array.isArray(auth?.roles) && auth.roles.some((r) => String(r).toLowerCase() === 'owner'),
    [auth]
  );
  const permsSet = useMemo(
    () => new Set(Array.isArray(auth?.perms) ? auth.perms.map(String) : []),
    [auth]
  );
  const canManage = isOwner || permsSet.has('inventory.product.manage');
  const canRead = isOwner || canManage || permsSet.has('inventory.product.read');
  const groups = useMemo(() => [{ id: "all", name: "All" }], []);
  const keyTypes = useMemo(
    () => [
      { id: "sku", name: "Stock SKU" },
      { id: "name", name: "Product Name" },
    ],
    []
  );

  const [group, setGroup] = useState(groups[0]);
  const [keyType, setKeyType] = useState(keyTypes[0]);
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);

  const [page, setPage] = useState(1);
  const [perPage] = useState(25);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const statusOptions = useMemo(() => [
    { id: "", name: "All Status" },
    { id: "active", name: "Active" },
    { id: "inactive", name: "Inactive" },
    { id: "archived", name: "Archived" },
  ], []);
  const [statusFilter, setStatusFilter] = useState(statusOptions[0]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on search change
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [search]);

  // NEW: view modal state
  const [openView, setOpenView] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);

  const clearAll = () => {
    setGroup(groups[0]);
    setKeyType(keyTypes[0]);
    setSearch("");
  };

  const [rows, setRows] = useState([]);
  const { mutate: fetchProducts, data, isPending, isError, error } = useProducts();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmItem, setConfirmItem] = useState(null);
  const { mutate: deleteProductMut, isPending: deleting } = useDeleteProduct();
  const [editingId, setEditingId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    fetchProducts({
      page,
      perPage,
      search: debouncedSearch?.trim() || undefined,
      status: statusFilter.id || undefined,
    });
  }, [page, perPage, debouncedSearch, statusFilter, fetchProducts]);

  useEffect(() => {
    if (!data?.rows) return;
    setRows(mapProductsToRows(data.rows, auth));
    console.log(data);
  }, [data, auth]);

  const deleteProduct = () => {
    if (!confirmItem?.id) return;
    deleteProductMut(confirmItem.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        toast.success("Product deleted successfully");
        fetchProducts(); // refresh table
      },
      onError: (err) => {
        toast.error("Failed to delete: " + (err?.message || "Unknown error"));
      },
    });
  }

  const card = "rounded-xl border border-gray-200 bg-white";
  const input =
    "h-9 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
  const GRID = "grid grid-cols-[60px_1.3fr_1fr_1fr_0.8fr_0.9fr_1.2fr_1fr_0.9fr]";

  const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  const IMG_PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="100%" height="100%" fill="#f3f4f6"/><g fill="#9ca3af"><circle cx="26" cy="30" r="8"/><path d="M8 60l15-15 10 10 12-12 27 27H8z"/></g></svg>'
    );

  const absImg = (url) => {
    if (!url) return IMG_PLACEHOLDER;
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_BASE}${url}`;
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-md bg-amber-100 border border-gray-200 flex items-center justify-center">
            <Store size={18} className="text-amber-700" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Products</h1>
        </div>
      </div>

      {!canRead && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You don’t have permission to view products. Ask an admin for access.
        </div>
      )}

      {/* ACTIONS + TABLE */}
      {canRead && (
        <div className={card}>

          <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className={`${input} w-[220px] pl-8`}
                />
              </div>
              <HeadlessSelect
                value={statusFilter}
                onChange={(val) => { setStatusFilter(val); setPage(1); }}
                options={statusOptions}
                className="w-[140px]"
              />
            </div>
            {canManage && (
              <Button variant="warning" onClick={() => setOpenCreate(true)}>
                <Plus size={16} className="mr-2" /> Add Product
              </Button>
            )}
          </div>

          {/* Header row */}
          <div className={`${GRID} bg-gray-50 px-4 py-3 text-[12px] font-semibold text-gray-700`}>
            <div>Image</div>
            <div>Product Name</div>
            <div>SKU</div>
            <div>Status</div>
            <div>Type</div>
            <div>Price</div>
            <div>Stock</div>
            <div>Created At</div>
            <div>Actions</div>
          </div>

          {/* Rows */}
          {isPending ? (
            <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
              <Loader className="animate-spin" />
              <span>Loading products...</span>
            </div>
          ) : isError ? (
            <div className="px-4 py-6 text-sm text-red-600">Failed to load products: {String(error?.message || "Unknown error")}</div>
          ) : rows.length === 0 ? (
            <NoData />
          ) : (
            <ul className="divide-y divide-gray-100">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className={`${GRID} px-4 py-3 text-[13px] text-gray-800 items-center hover:bg-gray-50 transition`}
                >
                  <div>
                    <img
                      src={absImg(r.imageUrl)}
                      alt=""
                      className="h-10 w-10 object-contain rounded-md border border-gray-200 bg-gray-100"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = IMG_PLACEHOLDER;
                      }}
                    />
                  </div>
                  <div className="truncate" title={r.name}>{r.name}</div>
                  <div className="truncate text-xs text-gray-700">{r.sku}</div>

                  {/* Status */}
                  <div>
                    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${r.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-700"
                      }`}>
                      {r.statusLabel.charAt(0).toUpperCase() + r.statusLabel.slice(1)}
                    </span>
                  </div>

                  <div className="truncate">{r.typeLabel}</div>
                  <div className="whitespace-normal break-words">{r.priceDisplay}</div>
                  <div className="truncate">{r.stockDisplay}</div>
                  <div className="text-xs text-gray-600 px-4">{r.createdAt}</div>

                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 justify-end">
                      {(() => {
                        const actions = [];

                        // 1. View
                        actions.push({
                          label: "View",
                          onClick: () => { setActiveProduct(r.raw); setOpenView(true); },
                          variant: "secondary",
                        });

                        // 2. Edit
                        if (canManage) {
                          actions.push({
                            label: "Edit",
                            onClick: () => { setEditingId(r.raw?.id || r.id); setEditOpen(true); },
                            variant: "secondary",
                          });
                        }

                        // 3. Delete
                        if (canManage) {
                          actions.push({
                            label: "Delete",
                            onClick: () => {
                              setConfirmItem(r.raw);
                              setConfirmOpen(true);
                            },
                            variant: "danger-outline",
                            className: "text-red-700 hover:bg-red-50", // for menu item styling
                          });
                        }

                        // Render logic: Show max 2 buttons. If > 2, show 1 button + Menu (containing rest) 
                        // OR show 2 buttons + Menu (containing rest)?
                        // User said: "show max 2 buttons and remaining in ..."
                        // If we have 3 actions: [1] [2] [...] -> 3 elements.
                        // If we have 3 actions: [1] [...] -> 2 elements.
                        // Let's interpret "show max 2 buttons" as "Max 2 visible buttons allowed".
                        // If we have 3 actions, we can show 2 buttons + 1 menu? That's 3 "buttons".
                        // If the user wants to SAVE SPACE, maybe they mean "Max 2 items total".
                        // Let's try: Show up to 2 actions directly. If more than 2, show 1 action + Menu?
                        // Actually, standard pattern:
                        // If count <= 2: Show all buttons.
                        // If count > 2: Show 1 button + Menu (with rest).
                        // OR: Show 2 buttons + Menu (with rest).

                        // Let's go with: Show first 2 actions as buttons. If there are more, put the rest in a menu.
                        // Wait, if I have 3 actions, and I show 2 buttons + menu, I am using space for 3 things.
                        // If the goal is "max 2 buttons", maybe it means "At most 2 buttons visible".
                        // So if 3 actions -> [1] [2] [...] (This is 3 buttons).
                        // If 3 actions -> [1] [...] (This is 2 buttons).

                        // Let's try to be smart.
                        // If total actions <= 2, show them all.
                        // If total actions > 2, show first (2-1)=1 action, and put rest in menu?
                        // OR show first 2, and put rest in menu (total 3 elements).

                        // "show max 2 buttons and remaining in ..."
                        // This phrasing suggests: Button 1, Button 2, ... (Menu)
                        // This implies 3 elements if there are many actions.
                        // BUT "make its look similar to buttons" suggests the "..." should look like a button.

                        // Let's implement: Show first 2 actions as buttons. If there are remaining actions, show "..." button.

                        const visibleActions = actions.slice(0, 2);
                        const overflowActions = actions.slice(2);

                        return (
                          <>
                            {visibleActions.map((action, idx) => (
                              <Button
                                key={idx}
                                variant={action.variant || "secondary"}
                                size="xs"
                                className="rounded-md"
                                onClick={action.onClick}
                              >
                                {action.label}
                              </Button>
                            ))}
                            {overflowActions.length > 0 && (
                              <ActionMenu actions={overflowActions} />
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {canRead && data?.meta && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white rounded-xl border">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">{(data.meta.page - 1) * data.meta.perPage + 1}</span> to{" "}
            <span className="font-medium">
              {Math.min(data.meta.page * data.meta.perPage, data.meta.total)}
            </span>{" "}
            of <span className="font-medium">{data.meta.total}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isPending}
            >
              Previous
            </button>
            <button
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= (data.meta.totalPages || 1) || isPending}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create modal */}
      {canManage && (
        <CreateProductModal
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          onSave={() => fetchProducts()}
        />
      )}

      {/* Edit modal */}
      {canManage && (
        <CreateProductModal
          open={editOpen}
          onClose={() => { setEditOpen(false); setEditingId(null); }}
          onSave={() => fetchProducts()}
          edit
          productId={editingId}
        />
      )}

      {/* View modal (frontend only) */}
      <ViewProductModal
        open={openView}
        onClose={() => setOpenView(false)}
        product={activeProduct}
      />

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete Product"
        loading={deleting}
        onConfirm={deleteProduct}
      >
        Are you sure you want to delete{" "}
        <span className="font-semibold">{confirmItem?.name || "this product"}</span>?
        <br />
        <span className="text-sm text-gray-500">
          If this product has any history (orders, stock), it will be archived instead of deleted.
        </span>
      </ConfirmModal>

    </div>
  );
}

/* ---------- helpers ---------- */
function mapProductsToRows(apiRows, auth) {
  if (!Array.isArray(apiRows)) return [];

  return apiRows.map((p) => {
    const variants = Array.isArray(p?.variants) ? p.variants : [];
    const hasVariants = variants.length > 0;
    const typeLabel = typeof p?.type === 'string'
      ? p.type
      : (hasVariants && variants.length > 1 ? `Variant (${variants.length})` : 'Simple');

    const imageUrl = Array.isArray(p?.images) && p.images.length > 0 ? (p.images[0]?.url || null) : null;

    const currency = auth?.tenant?.currency || "PKR";
    const fmt = (n) => {
      const num = Number(n);
      if (Number.isNaN(num)) return "—";
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(num);
      } catch {
        return `${currency} ${num.toFixed(2)}`;
      }
    };

    let priceDisplay = "—";
    if (!hasVariants) {
      if (p?.retailPrice != null) priceDisplay = fmt(p.retailPrice);
    } else {
      const nums = variants.map((v) => Number(v?.retailPrice)).filter((n) => Number.isFinite(n));
      if (nums.length) {
        const lo = Math.min(...nums);
        const hi = Math.max(...nums);
        priceDisplay = lo === hi ? fmt(lo) : `${fmt(lo)} - ${fmt(hi)}`;
      }
    }

    const stockDisplay = p?.stock != null ? String(p.stock) : "—";
    const statusRaw = (p?.status || "").toLowerCase();
    const statusLabel = p?.isDraft ? "Draft" : statusRaw === "active" ? "Active" : p?.status || "—";
    const createdAt = p?.createdAt
      ? new Date(p.createdAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
      : "—";

    return {
      id: p?.id || randomId(),
      name: p?.name ?? "—",
      sku: p?.sku ?? "—",
      imageUrl,
      statusLabel,
      status: p?.isDraft ? "draft" : statusRaw || "inactive",
      typeLabel,
      priceDisplay,
      stockDisplay,
      createdAt,
      raw: p, // <-- keep original product for the View modal
    };
  });
}


