import { useMemo, useRef } from "react";
import { Package, Truck, User, Calendar, Hash, DollarSign, Tag, MessageSquare, Copy, Check, Paperclip, Download, Trash2, Loader2, Plus, Receipt, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import ViewModal from "../../../components/ViewModal";
import ImageGallery from "../../../components/ImageGallery";
import { useAuthCheck } from "../../auth/hooks/useAuthCheck";
import { uploadOrderAttachment, deleteOrderAttachment } from "../../../lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { absOrderImage, ORDER_IMG_PLACEHOLDER, resolveOrderItemImage } from "../utils/orderItemImage";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif", "heic", "heif"]);
const OFFICE_EXTENSIONS = new Set(["doc", "docx", "xls", "xlsx", "xlsm", "ppt", "pptx"]);
const OFFICE_MIME_PREFIXES = [
    "application/msword",
    "application/vnd.ms-excel",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument",
];
const resolveAttachmentName = (attachment = {}) =>
    attachment?.fileName || attachment?.name || attachment?.originalName || "";
const resolveAttachmentMime = (attachment = {}) =>
    String(attachment?.mimeType || attachment?.mime || attachment?.contentType || "").toLowerCase();
const getFileExtension = (value = "") => {
    const cleanValue = String(value || "").split("?")[0];
    const dotIndex = cleanValue.lastIndexOf(".");
    return dotIndex === -1 ? "" : cleanValue.slice(dotIndex + 1).toLowerCase();
};
const isImageAttachment = (attachment = {}) => {
    const mimeType = resolveAttachmentMime(attachment);
    if (mimeType.startsWith("image/")) return true;
    const ext = getFileExtension(resolveAttachmentName(attachment) || attachment?.filePath || "");
    return IMAGE_EXTENSIONS.has(ext);
};
const isPdfAttachment = (attachment = {}) => {
    const mimeType = resolveAttachmentMime(attachment);
    if (mimeType === "application/pdf") return true;
    const ext = getFileExtension(resolveAttachmentName(attachment) || attachment?.filePath || "");
    return ext === "pdf";
};
const isOfficeAttachment = (attachment = {}) => {
    const mimeType = resolveAttachmentMime(attachment);
    if (OFFICE_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) return true;
    const ext = getFileExtension(resolveAttachmentName(attachment) || attachment?.filePath || "");
    return OFFICE_EXTENSIONS.has(ext);
};
const officeViewerUrlFromAttachmentUrl = (fileUrl = "") =>
    fileUrl ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}` : "";

const RETURN_EVENT_PREFIX = "[RETURN_EVENT]";

const normalizeText = (value) => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map((v) => String(v ?? "")).join("\n");
    if (value === null || value === undefined) return "";
    return String(value);
};

const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const parseReturnEventsFromRemarks = (remarksRaw) => {
    const remarksText = normalizeText(remarksRaw);
    if (!remarksText.trim()) return [];

    const salvageTruncatedReturnEvent = (payload) => {
        const atMatch = payload.match(/"at"\s*:\s*"([^"]+)"/);
        const noteMatch = payload.match(/"note"\s*:\s*"([^"]*)"/);
        const productMatch = payload.match(/"productDescription"\s*:\s*"([^"]+)"/);
        const returnedQtyMatch = payload.match(/"returnedQty"\s*:\s*(\d+)/);
        const unitsPerQtyMatch = payload.match(/"unitsPerQty"\s*:\s*(\d+)/);
        const restockedUnitsMatch = payload.match(/"restockedUnits"\s*:\s*(\d+)/);

        const returnedQty = toNumber(returnedQtyMatch?.[1], 0);
        if (returnedQty <= 0) return null;

        const unitsPerQty = toNumber(unitsPerQtyMatch?.[1], 1);
        const restockedUnits = toNumber(restockedUnitsMatch?.[1], returnedQty * unitsPerQty);

        return {
            at: atMatch?.[1] || null,
            note: noteMatch?.[1] || "",
            items: [
                {
                    productDescription: productMatch?.[1] || "Order Item",
                    returnedQty,
                    unitsPerQty,
                    restockedUnits,
                },
            ],
        };
    };

    return remarksText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .map((line) => {
            const prefixIndex = line.indexOf(RETURN_EVENT_PREFIX);
            if (prefixIndex === -1) return null;
            const payload = line.slice(prefixIndex + RETURN_EVENT_PREFIX.length).trim();
            try {
                const parsed = JSON.parse(payload);
                if (!parsed || typeof parsed !== "object") return null;
                return {
                    at: parsed.at || parsed.createdAt || null,
                    note: parsed.note || parsed.returnNote || "",
                    items: Array.isArray(parsed.items) ? parsed.items : [],
                };
            } catch {
                return salvageTruncatedReturnEvent(payload);
            }
        })
        .filter(Boolean);
};

const parseReturnEventsFromRecords = (recordsRaw) => {
    if (!Array.isArray(recordsRaw) || recordsRaw.length === 0) return [];

    return recordsRaw
        .map((record) => {
            const items = Array.isArray(record?.items) ? record.items : [];
            return {
                at: record?.createdAt || record?.at || null,
                note: record?.note || "",
                items: items.map((item) => ({
                    orderItemId: item?.orderItemId || null,
                    productDescription: item?.productDescription || "Order Item",
                    returnedQty: toNumber(item?.returnedQty, 0),
                    unitsPerQty: toNumber(item?.unitsPerQty, 1),
                    restockedUnits: toNumber(item?.restockedUnits, 0),
                })),
            };
        })
        .filter((event) => Array.isArray(event.items) && event.items.length > 0);
};


// Copy Button Helper
const CopyButton = ({ text, className = "" }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e) => {
        e.stopPropagation();
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button onClick={handleCopy} className={`text-gray-400 hover:text-gray-600 transition-colors ${className}`}>
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </button>
    );
};

// Reusable Detail Row Component
const DetailRow = ({ label, value, copyable = false, className = "" }) => (
    <div className={className}>
        <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
        <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-gray-900">{value || "—"}</p>
            {copyable && value && <CopyButton text={value} />}
        </div>
    </div>
);

// Reusable Card Section Component
const CardSection = ({ icon: Icon, title, children }) => (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-gray-500" />}
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="p-4">
            {children}
        </div>
    </div>
);

// Status Badge Component
const StatusBadge = ({ status }) => {
    const getStatusClasses = (status) => {
        switch (status) {
            case 'DELIVERED':
                return "bg-emerald-100 text-emerald-700";
            case 'CANCEL':
            case 'RETURN':
            case 'REFUND':
                return "bg-rose-100 text-rose-700";
            default:
                return "bg-amber-100 text-amber-700";
        }
    };

    return (
        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${getStatusClasses(status)}`}>
            {status?.replace(/_/g, " ") || "—"}
        </span>
    );
};

