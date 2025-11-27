import { Fragment, useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router";
import { Dialog, Transition } from "@headlessui/react";
import {
  CalendarDays,
  Loader,
  PackagePlus,
  Store,
  //CalendarDays,
  //Loader,
  //PackagePlus,
  //Store,
  X,
  Warehouse,
  FileText,
  Package,
  Calculator,
  User,
  MapPin,
  Clock,
} from "lucide-react";
import { ConfirmModal } from "../../components/ConfirmModal";
import { ReceiveItemsModal } from "../../components/ReceiveItemsModal";
import toast from "react-hot-toast";
import SelectCompact from "../../components/SelectCompact";
import { NoData } from "../../components/NoData";
import {
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrderStatus,
  useUpdatePurchaseOrder,
  usePurchaseOrder,
  useDeletePurchaseOrder,
} from "../../hooks/usePurchaseOrders";
import { useWarehouses } from "../../hooks/useWarehouses";
import { useSuppliers } from "../../hooks/useSuppliers";
import { useProducts } from "../../hooks/useProducts";
import { useAuthCheck } from "../../hooks/useAuthCheck";
import { randomId } from "../../lib/id";
import ViewModal from "../../components/ViewModal";

const card = "rounded-xl border border-gray-200 bg-white shadow-sm";
const input =
  "h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
const textarea =
  "min-h-[90px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
const GRID = "grid grid-cols-[0.8fr_1.2fr_1fr_0.8fr_1.1fr_0.8fr_1.3fr] gap-4";
const STATUS_OPTIONS = [
  { value: "to_purchase", label: "To Purchase" },
  { value: "in_transit", label: "In Transit" },
  { value: "partially_received", label: "Partially Received" },
  { value: "received", label: "Received" },
  { value: "canceled", label: "Canceled" },
];

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

const toDecimalInput = (value) =>
  String(value || "")
    .replace(/[^0-9.]/g, "")
    .replace(/(\..*)\./g, "$1")
    .replace(/^(\d*\.\d{0,2}).*$/, "$1"); // clamp to 2 decimals

const toIntegerInput = (value) => String(value || "").replace(/[^0-9]/g, "");

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

const defaultForm = {
  warehouseId: "",
  supplierId: "",
  expectedDate: "",
  notes: "",
  shippingCost: "",
  shippingTax: "",
};

export default function PurchasesPage() {
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || undefined;

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewPo, setViewPo] = useState(null);

  // Receive Modal State
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveItem, setReceiveItem] = useState(null);

  // Confirm Delete Modal State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmItem, setConfirmItem] = useState(null);

  // Fetch full PO details when editing
  const { data: editingPo, isLoading: loadingEditingPo } = usePurchaseOrder(editingId);

  // Fetch full PO details when viewing
  const { data: fullViewPo, isLoading: loadingViewPo } = usePurchaseOrder(viewPo?.id);

  // Fetch full PO details when receiving
  const { data: fullReceivePo, isLoading: loadingReceivePo } = usePurchaseOrder(receiveItem?.id);

  const { data: auth } = useAuthCheck({ refetchOnWindowFocus: false });
  const perms = auth?.perms || [];
  const can = (p) => perms.includes(p);

  const currency = auth?.tenant?.currency || "USD";
  const { data: orders = [], isLoading, refetch: refetchOrders } = usePurchaseOrders({ status: statusFilter });
  const { mutateAsync: updateStatusMut } = useUpdatePurchaseOrderStatus();
  const { mutateAsync: deletePoMut, isPending: deleting } = useDeletePurchaseOrder();
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const rows = Array.isArray(orders) ? orders : [];

  const handleStatusChange = async (po, status) => {
    if (po.status === "received") {
      toast.error("Received purchase orders cannot be changed");
      return;
    }
    if (!status || status === po.status) return;
    setStatusUpdatingId(po.id);
    try {
      await updateStatusMut({ id: po.id, status });
      toast.success("Status updated");
    } catch (err) {
      toast.error(err?.message || "Failed to update status");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const deletePo = async () => {
    if (!confirmItem?.id) return;
    try {
      await deletePoMut(confirmItem.id);
      toast.success("Purchase order deleted");
      setConfirmOpen(false);
      setConfirmItem(null);
    } catch (err) {
      toast.error(err?.message || "Failed to delete purchase order");
    }
  };

  const handleReceivePo = useCallback((po) => {
    setReceiveItem(po);
    setReceiveModalOpen(true);
  }, []);

  const handleEditPo = (po) => {
    setEditingId(po.id);
    setIsCreating(false);
  };

  const handleCreatePo = () => {
    setIsCreating(true);
    setEditingId(null);
  };

  const handleCloseModal = () => {
    setIsCreating(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-amber-100 border border-gray-200 flex items-center justify-center">
            <Store size={18} className="text-amber-700" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Purchase orders</h1>
            <p className="text-sm text-gray-500">Track inbound stock across suppliers</p>
          </div>
        </div>
        {statusFilter === "to_purchase" && can("purchases.po.create") && (
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-[#ffd026] px-4 py-2 text-sm font-semibold text-blue-700 hover:opacity-90"
            onClick={handleCreatePo}
          >
            <PackagePlus size={16} /> Create PO
          </button>
        )}
      </div>

      <div className={card}>
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Listing</p>
            <p className="text-xs text-gray-500">Recent purchase orders</p>
          </div>
        </div>
        <div className={`${GRID} bg-gray-50 px-4 py-3 text-[12px] font-semibold text-gray-700`}>
          <div>PO number</div>
          <div>Supplier</div>
          <div>Warehouse</div>
          <div>Expected</div>
          <div>Status</div>
          <div className="text-center">Total</div>
          <div className="text-right">Actions</div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
            <Loader className="h-4 w-4 animate-spin" /> Loading orders…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <NoData />
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((po) => (
              <li key={po.id} className={`${GRID} px-4 py-3 text-[13px] text-gray-800 items-center`}>
                <div>
                  <div className="font-semibold text-gray-900">{po.poNumber || po.id}</div>
                  <div className="text-xs text-gray-500">{new Date(po.createdAt || po.created_at || Date.now()).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{po?.supplier?.companyName || "—"}</div>
                  <div className="text-xs text-gray-500">{po?.supplier?.email || ""}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{po?.warehouse?.name || po?.warehouse?.code || "—"}</div>
                  <div className="text-xs text-gray-500">{po?.warehouse?.city || ""}</div>
                </div>
                <div>{po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—"}</div>
                <div>
                  <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTone(po.status)}`}>
                    {STATUS_OPTIONS.find(o => o.value === po.status)?.label || po.status || "—"}
                  </div>
                </div>
                <div className="text-center font-semibold text-gray-900">
                  {formatCurrency(po.totalAmount ?? po.total_amount, currency)}
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      className="rounded-md border border-gray-300 px-1.5 py-0.5 text-[11px] hover:bg-gray-50 text-gray-700"
                      onClick={() => setViewPo(po)}
                    >
                      View
                    </button>
                    {po.status !== "to_purchase" && po.status !== "received" && can("purchases.po.receive") && (
                      <button
                        className="rounded-md border border-gray-300 px-1.5 py-0.5 text-[11px] hover:bg-gray-50 text-gray-700"
                        onClick={() => handleReceivePo(po)}
                      >
                        Receive
                      </button>
                    )}
                    {po.status === "to_purchase" && can("purchases.po.update") && (
                      <button
                        className="rounded-md border border-gray-300 px-1.5 py-0.5 text-[11px] hover:bg-gray-50 text-gray-700"
                        onClick={() => handleStatusChange(po, "in_transit")}
                      >
                        Purchase
                      </button>
                    )}
                    {(po.status === "to_purchase" || po.status === "draft") && (
                      <>
                        {can("purchases.po.update") && (
                          <button
                            className="rounded-md border border-gray-300 px-1.5 py-0.5 text-[11px] hover:bg-gray-50 text-gray-700"
                            onClick={() => handleEditPo(po)}
                          >
                            Edit
                          </button>
                        )}
                        {can("purchases.delete") && (
                          <button
                            className="rounded-md border border-gray-300 px-1.5 py-0.5 text-[11px] hover:bg-gray-50 text-red-700"
                            onClick={() => {
                              setConfirmItem(po);
                              setConfirmOpen(true);
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(isCreating || editingId) && (
        <PurchaseOrderModal
          open={true}
          onClose={handleCloseModal}
          currency={currency}
          mode={editingId ? "edit" : "create"}
          initialPo={editingPo}
          loading={loadingEditingPo}
        />
      )}
      <PurchaseOrderViewModal
        po={fullViewPo || viewPo}
        loading={loadingViewPo}
        onClose={() => setViewPo(null)}
        currency={currency}
      />

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete Purchase Order"
        loading={deleting}
        onConfirm={deletePo}
      >
        Are you sure you want to delete{" "}
        <span className="font-semibold">{confirmItem?.poNumber || "this order"}</span>?
        <br />
        This action cannot be undone.
      </ConfirmModal>

      <ReceiveItemsModal
        open={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        po={fullReceivePo || receiveItem}
        loading={loadingReceivePo}
        onSave={refetchOrders}
      />
    </div>
  );
}

function PurchaseOrderModal({ open, onClose, currency, mode = "create", initialPo = null, loading = false }) {
  const [form, setForm] = useState(defaultForm);
  const [lineItems, setLineItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("Select");
  const [prefilled, setPrefilled] = useState(false);

  const { data: warehouses = [], isLoading: loadingWarehouses } = useWarehouses({ enabled: open });
  const { data: suppliers = [], isLoading: loadingSuppliers } = useSuppliers({ enabled: open });
  const { mutateAsync: updatePoMut, isPending: updatingPo } = useUpdatePurchaseOrder();

  const productQuery = useProducts();
  const { mutate: fetchProducts, data: productData, isPending: loadingProducts } = productQuery;
  useEffect(() => {
    if (open) {
      fetchProducts({ page: 1, perPage: 200, supplierId: form.supplierId || undefined });
    }
  }, [open, fetchProducts, form.supplierId]);

  useEffect(() => {
    if (!open) {
      setForm(defaultForm);
      setLineItems([]);
      setSelectedProduct("Select");
      setPrefilled(false);
    }
  }, [open]);

  const productOptions = useMemo(
    () => (Array.isArray(productData?.rows) ? productData.rows : []),
    [productData],
  );

  // Prefill edit data once products are available
  useEffect(() => {
    if (!open || mode !== "edit" || !initialPo || prefilled || loadingProducts || loading) return;
    // Wait for products to populate if we expect them
    if (initialPo.items && initialPo.items.length > 0 && productOptions.length === 0) return;

    const po = initialPo;
    setForm({
      warehouseId: po?.warehouseId || po?.warehouse?.id || "",
      supplierId: po?.supplierId || po?.supplier?.id || "",
      expectedDate: po?.expectedDeliveryDate
        ? new Date(po.expectedDeliveryDate).toISOString().split("T")[0]
        : "",
      notes: po?.notes || "",
      shippingCost: po?.shippingCost != null ? String(po.shippingCost) : "",
      shippingTax: po?.shippingTax != null ? String(po.shippingTax) : "",
    });

    const rows = Array.isArray(po?.items) ? po.items : [];
    const mapped = rows.map((item) => {
      const product = productOptions.find((p) => String(p.id) === String(item.productId));
      const variant =
        item.productVariantId && product && Array.isArray(product.variants)
          ? product.variants.find((v) => String(v.id) === String(item.productVariantId))
          : null;
      const name = variant
        ? `${product?.name || "Product"} • ${variant?.name || variant?.sku || "Variant"}`
        : product?.name || "Product";

      // Use stock from the PO item's product/variant data if available (from findOne)
      const rawStock = variant?.stockOnHand ?? variant?.stock ?? product?.stockOnHand ?? product?.stock ?? "—";
      const itemStock = rawStock !== "—" ? (parseInt(String(rawStock).match(/-?\d+/)?.[0] || "0", 10) || rawStock) : "—";

      return {
        id: randomId(),
        productId: item.productId,
        productVariantId: item.productVariantId || null,
        name,
        sku: variant?.sku || product?.sku || "—",
        variantName: variant?.name || "",
        variantSku: variant?.sku || "",
        stock: itemStock,
        qty: item.quantity != null ? String(item.quantity) : "",
        unitPrice: item.unitPrice != null ? String(item.unitPrice) : "",
        taxRate: item.taxRate != null ? String(item.taxRate) : "0",
        sizeText: variant?.sizeText || "",
        colorText: variant?.colorText || "",
        packagingType: variant?.packagingType || product?.packagingType || "",
        packagingQuantity: variant?.packagingQuantity || product?.packagingQuantity || null,
      };
    });

    setLineItems(mapped);
    setPrefilled(true);
  }, [open, mode, initialPo, prefilled, loadingProducts, productOptions]);

  const productSelectOptions = useMemo(() => {
    const rows = [];

    const selectedKeys = new Set(
      lineItems.map((line) => `${line.productId}::${line.productVariantId || "null"}`),
    );

    const getStockValue = (variant, prod) => {
      const candidates = [
        variant?.stockOnHand,
        variant?.stock,
        variant?.quantity,
        prod?.stockOnHand,
        prod?.quantity,
      ];
      for (const val of candidates) {
        if (val != null && val !== "") {
          const str = String(val);
          const matches = str.match(/-?\d+/);
          return matches ? parseInt(matches[0], 10) : val;
        }
      }
      if (typeof prod?.stock === "number") return prod.stock;
      const parsed = Number(prod?.stock);
      return Number.isFinite(parsed) ? parsed : "—";
    };

    productOptions.forEach((prod) => {
      const variants = Array.isArray(prod?.variants) ? prod.variants : [];

      // Treat a single variant with the same SKU as the parent as a simple product
      const looksLikeSimple = variants.length === 1 && variants[0] && variants[0].sku === prod?.sku;

      if (variants.length === 0 || looksLikeSimple) {
        const key = `${prod.id}::null`;
        if (selectedKeys.has(key)) return;
        const singleVariant = looksLikeSimple ? variants[0] : undefined;
        rows.push({
          value: String(prod.id),
          label: prod.name || "Unnamed product",
          sku: prod.sku || "—",
          stock:
            singleVariant?.stockOnHand ??
            singleVariant?.stock ??
            singleVariant?.quantity ??
            prod.stockOnHand ??
            prod.stock ??
            prod.quantity ??
            "—",
          productId: prod.id,
          productVariantId: null,
          variantName: null,
          variantSku: "",
          sizeText: prod.sizeText || singleVariant?.sizeText || "",
          colorText:
            prod.colorText ||
            prod.color ||
            singleVariant?.colorText ||
            singleVariant?.color ||
            (prod.attributes &&
              (prod.attributes.colorText ||
                prod.attributes.color ||
                prod.attributes.colorName ||
                prod.attributes.colorLabel)) ||
            (singleVariant?.attributes &&
              (singleVariant.attributes.colorText ||
                singleVariant.attributes.color ||
                singleVariant.attributes.colorName ||
                singleVariant.attributes.colorLabel)) ||
            "",
          packagingType:
            prod.packagingType ||
            singleVariant?.packagingType ||
            (prod.attributes && prod.attributes.packagingType) ||
            (singleVariant?.attributes && singleVariant.attributes.packagingType) ||
            "",
          packagingQuantity:
            prod.packagingQuantity ||
            singleVariant?.packagingQuantity ||
            (prod.attributes && prod.attributes.packagingQuantity) ||
            (singleVariant?.attributes && singleVariant.attributes.packagingQuantity) ||
            null,
        });
        return;
      }

      variants.forEach((variant) => {
        const key = `${prod.id}::${variant.id}`;
        if (selectedKeys.has(key)) return;
        rows.push({
          value: key,
          label: `${prod.name || "Unnamed product"} • ${variant.name || variant.sku || "Variant"}`,
          sku: variant.sku || prod.sku || "—",
          stock: getStockValue(variant, prod),
          productId: prod.id,
          productVariantId: variant.id,
          variantName: variant.name || "",
          variantSku: variant.sku || "",
          sizeText: variant.sizeText || variant?.size?.name || "",
          colorText:
            variant.colorText ||
            variant.color ||
            variant.colorName ||
            variant.colorLabel ||
            (variant.attributes &&
              (variant.attributes.colorText ||
                variant.attributes.color ||
                variant.attributes.colorName ||
                variant.attributes.colorLabel)) ||
            prod.colorText ||
            prod.color ||
            (prod.attributes &&
              (prod.attributes.colorText ||
                prod.attributes.color ||
                prod.attributes.colorName ||
                prod.attributes.colorLabel)) ||
            "",
          packagingType:
            variant.packagingType ||
            prod.packagingType ||
            (variant.attributes && variant.attributes.packagingType) ||
            (prod.attributes && prod.attributes.packagingType) ||
            "",
          packagingQuantity:
            variant.packagingQuantity ||
            prod.packagingQuantity ||
            (variant.attributes && variant.attributes.packagingQuantity) ||
            (prod.attributes && prod.attributes.packagingQuantity) ||
            null,
        });
      });
    });
    return ["Select", ...rows];
  }, [productOptions, lineItems]);

  const handleFormChange = (key, value) => {
    setForm((prev) => {
      let next = value;
      if (key === "shippingCost" || key === "shippingTax") {
        next = toDecimalInput(value);
      }
      return { ...prev, [key]: next };
    });
  };

  const handleAddProduct = () => {
    if (!selectedProduct || selectedProduct === "Select") {
      toast.error("Select a product first");
      return;
    }
    const option = productSelectOptions.find(
      (opt) => typeof opt !== "string" && opt.value === selectedProduct,
    );
    if (!option || typeof option === "string") {
      toast.error("Product not found");
      return;
    }
    const product = productOptions.find((p) => String(p.id) === String(option.productId));
    if (!product) {
      toast.error("Product not found");
      return;
    }
    const variant = option.productVariantId
      ? (Array.isArray(product?.variants)
        ? product.variants.find((v) => v.id === option.productVariantId)
        : null)
      : null;
    if (
      lineItems.some(
        (line) =>
          line.productId === option.productId &&
          (line.productVariantId || null) === (option.productVariantId || null),
      )
    ) {
      toast.error("This product is already in the order");
      return;
    }
    const fallbackPrice = (() => {
      const source = variant || product;
      const price =
        source?.costPrice ??
        source?.wholesalePrice ??
        source?.retailPrice ??
        source?.price ??
        product?.retailPrice ?? null;
      return price != null ? String(price) : "";
    })();
    const sanitizedPrice = fallbackPrice ? toDecimalInput(fallbackPrice) : "";
    const variantLabel =
      variant && variant.name && variant.name !== variant.sku ? variant.name : "";
    const displayName = variantLabel
      ? `${product?.name || "Unnamed product"} • ${variantLabel}`
      : product?.name || "Unnamed product";
    const variantSku = variant?.sku || "";
    setLineItems((prev) => [
      ...prev,
      {
        id: randomId(),
        productId: option.productId,
        productVariantId: option.productVariantId || null,
        name: displayName,
        sku: option.sku || product.sku || "—",
        variantName: variantLabel || "",
        variantSku,
        stock: option.stock,
        qty: "",
        unitPrice: sanitizedPrice,
        taxRate: "0",
        sizeText: option.sizeText || "",
        colorText: option.colorText || "",
        packagingType: option.packagingType || "",
        packagingQuantity: option.packagingQuantity || null,
      },
    ]);
    setSelectedProduct("Select");
    toast.success("Product added");
  };

  const handleLineChange = (lineId, key, value) => {
    setLineItems((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        if (key === "qty") {
          return { ...line, qty: toIntegerInput(value) };
        }
        if (key === "unitPrice" || key === "taxRate") {
          return { ...line, [key]: toDecimalInput(value) };
        }
        return line;
      }),
    );
  };

  const handleRemoveLine = (lineId) => {
    setLineItems((prev) => prev.filter((line) => line.id !== lineId));
  };

  const lineTotals = useMemo(() => {
    return lineItems.reduce(
      (acc, line) => {
        const qty = Number(line.qty) || 0;
        const unitPrice = Number(line.unitPrice) || 0;
        const taxRate = Number(line.taxRate) || 0;
        const subtotal = qty * unitPrice;
        const tax = subtotal * (taxRate / 100);
        acc.subtotal += subtotal;
        acc.productTax += tax;
        return acc;
      },
      { subtotal: 0, productTax: 0 },
    );
  }, [lineItems]);

  const shippingCost = Number(form.shippingCost) || 0;
  const shippingTax = Number(form.shippingTax) || 0;
  const totalAmount = lineTotals.subtotal + lineTotals.productTax + shippingCost + shippingTax;

  const { mutateAsync: submitOrder, isPending: savingOrder } = useCreatePurchaseOrder();

  const handleSubmit = async (targetStatus = "to_purchase") => {
    if (!form.warehouseId) {
      toast.error("Select a warehouse");
      return;
    }
    if (!form.supplierId) {
      toast.error("Select a supplier");
      return;
    }
    if (!form.expectedDate) {
      toast.error("Provide an expected delivery date");
      return;
    }
    if (lineItems.length === 0) {
      toast.error("Add at least one product");
      return;
    }

    for (const line of lineItems) {
      if (!line.qty || Number(line.qty) <= 0) {
        toast.error("Enter quantity for all products");
        return;
      }
      if (!line.unitPrice || Number(line.unitPrice) <= 0) {
        toast.error("Enter unit price for all products");
        return;
      }
    }

    const payload = {
      warehouseId: form.warehouseId,
      supplierId: form.supplierId,
      expectedDeliveryDate: form.expectedDate,
      notes: form.notes?.trim() || "",
      shippingCost,
      shippingTax,
      status: targetStatus,
      items: lineItems.map((line) => ({
        productId: line.productId,
        productVariantId: line.productVariantId || undefined,
        quantity: Number(line.qty) || 0,
        unitPrice: Number(line.unitPrice) || 0,
        taxRate: Number(line.taxRate) || 0,
      })),
    };

    try {
      if (mode === "edit" && initialPo?.id) {
        await updatePoMut({ id: initialPo.id, payload: { ...payload, notes: form.notes?.trim() || "" } });
        toast.success("Purchase order updated");
      } else {
        await submitOrder(payload);
        toast.success("Purchase order created");
      }
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to save purchase order");
    }
  };

  const canSubmit = Boolean(
    form.warehouseId && form.supplierId && form.expectedDate && lineItems.length > 0,
  );

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[90]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-[80vw] h-[90vh] max-h-[90vh] rounded-2xl border border-gray-200 bg-[#f6f7fb] shadow-2xl overflow-hidden">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-md bg-amber-100 border border-amber-200 flex items-center justify-center">
                        <PackagePlus size={18} className="text-amber-700" />
                      </div>
                      <Dialog.Title className="text-base font-semibold text-gray-900">
                        Create purchase order
                      </Dialog.Title>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                    {(loadingProducts || loadingWarehouses || loadingSuppliers || loading) && !prefilled && mode === "edit" ? (
                      <div className="space-y-4 animate-pulse">
                        <div className="h-40 rounded-xl bg-gray-200" />
                        <div className="h-60 rounded-xl bg-gray-200" />
                        <div className="h-40 rounded-xl bg-gray-200" />
                      </div>
                    ) : (
                      <>
                        <div className={card}>
                          <div className="border-b border-gray-200 px-4 py-3 rounded-t-xl">
                            <p className="text-sm font-semibold text-gray-900">Order information</p>
                            <p className="text-xs text-gray-500">Warehouse, supplier, and expected delivery</p>
                          </div>
                          <div className="grid gap-3 px-4 py-4 md:grid-cols-2">
                            <div>
                              <label className="block text-[12px] font-medium text-gray-600">Warehouse <span className="text-red-500">*</span></label>
                              <SelectCompact
                                value={form.warehouseId || "Select"}
                                onChange={(val) => handleFormChange("warehouseId", val === "Select" ? "" : val)}
                                options={["Select", ...(Array.isArray(warehouses) ? warehouses.map((wh) => ({ value: wh.id, label: wh.name || wh.code || "Warehouse" })) : [])]}
                                filterable
                                disabled={loadingWarehouses}
                              />
                              {loadingWarehouses && (
                                <p className="mt-1 text-xs text-gray-500">Loading warehouses…</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-[12px] font-medium text-gray-600">Supplier <span className="text-red-500">*</span></label>
                              <SelectCompact
                                value={form.supplierId || "Select"}
                                onChange={(val) => handleFormChange("supplierId", val === "Select" ? "" : val)}
                                options={["Select", ...(Array.isArray(suppliers) ? suppliers.map((sup) => ({ value: sup.id, label: sup.companyName || sup.displayName || "Supplier" })) : [])]}
                                filterable
                                disabled={loadingSuppliers}
                              />
                              {loadingSuppliers && (
                                <p className="mt-1 text-xs text-gray-500">Loading suppliers…</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-[12px] font-medium text-gray-600">Expected delivery <span className="text-red-500">*</span></label>
                              <div className="relative mt-1">
                                <CalendarDays size={16} className="pointer-events-none absolute left-3 top-2.5 text-gray-400" />
                                <input
                                  type="date"
                                  className={`${input} pl-9`}
                                  value={form.expectedDate}
                                  onChange={(e) => handleFormChange("expectedDate", e.target.value)}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[12px] font-medium text-gray-600">Notes</label>
                              <textarea
                                className={`${textarea} mt-1`}
                                placeholder="Optional instructions"
                                value={form.notes}
                                onChange={(e) => handleFormChange("notes", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className={card}>
                          <div className="border-b border-gray-200 px-4 py-3 rounded-t-xl">
                            <p className="text-sm font-semibold text-gray-900">Products</p>
                            <p className="text-xs text-gray-500">Select products and edit details inline</p>
                          </div>
                          <div className="space-y-4 px-4 py-4">
                            <div className="grid gap-3 md:grid-cols-[2fr_0.8fr_0.8fr_0.8fr_auto]">
                              <div>
                                <label className="block text-[12px] font-medium text-gray-600">Search product</label>
                                <SelectCompact
                                  value={selectedProduct}
                                  onChange={setSelectedProduct}
                                  options={productSelectOptions}
                                  filterable
                                  disabled={loadingProducts}
                                  renderOption={(opt) =>
                                    typeof opt === "string" ? (
                                      opt
                                    ) : (
                                      <div className="flex flex-col">
                                        <span>{opt.label}</span>
                                        {opt.sku && (
                                          <span className="text-[11px] text-gray-500">SKU: {opt.sku}</span>
                                        )}
                                      </div>
                                    )
                                  }
                                />
                              </div>
                              <div className="flex items-end">
                                <button
                                  type="button"
                                  className="h-9 w-full rounded-lg border border-dashed border-amber-400 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                                  onClick={handleAddProduct}
                                >
                                  Add product
                                </button>
                              </div>
                            </div>

                            <div className="overflow-x-auto">
                              {lineItems.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                                  No products added yet.
                                </div>
                              ) : (
                                <table className="min-w-full text-left text-[13px]">
                                  <thead>
                                    <tr className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                      <th className="px-3 py-2 w-[40%]">Product</th>
                                      <th className="px-3 py-2 text-center">Available stock</th>
                                      <th className="px-3 py-2 text-center">Qty</th>
                                      <th className="px-3 py-2 text-center">Unit price</th>
                                      <th className="px-3 py-2 text-center">Tax %</th>
                                      <th className="px-3 py-2 text-right">Total</th>
                                      <th className="px-3 py-2 text-right">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {lineItems.map((line) => {
                                      const qty = Number(line.qty) || 0;
                                      const price = Number(line.unitPrice) || 0;
                                      const taxRate = Number(line.taxRate) || 0;
                                      const subtotal = qty * price;
                                      const tax = subtotal * (taxRate / 100);
                                      const lineTotal = subtotal + tax;
                                      return (
                                        <tr key={line.id}>
                                          <td className="px-3 py-3 align-top">
                                            <div className="font-semibold text-gray-900">{line.name}</div>
                                            {line.productVariantId ? (
                                              <div className="text-xs text-gray-500">
                                                SKU: {line.variantSku || line.sku || "—"}
                                              </div>
                                            ) : (
                                              <div className="text-xs text-gray-500">SKU: {line.sku}</div>
                                            )}
                                            {(line.sizeText || line.colorText) && (
                                              <div className="text-xs text-gray-500">
                                                {line.sizeText ? `Size: ${line.sizeText}` : ""}
                                                {line.sizeText && line.colorText ? " • " : ""}
                                                {line.colorText ? `Color: ${line.colorText}` : ""}
                                              </div>
                                            )}

                                          </td>
                                          <td className="px-3 py-3 text-center align-top">{line.stock ?? "—"}</td>
                                          <td className="px-3 py-3 text-center align-top">
                                            <input
                                              className={`${input} h-8 w-20 text-center`}
                                              value={line.qty}
                                              onChange={(e) => handleLineChange(line.id, "qty", e.target.value)}
                                              inputMode="numeric"
                                            />
                                          </td>
                                          <td className="px-3 py-3 text-center align-top">
                                            <input
                                              className={`${input} h-8 w-20 text-center`}
                                              value={line.unitPrice}
                                              onChange={(e) => handleLineChange(line.id, "unitPrice", e.target.value)}
                                              inputMode="decimal"
                                            />
                                          </td>
                                          <td className="px-3 py-3 text-center align-top">
                                            <input
                                              className={`${input} h-8 w-20 text-center`}
                                              value={line.taxRate}
                                              onChange={(e) => handleLineChange(line.id, "taxRate", e.target.value)}
                                              inputMode="decimal"
                                            />
                                          </td>
                                          <td className="px-3 py-3 text-right align-top font-semibold text-gray-900">
                                            {formatCurrency(lineTotal, currency)}
                                          </td>
                                          <td className="px-3 py-3 text-right align-top">
                                            <button
                                              className="text-sm font-medium text-red-600 hover:underline"
                                              onClick={() => handleRemoveLine(line.id)}
                                            >
                                              Delete
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                            {/* Totals Section inside Products */}
                            {lineItems.length > 0 && (
                              <div className="mt-4 flex flex-col items-end gap-2 text-sm border-t border-gray-100 pt-4">
                                <div className="flex items-center gap-4">
                                  <span className="text-gray-600">Subtotal</span>
                                  <span className="w-24 text-right font-medium text-gray-900">{formatCurrency(lineTotals.subtotal, currency)}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-gray-600">Tax</span>
                                  <span className="w-24 text-right font-medium text-gray-900">{formatCurrency(lineTotals.productTax, currency)}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-gray-600">Shipping</span>
                                  <input
                                    className="h-7 w-24 rounded border border-gray-300 bg-white px-2 text-right text-sm focus:border-blue-500 focus:outline-none"
                                    inputMode="decimal"
                                    value={form.shippingCost}
                                    onChange={(e) => handleFormChange("shippingCost", e.target.value)}
                                    placeholder="0.00"
                                  />
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-gray-600">Shipping Tax</span>
                                  <input
                                    className="h-7 w-24 rounded border border-gray-300 bg-white px-2 text-right text-sm focus:border-blue-500 focus:outline-none"
                                    inputMode="decimal"
                                    value={form.shippingTax}
                                    onChange={(e) => handleFormChange("shippingTax", e.target.value)}
                                    placeholder="0.00"
                                  />
                                </div>
                                <div className="mt-2 flex items-center gap-4 border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                                  <span>Total</span>
                                  <span className="w-24 text-right">{formatCurrency(totalAmount, currency)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>


                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-white px-4 py-3">
                    <button className="h-9 rounded-lg px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100" onClick={onClose}>
                      Cancel
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      onClick={() => handleSubmit("to_purchase")}
                      disabled={!canSubmit || savingOrder}
                    >
                      {savingOrder || updatingPo ? "Saving…" : "Save"}
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-lg bg-[#ffd026] px-4 py-2 text-sm font-semibold text-blue-700 hover:opacity-90 disabled:opacity-60"
                      onClick={() => handleSubmit("in_transit")}
                      disabled={!canSubmit || savingOrder}
                    >
                      {savingOrder || updatingPo ? "Saving…" : "Save & Purchase"}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function PurchaseOrderViewModal({ po, loading, onClose, currency }) {
  const open = Boolean(po);
  const items = Array.isArray(po?.items) ? po.items : [];
  const statusLabel = (po?.status || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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
                    <p className="text-sm font-medium text-gray-900">{po?.warehouse?.city || "—"}</p>
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
                          <td className="px-3 py-3 align-top">
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
                          <td className="px-3 py-3 text-center align-top text-gray-600">{qty}</td>
                          <td className="px-3 py-3 text-center align-top text-emerald-600 font-medium">{item.receivedQty || 0}</td>
                          <td className="px-3 py-3 text-center align-top text-amber-600 font-medium">{Math.max(0, qty - (item.receivedQty || 0))}</td>
                          <td className="px-3 py-3 text-center align-top text-gray-600">{formatCurrency(price, currency)}</td>
                          <td className="px-3 py-3 text-center">{taxRate}</td>
                          <td className="px-3 py-3 text-right font-semibold text-gray-900">
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
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 rounded-t-xl">
                <Calculator className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Order Summary</h3>
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
              </div>
            </div>
          </div>
        )}
    </ViewModal>
  );
}
