import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PackageSearch,
  RefreshCcw,
  Mail,
  Download,
  CheckSquare,
  Square,
  MinusSquare,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import SelectCompact from "../../../components/SelectCompact";
import ImageGallery from "../../../components/ImageGallery";
import { useSuppliers } from "../../purchases/hooks/useSuppliers";
import {
  listInventory,
  downloadReorderInvoicesPdf,
  emailReorderInvoices,
  previewReorderInvoices,
} from "../../../lib/api";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const IMG_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="100%" height="100%" fill="#f3f4f6"/><g fill="#9ca3af"><circle cx="26" cy="30" r="8"/><path d="M8 60l15-15 10 10 12-12 27 27H8z"/></g></svg>',
  );

const absImg = (path) => {
  if (!path) return IMG_PLACEHOLDER;
  if (path.startsWith("data:") || path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
};

const COLUMN_OPTIONS = [
  { key: "product", label: "Product" },
  { key: "availableQty", label: "Available Qty" },
  { key: "inTransitQty", label: "In Transit" },
  { key: "reorderLevel", label: "Reorder Level" },
  { key: "reorderQuantity", label: "Reorder Qty", mandatory: true },
  { key: "unitCost", label: "Unit Cost" },
  { key: "totalValue", label: "Total Value" },
];

const defaultVisibleColumns = COLUMN_OPTIONS.reduce((acc, column) => {
  acc[column.key] = true;
  return acc;
}, {});
const ALL_SUPPLIER_FILTER_VALUE = "__ALL_SUPPLIERS__";

const getProductGroupKey = (item) => {
  const productId = String(item?.productId || "").trim();
  if (productId) return `product:${productId}`;
  const productName = String(item?.productName || "").trim().toLowerCase();
  return `name:${productName}`;
};

const normalizeSearchText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokenizeSearch = (value) => normalizeSearchText(value).split(/\s+/).filter(Boolean);

const scoreFieldTokenMatch = (field, token) => {
  if (!field || !token) return 0;
  if (field === token) return 120;
  if (field.startsWith(token)) return 84;
  const idx = field.indexOf(token);
  if (idx === -1) return 0;
  return Math.max(24, 62 - Math.min(idx, 24));
};

const scoreVariantByTokens = (item, tokens) => {
  if (!Array.isArray(tokens) || tokens.length === 0) return 0;
  const fields = [
    normalizeSearchText(item?.productName),
    normalizeSearchText(item?.sku),
    normalizeSearchText(item?.sizeText),
    normalizeSearchText(item?.colorText),
  ];
  const merged = fields.join(" ").trim();

  let total = 0;
  for (const token of tokens) {
    let tokenScore = 0;
    fields.forEach((field, idx) => {
      const base = scoreFieldTokenMatch(field, token);
      if (!base) return;
      const weight = idx === 0 ? 1.45 : (idx === 1 ? 1.2 : 1);
      tokenScore = Math.max(tokenScore, base * weight);
    });
    if (!tokenScore && merged.includes(token)) tokenScore = 20;
    if (!tokenScore) return -1; // Require every keyword to match.
    total += tokenScore;
  }

  return total + (tokens.length > 1 ? tokens.length * 6 : 0);
};

const toWholeNumber = (value) => {
  const parsed = String(value ?? "").replace(/[^0-9]/g, "");
  if (!parsed) return 0;
  return Number(parsed);
};

const calculateReorderLevel = (availableQty, thresholdQty, inTransitQty) => {
  const available = Number(availableQty) || 0;
  const threshold = Number(thresholdQty) || 0;
  const inTransit = Number(inTransitQty) || 0;
  const netAvailable = available + inTransit;
  return Math.max(0, threshold - netAvailable);
};

const toMoney = (value, currency = "USD") => {
  const num = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${num.toFixed(2)} ${currency}`;
  }
};

const getUploadSegments = (url) => {
  if (!url || !url.includes("/uploads/")) return null;
  return url.split("/uploads/")[1]?.split("/") || null;
};

const normalizeImageList = (images) => {
  const list = Array.isArray(images) ? images : [];
  return list
    .map((img) => ({
      url: img?.url || img?.filePath || "",
      alt: img?.alt || null,
    }))
    .filter((img) => !!img.url);
};

const selectVariantImage = (variantId, productName, images) => {
  const list = normalizeImageList(images);
  if (list.length === 0) return [];

  const parentImages = list.filter((img) => {
    const parts = getUploadSegments(img?.url || "");
    if (!parts) return true;
    return parts.length === 2;
  });

  const variantImages = list.filter((img) => {
    const parts = getUploadSegments(img?.url || "");
    if (!parts || parts.length < 3) return false;
    return parts[1] === variantId;
  });

  const preferred = variantImages.length > 0 ? variantImages : (parentImages.length > 0 ? parentImages : list);

  return preferred.map((img) => ({
    url: img.url,
    alt: productName || "Product image",
  }));
};

const normalizeSupplierLinks = (links = []) => {
  const map = new Map();
  const list = Array.isArray(links) ? links : [];
  for (const link of list) {
    const supplierId = String(link?.supplierId || link?.supplier?.id || "").trim();
    if (!supplierId) continue;
    if (!map.has(supplierId)) {
      map.set(supplierId, {
        id: supplierId,
        companyName: link?.companyName || link?.supplier?.companyName || "Supplier",
        email: link?.email || link?.supplier?.email || null,
        currency: link?.currency || link?.supplier?.currency || null,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.companyName.localeCompare(b.companyName));
};

const parseFilenameFromHeaders = (headers = {}) => {
  const contentDisposition = headers?.["content-disposition"] || headers?.["Content-Disposition"] || "";
  const match = String(contentDisposition).match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
  if (!match) return "reorder-invoices.pdf";
  return decodeURIComponent(match[1].replace(/"/g, "").trim()) || "reorder-invoices.pdf";
};

const triggerBlobDownload = (blob, filename) => {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "reorder-invoices.pdf";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const mapVariantsFromInventory = (inventoryRows = []) => {
  const result = [];
  const seen = new Set();

  for (const row of inventoryRows || []) {
    const rowSupplierMetaKnown = Array.isArray(row?.supplierLinks);
    const rowSupplierOptions = normalizeSupplierLinks(row?.supplierLinks);
    const variants = Array.isArray(row?.variants) && row.variants.length > 0
      ? row.variants
      : (row?.type === "variant" && row?.id ? [row] : []);

    for (const variant of variants) {
      const variantId = String(variant?.id || "");
      if (!variantId || seen.has(variantId)) continue;

      seen.add(variantId);
      const productName = variant?.productName || row?.productName || "Product";
      const sku = variant?.sku || row?.sku || "—";
      const sizeText = variant?.size || variant?.sizeText || "";
      const colorText = variant?.color || variant?.colorText || "";
      const availableQty = Number(variant?.stockOnHand || 0);
      const inTransitQty = Number(variant?.inTransit || 0);
      const thresholdQty = Number(variant?.threshold ?? row?.threshold ?? 0);
      const reorderLevel = calculateReorderLevel(availableQty, thresholdQty, inTransitQty);
      const variantSupplierMetaKnown = Array.isArray(variant?.supplierLinks);
      const variantSupplierOptions = normalizeSupplierLinks(variant?.supplierLinks);
      const supplierOptions = variantSupplierOptions.length > 0 ? variantSupplierOptions : rowSupplierOptions;

      result.push({
        productVariantId: variantId,
        productId: variant?.productId || row?.productId || row?.id || null,
        productName,
        sku,
        sizeText,
        colorText,
        availableQty,
        inTransitQty,
        reorderLevel,
        reorderQuantity: reorderLevel,
        supplierOptions,
        supplierIds: supplierOptions.map((sup) => String(sup.id)),
        supplierMetaKnown: rowSupplierMetaKnown || variantSupplierMetaKnown,
        images: selectVariantImage(
          variantId,
          productName,
          Array.isArray(variant?.images)
            ? variant.images
            : (Array.isArray(row?.images) ? row.images : []),
        ),
      });
    }
  }

  return result
    .sort((a, b) => a.productName.localeCompare(b.productName) || a.sku.localeCompare(b.sku));
};

export default function ReorderInvoiceModal({
  open,
  onClose,
  inventoryRows = [],
}) {
  const { data: supplierData = [] } = useSuppliers({ refetchOnWindowFocus: false });
  const [search, setSearch] = useState("");
  const [selectedLines, setSelectedLines] = useState({});
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => ({ ...defaultVisibleColumns }));
  const [emailMessage, setEmailMessage] = useState("");
  const [supplierFilterIds, setSupplierFilterIds] = useState([]);
  const [fallbackAllowedVariantIds, setFallbackAllowedVariantIds] = useState(null);
  const [expandedProductKeys, setExpandedProductKeys] = useState({});
  const [catalogRows, setCatalogRows] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const suppliers = useMemo(
    () => (Array.isArray(supplierData) ? supplierData : (Array.isArray(supplierData?.rows) ? supplierData.rows : [])),
    [supplierData],
  );

  useEffect(() => {
    if (!open) {
      setCatalogRows([]);
      setCatalogLoading(false);
      setCatalogLoaded(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      setCatalogLoaded(false);
      try {
        const perPage = 250;
        const maxPages = 80;
        let page = 1;
        let totalPages = 1;
        const allRows = [];

        while (page <= totalPages && page <= maxPages) {
          const payload = await listInventory({ page, perPage });
          const pageRows = Array.isArray(payload?.rows) ? payload.rows : [];
          allRows.push(...pageRows);
          totalPages = Math.max(1, Number(payload?.meta?.totalPages || 1));
          if (pageRows.length === 0 && page >= totalPages) break;
          page += 1;
        }

        if (!cancelled) {
          setCatalogRows(allRows);
          setCatalogLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setCatalogRows(Array.isArray(inventoryRows) ? inventoryRows : []);
          setCatalogLoaded(true);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, inventoryRows]);

  const inventoryRowsForModal = useMemo(
    () => (catalogLoaded ? catalogRows : (open ? [] : inventoryRows)),
    [catalogLoaded, catalogRows, open, inventoryRows],
  );
  const variantCatalog = useMemo(() => mapVariantsFromInventory(inventoryRowsForModal), [inventoryRowsForModal]);
  const supplierFilterStrict = useMemo(
    () => variantCatalog.length > 0 && variantCatalog.every((item) => item?.supplierMetaKnown),
    [variantCatalog],
  );

  const filteredCatalog = useMemo(() => {
    const keywords = tokenizeSearch(search);
    const base = variantCatalog.filter((item) => {
      if (supplierFilterStrict) {
        if (supplierFilterIds.length > 0) {
          const matchesSupplier = (item?.supplierIds || []).some((supplierId) =>
            supplierFilterIds.includes(String(supplierId)),
          );
          if (!matchesSupplier) return false;
        }
      } else if (supplierFilterIds.length > 0 && fallbackAllowedVariantIds instanceof Set) {
        if (!fallbackAllowedVariantIds.has(String(item.productVariantId))) return false;
      } else if (supplierFilterIds.length > 0) {
        // While fallback filter is resolving, avoid showing incorrect rows.
        return false;
      }
      return true;
    });

    if (keywords.length === 0) {
      return [...base].sort((a, b) => a.productName.localeCompare(b.productName) || a.sku.localeCompare(b.sku));
    }

    return base
      .map((item) => ({ item, score: scoreVariantByTokens(item, keywords) }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) =>
        b.score - a.score
        || b.item.reorderLevel - a.item.reorderLevel
        || a.item.productName.localeCompare(b.item.productName)
        || a.item.sku.localeCompare(b.item.sku),
      )
      .map((entry) => entry.item);
  }, [variantCatalog, search, supplierFilterIds, supplierFilterStrict, fallbackAllowedVariantIds]);

  const groupedCatalog = useMemo(() => {
    const groups = new Map();
    for (const variant of filteredCatalog) {
      const groupKey = getProductGroupKey(variant);
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          groupKey,
          productId: variant?.productId || null,
          productName: variant?.productName || "Product",
          images: variant?.images?.slice(0, 1) || [],
          variants: [],
        });
      }
      groups.get(groupKey).variants.push(variant);
    }
    return Array.from(groups.values());
  }, [filteredCatalog]);

  const supplierFilterOptions = useMemo(() => {
    const map = new Map();
    for (const supplier of suppliers) {
      const supplierId = String(supplier?.id || "");
      if (!supplierId || map.has(supplierId)) continue;
      map.set(supplierId, {
        value: supplierId,
        label: supplier?.companyName || supplierId,
      });
    }
    for (const variant of variantCatalog) {
      for (const supplier of (variant?.supplierOptions || [])) {
        const supplierId = String(supplier?.id || "");
        if (!supplierId || map.has(supplierId)) continue;
        map.set(supplierId, {
          value: supplierId,
          label: supplier?.companyName || supplierId,
        });
      }
    }
    const list = Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: ALL_SUPPLIER_FILTER_VALUE, label: "Select All Suppliers" }, ...list];
  }, [suppliers, variantCatalog]);

  const allSupplierFilterIds = useMemo(
    () => supplierFilterOptions
      .filter((opt) => String(opt.value) !== ALL_SUPPLIER_FILTER_VALUE)
      .map((opt) => String(opt.value)),
    [supplierFilterOptions],
  );
  const unresolvedFallbackSupplierOptions = useMemo(
    () => suppliers
      .filter((supplier) => supplier?.id)
      .map((supplier) => ({ value: String(supplier.id), label: supplier.companyName || supplier.id }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [suppliers],
  );

  useEffect(() => {
    if (!open) return;
    if (supplierFilterStrict) {
      setFallbackAllowedVariantIds(null);
      return;
    }

    if (supplierFilterIds.length === 0) {
      setFallbackAllowedVariantIds(null);
      return;
    }

    const querySupplierIds = supplierFilterIds;
    if (querySupplierIds.length === 0) {
      setFallbackAllowedVariantIds(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const perPage = 250;
        const maxPages = 80;
        let page = 1;
        let totalPages = 1;
        const allRows = [];

        while (page <= totalPages && page <= maxPages) {
          const payload = await listInventory({
            page,
            perPage,
            supplierIds: querySupplierIds,
          });
          const pageRows = Array.isArray(payload?.rows) ? payload.rows : [];
          allRows.push(...pageRows);
          totalPages = Math.max(1, Number(payload?.meta?.totalPages || 1));
          page += 1;
        }

        const allowed = new Set();
        for (const row of allRows) {
          const variants = Array.isArray(row?.variants) && row.variants.length > 0
            ? row.variants
            : (row?.type === "variant" && row?.id ? [row] : []);
          for (const variant of variants) {
            const variantId = String(variant?.id || "");
            if (variantId) allowed.add(variantId);
          }
        }

        if (!cancelled) setFallbackAllowedVariantIds(allowed);
      } catch {
        if (!cancelled) setFallbackAllowedVariantIds(new Set());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, supplierFilterStrict, supplierFilterIds]);

  const selectedCount = Object.keys(selectedLines).length;
  const hasUnresolvedSuppliers = Boolean(previewData?.requiresSupplierSelection && (previewData?.unresolvedVariants || []).length > 0);

  const effectiveColumns = useMemo(() => {
    return COLUMN_OPTIONS.filter((column) => column.mandatory || visibleColumns[column.key]);
  }, [visibleColumns]);

  const visibleColumnKeys = useMemo(() => effectiveColumns.map((column) => column.key), [effectiveColumns]);

  const buildPayloadVariantLines = useCallback(() => {
    return Object.entries(selectedLines).map(([productVariantId, data]) => ({
      productVariantId,
      reorderQuantity: Math.max(0, Number(data?.reorderQuantity || 0)),
      ...(data?.supplierId ? { supplierId: data.supplierId } : {}),
    }));
  }, [selectedLines]);

  const resetState = useCallback(() => {
    setSearch("");
    setSupplierFilterIds([]);
    setSelectedLines({});
    setExpandedProductKeys({});
    setPreviewData(null);
    setPreviewLoading(false);
    setDownloadingPdf(false);
    setSendingEmail(false);
    setVisibleColumns({ ...defaultVisibleColumns });
    setEmailMessage("");
  }, []);

  useEffect(() => {
    if (open) return;
    resetState();
  }, [open, resetState]);

  useEffect(() => {
    setSupplierFilterIds((prev) => prev.filter((id) => allSupplierFilterIds.includes(String(id))));
  }, [allSupplierFilterIds]);

  useEffect(() => {
    const validIds = new Set(variantCatalog.map((item) => String(item.productVariantId)));
    setSelectedLines((prev) => {
      let changed = false;
      const next = {};
      for (const [variantId, data] of Object.entries(prev)) {
        if (!validIds.has(String(variantId))) {
          changed = true;
          continue;
        }
        next[variantId] = data;
      }
      return changed ? next : prev;
    });
  }, [variantCatalog]);

  useEffect(() => {
    const validGroupKeys = new Set(groupedCatalog.map((group) => String(group.groupKey)));
    setExpandedProductKeys((prev) => {
      let changed = false;
      const next = {};
      for (const [groupKey, isExpanded] of Object.entries(prev || {})) {
        if (!validGroupKeys.has(String(groupKey))) {
          changed = true;
          continue;
        }
        next[groupKey] = isExpanded;
      }
      return changed ? next : prev;
    });
  }, [groupedCatalog]);

  const handleSupplierFilterChange = useCallback((nextValues) => {
    const incoming = Array.isArray(nextValues) ? nextValues.map((id) => String(id)) : [];
    if (incoming.includes(ALL_SUPPLIER_FILTER_VALUE)) {
      setSupplierFilterIds(allSupplierFilterIds);
      return;
    }
    setSupplierFilterIds(Array.from(new Set(incoming)).filter((id) => allSupplierFilterIds.includes(id)));
  }, [allSupplierFilterIds]);

  const handleVariantToggle = useCallback((variant) => {
    const variantId = String(variant.productVariantId);
    setSelectedLines((prev) => {
      if (prev[variantId]) {
        const next = { ...prev };
        delete next[variantId];
        return next;
      }
      return {
        ...prev,
        [variantId]: {
          reorderQuantity: Math.max(0, Number(variant.reorderQuantity || 0)),
          supplierId: "",
        },
      };
    });
  }, []);

  const toggleGroupExpand = useCallback((groupKey) => {
    setExpandedProductKeys((prev) => ({
      ...prev,
      [groupKey]: !prev?.[groupKey],
    }));
  }, []);

  const handleGroupToggle = useCallback((group) => {
    const variants = Array.isArray(group?.variants) ? group.variants : [];
    if (variants.length === 0) return;

    setSelectedLines((prev) => {
      const variantIds = variants.map((variant) => String(variant.productVariantId));
      const allSelected = variantIds.every((variantId) => !!prev[variantId]);
      const next = { ...prev };

      if (allSelected) {
        for (const variantId of variantIds) delete next[variantId];
        return next;
      }

      for (const variant of variants) {
        const variantId = String(variant.productVariantId);
        if (next[variantId]) continue;
        next[variantId] = {
          reorderQuantity: Math.max(0, Number(variant.reorderQuantity || 0)),
          supplierId: "",
        };
      }
      return next;
    });
  }, []);

  const handleSelectAllFiltered = useCallback(() => {
    setSelectedLines((prev) => {
      const next = { ...prev };
      for (const variant of filteredCatalog) {
        const variantId = String(variant.productVariantId);
        if (next[variantId]) continue;
        next[variantId] = {
          reorderQuantity: Math.max(0, Number(variant.reorderQuantity || 0)),
          supplierId: "",
        };
      }
      return next;
    });
  }, [filteredCatalog]);

  const handleSelectSuggested = useCallback(() => {
    setSelectedLines((prev) => {
      const next = { ...prev };
      for (const variant of variantCatalog) {
        if (Number(variant.reorderLevel || 0) <= 0) continue;
        const variantId = String(variant.productVariantId);
        if (next[variantId]) continue;
        next[variantId] = {
          reorderQuantity: Math.max(0, Number(variant.reorderLevel || 0)),
          supplierId: "",
        };
      }
      return next;
    });
  }, [variantCatalog]);

  const syncPreviewQty = useCallback((productVariantId, reorderQuantity) => {
    setPreviewData((prev) => {
      if (!prev) return prev;
      const targetId = String(productVariantId);
      const next = {
        ...prev,
        invoices: (prev.invoices || []).map((invoice) => {
          const lines = (invoice.lines || []).map((line) => {
            if (String(line.productVariantId) !== targetId) return line;
            return {
              ...line,
              reorderQuantity,
              totalValue: Number(line.unitCost || 0) * reorderQuantity,
            };
          });
          const totals = lines.reduce((acc, line) => {
            acc.totalReorderQty += Number(line.reorderQuantity || 0);
            acc.totalValue += Number(line.totalValue || 0);
            return acc;
          }, { totalReorderQty: 0, totalValue: 0 });
          return {
            ...invoice,
            lines,
            totals,
            lineCount: lines.length,
          };
        }),
        unresolvedVariants: (prev.unresolvedVariants || []).map((item) => {
          if (String(item.productVariantId) !== targetId) return item;
          return {
            ...item,
            reorderQuantity,
          };
        }),
      };
      return next;
    });
  }, []);

  const handleQtyChange = useCallback((productVariantId, rawValue) => {
    const qty = toWholeNumber(rawValue);
    setSelectedLines((prev) => {
      if (!prev[productVariantId]) return prev;
      return {
        ...prev,
        [productVariantId]: {
          ...prev[productVariantId],
          reorderQuantity: qty,
        },
      };
    });
    syncPreviewQty(productVariantId, qty);
  }, [syncPreviewQty]);

  const handleSupplierAssign = useCallback((productVariantId, supplierId) => {
    const nextValue = supplierId === "Select" ? "" : supplierId;
    setSelectedLines((prev) => {
      if (!prev[productVariantId]) return prev;
      return {
        ...prev,
        [productVariantId]: {
          ...prev[productVariantId],
          supplierId: nextValue,
        },
      };
    });
  }, []);

  const handleGeneratePreview = useCallback(async () => {
    const variantLines = buildPayloadVariantLines();
    if (variantLines.length === 0) {
      toast.error("Select at least one variant");
      return;
    }

    setPreviewLoading(true);
    try {
      const data = await previewReorderInvoices({ variantLines });
      setPreviewData(data);

      if (data?.requiresSupplierSelection) {
        toast.error("Supplier selection is required for one or more variants.");
      } else {
        toast.success("Reorder preview generated");
      }

      const patched = {};
      for (const line of variantLines) {
        patched[line.productVariantId] = {
          reorderQuantity: Math.max(0, Number(line.reorderQuantity || 0)),
          supplierId: line.supplierId || "",
        };
      }
      for (const unresolved of (data?.unresolvedVariants || [])) {
        patched[unresolved.productVariantId] = {
          reorderQuantity: Math.max(0, Number(unresolved.reorderQuantity || 0)),
          supplierId: patched[unresolved.productVariantId]?.supplierId || "",
        };
      }
      setSelectedLines((prev) => ({ ...prev, ...patched }));
    } catch (err) {
      const message = err?.response?.data?.message;
      toast.error(Array.isArray(message) ? message[0] : (message || err?.message || "Failed to generate preview"));
    } finally {
      setPreviewLoading(false);
    }
  }, [buildPayloadVariantLines]);

  const handleDownloadPdf = useCallback(async () => {
    const variantLines = buildPayloadVariantLines();
    if (variantLines.length === 0) return toast.error("Select at least one variant");
    if (hasUnresolvedSuppliers) return toast.error("Resolve supplier selection first");

    setDownloadingPdf(true);
    try {
      const { blob, headers } = await downloadReorderInvoicesPdf({
        variantLines,
        visibleColumns: visibleColumnKeys,
      });
      triggerBlobDownload(blob, parseFilenameFromHeaders(headers));
      toast.success("Reorder invoice PDF downloaded");
    } catch (err) {
      const message = err?.response?.data?.message;
      toast.error(Array.isArray(message) ? message[0] : (message || err?.message || "Failed to download PDF"));
    } finally {
      setDownloadingPdf(false);
    }
  }, [buildPayloadVariantLines, hasUnresolvedSuppliers, visibleColumnKeys]);

  const handleSendEmail = useCallback(async () => {
    const variantLines = buildPayloadVariantLines();
    if (variantLines.length === 0) return toast.error("Select at least one variant");
    if (hasUnresolvedSuppliers) return toast.error("Resolve supplier selection first");

    setSendingEmail(true);
    try {
      const result = await emailReorderInvoices({
        variantLines,
        visibleColumns: visibleColumnKeys,
        message: emailMessage?.trim() || undefined,
      });

      const sent = Number(result?.sentCount || 0);
      const skipped = Number(result?.skippedCount || 0);
      const failed = Number(result?.failedCount || 0);

      if (sent > 0 && failed === 0) {
        toast.success(`Email sent to ${sent} supplier${sent > 1 ? "s" : ""}`);
      } else if (sent > 0 && failed > 0) {
        toast.success(`Sent ${sent}, failed ${failed}, skipped ${skipped}`);
      } else {
        toast.error(`No emails sent. Failed ${failed}, skipped ${skipped}`);
      }
    } catch (err) {
      const message = err?.response?.data?.message;
      toast.error(Array.isArray(message) ? message[0] : (message || err?.message || "Failed to send email"));
    } finally {
      setSendingEmail(false);
    }
  }, [buildPayloadVariantLines, emailMessage, hasUnresolvedSuppliers, visibleColumnKeys]);

  const canGeneratePreview = selectedCount > 0 && !previewLoading;
  const canExport = selectedCount > 0 && !previewLoading && !hasUnresolvedSuppliers;
  const variantCatalogById = useMemo(
    () => new Map(variantCatalog.map((item) => [String(item.productVariantId), item])),
    [variantCatalog],
  );

  const handleQtyInputKeyDown = useCallback((e) => {
    const blocked = ["ArrowUp", "ArrowDown", "e", "E", "+", "-", "."];
    if (blocked.includes(e.key)) e.preventDefault();
  }, []);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reorder Invoice"
      widthClass="max-w-7xl"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="secondary" onClick={handleGeneratePreview} isLoading={previewLoading} disabled={!canGeneratePreview}>
            <RefreshCcw size={14} className="mr-1" /> Generate Preview
          </Button>
          <Button variant="secondary" onClick={handleDownloadPdf} isLoading={downloadingPdf} disabled={!canExport || downloadingPdf}>
            <Download size={14} className="mr-1" /> Download PDF
          </Button>
          <Button variant="warning" onClick={handleSendEmail} isLoading={sendingEmail} disabled={!canExport || sendingEmail}>
            <Mail size={14} className="mr-1" /> Email Suppliers
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <PackageSearch size={16} className="text-gray-600" />
              <p className="text-sm font-semibold text-gray-900">Select product variants for reorder invoice</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="xs" variant="secondary" onClick={handleSelectSuggested}>
                Suggested Low Stock
              </Button>
              <Button size="xs" variant="secondary" onClick={handleSelectAllFiltered}>
                Select Filtered
              </Button>
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(280px,1fr)_minmax(420px,1.4fr)_1fr]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, SKU, size, color..."
              className="h-9 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
            <div className="flex items-center gap-2 min-w-0 md:min-w-[460px]">
              <SelectCompact
                multiple
                value={supplierFilterIds}
                onChange={handleSupplierFilterChange}
                options={supplierFilterOptions}
                filterable
                placeholder="Filter by supplier"
                buttonClassName="h-9 w-full md:min-w-[430px]"
              />
              {supplierFilterIds.length > 0 && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setSupplierFilterIds([])}
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="text-xs text-gray-500 flex items-center justify-end">
              {groupedCatalog.length} product{groupedCatalog.length === 1 ? "" : "s"} • {filteredCatalog.length} variant{filteredCatalog.length === 1 ? "" : "s"} shown • {selectedCount} selected
            </div>
          </div>

          <div className="mt-3 max-h-[220px] overflow-auto rounded-lg border border-gray-200 bg-white">
            {catalogLoading && !catalogLoaded ? (
              <p className="px-3 py-4 text-xs text-gray-500">
                Loading products...
              </p>
            ) : filteredCatalog.length === 0 ? (
              <p className="px-3 py-4 text-xs text-gray-500">
                No variants found.
                {!supplierFilterStrict ? " Supplier links are not available in inventory payload yet." : ""}
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {groupedCatalog.map((group) => {
                  const variants = Array.isArray(group?.variants) ? group.variants : [];
                  const variantCount = variants.length;
                  const selectedVariantCount = variants.reduce(
                    (sum, variant) => sum + (selectedLines[String(variant.productVariantId)] ? 1 : 0),
                    0,
                  );
                  const isFullySelected = variantCount > 0 && selectedVariantCount === variantCount;
                  const isPartiallySelected = selectedVariantCount > 0 && selectedVariantCount < variantCount;
                  const canExpand = variantCount > 0;
                  const isExpanded = canExpand ? Boolean(expandedProductKeys[group.groupKey]) : false;

                  return (
                    <div key={group.groupKey} className="bg-white">
                      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:cursor-default disabled:opacity-40"
                          disabled={!canExpand}
                          onClick={() => canExpand && toggleGroupExpand(group.groupKey)}
                          title={isExpanded ? "Collapse variants" : "Expand variants"}
                        >
                          {canExpand ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="h-3 w-3" />}
                        </button>

                        <button
                          type="button"
                          className="text-gray-600"
                          onClick={() => handleGroupToggle(group)}
                          title={isFullySelected ? "Deselect all variants" : "Select all variants"}
                        >
                          {isFullySelected ? <CheckSquare size={15} /> : (isPartiallySelected ? <MinusSquare size={15} /> : <Square size={15} />)}
                        </button>

                        <ImageGallery
                          images={group.images || []}
                          absImg={absImg}
                          placeholder={IMG_PLACEHOLDER}
                          className="h-8 w-8"
                          thumbnailClassName="h-8 w-8 bg-white object-contain border border-gray-200 rounded"
                          compact={true}
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-gray-900">{group.productName}</p>
                          <p className="truncate text-[11px] text-gray-500">
                            {variantCount} variant{variantCount === 1 ? "" : "s"}
                            {` • ${selectedVariantCount} selected`}
                          </p>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="divide-y divide-gray-100 bg-gray-50/40">
                          {variants.map((variant) => {
                            const selected = !!selectedLines[variant.productVariantId];
                            const details = [variant.sizeText, variant.colorText].filter(Boolean).join(" · ");
                            return (
                              <div
                                key={variant.productVariantId}
                                className={`flex items-center gap-3 px-3 py-2 text-[12px] ${selected ? "bg-amber-50/60" : "hover:bg-gray-50"}`}
                              >
                                <div className="w-6" />
                                <button
                                  type="button"
                                  className="text-gray-600"
                                  onClick={() => handleVariantToggle(variant)}
                                  title={selected ? "Deselect" : "Select"}
                                >
                                  {selected ? <CheckSquare size={14} /> : <Square size={14} />}
                                </button>

                                <ImageGallery
                                  images={variant.images?.slice(0, 1) || []}
                                  absImg={absImg}
                                  placeholder={IMG_PLACEHOLDER}
                                  className="h-8 w-8"
                                  thumbnailClassName="h-8 w-8 bg-white object-contain border border-gray-200 rounded"
                                  compact={true}
                                />

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-gray-900 font-medium">{variant.sku || "Variant"}</p>
                                  <p className="truncate text-[11px] text-gray-500">
                                    {details || "Base variant"}
                                    {` • Available: ${variant.availableQty}`}
                                    {` • In Transit: ${variant.inTransitQty}`}
                                    {` • Reorder Level: ${variant.reorderLevel}`}
                                  </p>
                                </div>

                                {selected && (
                                  <div className="w-[95px]">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      className="h-8 w-full rounded-md border border-gray-300 px-2 text-center text-[12px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                                      value={Number(selectedLines[variant.productVariantId]?.reorderQuantity || 0)}
                                      onChange={(e) => handleQtyChange(variant.productVariantId, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={handleQtyInputKeyDown}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Preview Columns</p>
            <p className="text-xs text-gray-500">Reorder Qty is mandatory</p>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {COLUMN_OPTIONS.map((column) => (
              <label
                key={column.key}
                className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs ${column.mandatory ? "border-amber-300 bg-amber-50 text-amber-900" : "border-gray-200 bg-gray-50 text-gray-700"}`}
              >
                <input
                  type="checkbox"
                  checked={column.mandatory ? true : !!visibleColumns[column.key]}
                  disabled={!!column.mandatory}
                  onChange={(e) => {
                    if (column.mandatory) return;
                    setVisibleColumns((prev) => ({ ...prev, [column.key]: e.target.checked }));
                  }}
                />
                {column.label}
              </label>
            ))}
          </div>
        </div>

        {previewData && hasUnresolvedSuppliers && (
          <div className="rounded-xl border border-rose-200 bg-rose-50">
            <div className="border-b border-rose-200 px-4 py-3">
              <p className="text-sm font-semibold text-rose-900">Supplier Selection Required</p>
              <p className="text-xs text-rose-700">Some selected variants are linked to multiple suppliers or none. Assign supplier before PDF/email.</p>
            </div>
            <div className="p-4 space-y-2">
              {(previewData?.unresolvedVariants || []).map((item) => {
                const details = [item.sizeText, item.colorText].filter(Boolean).join(" · ");
                const rowSupplierOptions = (item.supplierOptions || []).length > 0
                  ? (item.supplierOptions || []).map((sup) => ({ value: sup.id, label: sup.companyName || "Supplier" }))
                  : unresolvedFallbackSupplierOptions;
                const options = ["Select", ...rowSupplierOptions];
                return (
                  <div key={item.productVariantId} className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{item.productName}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        SKU: {item.sku}
                        {details ? ` • ${details}` : ""}
                        {` • Reorder Qty: ${selectedLines[item.productVariantId]?.reorderQuantity ?? item.reorderQuantity}`}
                        {item.reason === "no_supplier" ? " • No supplier linked" : ""}
                        {item.reason === "multiple_suppliers" ? " • Multiple suppliers linked" : ""}
                        {item.reason === "invalid_supplier" ? " • Selected supplier is invalid" : ""}
                      </p>
                    </div>
                    <SelectCompact
                      value={selectedLines[item.productVariantId]?.supplierId || "Select"}
                      onChange={(val) => handleSupplierAssign(item.productVariantId, val)}
                      options={options}
                      filterable
                      hideCheck={true}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Supplier-wise Reorder Preview</p>
            <p className="text-xs text-gray-500">Generate preview after quantity/supplier changes</p>
          </div>

          {!previewData ? (
            <p className="px-4 py-6 text-xs text-gray-500">No preview generated yet.</p>
          ) : (previewData?.invoices || []).length === 0 ? (
            <p className="px-4 py-6 text-xs text-gray-500">No supplier invoices generated from current selection.</p>
          ) : (
            <div className="p-4 space-y-4">
              {(previewData?.invoices || []).map((invoice) => (
                <div key={invoice?.supplier?.id || invoice?.supplier?.companyName} className="rounded-lg border border-gray-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{invoice?.supplier?.companyName || "Supplier"}</p>
                      <p className="text-xs text-gray-500">{invoice?.supplier?.email || "No supplier email"}</p>
                    </div>
                    <div className="text-xs text-gray-600">
                      Lines: <span className="font-semibold text-gray-900">{invoice?.lineCount || 0}</span>
                      {" • "}
                      Reorder Qty: <span className="font-semibold text-gray-900">{invoice?.totals?.totalReorderQty || 0}</span>
                      {" • "}
                      Total Value: <span className="font-semibold text-gray-900">{toMoney(invoice?.totals?.totalValue || 0, invoice?.supplier?.currency || "USD")}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-[12px]">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          {effectiveColumns.map((column) => (
                            <th key={column.key} className={`px-3 py-2 font-semibold ${column.key === "product" ? "text-left" : "text-center"}`}>
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(invoice?.lines || []).map((line) => {
                          const details = [line.sizeText, line.colorText].filter(Boolean).join(" · ");
                          return (
                            <tr key={line.productVariantId} className="border-t border-gray-100">
                              {effectiveColumns.map((column) => {
                                if (column.key === "product") {
                                  const variantMeta = variantCatalogById.get(String(line.productVariantId));
                                  return (
                                    <td key={column.key} className="px-3 py-2 text-left">
                                      <div className="flex items-start gap-2">
                                        <ImageGallery
                                          images={variantMeta?.images?.slice(0, 1) || []}
                                          absImg={absImg}
                                          placeholder={IMG_PLACEHOLDER}
                                          className="h-8 w-8"
                                          thumbnailClassName="h-8 w-8 bg-white object-contain border border-gray-200 rounded"
                                          compact={true}
                                        />
                                        <div className="min-w-0">
                                          <p className="font-medium text-gray-900">{line.productName}</p>
                                          <p className="text-[11px] text-gray-500">
                                            SKU: {line.sku}
                                            {details ? ` • ${details}` : ""}
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                  );
                                }

                                if (column.key === "availableQty") {
                                  return <td key={column.key} className="px-3 py-2 text-center text-gray-700">{line.availableQty}</td>;
                                }
                                if (column.key === "inTransitQty") {
                                  return <td key={column.key} className="px-3 py-2 text-center text-gray-700">{line.inTransitQty}</td>;
                                }
                                if (column.key === "reorderLevel") {
                                  return <td key={column.key} className="px-3 py-2 text-center text-gray-700">{line.reorderLevel}</td>;
                                }
                                if (column.key === "reorderQuantity") {
                                  return (
                                    <td key={column.key} className="px-3 py-2 text-center">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        className="h-7 w-20 rounded-md border border-gray-300 px-2 text-center text-[12px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                                        value={Number(selectedLines[line.productVariantId]?.reorderQuantity ?? line.reorderQuantity ?? 0)}
                                        onChange={(e) => handleQtyChange(line.productVariantId, e.target.value)}
                                        onKeyDown={handleQtyInputKeyDown}
                                      />
                                    </td>
                                  );
                                }
                                if (column.key === "unitCost") {
                                  return <td key={column.key} className="px-3 py-2 text-center text-gray-700">{toMoney(line.unitCost, invoice?.supplier?.currency || "USD")}</td>;
                                }
                                if (column.key === "totalValue") {
                                  return <td key={column.key} className="px-3 py-2 text-center font-semibold text-gray-900">{toMoney(line.totalValue, invoice?.supplier?.currency || "USD")}</td>;
                                }
                                return <td key={column.key} className="px-3 py-2 text-center">—</td>;
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Email Message (Optional)</p>
            {emailMessage && (
              <button
                type="button"
                className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
                onClick={() => setEmailMessage("")}
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
          <div className="p-4">
            <textarea
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              maxLength={2000}
              placeholder="Optional note to include in supplier email"
              className="min-h-[80px] w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
