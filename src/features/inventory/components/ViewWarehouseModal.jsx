import { useState, useEffect } from "react";
import { Warehouse, Package } from "lucide-react";
import { useWarehouseStock } from "../hooks/useWarehouses";
import ViewModal from "../../../components/ViewModal";
import ImageGallery from "../../../components/ImageGallery";

export default function ViewWarehouseModal({ open, onClose, warehouse }) {
    const [tab, setTab] = useState("details");
    const { data, isLoading } = useWarehouseStock(open && warehouse?.id ? warehouse.id : null);

    useEffect(() => {
        if (open) setTab("details");
    }, [open]);

    const wh = data?.warehouse || warehouse;
    const stock = data?.stock || [];

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

    const card = "rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden";
    const label = "text-xs font-medium text-gray-600";
    const value = "text-sm text-gray-900 font-medium";

    const tabs = [
        { id: "details", label: "Details" },
        { id: "stock", label: `Stock (${stock.length})` },
    ];

    return (
        <ViewModal
            open={open}
            onClose={onClose}
            title="Warehouse Details"
            subtitle={wh?.name || "View warehouse information"}
            icon={Warehouse}
            widthClass="max-w-4xl"
            tabs={tabs}
            activeTab={tab}
            onTabChange={setTab}
            footer={
                <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Close
                </button>
            }
        >
            {isLoading && (
                <div className="space-y-3 animate-pulse">
                    <div className="h-5 w-40 bg-gray-200 rounded" />
                    <div className="h-32 bg-gray-200 rounded" />
                </div>
            )}

            {!isLoading && (
                <>
                    {/* DETAILS TAB */}
                    {tab === "details" && (
                        <div className={card}>
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                                <Warehouse className="w-4 h-4 text-gray-500" />
                                <h3 className="text-sm font-semibold text-gray-900">Warehouse Information</h3>
                            </div>

                            <div className="p-4 grid grid-cols-2 gap-4">
                                <div>
                                    <p className={label}>Warehouse Code</p>
                                    <p className={value}>{wh?.code || "—"}</p>
                                </div>

                                <div>
                                    <p className={label}>Name</p>
                                    <p className={value}>{wh?.name || "—"}</p>
                                </div>

                                <div>
                                    <p className={label}>Status</p>
                                    <span
                                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${wh?.isActive
                                            ? "bg-green-100 text-green-700"
                                            : "bg-gray-200 text-gray-700"
                                            }`}
                                    >
                                        {wh?.isActive ? "ACTIVE" : "INACTIVE"}
                                    </span>
                                </div>

                                <div className="col-span-2">
                                    <p className={label}>Address</p>
                                    <p className={value}>{wh?.address1 || "—"}</p>
                                    {wh?.address2 && <p className="text-sm text-gray-600 mt-0.5">{wh.address2}</p>}
                                </div>

                                <div>
                                    <p className={label}>City</p>
                                    <p className={value}>{wh?.city || "—"}</p>
                                </div>

                                <div>
                                    <p className={label}>State / Province</p>
                                    <p className={value}>{wh?.state || "—"}</p>
                                </div>

                                <div>
                                    <p className={label}>Zip Code</p>
                                    <p className={value}>{wh?.zipCode || "—"}</p>
                                </div>

                                <div>
                                    <p className={label}>Country</p>
                                    <p className={value}>{wh?.country || "—"}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STOCK TAB */}
                    {tab === "stock" && (
                        <div className={card}>
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                                <Package className="w-4 h-4 text-gray-500" />
                                <h3 className="text-sm font-semibold text-gray-900">Stock ({stock.length} variants)</h3>
                            </div>

                            <div className="p-4">
                                {stock.length === 0 ? (
                                    <div className="text-sm text-gray-500 text-center py-8">
                                        No stock in this warehouse
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {stock.map((item) => {
                                            const images = item.product?.images || [];
                                            return (
                                                <div
                                                    key={item.productVariantId}
                                                    className="rounded-lg border border-gray-200 overflow-hidden bg-white hover:shadow-sm transition-shadow"
                                                >
                                                    <div className="p-4">
                                                        <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-start">
                                                            {/* Images */}
                                                            <div className="w-24">
                                                                {images.length === 0 ? (
                                                                    <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center">
                                                                        <Package className="w-8 h-8 text-gray-400" />
                                                                    </div>
                                                                ) : (
                                                                    <ImageGallery
                                                                        images={images}
                                                                        absImg={absImg}
                                                                        placeholder={IMG_PLACEHOLDER}
                                                                    />
                                                                )}
                                                            </div>

                                                            {/* Product Info */}
                                                            <div className="space-y-2">
                                                                <div>
                                                                    <h4 className="text-sm font-semibold text-gray-900">
                                                                        {item.product?.name || "—"}
                                                                    </h4>
                                                                    <p className="text-xs text-gray-500">
                                                                        SKU: {item.productVariant?.sku || item.product?.sku || "—"}
                                                                    </p>
                                                                </div>

                                                                <div className="flex items-center gap-3 text-xs">
                                                                    {item.productVariant?.sizeText && (
                                                                        <div>
                                                                            <span className="text-gray-600">Size: </span>
                                                                            <span className="font-medium text-gray-900">{item.productVariant.sizeText}</span>
                                                                        </div>
                                                                    )}
                                                                    {item.productVariant?.colorText && (
                                                                        <div>
                                                                            <span className="text-gray-600">Color: </span>
                                                                            <span className="font-medium text-gray-900">{item.productVariant.colorText}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Quantity */}
                                                            <div className="text-right">
                                                                <p className="text-xs text-gray-600 mb-0.5">Stock</p>
                                                                <p className="text-2xl font-bold text-gray-900">{item.quantity}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </ViewModal>
    );
}
