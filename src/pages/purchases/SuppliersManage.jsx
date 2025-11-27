import { Fragment, useMemo, useState, useEffect } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
  Dialog,
  DialogPanel,
} from "@headlessui/react";
import {
  ChevronDown,
  Check,
  Search,
  Plus,
  Store,
  Filter,
  Edit,
  Trash2,
  X,
} from "lucide-react";
import AddSupplierModal from "../../components/AddSupplierModal";
import ViewSupplierModal from "../../components/ViewSupplierModal";
import { ConfirmModal } from "../../components/ConfirmModal";
import { useSuppliers, useArchiveSupplier } from "../../hooks/useSuppliers";
import { useSupplierProducts, useUnlinkSupplierProduct } from "../../hooks/useSuppliers";
import { listProducts, linkSupplierProducts } from "../../lib/api";
import toast from "react-hot-toast";
import { useAuthCheck } from "../../hooks/useAuthCheck";

export default function SuppliersManage() {
  // Permissions
  const { data: auth } = useAuthCheck({ refetchOnWindowFocus: false });
  const isOwner = Array.isArray(auth?.roles) && auth.roles.some((r) => String(r).toLowerCase() === 'owner');
  const permSet = new Set(Array.isArray(auth?.perms) ? auth.perms.map(String) : []);
  const canManageSuppliers = isOwner || permSet.has('suppliers.manage');
  const canReadSuppliers = isOwner || canManageSuppliers || permSet.has('suppliers.read');

  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);

  // Related products dialog state
  const [relatedOpen, setRelatedOpen] = useState(false);
  const [relatedSupplier, setRelatedSupplier] = useState(null);

  // View supplier dialog state
  const [viewOpen, setViewOpen] = useState(false);
  const [viewSupplier, setViewSupplier] = useState(null);

  // Delete confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmItem, setConfirmItem] = useState(null);

  const { data: supplierRows = [], isLoading, refetch } = useSuppliers();
  const archiveMut = useArchiveSupplier({
    onSuccess: () => {
      toast.success("Supplier archived");
      refetch();
    },
    onError: () => toast.error("Failed to archive supplier"),
  });



  const [statusFilter, setStatusFilter] = useState({ id: "all", name: "All Status" });
  const statusOptions = [
    { id: "all", name: "All Status" },
    { id: "active", name: "Active" },
    { id: "inactive", name: "Inactive" },
  ];

  const rows = useMemo(() => {
    const mapped = (Array.isArray(supplierRows) ? supplierRows : []).map((s) => ({
      id: s.id,
      company: s.companyName || "",
      productQty: (() => {
        if (Number.isFinite(s?.productsCount)) return s.productsCount;
        if (Number.isFinite(s?.productCount)) return s.productCount;
        if (s && s._count && Number.isFinite(s._count.products)) return s._count.products;
        if (Array.isArray(s?.products)) return s.products.length;
        return 0;
      })(),
      currency: s.currency || "",
      isActive: s.isActive,
      raw: s,
    }));

    let filtered = mapped;

    // Status Filter
    if (statusFilter.id !== "all") {
      const wantActive = statusFilter.id === "active";
      filtered = filtered.filter((r) => r.isActive === wantActive);
    }

    // Search Filter
    const q = (query || "").trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((r) =>
        (r.company || "").toLowerCase().includes(q) ||
        (r.currency || "").toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [supplierRows, query, statusFilter]);

  const card = "rounded-xl border border-gray-200 bg-white";
  const input =
    "h-9 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
  const btnPrimary =
    "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ffd026] text-blue-700 text-sm font-bold hover:opacity-90";

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-md bg-amber-100 border border-gray-200 flex items-center justify-center">
            <Store size={18} className="text-amber-700" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Suppliers</h1>
        </div>
      </div>

      {!canReadSuppliers && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You don’t have permission to view suppliers. Ask an admin for access.
        </div>
      )}

      {/* TABLE */}
      {canReadSuppliers && (
        <div className={card}>
          <div className="px-4 py-2.5 border-b border-gray-200 text-sm text-gray-600 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className={`${input} w-[220px] pl-8`}
                />
              </div>
              <HeadlessSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions}
                className="w-[140px]"
              />
            </div>
            {canManageSuppliers && (
              <button
                className={btnPrimary}
                onClick={() => {
                  setEditSupplier(null);
                  setAddOpen(true);
                }}
              >
                <Plus size={16} /> Add supplier
              </button>
            )}
          </div>

          {/* Header row */}
          <div className="grid grid-cols-12 bg-gray-50 px-4 py-2.5 text-[12px] font-semibold text-gray-700">
            <div className="col-span-4">Display Name</div>
            <div className="col-span-2">Product Qty</div>
            <div className="col-span-2">Currency</div>
            <div className="col-span-2">Related products</div>
            <div className="col-span-2 text-center">Actions</div>
          </div>

          {/* Body */}
          {isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading suppliers…</div>
          ) : rows.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y divide-gray-100">
              {rows.map((r) => (
                <li key={r.id} className="grid grid-cols-12 px-4 py-2.5 text-[13px] text-gray-800 items-center gap-y-2 gap-x-0">
                  {/* Display Name */}
                  <div className="col-span-4 truncate">
                    <button
                      className="text-left text-amber-700 font-medium hover:opacity-80"
                      title="View supplier"
                      onClick={() => { setViewSupplier(r.raw); setViewOpen(true); }}
                    >
                      {r.company}
                    </button>
                  </div>

                  {/* Product Qty */}
                  <div className="col-span-2">{r.productQty}</div>

                  {/* Currency */}
                  <div className="col-span-2">{r.currency || "—"}</div>

                  {/* Related products */}
                  <div className="col-span-2">
                    <button
                      className="text-amber-600 hover:underline text-[13px] whitespace-nowrap"
                      onClick={() => {
                        setRelatedSupplier(r.raw);
                        setRelatedOpen(true);
                      }}
                      title="Related products"
                    >
                      Related products
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <button
                      className="rounded-md border border-gray-300 px-1.5 py-0.5 text-[11px] hover:bg-gray-50"
                      onClick={() => {
                        setViewSupplier(r.raw);
                        setViewOpen(true);
                      }}
                    >
                      View
                    </button>
                    {canManageSuppliers && (
                      <>
                        <button
                          className="rounded-md border border-gray-300 px-1.5 py-0.5 text-[11px] hover:bg-gray-50"
                          onClick={() => {
                            setEditSupplier(r.raw);
                            setAddOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-md border border-red-200 text-red-700 px-1.5 py-0.5 text-[11px] hover:bg-red-50"
                          onClick={() => {
                            setConfirmItem(r.raw);
                            setConfirmOpen(true);
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Add/Edit Supplier Modal */}
      <AddSupplierModal
        open={addOpen}
        supplier={editSupplier}
        onClose={() => {
          setAddOpen(false);
          setEditSupplier(null);
        }}
        onSave={async () => {
          await refetch();
          setAddOpen(false);
          setEditSupplier(null);
        }}
      />

      {/* Related Products Dialog */}
      <RelatedProductsDialog
        open={relatedOpen}
        onClose={() => {
          setRelatedOpen(false);
          setRelatedSupplier(null);
        }}
        supplier={relatedSupplier}
        canManage={canManageSuppliers}
        onUnlinked={async () => {
          await refetch();
        }}
      />

      {/* View Supplier Dialog */}
      <ViewSupplierModal
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewSupplier(null);
        }}
        supplier={viewSupplier}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete Supplier"
        loading={archiveMut.isPending}
        onConfirm={async () => {
          if (!confirmItem?.id) return;
          try {
            await archiveMut.mutateAsync(confirmItem.id);
            setConfirmOpen(false);
          } catch { }
        }}
      >
        Are you sure you want to delete <span className="font-semibold">{confirmItem?.companyName || "this supplier"}</span>?
        <br />
        This action cannot be undone.
      </ConfirmModal>
    </div>
  );
}

/* ---------- Related Products Dialog (JSX) ---------- */
function RelatedProductsDialog({ open, onClose, supplier, onUnlinked, canManage = false }) {
  const supplierId = supplier?.id || "";
  const { data: items = [], isLoading, error, refetch } = useSupplierProducts(supplierId, {
    enabled: open && !!supplierId,
  });
  const { mutateAsync: unlinkMut, isPending: unlinking } = useUnlinkSupplierProduct({
    onSuccess: async () => {
      toast.success("Unlinked");
      if (onUnlinked) await onUnlinked();
    },
    onError: (e) => toast.error(e?.message || "Failed to unlink"),
  });

  // Do not early-return before hooks; just rely on <Dialog open={open}> to control visibility

  const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  const IMG_PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="100%" height="100%" fill="#f3f4f6"/><g fill="#9ca3af"><circle cx="26" cy="30" r="8"/><path d="M8 60l15-15 10 10 12-12 27 27H8z"/></g></svg>'
    );

  const absImg = (pathOrUrl) => {
    if (!pathOrUrl) return ""; // don’t reference placeholder here
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const rel = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
    return `${API_BASE}${rel}`;
  };

  const unlink = async (productId) => {
    if (!supplierId) return;
    await unlinkMut({ supplierId, productId });
    await refetch?.();
  };

  // Link products UX (basic search + multi-select)
  const [search, setSearch] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [linking, setLinking] = useState(false);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const { rows } = await listProducts({ perPage: 200, search });
      setAllProducts(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProducts(false);
    }
  };

  // load once when dialog opens; reload on search blur/enter via button
  useEffect(() => {
    if (open) loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleSel = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const availableProducts = useMemo(() => {
    const linkedIds = new Set((items || []).map((p) => p.id));
    return (Array.isArray(allProducts) ? allProducts : []).filter((p) => !linkedIds.has(p.id));
  }, [allProducts, items]);

  const linkSelected = async () => {
    if (!supplierId || selectedIds.size === 0) return;
    setLinking(true);
    try {
      await linkSupplierProducts(supplierId, Array.from(selectedIds));
      toast.success("Linked");
      setSelectedIds(new Set());
      await loadProducts();
      await refetch?.();
      if (onUnlinked) await onUnlinked(); // reuse to refresh parent list
    } catch (e) {
      toast.error(e?.message || "Failed to link products");
    } finally {
      setLinking(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[70]">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel className="w-full max-w-3xl rounded-xl bg-white border border-gray-200 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div>
                <div className="text-base font-semibold text-gray-900">Related products</div>
                <div className="text-xs text-gray-500">
                  Supplier:{" "}
                  <span className="font-medium">
                    {supplier?.companyName || supplier?.name || supplierId}
                  </span>
                </div>
              </div>
              <button className="p-2 rounded hover:bg-gray-100" onClick={onClose} title="Close">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              {/* Link products (only when canManage) */}
              {canManage && (
                <div className="mb-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <div className="text-[13px] font-semibold text-gray-800">Link products</div>
                    <div className="flex items-center gap-2">
                      <input
                        className="h-8 w-56 rounded-md border border-gray-300 px-2 text-[12px]"
                        placeholder="Search products"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <button
                        className="h-8 px-3 rounded-md border border-gray-300 text-[12px] hover:bg-gray-50"
                        onClick={loadProducts}
                        disabled={loadingProducts}
                      >
                        {loadingProducts ? "Searching…" : "Search"}
                      </button>
                    </div>
                  </div>
                  <div className="p-3 max-h-56 overflow-auto">
                    {loadingProducts ? (
                      <ul className="animate-pulse space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <li key={i} className="flex items-center justify-between py-1.5">
                            <div className="h-3.5 w-56 bg-gray-200 rounded" />
                            <div className="h-3.5 w-16 bg-gray-200 rounded" />
                          </li>
                        ))}
                      </ul>
                    ) : availableProducts.length === 0 ? (
                      <div className="text-xs text-gray-500">
                        {allProducts.length === 0 ? "No products." : "All matching products already linked."}
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {availableProducts.map((p) => (
                          <li key={p.id} className="flex items-center justify-between py-1.5 text-[13px]">
                            <div className="truncate">
                              <span className="text-gray-900">{p.name}</span>
                              <span className="text-gray-500 text-xs ml-2">{p.sku}</span>
                            </div>
                            <label className="inline-flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5"
                                checked={selectedIds.has(p.id)}
                                onChange={() => toggleSel(p.id)}
                              />
                              Select
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="px-3 py-2 text-right border-t border-gray-200">
                    <button
                      className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      onClick={linkSelected}
                      disabled={linking || selectedIds.size === 0}
                    >
                      {linking ? "Linking…" : `Link ${selectedIds.size || ""}`}
                    </button>
                  </div>
                </div>
              )}

              {linking && (
                <div className="mb-3 text-xs text-gray-600 inline-flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"></path>
                  </svg>
                  Linking…
                </div>
              )}

              {unlinking && (
                <div className="mb-3 text-xs text-gray-600 inline-flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"></path>
                  </svg>
                  Unlinking…
                </div>
              )}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3">
                  {String(error?.message || "Failed to load products")}
                </div>
              )}

              {isLoading ? (
                <div className="py-3">
                  <div className="animate-pulse border border-gray-200 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-4 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700">
                      <div className="h-3.5 w-10 bg-gray-200 rounded" />
                      <div className="h-3.5 w-40 bg-gray-200 rounded" />
                      <div className="h-3.5 w-20 bg-gray-200 rounded" />
                      <div className="h-3.5 w-20 bg-gray-200 rounded ml-auto" />
                    </div>
                    <div className="p-3 space-y-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-4 items-center gap-2">
                          <div className="h-10 w-10 bg-gray-200 rounded" />
                          <div className="h-3.5 w-52 bg-gray-200 rounded" />
                          <div className="h-3.5 w-16 bg-gray-200 rounded" />
                          <div className="h-7 w-16 bg-gray-200 rounded ml-auto" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : items.length === 0 ? (
                <div className="py-10 text-sm text-gray-500 text-center">No related products.</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left">
                        <th className="w-16"></th>
                        <th>Name</th>
                        <th className="w-24">Stock</th>
                        <th className="w-28 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((p) => {
                        const src = absImg(p.imagePath || p.imageUrl) || IMG_PLACEHOLDER;
                        return (
                          <tr key={p.id} className="[&>td]:px-3 [&>td]:py-2.5">
                            <td>
                              <img
                                src={src}
                                alt=""
                                className="h-12 w-12 rounded-md border border-gray-200 object-contain bg-gray-100"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = IMG_PLACEHOLDER;
                                }}
                              />
                            </td>
                            <td className="text-gray-900">
                              <div className="flex flex-wrap items-baseline gap-2">
                                <span>{p.name || "—"}</span>
                                {p.sku && (
                                  <span className="text-[11px] uppercase tracking-wider text-gray-500">
                                    {p.sku}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-gray-700">{Number.isFinite(p.stock) ? p.stock : "—"}</td>
                            <td className="text-right">
                              {canManage && (
                                <button
                                  disabled={unlinking}
                                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                                  onClick={() => unlink(p.id)}
                                  title="Unlink product from supplier"
                                >
                                  {unlinking && (
                                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"></path>
                                    </svg>
                                  )}
                                  <span>{unlinking ? 'Unlinking…' : 'Unlink'}</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 text-right">
              <button
                className="inline-flex items-center px-3 py-2 text-sm rounded-md border hover:bg-gray-50"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}



/* ---------- Empty State ---------- */
function EmptyState() {
  return (
    <div className="flex items-center justify-center py-14 text-gray-400 text-[13px]">
      <div className="flex flex-col items-center gap-2">
        <svg
          className="h-10 w-10 opacity-40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="3" y="4" width="18" height="14" rx="2"></rect>
          <path d="M7 8h10M7 12h6M3 18h18"></path>
        </svg>
        <p>No Suppliers</p>
      </div>
    </div>
  );
}

/* ---------- Headless Select (JSX) ---------- */
function HeadlessSelect({ value, onChange, options, className = "" }) {
  return (
    <Listbox value={value} onChange={onChange}>
      <div className={`relative ${className}`}>
        <ListboxButton className="relative w-full h-8 rounded-lg border border-gray-300 bg-white pl-2.5 pr-7 text-left text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10">
          <span className="block truncate">{value && value.name}</span>
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <ChevronDown size={16} className="text-gray-500" />
          </span>
        </ListboxButton>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-lg focus:outline-none">
            {options.map((opt) => (
              <ListboxOption
                key={opt.id || opt.name}
                value={opt}
                className={({ active }) =>
                  `relative cursor-pointer select-none px-3 py-2 ${active ? "bg-gray-100 text-gray-900" : "text-gray-800"
                  }`
                }
              >
                {({ selected }) => (
                  <div className="flex items-center gap-2">
                    {selected ? <Check size={16} className="text-amber-700" /> : <span className="w-4" />}
                    <span className="block">{opt.name}</span>
                  </div>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Transition>
      </div>
    </Listbox>
  );
}
