import { useMemo, useRef } from "react";
import { Package, Truck, User, Calendar, Hash, DollarSign, Tag, MessageSquare, Copy, Check, Paperclip, Download, Trash2, Loader2, Plus } from "lucide-react";
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

    const profitValue = order.netProfit !== undefined ? Number(order.netProfit) : 0;
    const profitClass = profitValue >= 0 ? "text-emerald-600" : "text-rose-500";

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

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

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

            {/* Product Details Section */}
            <CardSection icon={Tag} title="Product Details">
                {order.items && order.items.length > 0 ? (
                    <div className="space-y-3">
                        {order.items.map((item, idx) => {
                            const imageUrl = item.product?.imageUrl || item.productVariant?.imageUrl;
                            return (
                                <div key={item.id || idx} className="flex gap-3 items-start border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                                    {/* Product Image */}
                                    <div className="h-14 w-14 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center">
                                        {imageUrl ? (
                                            <img src={imageUrl} alt={item.productDescription || "Product"} className="h-full w-full object-cover" />
                                        ) : (
                                            <Package className="w-6 h-6 text-gray-300" />
                                        )}
                                    </div>
                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{item.productDescription || item.product?.name || "Product"}</p>
                                        <p className="text-xs text-gray-500">
                                            Qty: {item.quantity} · {formatPrice(item.unitPrice)}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {(item.productVariant?.sku || item.product?.sku)}
                                        </p>
                                    </div>
                                    {/* Price */}
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-medium text-gray-900">{formatPrice(item.totalAmount)}</p>
                                    </div>
                                </div>
                            );
                        })}
                        <div className="pt-2 flex justify-between items-center font-semibold text-gray-900 border-t border-gray-200 mt-2">
                            <span>Total</span>
                            <span>{formatPrice(order.totalAmount)}</span>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <DetailRow
                            label="Product"
                            value={order.productDescription}
                            className="col-span-2 md:col-span-3"
                        />
                        <DetailRow label="Quantity" value={order.quantity} />
                        {order.size && (
                            <DetailRow label="Size" value={order.size.code || order.size.name} />
                        )}
                        {order.color && (
                            <DetailRow label="Color" value={order.color.name} />
                        )}
                    </div>
                )}
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
                                            href={`${API_BASE_URL}${att.filePath}`}
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

            {/* Pricing Section */}
            <CardSection icon={DollarSign} title="Pricing & Profit">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DetailRow label="Cost Price" value={formatPrice(order.costPrice)} />
                    <DetailRow label="Selling Price" value={formatPrice(order.totalAmount)} />
                    <DetailRow label="Shipping Cost" value={formatPrice(order.shippingCost)} />
                    <div>
                        <p className="text-xs font-medium text-gray-500 mb-0.5">Net Profit</p>
                        <p className={`text-sm font-semibold ${profitClass}`}>
                            {formatPrice(order.netProfit)}
                        </p>
                    </div>
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
                </div>
            </CardSection>
        </ViewModal>
    );
}
