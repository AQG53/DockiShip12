import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import { Package, Plus, Trash2, Search, Copy, Check, X, Download, Printer, Truck, CheckCircle, Upload, RotateCcw, Eye, Pencil } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { DataTable } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { ActionMenu } from "../../../components/ui/ActionMenu";
import OrdersFilter from "../components/OrdersFilter"; // New Filter Component
import { ConfirmModal } from "../../../components/ConfirmModal";
import OrderModal from "../components/OrderModal";
import ViewOrderModal from "../components/ViewOrderModal";
import ReturnOrderModal from "../components/ReturnOrderModal";
import BulkReturnModal from "../components/BulkReturnModal";
import { useOrders, useDeleteOrder, useUpdateOrder, useBulkUpdateOrder, useUploadOrderLabel } from "../hooks/useOrders";
import SelectCompact from "../../../components/SelectCompact"; // Ensure imported
import { Modal } from "../../../components/ui/Modal";
import { useSearchMarketplaceChannels } from "../../../hooks/useProducts";
import { useCourierMediums } from "../../settings/hooks/useCourierMediums";
import { useRemarkTypes } from "../../settings/hooks/useRemarkTypes";
import useUserPermissions from "../../auth/hooks/useUserPermissions";
import toast from "react-hot-toast";
import ImageGallery from "../../../components/ImageGallery";
import {
    listOrders,
    listOrdersByTracking,
    getOrderSummary,
    downloadBulkLabels,
    checkOrderLabelNameExists,
    getPrintableOrderLabel,
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

const isImagePath = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return false;
    return raw.includes("/uploads/") || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(raw);
};

const resolveOrderProductImages = ({ listing, product, variant, name }) => {
    const listingImage = String(listing?.url || listing?.imageUrl || "").trim();

    const rawImages = Array.isArray(product?.images) ? product.images : [];
    const toGalleryRows = (rows) =>
        rows
            .filter((img) => isImagePath(img?.url))
            .map((img) => ({
                url: img.url,
                alt: name,
                productName: name,
            }));

    if (isImagePath(listingImage)) {
        return [
            {
                url: listingImage,
                alt: name,
                productName: name,
            },
        ];
    }

    if (variant?.id) {
        const variantEntityImages = Array.isArray(variant?.images)
            ? toGalleryRows(variant.images)
            : [];
        if (variantEntityImages.length > 0) return variantEntityImages;

        const variantImagesFromProduct = toGalleryRows(
            rawImages.filter((img) => img?.url && String(img.url).includes(String(variant.id))),
        );
        if (variantImagesFromProduct.length > 0) return variantImagesFromProduct;
    }

    // Parent product image fallback.
    const productImages = rawImages.filter((img) => {
        const u = img?.url || "";
        if (!u.includes("/uploads/")) return true;
        const parts = u.split("/uploads/")[1]?.split("/") || [];
        return parts.length === 2;
    });

    const productImageRows = toGalleryRows(productImages);
    if (productImageRows.length > 0) return productImageRows;

    // Last safety fallback: any product image path.
    return toGalleryRows(rawImages);
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

const toAmount = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const getCurrentMonthRange = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
};

const formatAsDateOnlyParam = (date) => {
    if (!date) return undefined;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return undefined;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const formatMoney = (value) => {
    return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(toAmount(value));
};

const PRODUCT_SUMMARY_STATUSES = new Set(["PENDING", "LABEL_UPLOADED", "LABEL_PRINTED", "PACKED"]);

const normalizeSummaryText = (value) => {
    const text = String(value ?? "").trim();
    return text || "—";
};

const getVariantSummaryLabel = (variant) => {
    if (!variant) return "—";
    const color = String(variant?.colorText || "").trim();
    const size = String(variant?.size?.name || variant?.sizeText || "").trim();
    const parts = [color, size].filter(Boolean);
    return parts.length > 0 ? parts.join(" + ") : "—";
};

const getOrderItemSummaryEntities = (item) => {
    const listing = item?.channelListing || null;
    const variant = listing?.productVariant || item?.productVariant || null;
    const product = listing?.product || variant?.product || item?.product || null;
    return { listing, variant, product };
};

const getOrderItemSummaryProductName = (item, entities = null) => {
    const resolved = entities || getOrderItemSummaryEntities(item);
    return normalizeSummaryText(
        item?.productDescription ||
        resolved?.listing?.productName ||
        resolved?.product?.name ||
        resolved?.variant?.product?.name
    );
};

const getOrderItemSummaryQty = (item) => {
    const qty = Number(item?.quantity || 0);
    if (!Number.isFinite(qty) || qty <= 0) return 0;
    const listingUnits = Number(item?.channelListing?.units);
    const units = Number.isFinite(listingUnits) && listingUnits > 0 ? listingUnits : 1;
    return qty * units;
};

const mergeSummaryImages = (existing = [], incoming = [], fallbackName = "Product") => {
    const merged = [];
    const seen = new Set();

    [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])].forEach((image) => {
        const url = String(image?.url || "").trim();
        if (!url || seen.has(url)) return;
        seen.add(url);
        merged.push({
            ...image,
            url,
            alt: image?.alt || fallbackName,
            productName: image?.productName || fallbackName,
        });
    });

    return merged;
};

