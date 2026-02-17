import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import { Package, Plus, Pencil, Trash2, Search, Copy, Check, X, Download, Printer, Truck, CheckCircle, Upload } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { DataTable } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import OrdersFilter from "../components/OrdersFilter"; // New Filter Component
import { ConfirmModal } from "../../../components/ConfirmModal";
import OrderModal from "../components/OrderModal";
import ViewOrderModal from "../components/ViewOrderModal";
import { useOrders, useDeleteOrder, useUpdateOrder, useBulkUpdateOrder, useUploadOrderLabel } from "../hooks/useOrders";
import SelectCompact from "../../../components/SelectCompact"; // Ensure imported
import { Modal } from "../../../components/ui/Modal";
import { useSearchMarketplaceChannels } from "../../../hooks/useProducts";
import { useCourierMediums } from "../../settings/hooks/useCourierMediums";
import { useRemarkTypes } from "../../settings/hooks/useRemarkTypes";
import useUserPermissions from "../../auth/hooks/useUserPermissions";
import toast from "react-hot-toast";
import ImageGallery from "../../../components/ImageGallery";
import DateRangePicker from "../../../components/ui/DateRangePicker";
import {
    listOrders,
    bulkUpdateOrder,
    deleteOrder,
    downloadBulkLabels
} from "../../../lib/api";
import { AnimatedAlert } from "../../../components/ui/AnimatedAlert";

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

