import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react";
import { ChevronDown, Check, Search, Plus, Store, Loader } from "lucide-react";
import CreateProductModal from "../../components/CreateProductModal";
import ViewProductModal from "../../components/ViewProductsModal";
import { NoData } from "../../components/NoData";
import { useProducts, useDeleteProduct } from "../../hooks/useProducts";
import { ConfirmModal } from "../../components/ConfirmModal";
import toast from "react-hot-toast";

export default function ProductList() {
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
    fetchProducts({ page: 1, perPage: 50, search: search?.trim() || undefined });
  }, [search, fetchProducts]);

  useEffect(() => {
    if (!data?.rows) return;
    setRows(mapProductsToRows(data.rows));
  }, [data]);

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
  const btnPrimary =
    "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ffd026] text-blue-700 text-sm font-bold hover:opacity-90";
  const btnPill =
    "inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-sm text-gray-700 hover:bg-gray-200";
  const GRID = "grid grid-cols-[60px_1.3fr_1fr_1fr_0.8fr_0.9fr_1.2fr_1fr_0.9fr]";

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

      {/* FILTERS */}
      <div className={card}>
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <HeadlessSelect value={group} onChange={setGroup} options={groups} className="w-[150px]" />
            <HeadlessSelect value={keyType} onChange={setKeyType} options={keyTypes} className="w-[130px]" />
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className={`${input} w-[220px] pl-8`}
              />
            </div>
            <button className={btnPill} onClick={clearAll}>Clear</button>
          </div>
        </div>
      </div>

      {/* ACTIONS + TABLE */}
      <div className={card}>
        <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
          <div />
          <div>
            <button className={btnPrimary} onClick={() => setOpenCreate(true)}>
              <Plus size={16} /> Add Product
            </button>
          </div>
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
            <span>Loading roles...</span>
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
                <div><div className="h-10 w-10 rounded-md bg-gray-100" /></div>
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
                  <div className="inline-flex items-center gap-1">
                    <button
                      className="rounded-md border border-gray-300 px-1.5 py-0.5 text-[11px] hover:bg-gray-50"
                      onClick={() => { setActiveProduct(r.raw); setOpenView(true); }}
                    >
                      View
                    </button>
                    <button
                      className="rounded-md border border-gray-300 px-1.5 py-0.5 text-[11px] hover:bg-gray-50"
                      onClick={() => { setEditingId(r.id); setEditOpen(true); }}
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
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create modal */}
      <CreateProductModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onSave={() => fetchProducts()}
      />

      {/* Edit modal */}
      <CreateProductModal
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditingId(null); }}
        onSave={() => fetchProducts()}
        edit
        productId={editingId}
      />

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
        This action cannot be undone.
      </ConfirmModal>

    </div>
  );
}

/* ---------- helpers ---------- */
function mapProductsToRows(apiRows) {
  if (!Array.isArray(apiRows)) return [];

  return apiRows.map((p) => {
    const variants = Array.isArray(p?.variants) ? p.variants : [];
    const hasVariants = variants.length > 0;
    const typeLabel = hasVariants ? `Variant (${variants.length})` : "Simple";

    const currency = p?.currency || variants[0]?.currency || "PKR";
    const fmt = (n) => {
      const num = Number(n);
      if (Number.isNaN(num)) return "—";
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency,
          maximumFractionDigits: 2,
        }).format(num);
      } catch {
        return `${currency} ${num.toFixed(2)}`;
      }
    };

    let priceDisplay = "—";
    if (!hasVariants) {
      if (p?.retailPrice != null) priceDisplay = fmt(p.retailPrice);
      else if (p?.price != null) priceDisplay = String(p.price);
    } else {
      const nums = variants.map((v) => Number(v?.retailPrice)).filter((n) => Number.isFinite(n));
      if (nums.length) {
        const lo = Math.min(...nums);
        const hi = Math.max(...nums);
        priceDisplay = lo === hi ? fmt(lo) : `${fmt(lo)} - ${fmt(hi)}`;
      } else if (p?.price != null) {
        priceDisplay = String(p.price);
      }
    }

    const stockDisplay = p?.stock != null ? String(p.stock) : "—";
    const statusRaw = (p?.status || "").toLowerCase();
    const statusLabel = p?.isDraft ? "Draft" : statusRaw === "active" ? "Active" : p?.status || "—";
    const createdAt = p?.createdAt
      ? new Date(p.createdAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
      : "—";

    return {
      id: p?.id || crypto.randomUUID(),
      name: p?.name ?? "—",
      sku: p?.sku ?? "—",
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

/* ---------- Headless Select ---------- */
function HeadlessSelect({ value, onChange, options, className = "" }) {
  return (
    <Listbox value={value} onChange={onChange}>
      <div className={`relative ${className}`}>
        <ListboxButton className="relative w-full h-9 rounded-lg border border-gray-300 bg-white pl-3 pr-7 text-left text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10">
          <span className="block truncate">{value?.name}</span>
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
                  `relative cursor-pointer select-none px-3 py-2 ${active ? "bg-gray-100 text-gray-900" : "text-gray-800"}`
                }
              >
                {({ selected }) => (
                  <div className="flex items-center gap-2">
                    {selected ? <Check size={16} className="text-amber-700" /> : <span className="w-4" />}
                    <span className="block truncate">{opt.name}</span>
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
