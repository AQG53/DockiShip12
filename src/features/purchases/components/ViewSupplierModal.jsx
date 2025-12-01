import { useState, useEffect } from "react";
import { useSupplierProducts } from "../hooks/useSuppliers";
import { usePurchaseOrders, usePurchaseOrder } from "../hooks/usePurchaseOrders";
import ViewModal from "../../../components/ViewModal";
import PurchaseOrderViewModal from "./PurchaseOrderViewModal";
import { User, MapPin, FileText, Package, ShoppingCart, Calendar, DollarSign, Hash, CheckCircle, Clock } from "lucide-react";

export default function ViewSupplierModal({ open, onClose, supplier }) {
    const row = supplier || {};
    const [tab, setTab] = useState('overview'); // 'overview' | 'products' | 'pos'

    useEffect(() => {
        if (open) setTab('overview');
    }, [open]);

    const { data: linked = [], isLoading: loadingLinked } = useSupplierProducts(row.id, {
        enabled: open && !!row.id,
    });

    const { data: posData, isLoading: loadingPos } = usePurchaseOrders({
        supplierId: row.id,
        enabled: open && !!row.id && tab === 'pos',
    });
    const pos = posData?.rows || [];

    const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
    const IMG_PLACEHOLDER =
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="100%" height="100%" fill="#f3f4f6"/><g fill="#9ca3af"><circle cx="26" cy="30" r="8"/><path d="M8 60l15-15 10 10 12-12 27 27H8z"/></g></svg>'
        );

    const absImg = (pathOrUrl) => {
        if (!pathOrUrl) return IMG_PLACEHOLDER;
        if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
        const rel = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
        return `${API_BASE}${rel}`;
    };

    const Item = ({ label, value, icon: Icon }) => (
        <div className="flex flex-col gap-1 py-2">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {label}
            </div>
            <div className="text-sm text-gray-900 font-medium">{value || "—"}</div>
        </div>
    );

    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "products", label: "Products" },
        { id: "pos", label: "Recent Purchase Orders" },
    ];

    const [selectedPo, setSelectedPo] = useState(null);

    return (
        <>
            <ViewModal
                open={open}
                onClose={onClose}
                title="Supplier details"
                tabs={tabs}
                activeTab={tab}
                onTabChange={setTab}
                widthClass="max-w-3xl"
                footer={
                    <button
                        className="inline-flex items-center px-3 py-2 text-sm rounded-md border hover:bg-gray-50"
                        onClick={onClose}
                    >
                        Close
                    </button>
                }
            >
                {tab === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Basic Info Card */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-500" />
                                    <h3 className="text-sm font-semibold text-gray-900">Basic Information</h3>
                                </div>
                                <div className="p-4 space-y-1">
                                    <Item label="Display Name" value={row.companyName} />
                                    <Item label="Currency" value={row.currency} />
                                    <Item label="Contacts" value={row.contacts} />
                                    <Item label="Email" value={row.email} />
                                    <Item label="Phone" value={row.phone} />
                                </div>
                            </div>

                            {/* Address Card */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-gray-500" />
                                    <h3 className="text-sm font-semibold text-gray-900">Address Details</h3>
                                </div>
                                <div className="p-4 space-y-1">
                                    <Item label="Country" value={row.country} />
                                    <Item label="Address 1" value={row.address1} />
                                    <Item label="Address 2" value={row.address2} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Item label="City" value={row.city} />
                                        <Item label="State" value={row.state} />
                                    </div>
                                    <Item label="Zip Code" value={row.zipCode} />
                                </div>
                            </div>
                        </div>

                        {/* Notes Card */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <h3 className="text-sm font-semibold text-gray-900">Notes</h3>
                            </div>
                            <div className="p-4">
                                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {row.notes || <span className="text-gray-400 italic">No notes available.</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'products' && (
                    <div>
                        {loadingLinked ? (
                            <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
                                <span className="text-sm">Loading products...</span>
                            </div>
                        ) : linked.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                <Package className="w-10 h-10 text-gray-400 mb-2" />
                                <span className="text-sm font-medium">No linked products found</span>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        <Package className="w-4 h-4 text-gray-500" />
                                        Linked Products
                                    </h3>
                                    <span className="bg-white px-2 py-0.5 rounded-full text-xs font-medium text-gray-600 border border-gray-200">
                                        {linked.length} items
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:text-xs [&>th]:uppercase [&>th]:tracking-wider">
                                                <th className="w-16">Image</th>
                                                <th>Product Name</th>
                                                <th className="w-32 text-right">Stock Level</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {linked.map((p) => {
                                                const src = absImg(p.imagePath || p.imageUrl || "");
                                                return (
                                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors [&>td]:px-4 [&>td]:py-3">
                                                        <td>
                                                            <div className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                                                                <img
                                                                    src={src}
                                                                    alt=""
                                                                    className="h-full w-full object-contain"
                                                                    onError={(e) => {
                                                                        e.currentTarget.onerror = null;
                                                                        e.currentTarget.src = IMG_PLACEHOLDER;
                                                                    }}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="text-gray-900 font-medium">{p.name || "—"}</td>
                                                        <td className="text-right">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${Number(p.stock) > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                                                }`}>
                                                                {Number.isFinite(p.stock) ? p.stock : "—"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'pos' && (
                    <div className="space-y-4">
                        {loadingPos ? (
                            <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
                                <span className="text-sm">Loading purchase orders...</span>
                            </div>
                        ) : pos.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                <ShoppingCart className="w-10 h-10 text-gray-400 mb-2" />
                                <span className="text-sm font-medium">No purchase orders found</span>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        <ShoppingCart className="w-4 h-4 text-gray-500" />
                                        Recent Orders
                                    </h3>
                                    <span className="bg-white px-2 py-0.5 rounded-full text-xs font-medium text-gray-600 border border-gray-200">
                                        {pos.length} orders
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:text-xs [&>th]:uppercase [&>th]:tracking-wider">
                                                <th>PO Number</th>
                                                <th>Date</th>
                                                <th>Status</th>
                                                <th className="text-right">Total Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {pos.map((po) => (
                                                <tr key={po.id} className="hover:bg-gray-50 transition-colors [&>td]:px-4 [&>td]:py-3">
                                                    <td className="font-medium text-blue-600">
                                                        <button
                                                            className="flex items-center gap-2 hover:underline"
                                                            onClick={() => setSelectedPo(po)}
                                                        >
                                                            <Hash className="w-3 h-3 text-gray-400" />
                                                            {po.poNumber}
                                                        </button>
                                                    </td>
                                                    <td className="text-gray-600">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-3 h-3 text-gray-400" />
                                                            {new Date(po.createdAt).toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize
                                                            ${po.status === 'received' ? 'bg-green-50 text-green-700 border border-green-100' :
                                                                po.status === 'submitted' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                                    'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                                                            {po.status === 'received' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                            {po.status}
                                                        </span>
                                                    </td>
                                                    <td className="text-right font-medium text-gray-900">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <span className="text-gray-400 text-xs">{po.currency}</span>
                                                            {Number(po.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </ViewModal>


            {selectedPo && (
                <PurchaseOrderWrapper
                    poId={selectedPo.id}
                    onClose={() => setSelectedPo(null)}
                />
            )
            }
        </>
    );
}

function PurchaseOrderWrapper({ poId, onClose }) {
    const { data: fullPo, isLoading } = usePurchaseOrder(poId);
    return (
        <PurchaseOrderViewModal
            po={fullPo}
            loading={isLoading}
            onClose={onClose}
            currency={fullPo?.currency || "USD"}
        />
    );
}