export default function ViewOrderModal({ open, onClose, order }) {
    if (!order) return null;

    const { data: auth } = useAuthCheck({ refetchOnWindowFocus: false });
    const currency = auth?.tenant?.currency || "PKR";

    const formatPrice = (price) => {
        if (price === undefined || price === null) return "—";
        const num = Number(price);
        if (isNaN(num)) return price;
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

    const formatDate = (date) => {
        if (!date) return "—";
        return new Date(date).toLocaleDateString(undefined, {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const formatDateTime = (date) => {
        if (!date) return "—";
        return new Date(date).toLocaleString(undefined, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Derived Financials (Calculate on fly to ensure consistency with items)
    const { itemsRevenue, itemsCost, calculatedTotal, calculatedProfit } = useMemo(() => {
        let rev = 0;
        let cost = 0;
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                // Use stored totals from backend to ensure accuracy
                rev += parseFloat(item.totalAmount) || 0;
                cost += parseFloat(item.totalCost) || 0;
            });
        } else {
            // Fallback for legacy simple orders without items
            rev = parseFloat(order.totalAmount) || 0;
            cost = parseFloat(order.totalCost) || 0;
        }

        const shipping = parseFloat(order.shippingCharges) || 0;
        const tax = parseFloat(order.tax) || 0;
        const other = parseFloat(order.otherCharges) || 0;

        // Total Earning = Items - Shipping - Tax - Other
        const total = rev - shipping - tax - other;

        const profit = rev - cost - shipping - tax - other;

        return {
            itemsRevenue: rev,
            itemsCost: cost,
            calculatedTotal: total,
            calculatedProfit: profit
        };
    }, [order]);

    const returnEvents = useMemo(() => {
        const fromRecords = parseReturnEventsFromRecords(order?.returnRecords);
        if (fromRecords.length > 0) return fromRecords;
        return parseReturnEventsFromRemarks(order?.remarks ?? order?.remark);
    }, [order?.returnRecords, order?.remarks, order?.remark]);

    const returnedProductRows = useMemo(() => {
        const orderItemsById = new Map((Array.isArray(order?.items) ? order.items : []).map((row) => [row.id, row]));
        const rows = [];
        returnEvents.forEach((event) => {
            (Array.isArray(event.items) ? event.items : []).forEach((item) => {
                const unitsPerQty = toNumber(
                    item?.unitsPerQty ?? item?.units ?? item?.unit ?? 1,
                    1,
                );
                const restockedUnits = toNumber(
                    item?.restockedUnits ?? item?.restockQty ?? item?.restockedQty,
                    0,
                );
                const returnedQty = toNumber(
                    item?.returnedQty ?? item?.quantity ?? item?.qty ?? item?.returnedQuantity,
                    0,
                );
                const returnedUnits = restockedUnits > 0
                    ? restockedUnits
                    : returnedQty > 0
                        ? returnedQty * unitsPerQty
                        : 0;
                if (returnedUnits <= 0) return;
                const linkedOrderItem = item?.orderItemId ? orderItemsById.get(item.orderItemId) : null;
                const linkedListing = linkedOrderItem?.channelListing;
                const linkedVariant = linkedListing?.productVariant || linkedOrderItem?.productVariant || null;
                const linkedProduct = linkedListing?.product || linkedVariant?.product || linkedOrderItem?.product || null;
                rows.push({
                    at: event.at,
                    orderItemId: item?.orderItemId || null,
                    imageUrl: linkedOrderItem ? resolveOrderItemImage(linkedOrderItem) : null,
                    productDescription:
                        linkedListing?.productName
                        || linkedOrderItem?.productDescription
                        || linkedProduct?.name
                        || item?.productName
                        || item?.name
                        || item?.title
                        || item?.productDescription
                        || "Order Item",
                    sku:
                        linkedVariant?.sku
                        || linkedListing?.externalSku
                        || linkedProduct?.sku
                        || "",
                    returnedQtyEquivalent: returnedUnits / Math.max(1, unitsPerQty),
                    unitsPerQty,
                    returnedUnits,
                    note: event.note || "",
                });
            });
        });
        return rows;
    }, [returnEvents, order?.items]);

    const visibleRemarks = useMemo(() => {
        return normalizeText(order?.remarks || "")
            .split(/\r?\n/)
            .filter((line) => !line.includes(RETURN_EVENT_PREFIX))
            .join("\n")
            .trim();
    }, [order?.remarks]);

    const profitClass = calculatedProfit >= 0 ? "text-emerald-600" : "text-rose-500";

    // Attachments Logic
    const [localAttachments, setLocalAttachments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (order?.attachments) {
            setLocalAttachments(order.attachments);
        } else {
            setLocalAttachments([]);
        }
    }, [order]);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            const newAttachment = await uploadOrderAttachment(order.id, formData);
            setLocalAttachments(prev => [...prev, newAttachment]);
            queryClient.invalidateQueries(['orders']); // Refresh list in background
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            console.error("Failed to upload attachment", error);
            // Optionally show toast
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (attachmentId) => {
        if (!confirm("Are you sure you want to delete this attachment?")) return;
        try {
            await deleteOrderAttachment(order.id, attachmentId);
            setLocalAttachments(prev => prev.filter(a => a.id !== attachmentId));
            queryClient.invalidateQueries(['orders']);
        } catch (error) {
            console.error("Failed to delete attachment", error);
        }
    };

    const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

    // Placeholder for missing images
    const IMG_PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="100%" height="100%" fill="#f3f4f6"/><g fill="#9ca3af"><circle cx="26" cy="30" r="8"/><path d="M8 60l15-15 10 10 12-12 27 27H8z"/></g></svg>'
    );

    const absImg = (path) => {
        if (!path) return IMG_PLACEHOLDER;
        if (path.startsWith("data:") || path.startsWith("http")) return path;
        return `${API_BASE}${path}`;
    };

    const [imageAttachmentPreview, setImageAttachmentPreview] = useState(null);
    const [documentAttachmentPreview, setDocumentAttachmentPreview] = useState(null);

    const attachmentUrl = (filePath) => {
        if (!filePath) return "";
        if (/^https?:\/\//i.test(filePath)) return filePath;
        return `${API_BASE}${filePath}`;
    };

    const handleOpenAttachmentPreview = (attachment) => {
        const url = attachmentUrl(attachment?.filePath);
        if (!url) return;

        if (isImageAttachment(attachment)) {
            const imageAttachments = localAttachments.filter(isImageAttachment);
            const imagePreviewItems = (imageAttachments.length > 0 ? imageAttachments : [attachment])
                .map((att) => ({
                    id: att.id,
                    url: attachmentUrl(att.filePath),
                    alt: att.fileName || "Attachment image",
                    productName: att.fileName || "Attachment image",
                }))
                .filter((img) => Boolean(img.url));

            if (imagePreviewItems.length === 0) return;

            setDocumentAttachmentPreview(null);
            setImageAttachmentPreview({
                orderLabel: order?.orderId || order?.id,
                images: imagePreviewItems,
            });
            return;
        }

        if (isPdfAttachment(attachment)) {
            setImageAttachmentPreview(null);
            setDocumentAttachmentPreview({
                kind: "pdf",
                orderLabel: order?.orderId || order?.id,
                fileName: attachment?.fileName || "attachment.pdf",
                url,
            });
            return;
        }

        if (isOfficeAttachment(attachment)) {
            setImageAttachmentPreview(null);
            setDocumentAttachmentPreview({
                kind: "office",
                orderLabel: order?.orderId || order?.id,
                fileName: attachment?.fileName || "attachment",
                url,
                viewerUrl: officeViewerUrlFromAttachmentUrl(url),
            });
            return;
        }

        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleOpenLabelPreview = () => {
        if (!order?.label) return;
        setImageAttachmentPreview(null);
        setDocumentAttachmentPreview({
            kind: "pdf",
            orderLabel: order?.orderId || order?.id,
            fileName: order.label.split("/").pop() || "label.pdf",
            url: absImg(order.label),
        });
    };

    return (
        <>
            <ViewModal
            open={open}
            onClose={onClose}
            title="Order Details"
            subtitle={`Order ID: ${order.orderId || "—"}`}
            icon={Package}
            widthClass="max-w-5xl"
            heightClass="h-auto max-h-[85vh]"
            footer={
                <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Close
                </button>
            }
        >
            {/* Order Info Section */}
            <CardSection icon={Hash} title="Order Information">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DetailRow label="Order ID" value={order.orderId} copyable />
                    <DetailRow label="Order Date" value={formatDate(order.date)} />
                    <DetailRow label="Status" value={<StatusBadge status={order.status} />} />
                    <DetailRow label="Channel" value={order.tenantChannel?.marketplace} />
                </div>
            </CardSection>

            {/* Product Details Section (Table Layout + Summary) */}
            <CardSection icon={Tag} title="Product Details">
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-500 w-[50%]">Product</th>
                                <th className="px-2 py-3 font-medium text-gray-500 w-[10%] text-center">Qty</th>
                                {/* <th className="px-2 py-3 font-medium text-gray-500 w-[15%] text-center">Unit Cost</th> */}
                                <th className="px-2 py-3 font-medium text-gray-500 w-[15%] text-center">Unit Sale Price</th>
                                <th className="px-4 py-3 font-medium text-gray-500 w-[15%] text-right whitespace-nowrap">Total Sale Price</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {order.items && order.items.length > 0 ? (
                                order.items.map((item, idx) => {
                                    // RESOLVE PRODUCT INFO
                                    const listing = item.channelListing;
                                    const variant = listing?.productVariant || item.productVariant;
                                    const product = listing?.product || variant?.product || item.product;

                                    const imageUrl = resolveOrderItemImage(item);
                                    const name = listing?.productName || item.productDescription || product?.name || "Product";
                                    const sku = variant?.sku || product?.sku || "";
                                    const units = listing?.units || 1;

                                    return (
                                        <tr key={item.id || idx} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center">
                                                        <img
                                                            src={absOrderImage(imageUrl)}
                                                            alt=""
                                                            className="h-full w-full object-contain"
                                                            onError={(e) => { e.currentTarget.src = ORDER_IMG_PLACEHOLDER; }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 line-clamp-1">
                                                            {name}
                                                        </p>
                                                        <p className="text-xs text-gray-400 truncate">
                                                            {sku}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 py-3 align-top text-center text-gray-900 font-medium">{item.quantity}</td>
                                            {/* <td className="px-2 py-3 align-top text-center text-gray-500">{formatPrice(item.unitCost)}</td> */}
                                            {/* <td className="px-2 py-3 align-top text-center text-gray-500">{formatPrice(item.totalCost)}</td> */}
                                            <td className="px-2 py-3 align-top text-center text-gray-500">{formatPrice(item.unitPrice)}</td>
                                            <td className="px-4 py-3 align-top text-right text-gray-900 font-medium">{formatPrice(item.totalAmount)}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">
                                        No items or legacy order format.
                                        {/* Fallback for legacy simple orders if needed, though mostly items exist now */}
                                        {order.productDescription && (
                                            <div className="mt-2 text-sm text-gray-600">
                                                {order.productDescription} (x{order.quantity})
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Summary Footer */}
                <div className="bg-gray-50 rounded-lg p-4 mt-6">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Total Sale Price</span>
                            <span className="font-medium text-gray-900">{formatPrice(itemsRevenue)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Shipping Charges</span>
                            <span className="font-medium text-gray-900">{formatPrice(order.shippingCharges)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Tax</span>
                            <span className="font-medium text-gray-900">{formatPrice(order.tax)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Other Charges</span>
                            <span className="font-medium text-gray-900">{formatPrice(order.otherCharges)}</span>
                        </div>
                        <div className="h-px bg-gray-200 my-1"></div>
                        <div className="flex justify-between text-base font-bold text-gray-900">
                            <span>Total Earning</span>
                            <span>{formatPrice(calculatedTotal)}</span>
                        </div>
                        {/* <div className="flex justify-between text-sm font-semibold mt-2">
                            <span className="text-gray-900">Net Profit</span>
                            <span className={profitClass}>{formatPrice(calculatedProfit)}</span>
                        </div> */}
                    </div>
                </div>
            </CardSection>

            {returnedProductRows.length > 0 && (
                <CardSection icon={RotateCcw} title="Returned Products">
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-gray-500 w-[45%]">Product</th>
                                    <th className="px-3 py-2 font-medium text-gray-500 text-center w-[10%]">Returned Units</th>
                                    <th className="px-3 py-2 font-medium text-gray-500 text-center w-[12%]">Qty Equivalent</th>
                                    <th className="px-3 py-2 font-medium text-gray-500 w-[33%]">Note</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {returnedProductRows.map((row, idx) => (
                                    <tr key={`${row.productDescription}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 align-top">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center">
                                                    <img
                                                        src={absOrderImage(row.imageUrl)}
                                                        alt=""
                                                        className="h-full w-full object-contain"
                                                        onError={(e) => { e.currentTarget.src = ORDER_IMG_PLACEHOLDER; }}
                                                    />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 line-clamp-1">
                                                        {row.productDescription}
                                                    </p>
                                                    <p className="text-xs text-gray-400 truncate">
                                                        {row.sku || "—"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-center text-gray-900 font-medium">{row.returnedUnits}</td>
                                        <td className="px-3 py-2 text-center text-gray-900 font-medium">{row.returnedQtyEquivalent.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-gray-600 break-words whitespace-normal">{row.note || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardSection>
            )}

            {/* Attachments Section */}
            <CardSection icon={Paperclip} title="Attachments">
                <div className="space-y-3">
                    {order.label && (
                        <button
                            type="button"
                            onClick={handleOpenLabelPreview}
                            className="w-full flex items-center justify-between p-2 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 rounded bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                                    <Receipt size={14} className="text-gray-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                                        {order.label.split("/").pop() || "Order Label"}
                                    </p>
                                    <p className="text-xs text-gray-500">Label file</p>
                                </div>
                            </div>
                            <span className="p-1.5 text-gray-500" title="Preview Label">
                                <Download size={14} />
                            </span>
                        </button>
                    )}

                    {localAttachments.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                            {localAttachments.map((att) => (
                                <button
                                    key={att.id}
                                    type="button"
                                    onClick={() => handleOpenAttachmentPreview(att)}
                                    className="w-full flex items-center justify-between p-2 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-8 w-8 rounded bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                                            <Paperclip size={14} className="text-gray-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{resolveAttachmentName(att) || "Attachment"}</p>
                                            <p className="text-xs text-gray-500">{(att.fileSize / 1024).toFixed(1)} KB · {new Date(att.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className="p-1.5 text-gray-500" title="Preview">
                                            <Download size={14} />
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        !order.label ? <p className="text-sm text-gray-500 italic">No attachments added.</p> : null
                    )}
                </div>
            </CardSection>



            {/* Shipping Section */}
            <CardSection icon={Truck} title="Shipping Details">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <DetailRow label="Courier" value={order.courierMedium?.shortName || order.courierMedium?.fullName} />
                    <DetailRow label="Tracking ID" value={order.trackingId} copyable className="col-span-2" />
                </div>
            </CardSection>

            {/* Customer Section (if available) */}
            {(order.customerName || order.customerPhone || order.customerAddress) && (
                <CardSection icon={User} title="Customer Information">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <DetailRow label="Customer Name" value={order.customerName} />
                        <DetailRow label="Phone" value={order.customerPhone} copyable />
                        <DetailRow
                            label="Address"
                            value={order.customerAddress}
                            className="col-span-2 md:col-span-3"
                        />
                    </div>
                </CardSection>
            )}

            {/* Remarks Section (if available) */}
            {(order.remarkType || visibleRemarks) && (
                <CardSection icon={MessageSquare} title="Remarks">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {order.remarkType && (
                            <DetailRow label="Remark Type" value={order.remarkType.name} />
                        )}
                        {visibleRemarks && (
                            <DetailRow
                                label="Notes"
                                value={visibleRemarks}
                                className={order.remarkType ? "" : "col-span-2"}
                            />
                        )}
                    </div>
                </CardSection>
            )}

            {/* Timestamps Section */}
            <CardSection icon={Calendar} title="Timestamps">
                <div className="grid grid-cols-2 gap-4">
                    <DetailRow label="Created At" value={formatDateTime(order.createdAt)} />
                    <DetailRow label="Last Updated" value={formatDateTime(order.updatedAt)} />
                    {order.createdBy && (
                        <DetailRow label="Created By" value={order.createdBy.fullName || order.createdBy.email} className="col-span-2" />
                    )}
                </div>
            </CardSection>
            </ViewModal>

            <ViewModal
                open={Boolean(imageAttachmentPreview)}
                onClose={() => setImageAttachmentPreview(null)}
                title={`Attachment Preview${imageAttachmentPreview?.orderLabel ? ` • ${imageAttachmentPreview.orderLabel}` : ""}`}
                subtitle={imageAttachmentPreview?.images?.length > 1
                    ? `${imageAttachmentPreview.images.length} image files`
                    : imageAttachmentPreview?.images?.[0]?.productName || "Image attachment"}
                widthClass="max-w-5xl"
                heightClass="h-[85vh]"
                footer={(
                    <button
                        className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setImageAttachmentPreview(null)}
                    >
                        Close
                    </button>
                )}
            >
                {imageAttachmentPreview?.images?.length ? (
                    <div className="flex justify-center">
                        <ImageGallery
                            images={imageAttachmentPreview.images}
                            absImg={(url) => url || IMG_PLACEHOLDER}
                            placeholder={IMG_PLACEHOLDER}
                            className="w-full max-w-4xl"
                            thumbnailClassName="h-[62vh] w-full bg-white"
                            showName
                        />
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">No image attachment found.</p>
                )}
            </ViewModal>

            <ViewModal
                open={Boolean(documentAttachmentPreview)}
                onClose={() => setDocumentAttachmentPreview(null)}
                title={`${documentAttachmentPreview?.kind === "office" ? "Document Preview" : "PDF Preview"}${documentAttachmentPreview?.orderLabel ? ` • ${documentAttachmentPreview.orderLabel}` : ""}`}
                subtitle={documentAttachmentPreview?.fileName || "Attachment"}
                widthClass="max-w-5xl"
                heightClass="h-[85vh]"
                footer={(
                    <button
                        className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setDocumentAttachmentPreview(null)}
                    >
                        Close
                    </button>
                )}
            >
                {documentAttachmentPreview?.kind === "office" ? (
                    documentAttachmentPreview?.viewerUrl ? (
                        <iframe
                            src={documentAttachmentPreview.viewerUrl}
                            title={documentAttachmentPreview.fileName || "Office attachment"}
                            className="h-[66vh] w-full rounded-lg border border-gray-200 bg-white"
                        />
                    ) : (
                        <p className="text-sm text-gray-500">No Office document preview available.</p>
                    )
                ) : documentAttachmentPreview?.url ? (
                    <iframe
                        src={documentAttachmentPreview.url}
                        title={documentAttachmentPreview.fileName || "PDF attachment"}
                        className="h-[66vh] w-full rounded-lg border border-gray-200 bg-white"
                    />
                ) : (
                    <p className="text-sm text-gray-500">No document attachment available.</p>
                )}
            </ViewModal>
        </>
    );
}
