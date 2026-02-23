import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, Package, Trash2, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { DataTable } from "../../../components/ui/DataTable";
import { Modal } from "../../../components/ui/Modal";
import { useInventory } from "../hooks/useInventory";
import { useWarehouses } from "../hooks/useWarehouses";
import { useSuppliers } from "../../purchases/hooks/useSuppliers";
import InventoryFilter from "../components/InventoryFilter";
import ImageGallery from "../../../components/ImageGallery";
import SelectCompact from "../../../components/SelectCompact";
import {
  getInventoryWarehouseStock,
  transferInventoryStockBulk,
  listInventoryUnallocatedVariants,
  reconcileInventoryStock,
} from "../../../lib/api";
import toast from "react-hot-toast";

const SHOW_INVENTORY_ACTIONS_COLUMN = true;
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const IMG_PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="100%" height="100%" fill="#f3f4f6"/><g fill="#9ca3af"><circle cx="26" cy="30" r="8"/><path d="M8 60l15-15 10 10 12-12 27 27H8z"/></g></svg>'
);
const NO_SUPPLIER_FILTER_VALUE = "__NO_SUPPLIER__";

const absImg = (path) => {
  if (!path) return IMG_PLACEHOLDER;
  if (path.startsWith("data:") || path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
};

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[\s.\-_/|·]+/g, "");

const getUploadSegments = (url) => {
  if (!url || !url.includes("/uploads/")) return null;
  return url.split("/uploads/")[1]?.split("/") || null;
};

const selectInventoryImages = (row) => {
  const images = Array.isArray(row.images) ? row.images : [];
  if (images.length === 0) return [];

  const parentImages = images.filter((img) => {
    const parts = getUploadSegments(img?.url || "");
    if (!parts) return true;
    return parts.length === 2;
  });

  if (row.isParent) {
    return (parentImages.length > 0 ? parentImages : images).map((img) => ({
      url: img.url,
      alt: row.productName || "Product image",
    }));
  }

  const variantImages = images.filter((img) => {
    const parts = getUploadSegments(img?.url || "");
    if (!parts || parts.length < 3) return false;
    return parts[1] === row.id;
  });

  const preferred = variantImages.length > 0 ? variantImages : (parentImages.length > 0 ? parentImages : images);
  return preferred.map((img) => ({
    url: img.url,
    alt: row.productName || "Variant image",
  }));
};

