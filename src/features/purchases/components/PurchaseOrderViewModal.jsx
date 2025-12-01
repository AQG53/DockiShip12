import {
    CalendarDays,
    Loader,
    Store,
    Warehouse,
    FileText,
    Package,
    Calculator,
} from "lucide-react";
import ViewModal from "../../../components/ViewModal";
import ImageGallery from "../../../components/ImageGallery";

const card = "rounded-xl border border-gray-200 bg-white shadow-sm";

const statusTone = (status) => {
    const base = (status || "draft").toLowerCase();
    const map = {
        draft: "bg-gray-100 text-gray-700",
        to_purchase: "bg-blue-100 text-blue-700",
        in_transit: "bg-amber-100 text-amber-700",
        partially_received: "bg-amber-100 text-amber-700",
        received: "bg-emerald-100 text-emerald-700",
        canceled: "bg-red-100 text-red-700",
    };
    return map[base] || "bg-gray-100 text-gray-700";
};

const formatCurrency = (value, currency = "USD") => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "—";
    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    } catch {
        return `${currency} ${num.toFixed(2)}`;
    }
};

export default function PurchaseOrderViewModal({ po, loading, onClose, currency }) {
    const open = Boolean(po);
    const items = Array.isArray(po?.items) ? po.items : [];
    const statusLabel = (po?.status || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
    const IMG_PLACEHOLDER =
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="100%" height="100%" fill="#f3f4f6"/><g fill="#9ca3af"><circle cx="26" cy="30" r="8"/><path d="M8 60l15-15 10 10 12-12 27 27H8z"/></g></svg>'
        );
    const absImg = (url) =>
        !url
            ? IMG_PLACEHOLDER
            : /^https?:\/\//i.test(url)
                ? url
                : `${API_BASE}${url}`;

    return (
        <ViewModal
            open={open}
            onClose={onClose}
            title={`Purchase Order ${po?.poNumber || ""}`}
            subtitle={new Date(po?.createdAt || po?.created_at || Date.now()).toLocaleString()}
            widthClass="max-w-5xl"
            headerRight={
                <div className={`text-[12px] px-3 py-1 rounded-full ${statusTone(po?.status)}`}>
                    {statusLabel || "—"}
                </div>
            }
            footer={
                <button
                    className="h-9 rounded-lg px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                    onClick={onClose}
                >
                    Close
                </button>
            }
        >
            {
                loading ? (
                    <div className="flex items-center justify-center py-12" >
                        <Loader className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Supplier Info */}
                            <div className={card}>
                                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 rounded-t-xl">
                                    <Store className="w-4 h-4 text-gray-500" />
                                    <h3 className="text-sm font-semibold text-gray-900">Supplier Details</h3>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Company</p>
                                        <p className="text-sm font-medium text-gray-900">{po?.supplier?.companyName || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email</p>
                                        <p className="text-sm font-medium text-gray-900">{po?.supplier?.email || "—"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Warehouse Info */}
                            <div className={card}>
                                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 rounded-t-xl">
                                    <Warehouse className="w-4 h-4 text-gray-500" />
                                    <h3 className="text-sm font-semibold text-gray-900">Warehouse Details</h3>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Warehouse Name</p>
                                        <p className="text-sm font-medium text-gray-900">{po?.warehouse?.name || po?.warehouse?.code || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Location</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {[
                                                po?.warehouse?.address1,
                                                po?.warehouse?.address2,
                                                po?.warehouse?.city,
                                                po?.warehouse?.state,
                                                po?.warehouse?.zipCode,
                                                po?.warehouse?.country
                                            ].filter(Boolean).join(", ") || "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order Details */}
                        <div className={card}>
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 rounded-t-xl">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <h3 className="text-sm font-semibold text-gray-900">Order Information</h3>
                            </div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Expected Delivery</p>
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4 text-gray-400" />
                                        <p className="text-sm font-medium text-gray-900">
                                            {po?.expectedDeliveryDate
                                                ? new Date(po.expectedDeliveryDate).toLocaleDateString(undefined, {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })
                                                : "—"}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                        {po?.notes || <span className="text-gray-400 italic">No notes available.</span>}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className={card}>
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 rounded-t-xl">
                                <Package className="w-4 h-4 text-gray-500" />
                                <h3 className="text-sm font-semibold text-gray-900">Items</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-[13px]">
                                    <thead>
                                        <tr className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                            <th className="px-3 py-2 text-center w-16">Image</th>
                                            <th className="px-3 py-2 text-left">Product</th>
                                            <th className="px-3 py-2 text-center">Ordered</th>
                                            <th className="px-3 py-2 text-center">Received</th>
                                            <th className="px-3 py-2 text-center">Remaining</th>
                                            <th className="px-3 py-2 text-center">Unit price</th>
                                            <th className="px-3 py-2 text-center">Tax %</th>
                                            <th className="px-3 py-2 text-right">Line total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.map((item) => {
                                            const qty = Number(item.quantity) || 0;
                                            const price = Number(item.unitPrice) || 0;
                                            const taxRate = Number(item.taxRate) || 0;
                                            const subtotal = qty * price;
                                            const tax = subtotal * (taxRate / 100);
                                            const lineTotal = subtotal + tax;
                                            const variant = item.productVariant || {};
                                            const product = item.product || {};
                                            return (
                                                <tr key={item.id}>
                                                    <td className="px-3 py-3 align-middle text-center">
                                                        <ImageGallery
                                                            images={product.images || []}
                                                            absImg={absImg}
                                                            placeholder={IMG_PLACEHOLDER}
                                                            className="w-12 mx-auto"
                                                            thumbnailClassName="h-12 w-12"
                                                            compact={true}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3 align-middle">
                                                        <div className="font-semibold text-gray-900">
                                                            {product.name || "Product"}
                                                        </div>
                                                        <div className="text-xs text-gray-500">SKU: {variant.sku || product.sku || "—"}</div>
                                                        {variant.sizeText && (
                                                            <div className="text-xs text-gray-500">Size: {variant.sizeText}</div>
                                                        )}
                                                        {variant.colorText && (
                                                            <div className="text-xs text-gray-500">Color: {variant.colorText}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 text-center align-middle text-gray-600">{qty}</td>
                                                    <td className="px-3 py-3 text-center align-middle text-emerald-600 font-medium">{item.receivedQty || 0}</td>
                                                    <td className="px-3 py-3 text-center align-middle text-amber-600 font-medium">{Math.max(0, qty - (item.receivedQty || 0))}</td>
                                                    <td className="px-3 py-3 text-center align-middle text-gray-600">{formatCurrency(price, currency)}</td>
                                                    <td className="px-3 py-3 text-center align-middle">{taxRate}</td>
                                                    <td className="px-3 py-3 text-right align-middle font-semibold text-gray-900">
                                                        {formatCurrency(lineTotal, currency)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {items.length === 0 && (
                                    <div className="p-4 text-center text-sm text-gray-500">No items</div>
                                )}
                            </div>
                        </div>

                        <div className={card}>
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between rounded-t-xl">
                                <div className="flex items-center gap-2">
                                    <Calculator className="w-4 h-4 text-gray-500" />
                                    <h3 className="text-sm font-semibold text-gray-900">Order Summary</h3>
                                </div>
                                {(() => {
                                    const total = Number(po?.totalAmount) || 0;
                                    const paid = Number(po?.amountPaid) || 0;
                                    let label = "Unpaid";
                                    let color = "text-red-600 bg-red-50";

                                    if (paid >= total && total > 0) {
                                        label = "Fully Paid";
                                        color = "text-emerald-700 bg-emerald-100";
                                    } else if (paid > 0) {
                                        label = "Partially Paid";
                                        color = "text-amber-700 bg-amber-100";
                                    }

                                    return (
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
                                            {label}
                                        </span>
                                    );
                                })()}
                            </div>
                            <div className="space-y-2 px-4 py-4 text-sm text-gray-700">
                                <div className="flex items-center justify-between">
                                    <span>Subtotal</span>
                                    <span className="font-semibold text-gray-900">{formatCurrency(po?.subtotal, currency)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Product tax</span>
                                    <span className="font-semibold text-gray-900">{formatCurrency(po?.productTax, currency)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Shipping cost</span>
                                    <span className="font-semibold text-gray-900">{formatCurrency(po?.shippingCost, currency)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Shipping tax</span>
                                    <span className="font-semibold text-gray-900">{formatCurrency(po?.shippingTax, currency)}</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-base font-semibold text-gray-900">
                                    <span>Total amount</span>
                                    <span>{formatCurrency(po?.totalAmount, currency)}</span>
                                </div>

                                {/* Payment Status Section */}
                                <div className="border-t border-gray-200 pt-3 mt-3">
                                    <div className="flex items-center justify-between">
                                        <span>Amount Paid</span>
                                        <span className="font-medium text-gray-900">{formatCurrency(po?.amountPaid || 0, currency)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
        </ViewModal>
    );
}
