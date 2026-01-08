import { useState, useMemo, useEffect } from "react";
import { Package, Plus, Pencil, Trash2, Search, Copy, Check, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { DataTable } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import OrdersFilter from "../components/OrdersFilter"; // New Filter Component
import { ConfirmModal } from "../../../components/ConfirmModal";
import OrderModal from "../components/OrderModal";
import ViewOrderModal from "../components/ViewOrderModal";
import { useOrders, useDeleteOrder } from "../hooks/useOrders";
import { useSearchMarketplaceChannels } from "../../../hooks/useProducts";
import { useCourierMediums } from "../../settings/hooks/useCourierMediums";
import { useRemarkTypes } from "../../settings/hooks/useRemarkTypes";
import useUserPermissions from "../../auth/hooks/useUserPermissions";
import toast from "react-hot-toast";

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

export default function OrdersPage() {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const location = useLocation();
    const navigate = useNavigate();
    const searchParams = new URLSearchParams(location.search);
    const statusParam = searchParams.get("status");

    // Permissions
    const { claims } = useUserPermissions();
    const perms = useMemo(() => new Set(Array.isArray(claims?.perms) ? claims.perms.map(String) : []), [claims]);
    const firstRole = String(claims?.roles?.[0] ?? "").toLowerCase();
    const isOwner = firstRole === "owner";

    const canCreate = isOwner || perms.has("orders.create");
    const canUpdate = isOwner || perms.has("orders.update");
    const canDelete = isOwner || perms.has("orders.delete");

    // Filters
    const [statusFilter, setStatusFilter] = useState({ id: "ALL", name: "All Status" });
    const [channelFilter, setChannelFilter] = useState({ id: "", name: "All Channels" });
    const [courierFilter, setCourierFilter] = useState({ id: "", name: "All Couriers" });
    const [remarkFilter, setRemarkFilter] = useState({ id: "", name: "All Remarks" });
    const [dateTypeFilter, setDateTypeFilter] = useState({ id: "order", name: "Order Date" });

    // Date Range (Unified)
    const [dateRange, setDateRange] = useState(undefined); // { from, to }

    // Pagination
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);

    const statusOptions = useMemo(() => [
        { id: "ALL", name: "All Status" },
        { id: "LABEL_PRINTED", name: "Label Printed" },
        { id: "PACKED", name: "Packed" },
        { id: "SHIPPED", name: "Shipped" },
        { id: "DROP_OFF", name: "Drop Off" },
        { id: "DELIVERED", name: "Delivered" },
        { id: "RETURN", name: "Return" },
        { id: "CANCEL", name: "Cancel" },
        { id: "REFUND", name: "Refund" },
    ], []);

    const dateTypeOptions = useMemo(() => [
        { id: "order", name: "Order Date" },
        { id: "created", name: "Created Date" },
    ], []);

    useEffect(() => {
        if (statusParam) {
            if (statusFilter.id !== statusParam) {
                const opt = statusOptions.find(o => o.id === statusParam);
                if (opt) setStatusFilter(opt);
            }
        } else {
            if (statusFilter.id !== "ALL") {
                setStatusFilter(statusOptions[0]);
            }
        }
    }, [statusParam, statusOptions, statusFilter.id]);

    const handleStatusChange = (opt) => {
        setStatusFilter(opt);
        setPage(1); // Reset page on filter change
        if (opt.id === "ALL") {
            navigate("/orders");
        } else {
            navigate(`/orders?status=${opt.id}`);
        }
    };

    const { data: channels = [] } = useSearchMarketplaceChannels({});
    const { data: couriers = [] } = useCourierMediums();
    const { data: remarkTypes = [] } = useRemarkTypes();

    const channelOptions = useMemo(() => [
        { id: "", name: "All Channels" },
        ...channels.map(c => ({ id: c.id, name: c.marketplace || c.name }))
    ], [channels]);

    const courierOptions = useMemo(() => [
        { id: "", name: "All Couriers" },
        ...couriers.map(c => ({ id: c.id, name: c.shortName || c.fullName }))
    ], [couriers]);

    const remarkOptions = useMemo(() => [
        { id: "", name: "All Remarks" },
        ...remarkTypes.map(r => ({ id: r.id, name: r.name }))
    ], [remarkTypes]);

    const { data: orderData, isLoading } = useOrders({
        search: debouncedSearch,
        status: statusParam || (statusFilter.id === "ALL" ? undefined : statusFilter.id),
        mediumId: channelFilter.id,
        courierId: courierFilter.id,
        remarkTypeId: remarkFilter.id,
        dateType: dateTypeFilter.id,
        startDate: dateRange?.from ? dateRange.from.toISOString() : undefined,
        endDate: dateRange?.to ? dateRange.to.toISOString() : (dateRange?.from ? dateRange.from.toISOString() : undefined), // Fallback if single date selected
        page,
        perPage,
    });

    const orders = orderData?.rows || [];
    const meta = orderData?.meta || {};

    const deleteMut = useDeleteOrder();

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset page on search
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Modals
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [target, setTarget] = useState(null);
    const [viewOpen, setViewOpen] = useState(false);
    const [viewOrder, setViewOrder] = useState(null);

    const openModal = (item = null) => {
        setEditing(item);
        setModalOpen(true);
    };

    const handleDelete = async () => {
        if (!target) return;
        try {
            await deleteMut.mutateAsync(target.id);
            toast.success("Order deleted");
            setConfirmOpen(false);
        } catch (err) {
            toast.error("Failed to delete order");
        }
    };

    const columns = [
        {
            key: "date",
            label: "Date",
            render: (row) => (
                <span className="text-gray-700 text-[13px]">
                    {row.date ? new Date(row.date).toLocaleDateString() : "—"}
                </span>
            )
        },
        {
            key: "orderId",
            label: "Order ID",
            render: (row) => (
                <div className="flex items-center gap-1">
                    <span className="text-gray-900 text-[13px] truncate" title={row.orderId}>
                        {row.orderId || "—"}
                    </span>
                    {row.orderId && <CopyButton text={row.orderId} />}
                </div>
            )
        },
        {
            key: "channel",
            label: "Marketplace",
            render: (row) => (
                <span className="text-gray-700 text-[13px]">
                    {row.tenantChannel?.marketplace || "—"}
                </span>
            )
        },
        {
            key: "product",
            label: "Product",
            render: (row) => {
                // Multi-product support
                if (row.items && row.items.length > 0) {
                    if (row.items.length === 1) {
                        const item = row.items[0];
                        const name = item.productDescription || item.product?.name || "Product";
                        return (
                            <div className="flex flex-col gap-0.5">
                                <span className="text-gray-900 text-[13px] truncate" title={name}>{name}</span>
                                <span className="text-[11px] text-gray-500">Qty: {item.quantity}</span>
                            </div>
                        )
                    }
                    return (
                        <div className="flex flex-col gap-0.5">
                            <span className="text-gray-900 text-[13px] font-medium">Multiple Items</span>
                            <span className="text-[11px] text-gray-500">{row.items.length} items · Total Qty: {row.items.reduce((a, b) => a + (b.quantity || 0), 0)}</span>
                        </div>
                    );
                }

                // Legacy Fallback
                const productName = row.product?.name || row.productVariant?.sku || row.productDescription || "—";
                const variantInfo = row.productVariant?.sizeText || row.productVariant?.colorText
                    ? [row.productVariant?.sizeText, row.productVariant?.colorText].filter(Boolean).join(" · ")
                    : null;
                const sizeColor = (row.size || row.color)
                    ? [row.size?.code, row.color?.name].filter(Boolean).join(" · ")
                    : null;
                return (
                    <div className="flex flex-col gap-0.5">
                        <span className="text-gray-900 text-[13px] truncate" title={productName}>
                            {productName}
                        </span>
                        {(variantInfo || sizeColor) && (
                            <span className="text-[11px] text-gray-500">
                                {variantInfo || sizeColor}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            key: "qty",
            label: "Qty",
            render: (row) => (
                <span className="text-gray-800 text-[13px]">{row.quantity}</span>
            )
        },

        {
            key: "totalAmount",
            label: "S. Price",
            render: (row) => (
                <span className="text-gray-900 text-[13px]">
                    {row.totalAmount !== undefined ? Number(row.totalAmount).toFixed(2) : "—"}
                </span>
            )
        },
        {
            key: "netProfit",
            label: "Profit",
            render: (row) => {
                const val = row.netProfit !== undefined ? Number(row.netProfit) : 0;
                return (
                    <span className={`text-[13px] ${val >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                        {val.toFixed(2)}
                    </span>
                );
            }
        },
        {
            key: "courier",
            label: "Courier",
            render: (row) => (
                <div className="flex flex-col gap-0.5">
                    <span className="text-gray-800 text-[13px]">
                        {row.courierMedium?.shortName || row.courierMedium?.fullName || "—"}
                    </span>
                    {row.trackingId && (
                        <span className="text-[11px] text-blue-600 truncate" title={row.trackingId}>
                            {row.trackingId}
                        </span>
                    )}
                </div>
            )
        },
        {
            key: "status",
            label: "Status",
            render: (row) => (
                <div className="flex flex-col items-start gap-1">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${row.status === 'DELIVERED'
                        ? "bg-emerald-100 text-emerald-700"
                        : row.status === 'CANCEL' || row.status === 'RETURN' || row.status === 'REFUND'
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                        {row.status?.replace(/_/g, " ")}
                    </span>
                    {row.remarkType && (
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">
                            {row.remarkType.name}
                        </span>
                    )}
                </div>
            )
        },
        {
            key: "actions",
            label: "Actions",
            render: (row) => (
                <div className="flex items-center gap-1">
                    <Button variant="secondary" size="xs" className="rounded-md" onClick={(e) => { e.stopPropagation(); setViewOrder(row); setViewOpen(true); }}>
                        View
                    </Button>
                    {canUpdate && (
                        <Button variant="secondary" size="xs" className="rounded-md" onClick={(e) => { e.stopPropagation(); openModal(row); }}>
                            Edit
                        </Button>
                    )}
                    {canDelete && (
                        <Button variant="secondary" size="xs" className="rounded-md text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setTarget(row); setConfirmOpen(true); }}>
                            Delete
                        </Button>
                    )}
                </div>
            )
        }
    ];

    // Unified handleApply from Filter
    const handleFilterApply = (newFilters) => {
        setSearch(newFilters.search);
        setDebouncedSearch(newFilters.search);
        setStatusFilter(newFilters.status);
        setChannelFilter(newFilters.channel || newFilters.medium);
        setCourierFilter(newFilters.courier);
        setRemarkFilter(newFilters.remark);
        setDateRange(newFilters.dateRange);

        const statusId = newFilters.status.id;
        if (statusId === "ALL") navigate("/orders");
        else navigate(`/orders?status=${statusId}`);
    };

    const toolbar = (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search..."
                        className="h-9 w-[240px] rounded-lg border border-gray-300 pl-9 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all"
                    />
                </div>

                {statusFilter.id === "ALL" && (
                    <>
                        <OrdersFilter
                            filters={{
                                // search, // Search managed globally now
                                status: statusFilter,
                                medium: channelFilter,
                                courier: courierFilter,
                                remark: remarkFilter,
                                dateRange
                            }}
                            options={{
                                statusOptions,
                                mediumOptions: channelOptions,
                                courierOptions,
                                remarkOptions
                            }}
                            onApply={handleFilterApply}
                        />

                        {(statusFilter.id !== "ALL" || channelFilter.id || courierFilter.id || remarkFilter.id || dateRange) && (
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                <span className="text-xs font-medium text-gray-500">Applied:</span>

                                {/* Status */}
                                {statusFilter.id !== "ALL" && (
                                    <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-200">
                                        {statusFilter.name}
                                        <button onClick={() => setStatusFilter(statusOptions[0])} className="hover:text-red-500"><X size={10} /></button>
                                    </div>
                                )}

                                {/* Date Range */}
                                {dateRange && (
                                    <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-200 whitespace-nowrap">
                                        {new Date(dateRange.from).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        {dateRange.to && ` - ${new Date(dateRange.to).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                                        <button onClick={() => setDateRange(undefined)} className="hover:text-red-500"><X size={10} /></button>
                                    </div>
                                )}

                                {/* Channel */}
                                {channelFilter.id && (
                                    <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-200 whitespace-nowrap">
                                        {channelFilter.name}
                                        <button onClick={() => setChannelFilter(channelOptions[0])} className="hover:text-red-500"><X size={10} /></button>
                                    </div>
                                )}

                                {/* Courier */}
                                {courierFilter.id && (
                                    <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-200 whitespace-nowrap">
                                        {courierFilter.name}
                                        <button onClick={() => setCourierFilter(courierOptions[0])} className="hover:text-red-500"><X size={10} /></button>
                                    </div>
                                )}

                                {/* Remark */}
                                {remarkFilter.id && (
                                    <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-200 whitespace-nowrap">
                                        {remarkFilter.name}
                                        <button onClick={() => setRemarkFilter(remarkOptions[0])} className="hover:text-red-500"><X size={10} /></button>
                                    </div>
                                )}

                                <div className="h-4 w-px bg-gray-300 mx-1" />

                                <Button
                                    variant="ghost"
                                    size="xs"
                                    className="text-red-600 hover:bg-red-50 h-6 px-2"
                                    onClick={() => handleFilterApply({
                                        search: "", // Keep search or clear? Usually filters are separate from search. Let's keep search.
                                        status: statusOptions[0],
                                        channel: channelOptions[0],
                                        courier: courierOptions[0],
                                        remark: remarkOptions[0],
                                        dateRange: undefined
                                    })}
                                >
                                    <Trash2 size={12} className="mr-1" /> Clear all
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {statusFilter.id === "ALL" && canCreate && (
                <Button variant="warning" onClick={() => openModal()}>
                    <Plus size={16} className="mr-1.5" /> Add Order
                </Button>
            )}
        </div>
    );

    return (
        <div className="w-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-9 w-9 rounded-md bg-amber-100 border border-gray-200 flex items-center justify-center">
                    <Package size={18} className="text-amber-700" />
                </div>
                <div>
                    <h1 className="text-lg font-semibold text-gray-900">Order Management</h1>
                    <p className="text-sm text-gray-500">View and manage all your orders</p>
                </div>
            </div>
            <DataTable
                columns={columns}
                rows={orders}
                isLoading={isLoading}
                toolbar={toolbar}
                gridCols="grid-cols-[0.7fr_0.9fr_0.7fr_1.4fr_0.4fr_0.6fr_0.6fr_1fr_0.9fr_1.2fr]"
            />

            {/* Pagination Controls */}
            {!isLoading && meta && meta.total > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border border-gray-200 bg-white rounded-xl mt-4">
                    <div className="text-sm text-gray-500">
                        Showing <span className="font-medium">{(meta.page - 1) * meta.perPage + 1}</span> to{" "}
                        <span className="font-medium">
                            {Math.min(meta.page * meta.perPage, meta.total)}
                        </span>{" "}
                        of <span className="font-medium">{meta.total}</span> results
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            size="sm"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setPage((p) => p + 1)}
                            disabled={page >= (meta.totalPages || 1)}
                            size="sm"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            <OrderModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                editing={editing}
            />

            <ConfirmModal
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleDelete}
                title="Delete Order"
                loading={deleteMut.isPending}
            >
                Are you sure you want to delete order <strong>{target?.orderId}</strong>?
            </ConfirmModal>

            <ViewOrderModal
                open={viewOpen}
                onClose={() => setViewOpen(false)}
                order={viewOrder}
            />
        </div>
    );
}