const buildOrderProductSummaryRows = (orders) => {
    const map = new Map();
    const upsert = ({ groupKey, groupName, productName, variant, qty, images }) => {
        if (!Number.isFinite(qty) || qty <= 0) return;
        const key = String(groupKey).toLowerCase();
        const normalizedVariant = String(variant || "—").trim() || "—";
        const displayName = normalizeSummaryText(groupName || productName);
        const prev = map.get(key);
        if (prev) {
            prev.qty += qty;
            prev.images = mergeSummaryImages(prev.images, images, displayName);
            const prevVariant = prev.variantMap.get(normalizedVariant);
            if (prevVariant) prevVariant.qty += qty;
            else prev.variantMap.set(normalizedVariant, { label: normalizedVariant, qty });
            return;
        }
        map.set(key, {
            groupKey,
            groupName: displayName,
            productName: displayName,
            qty,
            images: mergeSummaryImages([], images, displayName),
            variantMap: new Map([[normalizedVariant, { label: normalizedVariant, qty }]]),
        });
    };

    (Array.isArray(orders) ? orders : []).forEach((order) => {
        if (Array.isArray(order?.items) && order.items.length > 0) {
            order.items.forEach((item) => {
                const entities = getOrderItemSummaryEntities(item);
                const productName = getOrderItemSummaryProductName(item, entities);
                const variant = getVariantSummaryLabel(entities?.variant);
                const groupKey = String(entities?.product?.id || productName).toLowerCase();
                const groupName = normalizeSummaryText(entities?.product?.name || productName);
                const images = resolveOrderProductImages({
                    listing: entities?.listing,
                    product: entities?.product,
                    variant: entities?.variant,
                    name: productName,
                });
                upsert({
                    groupKey,
                    groupName,
                    productName,
                    variant,
                    qty: getOrderItemSummaryQty(item),
                    images,
                });
            });
            return;
        }

        // Legacy fallback for older rows without `items`.
        const legacyQty = Number(order?.quantity || 0);
        if (!Number.isFinite(legacyQty) || legacyQty <= 0) return;
        const legacyListing = order?.channelListing || null;
        const legacyVariant = legacyListing?.productVariant || order?.productVariant || null;
        const legacyProduct = legacyListing?.product || legacyVariant?.product || order?.product || null;
        const productName = normalizeSummaryText(
            order?.productDescription ||
            legacyListing?.productName ||
            legacyProduct?.name ||
            order?.product?.name
        );
        const variant = getVariantSummaryLabel(legacyVariant);
        const groupKey = String(legacyProduct?.id || productName).toLowerCase();
        const groupName = normalizeSummaryText(legacyProduct?.name || productName);
        const images = resolveOrderProductImages({
            listing: legacyListing,
            product: legacyProduct,
            variant: legacyVariant,
            name: productName,
        });
        upsert({
            groupKey,
            groupName,
            productName,
            variant,
            qty: legacyQty,
            images,
        });
    });

    return Array.from(map.values()).map((row) => ({
        ...row,
        variants: Array.from(row.variantMap.values()).sort((a, b) =>
            String(a.label).localeCompare(String(b.label), undefined, { sensitivity: "base", numeric: true }),
        ),
    })).sort((a, b) => {
        const groupCmp = String(a.groupName).localeCompare(String(b.groupName), undefined, { sensitivity: "base", numeric: true });
        if (groupCmp !== 0) return groupCmp;
        return String(a.productName).localeCompare(String(b.productName), undefined, { sensitivity: "base", numeric: true });
    });
};

const formatSummaryQty = (qty) => (
    Number.isInteger(qty) ? String(qty) : Number(qty).toFixed(2)
);

