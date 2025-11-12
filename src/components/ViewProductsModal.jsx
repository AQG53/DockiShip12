import { Fragment, useMemo, useState } from "react";
import {
  Dialog,
  Transition,
  TransitionChild,
  DialogPanel,
} from "@headlessui/react";
import {
  X,
  Package,
  Calendar,
  MapPin,
  Tag,
  DollarSign,
  Box,
  Ruler,
} from "lucide-react";
import {
  useGetProduct,
  useProductMarketplaceListings,
} from "../hooks/useProducts";
import { useAuthCheck } from "../hooks/useAuthCheck";
import { deleteProductImage } from "../lib/api";
import { useSuppliers } from "../hooks/useSuppliers";

export default function ViewProductModal({ open, onClose, product }) {
  if (!product) return null;

  const {
    data: detail,
    refetch,
    isLoading: loadingDetail,
  } = useGetProduct(open && product?.id ? product.id : null, {
    refetchOnWindowFocus: false,
  });
  const { data: auth } = useAuthCheck({ refetchOnWindowFocus: false });

  const p = detail || product;

  const currency = auth?.tenant?.currency || "PKR";
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

  const variantList = useMemo(() => {
    const list = Array.isArray(p?.ProductVariant)
      ? p.ProductVariant
      : Array.isArray(p?.variants)
      ? p.variants
      : [];
    return Array.isArray(list) ? list : [];
  }, [p]);

  const images = Array.isArray(p?.images) ? p.images : [];

  const imagesByVariant = useMemo(() => {
    const byVar = new Map();
    const productLevel = [];
    const varIds = new Set(variantList.map((v) => v.id));
    images.forEach((img) => {
      const u = String(img.url || "");
      const parts = u.split("/uploads/")[1]?.split("/") || [];
      const maybeVar = parts.length >= 3 ? parts[1] : null;
      if (maybeVar && varIds.has(maybeVar)) {
        if (!byVar.has(maybeVar)) byVar.set(maybeVar, []);
        byVar.get(maybeVar).push(img);
      } else {
        productLevel.push(img);
      }
    });
    return { productLevel, byVar };
  }, [images, variantList]);

  const hasVariants = useMemo(() => {
    if (String(p?.kind || "").toLowerCase() === "simple") return false;
    const t = String(p?.type || p?.productType || "").toLowerCase();
    if (t === "simple") return false;
    if (!variantList || variantList.length === 0) return false;
    if (variantList.length === 1) {
      const v = variantList[0] || {};
      const sameSku = v?.sku && p?.sku && v.sku === p.sku;
      const hasNoAttrs = !v?.sizeText && !v?.sizeCode && !v?.attributes;
      if (sameSku && hasNoAttrs) return false;
    }
    return true;
  }, [p, variantList]);

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return "—";
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
  const [tab, setTab] = useState("details");
  const productId = p?.id;
  const {
    data: listings = [],
    isLoading: listingsLoading,
  } = useProductMarketplaceListings(productId, { enabled: !!productId });
  const { data: supplierRows = [], isLoading: suppliersLoading } = useSuppliers({
    refetchOnWindowFocus: false,
  });

  const supplierOptions = useMemo(() => {
    const base = Array.isArray(supplierRows) ? supplierRows : [];
    return [
      "Select",
      ...base.map((s) => ({ value: s.id, label: s.companyName || s.id })),
    ];
  }, [supplierRows]);

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
                      <h2 className="text-base font-semibold text-gray-900">
                        Product Details
                      </h2>
                      <p className="text-xs text-gray-500">
                        View product information
                      </p>
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
                  {loadingDetail && (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-5 w-40 bg-gray-200 rounded" />
                      <div className="h-32 bg-gray-200 rounded" />
                      <div className="h-5 w-56 bg-gray-200 rounded" />
                      <div className="h-24 bg-gray-200 rounded" />
                    </div>
                  )}

                  {!loadingDetail && (
                    <>
                      {/* Tabs */}
                      <div className="px-1">
                        <div className="inline-flex items-center gap-2">
                          <button
                            className={`px-3 py-1.5 text-sm rounded-md border ${
                              tab === "details"
                                ? "bg-gray-100 border-gray-300 text-gray-900"
                                : "border-transparent text-gray-600 hover:bg-gray-50"
                            }`}
                            onClick={() => setTab("details")}
                          >
                            Details
                          </button>
                          <button
                            className={`px-3 py-1.5 text-sm rounded-md border ${
                              tab === "suppliers"
                                ? "bg-gray-100 border-gray-300 text-gray-900"
                                : "border-transparent text-gray-600 hover:bg-gray-50"
                            }`}
                            onClick={() => setTab("suppliers")}
                          >
                            Suppliers
                          </button>
                          <button
                            className={`px-3 py-1.5 text-sm rounded-md border ${
                              tab === "marketplaces"
                                ? "bg-gray-100 border-gray-300 text-gray-900"
                                : "border-transparent text-gray-600 hover:bg-gray-50"
                            }`}
                            onClick={() => setTab("marketplaces")}
                          >
                            Marketplaces
                          </button>
                        </div>
                      </div>

                      {/* DETAILS TAB */}
                      {tab === "details" && (
                        <>
                          {/* Simple Product Info */}
                          {!hasVariants && (
                            <div className={card}>
                              <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                  <Package
                                    size={16}
                                    className="text-blue-600"
                                  />
                                  Product
                                </h3>
                              </div>

                              <div className="p-4 grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                  <p className={label}>Product Name</p>
                                  <p className={`${value} text-lg`}>
                                    {p.name || "—"}
                                  </p>
                                </div>

                                <div>
                                  <p className={label}>SKU</p>
                                  <p className={value}>{p.sku || "—"}</p>
                                </div>

                                <div>
                                  <p className={label}>Brand</p>
                                  <p className={value}>{p.brand || "—"}</p>
                                </div>

                                <div>
                                  <p className={label}>Status</p>
                                  <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                                      p.status === "active"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-200 text-gray-700"
                                    }`}
                                  >
                                    {p.status?.toUpperCase() || "—"}
                                  </span>
                                </div>

                                <div>
                                  <p className={label}>Size</p>
                                  <p className={value}>{p.sizeText || "—"}</p>
                                </div>

                                <div>
                                  <p className={label}>Color</p>
                                  <p className={value}>{p.colorText || "—"}</p>
                                </div>

                                <div>
                                  <p className={label}>Origin Country</p>
                                  <p className={value}>
                                    {p.originCountry || "—"}
                                  </p>
                                </div>

                                <div>
                                  <p className={label}>Retail Price</p>
                                  <p className={value}>
                                    {p?.retailPrice != null
                                      ? formatPrice(p.retailPrice)
                                      : "—"}
                                  </p>
                                </div>

                                <div>
                                  <p className={label}>Stock on Hand</p>
                                  <p className={value}>
                                    {p?.stock ?? p?.stockOnHand ?? "—"}
                                  </p>
                                </div>

                                {p?.weight != null && (
                                  <div>
                                    <p className={label}>Weight</p>
                                    <p className={value}>
                                      {p.weight} {p.weightUnit || ""}
                                    </p>
                                  </div>
                                )}

                                {(p?.length != null ||
                                  p?.width != null ||
                                  p?.height != null) && (
                                  <div>
                                    <p className={label}>
                                      Dimensions (L × W × H)
                                    </p>
                                    <p className={value}>
                                      {p?.length ?? "—"} ×{" "}
                                      {p?.width ?? "—"} ×{" "}
                                      {p?.height ?? "—"}{" "}
                                      {p?.dimensionUnit || ""}
                                    </p>
                                  </div>
                                )}

                                <div>
                                  <p className={label}>Last Updated</p>
                                  <p className={value}>
                                    {formatDate(p.updatedAt)}
                                  </p>
                                </div>

                                <div className="col-span-2">
                                  <p className={label}>Images</p>
                                  {imagesByVariant.productLevel.length === 0 ? (
                                    <p className="text-xs text-gray-500">
                                      No images
                                    </p>
                                  ) : (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {imagesByVariant.productLevel.map(
                                        (img) => (
                                          <Thumb
                                            key={img.id}
                                            img={img}
                                            absImg={absImg}
                                            placeholder={IMG_PLACEHOLDER}
                                            onDelete={async () => {
                                              try {
                                                await deleteProductImage(
                                                  p.id,
                                                  img.id
                                                );
                                                await refetch?.();
                                              } catch (e) {
                                                console.error(e);
                                              }
                                            }}
                                          />
                                        )
                                      )}
                                    </div>
                                  )}
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
                                    <Package
                                      size={16}
                                      className="text-blue-600"
                                    />
                                    Parent Product
                                  </h3>
                                </div>

                                <div className="p-4 grid grid-cols-2 gap-4">
                                  <div className="col-span-2">
                                    <p className={label}>Product Name</p>
                                    <p className={`${value} text-lg`}>
                                      {p.name || "—"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className={label}>Parent SKU</p>
                                    <p className={value}>
                                      {p.sku || "—"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className={label}>Brand</p>
                                    <p className={value}>
                                      {p.brand || "—"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className={label}>Status</p>
                                    <span
                                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                                        p.status === "active"
                                          ? "bg-green-100 text-green-700"
                                          : "bg-gray-200 text-gray-700"
                                      }`}
                                    >
                                      {p.status?.toUpperCase() || "—"}
                                    </span>
                                  </div>

                                  <div>
                                    <p className={label}>Origin Country</p>
                                    <p className={value}>
                                      {p.originCountry || "—"}
                                    </p>
                                  </div>

                                  <div className="col-span-2">
                                    <p className={label}>Last Updated</p>
                                    <p className={value}>
                                      {formatDate(p.updatedAt)}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Variants */}
                              <div className={card}>
                                <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-yellow-50">
                                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                    <Box
                                      size={16}
                                      className="text-amber-600"
                                    />
                                    Variants ({variantList.length})
                                  </h3>
                                </div>

                                <div className="p-4">
                                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                                    <div className="grid grid-cols-6 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-700">
                                      <div>Size</div>
                                      <div>Color</div>
                                      <div>Variant SKU</div>
                                      <div>Status</div>
                                      <div>Retail Price</div>
                                      <div>Stock on Hand</div>
                                    </div>

                                    <div className="divide-y divide-gray-100">
                                      {variantList.map((variant, idx) => {
                                        const imgs =
                                          imagesByVariant.byVar.get(
                                            variant.id
                                          ) || [];
                                        return (
                                          <div
                                            key={variant.id || idx}
                                            className="px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 transition-colors"
                                          >
                                            <div className="grid grid-cols-6 items-center gap-2">
                                              <div>{variant.sizeText || variant?.size?.name || variant?.size?.code || "—"}</div>
                                              <div>{variant.colorText || "—"}</div>
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
                                            <div className="mt-2">
                                              {imgs.length === 0 ? (
                                                <p className="text-xs text-gray-500">
                                                  No images
                                                </p>
                                              ) : (
                                                <div className="flex flex-wrap gap-2">
                                                  {imgs.map((img) => (
                                                    <Thumb
                                                      key={img.id}
                                                      img={img}
                                                      absImg={absImg}
                                                      placeholder={
                                                        IMG_PLACEHOLDER
                                                      }
                                                      onDelete={async () => {
                                                        try {
                                                          await deleteProductImage(
                                                            p.id,
                                                            img.id
                                                          );
                                                          await refetch?.();
                                                        } catch (e) {
                                                          console.error(e);
                                                        }
                                                      }}
                                                    />
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      )}

                      {/* MARKETPLACES TAB */}
                      {tab === "marketplaces" && (
                        <div className={card}>
                          <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                            <h3 className="text-sm font-semibold text-gray-800">
                              Marketplaces
                            </h3>
                          </div>
                          <div className="p-4">
                            {listingsLoading ? (
                              <div className="text-sm text-gray-500">
                                Loading…
                              </div>
                            ) : !Array.isArray(listings) ||
                              listings.length === 0 ? (
                              <div className="text-sm text-gray-500">
                                No marketplace listings.
                              </div>
                            ) : (
                              <div className="rounded-lg border border-gray-200 overflow-hidden">
                                <div className="grid grid-cols-[1.2fr_1.4fr_1fr_0.7fr_1fr] bg-gray-50 text-[12px] font-semibold text-gray-700">
                                  <div className="px-3 py-2">
                                    Product Name
                                  </div>
                                  <div className="px-3 py-2">
                                    Marketplace
                                  </div>
                                  <div className="px-3 py-2">SKU</div>
                                  <div className="px-3 py-2 text-center">
                                    Units
                                  </div>
                                  <div className="px-3 py-2">Variant</div>
                                </div>
                                <div className="divide-y divide-gray-100">
                                  {listings.map((l) => {
                                    const provider =
                                      l?.channel?.provider ??
                                      l?.provider ??
                                      "";
                                    const channelName =
                                      l?.channel?.name ??
                                      l?.channelName ??
                                      "";
                                    const sku =
                                      l?.sku ?? l?.externalSku ?? "";
                                    const units = Number.isFinite(l?.units)
                                      ? l.units
                                      : l?.units ?? "";
                                    const variantId =
                                      l?.productVariantId ??
                                      l?.variantId ??
                                      null;
                                    return (
                                      <div
                                        key={
                                          l.id ||
                                          provider + channelName + sku
                                        }
                                        className="grid grid-cols-[1.2fr_1.4fr_1fr_0.7fr_1fr] bg-white"
                                      >
                                        <div className="px-3 py-2">
                                          {provider || "—"}
                                        </div>
                                        <div className="px-3 py-2">
                                          {channelName || "—"}
                                        </div>
                                        <div className="px-3 py-2 font-mono text-[13px]">
                                          {sku || "—"}
                                        </div>
                                        <div className="px-3 py-2 text-center">
                                          {units}
                                        </div>
                                        <div className="px-3 py-2">
                                          {variantList.find(
                                            (v) => v.id === variantId
                                          )?.sku ||
                                            (variantId
                                              ? String(variantId)
                                              : "—")}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SUPPLIERS TAB */}
                      {tab === "suppliers" && (
                        <div className={card}>
                          <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                            <h3 className="text-sm font-semibold text-gray-800">
                              Suppliers
                            </h3>
                          </div>
                          <div className="p-4">
                            {Array.isArray(p?.supplierLinks) &&
                            p.supplierLinks.length > 0 ? (
                              <div className="rounded-lg border border-gray-200 overflow-hidden">
                                <div className="grid grid-cols-2 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-700">
                                  <div>Name</div>
                                  <div>Currency</div>
                                </div>
                                <div className="divide-y divide-gray-100">
                                  {p.supplierLinks.map((lnk, idx) => (
                                    <div
                                      key={lnk?.supplier?.id || idx}
                                      className="grid grid-cols-2 px-4 py-2.5 text-sm text-gray-800 items-center"
                                    >
                                      <div className="truncate">
                                        {lnk?.supplier?.companyName ||
                                          lnk?.supplier?.id ||
                                          "—"}
                                      </div>
                                      <div>
                                        {lnk?.supplier?.currency || "—"}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">
                                No suppliers linked.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
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

function Thumb({ img, onDelete, absImg, placeholder }) {
  return (
    <div className="relative group">
      <a href={absImg(img.url)} target="_blank" rel="noreferrer">
        <img
          src={absImg(img.url)}
          alt={img.alt || "Image"}
          className="h-20 w-20 object-cover rounded-md border border-gray-200 bg-gray-100"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = placeholder;
          }}
        />
      </a>
      <button
        onClick={onDelete}
        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-red-200 text-red-600 rounded-full h-6 w-6 text-xs"
        title="Delete"
      >
        ×
      </button>
    </div>
  );
}
