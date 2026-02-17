import { useState, useEffect, useMemo, useRef } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import SelectCompact from "../../../components/SelectCompact";
import { useAnimatedAlert } from "../../../components/ui/AnimatedAlert";
import {
    useCreateOrder,
    useUpdateOrder,
    useProductsForSelection,
    useUploadOrderLabel,
    useDeleteOrderLabel,
} from "../hooks/useOrders";
import { useRemarkTypes } from "../../settings/hooks/useRemarkTypes";
import { useSearchMarketplaceChannels } from "../../../hooks/useProducts";
import { useCourierMediums } from "../../settings/hooks/useCourierMediums";
import { uploadOrderAttachment, deleteOrderAttachment, checkOrderTrackingIdExists } from "../../../lib/api";
import toast from "react-hot-toast";
import { Trash2, Plus, Paperclip, Loader2, X, Info, Check, ChevronDown, ChevronRight } from "lucide-react";

const inputClass =
    "h-9 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 w-full";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const IMG_PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="100%" height="100%" fill="#f3f4f6"/><g fill="#9ca3af"><circle cx="26" cy="30" r="8"/><path d="M8 60l15-15 10 10 12-12 27 27H8z"/></g></svg>'
    );
const BULK_PERSIST_DEFAULT = {
    date: false,
    marketplace: false,
    remarks: false,
    products: false,
    attachments: false,
    shippingCharges: false,
    tax: false,
    otherCharges: false,
    courier: false,
};

const sanitizeDigitsOnly = (value) => String(value ?? "").replace(/\D+/g, "");
const sanitizeDecimal = (value) => {
    const raw = String(value ?? "");
    const normalized = raw.replace(/[^0-9.]/g, "");
    const firstDot = normalized.indexOf(".");
    if (firstDot === -1) return normalized;
    return `${normalized.slice(0, firstDot + 1)}${normalized.slice(firstDot + 1).replace(/\./g, "")}`;
};

function OrderTextField({ inputRef, className = inputClass, value, onValueChange, sanitize, ...props }) {
    return (
        <input
            ref={inputRef}
            className={className}
            value={value}
            onChange={(e) => onValueChange?.(sanitize ? sanitize(e.target.value) : e.target.value, e)}
            {...props}
        />
    );
}

