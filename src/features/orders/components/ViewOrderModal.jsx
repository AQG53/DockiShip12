import { useMemo, useRef } from "react";
import { Package, Truck, User, Calendar, Hash, DollarSign, Tag, MessageSquare, Copy, Check, Paperclip, Download, Trash2, Loader2, Plus, Receipt } from "lucide-react";
import { useState, useEffect } from "react";
import ViewModal from "../../../components/ViewModal";
import { useAuthCheck } from "../../auth/hooks/useAuthCheck";
import { uploadOrderAttachment, deleteOrderAttachment } from "../../../lib/api";
import { useQueryClient } from "@tanstack/react-query";


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
                const qty = parseFloat(item.quantity) || 0;
                const price = parseFloat(item.unitPrice) || 0;
                const unitCost = parseFloat(item.unitCost) || 0;
                rev += (qty * price);
                cost += (qty * unitCost);
            });
        } else {
            // Fallback for legacy simple orders without items
            rev = parseFloat(order.totalAmount) || 0;
            cost = parseFloat(order.totalCost) || 0;
        }

        const shipping = parseFloat(order.shippingCharges) || 0;
        const tax = parseFloat(order.tax) || 0;
        const other = parseFloat(order.otherCharges) || 0;

        // Total Amount = Items + Shipping + Tax + Other
        const total = rev + shipping + tax + other;

        const profit = rev - cost - shipping - tax - other;

        return {
            itemsRevenue: rev,
            itemsCost: cost,
            calculatedTotal: total,
            calculatedProfit: profit
        };
    }, [order]);

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

    return (
        <ViewModal
            open={open}
            onClose={onClose}
            title="Order Details"
            subtitle={`Order ID: ${order.orderId || "—"}`}
            icon={Package}
            widthClass="max-w-3xl"
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
                                <th className="px-2 py-3 font-medium text-gray-500 w-[15%] text-center">Unit Cost</th>
                                <th className="px-2 py-3 font-medium text-gray-500 w-[15%] text-center">Unit Sale Price</th>
                                <th className="px-4 py-3 font-medium text-gray-500 w-[10%] text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {order.items && order.items.length > 0 ? (
                                order.items.map((item, idx) => {
                                    const imageUrl = item.product?.images?.[0]?.url;
                                    return (
                                        <tr key={item.id || idx} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center">
                                                        <img
                                                            src={absImg(imageUrl)}
                                                            alt=""
                                                            className="h-full w-full object-contain"
                                                            onError={(e) => { e.currentTarget.src = IMG_PLACEHOLDER; }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 line-clamp-1">
                                                            {item.productDescription || item.product?.name || "Product"}
                                                        </p>
                                                        <p className="text-xs text-gray-400 truncate">
                                                            {(item.productVariant?.sku || item.product?.sku)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 py-3 align-top text-center text-gray-900 font-medium">{item.quantity}</td>
                                            <td className="px-2 py-3 align-top text-center text-gray-500">{formatPrice(item.unitCost)}</td>
                                            <td className="px-2 py-3 align-top text-center text-gray-500">{formatPrice(item.unitPrice)}</td>
                                            <td className="px-4 py-3 align-top text-right text-gray-900 font-medium">{formatPrice(item.totalAmount)}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
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
                            <span className="text-gray-500">Subtotal (Items)</span>
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
                            <span>Total Order Amount</span>
                            <span>{formatPrice(calculatedTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold mt-2">
                            <span className="text-gray-900">Net Profit</span>
                            <span className={profitClass}>{formatPrice(calculatedProfit)}</span>
                        </div>
                    </div>
                </div>
            </CardSection>

            {/* Attachments Section */}
            <CardSection icon={Paperclip} title="Attachments">
                <div className="space-y-3">
                    {order.attachments && order.attachments.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                            {order.attachments.map((att) => (
                                <div key={att.id} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-8 w-8 rounded bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                                            <Paperclip size={14} className="text-gray-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{att.fileName}</p>
                                            <p className="text-xs text-gray-500">{(att.fileSize / 1024).toFixed(1)} KB · {new Date(att.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`${API_BASE}${att.filePath}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                            title="Download/View"
                                        >
                                            <Download size={14} />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 italic">No attachments added.</p>
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
            {(order.remarkType || order.remarks) && (
                <CardSection icon={MessageSquare} title="Remarks">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {order.remarkType && (
                            <DetailRow label="Remark Type" value={order.remarkType.name} />
                        )}
                        {order.remarks && (
                            <DetailRow
                                label="Notes"
                                value={order.remarks}
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
    );
}