const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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
    const [dateTypeFilter] = useState({ id: "order", name: "Order Date" });
    const defaultDateRange = useMemo(() => getCurrentMonthRange(), []);

    // Date Range (Unified)
    const [dateRange, setDateRange] = useState(() => getCurrentMonthRange()); // { from, to }

    // Pagination
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [dateSortOrder, setDateSortOrder] = useState("desc");
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
    const [sharedFlyersOnly, setSharedFlyersOnly] = useState(false);

    const buildOrderQueryParams = ({ page: queryPage, perPage: queryPerPage } = {}) => ({
        search: debouncedSearch,
        status: statusParam || (statusFilter.id === "ALL" ? undefined : statusFilter.id),
        mediumId: channelFilter.id,
        courierId: courierFilter.id,
        remarkTypeId: remarkFilter.id,
        dateType: dateTypeFilter.id,
        startDate: formatAsDateOnlyParam(dateRange?.from),
        endDate: formatAsDateOnlyParam(dateRange?.to || dateRange?.from),
        isSettled: settledFilter.id !== "all" ? settledFilter.id : undefined,
        sharedFlyersOnly: sharedFlyersOnly ? "true" : undefined,
        sortBy: "date",
        sortOrder: dateSortOrder,
        page: queryPage,
        perPage: queryPerPage,
    });

    const paginatedOrderParams = useMemo(
        () => buildOrderQueryParams({ page, perPage }),
        [
            debouncedSearch,
            statusParam,
            statusFilter.id,
            channelFilter.id,
            courierFilter.id,
            remarkFilter.id,
            dateTypeFilter.id,
            settledFilter.id,
            sharedFlyersOnly,
            dateSortOrder,
            page,
            perPage,
            dateRange?.from?.getTime(),
            dateRange?.to?.getTime(),
        ]
    );

    const filteredOrderParams = useMemo(
        () => buildOrderQueryParams(),
        [
            debouncedSearch,
            statusParam,
            statusFilter.id,
            channelFilter.id,
            courierFilter.id,
            remarkFilter.id,
            dateTypeFilter.id,
            settledFilter.id,
            sharedFlyersOnly,
            dateSortOrder,
            dateRange?.from?.getTime(),
            dateRange?.to?.getTime(),
        ]
    );

    const { data: orderData, isLoading } = useOrders(paginatedOrderParams);

    const orders = orderData?.rows || [];
    const tableRows = useMemo(() => {
        if (!sharedFlyersOnly) return orders;
        return orders.filter((order) => Number(order?.trackingGroupCount || 0) > 1);
    }, [orders, sharedFlyersOnly]);
    const meta = orderData?.meta || {};

    useEffect(() => {
        setPage(1);
    }, [sharedFlyersOnly]);

    const [summaryData, setSummaryData] = useState(null);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);

    useEffect(() => {
        let ignore = false;

        const fetchSummary = async () => {
            setIsSummaryLoading(true);
            try {
                const summary = await getOrderSummary(filteredOrderParams);
                if (!ignore) setSummaryData(summary || null);
            } catch {
                if (!ignore) {
                    setSummaryData(null);
                    toast.error("Failed to load order totals.");
                }
            } finally {
                if (!ignore) setIsSummaryLoading(false);
            }
        };

        fetchSummary();
        return () => {
            ignore = true;
        };
    }, [filteredOrderParams]);

    const totals = summaryData?.totals || {
        totalOrders: 0,
        totalPurchasePrice: 0,
        totalSellingPrice: 0,
        totalPurchaseCost: 0,
        totalShippingCharges: 0,
        totalTaxCharges: 0,
        totalOtherCharges: 0,
        totalUnits: 0,
        totalDays: 0,
        avgOrdersDaily: 0,
        avgPurchasePricePerProduct: 0,
        avgSellingPricePerProduct: 0,
        netProfit: 0,
        avgNetProfitPerOrder: 0,
    };
    const monthOverMonth = summaryData?.monthOverMonth || {
        orderDiff: 0,
        purchaseDiffPct: 0,
        sellingDiffPct: 0,
        netProfitDiffPct: 0,
    };
    const weeklyStats = summaryData?.weeklyStats || {
        currentWeekOrders: 0,
        previousWeekOrders: 0,
        avgOrdersPerDay: 0,
        changePct: 0,
    };
    const isWeeklyStatsLoading = isSummaryLoading;

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
    const [returnModalOpen, setReturnModalOpen] = useState(false);
    const [returnTarget, setReturnTarget] = useState(null);
    const [labelPreviewOpen, setLabelPreviewOpen] = useState(false);
    const [labelPreviewTarget, setLabelPreviewTarget] = useState(null);
    const [isLabelPrintProcessing, setIsLabelPrintProcessing] = useState(false);
    const [isLabelPreviewLoading, setIsLabelPreviewLoading] = useState(false);
    const [labelPreviewPrintableUrl, setLabelPreviewPrintableUrl] = useState("");
    const labelPreviewPrintableUrlRef = useRef("");

    const replaceLabelPreviewPrintableUrl = (nextUrl = "") => {
        if (labelPreviewPrintableUrlRef.current) {
            window.URL.revokeObjectURL(labelPreviewPrintableUrlRef.current);
        }
        labelPreviewPrintableUrlRef.current = nextUrl;
        setLabelPreviewPrintableUrl(nextUrl);
    };

    useEffect(() => {
        return () => {
            if (labelPreviewPrintableUrlRef.current) {
                window.URL.revokeObjectURL(labelPreviewPrintableUrlRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!viewOrder?.id || !Array.isArray(orders) || orders.length === 0) return;
        const freshOrder = orders.find((o) => o.id === viewOrder.id);
        if (!freshOrder) return;
        setViewOrder((prev) => {
            if (!prev || prev.id !== freshOrder.id) return prev;
            return prev === freshOrder ? prev : freshOrder;
        });
    }, [orders, viewOrder?.id]);

    useEffect(() => {
        if (!labelPreviewOpen || !labelPreviewTarget?.id) {
            setIsLabelPreviewLoading(false);
            replaceLabelPreviewPrintableUrl("");
            return;
        }

        let active = true;
        setIsLabelPreviewLoading(true);
        replaceLabelPreviewPrintableUrl("");

        getPrintableOrderLabel(labelPreviewTarget.id)
            .then((blob) => {
                const nextUrl = window.URL.createObjectURL(blob);
                if (!active) {
                    window.URL.revokeObjectURL(nextUrl);
                    return;
                }
                replaceLabelPreviewPrintableUrl(nextUrl);
            })
            .catch((err) => {
                if (!active) return;
                console.error("Printable label preview failed", err);
                toast.error("Failed to load printable label preview");
            })
            .finally(() => {
                if (active) setIsLabelPreviewLoading(false);
            });

        return () => {
            active = false;
        };
    }, [labelPreviewOpen, labelPreviewTarget?.id]);

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
    const [bulkReturnOpen, setBulkReturnOpen] = useState(false);
    const [isBulkReturnSubmitting, setIsBulkReturnSubmitting] = useState(false);
    const [productSummaryOpen, setProductSummaryOpen] = useState(false);
    const [isProductSummaryLoading, setIsProductSummaryLoading] = useState(false);
    const [productSummaryRows, setProductSummaryRows] = useState([]);
    const [productSummaryOrderCount, setProductSummaryOrderCount] = useState(0);
    const [trackingGroupOpen, setTrackingGroupOpen] = useState(false);
    const [trackingGroupId, setTrackingGroupId] = useState("");
    const [trackingGroupOrders, setTrackingGroupOrders] = useState([]);
    const [isTrackingGroupLoading, setIsTrackingGroupLoading] = useState(false);
    const canShowProductSummary = PRODUCT_SUMMARY_STATUSES.has(statusFilter.id);

    // Clear selection on filter change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [statusFilter.id, statusParam, channelFilter.id, courierFilter.id, remarkFilter.id, settledFilter.id, sharedFlyersOnly, dateRange?.from?.getTime(), dateRange?.to?.getTime()]);

    const handleSelectAll = (checked) => {
        if (checked) {
            const allIds = tableRows.map(o => o.id);
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

    const selectedOrdersForBulkReturn = useMemo(() => {
        if (selectedIds.size === 0) return [];
        return tableRows.filter((order) => selectedIds.has(order.id) && (order.status === "SHIPPED" || order.status === "DELIVERED"));
    }, [tableRows, selectedIds]);
    const allSelectedAreReturnEligible = selectedIds.size > 0 && selectedOrdersForBulkReturn.length === selectedIds.size;

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

    const handleDownloadProductSummaryPdf = () => {
        if (isProductSummaryLoading) {
            toast.error("Product summary is still loading.");
            return;
        }

        if (!Array.isArray(productSummaryRows) || productSummaryRows.length === 0) {
            toast.error("No product summary data to export.");
            return;
        }

        const flattenedRows = productSummaryRows.flatMap((row) => {
            const variants = Array.isArray(row.variants) && row.variants.length > 0
                ? row.variants
                : [{ label: "—", qty: row.qty }];

            return variants.map((variantRow) => ({
                productName: row.productName || row.groupName || "Product",
                variantLabel: variantRow.label || "—",
                qty: formatSummaryQty(variantRow.qty),
            }));
        });

        const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
        if (!printWindow) {
            toast.error("Please allow pop-ups to download the PDF.");
            return;
        }

        const exportedAt = new Date();
        const fileDate = exportedAt.toISOString().split("T")[0];
        const title = `product-summary-${fileDate}`;
        const rowsMarkup = flattenedRows.map((row) => `
            <tr>
                <td>${escapeHtml(row.productName)}</td>
                <td>${escapeHtml(row.variantLabel)}</td>
                <td class="qty">${escapeHtml(row.qty)}</td>
            </tr>
        `).join("");

        printWindow.document.write(`
            <!doctype html>
            <html>
                <head>
                    <meta charset="utf-8" />
                    <title>${escapeHtml(title)}</title>
                    <style>
                        @page { size: A4; margin: 14mm; }
                        * { box-sizing: border-box; }
                        body {
                            margin: 0;
                            font-family: Inter, Arial, sans-serif;
                            color: #111827;
                            background: #ffffff;
                        }
                        .sheet {
                            padding: 24px 28px;
                        }
                        .header {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            gap: 16px;
                            margin-bottom: 18px;
                        }
                        .title {
                            margin: 0 0 4px;
                            font-size: 24px;
                            font-weight: 700;
                        }
                        .meta {
                            margin: 0;
                            font-size: 13px;
                            color: #4b5563;
                        }
                        .stats {
                            text-align: right;
                            font-size: 13px;
                            color: #4b5563;
                            white-space: nowrap;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            table-layout: fixed;
                        }
                        thead th {
                            background: #f9fafb;
                            color: #374151;
                            font-size: 12px;
                            font-weight: 700;
                            letter-spacing: 0.04em;
                            text-transform: uppercase;
                            padding: 10px 12px;
                            border: 1px solid #e5e7eb;
                            text-align: left;
                        }
                        tbody td {
                            padding: 10px 12px;
                            border: 1px solid #e5e7eb;
                            font-size: 13px;
                            vertical-align: top;
                            word-break: break-word;
                        }
                        .qty {
                            text-align: right;
                            font-variant-numeric: tabular-nums;
                            font-weight: 600;
                        }
                    </style>
                </head>
                <body>
                    <div class="sheet">
                        <div class="header">
                            <div>
                                <h1 class="title">Product Summary</h1>
                                <p class="meta">Date Range: ${escapeHtml(activeRangeLabel)}</p>
                            </div>
                            <div class="stats">
                                <div>Orders: ${escapeHtml(productSummaryOrderCount)}</div>
                                <div>Products: ${escapeHtml(productSummaryRows.length)}</div>
                                <div>Exported: ${escapeHtml(exportedAt.toLocaleString())}</div>
                            </div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width:50%">Product Name</th>
                                    <th style="width:38%">Variant (Color + Size)</th>
                                    <th style="width:12%; text-align:right">Qty</th>
                                </tr>
                            </thead>
                            <tbody>${rowsMarkup}</tbody>
                        </table>
                    </div>
                    <script>
                        window.addEventListener("load", () => {
                            setTimeout(() => {
                                window.print();
                            }, 150);
                        });
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleOpenProductSummary = async () => {
        setProductSummaryOpen(true);
        setIsProductSummaryLoading(true);
        setProductSummaryRows([]);
        setProductSummaryOrderCount(0);

        try {
            const firstPage = await listOrders({ ...filteredOrderParams, page: 1, perPage: 250 });
            const totalPages = Number(firstPage?.meta?.totalPages || 1);
            const allOrders = Array.isArray(firstPage?.rows) ? [...firstPage.rows] : [];

            for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
                const pageData = await listOrders({ ...filteredOrderParams, page: currentPage, perPage: 250 });
                if (Array.isArray(pageData?.rows) && pageData.rows.length > 0) {
                    allOrders.push(...pageData.rows);
                }
            }

            setProductSummaryRows(buildOrderProductSummaryRows(allOrders));
            setProductSummaryOrderCount(allOrders.length);
        } catch (error) {
            console.error("Failed to load product summary", error);
            toast.error("Failed to load product summary.");
        } finally {
            setIsProductSummaryLoading(false);
        }
    };

    const handleOpenTrackingGroup = async (trackingId) => {
        const normalizedTrackingId = String(trackingId || "").trim();
        if (!normalizedTrackingId) return;

        setTrackingGroupOpen(true);
        setTrackingGroupId(normalizedTrackingId);
        setTrackingGroupOrders([]);
        setIsTrackingGroupLoading(true);

        try {
            const rows = await listOrdersByTracking({ trackingId: normalizedTrackingId });
            setTrackingGroupOrders(Array.isArray(rows) ? rows : []);
        } catch (error) {
            console.error("Failed to load tracking group orders", error);
            toast.error("Failed to load combined orders.");
        } finally {
            setIsTrackingGroupLoading(false);
        }
    };

    const openModal = (item = null) => {
        setEditing(item);
        setModalOpen(true);
    };

    const openReturnModal = (item) => {
        if (!item || (item.status !== "SHIPPED" && item.status !== "DELIVERED")) {
            toast.error("Return is allowed only when order status is SHIPPED or DELIVERED.");
            return;
        }
        setReturnTarget(item || null);
        setReturnModalOpen(true);
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

        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            toast.error("Only PDF files are allowed");
            // Clear input
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        try {
            const duplicateCheck = await checkOrderLabelNameExists({
                fileName: file.name,
                excludeOrderId: uploadTargetId,
            });

            if (duplicateCheck?.exists) {
                const existingOrderId = duplicateCheck?.order?.orderId || duplicateCheck?.order?.id;
                const proceed = window.confirm(
                    `Label "${file.name}" already exists on${existingOrderId ? ` order ${existingOrderId}` : " another order"}. Do you want to upload anyway?`
                );
                if (!proceed) {
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    return;
                }
            }
        } catch (err) {
            toast.error("Could not verify label name uniqueness. Please try again.");
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

    const handleReturnSubmit = async ({
        returns,
        returnNote,
        returnSellingAmount,
        returnShippingCharges,
        returnTaxCharges,
        returnOtherCharges,
    }) => {
        if (!returnTarget?.id || !Array.isArray(returns) || returns.length === 0) {
            toast.error("Please select at least one item and quantity.");
            return;
        }

        try {
            const updatedOrder = await updateMut.mutateAsync({
                id: returnTarget.id,
                payload: {
                    returns,
                    returnNote,
                    returnSellingAmount,
                    returnShippingCharges,
                    returnTaxCharges,
                    returnOtherCharges,
                },
            });
            toast.success("Return processed successfully.");

            if (editing?.id && editing.id === returnTarget.id) {
                setEditing((prev) => ({
                    ...(prev || {}),
                    ...(updatedOrder || {}),
                    id: updatedOrder?.id || prev?.id,
                }));
            }

            if (viewOpen && viewOrder?.id && viewOrder.id === returnTarget.id) {
                setViewOrder(updatedOrder);
            }

            setReturnModalOpen(false);
            setReturnTarget(null);
        } catch (err) {
            const message = err?.response?.data?.message || err?.message || "Failed to process return";
            toast.error(Array.isArray(message) ? message.join(", ") : message);
        }
    };

    const handleBulkReturnSubmit = async (entries) => {
        if (!Array.isArray(entries) || entries.length === 0) {
            toast.error("Please add return quantities first.");
            return;
        }

        setIsBulkReturnSubmitting(true);
        let success = 0;
        let failed = 0;

        for (const entry of entries) {
            try {
                await updateMut.mutateAsync({
                    id: entry.orderId,
                    payload: {
                        returns: entry.returns,
                        returnNote: entry.returnNote,
                    },
                });
                success += 1;
            } catch (err) {
                failed += 1;
            }
        }

        setIsBulkReturnSubmitting(false);

        if (success > 0) {
            toast.success(`Return applied on ${success} order${success > 1 ? "s" : ""}.`);
        }
        if (failed > 0) {
            toast.error(`${failed} order${failed > 1 ? "s" : ""} failed during bulk return.`);
        }

        if (success > 0) {
            setBulkReturnOpen(false);
            setSelectedIds(new Set());
        }
    };

    const handleOpenLabelPreview = (order) => {
        if (!order?.label) return;
        setLabelPreviewTarget({
            id: order.id,
            orderId: order.orderId,
            status: order.status,
            label: order.label,
        });
        setLabelPreviewOpen(true);
    };

    const handleCloseLabelPreview = () => {
        if (isLabelPrintProcessing) return;
        setLabelPreviewOpen(false);
        setLabelPreviewTarget(null);
    };

    const finalizeLabelPreviewAction = async (successMsg, actionLabel) => {
        try {
            if (labelPreviewTarget.status === "LABEL_UPLOADED") {
                await updateMut.mutateAsync({
                    id: labelPreviewTarget.id,
                    payload: { status: "LABEL_PRINTED" }
                });
                toast.success(`${successMsg} and order marked as Printed`);
            } else {
                toast.success(successMsg);
            }
        } catch (err) {
            console.error(`Status update after label ${actionLabel} failed`, err);
            toast.error(`${successMsg}, but failed to update status`);
        } finally {
            setLabelPreviewOpen(false);
            setLabelPreviewTarget(null);
            setIsLabelPrintProcessing(false);
        }
    };

    const handleDownloadLabelFromPreview = async () => {
        if (!labelPreviewTarget?.label) {
            toast.error("Label not available for this order");
            return;
        }
        if (!labelPreviewPrintableUrl) {
            toast.error(isLabelPreviewLoading ? "Printable label is still loading" : "Printable label not available");
            return;
        }

        setIsLabelPrintProcessing(true);

        try {
            const link = document.createElement("a");
            const fileName = labelPreviewTarget.label.split("/").pop() || "label.pdf";
            link.href = labelPreviewPrintableUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Label download failed", err);
            toast.error("Failed to download label");
            setIsLabelPrintProcessing(false);
            return;
        }

        await finalizeLabelPreviewAction("Label downloaded", "download");
    };

    const handlePrintLabelFromPreview = async () => {
        if (!labelPreviewTarget?.label) {
            toast.error("Label not available for this order");
            return;
        }
        if (!labelPreviewPrintableUrl) {
            toast.error(isLabelPreviewLoading ? "Printable label is still loading" : "Printable label not available");
            return;
        }

        setIsLabelPrintProcessing(true);
        let printWindow = null;

        try {
            printWindow = window.open("", "_blank");
            if (!printWindow) {
                throw new Error("Popup blocked");
            }

            const escapedTitle = String(labelPreviewTarget.orderId || "Order Label").replace(/"/g, "&quot;");

            printWindow.document.write(`
              <html>
                <head>
                  <title>${escapedTitle}</title>
                  <style>
                    html, body { margin: 0; padding: 0; height: 100%; background: #fff; }
                    iframe { border: 0; width: 100%; height: 100%; }
                  </style>
                </head>
                <body>
                  <iframe
                    src="${labelPreviewPrintableUrl}"
                    onload="try { this.contentWindow.focus(); this.contentWindow.print(); } catch (error) { window.focus(); }"
                  ></iframe>
                </body>
              </html>
            `);
            printWindow.document.close();
        } catch (err) {
            console.error("Label print failed", err);
            if (printWindow && !printWindow.closed) printWindow.close();
            toast.error("Failed to open print dialog");
            setIsLabelPrintProcessing(false);
            return;
        }

        await finalizeLabelPreviewAction("Print dialog opened", "print");
    };



    const columns = [
        {
            key: "select",
            label: (
                <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    checked={tableRows.length > 0 && selectedIds.size === tableRows.length}
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
            label: (
                <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-gray-900"
                    onClick={(e) => {
                        e.stopPropagation();
                        setDateSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                        setPage(1);
                    }}
                    title={`Sort date ${dateSortOrder === "asc" ? "oldest first" : "newest first"}`}
                >
                    <span>Date</span>
                    <span className="inline-flex items-center gap-0.5 text-[10px]">
                        <span className={dateSortOrder === "asc" ? "text-gray-900" : "text-gray-400"}>↑</span>
                        <span className={dateSortOrder === "desc" ? "text-gray-900" : "text-gray-400"}>↓</span>
                    </span>
                </button>
            ),
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
            className: "!items-start min-w-[469px]",
            headerClassName: "min-w-[469px]",
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
            key: "trackingId",
            label: "Tracking ID",
            className: "!items-start !min-w-[250px]",
            headerClassName: "!min-w-[250px]",
            render: (row) => {
                const sharedCount = Number(row?.trackingGroupCount || 0);
                const isSharedFlyer = sharedCount > 1;

                return (
                    <div className="flex flex-col items-start justify-center gap-1 min-h-[3rem] py-1">
                        <div className="flex items-center gap-1 w-full">
                            <span className="text-[11px] text-blue-600 truncate" title={row.trackingId}>
                                {row.trackingId || "—"}
                            </span>
                            {row.trackingId && <CopyButton text={row.trackingId} />}
                        </div>
                        {row.trackingId && isSharedFlyer && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenTrackingGroup(row.trackingId);
                                }}
                                className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100"
                            >
                                Combined Order ({sharedCount})
                            </button>
                        )}
                    </div>
                );
            }
        },
        {
            key: "channel",
            label: "Marketplace",
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
            className: "!items-start min-w-[360px]",
            headerClassName: "min-w-[360px]",
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
                                const images = resolveOrderProductImages({ listing, product, variant, name });

                                const variantParts = [];
                                if (variant?.size?.name) variantParts.push(variant.size.name);
                                else if (variant?.sizeText) variantParts.push(variant.sizeText);

                                if (variant?.color?.name) variantParts.push(variant.color.name);
                                else if (variant?.colorText) variantParts.push(variant.colorText);

                                const variantInfo = variantParts.join(" · ");

                                return (
                                    <div key={idx} className="flex items-center gap-3 min-h-[3rem] py-1 border-b border-gray-100 last:border-0 w-full min-w-0 overflow-hidden text-left">
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
                                                badgeClassName="text-[10px] min-w-[18px] h-[18px] px-1.5 py-0.5 flex items-center justify-center"
                                            />
                                        </div>
                                        {/* Text */}
                                        <div className="flex-1 min-w-0 overflow-hidden flex flex-col gap-0.5">
                                            <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-gray-900 text-[13px]" title={name}>
                                                {name}
                                            </span>
                                            {variantInfo && (
                                                <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-gray-400">
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
                const itemVariant = row.productVariant;
                const productName = row.product?.name || row.productVariant?.sku || row.productDescription || "—";
                const images = resolveOrderProductImages({
                    listing: row.channelListing,
                    product: row.product,
                    variant: itemVariant,
                    name: row.productDescription || productName,
                });
                const variantInfo = row.productVariant?.sizeText || row.productVariant?.colorText
                    ? [row.productVariant?.sizeText, row.productVariant?.colorText].filter(Boolean).join(" · ")
                    : null;

                return (
                    <div className="flex items-center gap-3 w-full min-w-0 min-h-[3rem] py-1 overflow-hidden">
                        <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <ImageGallery
                                images={images}
                                absImg={absImg}
                                placeholder={IMG_PLACEHOLDER}
                                compact={true}
                                className="h-8 w-8"
                                thumbnailClassName="h-8 w-8 bg-white"
                                badgeContent={(Number(row.quantity) || 0) > 1 ? row.quantity : null}
                                badgeClassName="text-[10px] min-w-[18px] h-[18px] px-1.5 py-0.5 flex items-center justify-center"
                            />
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden flex flex-col gap-0.5">
                            <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-gray-900 text-[13px]" title={productName}>
                                {productName}
                            </span>
                            {(variantInfo) && (
                                <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-gray-500">
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
            key: "status",
            label: "Status",
            className: "!items-start",
            render: (row) => {
                const isPartiallyReturned = row.status !== 'RETURN'
                    && Array.isArray(row.returnRecords)
                    && row.returnRecords.length > 0;

                return (
                    <div className="flex flex-col items-start justify-center gap-1 min-h-[3rem] py-1">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${row.status === 'DELIVERED'
                            ? "bg-emerald-100 text-emerald-700"
                            : row.status === 'CANCEL' || row.status === 'RETURN' || row.status === 'REFUND'
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                            {row.status?.replace(/_/g, " ")}
                        </span>
                        {isPartiallyReturned && (
                            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                                Partially Returned
                            </span>
                        )}
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
                );
            }
        },
        {
            key: "actions",
            label: "Actions",
            headerClassName: "sticky right-0 z-20 !bg-gray-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] justify-center text-center min-w-[196px]",
            className: "sticky right-0 z-10 !bg-white group-hover:!bg-gray-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] h-full flex items-center justify-center !overflow-visible !min-w-[196px]",
            render: (row) => {
                const overflowActions = [];
                const directActions = [];

                if (canUpdate && (row.status === "SHIPPED" || row.status === "DELIVERED") && Array.isArray(row.items) && row.items.length > 0) {
                    overflowActions.push({
                        label: "Return",
                        icon: RotateCcw,
                        onClick: () => openReturnModal(row),
                    });
                }

                if ((row.status === "PENDING" || row.status === "Pending") && canUpdate) {
                    directActions.push({
                        key: "upload-label",
                        label: "Upload Label",
                        icon: Upload,
                        onClick: () => handleUploadClick(row.id),
                    });
                }

                if (row.label) {
                    directActions.push({
                        key: "download-label",
                        label: "Download Label",
                        icon: Printer,
                        onClick: () => handleOpenLabelPreview(row),
                    });
                }

                if (row.status === "LABEL_PRINTED" && canUpdate) {
                    directActions.push({
                        key: "mark-packed",
                        label: "Mark Packed",
                        icon: Package,
                        onClick: async () => {
                            try {
                                await updateMut.mutateAsync({
                                    id: row.id,
                                    payload: { status: "PACKED" },
                                });
                                toast.success("Order marked as Packed");
                            } catch (err) {
                                toast.error("Failed to update status");
                            }
                        },
                    });
                }

                if (row.status === "PACKED" && canUpdate) {
                    directActions.push({
                        key: "mark-shipped",
                        label: "Mark Shipped",
                        icon: Truck,
                        onClick: async () => {
                            try {
                                await updateMut.mutateAsync({
                                    id: row.id,
                                    payload: { status: "SHIPPED" },
                                });
                                toast.success("Order marked as Shipped");
                            } catch (err) {
                                toast.error("Failed to update status");
                            }
                        },
                    });
                }

                if (row.status === "SHIPPED" && canUpdate) {
                    directActions.push({
                        key: "mark-delivered",
                        label: "Mark Delivered",
                        icon: CheckCircle,
                        onClick: async () => {
                            try {
                                await updateMut.mutateAsync({
                                    id: row.id,
                                    payload: { status: "DELIVERED" },
                                });
                                toast.success("Order marked as Delivered");
                            } catch (err) {
                                toast.error("Failed to update status");
                            }
                        },
                    });
                }

                if (canDelete) {
                    overflowActions.push({
                        label: "Delete",
                        icon: Trash2,
                        className: "text-red-600",
                        onClick: () => {
                            setTarget(row);
                            setConfirmOpen(true);
                        },
                    });
                }

                const renderIconAction = ({ key, label, onClick, Icon }) => (
                    <div key={key} className="relative group/action">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 rounded-md p-0"
                            aria-label={label}
                            onClick={(e) => {
                                e.stopPropagation();
                                onClick?.();
                            }}
                        >
                            <Icon size={14} />
                        </Button>
                        <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity duration-150 group-hover/action:opacity-100 whitespace-nowrap z-20">
                            {label}
                        </span>
                    </div>
                );

                return (
                    <div className="flex w-full items-center justify-center gap-1 whitespace-nowrap">
                        {renderIconAction({
                            key: "view",
                            label: "View",
                            Icon: Eye,
                            onClick: () => {
                                setViewOrder(row);
                                setViewOpen(true);
                            }
                        })}
                        {canUpdate && (
                            renderIconAction({
                                key: "edit",
                                label: "Edit",
                                Icon: Pencil,
                                onClick: () => openModal(row),
                            })
                        )}
                        {directActions.map((action) => {
                            const Icon = action.icon || Eye;
                            return renderIconAction({
                                key: action.key,
                                label: action.label,
                                Icon,
                                onClick: action.onClick,
                            });
                        })}
                        {overflowActions.length > 0 && (
                            <div className="relative group/action" onClick={(e) => e.stopPropagation()}>
                                <ActionMenu
                                    actions={overflowActions}
                                    direction="up"
                                    openOnHover
                                    hoverOpenDelay={320}
                                    hoverCloseDelay={320}
                                />
                                <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity duration-150 group-hover/action:opacity-100 whitespace-nowrap z-20">
                                    More
                                </span>
                            </div>
                        )}
                    </div>
                );
            }
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
        setPage(1);

        const statusId = newFilters.status.id;
        if (statusId === "ALL") navigate("/orders");
        else navigate(`/orders?status=${statusId}`);
    };

    // Export Logic
    const [isExporting, setIsExporting] = useState(false);
    const handleExport = async () => {
        try {
            setIsExporting(true);
            const firstPage = await listOrders({ ...filteredOrderParams, page: 1, perPage: 250 });
            const totalPages = Number(firstPage?.meta?.totalPages || 1);
            const dataToExport = Array.isArray(firstPage?.rows) ? [...firstPage.rows] : [];

            for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
                const pageData = await listOrders({ ...filteredOrderParams, page: currentPage, perPage: 250 });
                if (Array.isArray(pageData?.rows) && pageData.rows.length > 0) {
                    dataToExport.push(...pageData.rows);
                }
            }

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

    const activeRangeLabel = useMemo(() => {
        if (!dateRange?.from) return "All Time";
        const fromLabel = new Date(dateRange.from).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
        const toLabel = new Date(dateRange.to || dateRange.from).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
        return `${fromLabel} - ${toLabel}`;
    }, [dateRange?.from?.getTime(), dateRange?.to?.getTime()]);

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
                defaultDateRange={defaultDateRange}
            />

            {(statusFilter.id !== "ALL" || channelFilter.id || courierFilter.id || remarkFilter.id || dateRange || settledFilter.id !== "all" || sharedFlyersOnly) && (
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
                    {sharedFlyersOnly && (
                        <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-blue-200 whitespace-nowrap">
                            Combined Orders Only
                            <button onClick={() => setSharedFlyersOnly(false)} className="hover:text-red-500"><X size={10} /></button>
                        </div>
                    )}

                    <div className="h-4 w-px bg-gray-300 mx-1" />

                    <Button
                        variant="ghost"
                        size="xs"
                        className="text-red-600 hover:bg-red-50 h-6 px-2"
                        onClick={() => {
                            setSharedFlyersOnly(false);
                            handleFilterApply({
                                search: "",
                                status: statusOptions[0],
                                channel: channelOptions[0],
                                courier: courierOptions[0],
                                remark: remarkOptions[0],
                                dateRange: defaultDateRange,
                                settled: { id: "all", name: "All" }
                            });
                        }}
                    >
                        <Trash2 size={12} className="mr-1" /> Clear all
                    </Button>
                </div>
            )}

            <div className="flex-1" />

            <Button
                variant={sharedFlyersOnly ? "warning" : "secondary"}
                onClick={() => setSharedFlyersOnly((prev) => !prev)}
                title="Show only orders that share tracking IDs"
            >
                {sharedFlyersOnly ? "Combined Orders: ON" : "Combined Orders"}
            </Button>

            {canShowProductSummary && (
                <Button variant="secondary" onClick={handleOpenProductSummary} isLoading={isProductSummaryLoading}>
                    Summary
                </Button>
            )}

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

            <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-gray-900">Order Totals</h2>
                    <span className="text-xs text-gray-500">{activeRangeLabel}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Total Orders</p>
                        <p className="mt-1 text-xl font-semibold text-gray-900">{isSummaryLoading ? "..." : totals.totalOrders}</p>
                        <p className={`mt-1 text-[11px] ${monthOverMonth.orderDiff > 0 ? "text-emerald-600" : monthOverMonth.orderDiff < 0 ? "text-rose-600" : "text-gray-500"}`}>
                            {isSummaryLoading ? "..." : `${monthOverMonth.orderDiff >= 0 ? "+" : ""}${monthOverMonth.orderDiff} vs same range last month`}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Total Purchase Price</p>
                        <p className="mt-1 text-xl font-semibold text-gray-900">{isSummaryLoading ? "..." : `$${formatMoney(totals.totalPurchasePrice)}`}</p>
                        <p className="mt-1 text-[11px] text-gray-500">
                            Purchase: {isSummaryLoading ? "..." : formatMoney(totals.totalPurchaseCost)} | Shipping: {isSummaryLoading ? "..." : formatMoney(totals.totalShippingCharges)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-500">
                            Tax: {isSummaryLoading ? "..." : formatMoney(totals.totalTaxCharges)} | Other: {isSummaryLoading ? "..." : formatMoney(totals.totalOtherCharges)}
                        </p>
                        <p className={`mt-0.5 text-[11px] ${monthOverMonth.purchaseDiffPct > 0 ? "text-emerald-600" : monthOverMonth.purchaseDiffPct < 0 ? "text-rose-600" : "text-gray-500"}`}>
                            {isSummaryLoading ? "..." : `${monthOverMonth.purchaseDiffPct >= 0 ? "+" : ""}${monthOverMonth.purchaseDiffPct.toFixed(1)}% vs same range last month`}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Total Selling Price</p>
                        <p className="mt-1 text-xl font-semibold text-gray-900">{isSummaryLoading ? "..." : `$${formatMoney(totals.totalSellingPrice)}`}</p>
                        <p className={`mt-1 text-[11px] ${monthOverMonth.sellingDiffPct > 0 ? "text-emerald-600" : monthOverMonth.sellingDiffPct < 0 ? "text-rose-600" : "text-gray-500"}`}>
                            {isSummaryLoading ? "..." : `${monthOverMonth.sellingDiffPct >= 0 ? "+" : ""}${monthOverMonth.sellingDiffPct.toFixed(1)}% vs same range last month`}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Net Profit</p>
                        <p className={`mt-1 text-xl font-semibold ${totals.netProfit > 0 ? "text-emerald-600" : totals.netProfit < 0 ? "text-rose-600" : "text-gray-900"}`}>
                            {isSummaryLoading ? "..." : `$${formatMoney(totals.netProfit)}`}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-500">Selling Price - Purchase Price</p>
                        <p className="mt-0.5 text-[11px] text-gray-500">
                            Avg/order: {isSummaryLoading ? "..." : `$${formatMoney(totals.avgNetProfitPerOrder)}`}
                        </p>
                        <p className={`mt-0.5 text-[11px] ${monthOverMonth.netProfitDiffPct > 0 ? "text-emerald-600" : monthOverMonth.netProfitDiffPct < 0 ? "text-rose-600" : "text-gray-500"}`}>
                            {isSummaryLoading ? "..." : `${monthOverMonth.netProfitDiffPct >= 0 ? "+" : ""}${monthOverMonth.netProfitDiffPct.toFixed(1)}% vs same range last month`}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Weekly Avg Orders</p>
                        <p className="mt-1 text-xl font-semibold text-gray-900">
                            {isWeeklyStatsLoading ? "..." : weeklyStats.avgOrdersPerDay.toFixed(2)}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-500">
                            {isWeeklyStatsLoading ? "..." : `This week: ${weeklyStats.currentWeekOrders} | Last week: ${weeklyStats.previousWeekOrders}`}
                        </p>
                        <p className={`mt-0.5 text-[11px] ${weeklyStats.changePct > 0 ? "text-emerald-600" : weeklyStats.changePct < 0 ? "text-rose-600" : "text-gray-500"}`}>
                            {isWeeklyStatsLoading
                                ? "..."
                                : `${weeklyStats.changePct >= 0 ? "+" : ""}${weeklyStats.changePct.toFixed(1)}% vs last week`}
                        </p>
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                rows={tableRows}
                isLoading={isLoading}
                toolbar={toolbar}
                gridCols="grid-cols-[40px_minmax(100px,0.7fr)_minmax(244px,1.69fr)_minmax(250px,1fr)_minmax(110px,0.7fr)_minmax(360px,2.1fr)_minmax(90px,0.5fr)_minmax(90px,0.6fr)_minmax(90px,0.6fr)_minmax(90px,0.6fr)_minmax(90px,0.5fr)_minmax(90px,0.6fr)_minmax(100px,0.8fr)_minmax(203px,1.52fr)_minmax(196px,max-content)]"
                contentMinWidthClass="min-w-[2127px]"
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
                    {canUpdate && allSelectedAreReturnEligible && (
                        <>
                            <div className="h-4 w-px bg-gray-700" />
                            <button
                                onClick={() => setBulkReturnOpen(true)}
                                className="text-sm hover:text-indigo-300 font-medium transition-colors flex items-center gap-2"
                            >
                                <RotateCcw size={16} /> <span>Bulk Return</span>
                            </button>
                        </>
                    )}

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
                        options={statusOptions.filter(o => o.id !== 'ALL' && o.id !== 'RETURN').map(o => ({ value: o.id, label: o.name }))}
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

            <BulkReturnModal
                open={bulkReturnOpen}
                onClose={() => setBulkReturnOpen(false)}
                orders={selectedOrdersForBulkReturn}
                isLoading={isBulkReturnSubmitting}
                onSubmit={handleBulkReturnSubmit}
            />

            <Modal
                open={productSummaryOpen}
                onClose={() => setProductSummaryOpen(false)}
                title="Product Summary"
                widthClass="max-w-5xl"
                footer={(
                    <>
                        <Button
                            variant="secondary"
                            onClick={handleDownloadProductSummaryPdf}
                            disabled={isProductSummaryLoading || productSummaryRows.length === 0}
                        >
                            <Download size={14} className="mr-1" />
                            Download PDF
                        </Button>
                        <Button variant="ghost" onClick={() => setProductSummaryOpen(false)}>
                            Close
                        </Button>
                    </>
                )}
            >
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <p className="text-sm font-medium text-gray-700">Date Range: {activeRangeLabel}</p>
                        <p className="text-xs text-gray-500">
                            {isProductSummaryLoading ? "Loading..." : `Orders: ${productSummaryOrderCount} | Products: ${productSummaryRows.length}`}
                        </p>
                    </div>

                    {isProductSummaryLoading ? (
                        <div className="py-8 text-center text-sm text-gray-500">Loading summary...</div>
                    ) : productSummaryRows.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-500">No products found for the selected range.</div>
                    ) : (
                        <div className="max-h-[60vh] overflow-auto rounded-lg border border-gray-200">
                            <table className="min-w-full table-fixed border-separate border-spacing-0 text-sm">
                                <thead className="bg-gray-50">
                                    <tr className="border-b border-gray-200">
                                        <th className="sticky top-0 z-10 w-[50%] border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Product Name</th>
                                        <th className="sticky top-0 z-10 w-[38%] border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Variant (Color + Size)</th>
                                        <th className="sticky top-0 z-10 w-[12%] border-b border-gray-200 bg-gray-50 pl-2 pr-6 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productSummaryRows.map((row, index) => (
                                        <tr
                                            key={`${row.groupKey}-${index}`}
                                            className="border-b border-gray-100 last:border-0"
                                        >
                                            <td className="px-3 py-2 text-gray-900">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="flex-shrink-0">
                                                        <ImageGallery
                                                            images={Array.isArray(row.images) ? row.images : []}
                                                            absImg={absImg}
                                                            placeholder={IMG_PLACEHOLDER}
                                                            compact={true}
                                                            className="h-8 w-8"
                                                            thumbnailClassName="h-9 w-9 bg-white"
                                                        />
                                                    </div>
                                                    <span className="block truncate" title={row.productName}>{row.productName}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-gray-700">
                                                <div className="space-y-1">
                                                    {(Array.isArray(row.variants) ? row.variants : []).map((variantRow, variantIndex) => (
                                                        <div key={`${row.groupKey}-variant-${variantIndex}`} className="truncate" title={variantRow.label || "—"}>
                                                            {variantRow.label || "—"}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="pl-2 pr-6 py-2 text-right font-semibold tabular-nums text-gray-900">
                                                <div className="space-y-1">
                                                    {(Array.isArray(row.variants) ? row.variants : []).map((variantRow, variantIndex) => (
                                                        <div key={`${row.groupKey}-qty-${variantIndex}`}>
                                                            {formatSummaryQty(variantRow.qty)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Modal>

            <Modal
                open={trackingGroupOpen}
                onClose={() => setTrackingGroupOpen(false)}
                title={`Combined Orders${trackingGroupId ? ` - ${trackingGroupId}` : ""}`}
                widthClass="max-w-4xl"
                footer={(
                    <Button variant="ghost" onClick={() => setTrackingGroupOpen(false)}>
                        Close
                    </Button>
                )}
            >
                {isTrackingGroupLoading ? (
                    <div className="py-8 text-center text-sm text-gray-500">Loading combined orders...</div>
                ) : trackingGroupOrders.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">No orders found for this tracking ID.</div>
                ) : (
                    <div className="max-h-[60vh] overflow-auto rounded-lg border border-gray-200">
                        <table className="min-w-full border-separate border-spacing-0 text-sm">
                            <thead className="bg-gray-50">
                                <tr className="border-b border-gray-200">
                                    <th className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Order ID</th>
                                    <th className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Date</th>
                                    <th className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Marketplace</th>
                                    <th className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Courier</th>
                                    <th className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trackingGroupOrders.map((row) => (
                                    <tr key={row.id} className="border-b border-gray-100 last:border-0">
                                        <td className="px-3 py-2 text-gray-900">{row.orderId || "—"}</td>
                                        <td className="px-3 py-2 text-gray-700">{formatDate(row.date)}</td>
                                        <td className="px-3 py-2 text-gray-700">{row.tenantChannel?.marketplace || "—"}</td>
                                        <td className="px-3 py-2 text-gray-700">{row.courierMedium?.shortName || row.courierMedium?.fullName || "—"}</td>
                                        <td className="px-3 py-2 text-gray-700">{row.status?.replace(/_/g, " ") || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Modal>

            <Modal
                open={labelPreviewOpen}
                onClose={handleCloseLabelPreview}
                title={`Label Preview${labelPreviewTarget?.orderId ? ` - ${labelPreviewTarget.orderId}` : ""}`}
                widthClass="max-w-5xl"
                footer={
                    <>
                        <Button variant="ghost" onClick={handleCloseLabelPreview} disabled={isLabelPrintProcessing}>
                            Close
                        </Button>
                        <Button
                            variant="warning"
                            onClick={handleDownloadLabelFromPreview}
                            isLoading={isLabelPrintProcessing}
                            disabled={!labelPreviewTarget?.label || isLabelPreviewLoading || !labelPreviewPrintableUrl}
                        >
                            Download
                        </Button>
                        <Button
                            variant="warning"
                            onClick={handlePrintLabelFromPreview}
                            isLoading={isLabelPrintProcessing}
                            disabled={!labelPreviewTarget?.label || isLabelPreviewLoading || !labelPreviewPrintableUrl}
                        >
                            Print
                        </Button>
                    </>
                }
            >
                {labelPreviewTarget?.label ? (
                    isLabelPreviewLoading ? (
                        <div className="flex h-[70vh] items-center justify-center rounded-md border border-gray-200 bg-white">
                            <p className="text-sm text-gray-500">Preparing printable label preview...</p>
                        </div>
                    ) : labelPreviewPrintableUrl ? (
                    <iframe
                        src={labelPreviewPrintableUrl}
                        title="Order Label Preview"
                        className="w-full h-[70vh] rounded-md border border-gray-200 bg-white"
                    />
                    ) : (
                        <div className="flex h-[70vh] items-center justify-center rounded-md border border-gray-200 bg-white">
                            <p className="text-sm text-gray-500">Printable label preview is unavailable.</p>
                        </div>
                    )
                ) : (
                    <p className="text-sm text-gray-500">No label available for preview.</p>
                )}
            </Modal>

            <OrderModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                editing={editing}
                onSuccess={handleOrderSaved}
                onRequestReturn={(order) => {
                    openReturnModal(order);
                }}
            />

            <ReturnOrderModal
                open={returnModalOpen}
                onClose={() => {
                    if (updateMut.isPending) return;
                    setReturnModalOpen(false);
                    setReturnTarget(null);
                }}
                order={returnTarget}
                isLoading={updateMut.isPending}
                onSubmit={handleReturnSubmit}
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