export default function OrderModal({ open, onClose, editing, onSuccess }) {
    const createMut = useCreateOrder();
    const updateMut = useUpdateOrder();
    const uploadLabelMut = useUploadOrderLabel();
    const deleteLabelMut = useDeleteOrderLabel();
    const alert = useAnimatedAlert();
    const orderIdRef = useRef(null);
    const [savedOrders, setSavedOrders] = useState([]);
    const [bulkCreationMode, setBulkCreationMode] = useState(false);
    const [bulkPersist, setBulkPersist] = useState(BULK_PERSIST_DEFAULT);

    // Clear saved orders when modal opens for a new entry
    useEffect(() => {
        if (open && !editing) {
            setSavedOrders([]);
            setBulkCreationMode(false);
            setBulkPersist(BULK_PERSIST_DEFAULT);
        }
    }, [open, editing]);

    // Meta hooks
    const { data: channels = [] } = useSearchMarketplaceChannels({});
    const { data: couriers = [] } = useCourierMediums({ status: 'active' });
    const { data: remarkTypes = [] } = useRemarkTypes({ status: 'active' });

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [tenantChannelId, setTenantChannelId] = useState("");
    const [courierMediumId, setCourierMediumId] = useState("");
    const [orderId, setOrderId] = useState("");
    const [trackingId, setTrackingId] = useState("");
    const [status, setStatus] = useState("PENDING");
    const [remarkTypeId, setRemarkTypeId] = useState("");
    const [remarks, setRemarks] = useState("");

    // New Fields State
    const [shippingCharges, setShippingCharges] = useState(0);
    const [tax, setTax] = useState(0);
    const [otherCharges, setOtherCharges] = useState(0);

    // Products for selecting
    const [productSearch, setProductSearch] = useState("");
    const { data: productOptions = [], isFetching: isProductsFetching } = useProductsForSelection(productSearch, tenantChannelId);
    const isProductSearchLoading = !!productSearch?.trim() && isProductsFetching;

    // Items State
    const [items, setItems] = useState([]);

    // Attachment State
    const [existingAttachments, setExistingAttachments] = useState([]);
    const [newAttachments, setNewAttachments] = useState([]);

    // Label State
    const [existingLabel, setExistingLabel] = useState(null); // url string
    const [newLabel, setNewLabel] = useState(null); // File object

    // Handlers
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setNewAttachments(prev => [...prev, ...files]);
        }
        e.target.value = null; // reset
    };

    const removeNewAttachment = (index) => {
        setNewAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const deleteExistingAttachment = async (id) => {
        if (!confirm("Are you sure you want to delete this attachment?")) return;
        try {
            await deleteOrderAttachment(orderId, id);
            setExistingAttachments(prev => prev.filter(att => att.id !== id));
            toast.success("Attachment deleted");
        } catch (err) {
            toast.error("Failed to delete attachment");
        }
    };

    const { itemsTotalRevenue, totalCost: itemsTotalCost, grandTotal, totalEarning } = useMemo(() => {
        let tc = 0, tr = 0;
        items.forEach(item => {
            tc += (parseFloat(item.totalCost) || 0);
            tr += (parseFloat(item.totalAmount) || 0);
        });

        const shipping = parseFloat(shippingCharges) || 0;
        const taxVal = parseFloat(tax) || 0;
        const other = parseFloat(otherCharges) || 0;

        const grandTotal = tr + shipping + taxVal + other;
        // Total Earning = Sale Subtotal - (Shipping + Tax + Other charges)
        const totalEarning = tr - (shipping + taxVal + other);

        return {
            itemsTotalRevenue: tr, // Sale Subtotal
            totalCost: tc,
            grandTotal,
            totalEarning
        };
    }, [items, shippingCharges, tax, otherCharges]);

    // Load editing data
    useEffect(() => {
        if (editing) {
            setBulkCreationMode(false);
            setDate(editing.date ? editing.date.split('T')[0] : new Date().toISOString().split('T')[0]);
            setOrderId(editing.orderId || "");
            setTenantChannelId(editing.tenantChannelId || "");
            setCourierMediumId(editing.courierMediumId || "");
            setTrackingId(editing.trackingId || "");
            setStatus(editing.status || "LABEL_PRINTED");
            setRemarkTypeId(editing.remarkTypeId || "");
            setRemarks(editing.remarks || "");

            setShippingCharges(editing.shippingCharges || 0);
            setTax(editing.tax || 0);
            setOtherCharges(editing.otherCharges || 0);

            // Populate Attachments
            if (editing.attachments) {
                setExistingAttachments(editing.attachments);
            } else {
                setExistingAttachments([]);
            }
            setNewAttachments([]); // Clear new attachments on open

            // Populate Label
            if (editing.label) {
                setExistingLabel(editing.label);
            } else {
                setExistingLabel(null);
            }
            setNewLabel(null);

            // Populate Items
            if (editing.items && editing.items.length > 0) {
                // Multi-product structure
                setItems(editing.items.map(i => {
                    // RESOLVE PRODUCT INFO: Prioritize ChannelListing -> Fallback to legacy
                    const listing = i.channelListing;
                    const variant = listing?.productVariant || i.productVariant;
                    const product = listing?.product || variant?.product || i.product;
                    // Build variant name (product name + size/color)
                    const productName = product?.name || listing?.productName || i.productDescription || "Unknown Product";
                    const variantParts = [productName];
                    if (variant?.size?.name) variantParts.push(`Size ${variant.size.name}`);
                    if (variant?.color?.name) variantParts.push(variant.color.name);
                    const variantName = variantParts.join(' - ');

                    return {
                        id: Math.random().toString(36).substr(2, 9), // temp UI ID
                        channelListingId: i.channelListingId,
                        listingId: i.channelListingId, // consistency
                        productId: product?.id,
                        variantId: variant?.id,
                        displayName: i.productDescription || productName,
                        variantName, // Product/variant name for display
                        marketplaceName: listing?.productName || i.productDescription || null, // Marketplace listing name
                        marketplaceSku: variant?.sku || product?.sku || null, // Marketplace SKU
                        sku: variant?.sku || product?.sku || "",
                        imageUrl: product?.images?.[0]?.url || null,
                        quantity: i.quantity,
                        unitCost: i.unitCost, // backend decimal
                        unitPrice: i.unitPrice, // backend decimal
                        otherFee: i.otherFee,
                        totalCost: i.totalCost,
                        totalAmount: i.totalAmount,
                        stockOnHand: variant?.stockOnHand ?? product?.ProductVariant?.[0]?.stockOnHand ?? 0,
                        units: listing?.units ?? 1,
                    };
                }));
            } else {
                setItems([]);
            }
        } else {
            // Reset
            setDate(new Date().toISOString().split('T')[0]);
            setOrderId("");
            setTenantChannelId("");
            setCourierMediumId("");
            setTrackingId("");
            setStatus("PENDING");
            setRemarkTypeId("");
            setRemarks("");
            setShippingCharges(0);
            setTax(0);
            setOtherCharges(0);
            setItems([]);
            setExistingLabel(null);
            setNewLabel(null);
            setExistingAttachments([]);
            setNewAttachments([]);
        }
    }, [editing, open]);

    // Handlers
    const handleProductSelect = (id) => {
        if (!id) return;
        const product = productOptions.find(p => p.id === id);
        if (!product) return;

        // Add to items - prefill with avgCostPerUnit for unit cost
        // Fallback: avgCostPerUnit -> costPrice -> lastPurchasePrice
        let baseUnitCost = 0;
        let costSource = null;
        if (product.avgCostPerUnit != null && parseFloat(product.avgCostPerUnit) > 0) {
            baseUnitCost = parseFloat(product.avgCostPerUnit);
            costSource = 'avgCost';
        } else if (product.costPrice != null && parseFloat(product.costPrice) > 0) {
            baseUnitCost = parseFloat(product.costPrice);
            costSource = 'costPrice';
        } else if (product.lastPurchasePrice != null && parseFloat(product.lastPurchasePrice) > 0) {
            baseUnitCost = parseFloat(product.lastPurchasePrice);
            costSource = 'lastPurchase';
        }

        const units = product.channelUnits || 1;

        // Single Unit Cost (e.g. 15)
        const unitCost = baseUnitCost.toFixed(2);

        // Pack Cost (e.g. 30) for Total Calculation
        const packCost = baseUnitCost * units;

        const newItem = {
            id: Math.random().toString(36).substr(2, 9),
            listingId: product.id,
            productId: product.productId,
            variantId: product.variantId || null,
            displayName: product.displayName,
            variantName: product.variantName || product.name,
            marketplaceName: product.marketplaceName || null,
            marketplaceSku: product.marketplaceSku || null,
            sku: product.sku,
            imageUrl: product.imageUrl,
            quantity: 1,
            unitCost: unitCost, // Display Single Unit Cost
            costSource,
            unitPrice: product.channelPrice ?? product.retailPrice ?? 0,
            otherFee: 0,
            totalCost: packCost.toFixed(2), // qty(1) * packCost
            totalAmount: product.channelPrice ?? product.retailPrice ?? 0,
            stockOnHand: product.stockOnHand ?? 0,
            units: units,
        };

        setItems(prev => [...prev, newItem]);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        const item = newItems[index];

        if (['unitCost', 'unitPrice'].includes(field)) {
            item[field] = value;
        } else {
            item[field] = value;
        }

        const qty = parseFloat(item.quantity) || 0;
        const cost = parseFloat(item.unitCost) || 0; // Single Unit Cost
        const price = parseFloat(item.unitPrice) || 0;
        const units = item.units || 1;

        // Total Cost = Single Cost * Units * Qty
        item.totalCost = (cost * units * qty).toFixed(2);

        // Total Amount = Sale Price * Qty (Sale Price is per pack/listing)
        item.totalAmount = (qty * price).toFixed(2);

        setItems(newItems);
    };

    const removeItem = (index) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    // Handlers
    const handleSave = async (mode = 'single', skipTrackingIdCheck = false) => {
        if (!orderId?.trim()) {
            alert.error("Required Field", "Order ID is required");
            return;
        }

        if (items.length === 0) {
            alert.error("Missing Items", "Please add at least one product");
            return;
        }

        // Stock Validation
        // 1. Skip if status is Cancel/Return/Refund (items are being returned to stock)
        const isReturning = ['CANCEL', 'RETURN', 'REFUND'].includes(status);

        if (!isReturning) {
            const overStockItems = items.filter(item => {
                const qty = parseFloat(item.quantity) || 0;
                const units = item.units || 1;
                const required = qty * units;
                let available = item.stockOnHand || 0;

                // 2. If editing an ACTIVE order, add back the *original* quantity to available stock
                // because we "own" that stock currently.
                if (editing && editing.items) {
                    // Check if the editing order was holding stock
                    const wasHoldingStock = !['CANCEL', 'RETURN', 'REFUND'].includes(editing.status);

                    if (wasHoldingStock) {
                        // Find original item match (by variantId or productId)
                        // Note: item.id is random UI ID, so match by content
                        const original = editing.items.find(orig =>
                            (item.variantId && orig.productVariantId === item.variantId) ||
                            (!item.variantId && orig.productId === item.productId && !orig.productVariantId)
                        );
                        if (original) {
                            const origUnits = original.channelListing?.units || 1; // get original units
                            available += ((original.quantity || 0) * origUnits); // add back FULL QUANTITY (units * qty)
                        }
                    }
                }

                return required > available;
            });

            if (overStockItems.length > 0) {
                const names = overStockItems.map(i => {
                    const req = (parseFloat(i.quantity) || 0) * (i.units || 1);
                    return `${i.displayName} (Req: ${req}, Avail: ${i.stockOnHand})`;
                }).join(", ");

                alert.error(
                    "Insufficient Stock",
                    `Quantity exceeds available stock for: ${names}`
                );
                return;
            }
        }

        const normalizedTrackingId = String(trackingId ?? "").trim();
        if (!skipTrackingIdCheck && normalizedTrackingId) {
            try {
                const trackingCheck = await checkOrderTrackingIdExists({
                    trackingId: normalizedTrackingId,
                    excludeOrderId: editing?.id || undefined,
                });

                if (trackingCheck?.exists) {
                    const existingOrderId = trackingCheck?.order?.orderId || trackingCheck?.order?.id;
                    alert.showAlert({
                        type: "info",
                        title: "Tracking ID Already Exists",
                        message: `An order${existingOrderId ? ` (${existingOrderId})` : ""} already uses tracking ID "${normalizedTrackingId}". Do you want to proceed anyway?`,
                        confirmLabel: "Proceed",
                        cancelLabel: "Cancel",
                        showCancel: true,
                        onConfirm: () => handleSave(mode, true),
                    });
                    return;
                }
            } catch {
                alert.error("Tracking Check Failed", "Could not verify tracking ID uniqueness. Please try again.");
                return;
            }
        }

        const payload = {
            date: new Date(date).toISOString(),
            orderId,
            tenantChannelId: tenantChannelId || null,
            courierMediumId: courierMediumId || null,
            trackingId: normalizedTrackingId || null,
            status,
            remarkTypeId: remarkTypeId || null,
            remarks,
            shippingCharges: parseFloat(shippingCharges) || 0,
            tax: parseFloat(tax) || 0,
            otherCharges: parseFloat(otherCharges) || 0,
            items: items.map(item => ({
                productId: item.productId,
                productDescription: item.displayName, // Snapshot name
                quantity: parseFloat(item.quantity) || 1,
                // Send Single Unit Cost (Backend will handle total calc)
                unitCost: parseFloat(item.unitCost) || 0,
                unitPrice: parseFloat(item.unitPrice) || 0,
                otherFee: parseFloat(item.otherFee) || 0,
                channelListingId: item.listingId || null  // Direct reference for units lookup
            }))
        };

        try {
            let savedOrderId = orderId;
            if (editing) {
                await updateMut.mutateAsync({ id: editing.id, payload });
                // savedOrderId is already orderId (from editing)
                savedOrderId = editing.id;
                alert.success("Order Updated", "Your order has been successfully updated.");
            } else {
                const res = await createMut.mutateAsync(payload);
                // The API createOrder returns the Order object
                savedOrderId = res.id;
                alert.success("Order Created", "Your order has been successfully placed.");
            }

            // Upload Attachments
            if (newAttachments.length > 0) {
                const loadingToast = toast.loading("Uploading attachments...");
                try {
                    await Promise.all(newAttachments.map(file => {
                        const fd = new FormData();
                        fd.append('file', file);
                        return uploadOrderAttachment(savedOrderId, fd);
                    }));
                    toast.dismiss(loadingToast);
                } catch (err) {
                    console.error("Upload error", err);
                    toast.error("Some attachments failed to upload", { id: loadingToast });
                }
            }

            // Upload Label
            if (newLabel) {
                const labelToast = toast.loading("Uploading label...");
                try {
                    const fd = new FormData();
                    fd.append('file', newLabel);
                    // Use mutation to ensure invalidation
                    const updatedOrder = await uploadLabelMut.mutateAsync({ orderId: savedOrderId, formData: fd });

                    // Update local state to show immediately
                    if (updatedOrder?.label) {
                        setExistingLabel(updatedOrder.label);
                        setNewLabel(null);
                    }

                    toast.dismiss(labelToast);
                } catch (err) {
                    console.error("Label upload error", err);
                    toast.error("Label failed to upload", { id: labelToast });
                }
            }

            if (mode === 'again') {
                if (bulkCreationMode) {
                    // In bulk mode, persist only fields with enabled toggles.
                    const nextDate = bulkPersist.date ? date : new Date().toISOString().split('T')[0];
                    const nextMarketplace = bulkPersist.marketplace ? tenantChannelId : "";
                    const nextCourier = bulkPersist.courier ? courierMediumId : "";
                    const nextRemarkType = bulkPersist.remarks ? remarkTypeId : "";
                    const nextRemarks = bulkPersist.remarks ? remarks : "";
                    const nextItems = bulkPersist.products
                        ? items.map((item) => {
                            const qty = parseFloat(item.quantity) || 0;
                            const units = item.units || 1;
                            const movement = qty * units;
                            const currentStock = Number(item.stockOnHand) || 0;
                            const nextStock = isReturning
                                ? currentStock + movement
                                : Math.max(0, currentStock - movement);
                            return { ...item, stockOnHand: nextStock };
                        })
                        : [];
                    const nextAttachments = bulkPersist.attachments ? newAttachments : [];
                    const nextShipping = bulkPersist.shippingCharges ? shippingCharges : 0;
                    const nextTax = bulkPersist.tax ? tax : 0;
                    const nextOther = bulkPersist.otherCharges ? otherCharges : 0;

                    setDate(nextDate);
                    setStatus("PENDING");
                    setOrderId("");
                    setTrackingId("");
                    setTenantChannelId(nextMarketplace);
                    setCourierMediumId(nextCourier);
                    setRemarkTypeId(nextRemarkType);
                    setRemarks(nextRemarks);
                    setItems(nextItems);
                    setShippingCharges(nextShipping);
                    setTax(nextTax);
                    setOtherCharges(nextOther);
                    setNewAttachments(nextAttachments);
                    setNewLabel(null);
                    setExistingAttachments([]);
                    setExistingLabel(null);
                } else {
                    // Existing behavior when bulk mode is off.
                    setOrderId("");
                    setTrackingId("");
                    setNewAttachments([]);
                    setNewLabel(null);
                    setExistingAttachments([]);
                    setExistingLabel(null);
                    setShippingCharges(0);
                    setTax(0);
                    setOtherCharges(0);
                }

                if (onSuccess) onSuccess(savedOrderId);

                // Track saved order for preview
                const currentOrderData = {
                    id: savedOrderId,
                    orderId: orderId, // use the state value before clearing
                    trackingId: trackingId,
                    marketplace: channels.find(c => c.id === tenantChannelId)?.marketplace || "Unknown",
                    itemsCount: items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0),
                    totalEarning: totalEarning,
                    // Additional info for expanded view
                    items: [...items],
                    shippingCharges: Number(shippingCharges),
                    tax: Number(tax),
                    otherCharges: Number(otherCharges)
                };
                setSavedOrders(prev => [currentOrderData, ...prev]);

                toast.success("Order saved. Ready for next.");
                setTimeout(() => orderIdRef.current?.focus(), 0);
            } else {
                if (onSuccess) onSuccess(savedOrderId);
                onClose();
            }
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Failed to save order";
            const lowerMsg = msg.toLowerCase();

            if (lowerMsg.includes("order id already exists")) {
                alert.error("Duplicate Order ID", `An order with ID "${orderId}" already exists. Please use a unique Order ID.`);
            } else if (lowerMsg.includes("tracking id already exists")) {
                alert.error("Duplicate Tracking ID", `An order with Tracking ID "${trackingId}" already exists.`);
            } else {
                alert.error("Error", msg);
            }
        }
    };

    // Options for Selects
    const channelOpts = channels.map(c => ({ value: c.id, label: c.marketplace || c.name }));
    const courierOpts = couriers.map(c => ({ value: c.id, label: c.shortName || c.fullName }));
    const remarkTypeOpts = [
        { value: "", label: "None" },
        ...remarkTypes.map(r => ({ value: r.id, label: r.name })),
    ];
    const statusOptions = [
        "PENDING", "LABEL_UPLOADED", "LABEL_PRINTED", "PACKED", "SHIPPED",
        "DELIVERED", "RETURN", "CANCEL", "REFUND"
    ].map(s => ({ value: s, label: s.replace(/_/g, " ") }));

    const productSelectOpts = useMemo(() => {
        // Filter by SKU to ensure unique listings are hidden once selected.
        // The SKU in productOptions is the listing's externalSku.
        const selectedSkus = new Set(items.map(i => i.sku || i.marketplaceSku).filter(Boolean));

        return productOptions
            .filter(p => !selectedSkus.has(p.sku))
            .map(p => ({
                value: p.id,
                label: p.variantName || p.name, // Use variantName for display label
                variantName: p.variantName || p.name,
                marketplaceName: p.marketplaceName,
                //marketplaceSku: p.marketplaceSku,
                sku: p.sku,
                imageUrl: p.imageUrl,
            }));
    }, [productOptions, items]);

    const absImg = (url) => {
        const raw = String(url ?? "").trim();
        if (!raw || raw.toLowerCase() === "null" || raw.toLowerCase() === "undefined") return IMG_PLACEHOLDER;
        if (/^https?:\/\//i.test(raw)) return raw;
        const normalized = raw.startsWith("/") ? raw : `/${raw}`;
        return `${API_BASE}${normalized}`;
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            dismissible={false}
            title={editing ? "Edit Order" : "New Order"}
            titleRight={!editing ? (
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600">Bulk Creation Mode</span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={bulkCreationMode}
                        onClick={() => setBulkCreationMode(v => !v)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${bulkCreationMode ? "bg-gray-900" : "bg-gray-300"}`}
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${bulkCreationMode ? "translate-x-5" : "translate-x-1"}`}
                        />
                    </button>
                </div>
            ) : null}
            sideContent={!editing && bulkCreationMode ? (
                <div className="p-4">
                    <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-1">Bulk Persistence Configuration</h3>
                    <p className="text-xs text-gray-500 mb-3">
                        Save & Add Another will keep only enabled fields.
                    </p>
                    <div className="flex flex-col gap-2.5">
                        {[
                            { key: "date", label: "Persist Date" },
                            { key: "marketplace", label: "Persist Marketplace" },
                            { key: "remarks", label: "Persist Remarks" },
                            { key: "products", label: "Persist Products" },
                            { key: "attachments", label: "Persist Attachments" },
                            { key: "shippingCharges", label: "Persist Shipping Charges" },
                            { key: "tax", label: "Persist Tax" },
                            { key: "otherCharges", label: "Persist Other Charges" },
                            { key: "courier", label: "Persist Courier" },
                        ].map((opt) => (
                            <label key={opt.key} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-700">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900/20"
                                    checked={Boolean(bulkPersist[opt.key])}
                                    onChange={(e) =>
                                        setBulkPersist(prev => ({ ...prev, [opt.key]: e.target.checked }))
                                    }
                                />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                </div>
            ) : null}
            widthClass="max-w-6xl"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    {!editing && (
                        <Button
                            variant="secondary"
                            onClick={() => handleSave('again')}
                            isLoading={createMut.isPending || updateMut.isPending}
                        >
                            Save & Add Another
                        </Button>
                    )}
                    <Button variant="warning" onClick={() => handleSave('single')} isLoading={createMut.isPending || updateMut.isPending}>
                        Save
                    </Button>
                </>
            }
        >
            <div className="space-y-6">

                {/* 1. Logistics / Header Info */}
                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Logistics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div>
                            <label className="block text-[11px] font-medium text-gray-500 mb-1">Date</label>
                            <OrderTextField type="date" value={date} onValueChange={setDate} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-gray-500 mb-1">Order ID <span className="text-red-500">*</span></label>
                            <OrderTextField inputRef={orderIdRef} value={orderId} onValueChange={setOrderId} placeholder="Enter Order ID" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-gray-500 mb-1">Status</label>
                            <SelectCompact
                                value={status}
                                onChange={setStatus}
                                options={statusOptions}
                                addNewLabel={null}
                                buttonClassName="h-9"
                                placeholder="Select Status"
                                disabled={!editing}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-gray-500 mb-1">Marketplace <span className="text-red-500">*</span></label>
                            <SelectCompact
                                value={tenantChannelId}
                                onChange={setTenantChannelId}
                                options={channelOpts}
                                addNewLabel={null}
                                buttonClassName="h-9"
                                placeholder="Select Marketplace"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-gray-500 mb-1">Courier</label>
                            <SelectCompact
                                value={courierMediumId}
                                onChange={setCourierMediumId}
                                options={courierOpts}
                                addNewLabel={null}
                                buttonClassName="h-9"
                                placeholder="Select Courier"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-gray-500 mb-1">Tracking ID</label>
                            <OrderTextField value={trackingId} onValueChange={setTrackingId} placeholder="--" />
                        </div>
                    </div>
                </div>

                {/* Attachments Section */}
                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Attachments</h3>
                        <label className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
                            <Plus size={14} />
                            Add File
                            <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                        </label>
                    </div>

                    {(existingAttachments.length > 0 || newAttachments.length > 0) ? (
                        <div className="space-y-2">
                            {/* Existing Attachments */}
                            {existingAttachments.map(att => (
                                <div key={att.id} className="flex items-center justify-between p-2 rounded bg-white border border-gray-200 text-sm">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <Paperclip size={14} className="text-gray-400 flex-shrink-0" />
                                        <span className="truncate text-gray-700">{att.fileName}</span>
                                        <span className="text-xs text-gray-400 flex-shrink-0">({(att.fileSize / 1024).toFixed(0)}KB)</span>
                                    </div>
                                    <button onClick={() => deleteExistingAttachment(att.id)} className="text-gray-400 hover:text-red-500">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}

                            {/* New Attachments */}
                            {newAttachments.map((file, idx) => (
                                <div key={`new-${idx}`} className="flex items-center justify-between p-2 rounded bg-blue-50 border border-blue-100 text-sm">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <Paperclip size={14} className="text-blue-400 flex-shrink-0" />
                                        <span className="truncate text-gray-700">{file.name}</span>
                                        <span className="text-xs text-blue-400 flex-shrink-0">(New)</span>
                                    </div>
                                    <button onClick={() => removeNewAttachment(idx)} className="text-gray-400 hover:text-red-500">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 italic">No attachments added.</p>
                    )}
                </div>

                {/* Label Section */}
                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Label</h3>
                        <label className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
                            <Plus size={14} />
                            {existingLabel || newLabel ? 'Replace Label' : 'Add Label'}
                            <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                                        alert.error("Invalid File", "Only PDF files are allowed for labels.");
                                        e.target.value = null;
                                        return;
                                    }
                                    setNewLabel(file);
                                }
                                e.target.value = null;
                            }} />
                        </label>
                    </div>

                    {(existingLabel || newLabel) ? (
                        <div className="flex items-center justify-between p-2 rounded bg-white border border-gray-200 text-sm">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Paperclip size={14} className="text-gray-400 flex-shrink-0" />
                                {newLabel ? (
                                    <>
                                        <span className="truncate text-gray-700">{newLabel.name}</span>
                                        <span className="text-xs text-blue-400 flex-shrink-0">(New)</span>
                                    </>
                                ) : (
                                    <a href={absImg(existingLabel)} target="_blank" rel="noopener noreferrer" className="truncate text-blue-600 hover:underline">
                                        View Current Label
                                    </a>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Delete existing label if present */}
                                {existingLabel && !newLabel && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            alert.confirm("Delete Label?", "Are you sure you want to delete this label? Status will revert to Pending.", async () => {
                                                try {
                                                    await deleteLabelMut.mutateAsync(editing.id);
                                                    setExistingLabel(null);
                                                    setStatus('PENDING'); // Always revert to PENDING
                                                    toast.success("Label deleted");
                                                    if (onSuccess) onSuccess(editing.id); // Refresh parent
                                                } catch (e) {
                                                    toast.error("Failed to delete label");
                                                }
                                            });
                                        }}
                                        className="text-gray-400 hover:text-red-500"
                                        title="Delete Label"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                                {newLabel && (
                                    <button onClick={() => setNewLabel(null)} className="text-gray-400 hover:text-red-500">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 italic">No label uploaded.</p>
                    )}
                </div>

                {/* 2. Order Items */}
                <div className="min-h-[200px]">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Order Items ({items.length})</h3>
                        <div className="w-[30rem] max-w-[90vw] relative" onClick={() => !tenantChannelId && alert.info("Select Marketplace First", "Please select a Marketplace before adding products.")}>
                            <div className={!tenantChannelId ? "pointer-events-none opacity-50" : ""}>
                                <SelectCompact
                                    value=""
                                    onChange={handleProductSelect}
                                    options={productSelectOpts}
                                    filterable
                                    onSearch={setProductSearch} // Enable server-side search
                                    loading={isProductSearchLoading}
                                    loadingText="Searching products..."
                                    buttonClassName="h-9 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 bg-white"
                                    addNewLabel={null}
                                    hideCheck={true} // Hide the selected checkmark/spacer
                                    placeholder="Search products to add..."
                                    renderOption={(opt) => {
                                        if (typeof opt === 'string') return opt;
                                        return (
                                            <div className="flex items-start gap-2 py-1">
                                                <div className="w-9 h-9 flex-shrink-0 rounded-md border border-gray-200 bg-gray-50 overflow-hidden mt-0.5">
                                                    {opt.imageUrl ? (
                                                        <img
                                                            src={absImg(opt.imageUrl)}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                e.currentTarget.onerror = null;
                                                                e.currentTarget.src = IMG_PLACEHOLDER;
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-0.5 min-w-0 flex-1 pr-1">
                                                    <span className="text-sm font-medium text-gray-900 leading-tight break-words" title={opt.marketplaceName || opt.variantName}>
                                                        {opt.marketplaceName || opt.variantName || opt.label}
                                                    </span>
                                                    <div className="flex flex-col text-xs text-gray-500">
                                                        {opt.marketplaceSku && (
                                                            <span className="break-words">
                                                                <span className="font-medium text-gray-400">Marketplace SKU:</span> {opt.marketplaceSku}
                                                            </span>
                                                        )}
                                                        {opt.sku && (
                                                            <span className="break-words">
                                                                <span className="font-medium text-gray-400">Internal SKU:</span> {opt.sku}
                                                            </span>
                                                        )}
                                                        <span className="text-gray-500 break-words">
                                                            <span className="font-medium text-gray-400">Product Name:</span> {opt.variantName || opt.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <table className="w-full table-fixed text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-gray-500">Product</th>
                                    <th className="px-2 py-3 font-medium text-gray-500 w-[96px] text-center">Units</th>
                                    <th className="px-2 py-3 font-medium text-gray-500 w-[160px] text-center">Qty</th>
                                    {/* <th className="px-2 py-3 font-medium text-gray-500 w-[15%] text-center">Unit Cost</th> */}
                                    <th className="px-2 py-3 font-medium text-gray-500 w-[160px] text-center">Unit Sale Price</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 w-[160px] text-center">Sale Subtotal</th>
                                    <th className="px-2 py-3 w-[48px]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-gray-400 italic bg-gray-50/30">
                                            No items added. <br />Use the search bar above to add products.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item, idx) => (
                                        <tr key={item.id} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={absImg(item.imageUrl)}
                                                        className="h-10 w-10 rounded border border-gray-200 bg-white object-contain"
                                                        alt=""
                                                    />
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="font-medium text-gray-900 line-clamp-1">{item.variantName || item.displayName}</div>
                                                        {(item.marketplaceName || item.marketplaceSku) && (
                                                            <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                                                {item.marketplaceName && (
                                                                    <span><span className="text-gray-400">Listing:</span> {item.marketplaceName}</span>
                                                                )}
                                                                {item.sku && (
                                                                    <span><span className="text-gray-400">Internal SKU:</span> {item.sku}</span>
                                                                )}
                                                                {/* {item.marketplaceSku && (
                                                                    <span><span className="text-gray-400">Marketplace SKU:</span> {item.marketplaceSku}</span>
                                                                )} */}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${((parseFloat(item.quantity) || 0) * (item.units || 1)) > (item.stockOnHand || 0)
                                                                ? 'bg-red-100 text-red-600'
                                                                : 'bg-emerald-100 text-emerald-600'
                                                                }`}>
                                                                Stock: {item.stockOnHand ?? 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 py-3 align-middle text-center">
                                                <span className="inline-flex items-center justify-center h-8 px-2 text-sm font-medium text-gray-600 bg-gray-100 rounded">
                                                    {item.units ?? 1}
                                                </span>
                                            </td>
                                            <td className="px-2 py-3 align-middle">
                                                <div className="flex justify-center">
                                                    <OrderTextField
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        className="w-32 h-8 px-1 text-center border border-gray-200 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                        value={item.quantity}
                                                        sanitize={sanitizeDigitsOnly}
                                                        onValueChange={(val) => updateItem(idx, 'quantity', val)}
                                                    />
                                                </div>
                                            </td>
                                            {/* <td className="px-2 py-3 align-top">
                                                <input
                                                    type="number"
                                                    className="w-full h-8 px-2 text-right border border-gray-200 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                    value={item.unitCost}
                                                    onChange={e => updateItem(idx, 'unitCost', e.target.value)}
                                                    step="0.01"
                                                />
                                            </td> */}
                                            <td className="px-2 py-3 align-middle">
                                                <div className="flex justify-center">
                                                    <OrderTextField
                                                        type="text"
                                                        inputMode="decimal"
                                                        pattern="[0-9]*\\.?[0-9]*"
                                                        className="w-32 h-8 px-1 text-center border border-gray-200 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                        value={item.unitPrice}
                                                        sanitize={sanitizeDecimal}
                                                        onValueChange={(val) => updateItem(idx, 'unitPrice', val)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-middle text-center font-medium text-gray-900">
                                                {parseFloat(item.totalAmount || 0).toFixed(2)}
                                            </td>
                                            <td className="px-2 py-3 align-middle text-center">
                                                <button
                                                    type="button"
                                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    onClick={() => removeItem(idx)}
                                                    title="Remove Item"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. Footer Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Remark Type</label>
                        <SelectCompact
                            value={remarkTypeId}
                            onChange={setRemarkTypeId}
                            options={remarkTypeOpts}
                            addNewLabel={null}
                            buttonClassName="h-9 w-full"
                            placeholder="Select Remark Type"
                        />
                        <div className="mt-4">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                            <textarea
                                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                rows={3}
                                placeholder="Add optional remarks..."
                                value={remarks}
                                onChange={e => setRemarks(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex flex-col justify-between">
                        <div className="space-y-3 text-sm">
                            {/* Total Cost Price */}
                            {/* <div className="flex justify-between text-gray-500">
                                <span>Total Cost Price</span>
                                <span className="font-medium text-gray-900">{itemsTotalCost.toFixed(2)}</span>
                            </div> */}

                            <div className="flex justify-between text-gray-500">
                                <span>Sale Subtotal</span>
                                <span className="font-medium text-gray-900">{itemsTotalRevenue.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center text-gray-500">
                                <span>Shipping Charges</span>
                                <div className="w-24">
                                    <OrderTextField
                                        type="text"
                                        inputMode="decimal"
                                        pattern="[0-9]*\\.?[0-9]*"
                                        value={shippingCharges}
                                        sanitize={sanitizeDecimal}
                                        onValueChange={setShippingCharges}
                                        className="w-full text-right bg-white border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-200 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-gray-500">
                                <span>Tax ($)</span>
                                <div className="w-24">
                                    <OrderTextField
                                        type="text"
                                        inputMode="decimal"
                                        pattern="[0-9]*\\.?[0-9]*"
                                        value={tax}
                                        sanitize={sanitizeDecimal}
                                        onValueChange={setTax}
                                        className="w-full text-right bg-white border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-200 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-gray-500">
                                <span>Other Charges</span>
                                <div className="w-24">
                                    <OrderTextField
                                        type="text"
                                        inputMode="decimal"
                                        pattern="[0-9]*\\.?[0-9]*"
                                        value={otherCharges}
                                        sanitize={sanitizeDecimal}
                                        onValueChange={setOtherCharges}
                                        className="w-full text-right bg-white border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-200 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-gray-200 my-2" />

                            {/* Total Order Amount Hidden */}

                            <div className="flex justify-between items-center pt-2">
                                <span className="font-semibold text-gray-900">Total Earning</span>
                                <span className="font-bold text-gray-900">
                                    {totalEarning.toFixed(2)}
                                </span>
                            </div>
                            {/* <div className="flex justify-between items-center pt-1">
                                <span className="font-semibold text-gray-900">Net Profit</span>
                                <span className={`text-xl font-bold ${grandTotal - itemsTotalCost >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                    {(totalEarning - itemsTotalCost).toFixed(2)}
                                </span>
                            </div> */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Saved Orders Preview */}
            {savedOrders.length > 0 && (
                <div className="mt-6 rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-green-200 bg-white/50">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-green-300 bg-green-100">
                                <Check size={16} className="text-green-700" />
                            </div>
                            <h3 className="text-sm font-semibold text-green-800">
                                Orders Added ({savedOrders.length})
                            </h3>
                        </div>
                        <button
                            onClick={() => setSavedOrders([])}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                            Clear All
                        </button>
                    </div>

                    <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                        {savedOrders.map((order, idx) => (
                            <SavedOrderRow
                                key={order.id || idx}
                                order={order}
                                index={savedOrders.length - idx}
                                absImg={absImg}
                            />
                        ))}
                    </div>
                </div>
            )}
        </Modal >
    );
}

function SavedOrderRow({ order, index, absImg }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-white rounded-lg border border-green-200 overflow-hidden hover:shadow-sm transition-all">
            {/* Header / Summary */}
            <div
                className="p-3 cursor-pointer hover:bg-gray-50/50 flex items-center gap-3"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex-shrink-0">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                        {index}
                    </span>
                </div>

                <div className="flex-1 grid grid-cols-12 gap-2 text-[13px] items-center">
                    <div className="col-span-3">
                        <p className="text-gray-400 text-[9px] uppercase font-extrabold tracking-wider">Order ID</p>
                        <p className="font-semibold text-gray-900 truncate">{order.orderId}</p>
                    </div>

                    <div className="col-span-3">
                        <p className="text-gray-400 text-[9px] uppercase font-extrabold tracking-wider">Marketplace</p>
                        <p className="font-medium text-gray-800 truncate">{order.marketplace}</p>
                    </div>

                    <div className="col-span-2">
                        <p className="text-gray-400 text-[9px] uppercase font-extrabold tracking-wider">Items</p>
                        <p className="font-semibold text-gray-700">{order.itemsCount}</p>
                    </div>

                    <div className="col-span-3 text-right">
                        <p className="text-gray-400 text-[9px] uppercase font-extrabold tracking-wider">Total Earning</p>
                        <p className="font-bold text-emerald-600">${order.totalEarning.toFixed(2)}</p>
                    </div>

                    <div className="col-span-1 flex justify-end text-gray-400">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                </div>
            </div>

            {/* Detailed View */}
            {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-gray-50/30">
                    <div className="space-y-3">
                        {/* Item List */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Order Items</p>
                            {order.items.map((item, iIdx) => (
                                <div key={iIdx} className="flex items-center gap-3 bg-white p-2 rounded-md border border-gray-100">
                                    <div className="h-10 w-10 flex-shrink-0 rounded bg-gray-50 border border-gray-200 overflow-hidden">
                                        <img
                                            src={absImg(item.imageUrl)}
                                            alt=""
                                            className="h-full w-full object-cover"
                                            onError={(e) => { e.currentTarget.src = "data:image/svg+xml;utf8,<svg ... />"; }} // Fallback if absImg fails
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-900 truncate">{item.variantName || "Product"}</p>
                                        <p className="text-[10px] text-gray-500 truncate">SKU: {item.sku || item.marketplaceSku}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] font-bold text-gray-900">Qty: {item.quantity}</p>
                                        <p className="text-[10px] text-gray-500">Price: ${Number(item.unitPrice).toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Charges Summary */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                            <div>
                                <p className="text-[9px] text-gray-400 uppercase font-bold">Shipping</p>
                                <p className="text-xs font-semibold text-gray-700">${order.shippingCharges.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-gray-400 uppercase font-bold">Tax</p>
                                <p className="text-xs font-semibold text-gray-700">${order.tax.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-gray-400 uppercase font-bold">Other</p>
                                <p className="text-xs font-semibold text-gray-700">${order.otherCharges.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
