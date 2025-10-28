import { Fragment, useState } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel } from "@headlessui/react";
import { X, Package, Calendar, MapPin, Tag, DollarSign, Box, Ruler } from "lucide-react";

export default function ViewProductModal({ open, onClose, product }) {
  if (!product) return null;

  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatPrice = (price, currency = "PKR") => {
    if (!price) return "—";
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

  const card = "rounded-xl border border-gray-200 bg-white shadow-sm";
  const label = "text-xs font-medium text-gray-600";
  const value = "text-sm text-gray-900 font-medium";

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[70]" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="transition-opacity ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="transition ease-out duration-150"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-4xl rounded-xl bg-[#f6f7fb] border border-gray-200 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-gray-200 rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center">
                      <Package size={20} className="text-amber-700" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">Product Details</h2>
                      <p className="text-xs text-gray-500">View product information</p>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4 max-h-[calc(90vh-100px)] overflow-y-auto">
                  {/* Simple Product or Parent Product Info */}
                  {(!hasVariants) && (
                    <div className={card}>
                      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <Package size={16} className="text-blue-600" />
                            Parent Product
                          </h3>
                      </div>

                      <div className="p-4 grid grid-cols-2 gap-4">
                        {/* Product Name */}
                        <div className="col-span-2">
                          <p className={label}>Product Name</p>
                          <p className={`${value} text-lg`}>{product.name || "—"}</p>
                        </div>

                        {/* SKU */}
                        <div>
                          <p className={label}>SKU</p>
                          <p className={value}>{product.sku || "—"}</p>
                        </div>

                        {/* Brand */}
                        <div>
                          <p className={label}>Brand</p>
                          <p className={value}>{product.brand || "—"}</p>
                        </div>

                        {/* Status */}
                        <div>
                          <p className={label}>Status</p>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                              product.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {product.status?.toUpperCase() || "—"}
                          </span>
                        </div>

                        {/* Origin Country */}
                        <div>
                          <p className={label}>Origin Country</p>
                          <p className={value}>{product.originCountry || "—"}</p>
                        </div>

                        {/* Retail Price (Simple Product) */}
                        {!hasVariants && (
                          <div>
                            <p className={label}>Retail Price</p>
                            <p className={value}>{product.retailPrice ? formatPrice(product.retailPrice) : "—"}</p>
                          </div>
                        )}

                        {/* Stock (Simple Product) */}
                        {!hasVariants && (
                          <div>
                            <p className={label}>Stock on Hand</p>
                            <p className={value}>{product.stock || product.stockOnHand || "—"}</p>
                          </div>
                        )}

                        {/* Weight (Simple Product) */}
                        {!hasVariants && product.weight && (
                          <div>
                            <p className={label}>Weight</p>
                            <p className={value}>
                              {product.weight.value} {product.weight.unit}
                              {product.weight.subValue && ` ${product.weight.subValue} ${product.weight.subUnit}`}
                            </p>
                          </div>
                        )}

                        {/* Dimensions (Simple Product) */}
                        {!hasVariants && product.dimensions && (
                          <div>
                            <p className={label}>Dimensions (L × W × H)</p>
                            <p className={value}>
                              {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height}{" "}
                              {product.dimensions.unit}
                            </p>
                          </div>
                        )}

                        {/* Last Updated */}
                        <div className="col-span-2">
                          <p className={label}>Last Updated</p>
                          <p className={value}>{formatDate(product.updatedAt)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Parent Product with Variants */}
                  {hasVariants && (
                    <>
                      {/* Parent Product Info */}
                      <div className={card}>
                        <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <Package size={16} className="text-blue-600" />
                            Parent Product
                          </h3>
                        </div>

                        <div className="p-4 grid grid-cols-2 gap-4">
                          {/* Product Name */}
                          <div className="col-span-2">
                            <p className={label}>Product Name</p>
                            <p className={`${value} text-lg`}>{product.name || "—"}</p>
                          </div>

                          {/* SKU */}
                          <div>
                            <p className={label}>Parent SKU</p>
                            <p className={value}>{product.sku || "—"}</p>
                          </div>

                          {/* Brand */}
                          <div>
                            <p className={label}>Brand</p>
                            <p className={value}>{product.brand || "—"}</p>
                          </div>

                          {/* Status */}
                          <div>
                            <p className={label}>Status</p>
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                                product.status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {product.status?.toUpperCase() || "—"}
                            </span>
                          </div>

                          {/* Origin Country */}
                          <div>
                            <p className={label}>Origin Country</p>
                            <p className={value}>{product.originCountry || "—"}</p>
                          </div>

                          {/* Last Updated */}
                          <div className="col-span-2">
                            <p className={label}>Last Updated</p>
                            <p className={value}>{formatDate(product.updatedAt)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Variants */}
                      <div className={card}>
                        <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-yellow-50">
                          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <Box size={16} className="text-amber-600" />
                            Variants ({product.variants.length})
                          </h3>
                        </div>

                        <div className="p-4">
                          {/* Variants Table */}
                          <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <div className="grid grid-cols-4 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-700">
                              <div>Variant SKU</div>
                              <div>Status</div>
                              <div>Retail Price</div>
                              <div>Stock on Hand</div>
                            </div>

                            <div className="divide-y divide-gray-100">
                              {product.variants.map((variant, idx) => (
                                <div
                                  key={variant.id || idx}
                                  className="grid grid-cols-4 px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="font-medium">{variant.sku || "—"}</div>
                                  <div>
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                        variant.status === "active"
                                          ? "bg-green-100 text-green-700"
                                          : "bg-gray-200 text-gray-700"
                                      }`}
                                    >
                                      {variant.status?.toUpperCase() || "—"}
                                    </span>
                                  </div>
                                  <div>{formatPrice(variant.retailPrice)}</div>
                                  <div>{variant.stockOnHand ?? "—"}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 bg-white px-4 py-3 rounded-b-xl flex items-center justify-end gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}