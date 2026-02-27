import { useMemo, useState, useEffect } from "react";
import {
  Package,
  Box,
  Store,
  Truck,
  History,
} from "lucide-react";
import {
  useGetProduct,
  useProductMarketplaceListings,
} from "../hooks/useProducts";
import { useAuthCheck } from "../../auth/hooks/useAuthCheck";
import { useSuppliers } from "../../purchases/hooks/useSuppliers";
import ViewModal from "../../../components/ViewModal";
import ImageGallery from "../../../components/ImageGallery";
import SelectCompact from "../../../components/SelectCompact";

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
  const formatPackaging = (type, qty) => {
    if (!type) return "Sold individually";
    const normalized = String(type).toUpperCase();
    if (normalized === "PAIR") return "Pairs (2 units)";
    if (normalized === "UNITS") {
      return qty ? `${qty} units per set` : "Units (set)";
    }
    if (normalized === "PIECES_PER_PACK") {
      return qty ? `${qty} pcs per pack` : "Pieces per pack";
    }
    return normalized.replace(/_/g, " ");
  };

  const card = "rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden";
  const label = "text-xs font-medium text-gray-600";
  const value = "text-sm text-gray-900 font-medium";
  const [tab, setTab] = useState("details");
  const [marketplaceFilter, setMarketplaceFilter] = useState([]);

  // Reset tab to details and clear filter when modal opens
  useEffect(() => {
    if (open) {
      setTab("details");
      setMarketplaceFilter([]);
    }
  }, [open]);
  const productId = p?.id;
  const {
    data: listings = [],
    isLoading: listingsLoading,
  } = useProductMarketplaceListings(productId, { enabled: !!productId });

  const marketplaceOptions = useMemo(() => {
    const s = new Set();
    if (Array.isArray(listings)) {
      listings.forEach((l) => {
        const name = l?.channel?.marketplace ?? l?.channel?.name ?? "";
        if (name) s.add(name);
      });
    }
    return Array.from(s).sort().map((m) => ({ value: m, label: m }));
  }, [listings]);

  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      if (!marketplaceFilter || marketplaceFilter.length === 0) return true;
      const channelName = l?.channel?.marketplace ?? l?.channel?.name ?? "";
      return marketplaceFilter.includes(channelName);
    });
  }, [listings, marketplaceFilter]);

  const { data: supplierRows = [], isLoading: suppliersLoading } = useSuppliers({
    refetchOnWindowFocus: false,
  });

  const tabs = [
    { id: "details", label: "Details" },
    { id: "avgCostHistory", label: "Avg Cost History" },
    { id: "suppliers", label: "Suppliers" },
    { id: "marketplaces", label: "Marketplaces" },
  ];

  const formatUtcDateOnly = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "—";
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${m}-${day}-${y}`;
  };

  const sourceTypeLabel = (sourceType) => {
    const key = String(sourceType || "").toUpperCase();
    const map = {
      PO_RECEIVE: "PO Receive",
      BACKFILL_PO_RECEIVE: "PO Receive (Backfill)",
      PRODUCT_BASELINE: "Manual Baseline",
      VARIANT_BASELINE: "Variant Baseline",
      MANUAL_BASELINE_UPDATE: "Manual Baseline Update",
      BACKFILL_MANUAL_BASELINE: "Manual Baseline (Backfill)",
    };
    return map[key] || (sourceType ? String(sourceType).replace(/_/g, " ") : "—");
  };

  const periodLabel = (validFrom, validTo) => {
    const from = formatUtcDateOnly(validFrom);
    const to = formatUtcDateOnly(validTo);
    if (to === "—") return `${from} onward`;
    return `${from} to ${to}`;
  };

  const pickNote = (row) => {
    if (row?.notes && String(row.notes).trim()) return row.notes;
    const source = String(row?.sourceType || "").toUpperCase();
    if (source.includes("PO_RECEIVE")) return "Cost updated from received PO landed cost";
    if (source.includes("BASELINE")) return "Manual baseline cost used";
    return "—";
  };

  const historySections = useMemo(() => {
    if (hasVariants) {
      return variantList.map((variant, idx) => ({
        key: variant.id || variant.sku || `variant-${idx}`,
        title: [variant.sizeText, variant.colorText].filter(Boolean).join(" • ") || variant.sku || `Variant ${idx + 1}`,
        subtitle: variant.sku ? `SKU: ${variant.sku}` : "Variant",
        rows: (Array.isArray(variant?.costHistory) ? variant.costHistory : [])
          .slice()
          .sort((a, b) => {
            const aTime = new Date(a?.validFrom || 0).getTime();
            const bTime = new Date(b?.validFrom || 0).getTime();
            return bTime - aTime;
          }),
      }));
    }

    return [
      {
        key: p?.variantId || p?.id || "product",
        title: p?.name || "Product",
        subtitle: p?.sku ? `SKU: ${p.sku}` : [p?.sizeText, p?.colorText].filter(Boolean).join(" • "),
        rows: (Array.isArray(p?.costHistory) ? p.costHistory : [])
          .slice()
          .sort((a, b) => {
            const aTime = new Date(a?.validFrom || 0).getTime();
            const bTime = new Date(b?.validFrom || 0).getTime();
            return bTime - aTime;
          }),
      },
    ];
  }, [hasVariants, p, variantList]);

  const hasAnyHistory = useMemo(
    () => historySections.some((section) => Array.isArray(section.rows) && section.rows.length > 0),
    [historySections]
  );

  const renderProductInfo = (title, productData, images, isVariant = false) => {
    // Only determine Cost Price if it's a simple product or we are treating it as one
    // For parent product in a variant scenario, cost price might be ambiguous or a range, 
    // but here we are rendering specific data passed in 'productData'.
    const costPrice = productData?.avgCostPerUnit ?? productData?.lastPurchasePrice ?? productData?.originalPrice;

    return (
      <div className={card}>
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>

        <div className="p-4 flex gap-6">
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <p className={label}>Product Name</p>
              <p className={`${value} text-lg`}>{productData.name || "—"}</p>
            </div>

            <div>
              <p className={label}>{isVariant ? "Variant SKU" : "SKU"}</p>
              <p className={value}>{productData.sku || "—"}</p>
            </div>

            <div>
              <p className={label}>Brand</p>
              <p className={value}>{productData.brand || "—"}</p>
            </div>

            <div>
              <p className={label}>Status</p>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${productData.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-200 text-gray-700"
                  }`}
              >
                {productData.status?.toUpperCase() || "—"}
              </span>
            </div>

            {!isVariant && (
              <div>
                <p className={label}>Size</p>
                <p className={value}>{productData.sizeText || "—"}</p>
              </div>
            )}


            {!isVariant && (
              <div>
                <p className={label}>Color</p>
                <p className={value}>{productData.colorText || "—"}</p>
              </div>
            )}


            <div>
              <p className={label}>Origin Country</p>
              <p className={value}>{productData.originCountry || "—"}</p>
            </div>

            <div>
              <p className={label}>Selling Price</p>
              <p className={value}>
                {productData?.retailPrice != null
                  ? formatPrice(productData.retailPrice)
                  : "—"}
              </p>
            </div>

            <div>
              <p className={label}>Cost Price</p>
              <p className={value}>
                {costPrice != null ? formatPrice(costPrice) : "—"}
              </p>
            </div>

            <div>
              <p className={label}>Stock on Hand</p>
              <p className={value}>
                {productData?.stock ?? productData?.stockOnHand ?? "—"}
              </p>
            </div>

            {productData?.weight != null && (
              <div>
                <p className={label}>Weight</p>
                <p className={value}>
                  {productData.weight} {productData.weightUnit || ""}
                </p>
              </div>
            )}

            {(productData?.length != null ||
              productData?.width != null ||
              productData?.height != null) && (
                <div>
                  <p className={label}>
                    Dimensions (L × W × H)
                  </p>
                  <p className={value}>
                    {productData?.length ?? "—"} ×{" "}
                    {productData?.width ?? "—"} ×{" "}
                    {productData?.height ?? "—"}{" "}
                    {productData?.dimensionUnit || ""}
                  </p>
                </div>
              )}

            <div className="col-span-2">
              <p className={label}>Last Updated</p>
              <p className={value}>
                {formatDate(productData.updatedAt)}
              </p>
            </div>
          </div>

          {/* Right Side Image */}
          <div className="w-1/3 min-w-[200px]">
            <p className={label}>Images</p>
            {images.length === 0 ? (
              <div className="mt-2 h-40 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">
                No images
              </div>
            ) : (
              <div className="mt-2">
                <ImageGallery
                  images={images}
                  absImg={absImg}
                  placeholder={IMG_PLACEHOLDER}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <ViewModal
      open={open}
      onClose={onClose}
      title="Product Details"
      subtitle="View product information"
      icon={Package}
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
          {/* DETAILS TAB */}
          {tab === "details" && (
            <>
              {/* Simple Product Info */}
              {!hasVariants && renderProductInfo("Product", p, imagesByVariant.productLevel)}

              {/* Parent Product with Variants */}
              {hasVariants && (
                <>
                  {/* Parent Product Info */}
                  {renderProductInfo("Parent Product", p, imagesByVariant.productLevel)}

                  {/* Variants */}
                  <div className={card}>
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                      <Box className="w-4 h-4 text-gray-500" />
                      <h3 className="text-sm font-semibold text-gray-900">Variants ({variantList.length})</h3>
                    </div>

                    <div className="p-4 space-y-3">
                      {variantList.map((variant, idx) => {
                        const imgs = imagesByVariant.byVar.get(variant.id) || [];
                        const costPrice = variant.avgCostPerUnit ?? variant.lastPurchasePrice ?? variant.originalPrice;
                        return (
                          <div
                            key={variant.id || idx}
                            className="rounded-lg border border-gray-200 overflow-hidden bg-white hover:shadow-sm transition-shadow"
                          >
                            {/* Variant Header */}
                            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div>
                                  <span className="text-xs font-medium text-gray-600">SKU:</span>
                                  <span className="ml-1.5 text-sm font-semibold text-gray-900">{variant.sku || "—"}</span>
                                </div>
                                {variant.sizeText && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-500">Size:</span>
                                    <span className="text-sm font-medium text-gray-900">{variant.sizeText}</span>
                                  </div>
                                )}
                                {variant.colorText && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-500">Color:</span>
                                    <span className="text-sm font-medium text-gray-900">{variant.colorText}</span>
                                  </div>
                                )}
                              </div>
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${variant.status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-200 text-gray-700"
                                  }`}
                              >
                                {variant.status?.toUpperCase() || "—"}
                              </span>
                            </div>

                            {/* Variant Details */}
                            <div className="p-4 flex gap-6">
                              <div className="flex-1 grid grid-cols-3 gap-4 mb-4">
                                <div>
                                  <p className={label}>Selling Price</p>
                                  <p className={value}>{variant.retailPrice != null ? formatPrice(variant.retailPrice) : "—"}</p>
                                </div>
                                <div>
                                  <p className={label}>Cost Price</p>
                                  <p className={value}>{costPrice != null ? formatPrice(costPrice) : "—"}</p>
                                </div>
                                <div>
                                  <p className={label}>Stock on Hand</p>
                                  <p className={value}>{variant.stockOnHand ?? "—"}</p>
                                </div>

                                {variant.weight != null && (
                                  <div>
                                    <p className={label}>Weight</p>
                                    <p className={value}>
                                      {variant.weight} {variant.weightUnit || p.weightUnit || ""}
                                    </p>
                                  </div>
                                )}

                                {(variant.length != null || variant.width != null || variant.height != null) && (
                                  <div>
                                    <p className={label}>Dimensions (L × W × H)</p>
                                    <p className={value}>
                                      {variant.length ?? "—"} × {variant.width ?? "—"} × {variant.height ?? "—"}{" "}
                                      {variant.dimensionUnit || p.dimensionUnit || ""}
                                    </p>
                                  </div>
                                )}

                                {variant.barcode && (
                                  <div>
                                    <p className={label}>Barcode</p>
                                    <p className={value}>{variant.barcode}</p>
                                  </div>
                                )}
                              </div>

                              {/* Images */}
                              <div className="w-1/3 min-w-[150px]">
                                <p className={label}>Images</p>
                                {imgs.length === 0 ? (
                                  <div className="mt-2 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">No images</div>
                                ) : (
                                  <div className="mt-2">
                                    <ImageGallery
                                      images={imgs}
                                      absImg={absImg}
                                      placeholder={IMG_PLACEHOLDER}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* MARKETPLACES TAB */}
          {tab === "marketplaces" && (
            <div className={card}>
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Marketplaces</h3>
                </div>
                <div className="w-64">
                  <SelectCompact
                    value={marketplaceFilter}
                    onChange={setMarketplaceFilter}
                    options={marketplaceOptions}
                    placeholder="Filter by marketplace..."
                    filterable
                    multiple
                    buttonClassName="text-xs"
                  />
                </div>
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
                  <>
                    {filteredListings.length === 0 ? (
                      <div className="text-sm text-gray-500">No matching listings found.</div>
                    ) : (
                      <div className="rounded-lg border border-gray-200 overflow-hidden">
                        <div className={`grid ${hasVariants ? 'grid-cols-[72px_1.2fr_1.5fr_1.2fr_0.8fr_0.6fr_0.6fr_0.6fr]' : 'grid-cols-[72px_2fr_1.2fr_0.8fr_0.6fr_0.6fr_0.6fr]'} bg-gray-50 text-[12px] font-medium text-gray-700`}>
                          <div className="px-3 py-2 text-center">Image</div>
                          {hasVariants && <div className="px-3 py-2">Variant SKU</div>}
                          <div className="px-3 py-2">Product Name</div>
                          <div className="px-3 py-2">Marketplace</div>
                          {/* Removed Listing SKU */}
                          <div className="px-3 py-2 text-center">Price</div>
                          <div className="px-3 py-2 text-center">Units</div>
                          <div className="px-3 py-2 text-center">Assign</div>
                          <div className="px-3 py-2 text-center">Stock</div>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {filteredListings.map((l) => {
                            const provider = l?.productName ?? l?.channel?.provider ?? "";
                            const channelName = l?.channel?.marketplace ?? l?.channel?.name ?? "";
                            const units = Number.isFinite(l?.units) ? l.units : l?.units ?? "";
                            const price = l?.price != null ? Number(l.price).toFixed(2) : null;
                            const variantId = l?.productVariantId ?? l?.variantId ?? null;
                            const marketplaceSku = (l?.externalSku || "").trim();
                            const rawListingImage = String(l?.imageUrl || l?.url || "").trim();
                            const listingImage = rawListingImage && (rawListingImage.includes("/uploads/") || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(rawListingImage))
                              ? rawListingImage
                              : "";
                            const resolvedVariant = variantList.find((v) => v.id === variantId);

                            // Calculate Assign
                            let stock = 0;
                            if (resolvedVariant) {
                              stock = resolvedVariant.stockOnHand ?? 0;
                            } else {
                              stock = p?.stock ?? p?.stockOnHand ?? 0;
                            }
                            const unitsNum = parseInt(units, 10);
                            const assignVal = (unitsNum > 0 && stock > 0) ? Math.floor(stock / unitsNum) : 0;

                            return (
                              <div
                                key={l.id || provider + channelName + marketplaceSku}
                                className={`grid ${hasVariants ? 'grid-cols-[72px_1.2fr_1.5fr_1.2fr_0.8fr_0.6fr_0.6fr_0.6fr]' : 'grid-cols-[72px_2fr_1.2fr_0.8fr_0.6fr_0.6fr_0.6fr]'} bg-white text-[13px] text-gray-700 items-center`}
                              >
                                <div className="px-3 py-2 flex items-center justify-center">
                                  <div className="h-8 w-8 overflow-hidden rounded border border-gray-200 bg-gray-50">
                                    {listingImage ? (
                                      <img
                                        src={absImg(listingImage)}
                                        alt="Listing"
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <img
                                        src={IMG_PLACEHOLDER}
                                        alt="No image"
                                        className="h-full w-full object-cover opacity-40"
                                      />
                                    )}
                                  </div>
                                </div>
                                {hasVariants && <div className="px-3 py-2">{resolvedVariant?.sku || "—"}</div>}
                                <div className="px-3 py-2">{provider || "—"}</div>
                                <div className="px-3 py-2">{channelName || "—"}</div>
                                <div className="px-3 py-2 text-center">{price ? `$${price}` : "—"}</div>
                                <div className="px-3 py-2 text-center">{units}</div>
                                <div className="px-3 py-2 text-center">{assignVal}</div>
                                <div className="px-3 py-2 text-center text-gray-500">{stock}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* AVG COST HISTORY TAB */}
          {tab === "avgCostHistory" && (
            <div className={card}>
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <History className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Average Cost History</h3>
              </div>
              <div className="p-4 space-y-4">
                {!hasAnyHistory ? (
                  <div className="text-sm text-gray-500">No average cost history found for this product.</div>
                ) : (
                  historySections.map((section) => (
                    <div key={section.key} className="rounded-lg border border-gray-200 overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{section.title}</p>
                            {section.subtitle && <p className="text-xs text-gray-500">{section.subtitle}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500">Current Avg Cost</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatPrice(section.rows.find((r) => !r?.validTo)?.avgCostPerUnit ?? section.rows[0]?.avgCostPerUnit)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-600">
                          <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200">
                            Entries: {section.rows.length}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200">
                            Started: {formatUtcDateOnly(section.rows[section.rows.length - 1]?.validFrom)}
                          </span>
                        </div>
                      </div>
                      {!section.rows.length ? (
                        <div className="px-4 py-3 text-sm text-gray-500">No history rows.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full table-fixed text-[13px] text-gray-700">
                            <colgroup>
                              <col className="w-[130px]" />
                              <col className="w-[210px]" />
                              <col className="w-[105px]" />
                              <col className="w-[170px]" />
                              <col />
                            </colgroup>
                            <thead className="bg-gray-50 text-[12px] font-medium text-gray-700">
                              <tr>
                                <th className="px-3 py-2 text-left">Avg Cost</th>
                                <th className="px-3 py-2 text-left">Effective Period</th>
                                <th className="px-3 py-2 text-left">Status</th>
                                <th className="px-3 py-2 text-left">Reason</th>
                                <th className="px-3 py-2 text-left">Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {section.rows.map((row, index) => {
                                const isCurrent = !row?.validTo;
                                return (
                                  <tr key={row.id || `${section.key}-${index}`} className="bg-white align-top">
                                    <td className="px-3 py-2 font-semibold text-gray-900">{formatPrice(row?.avgCostPerUnit)}</td>
                                    <td className="px-3 py-2">{periodLabel(row?.validFrom, row?.validTo)}</td>
                                    <td className="px-3 py-2">
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                          isCurrent ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                                        }`}
                                      >
                                        {isCurrent ? "Current" : "Closed"}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">{sourceTypeLabel(row?.sourceType)}</td>
                                    <td className="px-3 py-2">{pickNote(row)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SUPPLIERS TAB */}
          {tab === "suppliers" && (
            <div className={card}>
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Suppliers</h3>
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
    </ViewModal>
  );
}
