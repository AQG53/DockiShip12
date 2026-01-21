import { useState, useEffect, useMemo } from "react";
import { Trash2, Pencil, Check, X, Loader2 } from "lucide-react";
import SelectCompact from "../../../components/SelectCompact";
import toast from "react-hot-toast";

export default function MarketplaceListingRow({
    listing,
    variants,
    variantEnabled,
    productDetail,
    allChannels,
    onUpdate,
    onDelete,
    findVariantLabel
}) {
    // Mode state
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [productName, setProductName] = useState(listing.productName || "");
    const [channelId, setChannelId] = useState(listing.channelId || listing.channel?.id || "");
    const [sku, setSku] = useState(listing.externalSku || listing.sku || "");
    const [price, setPrice] = useState(listing.price != null ? listing.price : "");
    const [units, setUnits] = useState(listing.units || "");

    // Sync state only when NOT editing, or when entering edit mode if needed
    useEffect(() => {
        if (!isEditing) {
            setProductName(listing.productName || "");
            setChannelId(listing.channelId || listing.channel?.id || "");
            setSku(listing.externalSku || listing.sku || "");
            setPrice(listing.price != null ? listing.price : "");
            setUnits(listing.units || "");
        }
    }, [listing, isEditing]);

    // Calculate Assign
    const variantId = listing.variantId || listing.productVariantId || null;
    let stock = 0;
    if (variantId) {
        const v = (variants || []).find(v => String(v.id) === String(variantId));
        if (v) stock = v.stockOnHand ?? 0;
    } else {
        stock = productDetail?.stockOnHand ?? 0;
    }
    const unitsNum = parseInt(units, 10);
    const assignVal = (unitsNum > 0 && stock > 0) ? Math.floor(stock / unitsNum) : 0;

    // Marketplace options
    const channelOptions = useMemo(() => {
        return (allChannels || []).map(c => ({
            value: c.id,
            label: c.marketplace + (c.provider ? ` (${c.provider})` : '')
        }));
    }, [allChannels]);

    // Derived display values for read-only mode
    const channel = (allChannels || []).find(c => c.id === listing.channelId || c.id === listing.channel?.id);
    const displayChannel = channel ? (channel.marketplace + (channel.provider ? ` (${channel.provider})` : '')) : (listing.channel?.marketplace || "—");

    const handleSave = async () => {
        setIsSaving(true);
        const payload = {};

        // Compare and add changes
        if (productName !== (listing.productName || "")) payload.productName = productName;

        const originalChannelId = listing.channelId || listing.channel?.id;
        if (channelId !== originalChannelId) {
            payload.channelId = channelId;
            // payload.marketplace is inferred by backend from channelId, but we can send it key if needed. 
            // The DTO allows channelId validation logic.
        }

        // SKU is read-only in edit mode
        // if (sku !== originalSku) payload.externalSku = sku; 

        const originalPrice = listing.price != null ? parseFloat(listing.price) : NaN;
        const newPrice = parseFloat(price);
        if (!isNaN(newPrice) && newPrice !== originalPrice) payload.price = newPrice;

        const originalUnits = parseInt(listing.units || "0", 10);
        const newUnits = parseInt(units, 10);
        if (!isNaN(newUnits) && newUnits !== originalUnits) payload.units = newUnits;

        if (Object.keys(payload).length === 0) {
            setIsEditing(false);
            setIsSaving(false);
            return;
        }

        try {
            await onUpdate(listing.id, payload);
            setIsEditing(false);
            toast.success("Updated listing");
        } catch (e) {
            console.error(e);
            toast.error(e?.response?.data?.message || "Failed to update listing");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        // State will auto-reset via useEffect
    };

    return (
        <div className={`grid ${variantEnabled ? 'grid-cols-[1.1fr_1.2fr_0.9fr_0.7fr_0.6fr_0.6fr_0.6fr_0.9fr_70px]' : 'grid-cols-[1.1fr_1.2fr_0.9fr_0.7fr_0.6fr_0.6fr_0.6fr_70px]'} bg-white text-[13px] text-gray-700 items-center hover:bg-gray-50 transition-colors py-1`}>

            {/* Product Name */}
            <div className="px-3 py-2">
                {isEditing ? (
                    <input
                        className="w-full rounded border border-gray-200 px-2 py-1 text-[13px] focus:border-blue-500 focus:outline-none"
                        value={productName}
                        placeholder="Product Name"
                        onChange={(e) => setProductName(e.target.value)}
                    />
                ) : (
                    <div title={listing.productName || ""}>{listing.productName || "—"}</div>
                )}
            </div>

            {/* Marketplace */}
            <div className="px-3 py-2">
                {isEditing ? (
                    <SelectCompact
                        value={channelId}
                        onChange={setChannelId}
                        options={channelOptions}
                        filterable
                        placeholder="Select"
                        className="w-full"
                    />
                ) : (
                    <div title={displayChannel}>{displayChannel}</div>
                )}
            </div>

            {/* SKU (Read-Only) */}
            <div className="px-3 py-2 text-gray-500">
                <div title={sku}>{sku || "—"}</div>
            </div>

            {/* Price */}
            <div className="px-3 py-2 text-center">
                {isEditing ? (
                    <input
                        className="w-full rounded border border-gray-200 px-2 py-1 text-[13px] text-center focus:border-blue-500 focus:outline-none"
                        value={price}
                        placeholder="0.00"
                        onChange={(e) => setPrice(e.target.value)}
                    />
                ) : (
                    <div>{price ? `$${Number(price).toFixed(2)} ` : "—"}</div>
                )}
            </div>

            {/* Units */}
            <div className="px-3 py-2 text-center">
                {isEditing ? (
                    <input
                        className="w-full rounded border border-gray-200 px-2 py-1 text-[13px] text-center focus:border-blue-500 focus:outline-none"
                        value={units}
                        placeholder="0"
                        onChange={(e) => setUnits(e.target.value)}
                    />
                ) : (
                    <div>{units || "—"}</div>
                )}
            </div>

            {/* Assign (Calculated) */}
            <div className="px-3 py-2 text-center font-medium">{assignVal}</div>

            {/* Stock (Read-only) */}
            <div className="px-3 py-2 text-center text-gray-500">{stock}</div>

            {/* Variant */}
            {variantEnabled && <div className="px-3 py-2 text-gray-500 text-xs truncate">{findVariantLabel(variantId)}</div>}

            {/* Actions */}
            <div className="px-2 py-2 flex items-center justify-center gap-1">
                {isEditing ? (
                    <>
                        <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-green-200 text-green-600 hover:bg-green-50 transition-all"
                            title="Save"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        </button>
                        <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 transition-all"
                            title="Cancel"
                            onClick={handleCancel}
                            disabled={isSaving}
                        >
                            <X size={14} />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all"
                            title="Edit"
                            onClick={() => setIsEditing(true)}
                        >
                            <Pencil size={14} />
                        </button>
                        <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-all"
                            title="Delete"
                            onClick={() => onDelete(listing)}
                        >
                            <Trash2 size={14} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
