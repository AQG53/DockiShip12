import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, MoreVertical, Copy, Check, Search, Package, Trash2, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { DataTable } from "../../../components/ui/DataTable";
import { useInventory } from "../hooks/useInventory";
import { useWarehouses } from "../hooks/useWarehouses";
import InventoryFilter from "../components/InventoryFilter";
import ImageGallery from "../../../components/ImageGallery";
import { useNavigate } from "react-router";

const PER_PAGE = 25;
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const IMG_PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="100%" height="100%" fill="#f3f4f6"/><g fill="#9ca3af"><circle cx="26" cy="30" r="8"/><path d="M8 60l15-15 10 10 12-12 27 27H8z"/></g></svg>'
);

const absImg = (path) => {
  if (!path) return IMG_PLACEHOLDER;
  if (path.startsWith("data:") || path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
};

// Helper for Copy
const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleCopy} className="ml-1.5 text-gray-400 hover:text-gray-600 transition-colors">
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
};

function formatCurrency(value) {
  if (value == null || isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function InventoryPage() {
  const navigate = useNavigate();
  // Filters
  const [warehouseFilter, setWarehouseFilter] = useState({ id: "", name: "All Warehouses" });
  const [stockStatusFilter, setStockStatusFilter] = useState({ id: "", name: "All Stock Status" });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Data Hooks
  const { mutate: fetchInventory, data, isPending } = useInventory();
  const { data: warehouseData } = useWarehouses();
  const warehouses = warehouseData?.rows || [];

  const warehouseOptions = useMemo(() =>
    warehouses.map(w => ({ id: w.id, name: w.name })),
    [warehouses]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch data
  useEffect(() => {
    fetchInventory({
      page,
      perPage: PER_PAGE,
      search: debouncedSearch || undefined,
      warehouseId: warehouseFilter.id || undefined,
      stockStatus: stockStatusFilter.id || undefined
    });
  }, [fetchInventory, page, debouncedSearch, warehouseFilter.id, stockStatusFilter.id]);

  const rows = data?.rows ?? [];
  const meta = data?.meta ?? { page: 1, perPage: PER_PAGE, total: 0, totalPages: 1 };

  const toggleRow = useCallback((id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Use simple rows from API, expand logic handled in render like OrdersPage if nested items existed,
  // but Inventory API returns flattened-like structure or structure with variants.
  // The current API structure seems to return products at top level with `variants` array.

  // Flatten for table display
  const flattenedRows = useMemo(() => {
    const result = [];
    for (const row of rows) {
      // For parent rows, aggregate threshold and stock from all variants (if variant product)
      // or use parent-level values (if simple product with single variant)
      const variants = row.variants || [];
      const isVariantProduct = variants.length > 1;

      // Calculate aggregated values for parent row
      const totalThreshold = variants.reduce((sum, v) => sum + (v.threshold || 0), 0);
      const totalStockOnHand = variants.reduce((sum, v) => sum + (v.stockOnHand || 0), 0);
      const parentReorderLevel = Math.max(0, totalThreshold - totalStockOnHand);

      // For simple product (1 variant), use that variant's threshold
      const parentThreshold = isVariantProduct ? totalThreshold : (variants[0]?.threshold || 0);

      result.push({
        ...row,
        isParent: true,
        hasVariants: !!(variants.length > 1),
        threshold: parentThreshold,
        reorderLevel: parentReorderLevel,
      });

      if (expandedRows.has(row.id) && variants.length > 1) {
        for (const variant of variants) {
          const variantThreshold = variant.threshold || 0;
          const variantStock = variant.stockOnHand || 0;
          const variantReorderLevel = Math.max(0, variantThreshold - variantStock);

          result.push({
            ...variant,
            isParent: false,
            parentId: row.id,
            productName: variant.productName || row.productName,
            sku: variant.sku,
            threshold: variantThreshold,
            reorderLevel: variantReorderLevel,
          });
        }
      }
    }
    return result;
  }, [rows, expandedRows]);

  // Bulk Selection (Visual Only for now)
  const [selectedIds, setSelectedIds] = useState(new Set());
  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = flattenedRows.map(r => r.id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };
  const handleSelectRow = (id, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };


  // Column definitions
  const columns = useMemo(
    () => [
      // Select Column
      {
        key: "select",
        label: (
          <input
            type="checkbox"
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            onChange={(e) => handleSelectAll(e.target.checked)}
            checked={flattenedRows.length > 0 && selectedIds.size === flattenedRows.length}
          />
        ),
        className: "!pr-0 !pl-4 w-[40px] !items-start",
        headerClassName: "!pl-4 w-[40px]",
        render: (row) => (
          <div onClick={e => e.stopPropagation()} className="flex items-center justify-center min-h-[3rem] py-1">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={selectedIds.has(row.id)}
              onChange={(e) => handleSelectRow(row.id, e.target.checked)}
            />
          </div>
        )
      },
      // Expand / Toggle
      {
        key: "expand",
        label: "",
        className: "w-[40px] !pl-0 flex-shrink-0 !items-center",
        render: (row) => {
          if (!row.isParent || !row.hasVariants) return <div className="min-h-[3rem] py-1"></div>;
          const isExpanded = expandedRows.has(row.id);
          return (
            <div className="flex items-center justify-center min-h-[3rem] py-1">
              <button
                onClick={(e) => { e.stopPropagation(); toggleRow(row.id); }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
          );
        },
      },
      // Product Info (Image + Name + SKU Stacked)
      {
        key: "productName",
        label: "Product",
        className: "min-w-[280px] !items-start",
        render: (row) => {
          // Image logic
          const imgs = row.images || [];
          const displayImages = imgs.map(img => ({ url: img.url, alt: row.productName }));
          // Fallback for variants if they don't have images, use parent? 
          // Logic simplified here: usage of ImageGallery

          const isVariant = !row.isParent;
          const name = row.productName;
          const sku = row.sku;
          const details = [row.size, row.color].filter(Boolean).join(" · ");

          return (
            <div className={`flex items-start gap-3 min-h-[3rem] py-1 ${isVariant ? "pl-0" : ""}`}>
              <div className="flex-shrink-0 mt-0.5">
                <ImageGallery
                  images={displayImages}
                  absImg={absImg}
                  placeholder={IMG_PLACEHOLDER}
                  compact={true}
                  className="h-9 w-9"
                  thumbnailClassName="h-9 w-9 bg-white"
                />
              </div>

              <div className="flex flex-col gap-0.5 min-w-0">
                <span className={`text-[13px] font-medium truncate ${row.isParent ? "text-gray-900" : "text-gray-700"}`} title={name}>
                  {name}
                </span>
                <div className="flex items-center gap-2 text-[12px] text-gray-500">
                  <span className="font-mono">{sku || "—"}</span>
                  {sku && <CopyButton text={sku} />}
                </div>
                {details && (
                  <span className="text-[11px] text-gray-400">
                    {details}
                  </span>
                )}
              </div>
            </div>
          )
        },
      },
      // Warehouse
      {
        key: "warehouse",
        label: "Warehouse",
        className: "min-w-[120px] !items-start",
        render: (row) => (
          <div className="flex items-center min-h-[3rem] py-1 text-[13px] text-gray-700">
            {row.warehouse || "—"}
          </div>
        ),
      },
      // Stock
      {
        key: "stockOnHand",
        label: "Available",
        className: "min-w-[80px] !items-start text-center justify-center",
        headerClassName: "justify-center",
        render: (row) => (
          <div className="flex items-center justify-center min-h-[3rem] py-1">
            <span className={`text-[13px] font-semibold ${row.stockOnHand <= 0 ? "text-rose-500" : "text-emerald-700"}`}>
              {row.stockOnHand ?? 0}
            </span>
          </div>
        ),
      },
      // Reserved
      {
        key: "reservedQty",
        label: "Reserved",
        className: "min-w-[80px] !items-start text-center justify-center",
        headerClassName: "justify-center",
        render: (row) => (
          <div className="flex items-center justify-center min-h-[3rem] py-1 text-[13px] text-gray-600">
            {row.reservedQty ?? 0}
          </div>
        ),
      },
      // In Transit
      {
        key: "inTransit",
        label: "In Transit",
        className: "min-w-[80px] !items-start text-center justify-center",
        headerClassName: "justify-center",
        render: (row) => (
          <div className="flex items-center justify-center min-h-[3rem] py-1 text-[13px] text-gray-600">
            {row.inTransit ?? 0}
          </div>
        ),
      },
      // Returns
      {
        key: "returns",
        label: "Returns",
        className: "min-w-[80px] !items-start text-center justify-center",
        headerClassName: "justify-center",
        render: (row) => (
          <div className="flex items-center justify-center min-h-[3rem] py-1 text-[13px] text-gray-600">
            {row.returns ?? 0}
          </div>
        ),
      },
      // Threshold
      {
        key: "threshold",
        label: "Threshold",
        className: "min-w-[80px] !items-start text-center justify-center",
        headerClassName: "justify-center",
        render: (row) => (
          <div className="flex items-center justify-center min-h-[3rem] py-1 text-[13px] text-gray-600">
            {row.threshold ?? 0}
          </div>
        ),
      },
      // Reorder Level
      {
        key: "reorderLevel",
        label: "Reorder",
        className: "min-w-[80px] !items-start text-center justify-center",
        headerClassName: "justify-center",
        render: (row) => (
          <div className="flex items-center justify-center min-h-[3rem] py-1 text-[13px] text-gray-600">
            {row.reorderLevel ?? 0}
          </div>
        ),
      },
      // Orders (Pending/Active)
      {
        key: "totalOrders",
        label: "Orders",
        className: "min-w-[70px] !items-start text-center justify-center",
        headerClassName: "justify-center",
        render: (row) => (
          <div className="flex items-center justify-center min-h-[3rem] py-1 text-[13px] text-gray-800 font-medium">
            {row.totalOrders ?? 0}
          </div>
        ),
      },
      // Prices (Unit Cost)
      {
        key: "costPrice",
        label: "Unit Cost",
        className: "min-w-[100px] !items-start text-center justify-center",
        headerClassName: "justify-center",
        render: (row) => (
          <div className="flex items-center justify-center min-h-[3rem] py-1 text-[13px] text-gray-600">
            {formatCurrency(row.costPrice)}
          </div>
        ),
      },
      // Total Value
      {
        key: "totalValue",
        label: "Total Value",
        className: "min-w-[110px] !items-start text-center justify-center",
        headerClassName: "justify-center",
        render: (row) => (
          <div className="flex items-center justify-center min-h-[3rem] py-1 text-[13px] text-gray-900 font-semibold">
            {formatCurrency(row.totalValue)}
          </div>
        ),
      },
      {
        key: "actions",
        label: "",
        className: "w-12 flex-shrink-0 sticky right-0 bg-white !items-start",
        headerClassName: "sticky right-0 bg-gray-50",
        render: (row) => (
          <div className="flex items-center justify-center min-h-[3rem] py-1">
            <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors">
              <MoreVertical size={16} />
            </button>
          </div>
        ),
      },
    ],
    [expandedRows, toggleRow, flattenedRows, selectedIds]
  );

  // Filter Handlers
  const handleFilterApply = (newFilters) => {
    setSearch(newFilters.search);
    setWarehouseFilter(newFilters.warehouse);
    setStockStatusFilter(newFilters.stockStatus);
    setPage(1);
  };


  // Toolbar
  const toolbar = (
    <div className="flex items-center gap-3 w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products, SKU..."
          className="h-9 w-[240px] rounded-lg border border-gray-300 pl-9 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all"
        />
      </div>

      <InventoryFilter
        filters={{
          search,
          warehouse: warehouseFilter,
          stockStatus: stockStatusFilter
        }}
        options={{ warehouseOptions }}
        onApply={handleFilterApply}
      />

      {(warehouseFilter.id || stockStatusFilter.id) && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-medium text-gray-500">Applied:</span>

          {warehouseFilter.id && (
            <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-200 whitespace-nowrap">
              {warehouseFilter.name}
              <button onClick={() => setWarehouseFilter({ id: "", name: "All Warehouses" })} className="hover:text-red-500"><X size={10} /></button>
            </div>
          )}

          {stockStatusFilter.id && (
            <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-200 whitespace-nowrap">
              {stockStatusFilter.name}
              <button onClick={() => setStockStatusFilter({ id: "", name: "All Stock Status" })} className="hover:text-red-500"><X size={10} /></button>
            </div>
          )}

          <div className="h-4 w-px bg-gray-300 mx-1" />

          <Button
            variant="ghost"
            size="xs"
            className="text-red-600 hover:bg-red-50 h-6 px-2"
            onClick={() => handleFilterApply({
              search: "",
              warehouse: { id: "", name: "All Warehouses" },
              stockStatus: { id: "", name: "All Stock Status" }
            })}
          >
            <Trash2 size={12} className="mr-1" /> Clear all
          </Button>
        </div>
      )}

      <div className="flex-1" />
      <div className="text-[13px] text-gray-500 font-medium">
        {meta.total} items
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-full min-w-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-md bg-amber-100 border border-gray-200 flex items-center justify-center">
          <Package size={18} className="text-amber-700" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">View and manage stock levels for all products and variants</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={flattenedRows}
        isLoading={isPending}
        rowKey={(row) => row.id}
        gridCols="grid-cols-[40px_40px_minmax(300px,2fr)_minmax(140px,0.5fr)_minmax(90px,0.5fr)_minmax(90px,0.5fr)_minmax(90px,0.5fr)_minmax(90px,0.5fr)_minmax(90px,0.5fr)_minmax(90px,0.5fr)_minmax(80px,0.5fr)_minmax(110px,0.6fr)_minmax(120px,0.8fr)_48px]"
        emptyMessage="No inventory items found"
        toolbar={toolbar}
        rowClassName={(row) =>
          !row.isParent ? "bg-gray-50/50" : "hover:bg-gray-50"
        }
      />

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border border-gray-200 bg-white rounded-xl mt-4">
          <div className="text-sm text-gray-500">
            Page {meta.page} of {meta.totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}