// Formatting helper: Always use UTC to show "server date" (wall clock)
const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString(undefined, { timeZone: 'UTC' });
};
const formatDateCSV = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString(undefined, { timeZone: 'UTC' });
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
    const [settledFilter, setSettledFilter] = useState({ id: "all", name: "All" });
    const [dateTypeFilter, setDateTypeFilter] = useState({ id: "order", name: "Order Date" });

    // Date Range (Unified)
    const [dateRange, setDateRange] = useState(undefined); // { from, to }

    // Pagination
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [marketplaceSortOrder, setMarketplaceSortOrder] = useState("asc");
    const [highlightOrderId, setHighlightOrderId] = useState(null);

    const handleOrderSaved = (id) => {
        setHighlightOrderId(id);
        setTimeout(() => setHighlightOrderId(null), 3000);
    };

    const statusOptions = useMemo(() => [
        { id: "ALL", name: "All Status" },
        { id: "PENDING", name: "Pending" },
        { id: "LABEL_UPLOADED", name: "Label Uploaded" },
        { id: "LABEL_PRINTED", name: "Label Printed" },
        { id: "PACKED", name: "Packed" },
        { id: "SHIPPED", name: "Shipped" },
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
        ...(Array.isArray(channels) ? channels : []).map(c => ({ id: c.id, name: c.marketplace || c.name }))
    ], [channels]);

    const courierOptions = useMemo(() => [
        { id: "", name: "All Couriers" },
        ...(Array.isArray(couriers) ? couriers : []).map(c => ({ id: c.id, name: c.shortName || c.fullName }))
    ], [couriers]);

    const remarkOptions = useMemo(() => [
        { id: "", name: "All Remarks" },
        ...(Array.isArray(remarkTypes) ? remarkTypes : []).map(r => ({ id: r.id, name: r.name }))
    ], [remarkTypes]);

    const { data: orderData, isLoading } = useOrders({
        search: debouncedSearch,
        status: statusParam || (statusFilter.id === "ALL" ? undefined : statusFilter.id),
        mediumId: channelFilter.id,
        courierId: courierFilter.id,
        remarkTypeId: remarkFilter.id,
        dateType: dateTypeFilter.id,
        startDate: dateRange?.from ? dateRange.from.toISOString() : undefined,
        endDate: dateRange?.to ? dateRange.to.toISOString() : (dateRange?.from ? dateRange.from.toISOString() : undefined),
        isSettled: settledFilter.id !== "all" ? settledFilter.id : undefined,
        page,
        perPage,
    });

    const orders = orderData?.rows || [];
    const meta = orderData?.meta || {};
    const sortedOrders = useMemo(() => {
        const rows = [...orders];
        rows.sort((a, b) => {
            const aMarketplace = (a?.tenantChannel?.marketplace || "").toString();
            const bMarketplace = (b?.tenantChannel?.marketplace || "").toString();
            return marketplaceSortOrder === "asc"
                ? aMarketplace.localeCompare(bMarketplace, undefined, { sensitivity: "base" })
                : bMarketplace.localeCompare(aMarketplace, undefined, { sensitivity: "base" });
        });
        return rows;
    }, [orders, marketplaceSortOrder]);

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

    // Expandable Rows State
    const [expandedOrderIds, setExpandedOrderIds] = useState(new Set());
    const toggleExpand = (orderId) => {
        setExpandedOrderIds(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) next.delete(orderId);
            else next.add(orderId);
            return next;
        });
    };

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState(new Set());
    const bulkUpdateMut = useBulkUpdateOrder();
    const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
    const [bulkStatus, setBulkStatus] = useState("SHIPPED");

    // Clear selection on filter change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [statusFilter.id, channelFilter.id, courierFilter.id, dateRange]);

    const handleSelectAll = (checked) => {
        if (checked) {
            const allIds = sortedOrders.map(o => o.id);
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

    const handleBulkUpdate = async () => {
        if (selectedIds.size === 0) return;
        if (!bulkStatus) return;
        try {
            const res = await bulkUpdateMut.mutateAsync({
                ids: Array.from(selectedIds),
                status: bulkStatus
            });

            // Check response for detailed results
            if (res && typeof res.success === 'number') {
                // Determine if failure is due to labels
                const labelErrors = res.errors?.filter(e => e.error?.includes("Label not found")) || [];
                const otherErrors = res.failed - labelErrors.length;

                if (res.failed === 0) {
                    toast.success(`Successfully updated ${res.success} orders`);
                } else {
                    let parts = [];
                    if (res.success > 0) parts.push(`Updated ${res.success} orders.`);
                    if (labelErrors.length > 0) parts.push(`${labelErrors.length} failed (no label).`);
                    if (otherErrors > 0) parts.push(`${otherErrors} failed (other errors).`);

                    toast.error(parts.join(" "));
                }
            } else {
                toast.success("Orders updated");
            }

            setBulkStatusModalOpen(false);
            setSelectedIds(new Set());
        } catch (err) {
            toast.error("Failed to update orders");
        }
    };

    const handleBulkDownloadLabels = async () => {
        const toastId = toast.loading("Preparing labels...");
        try {
            const ids = Array.from(selectedIds);

            // 1. Download PDF
            const blob = await downloadBulkLabels(ids);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `labels-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();

            // 2. Auto-Update Status for LABEL_UPLOADED -> LABEL_PRINTED
            // We need to find which orders out of the selected ones are currently LABEL_UPLOADED
            const allOrders = orderData.rows || [];
            const idsToUpdate = [];

            ids.forEach(id => {
                const order = allOrders.find(o => o.id === id);
                if (order && order.status === 'LABEL_UPLOADED') {
                    idsToUpdate.push(id);
                }
            });

            if (idsToUpdate.length > 0) {
                await bulkUpdateMut.mutateAsync({
                    ids: idsToUpdate,
                    status: 'LABEL_PRINTED'
                });
                toast.success(`Downloaded and marked ${idsToUpdate.length} orders as Printed`, { id: toastId });
            } else {
                toast.success("Labels downloaded", { id: toastId });
            }
            setSelectedIds(new Set());
        } catch (err) {
            console.error(err);
            // Check for specific backend error
            if (err.response?.data?.message) {
                toast.error(err.response.data.message, { id: toastId });
            } else {
                toast.error("Failed to download labels", { id: toastId });
            }
        }
    };

    const openModal = (item = null) => {
        setEditing(item);
        setModalOpen(true);
    };

    // Delete Confirmation
    const handleDelete = async () => {
        if (!target) return;
        try {
            await deleteMut.mutateAsync(target.id);
            setConfirmOpen(false);
            setDeleteSuccessOpen(true); // Show success alert
            setTarget(null);
        } catch (err) {
            toast.error("Failed to delete order");
        }
    };

    // Settle Logic
    const [confirmSettleOpen, setConfirmSettleOpen] = useState(false);
    const [settleSuccessOpen, setSettleSuccessOpen] = useState(false);
    const [deleteSuccessOpen, setDeleteSuccessOpen] = useState(false); // New state
    const [settleTarget, setSettleTarget] = useState(null);
    const updateMut = useUpdateOrder();

    // Upload Label Logic
    const uploadLabelMut = useUploadOrderLabel();
    const fileInputRef = useRef(null);
    const [uploadTargetId, setUploadTargetId] = useState(null);

    const handleUploadClick = (orderId) => {
        setUploadTargetId(orderId);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !uploadTargetId) return;

        if (file.type !== 'application/pdf') {
            toast.error("Only PDF files are allowed");
            // Clear input
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        const toastId = toast.loading("Uploading label...");
        try {
            await uploadLabelMut.mutateAsync({ orderId: uploadTargetId, formData });
            toast.success("Label uploaded and status updated", { id: toastId });
            setUploadTargetId(null);
        } catch (err) {
            console.error(err);
            toast.error("Failed to upload label", { id: toastId });
        }
    };

    const handleSettleConfirm = async () => {
        if (!settleTarget) return;
        try {
            const newValue = !settleTarget.is_settled;
            await updateMut.mutateAsync({ id: settleTarget.id, payload: { is_settled: newValue } });
            setConfirmSettleOpen(false);
            setSettleSuccessOpen(true);
            setSettleTarget(null);
        } catch (err) {
            toast.error("Failed to update order");
        }
    };



    const columns = [
        {
            key: "select",
            label: (
                <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    checked={sortedOrders.length > 0 && selectedIds.size === sortedOrders.length}
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
        {
            key: "date",
            label: "Date",
            className: "!items-start",
            render: (row) => (
                <div className="flex items-center min-h-[3rem] py-1">
                    <span className="text-gray-700 text-[13px]">
                        {formatDate(row.date)}
                    </span>
                </div>
            )
        },
        {
            key: "orderId",
            label: "Order ID",
            className: "!items-start min-w-[250px]",
            headerClassName: "min-w-[250px]",
            render: (row) => (
                <div className="flex items-center gap-1 min-h-[3rem] py-1">
                    <span className="text-gray-900 text-[13px] truncate" title={row.orderId}>
                        {row.orderId || "—"}
                    </span>
                    {row.orderId && <CopyButton text={row.orderId} />}
                </div>
            )
        },
        {
            key: "channel",
            label: (
                <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-gray-900"
                    onClick={(e) => {
                        e.stopPropagation();
                        setMarketplaceSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                    }}
                    title={`Sort marketplace ${marketplaceSortOrder === "asc" ? "Z to A" : "A to Z"}`}
                >
                    <span>Marketplace</span>
                    <span className="inline-flex items-center gap-0.5 text-[10px]">
                        <span className={marketplaceSortOrder === "asc" ? "text-gray-900" : "text-gray-400"}>↑</span>
                        <span className={marketplaceSortOrder === "desc" ? "text-gray-900" : "text-gray-400"}>↓</span>
                    </span>
                </button>
            ),
            className: "!items-start min-w-[180px] max-w-[180px]",
            headerClassName: "min-w-[180px] max-w-[180px]",
            render: (row) => (
                <div className="flex items-center min-h-[3rem] py-1">
                    <span className="text-gray-700 text-[13px] truncate">
                        {row.tenantChannel?.marketplace || "—"}
                    </span>
                </div>
            )
        },
        {
            key: "product",
            label: "Product",
            className: "!items-start",
            render: (row) => {
                // Multi-product support with stacked layout
                if (row.items && row.items.length > 0) {
                    const isExpanded = expandedOrderIds.has(row.id);
                    const visibleItems = isExpanded ? row.items : row.items.slice(0, 3);
                    const remaining = row.items.length - visibleItems.length;

                    return (
                        <div className="flex flex-col w-full">
                            {visibleItems.map((item, idx) => {
                                // RESOLVE PRODUCT INFO
                                const listing = item.channelListing;
                                const product = listing?.product || listing?.productVariant?.product || item.product;
                                const variant = listing?.productVariant || item.productVariant;
                                const name = item.productDescription || listing?.productName || product?.name || "Product";
                                const rawImages = product?.images || [];
                                let displayImages = [];

                                if (variant?.id && rawImages.length > 0) {
                                    // 1. Variant Specific
                                    const vImages = rawImages.filter(img => img.url && img.url.includes(variant.id));
                                    if (vImages.length > 0) displayImages = vImages;
                                }

                                if (displayImages.length === 0 && rawImages.length > 0) {
                                    // 2. Parent Only (fallback)
                                    // Logic: Parent images typically look like .../uploads/<tenant>/<file> (2 parts)
                                    // Variant images look like .../uploads/<tenant>/<variant>/<file> (3 parts)
                                    displayImages = rawImages.filter(img => {
                                        const u = img.url || "";
                                        if (!u.includes('/uploads/')) return true; // keep legacy/external
                                        const parts = u.split('/uploads/')[1]?.split('/') || [];
                                        return parts.length === 2;
                                    });
                                }

                                const images = displayImages.map(img => ({
                                    url: img.url,
                                    alt: name,
                                    productName: name
                                }));

                                const variantParts = [];
                                if (variant?.size?.name) variantParts.push(variant.size.name);
                                else if (variant?.sizeText) variantParts.push(variant.sizeText);

                                if (variant?.color?.name) variantParts.push(variant.color.name);
                                else if (variant?.colorText) variantParts.push(variant.colorText);

                                const variantInfo = variantParts.join(" · ");

                                return (
                                    <div key={idx} className="flex items-center gap-3 min-h-[3rem] py-1 border-b border-gray-100 last:border-0 w-full text-left">
                                        {/* Thumbnail */}
                                        <div className="flex-shrink-0">
                                            <ImageGallery
                                                images={images}
                                                absImg={absImg}
                                                placeholder={IMG_PLACEHOLDER}
                                                compact={true}
                                                className="h-8 w-8"
                                                thumbnailClassName="h-10 w-10 bg-white"
                                                badgeContent={(Number(item.quantity) || 0) > 1 ? item.quantity : null}
                                            />
                                        </div>
                                        {/* Text */}
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <span className="text-gray-900 text-[13px] truncate" title={name}>
                                                {name}
                                            </span>
                                            {variantInfo && (
                                                <span className="text-[11px] text-gray-400 truncate">
                                                    {variantInfo}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Expand/Collapse Button */}
                            {row.items.length > 3 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleExpand(row.id); }}
                                    className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline text-left mt-1 mb-1 focus:outline-none"
                                >
                                    {isExpanded ? "Collapse" : `View ${remaining} more items...`}
                                </button>
                            )}
                        </div>
                    );
                }

                // Legacy Fallback
                const rawImages = row.product?.images || [];
                let displayImages = [];
                const itemVariant = row.productVariant;

                if (itemVariant?.id && rawImages.length > 0) {
                    const vImages = rawImages.filter(img => img.url && img.url.includes(itemVariant.id));
                    if (vImages.length > 0) displayImages = vImages;
                }

                if (displayImages.length === 0 && rawImages.length > 0) {
                    displayImages = rawImages.filter(img => {
                        const u = img.url || "";
                        if (!u.includes('/uploads/')) return true;
                        const parts = u.split('/uploads/')[1]?.split('/') || [];
                        return parts.length === 2;
                    });
                }

                const images = displayImages.map(img => ({
                    url: img.url,
                    alt: row.productDescription,
                    productName: row.productDescription
                }));
                const productName = row.product?.name || row.productVariant?.sku || row.productDescription || "—";
                const variantInfo = row.productVariant?.sizeText || row.productVariant?.colorText
                    ? [row.productVariant?.sizeText, row.productVariant?.colorText].filter(Boolean).join(" · ")
                    : null;

                return (
                    <div className="flex items-center gap-3 w-full min-w-0 min-h-[3rem] py-1">
                        <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <ImageGallery
                                images={images}
                                absImg={absImg}
                                placeholder={IMG_PLACEHOLDER}
                                compact={true}
                                className="h-8 w-8"
                                thumbnailClassName="h-8 w-8 bg-white"
                                badgeContent={(Number(row.quantity) || 0) > 1 ? row.quantity : null}
                            />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-gray-900 text-[13px] truncate" title={productName}>
                                {productName}
                            </span>
                            {(variantInfo) && (
                                <span className="text-[11px] text-gray-500">
                                    {variantInfo}
                                </span>
                            )}
                        </div>
                    </div>
                );
            }
        },
        {
            key: "qty",
            label: "Qty",
            className: "!items-start justify-center text-center",
            headerClassName: "justify-center",
            render: (row) => {
                if (row.items && row.items.length > 0) {
                    const isExpanded = expandedOrderIds.has(row.id);
                    const visibleItems = isExpanded ? row.items : row.items.slice(0, 3);

                    return (
                        <div className="flex flex-col w-full items-center">
                            {visibleItems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-center w-full min-h-[3rem] py-1 border-b border-gray-100 last:border-0 text-gray-900 text-[13px] text-center">
                                    {item.quantity}
                                </div>
                            ))}
                            {/* Spacer to align with button in product column */}
                            {row.items.length > 3 && <div className="h-[24px] mt-1 mb-1" />}
                        </div>
                    );
                }
                return (
                    <div className="flex items-center justify-center w-full min-h-[3rem] py-1 text-gray-800 text-[13px] text-center">
                        {row.quantity}
                    </div>
                );
            }
        },

        {
            key: "unitCost",
            label: "Unit C. Price",
            className: "!items-start justify-center text-center",
            headerClassName: "justify-center",
            render: (row) => {
                if (row.items && row.items.length > 0) {
                    const isExpanded = expandedOrderIds.has(row.id);
                    const visibleItems = isExpanded ? row.items : row.items.slice(0, 3);

                    return (
                        <div className="flex flex-col w-full items-center">
                            {visibleItems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-center w-full min-h-[3rem] py-1 border-b border-gray-100 last:border-0 text-gray-500 text-[13px] text-center">
                                    {item.unitCost !== undefined ? Number(item.unitCost).toFixed(2) : "—"}
                                </div>
                            ))}
                            {/* Spacer to align with button in product column */}
                            {row.items.length > 3 && <div className="h-[24px] mt-1 mb-1" />}
                        </div>
                    );
                }
                return (
                    <div className="flex items-center justify-center w-full min-h-[3rem] py-1 text-gray-500 text-[13px] text-center">
                        {row.unitCost !== undefined ? Number(row.unitCost).toFixed(2) : "—"}
                    </div>
                );
            }
        },

        {
            key: "totalCost",
            label: "Total P. Price",
            className: "!items-start justify-center text-center",
            headerClassName: "justify-center",
            render: (row) => {
                if (row.items && row.items.length > 0) {
                    const isExpanded = expandedOrderIds.has(row.id);
                    const visibleItems = isExpanded ? row.items : row.items.slice(0, 3);

                    return (
                        <div className="flex flex-col w-full items-center">
                            {visibleItems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-center w-full min-h-[3rem] py-1 border-b border-gray-100 last:border-0 text-gray-500 text-[13px] text-center">
                                    {item.totalCost !== undefined ? Number(item.totalCost).toFixed(2) : "—"}
                                </div>
                            ))}
                            {/* Spacer to align with button in product column */}
                            {row.items.length > 3 && <div className="h-[24px] mt-1 mb-1" />}
                        </div>
                    );
                }
                return (
                    <div className="flex items-center justify-center w-full min-h-[3rem] py-1 text-gray-500 text-[13px] text-center">
                        {row.totalCost !== undefined ? Number(row.totalCost).toFixed(2) : "—"}
                    </div>
                );
            }
        },
        {
            key: "totalAmount",
            label: "S. Price",
            className: "!items-start justify-center text-center",
            headerClassName: "justify-center",
            render: (row) => {
                if (row.items && row.items.length > 0) {
                    const isExpanded = expandedOrderIds.has(row.id);
                    const visibleItems = isExpanded ? row.items : row.items.slice(0, 3);

                    return (
                        <div className="flex flex-col w-full items-center">
                            {visibleItems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-center w-full min-h-[3rem] py-1 border-b border-gray-100 last:border-0 text-gray-900 text-[13px] text-center">
                                    {item.totalAmount !== undefined ? Number(item.totalAmount).toFixed(2) : "—"}
                                </div>
                            ))}
                            {/* Spacer to align with button in product column */}
                            {row.items.length > 3 && <div className="h-[24px] mt-1 mb-1" />}
                        </div>
                    );
                }
                return (
                    <div className="flex items-center justify-center w-full min-h-[3rem] py-1 text-gray-900 text-[13px] text-center">
                        {row.totalAmount !== undefined ? Number(row.totalAmount).toFixed(2) : "—"}
                    </div>
                );
            }
        },
        {
            key: "shippingCharges",
            label: "Shipping",
            className: "!items-start justify-center text-center",
            headerClassName: "justify-center",
            render: (row) => (
                <div className="flex items-center justify-center w-full min-h-[3rem] py-1 text-gray-700 text-[13px] text-center">
                    {row.shippingCharges ? Number(row.shippingCharges).toFixed(2) : "—"}
                </div>
            )
        },
        // {
        //     key: "tax",
        //     label: "Tax",
        //     className: "!items-start",
        //     render: (row) => (
        //         <div className="flex items-center min-h-[3rem] py-1 text-gray-700 text-[13px]">
        //             {row.tax ? Number(row.tax).toFixed(2) : "—"}
        //         </div>
        //     )
        // },
        // {
        //     key: "otherCharges",
        //     label: "Other",
        //     className: "!items-start",
        //     render: (row) => (
        //         <div className="flex items-center min-h-[3rem] py-1 text-gray-700 text-[13px]">
        //             {row.otherCharges ? Number(row.otherCharges).toFixed(2) : "—"}
        //         </div>
        //     )
        // },
        {
            key: "netProfit",
            label: "Profit",
            className: "!items-start justify-center text-center",
            headerClassName: "justify-center",
            render: (row) => {
                let val = 0;
                // Frontend Calculation: (Sum(Item Sales) - Sum(Item Cost)) - Charges
                if (row.items && row.items.length > 0) {
                    const itemsRev = row.items.reduce((acc, i) => acc + (parseFloat(i.totalAmount) || 0), 0);
                    const itemsCost = row.items.reduce((acc, i) => acc + (parseFloat(i.totalCost) || 0), 0);
                    const charges = (parseFloat(row.shippingCharges) || 0) + (parseFloat(row.tax) || 0) + (parseFloat(row.otherCharges) || 0);
                    val = itemsRev - itemsCost - charges;
                } else {
                    // Fallback for orders without items loaded or legacy
                    val = row.netProfit !== undefined ? Number(row.netProfit) : 0;
                }

                return (
                    <div className={`flex items-center justify-center w-full min-h-[3rem] py-1 text-[13px] text-center ${val >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                        {val.toFixed(2)}
                    </div>
                );
            }
        },
        {
            key: "courier",
            label: "Courier",
            className: "!items-start",
            render: (row) => (
                <div className="flex items-center min-h-[3rem] py-1 text-gray-800 text-[13px]">
                    {row.courierMedium?.shortName || row.courierMedium?.fullName || "—"}
                </div>
            )
        },
        {
            key: "trackingId",
            label: "Tracking ID",
            className: "!items-start",
            render: (row) => (
                <div className="flex items-center gap-1 min-h-[3rem] py-1">
                    <span className="text-[11px] text-blue-600 truncate" title={row.trackingId}>
                        {row.trackingId || "—"}
                    </span>
                    {row.trackingId && <CopyButton text={row.trackingId} />}
                </div>
            )
        },
        {
            key: "status",
            label: "Status",
            className: "!items-start",
            render: (row) => (
                <div className="flex flex-col items-start justify-center gap-1 min-h-[3rem] py-1">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${row.status === 'DELIVERED'
                        ? "bg-emerald-100 text-emerald-700"
                        : row.status === 'CANCEL' || row.status === 'RETURN' || row.status === 'REFUND'
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                        {row.status?.replace(/_/g, " ")}
                    </span>
                    {/* Settled Chip */}
                    {row.is_settled ? (
                        <button
                            disabled={!canUpdate}
                            onClick={(e) => {
                                if (!canUpdate) return;
                                e.stopPropagation();
                                setSettleTarget(row);
                                setConfirmSettleOpen(true);
                            }}
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border transition-colors ${canUpdate ? "cursor-pointer hover:bg-emerald-200" : ""} bg-emerald-100 text-emerald-700 border-emerald-200`}
                        >
                            Settled
                        </button>
                    ) : (
                        canUpdate && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setSettleTarget(row); setConfirmSettleOpen(true); }}
                                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition-colors"
                            >
                                Unsettled
                            </button>
                        )
                    )}
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
            headerClassName: "sticky right-0 z-20 !bg-gray-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] justify-center pl-4 w-[220px]",
            className: "sticky right-0 z-10 !bg-white group-hover:!bg-gray-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] h-full flex items-center justify-start pl-4 w-[220px]",
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
                    {/* Upload Label Action - PENDING */}
                    {(row.status === 'PENDING' || row.status === 'Pending') && canUpdate && (
                        <Button
                            variant="secondary"
                            size="xs"
                            className="rounded-md text-blue-600 hover:bg-blue-50"
                            title="Upload Label"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleUploadClick(row.id);
                            }}
                        >
                            <Upload size={14} />
                        </Button>
                    )}
                    {/* Download Label Action */}
                    {row.label && (
                        <Button
                            variant="secondary"
                            size="xs"
                            className="rounded-md text-gray-600 hover:bg-gray-100"
                            title="Download/Print Label"
                            onClick={async (e) => {
                                e.stopPropagation();

                                // 1. Download Label (Force Download)
                                try {
                                    const fileUrl = absImg(row.label);
                                    const response = await fetch(fileUrl);
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);

                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = row.label.split('/').pop() || 'label.pdf';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(url);
                                } catch (e) {
                                    console.error("Download failed, falling back to new tab", e);
                                    window.open(absImg(row.label), '_blank');
                                }

                                // 2. Auto-status update if needed
                                if (row.status === 'LABEL_UPLOADED') {
                                    try {
                                        await updateMut.mutateAsync({
                                            id: row.id,
                                            payload: { status: 'LABEL_PRINTED' }
                                        });
                                        toast.success("Order marked as Printed");
                                    } catch (e) {
                                        console.error("Auto-status update failed", e);
                                    }
                                }
                            }}
                        >
                            <Printer size={14} />
                        </Button>
                    )}
                    {/* Pack Action */}
                    {row.status === 'LABEL_PRINTED' && canUpdate && (
                        <Button
                            variant="secondary"
                            size="xs"
                            className="rounded-md text-amber-600 hover:bg-amber-50"
                            title="Mark as Packed"
                            onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                    await updateMut.mutateAsync({
                                        id: row.id,
                                        payload: { status: 'PACKED' }
                                    });
                                    toast.success("Order marked as Packed");
                                } catch (err) {
                                    toast.error("Failed to update status");
                                }
                            }}
                        >
                            <Package size={14} />
                        </Button>
                    )}
                    {/* Ship Action */}
                    {row.status === 'PACKED' && canUpdate && (
                        <Button
                            variant="secondary"
                            size="xs"
                            className="rounded-md text-emerald-600 hover:bg-emerald-50"
                            title="Mark as Shipped"
                            onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                    await updateMut.mutateAsync({
                                        id: row.id,
                                        payload: { status: 'SHIPPED' }
                                    });
                                    toast.success("Order marked as Shipped");
                                } catch (err) {
                                    toast.error("Failed to update status");
                                }
                            }}
                        >
                            <Truck size={14} />
                        </Button>
                    )}
                    {/* Deliver Action */}
                    {row.status === 'SHIPPED' && canUpdate && (
                        <Button
                            variant="secondary"
                            size="xs"
                            className="rounded-md text-emerald-700 hover:bg-emerald-100"
                            title="Mark as Delivered"
                            onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                    await updateMut.mutateAsync({
                                        id: row.id,
                                        payload: { status: 'DELIVERED' }
                                    });
                                    toast.success("Order marked as Delivered");
                                } catch (err) {
                                    toast.error("Failed to update status");
                                }
                            }}
                        >
                            <CheckCircle size={14} />
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
        setSettledFilter(newFilters.settled || { id: "all", name: "All" });

        const statusId = newFilters.status.id;
        if (statusId === "ALL") navigate("/orders");
        else navigate(`/orders?status=${statusId}`);
    };

    // Export Logic
    const [isExporting, setIsExporting] = useState(false);
    const handleExport = async () => {
        try {
            setIsExporting(true);
            const params = {
                search: debouncedSearch,
                status: statusFilter.id === "ALL" ? undefined : statusFilter.id,
                startDate: dateRange?.from ? new Date(dateRange.from).toISOString() : undefined,
                endDate: dateRange?.to ? new Date(dateRange.to).toISOString() : undefined,
                mediumId: channelFilter.id,
                courierId: courierFilter.id,
                page: 1,
                perPage: 1000 // reasonable limit for frontend export
            };
            const response = await listOrders(params);
            const dataToExport = response.rows || [];

            if (dataToExport.length === 0) {
                toast.error("No orders to export.");
                return;
            }

            // Generate CSV to match UI columns
            const headers = [
                "Date",
                "Order ID",
                "Marketplace",
                "Product",
                "Qty",
                "Unit C. Price",
                "S. Price",
                "Total P. Price",
                "Shipping",
                "Tax",
                "Other",
                "Profit",
                "Courier",
                "Tracking ID",
                "Status"
            ];

            const csvRows = [headers.join(",")];

            dataToExport.forEach(order => {
                // Helper to quote string for CSV (escapes quotes and handles newlines)
                const q = (str) => `"${String(str || "").replace(/"/g, '""')}"`;

                // If order has items, generate one row per item
                if (order.items && order.items.length > 0) {
                    order.items.forEach((item, idx) => {
                        const name = item.productDescription || item.product?.name || "Product";
                        const variant = item.productVariant?.sizeText || item.productVariant?.sku || "";
                        const productName = variant ? `${name} (${variant})` : name;
                        const isFirst = idx === 0;

                        const row = [
                            q(isFirst ? formatDateCSV(order.date) : ""),
                            q(isFirst ? order.orderId : ""),
                            q(isFirst ? order.tenantChannel?.marketplace : ""),
                            q(productName),
                            q(item.quantity),
                            q(item.unitCost !== undefined ? Number(item.unitCost).toFixed(2) : "—"),
                            q(item.totalAmount !== undefined ? Number(item.totalAmount).toFixed(2) : "—"),
                            q(item.totalCost !== undefined ? Number(item.totalCost).toFixed(2) : "—"),
                            q(isFirst ? (order.shippingCharges || "0.00") : ""),
                            q(isFirst ? (order.tax || "0.00") : ""),
                            q(isFirst ? (order.otherCharges || "0.00") : ""),
                            q(isFirst ? (order.netProfit ? Number(order.netProfit).toFixed(2) : "0.00") : ""),
                            q(isFirst ? (order.courierMedium?.shortName || order.courierMedium?.fullName) : ""),
                            q(isFirst ? order.trackingId : ""),
                            q(isFirst ? order.status : "")
                        ];
                        csvRows.push(row.join(","));
                    });
                } else {
                    // Fallback for orders without items (legacy)
                    const row = [
                        q(formatDateCSV(order.date)),
                        q(order.orderId),
                        q(order.tenantChannel?.marketplace),
                        q(order.productDescription || "—"),
                        q(order.quantity),
                        q(order.unitCost || "—"),
                        q(order.totalAmount || "—"),
                        q(order.totalCost || "—"),
                        q(order.shippingCharges || "0.00"),
                        q(order.tax || "0.00"),
                        q(order.otherCharges || "0.00"),
                        q(order.netProfit ? Number(order.netProfit).toFixed(2) : "0.00"),
                        q(order.courierMedium?.shortName || order.courierMedium?.fullName),
                        q(order.trackingId),
                        q(order.status)
                    ];
                    csvRows.push(row.join(","));
                }
            });

            const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Export failed", error);
            toast.error("Failed to export orders.");
        } finally {
            setIsExporting(false);
        }
    };

    const toolbar = (
        <div className="flex items-center gap-3 w-full">
            <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="h-9 w-[240px] rounded-lg border border-gray-300 pl-9 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all"
                />
            </div>

            {/* <div className="h-6 w-px bg-gray-200" /> Removed DatePicker separator */}

            <OrdersFilter
                filters={{
                    status: statusFilter,
                    medium: channelFilter,
                    courier: courierFilter,
                    remark: remarkFilter,
                    dateRange,
                    settled: settledFilter
                }}
                options={{
                    statusOptions,
                    mediumOptions: channelOptions,
                    courierOptions,
                    remarkOptions
                }}
                onApply={handleFilterApply}
                statusReadOnly={!!statusParam} // Read-only if specific status page
            />

            {(statusFilter.id !== "ALL" || channelFilter.id || courierFilter.id || remarkFilter.id || dateRange || settledFilter.id !== "all") && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <span className="text-xs font-medium text-gray-500">Applied:</span>

                    {statusFilter.id !== "ALL" && (
                        <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-200">
                            {statusFilter.name}
                            <button onClick={() => setStatusFilter(statusOptions[0])} className="hover:text-red-500"><X size={10} /></button>
                        </div>
                    )}
                    {settledFilter.id !== "all" && (
                        <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-200">
                            {settledFilter.name}
                            <button onClick={() => setSettledFilter({ id: "all", name: "All" })} className="hover:text-red-500"><X size={10} /></button>
                        </div>
                    )}

                    {dateRange && (
                        <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-200 whitespace-nowrap">
                            {new Date(dateRange.from).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            {dateRange.to && ` - ${new Date(dateRange.to).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                            <button onClick={() => setDateRange(undefined)} className="hover:text-red-500"><X size={10} /></button>
                        </div>
                    )}

                    {channelFilter.id && (
                        <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-200 whitespace-nowrap">
                            {channelFilter.name}
                            <button onClick={() => setChannelFilter(channelOptions[0])} className="hover:text-red-500"><X size={10} /></button>
                        </div>
                    )}

                    {courierFilter.id && (
                        <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-200 whitespace-nowrap">
                            {courierFilter.name}
                            <button onClick={() => setCourierFilter(courierOptions[0])} className="hover:text-red-500"><X size={10} /></button>
                        </div>
                    )}

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
                            search: "",
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

            <div className="flex-1" />

            <Button variant="secondary" onClick={handleExport} disabled={isExporting}>
                <Download size={16} className="mr-2" />
                {isExporting ? "Exporting..." : "Export"}
            </Button>

            {statusFilter.id === "ALL" && canCreate && (
                <Button variant="warning" onClick={() => openModal()}>
                    <Plus size={16} className="mr-1.5" /> Add Order
                </Button>
            )}
        </div>
    );

    return (
        <div className="w-full max-w-full min-w-0">
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
                rows={sortedOrders}
                isLoading={isLoading}
                toolbar={toolbar}
                gridCols="grid-cols-[40px_minmax(100px,0.7fr)_minmax(130px,0.9fr)_minmax(110px,0.7fr)_minmax(240px,1.4fr)_minmax(90px,0.5fr)_minmax(90px,0.6fr)_minmax(90px,0.6fr)_minmax(90px,0.6fr)_minmax(90px,0.5fr)_minmax(90px,0.6fr)_minmax(100px,0.8fr)_minmax(140px,1fr)_minmax(120px,0.9fr)_160px]"
                rowClassName={(row) => row.id === highlightOrderId ? "bg-amber-100 transition-colors duration-1000" : ""}
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
                    <div className="flex items-center gap-4">
                        <div className="w-[120px]">
                            <SelectCompact
                                value={perPage}
                                onChange={(val) => {
                                    setPerPage(Number(val));
                                    setPage(1);
                                }}
                                options={[
                                    { value: 25, label: "25 / page" },
                                    { value: 50, label: "50 / page" },
                                    { value: 75, label: "75 / page" },
                                    { value: 100, label: "100 / page" }
                                ]}
                                addNewLabel={null}
                            />
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
                </div>
            )}

            {/* Bulk Actions Toolbar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg z-50 flex items-center gap-4 animate-in slide-in-from-bottom-5">
                    <span className="text-sm font-medium">{selectedIds.size} selected</span>
                    <div className="h-4 w-px bg-gray-700" />
                    <button
                        onClick={() => setBulkStatusModalOpen(true)}
                        className="text-sm hover:text-blue-300 font-medium transition-colors"
                    >
                        Change Status
                    </button>
                    <div className="h-4 w-px bg-gray-700" />
                    <button
                        onClick={handleBulkDownloadLabels}
                        className="text-sm hover:text-blue-300 font-medium transition-colors flex items-center gap-2"
                    >
                        <Printer size={16} /> <span>Download Labels</span>
                    </button>

                    {/* Mark Packed - Only in LABEL_PRINTED */}
                    {statusFilter.id === 'LABEL_PRINTED' && (
                        <>
                            <div className="h-4 w-px bg-gray-700" />
                            <button
                                onClick={async () => {
                                    if (selectedIds.size === 0) return;
                                    try {
                                        await bulkUpdateMut.mutateAsync({
                                            ids: Array.from(selectedIds),
                                            status: 'PACKED'
                                        });
                                        toast.success("Orders marked as Packed");
                                        setSelectedIds(new Set());
                                    } catch (err) {
                                        toast.error("Failed to update orders");
                                    }
                                }}
                                className="text-sm hover:text-amber-300 font-medium transition-colors flex items-center gap-2"
                            >
                                <Package size={16} /> <span>Mark Packed</span>
                            </button>
                        </>
                    )}

                    {/* Mark Shipped - Only in PACKED */}
                    {statusFilter.id === 'PACKED' && (
                        <>
                            <div className="h-4 w-px bg-gray-700" />
                            <button
                                onClick={async () => {
                                    if (selectedIds.size === 0) return;
                                    try {
                                        await bulkUpdateMut.mutateAsync({
                                            ids: Array.from(selectedIds),
                                            status: 'SHIPPED'
                                        });
                                        toast.success("Orders marked as Shipped");
                                        setSelectedIds(new Set());
                                    } catch (err) {
                                        toast.error("Failed to update orders");
                                    }
                                }}
                                className="text-sm hover:text-emerald-300 font-medium transition-colors flex items-center gap-2"
                            >
                                <Truck size={16} /> <span>Mark Shipped</span>
                            </button>
                        </>
                    )}

                    {/* Mark Delivered - Only in SHIPPED */}
                    {statusFilter.id === 'SHIPPED' && (
                        <>
                            <div className="h-4 w-px bg-gray-700" />
                            <button
                                onClick={async () => {
                                    if (selectedIds.size === 0) return;
                                    try {
                                        await bulkUpdateMut.mutateAsync({
                                            ids: Array.from(selectedIds),
                                            status: 'DELIVERED'
                                        });
                                        toast.success("Orders marked as Delivered");
                                        setSelectedIds(new Set());
                                    } catch (err) {
                                        toast.error("Failed to update orders");
                                    }
                                }}
                                className="text-sm hover:text-emerald-400 font-medium transition-colors flex items-center gap-2"
                            >
                                <CheckCircle size={16} /> <span>Mark Delivered</span>
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="p-1 hover:bg-gray-800 rounded-full ml-2"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            <Modal
                open={bulkStatusModalOpen}
                onClose={() => setBulkStatusModalOpen(false)}
                title="Bulk Update Status"
                widthClass="max-w-sm"
            >
                <div className="py-2">
                    <p className="text-sm text-gray-600 mb-4">
                        Update status for {selectedIds.size} orders.
                    </p>
                    <label className="block text-xs font-medium text-gray-700 mb-1">New Status</label>
                    <SelectCompact
                        value={bulkStatus}
                        onChange={setBulkStatus}
                        options={statusOptions.filter(o => o.id !== 'ALL').map(o => ({ value: o.id, label: o.name }))}
                        addNewLabel={null}
                    />
                    <div className="mt-6 flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setBulkStatusModalOpen(false)}>Cancel</Button>
                        <Button variant="warning" onClick={handleBulkUpdate} isLoading={bulkUpdateMut.isPending}>
                            Update
                        </Button>
                    </div>
                </div>
            </Modal>

            <OrderModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                editing={editing}
                onSuccess={handleOrderSaved}
            />

            <AnimatedAlert
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                type="error"
                title="Delete Order?"
                message={`Are you sure you want to delete order "${target?.orderId}"? This action cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={handleDelete}
                showCancel={true}
                cancelLabel="Cancel"
            />

            <AnimatedAlert
                open={deleteSuccessOpen}
                onClose={() => setDeleteSuccessOpen(false)}
                type="success"
                title="Order Deleted"
                message="The order has been successfully removed."
                confirmLabel="OK"
            />

            <ViewOrderModal
                open={viewOpen}
                onClose={() => setViewOpen(false)}
                order={viewOrder}
            />

            <AnimatedAlert
                open={confirmSettleOpen}
                onClose={() => setConfirmSettleOpen(false)}
                onConfirm={handleSettleConfirm}
                type="info"
                title="Settle Order"
                message={`Are you sure you want to mark order ${settleTarget?.orderId || ""} as ${settleTarget?.is_settled ? "unsettled" : "settled"}?` + (settleTarget?.is_settled ? "" : " This action cannot be undone.")}
                confirmLabel="Confirm"
                showCancel={true}
                cancelLabel="Cancel"
            />

            <AnimatedAlert
                open={settleSuccessOpen}
                onClose={() => setSettleSuccessOpen(false)}
                type="success"
                title="Order Settled"
                message="The order has been successfully marked as settled."
                confirmLabel="Done"
            />

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="application/pdf"
                onChange={handleFileChange}
            />
        </div >
    );
}
