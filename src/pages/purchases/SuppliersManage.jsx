import { Fragment, useMemo, useState } from "react";
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
  MoreHorizontal,
  Filter,
  Edit,
  Trash2,
  X,
} from "lucide-react";
import AddSupplierModal from "../../components/AddSupplierModal";
import { useSuppliers, useArchiveSupplier } from "../../hooks/useSuppliers";
import { useSupplierProducts, useUnlinkSupplierProduct } from "../../hooks/useSuppliers";
import toast from "react-hot-toast";

export default function SuppliersManage() {
  const fields = [
    { id: "company", name: "Company Name" },
    { id: "currency", name: "Currency" },
    { id: "time", name: "Time" },
  ];
  const [field, setField] = useState(fields[0]);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);

  // Related products dialog state
  const [relatedOpen, setRelatedOpen] = useState(false);
  const [relatedSupplier, setRelatedSupplier] = useState(null);

  const { data: supplierRows = [], isLoading, refetch } = useSuppliers();
  const archiveMut = useArchiveSupplier({
    onSuccess: () => {
      toast.success("Supplier archived");
      refetch();
    },
    onError: () => toast.error("Failed to archive supplier"),
  });

  const clearAll = () => {
    setField(fields[0]);
    setQuery("");
  };

  const rows = useMemo(() => {
    const mapped = (Array.isArray(supplierRows) ? supplierRows : []).map((s) => ({
      id: s.id,
      company: s.companyName || "",
      productQty: s && s._count && Number.isFinite(s._count.products) ? s._count.products : 0,
      currency: s.currency || "",
      createdAt: s.createdAt ? new Date(s.createdAt).toLocaleString() : "",
      lastPurchase: "--",
      raw: s,
    }));

    const q = (query || "").trim().toLowerCase();
    if (!q) return mapped;
    if (field && field.id === "currency") return mapped.filter((r) => (r.currency || "").toLowerCase().includes(q));
    if (field && field.id === "time") return mapped;
    return mapped.filter((r) => (r.company || "").toLowerCase().includes(q));
  }, [supplierRows, query, field]);

  const card = "rounded-xl border border-gray-200 bg-white";
  const input =
    "h-8 rounded-lg border border-gray-300 px-2.5 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
  const btnPrimary =
    "inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ffd026] text-blue-600 text-sm font-bold hover:opacity-90";
  const btnOutline =
    "inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-700";

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-md bg-amber-100 border border-gray-200 flex items-center justify-center">
            <Store size={18} className="text-amber-700" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Suppliers</h1>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className={card}>
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <HeadlessSelect value={field} onChange={setField} options={fields} className="w-[150px]" />

            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-2">
                <Search className="h-4 w-4 text-gray-400" />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className={`${input} w-[280px] pl-7`}
              />
              <span className="pointer-events-none absolute right-2 top-2">
                <Filter className="h-4 w-4 text-gray-400" />
              </span>
            </div>

            <button className={btnOutline} onClick={clearAll}>
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className={card}>
        <div className="px-4 py-2.5 border-b border-gray-200 text-sm text-gray-600 flex items-center justify-end gap-4">
          <button
            className={btnPrimary}
            onClick={() => {
              setEditSupplier(null);
              setAddOpen(true);
            }}
          >
            <Plus size={16} /> Add suppliers
          </button>
        </div>

        {/* Header row */}
        <div className="grid grid-cols-12 bg-gray-50 px-4 py-2.5 text-[12px] font-semibold text-gray-700">
          <div className="col-span-3">Company Name</div>
          <div className="col-span-2">Product Quantity</div>
          <div className="col-span-2">Currency</div>
          <div className="col-span-3">Time</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500">Loading suppliers…</div>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((r) => (
              <li key={r.id} className="grid grid-cols-12 px-4 py-2.5 text-[13px] text-gray-800 items-center gap-2">
                {/* Company */}
                <div className="col-span-3 truncate">{r.company}</div>

                {/* Product Qty */}
                <div className="col-span-2">{r.productQty}</div>

                {/* Currency */}
                <div className="col-span-2">{r.currency || "—"}</div>

                {/* Time */}
                <div className="col-span-3 leading-5 flex flex-col gap-1">
                  <div className="flex items-center justify-between w-full">
                    <div className="text-gray-700">Create</div>
                    <div className="text-[12px] text-gray-500 whitespace-nowrap">{r.createdAt}</div>
                  </div>
                  <div className="flex items-center justify-between w-full">
                    <div className="text-gray-700">Recent purchase</div>
                    <div className="text-[12px] text-gray-500 whitespace-nowrap">{r.lastPurchase}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-between gap-2">
                  <button
                    className="text-amber-600 hover:underline text-[13px] whitespace-nowrap"
                    onClick={() => {
                      setRelatedSupplier(r.raw);
                      setRelatedOpen(true);
                    }}
                  >
                    Related products
                  </button>

                  <div className="relative group">
                    <button className="inline-flex items-center justify-center text-amber-600 hover:opacity-80 p-1 rounded-md">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    <div className="absolute right-0 z-10 w-28 mt-1 transition-opacity duration-150 ease-out opacity-0 group-hover:opacity-100 group-hover:block hidden">
                      <div className="rounded-xl border border-gray-200 bg-white py-1 text-xs shadow-lg focus:outline-none">
                        <button
                          className="w-full inline-flex items-center gap-2 text-left px-3 py-2 text-gray-800 hover:bg-gray-100"
                          onClick={() => {
                            setEditSupplier(r.raw);
                            setAddOpen(true);
                          }}
                        >
                          <span>
                            <Edit className="w-3 h-3" />
                          </span>
                          Edit
                        </button>
                        <button
                          className="w-full inline-flex items-center gap-2 text-left px-3 py-2 text-gray-800 hover:bg-gray-100"
                          onClick={async () => {
                            if (!window.confirm("Archive this supplier?")) return;
                            try {
                              await archiveMut.mutateAsync(r.id);
                            } catch {}
                          }}
                        >
                          <span>
                            <Trash2 className="w-3 h-3 text-red-700" />
                          </span>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

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
        onUnlinked={async () => {
          await refetch();
        }}
      />
    </div>
  );
}