function formatCurrency(value) {
  if (value == null || isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function toWholeNumber(value) {
  const parsed = String(value ?? "").replace(/[^0-9]/g, "");
  if (!parsed) return 0;
  return Number(parsed);
}

function calculateReorderLevel(availableQty, thresholdQty, inTransitQty) {
  const available = Number(availableQty) || 0;
  const threshold = Number(thresholdQty) || 0;
  const inTransit = Number(inTransitQty) || 0;
  if (threshold <= 0) return 0;

  if (available < threshold) {
    const shortage = threshold - available;
    return inTransit >= shortage ? 0 : shortage;
  }

  return threshold - available;
}

export default function InventoryPage() {
  // Filters
  const [warehouseFilter, setWarehouseFilter] = useState({ id: "", name: "All Warehouses" });
  const [stockStatusFilter, setStockStatusFilter] = useState({ id: "", name: "All Stock Status" });
  const [supplierFilterIds, setSupplierFilterIds] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Data Hooks
  const { mutate: fetchInventory, data, isPending } = useInventory();
  const { data: warehouseData } = useWarehouses();
  const { data: supplierData = [] } = useSuppliers({ refetchOnWindowFocus: false });
  const warehouses = Array.isArray(warehouseData)
    ? warehouseData
    : (Array.isArray(warehouseData?.rows) ? warehouseData.rows : []);
  const suppliers = Array.isArray(supplierData)
    ? supplierData
    : (Array.isArray(supplierData?.rows) ? supplierData.rows : []);

  const warehouseOptions = useMemo(() =>
    warehouses.map(w => ({ id: w.id, name: w.name })),
    [warehouses]);
  const supplierOptions = useMemo(
    () => ([
      { value: NO_SUPPLIER_FILTER_VALUE, label: "No Supplier" },
      ...suppliers
        .filter((s) => s?.id)
        .map((s) => ({ value: s.id, label: s.companyName || s.id })),
    ]),
    [suppliers],
  );
  const supplierLabelById = useMemo(() => {
    const map = new Map();
    for (const option of supplierOptions) {
      map.set(String(option.value), option.label);
    }
    return map;
  }, [supplierOptions]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch data
  useEffect(() => {
    const includeNoSupplier = supplierFilterIds.includes(NO_SUPPLIER_FILTER_VALUE);
    const supplierIds = supplierFilterIds.filter((id) => id !== NO_SUPPLIER_FILTER_VALUE);
    fetchInventory({
      page,
      perPage,
      search: debouncedSearch || undefined,
      warehouseId: warehouseFilter.id || undefined,
      stockStatus: stockStatusFilter.id || undefined,
      supplierIds: supplierIds.length > 0 ? supplierIds : undefined,
      includeNoSupplier,
    });
  }, [fetchInventory, page, perPage, debouncedSearch, warehouseFilter.id, stockStatusFilter.id, supplierFilterIds]);

  const rows = data?.rows ?? [];
  const meta = data?.meta ?? { page: 1, perPage, total: 0, totalPages: 1 };
  const [warehouseBreakdownOpen, setWarehouseBreakdownOpen] = useState(false);
  const [warehouseBreakdownData, setWarehouseBreakdownData] = useState(null);

  const openWarehouseBreakdown = useCallback((row) => {
    const parentProduct = row?.isParent
      ? rows.find((item) => String(item.id) === String(row.id))
      : rows.find((item) => String(item.id) === String(row.parentId || row.productId));
    const productRow = parentProduct || row;
    const productName = productRow?.productName || row?.productName || "Product";

    const allVariants =
      Array.isArray(productRow?.variants) && productRow.variants.length > 0
        ? productRow.variants
        : [productRow];

    const sourceVariants = row?.isParent
      ? allVariants
      : allVariants.filter((variant) => String(variant?.id) === String(row?.id));

    const fallbackVariant =
      !row?.isParent && sourceVariants.length === 0
        ? [row]
        : sourceVariants;

    const variants = fallbackVariant.map((variant) => {
      const warehouses = Array.isArray(variant?.warehouseSummary)
        ? variant.warehouseSummary
          .filter((warehouse) => Number(warehouse?.onHand || 0) > 0)
          .sort((a, b) => Number(b.onHand || 0) - Number(a.onHand || 0))
        : [];
      const images = selectInventoryImages({
        id: variant?.id,
        isParent: false,
        productName,
        images: Array.isArray(variant?.images)
          ? variant.images
          : (Array.isArray(productRow?.images) ? productRow.images : []),
      });

      return {
        id: variant?.id || `${productName}-variant`,
        sku: variant?.sku || "—",
        sizeText: variant?.size || variant?.sizeText || "",
        colorText: variant?.color || variant?.colorText || "",
        images,
        warehouses,
        totalOnHand: warehouses.reduce((sum, warehouse) => sum + Number(warehouse.onHand || 0), 0),
      };
    });

    setWarehouseBreakdownData({
      productName,
      scope: row?.isParent ? "product" : "variant",
      variants,
    });
    setWarehouseBreakdownOpen(true);
  }, [rows]);

  const warehouseBreakdownRows = useMemo(() => {
    const variants = Array.isArray(warehouseBreakdownData?.variants) ? warehouseBreakdownData.variants : [];
    const tableRows = [];
    for (const variant of variants) {
      const details = [variant.sizeText, variant.colorText].filter(Boolean).join(" · ") || "Base variant";
      if (!Array.isArray(variant.warehouses) || variant.warehouses.length === 0) {
        tableRows.push({
          key: `${variant.id}-none`,
          sku: variant.sku,
          details,
          images: variant.images || [],
          warehouseName: "—",
          warehouseCode: "—",
          onHand: 0,
        });
        continue;
      }

      for (const warehouse of variant.warehouses) {
        tableRows.push({
          key: `${variant.id}-${warehouse.warehouseId}`,
          sku: variant.sku,
          details,
          images: variant.images || [],
          warehouseName: warehouse.warehouseName || "—",
          warehouseCode: warehouse.warehouseCode || "—",
          onHand: Number(warehouse.onHand || 0),
        });
      }
    }
    return tableRows;
  }, [warehouseBreakdownData]);

  const warehouseBreakdownStats = useMemo(() => {
    const variants = Array.isArray(warehouseBreakdownData?.variants) ? warehouseBreakdownData.variants : [];
    const warehouses = new Set();
    let totalOnHand = 0;
    for (const variant of variants) {
      totalOnHand += Number(variant?.totalOnHand || 0);
      for (const warehouse of (variant?.warehouses || [])) {
        if (warehouse?.warehouseId) warehouses.add(String(warehouse.warehouseId));
      }
    }
    return {
      variantCount: variants.length,
      warehouseCount: warehouses.size,
      totalOnHand,
    };
  }, [warehouseBreakdownData]);

  // Stock transfer modal state
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromWarehouseId: "",
    toWarehouseId: "",
    reason: "",
  });
  const [transferPickerValue, setTransferPickerValue] = useState("Select");
  const [sourceStockRows, setSourceStockRows] = useState([]);
  const [sourceStockLoading, setSourceStockLoading] = useState(false);
  const [selectedTransferItems, setSelectedTransferItems] = useState([]);
  const [transferSaving, setTransferSaving] = useState(false);
  const [rowTransferOpen, setRowTransferOpen] = useState(false);
  const [rowTransferRow, setRowTransferRow] = useState(null);
  const [rowTransferItems, setRowTransferItems] = useState([]);
  const [rowTransferSaving, setRowTransferSaving] = useState(false);
  const [rowTransferForm, setRowTransferForm] = useState({ reason: "" });

  // Reconciliation modal state
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [reconcileForm, setReconcileForm] = useState({ reason: "" });
  const [reconcilePickerValue, setReconcilePickerValue] = useState("Select");
  const [reconcileSearch, setReconcileSearch] = useState("");
  const [reconcileOptions, setReconcileOptions] = useState([]);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [selectedReconcileItems, setSelectedReconcileItems] = useState([]);
  const [reconcileSaving, setReconcileSaving] = useState(false);

  const transferWarehouseOptions = useMemo(
    () => (Array.isArray(warehouses) ? warehouses.filter((w) => w?.isActive !== false) : []),
    [warehouses],
  );

  const toggleRow = useCallback((id) => {
    setExpandedRowId((prev) => (String(prev) === String(id) ? null : id));
  }, []);

  const resetTransferForm = useCallback(() => {
    setTransferForm({
      fromWarehouseId: "",
      toWarehouseId: "",
      reason: "",
    });
    setTransferPickerValue("Select");
    setSourceStockRows([]);
    setSelectedTransferItems([]);
    setSourceStockLoading(false);
  }, []);

  const loadSourceStock = useCallback(async (warehouseId) => {
    if (!warehouseId) {
      setSourceStockRows([]);
      return [];
    }
    setSourceStockLoading(true);
    try {
      const payload = await getInventoryWarehouseStock(warehouseId);
      const stockRows = Array.isArray(payload?.stock) ? payload.stock : [];
      const mapped = stockRows
        .map((item) => {
          const variantId = item?.productVariantId || item?.productVariant?.id;
          if (!variantId) return null;
          const productName = item?.product?.name || "Product";
          const sku = item?.productVariant?.sku || "—";
          const sizeText = item?.productVariant?.sizeText || "";
          const colorText = item?.productVariant?.colorText || "";
          const details = [sizeText, colorText].filter(Boolean).join(" · ");
          const available = Number(item?.quantity || 0);
          const displayImages = selectInventoryImages({
            id: variantId,
            isParent: false,
            productName,
            images: Array.isArray(item?.product?.images) ? item.product.images : [],
          });

          return {
            value: variantId,
            label: `${productName} • ${sku}${details ? ` • ${details}` : ""}`,
            productName,
            sku,
            sizeText,
            colorText,
            available,
            images: displayImages,
          };
        })
        .filter((x) => x && x.available > 0);

      setSourceStockRows(mapped);
      return mapped;
    } catch (err) {
      setSourceStockRows([]);
      toast.error(err?.response?.data?.message || err?.message || "Failed to load source warehouse stock");
      return [];
    } finally {
      setSourceStockLoading(false);
    }
  }, []);

  const getRowPrefillVariantIds = useCallback((row) => {
    if (!row) return [];
    if (row.isParent) {
      const variants = Array.isArray(row.variants) ? row.variants : [];
      return variants
        .map((variant) => variant?.id)
        .filter(Boolean)
        .map((id) => String(id));
    }
    return row?.id ? [String(row.id)] : [];
  }, []);

  const getPreferredSourceWarehouseId = useCallback((row) => {
    if (!row) return "";
    const totals = new Map();

    const appendWarehouseSummary = (summary) => {
      const list = Array.isArray(summary) ? summary : [];
      for (const warehouse of list) {
        const warehouseId = warehouse?.warehouseId;
        const onHand = Number(warehouse?.onHand || 0);
        if (!warehouseId || onHand <= 0) continue;
        if (!transferWarehouseOptions.some((w) => String(w.id) === String(warehouseId))) continue;
        totals.set(String(warehouseId), Number(totals.get(String(warehouseId)) || 0) + onHand);
      }
    };

    if (row.isParent && Array.isArray(row.variants) && row.variants.length > 0) {
      row.variants.forEach((variant) => appendWarehouseSummary(variant?.warehouseSummary));
    } else {
      appendWarehouseSummary(row?.warehouseSummary);
    }

    let bestWarehouseId = "";
    let bestOnHand = -1;
    for (const [warehouseId, totalOnHand] of totals.entries()) {
      if (totalOnHand > bestOnHand) {
        bestOnHand = totalOnHand;
        bestWarehouseId = warehouseId;
      }
    }
    return bestWarehouseId;
  }, [transferWarehouseOptions]);

  const openTransferModal = useCallback(async (prefillRow = null) => {
    if (transferWarehouseOptions.length < 2) {
      toast.error("At least two active warehouses are required for transfers.");
      return;
    }

    const prefillVariantIds = new Set(getRowPrefillVariantIds(prefillRow));
    const preferredSource = prefillRow ? getPreferredSourceWarehouseId(prefillRow) : "";
    const filteredSource =
      warehouseFilter?.id && transferWarehouseOptions.some((w) => String(w.id) === String(warehouseFilter.id))
        ? String(warehouseFilter.id)
        : "";
    const preselectedSource = preferredSource || filteredSource;

    setTransferForm({
      fromWarehouseId: preselectedSource,
      toWarehouseId: "",
      reason: "",
    });
    setTransferPickerValue("Select");
    setSelectedTransferItems([]);
    setTransferOpen(true);
    if (preselectedSource) {
      const sourceRows = await loadSourceStock(preselectedSource);
      if (prefillVariantIds.size > 0) {
        const prefilledItems = sourceRows
          .filter((item) => prefillVariantIds.has(String(item.value)))
          .map((item) => ({ ...item, quantity: 1 }));
        setSelectedTransferItems(prefilledItems);
      }
    } else {
      setSourceStockRows([]);
    }
  }, [transferWarehouseOptions, warehouseFilter?.id, loadSourceStock, getPreferredSourceWarehouseId, getRowPrefillVariantIds]);

  const resetRowTransferForm = useCallback(() => {
    setRowTransferForm({ reason: "" });
    setRowTransferRow(null);
    setRowTransferItems([]);
    setRowTransferSaving(false);
  }, []);

  const buildRowTransferItems = useCallback((row) => {
    if (!row) return [];
    const variants = row.isParent ? (Array.isArray(row.variants) ? row.variants : []) : [row];
    const lines = [];

    for (const variant of variants) {
      const variantId = variant?.id;
      if (!variantId) continue;
      const summary = Array.isArray(variant?.warehouseSummary) ? variant.warehouseSummary : [];
      const productName = variant?.productName || row?.productName || "Product";
      const sku = variant?.sku || row?.sku || "—";
      const sizeText = variant?.size || variant?.sizeText || "";
      const colorText = variant?.color || variant?.colorText || "";
      const images = selectInventoryImages({
        id: variantId,
        isParent: false,
        productName,
        images: Array.isArray(variant?.images)
          ? variant.images
          : (Array.isArray(row?.images) ? row.images : []),
      });

      for (const wh of summary) {
        const sourceWarehouseId = wh?.warehouseId;
        const sourceWarehouseName = wh?.warehouseName || "Warehouse";
        const available = Number(wh?.onHand || 0);
        if (!sourceWarehouseId || available <= 0) continue;
        if (!transferWarehouseOptions.some((x) => String(x.id) === String(sourceWarehouseId))) continue;

        lines.push({
          lineId: `${variantId}-${sourceWarehouseId}`,
          value: String(variantId),
          productName,
          sku,
          sizeText,
          colorText,
          images,
          sourceWarehouseId: String(sourceWarehouseId),
          sourceWarehouseName,
          destinationWarehouseId: "",
          available,
          quantity: available,
        });
      }
    }

    return lines;
  }, [transferWarehouseOptions]);

  const openRowTransferModal = useCallback(async (row) => {
    if (!row) return;
    if (transferWarehouseOptions.length < 2) {
      toast.error("At least two active warehouses are required for transfers.");
      return;
    }
    const lines = buildRowTransferItems(row);
    if (lines.length === 0) return toast.error("No stock available for this row.");

    setRowTransferRow(row);
    setRowTransferForm({ reason: "" });
    setRowTransferItems(lines);
    setRowTransferOpen(true);
  }, [transferWarehouseOptions, buildRowTransferItems]);

  const getRowLineDestinationOptions = useCallback((sourceWarehouseId) => {
    return transferWarehouseOptions
      .filter((w) => String(w.id) !== String(sourceWarehouseId))
      .map((w) => ({
        value: w.id,
        label: w.name,
      }));
  }, [transferWarehouseOptions]);

  const handleRowTransferDestinationChange = useCallback((lineId, value) => {
    const nextDestination = value === "Select" ? "" : value;
    setRowTransferItems((prev) =>
      prev.map((line) => (line.lineId === lineId ? { ...line, destinationWarehouseId: nextDestination } : line)),
    );
  }, []);

  const handleRowTransferQtyChange = useCallback((lineId, rawValue) => {
    const qty = toWholeNumber(rawValue);
    setRowTransferItems((prev) =>
      prev.map((line) => {
        if (line.lineId !== lineId) return line;
        const nextQty = Math.max(0, Math.min(Number(line.available || 0), qty));
        return { ...line, quantity: nextQty };
      }),
    );
  }, []);

  const rowTransferLineErrors = useMemo(() => {
    const errors = new Map();
    for (const item of rowTransferItems) {
      const key = item.lineId;
      if (!item.destinationWarehouseId) {
        errors.set(key, "Select destination");
        continue;
      }
      if (String(item.destinationWarehouseId) === String(item.sourceWarehouseId)) {
        errors.set(key, "Destination must be different");
        continue;
      }
      const qty = Number(item.quantity || 0);
      const maxQty = Number(item.available || 0);
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
        errors.set(key, "Enter valid qty");
        continue;
      }
      if (qty > maxQty) {
        errors.set(key, `Max ${maxQty}`);
      }
    }
    return errors;
  }, [rowTransferItems]);

  const canSubmitRowTransfer = useMemo(
    () =>
      rowTransferItems.length > 0 &&
      rowTransferLineErrors.size === 0 &&
      !rowTransferSaving,
    [rowTransferItems.length, rowTransferLineErrors, rowTransferSaving],
  );

  const handleRowTransferSubmit = useCallback(async () => {
    if (rowTransferItems.length === 0) return toast.error("No stock available for selected lines");
    if (rowTransferLineErrors.size > 0) return toast.error("Please fix destination/quantity in all lines");

    const grouped = new Map();
    for (const item of rowTransferItems) {
      const qty = Math.floor(Number(item.quantity || 0));
      if (qty <= 0) continue;
      const fromWarehouseId = String(item.sourceWarehouseId);
      const toWarehouseId = String(item.destinationWarehouseId);
      const key = `${fromWarehouseId}|${toWarehouseId}`;
      if (!grouped.has(key)) grouped.set(key, { fromWarehouseId, toWarehouseId, items: [] });
      grouped.get(key).items.push({
        productVariantId: item.value,
        quantity: qty,
      });
    }
    if (grouped.size === 0) return toast.error("No valid transfer lines found");

    setRowTransferSaving(true);
    try {
      let movedCount = 0;
      for (const transfer of grouped.values()) {
        const response = await transferInventoryStockBulk({
          fromWarehouseId: transfer.fromWarehouseId,
          toWarehouseId: transfer.toWarehouseId,
          reason: rowTransferForm.reason?.trim() || undefined,
          items: transfer.items,
        });
        movedCount += Number(response?.itemsProcessed || transfer.items.length);
      }
      toast.success(`Stock moved for ${movedCount} item${movedCount > 1 ? "s" : ""}`);
      fetchInventory({
        page,
        perPage,
        search: debouncedSearch || undefined,
        warehouseId: warehouseFilter.id || undefined,
        stockStatus: stockStatusFilter.id || undefined,
      });
      setRowTransferOpen(false);
      resetRowTransferForm();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to move stock");
    } finally {
      setRowTransferSaving(false);
    }
  }, [rowTransferItems, rowTransferLineErrors, rowTransferForm.reason, fetchInventory, page, perPage, debouncedSearch, warehouseFilter.id, stockStatusFilter.id, resetRowTransferForm]);

  const toWarehouseSelectOptions = useMemo(
    () =>
      transferWarehouseOptions
        .filter((w) => String(w.id) !== String(transferForm.fromWarehouseId))
        .map((w) => ({
          value: w.id,
          label: w.name,
        })),
    [transferWarehouseOptions, transferForm.fromWarehouseId],
  );

  const fromWarehouseSelectOptions = useMemo(
    () =>
      transferWarehouseOptions.map((w) => ({
        value: w.id,
        label: w.name,
      })),
    [transferWarehouseOptions],
  );

  const selectedTransferValues = useMemo(
    () => new Set(selectedTransferItems.map((item) => String(item.value))),
    [selectedTransferItems],
  );

  const sourceStockSelectOptions = useMemo(
    () => ["Select", ...sourceStockRows.filter((row) => !selectedTransferValues.has(String(row.value)))],
    [sourceStockRows, selectedTransferValues],
  );

  const handleAddTransferItem = useCallback((val) => {
    if (!val || val === "Select") {
      setTransferPickerValue("Select");
      return;
    }
    const option = sourceStockRows.find((opt) => String(opt.value) === String(val));
    if (!option) return;
    setSelectedTransferItems((prev) => {
      if (prev.some((x) => String(x.value) === String(option.value))) return prev;
      return [...prev, { ...option, quantity: 1 }];
    });
    setTransferPickerValue("Select");
  }, [sourceStockRows]);

  const handleTransferQtyChange = useCallback((variantId, rawValue) => {
    const qty = toWholeNumber(rawValue);
    setSelectedTransferItems((prev) =>
      prev.map((item) => {
        if (String(item.value) !== String(variantId)) return item;
        const nextQty = Math.max(0, Math.min(item.available, qty));
        return { ...item, quantity: nextQty };
      }),
    );
  }, []);

  const removeTransferItem = useCallback((variantId) => {
    setSelectedTransferItems((prev) => prev.filter((item) => String(item.value) !== String(variantId)));
  }, []);

  useEffect(() => {
    if (!transferOpen) return;
    if (!transferForm.fromWarehouseId) {
      setSourceStockRows([]);
      return;
    }
    loadSourceStock(transferForm.fromWarehouseId);
  }, [transferOpen, transferForm.fromWarehouseId, loadSourceStock]);

  useEffect(() => {
    if (!transferOpen) return;
    const sourceMap = new Map(sourceStockRows.map((row) => [String(row.value), row]));
    setSelectedTransferItems((prev) => {
      let changed = false;
      const next = [];

      for (const item of prev) {
        const fresh = sourceMap.get(String(item.value));
        if (!fresh || Number(fresh.available || 0) <= 0) {
          changed = true;
          continue;
        }

        const previousQty = Number(item.quantity || 0);
        const nextQty = Math.max(0, Math.min(Number(fresh.available || 0), previousQty));
        if (
          previousQty !== nextQty ||
          Number(item.available || 0) !== Number(fresh.available || 0) ||
          item.sku !== fresh.sku ||
          item.productName !== fresh.productName ||
          item.sizeText !== fresh.sizeText ||
          item.colorText !== fresh.colorText
        ) {
          changed = true;
        }

        next.push({ ...fresh, quantity: nextQty });
      }

      return changed ? next : prev;
    });
  }, [transferOpen, sourceStockRows]);

  const transferItemErrors = useMemo(() => {
    const errors = new Map();
    for (const item of selectedTransferItems) {
      const key = String(item.value);
      const qty = Number(item.quantity || 0);
      const available = Number(item.available || 0);
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
        errors.set(key, "Enter a valid quantity");
        continue;
      }
      if (qty > available) {
        errors.set(key, `Max ${available}`);
      }
    }
    return errors;
  }, [selectedTransferItems]);

  const canSubmitTransfer = useMemo(
    () =>
      !!transferForm.fromWarehouseId &&
      !!transferForm.toWarehouseId &&
      String(transferForm.fromWarehouseId) !== String(transferForm.toWarehouseId) &&
      selectedTransferItems.length > 0 &&
      transferItemErrors.size === 0 &&
      !sourceStockLoading &&
      !transferSaving,
    [
      transferForm.fromWarehouseId,
      transferForm.toWarehouseId,
      selectedTransferItems.length,
      transferItemErrors,
      sourceStockLoading,
      transferSaving,
    ],
  );

  const handleTransferSubmit = async () => {
    if (!transferForm.fromWarehouseId) return toast.error("Please select source warehouse");
    if (!transferForm.toWarehouseId) return toast.error("Please select destination warehouse");
    if (transferForm.fromWarehouseId === transferForm.toWarehouseId) return toast.error("Source and destination must be different");
    if (selectedTransferItems.length === 0) return toast.error("Please select at least one product");
    if (transferItemErrors.size > 0) {
      const firstInvalid = selectedTransferItems.find((item) => transferItemErrors.has(String(item.value)));
      return toast.error(
        `${transferItemErrors.get(String(firstInvalid?.value || "")) || "Fix invalid quantities"}${firstInvalid ? ` for ${firstInvalid.sku || firstInvalid.productName}` : ""
        }`,
      );
    }

    setTransferSaving(true);
    try {
      const payload = {
        fromWarehouseId: transferForm.fromWarehouseId,
        toWarehouseId: transferForm.toWarehouseId,
        reason: transferForm.reason?.trim() || undefined,
        items: selectedTransferItems.map((item) => ({
          productVariantId: item.value,
          quantity: Math.floor(Number(item.quantity)),
        })),
      };
      const response = await transferInventoryStockBulk(payload);
      const movedCount = Number(response?.itemsProcessed || selectedTransferItems.length);
      toast.success(`Stock moved for ${movedCount} item${movedCount > 1 ? "s" : ""}`);
      fetchInventory({
        page,
        perPage,
        search: debouncedSearch || undefined,
        warehouseId: warehouseFilter.id || undefined,
        stockStatus: stockStatusFilter.id || undefined,
      });
      setTransferOpen(false);
      resetTransferForm();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to move stock");
    } finally {
      setTransferSaving(false);
    }
  };

  const loadReconcileOptions = useCallback(async (searchTerm = "") => {
    setReconcileLoading(true);
    try {
      const payload = await listInventoryUnallocatedVariants({ search: searchTerm || undefined });
      const options = (Array.isArray(payload?.rows) ? payload.rows : []).map((row) => {
        const details = [row.sizeText, row.colorText].filter(Boolean).join(" · ");
        const displayImages = selectInventoryImages({
          id: row.productVariantId,
          isParent: false,
          productName: row.productName || "Product",
          images: Array.isArray(row.images) ? row.images : [],
        });
        return {
          value: row.productVariantId,
          label: `${row.productName || "Product"} • ${row.sku || "—"}${details ? ` • ${details}` : ""}`,
          productName: row.productName || "Product",
          sku: row.sku || "—",
          sizeText: row.sizeText || "",
          colorText: row.colorText || "",
          unallocatedOnHand: Number(row.unallocatedOnHand || 0),
          images: displayImages,
        };
      });
      setReconcileOptions(options);
    } catch (err) {
      setReconcileOptions([]);
      toast.error(err?.response?.data?.message || err?.message || "Failed to load reconciliation products");
    } finally {
      setReconcileLoading(false);
    }
  }, []);

  const resetReconcileForm = useCallback(() => {
    setReconcileForm({ reason: "" });
    setReconcilePickerValue("Select");
    setReconcileSearch("");
    setReconcileOptions([]);
    setSelectedReconcileItems([]);
    setReconcileLoading(false);
  }, []);

  const openReconcileModal = useCallback(async () => {
    if (transferWarehouseOptions.length === 0) {
      toast.error("At least one active warehouse is required for reconciliation.");
      return;
    }
    setReconcileOpen(true);
    setReconcileForm({ reason: "" });
    setReconcilePickerValue("Select");
    setSelectedReconcileItems([]);
    setReconcileSearch("");
    await loadReconcileOptions("");
  }, [transferWarehouseOptions.length, loadReconcileOptions]);

  useEffect(() => {
    if (!reconcileOpen) return;
    const timer = setTimeout(() => {
      loadReconcileOptions(reconcileSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [reconcileOpen, reconcileSearch, loadReconcileOptions]);

  const selectedReconcileValues = useMemo(
    () => new Set(selectedReconcileItems.map((item) => String(item.value))),
    [selectedReconcileItems],
  );

  const reconcileSelectOptions = useMemo(
    () => ["Select", ...reconcileOptions.filter((row) => !selectedReconcileValues.has(String(row.value)))],
    [reconcileOptions, selectedReconcileValues],
  );

  const handleAddReconcileItem = useCallback((val) => {
    if (!val || val === "Select") {
      setReconcilePickerValue("Select");
      return;
    }
    const option = reconcileOptions.find((opt) => String(opt.value) === String(val));
    if (!option) return;
    setSelectedReconcileItems((prev) => {
      if (prev.some((x) => String(x.value) === String(option.value))) return prev;
      return [...prev, { ...option, warehouseId: "", quantity: option.unallocatedOnHand }];
    });
    setReconcilePickerValue("Select");
  }, [reconcileOptions]);

  const handleReconcileQtyChange = useCallback((variantId, rawValue) => {
    const qty = toWholeNumber(rawValue);
    setSelectedReconcileItems((prev) =>
      prev.map((item) => {
        if (String(item.value) !== String(variantId)) return item;
        return { ...item, quantity: Math.max(0, Math.min(item.unallocatedOnHand, qty)) };
      }),
    );
  }, []);

  const handleReconcileWarehouseChange = useCallback((variantId, warehouseId) => {
    setSelectedReconcileItems((prev) =>
      prev.map((item) => {
        if (String(item.value) !== String(variantId)) return item;
        return { ...item, warehouseId };
      }),
    );
  }, []);

  const handleReconcileAllQty = useCallback((variantId) => {
    setSelectedReconcileItems((prev) =>
      prev.map((item) => {
        if (String(item.value) !== String(variantId)) return item;
        return { ...item, quantity: item.unallocatedOnHand };
      }),
    );
  }, []);

  const removeReconcileItem = useCallback((variantId) => {
    setSelectedReconcileItems((prev) => prev.filter((item) => String(item.value) !== String(variantId)));
  }, []);

  useEffect(() => {
    if (!reconcileOpen || reconcileOptions.length === 0) return;
    const optionMap = new Map(reconcileOptions.map((row) => [String(row.value), row]));
    setSelectedReconcileItems((prev) => {
      let changed = false;
      const next = prev
        .map((item) => {
          const fresh = optionMap.get(String(item.value));
          if (!fresh) return item;
          const nextQty = Math.max(0, Math.min(Number(item.quantity || 0), Number(fresh.unallocatedOnHand || 0)));
          if (
            nextQty !== Number(item.quantity || 0) ||
            Number(item.unallocatedOnHand || 0) !== Number(fresh.unallocatedOnHand || 0) ||
            item.sku !== fresh.sku ||
            item.productName !== fresh.productName ||
            item.sizeText !== fresh.sizeText ||
            item.colorText !== fresh.colorText
          ) {
            changed = true;
          }
          return { ...item, ...fresh, quantity: nextQty };
        })
        .filter((item) => Number(item.unallocatedOnHand || 0) > 0);

      if (next.length !== prev.length) changed = true;
      return changed ? next : prev;
    });
  }, [reconcileOpen, reconcileOptions]);

  const reconcileItemErrors = useMemo(() => {
    const errors = new Map();
    for (const item of selectedReconcileItems) {
      const key = String(item.value);
      if (!item.warehouseId) {
        errors.set(key, "Select a warehouse");
        continue;
      }
      const qty = Number(item.quantity || 0);
      const maxQty = Number(item.unallocatedOnHand || 0);
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
        errors.set(key, "Enter a valid quantity");
        continue;
      }
      if (qty > maxQty) {
        errors.set(key, `Max ${maxQty}`);
      }
    }
    return errors;
  }, [selectedReconcileItems]);

  const canSubmitReconcile = useMemo(
    () =>
      selectedReconcileItems.length > 0 &&
      reconcileItemErrors.size === 0 &&
      !reconcileLoading &&
      !reconcileSaving,
    [selectedReconcileItems.length, reconcileItemErrors, reconcileLoading, reconcileSaving],
  );

  const handleReconcileSubmit = async () => {
    if (selectedReconcileItems.length === 0) return toast.error("Please select at least one product");
    if (reconcileItemErrors.size > 0) {
      const firstInvalid = selectedReconcileItems.find((item) => reconcileItemErrors.has(String(item.value)));
      return toast.error(
        `${reconcileItemErrors.get(String(firstInvalid?.value || "")) || "Fix invalid reconciliation lines"}${firstInvalid ? ` for ${firstInvalid.sku || firstInvalid.productName}` : ""
        }`,
      );
    }

    setReconcileSaving(true);
    try {
      const payload = {
        reason: reconcileForm.reason?.trim() || undefined,
        items: selectedReconcileItems.map((item) => ({
          productVariantId: item.value,
          warehouseId: item.warehouseId,
          quantity: Math.floor(Number(item.quantity)),
        })),
      };
      const res = await reconcileInventoryStock(payload);
      toast.success(`Reconciled ${res?.itemsProcessed || selectedReconcileItems.length} item(s)`);
      setReconcileOpen(false);
      resetReconcileForm();
      fetchInventory({
        page,
        perPage,
        search: debouncedSearch || undefined,
        warehouseId: warehouseFilter.id || undefined,
        stockStatus: stockStatusFilter.id || undefined,
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to reconcile stock");
    } finally {
      setReconcileSaving(false);
    }
  };

  // Use simple rows from API, expand logic handled in render like OrdersPage if nested items existed,
  // but Inventory API returns flattened-like structure or structure with variants.
  // The current API structure seems to return products at top level with `variants` array.

  // Flatten for table display
  const flattenedRows = useMemo(() => {
    const result = [];
    for (const row of rows) {
      // For parent rows, aggregate threshold and stock from all variants (if variant product)
      // or use parent-level values (if simple product with single variant)
      const variants = row.variants || [];
      const isVariantProduct = variants.length > 1;

      // Calculate aggregated values for parent row
      const totalThreshold = variants.reduce((sum, v) => sum + (v.threshold || 0), 0);
      const parentReorderLevel = isVariantProduct
        ? variants.reduce((sum, v) => {
          const variantReorderLevel = calculateReorderLevel(v?.stockOnHand, v?.threshold, v?.inTransit);
          return sum + Math.max(0, variantReorderLevel);
        }, 0)
        : calculateReorderLevel(variants[0]?.stockOnHand, variants[0]?.threshold, variants[0]?.inTransit);

      // For simple product (1 variant), use that variant's threshold
      const parentThreshold = isVariantProduct ? totalThreshold : (variants[0]?.threshold || 0);

      result.push({
        ...row,
        isParent: true,
        hasVariants: !!(variants.length > 1),
        threshold: parentThreshold,
        reorderLevel: parentReorderLevel,
      });

      if (String(expandedRowId) === String(row.id) && variants.length > 1) {
        for (const variant of variants) {
          const variantThreshold = variant.threshold || 0;
          const variantReorderLevel = calculateReorderLevel(
            variant.stockOnHand,
            variantThreshold,
            variant.inTransit,
          );

          result.push({
            ...variant,
            isParent: false,
            parentId: row.id,
            productName: variant.productName || row.productName,
            sku: variant.sku,
            threshold: variantThreshold,
            reorderLevel: variantReorderLevel,
          });
        }
      }
    }
    return result;
  }, [rows, expandedRowId]);

  // Column definitions
  const columns = useMemo(
    () => {
      const baseColumns = [
      // Expand / Toggle
      {
        key: "expand",
        label: "",
        headerClassName: "sticky left-0 z-30 !bg-gray-50 w-[40px] !pl-3 flex-shrink-0 !items-center",
        className: "sticky left-0 z-20 !bg-white group-hover:!bg-gray-50 w-[40px] !pl-3 flex-shrink-0 !items-center",
        render: (row) => {
          if (!row.isParent) {
            return (
              <div className="relative flex items-center justify-center h-[calc(100%+1.5rem)] -my-3 w-full">
                <span className="absolute inset-y-0 w-px bg-gray-300" />
              </div>
            );
          }
          if (!row.hasVariants) return <div className="min-h-[3rem] py-1"></div>;
          const isExpanded = String(expandedRowId) === String(row.id);
          return (
            <div className="flex items-center justify-center min-h-[3rem] py-1">
              <button
                onClick={(e) => { e.stopPropagation(); toggleRow(row.id); }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
          );
        },
      },
      // Product Info (Image + Name + SKU Stacked)
      {
        key: "productName",
        label: "Product",
        headerClassName: "sticky left-[40px] z-30 !bg-gray-50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]",
        className: "sticky left-[40px] z-20 !bg-white group-hover:!bg-gray-50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] min-w-[286px] !items-start",
        render: (row) => {
          const displayImages = selectInventoryImages(row);
          const isVariant = !row.isParent;
          const name = row.productName || "—";
          const sku = row.sku || "";
          const details = [row.size, row.color].filter(Boolean).join(" · ");
          const normalizedName = normalizeText(name);
          const normalizedSku = normalizeText(sku);
          const normalizedDetails = normalizeText(details);
          const normalizedSize = normalizeText(row.size || "");
          const normalizedColor = normalizeText(row.color || "");
          const skuMatchesSizeColorCombo =
            !!normalizedSku &&
            !!normalizedSize &&
            !!normalizedColor &&
            (normalizedSku === `${normalizedSize}${normalizedColor}` ||
              normalizedSku === `${normalizedColor}${normalizedSize}`);
          const skuDuplicatedInDetails = !!normalizedSku && !!normalizedDetails && normalizedDetails.includes(normalizedSku);
          const showSku =
            !!sku &&
            normalizedSku !== normalizedName &&
            !skuDuplicatedInDetails &&
            !skuMatchesSizeColorCombo;
          const showDetails =
            !!details &&
            normalizedDetails !== normalizedName &&
            normalizedDetails !== normalizedSku;

          return (
            <div className={`flex items-start gap-3 min-h-[3rem] py-1 ${isVariant ? "pl-0" : ""}`}>
              <div className="flex-shrink-0 mt-0.5">
                <ImageGallery
                  images={displayImages}
                  absImg={absImg}
                  placeholder={IMG_PLACEHOLDER}
                  compact={true}
                  className="h-9 w-9"
                  thumbnailClassName="h-9 w-9 bg-white"
                />
              </div>

              <div className="flex flex-col gap-0.5 min-w-0">
                <span className={`text-[13px] font-medium truncate ${row.isParent ? "text-gray-900" : "text-gray-700"}`} title={name}>
                  {name}
                </span>
                {showSku && (
                  <div className="text-[12px] text-gray-500">
                    <span>{sku}</span>
                  </div>
                )}
                {showDetails && (
                  <span className="text-[11px] text-gray-400">
                    {details}
                  </span>
                )}
              </div>
            </div>
          )
        },
      },
      // Warehouse
      {
        key: "warehouse",
        label: "Warehouse",
        headerClassName: "!pl-5",
        className: "min-w-[150px] !items-start !pl-5",
        render: (row) => {
          const warehouseSummary = Array.isArray(row.warehouseSummary)
            ? row.warehouseSummary.filter((warehouse) => Number(warehouse?.onHand || 0) > 0)
            : [];
          const preview = warehouseSummary.slice(0, 2);

          if (preview.length === 0) {
            return (
              <div className="flex items-center min-h-[3rem] py-1 text-[13px] text-gray-700">—</div>
            );
          }

          return (
            <div className="flex flex-col items-start gap-0.5 min-h-[3rem] py-1">
              {preview.map((warehouse, index) => (
                <button
                  key={`${row.id}-${warehouse.warehouseId}`}
                  type="button"
                  className="text-left text-[12px] text-amber-700 font-medium hover:opacity-80"
                  onClick={(e) => {
                    e.stopPropagation();
                    openWarehouseBreakdown(row);
                  }}
                  title="View full warehouse stock"
                >
                  {warehouse.warehouseName}({warehouse.onHand}){index < preview.length - 1 ? "," : ""}
                </button>
              ))}
              {warehouseSummary.length > 2 && (
                <button
                  type="button"
                  className="text-left text-[11px] text-amber-700 font-medium hover:opacity-80"
                  onClick={(e) => {
                    e.stopPropagation();
                    openWarehouseBreakdown(row);
                  }}
                  title="View full warehouse stock"
                >
                  +more
                </button>
              )}
            </div>
          );
        },
      },
      // Stock
      {
        key: "stockOnHand",
        label: "Available",
        className: "min-w-[80px] !items-start text-center justify-center",
        headerClassName: "justify-center",
        render: (row) => (
          <div className="flex items-center justify-center min-h-[3rem] py-1">
            <span className={`text-[13px] font-semibold ${row.stockOnHand <= 0 ? "text-rose-500" : "text-emerald-700"}`}>
              {row.stockOnHand ?? 0}
            </span>
          </div>
        ),
      },
      // Reserved
      {
        key: "reservedQty",
        label: "Reserved",
        className: "min-w-[80px] !items-start text-center justify-center",
        headerClassName: "justify-center",
        render: (row) => (
          <div className="flex items-center justify-center min-h-[3rem] py-1 text-[13px] text-gray-600">
            {row.reservedQty ?? 0}
          </div>
        ),
      },
      // In Transit
      {
        key: "inTransit",
        label: "In Transit",
        className: "min-w-[80px] !items-start text-center justify-center",
        headerClassName: "justify-center",
        render: (row) => (
          <div className="flex items-center justify-center min-h-[3rem] py-1 text-[13px] text-gray-600">
            {row.inTransit ?? 0}
          </div>
        ),
      },
      // Returns
      {
        key: "returns",
        label: "Returns",
        className: "min-w-[80px] !items-start text-center justify-center",
        headerClassName: "justify-center",
        render: (row) => (
          <div className="flex items-center justify-center min-h-[3rem] py-1 text-[13px] text-gray-600">
            {row.returns ?? 0}
          </div>
        ),
      },
      // Threshold
      {
        key: "threshold",
        label: "Threshold",
        className: "min-w-[80px] !items-start text-center justify-center",
        headerClassName: "justify-center",
        render: (row) => (
          <div className="flex items-center justify-center min-h-[3rem] py-1 text-[13px] text-gray-600">
            {row.threshold ?? 0}
          </div>
        ),
      },
      // Reorder Level
      {
        key: "reorderLevel",
        label: "Reorder",
        className: "min-w-[80px] !items-start text-center justify-center",
        headerClassName: "justify-center",
        render: (row) => {
          const reorderLevel = Number(row.reorderLevel ?? 0);
          const isReorderNeeded = reorderLevel > 0;

          return (
            <div className={`flex items-center justify-center min-h-[3rem] py-1 text-[13px] ${isReorderNeeded ? "text-red-600 font-semibold" : "text-gray-600"}`}>
              {reorderLevel}
            </div>
          );
        },
      },
      // Orders (Pending/Active)
      {
        key: "totalOrders",
        label: "Orders",
        className: "min-w-[70px] !items-start text-center justify-center",
        headerClassName: "justify-center",
        render: (row) => (
          <div className="flex items-center justify-center min-h-[3rem] py-1 text-[13px] text-gray-800 font-medium">
            {row.totalOrders ?? 0}
          </div>
        ),
      },
      // Prices (Unit Cost)
      {
        key: "costPrice",
        label: "Unit Cost",
        className: "min-w-[100px] !items-start text-center justify-center",
        headerClassName: "justify-center",
        render: (row) => (
          <div className="flex items-center justify-center min-h-[3rem] py-1 text-[13px] text-gray-600">
            {formatCurrency(row.costPrice)}
          </div>
        ),
      },
      // Total Value
      {
        key: "totalValue",
        label: "Total Value",
        className: "min-w-[110px] !items-start text-center justify-center",
        headerClassName: "justify-center",
        render: (row) => (
          <div className="flex items-center justify-center min-h-[3rem] py-1 text-[13px] text-gray-900 font-semibold">
            {formatCurrency(row.totalValue)}
          </div>
        ),
      },
      ];

      if (SHOW_INVENTORY_ACTIONS_COLUMN) {
        baseColumns.push({
          key: "actions",
          label: "Actions",
          headerClassName: "sticky right-0 z-20 !bg-gray-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] !justify-center !pl-0 !pr-0 w-[130px]",
          className: "sticky right-0 z-10 !bg-white group-hover:!bg-gray-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] h-full !justify-center !pl-0 !pr-0 w-[130px]",
          render: (row) => (
            <div className="flex items-center justify-center min-h-[3rem] py-1 w-full">
              <Button
                variant="secondary"
                size="xs"
                className="rounded-md"
                onClick={(e) => {
                  e.stopPropagation();
                  openRowTransferModal(row);
                }}
              >
                Transfer Stock
              </Button>
            </div>
          ),
        });
      }

      return baseColumns;
    },
    [expandedRowId, toggleRow, openWarehouseBreakdown, openRowTransferModal]
  );

  // Filter Handlers
  const handleFilterApply = (newFilters) => {
    setSearch(newFilters.search);
    setWarehouseFilter(newFilters.warehouse);
    setStockStatusFilter(newFilters.stockStatus);
    setSupplierFilterIds(Array.isArray(newFilters.supplierIds) ? newFilters.supplierIds : []);
    setPage(1);
  };


  // Toolbar
  const toolbar = (
    <div className="flex items-center gap-3 w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products, SKU..."
          className="h-9 w-[240px] rounded-lg border border-gray-300 pl-9 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all"
        />
      </div>

      <InventoryFilter
        filters={{
          search,
          warehouse: warehouseFilter,
          stockStatus: stockStatusFilter,
          supplierIds: supplierFilterIds,
        }}
        options={{ warehouseOptions, supplierOptions }}
        onApply={handleFilterApply}
      />

      {(warehouseFilter.id || stockStatusFilter.id || supplierFilterIds.length > 0) && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-medium text-gray-500">Applied:</span>

          {warehouseFilter.id && (
            <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-200 whitespace-nowrap">
              {warehouseFilter.name}
              <button onClick={() => setWarehouseFilter({ id: "", name: "All Warehouses" })} className="hover:text-red-500"><X size={10} /></button>
            </div>
          )}

          {stockStatusFilter.id && (
            <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-200 whitespace-nowrap">
              {stockStatusFilter.name}
              <button onClick={() => setStockStatusFilter({ id: "", name: "All Stock Status" })} className="hover:text-red-500"><X size={10} /></button>
            </div>
          )}

          {supplierFilterIds.map((supplierId) => (
            <div key={supplierId} className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-200 whitespace-nowrap">
              {supplierLabelById.get(String(supplierId)) || "Supplier"}
              <button
                onClick={() => setSupplierFilterIds((prev) => prev.filter((id) => String(id) !== String(supplierId)))}
                className="hover:text-red-500"
              >
                <X size={10} />
              </button>
            </div>
          ))}

          <div className="h-4 w-px bg-gray-300 mx-1" />

          <Button
            variant="ghost"
            size="xs"
            className="text-red-600 hover:bg-red-50 h-6 px-2"
            onClick={() => handleFilterApply({
              search: "",
              warehouse: { id: "", name: "All Warehouses" },
              stockStatus: { id: "", name: "All Stock Status" },
              supplierIds: [],
            })}
          >
            <Trash2 size={12} className="mr-1" /> Clear all
          </Button>
        </div>
      )}

      <div className="flex-1" />
      <Button
        variant="secondary"
        size="sm"
        onClick={openReconcileModal}
      >
        Reconcile Stock
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={openTransferModal}
      >
        Transfer Stock
      </Button>
      <div className="text-[13px] text-gray-500 font-medium">
        {meta.total} items
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-full min-w-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-md bg-amber-100 border border-gray-200 flex items-center justify-center">
          <Package size={18} className="text-amber-700" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">View and manage stock levels for all products and variants</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={flattenedRows}
        isLoading={isPending}
        rowKey={(row) => row.id}
        gridCols={SHOW_INVENTORY_ACTIONS_COLUMN
          ? "grid-cols-[40px_minmax(299px,2.015fr)_minmax(150px,0.5fr)_minmax(90px,0.5fr)_minmax(90px,0.5fr)_minmax(90px,0.5fr)_minmax(90px,0.5fr)_minmax(90px,0.5fr)_minmax(90px,0.5fr)_minmax(80px,0.5fr)_minmax(110px,0.6fr)_minmax(120px,0.8fr)_130px]"
          : "grid-cols-[40px_minmax(299px,2.015fr)_minmax(150px,0.5fr)_minmax(90px,0.5fr)_minmax(90px,0.5fr)_minmax(90px,0.5fr)_minmax(90px,0.5fr)_minmax(90px,0.5fr)_minmax(90px,0.5fr)_minmax(80px,0.5fr)_minmax(110px,0.6fr)_minmax(120px,0.8fr)]"}
        emptyMessage="No inventory items found"
        toolbar={toolbar}
        rowClassName={(row) =>
          !row.isParent ? "bg-gray-50/50" : "hover:bg-gray-50"
        }
      />

      {!isPending && meta && meta.total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border border-gray-200 bg-white rounded-xl mt-4">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">{(meta.page - 1) * meta.perPage + 1}</span> to{" "}
            <span className="font-medium">
              {Math.min(meta.page * meta.perPage, meta.total)}
            </span>{" "}
            of <span className="font-medium">{meta.total}</span> results
          </div>
          <div className="flex items-center gap-4">
            <div className="w-[120px]">
              <SelectCompact
                value={perPage}
                onChange={(val) => {
                  setPerPage(Number(val));
                  setPage(1);
                }}
                options={[
                  { value: 25, label: "25 / page" },
                  { value: 50, label: "50 / page" },
                  { value: 75, label: "75 / page" },
                  { value: 100, label: "100 / page" }
                ]}
                addNewLabel={null}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={warehouseBreakdownOpen}
        onClose={() => {
          setWarehouseBreakdownOpen(false);
          setWarehouseBreakdownData(null);
        }}
        title="Warehouse Stock"
        widthClass="max-w-3xl"
        footer={
          <Button
            variant="ghost"
            onClick={() => {
              setWarehouseBreakdownOpen(false);
              setWarehouseBreakdownData(null);
            }}
          >
            Close
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-sm font-semibold text-gray-900">{warehouseBreakdownData?.productName || "Product"}</p>
            <p className="text-xs text-gray-500">
              {warehouseBreakdownData?.scope === "variant" ? "Selected variant warehouse stock" : "All variants warehouse stock"}
            </p>
          </div>

          {warehouseBreakdownRows.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                  <p className="text-[11px] text-gray-500">Variants</p>
                  <p className="text-sm font-semibold text-gray-900">{warehouseBreakdownStats.variantCount}</p>
                </div>
                <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                  <p className="text-[11px] text-gray-500">Warehouses</p>
                  <p className="text-sm font-semibold text-gray-900">{warehouseBreakdownStats.warehouseCount}</p>
                </div>
                <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                  <p className="text-[11px] text-gray-500">Total On Hand</p>
                  <p className="text-sm font-semibold text-gray-900">{warehouseBreakdownStats.totalOnHand}</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-[12px]">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-3 py-2 font-semibold w-[54px]">Image</th>
                        <th className="px-3 py-2 font-semibold">SKU</th>
                        <th className="px-3 py-2 font-semibold">Variant</th>
                        <th className="px-3 py-2 font-semibold">Warehouse</th>
                        <th className="px-3 py-2 font-semibold">Code</th>
                        <th className="px-3 py-2 font-semibold text-right">On Hand</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouseBreakdownRows.map((item) => (
                        <tr key={item.key} className="border-t border-gray-100">
                          <td className="px-3 py-2">
                            <ImageGallery
                              images={item.images?.slice(0, 1) || []}
                              absImg={absImg}
                              placeholder={IMG_PLACEHOLDER}
                              className="h-8 w-8"
                              thumbnailClassName="h-8 w-8 bg-white object-contain border border-gray-200 rounded"
                              compact={true}
                            />
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900">{item.sku}</td>
                          <td className="px-3 py-2 text-gray-600">{item.details}</td>
                          <td className="px-3 py-2 text-gray-800">{item.warehouseName}</td>
                          <td className="px-3 py-2 text-gray-500">{item.warehouseCode}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">{item.onHand}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">No warehouse stock found.</p>
          )}
        </div>
      </Modal>

      <Modal
        open={rowTransferOpen}
        onClose={() => {
          setRowTransferOpen(false);
          resetRowTransferForm();
        }}
        title="Transfer Stock (Selected Product)"
        widthClass="max-w-5xl"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setRowTransferOpen(false);
                resetRowTransferForm();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="warning"
              onClick={handleRowTransferSubmit}
              isLoading={rowTransferSaving}
              disabled={!canSubmitRowTransfer}
            >
              Move Stock
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">
              {rowTransferRow?.productName || "Selected Product"}
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              Lines are pre-filled from current stock pairs. Choose destination warehouse for each line.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Reason (optional)</label>
            <input
              type="text"
              maxLength={500}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              value={rowTransferForm.reason}
              onChange={(e) => setRowTransferForm((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Stock relocation / balancing"
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Pre-filled Transfer Lines</p>
              <p className="text-xs text-gray-500">{rowTransferItems.length} line(s)</p>
            </div>
            <div className="p-4">
              {rowTransferItems.length === 0 ? (
                <p className="text-xs text-gray-500">No stock available for selected row.</p>
              ) : (
                <div className="space-y-2">
                  <div className="space-y-2">
                    <div className="grid grid-cols-[minmax(200px,1.4fr)_minmax(130px,0.9fr)_minmax(180px,1.1fr)_minmax(80px,0.55fr)_minmax(80px,0.55fr)] gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                      <div>Variant</div>
                      <div>Available</div>
                      <div>Destination Warehouse</div>
                      <div>Transfer Qty</div>
                      <div>Status</div>
                    </div>

                    {rowTransferItems.map((item) => {
                      const details = [item.sizeText, item.colorText].filter(Boolean).join(" · ");
                      const lineError = rowTransferLineErrors.get(item.lineId);
                      return (
                        <div
                          key={item.lineId}
                          className="grid grid-cols-[minmax(200px,1.4fr)_minmax(130px,0.9fr)_minmax(180px,1.1fr)_minmax(80px,0.55fr)_minmax(80px,0.55fr)] items-center gap-2 rounded-lg border border-gray-200 px-3 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ImageGallery
                              images={item.images?.slice(0, 1) || []}
                              absImg={absImg}
                              placeholder={IMG_PLACEHOLDER}
                              className="h-8 w-8"
                              thumbnailClassName="h-8 w-8 bg-white object-contain border border-gray-200 rounded"
                              compact={true}
                            />
                            <div className="min-w-0">
                              <p className="text-[13px] text-gray-900 truncate">{item.productName}</p>
                              <p className="text-[11px] text-gray-500 truncate">
                                SKU: {item.sku}
                                {details ? ` • ${details}` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="text-xs text-gray-700">
                            <p className="font-medium text-gray-900">{item.available}</p>
                            <p className="text-gray-500">{item.sourceWarehouseName}</p>
                          </div>

                          <SelectCompact
                            value={item.destinationWarehouseId || "Select"}
                            onChange={(val) => handleRowTransferDestinationChange(item.lineId, val)}
                            options={["Select", ...getRowLineDestinationOptions(item.sourceWarehouseId)]}
                            filterable
                            hideCheck={true}
                            placeholder="Select destination"
                          />

                          <input
                            type="number"
                            min="1"
                            step="1"
                            className={`h-8 w-full rounded-md border px-2 text-[12px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 ${lineError ? "border-rose-300 focus:ring-rose-200" : "border-gray-300"
                              }`}
                            value={item.quantity}
                            onChange={(e) => handleRowTransferQtyChange(item.lineId, e.target.value)}
                          />

                          <div className={`text-[11px] ${lineError ? "text-rose-600" : "text-gray-500"}`}>
                            {lineError || "Ready"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={transferOpen}
        onClose={() => {
          setTransferOpen(false);
          resetTransferForm();
        }}
        title="Transfer Stock"
        widthClass="max-w-4xl"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setTransferOpen(false);
                resetTransferForm();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="warning"
              onClick={handleTransferSubmit}
              isLoading={transferSaving}
              disabled={!canSubmitTransfer}
            >
              Move Stock
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Source Warehouse</label>
              <SelectCompact
                value={transferForm.fromWarehouseId || "Select"}
                onChange={(val) => {
                  const nextFrom = val === "Select" ? "" : val;
                  setTransferForm((prev) => ({
                    ...prev,
                    fromWarehouseId: nextFrom,
                    toWarehouseId: String(prev.toWarehouseId) === String(nextFrom) ? "" : prev.toWarehouseId,
                  }));
                  setTransferPickerValue("Select");
                  setSelectedTransferItems([]);
                }}
                options={["Select", ...fromWarehouseSelectOptions]}
                filterable
                hideCheck={true}
                placeholder="Select source warehouse"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Destination Warehouse</label>
              <SelectCompact
                value={transferForm.toWarehouseId || "Select"}
                onChange={(val) => setTransferForm((prev) => ({ ...prev, toWarehouseId: val === "Select" ? "" : val }))}
                options={["Select", ...toWarehouseSelectOptions]}
                filterable
                hideCheck={true}
                placeholder="Select destination warehouse"
                disabled={!transferForm.fromWarehouseId}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Reason (optional)</label>
              <input
                type="text"
                maxLength={500}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                value={transferForm.reason}
                onChange={(e) => setTransferForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Stock relocation / balancing"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">Select Products From Source Warehouse</p>
              <p className="text-xs text-gray-500">Search and add one or more variants to transfer.</p>
            </div>
            <div className="p-4 space-y-3">
              <SelectCompact
                value={transferPickerValue}
                onChange={handleAddTransferItem}
                options={sourceStockSelectOptions}
                filterable
                hideCheck={true}
                loading={sourceStockLoading}
                loadingText="Loading warehouse stock..."
                disabled={!transferForm.fromWarehouseId || sourceStockLoading}
                placeholder={!transferForm.fromWarehouseId ? "Choose source warehouse first" : "Search products in source warehouse"}
                renderOption={(opt) => {
                  if (typeof opt === "string") return opt;
                  const details = [opt.sizeText, opt.colorText].filter(Boolean).join(" · ");
                  return (
                    <div className="flex items-center gap-3 py-0.5">
                      <div className="flex-shrink-0 pointer-events-none">
                        <ImageGallery
                          images={opt.images?.slice(0, 1) || []}
                          absImg={absImg}
                          placeholder={IMG_PLACEHOLDER}
                          className="h-8 w-8"
                          thumbnailClassName="h-8 w-8 bg-white object-contain border border-gray-200 rounded"
                          compact={true}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] text-gray-900 truncate">{opt.productName}</p>
                        <p className="text-[11px] text-gray-500 truncate">
                          SKU: {opt.sku}
                          {details ? ` • ${details}` : ""}
                          {` • Available: ${opt.available}`}
                        </p>
                      </div>
                    </div>
                  );
                }}
              />

              {transferForm.fromWarehouseId && !sourceStockLoading && sourceStockRows.length === 0 && (
                <p className="text-xs text-gray-500">No available stock in selected source warehouse.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Selected Items</p>
              <p className="text-xs text-gray-500">{selectedTransferItems.length} selected</p>
            </div>
            <div className="p-4">
              {selectedTransferItems.length === 0 ? (
                <p className="text-xs text-gray-500">No items selected yet.</p>
              ) : (
                <div className="space-y-2 overflow-x-auto">
                  <div className="min-w-[640px] space-y-2">
                    <div className="grid grid-cols-[minmax(230px,1.5fr)_minmax(130px,0.8fr)_minmax(170px,0.9fr)_40px] gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                      <div>Product</div>
                      <div>Available</div>
                      <div>Transfer Qty</div>
                      <div />
                    </div>

                    {selectedTransferItems.map((item) => {
                      const details = [item.sizeText, item.colorText].filter(Boolean).join(" · ");
                      const itemError = transferItemErrors.get(String(item.value));
                      return (
                        <div
                          key={item.value}
                          className="grid grid-cols-[minmax(230px,1.5fr)_minmax(130px,0.8fr)_minmax(170px,0.9fr)_40px] items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ImageGallery
                              images={item.images?.slice(0, 1) || []}
                              absImg={absImg}
                              placeholder={IMG_PLACEHOLDER}
                              className="h-8 w-8"
                              thumbnailClassName="h-8 w-8 bg-white object-contain border border-gray-200 rounded"
                              compact={true}
                            />
                            <div className="min-w-0">
                              <p className="text-[13px] text-gray-900 truncate">{item.productName}</p>
                              <p className="text-[11px] text-gray-500 truncate">
                                SKU: {item.sku}
                                {details ? ` • ${details}` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="text-xs text-gray-600">
                            <span className="font-medium text-gray-800">{item.available}</span> available
                          </div>

                          <div>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              className={`h-8 w-full rounded-md border px-2 text-[12px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 ${itemError ? "border-rose-300 focus:ring-rose-200" : "border-gray-300"
                                }`}
                              value={item.quantity}
                              onChange={(e) => handleTransferQtyChange(item.value, e.target.value)}
                            />
                            {itemError && (
                              <p className="text-[11px] text-rose-600 mt-1">{itemError}</p>
                            )}
                          </div>

                          <button
                            type="button"
                            className="mx-auto text-gray-400 hover:text-red-600"
                            onClick={() => removeTransferItem(item.value)}
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={reconcileOpen}
        onClose={() => {
          setReconcileOpen(false);
          resetReconcileForm();
        }}
        title="Reconcile Stock"
        widthClass="max-w-4xl"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setReconcileOpen(false);
                resetReconcileForm();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="warning"
              onClick={handleReconcileSubmit}
              isLoading={reconcileSaving}
              disabled={!canSubmitReconcile}
            >
              Save Reconciliation
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">How to reconcile</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Step 1: add products with unallocated stock. Step 2: choose destination warehouse and quantity for each line. Step 3: save reconciliation.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">Step 1: Add Unallocated Products</p>
              <p className="text-xs text-gray-500">Search and add products that have stock not assigned to any warehouse.</p>
            </div>
            <div className="p-4 space-y-3">
              <SelectCompact
                value={reconcilePickerValue}
                onChange={handleAddReconcileItem}
                options={reconcileSelectOptions}
                filterable
                onSearch={setReconcileSearch}
                hideCheck={true}
                loading={reconcileLoading}
                loadingText="Searching products..."
                placeholder="Search products with unallocated stock..."
                renderOption={(opt) => {
                  if (typeof opt === "string") return opt;
                  const details = [opt.sizeText, opt.colorText].filter(Boolean).join(" · ");
                  return (
                    <div className="flex items-center gap-3 py-0.5">
                      <div className="flex-shrink-0 pointer-events-none">
                        <ImageGallery
                          images={opt.images?.slice(0, 1) || []}
                          absImg={absImg}
                          placeholder={IMG_PLACEHOLDER}
                          className="h-8 w-8"
                          thumbnailClassName="h-8 w-8 bg-white object-contain border border-gray-200 rounded"
                          compact={true}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] text-gray-900 truncate">{opt.productName}</p>
                        <p className="text-[11px] text-gray-500 truncate">
                          SKU: {opt.sku}
                          {details ? ` • ${details}` : ""}
                          {` • Unallocated: ${opt.unallocatedOnHand}`}
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Step 2: Reconciliation Lines</p>
              <p className="text-xs text-gray-500">{selectedReconcileItems.length} selected</p>
            </div>
            <div className="p-4">
              {selectedReconcileItems.length === 0 ? (
                <p className="text-xs text-gray-500">No products selected yet. Add products from Step 1.</p>
              ) : (
                <div className="space-y-2 overflow-x-auto">
                  <div className="min-w-[680px] space-y-2">
                    <div className="grid grid-cols-[minmax(220px,1.5fr)_minmax(170px,1fr)_minmax(190px,0.9fr)_40px] gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                      <div>Product</div>
                      <div>Destination Warehouse</div>
                      <div>Allocate Qty</div>
                      <div />
                    </div>

                    <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                    {selectedReconcileItems.map((item) => {
                      const details = [item.sizeText, item.colorText].filter(Boolean).join(" · ");
                      const itemError = reconcileItemErrors.get(String(item.value));
                      return (
                        <div
                          key={item.value}
                          className="grid grid-cols-[minmax(220px,1.5fr)_minmax(170px,1fr)_minmax(190px,0.9fr)_40px] items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ImageGallery
                              images={item.images?.slice(0, 1) || []}
                              absImg={absImg}
                              placeholder={IMG_PLACEHOLDER}
                              className="h-8 w-8"
                              thumbnailClassName="h-8 w-8 bg-white object-contain border border-gray-200 rounded"
                              compact={true}
                            />
                            <div className="min-w-0">
                              <p className="text-[13px] text-gray-900 truncate">{item.productName}</p>
                              <p className="text-[11px] text-gray-500 truncate">
                                SKU: {item.sku}
                                {details ? ` • ${details}` : ""}
                              </p>
                              <p className="text-[11px] text-gray-500">Unallocated: {item.unallocatedOnHand}</p>
                            </div>
                          </div>

                          <SelectCompact
                            value={item.warehouseId || "Select"}
                            onChange={(val) => handleReconcileWarehouseChange(item.value, val === "Select" ? "" : val)}
                            options={["Select", ...fromWarehouseSelectOptions]}
                            filterable
                            hideCheck={true}
                            placeholder="Select warehouse"
                          />

                          <div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                className={`h-8 w-full rounded-md border px-2 text-[12px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 ${itemError ? "border-rose-300 focus:ring-rose-200" : "border-gray-300"
                                  }`}
                                value={item.quantity}
                                onChange={(e) => handleReconcileQtyChange(item.value, e.target.value)}
                              />
                              <button
                                type="button"
                                className="h-8 px-2 rounded-md border border-gray-300 text-[11px] text-gray-700 hover:bg-gray-50"
                                onClick={() => handleReconcileAllQty(item.value)}
                                title="Use full unallocated quantity"
                              >
                                All
                              </button>
                            </div>
                            {itemError && (
                              <p className="mt-1 text-[11px] text-rose-600">{itemError}</p>
                            )}
                          </div>

                          <button
                            type="button"
                            className="mx-auto text-gray-400 hover:text-red-600"
                            onClick={() => removeReconcileItem(item.value)}
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Step 3: Reason (optional)</label>
            <input
              type="text"
              maxLength={500}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              value={reconcileForm.reason}
              onChange={(e) => setReconcileForm((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Opening balance reconciliation"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
