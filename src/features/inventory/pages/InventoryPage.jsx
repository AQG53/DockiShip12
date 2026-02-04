import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, MoreVertical, Search } from "lucide-react";
import { DataTable } from "../../../components/ui/DataTable";
import { useInventory } from "../hooks/useInventory";

const PER_PAGE = 25;

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
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState(new Set());

  const { mutate: fetchInventory, data, isPending } = useInventory();

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
    });
  }, [fetchInventory, page, debouncedSearch]);

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

  // Flatten rows for display (include expanded variants)
  const flattenedRows = useMemo(() => {
    const result = [];
    for (const row of rows) {
      result.push({ ...row, isParent: true, hasVariants: !!(row.variants?.length) });
      if (expandedRows.has(row.id) && row.variants?.length) {
        for (const variant of row.variants) {
          result.push({ ...variant, isParent: false, parentId: row.id });
        }
      }
    }
    return result;
  }, [rows, expandedRows]);

  // Column definitions
  const columns = useMemo(
    () => [
      {
        key: "expand",
        label: "",
        className: "w-10 flex-shrink-0",
        render: (row) => {
          if (!row.isParent || !row.hasVariants) return null;
          const isExpanded = expandedRows.has(row.id);
          return (
            <button
              onClick={() => toggleRow(row.id)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          );
        },
      },
      {
        key: "productName",
        label: "Product Name",
        className: "min-w-[200px]",
        render: (row) => (
          <div className={`${!row.isParent ? "pl-6" : ""}`}>
            <span className={`font-medium ${row.isParent ? "text-gray-900" : "text-gray-600"}`}>
              {row.productName}
            </span>
          </div>
        ),
      },
      {
        key: "sku",
        label: "SKU",
        className: "min-w-[120px]",
        render: (row) => (
          <span className="text-gray-600 font-mono text-xs">{row.sku || "—"}</span>
        ),
      },
      {
        key: "size",
        label: "Size",
        className: "min-w-[80px]",
        render: (row) => <span className="text-gray-600">{row.size || "—"}</span>,
      },
      {
        key: "color",
        label: "Color",
        className: "min-w-[80px]",
        render: (row) => <span className="text-gray-600">{row.color || "—"}</span>,
      },
      {
        key: "warehouse",
        label: "Warehouse",
        className: "min-w-[100px]",
        render: (row) => <span className="text-gray-600">{row.warehouse || "—"}</span>,
      },
      {
        key: "stockOnHand",
        label: "Stock",
        className: "min-w-[80px] text-right",
        headerClassName: "justify-end",
        render: (row) => (
          <span className={`font-medium ${row.stockOnHand <= 0 ? "text-red-600" : "text-gray-900"}`}>
            {row.stockOnHand ?? 0}
          </span>
        ),
      },
      {
        key: "reservedQty",
        label: "Reserved",
        className: "min-w-[80px] text-right",
        headerClassName: "justify-end",
        render: (row) => <span className="text-gray-600">{row.reservedQty ?? 0}</span>,
      },
      {
        key: "inTransit",
        label: "In Transit",
        className: "min-w-[80px] text-right",
        headerClassName: "justify-end",
        render: (row) => <span className="text-gray-600">{row.inTransit ?? 0}</span>,
      },
      {
        key: "totalOrders",
        label: "Orders",
        className: "min-w-[70px] text-right",
        headerClassName: "justify-end",
        render: (row) => <span className="text-gray-600">{row.totalOrders ?? 0}</span>,
      },
      {
        key: "threshold",
        label: "Threshold",
        className: "min-w-[80px] text-right",
        headerClassName: "justify-end",
        render: (row) => <span className="text-gray-600">{row.threshold ?? 0}</span>,
      },
      {
        key: "reorderLevel",
        label: "Reorder",
        className: "min-w-[70px] text-right",
        headerClassName: "justify-end",
        render: (row) => <span className="text-gray-600">{row.reorderLevel ?? 0}</span>,
      },
      {
        key: "returns",
        label: "Returns",
        className: "min-w-[70px] text-right",
        headerClassName: "justify-end",
        render: (row) => <span className="text-gray-600">{row.returns ?? 0}</span>,
      },
      {
        key: "costPrice",
        label: "Cost Price",
        className: "min-w-[100px] text-right",
        headerClassName: "justify-end",
        render: (row) => (
          <span className="text-gray-900 font-medium">{formatCurrency(row.costPrice)}</span>
        ),
      },
      {
        key: "totalValue",
        label: "Total Value",
        className: "min-w-[110px] text-right",
        headerClassName: "justify-end",
        render: (row) => (
          <span className="text-gray-900 font-semibold">{formatCurrency(row.totalValue)}</span>
        ),
      },
      {
        key: "actions",
        label: "",
        className: "w-12 flex-shrink-0 sticky right-0 bg-white",
        headerClassName: "sticky right-0 bg-gray-50",
        render: (row) => (
          <button className="p-1 hover:bg-gray-100 rounded transition-colors">
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
        ),
      },
    ],
    [expandedRows, toggleRow]
  );

  // Toolbar
  const toolbar = (
    <div className="flex items-center gap-4 w-full">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div className="text-sm text-gray-500">
        {meta.total} item{meta.total !== 1 ? "s" : ""}
      </div>
    </div>
  );

  // Pagination
  const pagination = meta.totalPages > 1 && (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
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
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and manage stock levels for all products and variants
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={flattenedRows}
        isLoading={isPending}
        rowKey={(row) => (row.isParent ? row.id : `${row.parentId}-${row.id}`)}
        gridCols="grid-cols-[40px_200px_120px_80px_80px_100px_80px_80px_80px_70px_80px_70px_70px_100px_110px_48px]"
        emptyMessage="No inventory items found"
        toolbar={toolbar}
        rowClassName={(row) =>
          !row.isParent ? "bg-gray-50/70" : ""
        }
      />

      {pagination}
    </div>
  );
}