/* ---------- Related Products Dialog (JSX) ---------- */
function RelatedProductsDialog({ open, onClose, supplier, onUnlinked }) {
  const supplierId = supplier?.id || "";
  const { data: items = [], isLoading, error } = useSupplierProducts(supplierId, {
    enabled: open && !!supplierId,
  });
  const { mutateAsync: unlinkMut, isPending: unlinking } = useUnlinkSupplierProduct({
    onSuccess: async () => {
      toast.success("Unlinked");
      if (onUnlinked) await onUnlinked();
    },
    onError: (e) => toast.error(e?.message || "Failed to unlink"),
  });

  if (!open) return null;

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
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3">
                  {String(error?.message || "Failed to load products")}
                </div>
              )}

              {isLoading ? (
                <div className="py-10 text-sm text-gray-500 text-center">Loading…</div>
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
                                className="h-12 w-12 rounded-md border border-gray-200 object-cover bg-gray-100"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = IMG_PLACEHOLDER;
                                }}
                              />
                            </td>
                            <td className="text-gray-900">{p.name || "—"}</td>
                            <td className="text-gray-700">{Number.isFinite(p.stock) ? p.stock : "—"}</td>
                            <td className="text-right">
                              <button
                                disabled={unlinking}
                                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                                onClick={() => unlink(p.id)}
                                title="Unlink product from supplier"
                              >
                                Unlink
                              </button>
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
                  `relative cursor-pointer select-none px-3 py-2 ${
                    active ? "bg-gray-100 text-gray-900" : "text-gray-800"
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