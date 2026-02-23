import { useState, useEffect, useMemo, useRef } from "react";
import { Trash2, Pencil, Check, X, Loader2, Upload } from "lucide-react";
import SelectCompact from "../../../components/SelectCompact";
import ImageGallery from "../../../components/ImageGallery";
import toast from "react-hot-toast";

export default function MarketplaceListingRow({
    listing,
    variants,
    variantEnabled,
    productDetail,
    allChannels,
    absImg,
    imagePlaceholder,
    onUpdate,
    onUploadImage,
    onDeleteImage,
    onDelete,
    findVariantLabel
}) {
    // Mode state
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [productName, setProductName] = useState(listing.productName || "");
    const [channelId, setChannelId] = useState(listing.channelId || listing.channel?.id || "");
    const [price, setPrice] = useState(listing.price != null ? listing.price : "");
    const [units, setUnits] = useState(listing.units || "");
    const [pendingImageFile, setPendingImageFile] = useState(null);
    const [pendingImagePreview, setPendingImagePreview] = useState("");
    const [removeExistingImage, setRemoveExistingImage] = useState(false);
    const imageInputRef = useRef(null);

    const listingImage = useMemo(() => {
        const raw = String(listing?.imageUrl || listing?.url || "").trim();
        if (!raw) return "";
        const looksLikeImage = raw.includes("/uploads/") || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(raw);
        return looksLikeImage ? raw : "";
    }, [listing]);

    // Sync state only when NOT editing, or when entering edit mode if needed
    useEffect(() => {
        if (!isEditing) {
            setProductName(listing.productName || "");
            setChannelId(listing.channelId || listing.channel?.id || "");
            setPrice(listing.price != null ? listing.price : "");
            setUnits(listing.units || "");
            setPendingImageFile(null);
            setPendingImagePreview("");
            setRemoveExistingImage(false);
        }
    }, [listing, isEditing]);

    useEffect(() => {
        if (!pendingImageFile) {
            setPendingImagePreview("");
            return;
        }
        const preview = URL.createObjectURL(pendingImageFile);
        setPendingImagePreview(preview);
        return () => URL.revokeObjectURL(preview);
    }, [pendingImageFile]);

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

        const hasPayloadChanges = Object.keys(payload).length > 0;
        const hasImageChange = Boolean(pendingImageFile);
        const hasImageDelete = Boolean(removeExistingImage && !pendingImageFile);

        if (!hasPayloadChanges && !hasImageChange && !hasImageDelete) {
            setIsEditing(false);
            setIsSaving(false);
            return;
        }

        try {
            if (hasPayloadChanges) {
                await onUpdate(listing.id, payload);
            }
            if (hasImageDelete && onDeleteImage) {
                await onDeleteImage(listing.id);
            }
            if (hasImageChange && onUploadImage) {
                await onUploadImage(listing.id, pendingImageFile);
            }
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

    const effectiveExistingImage = removeExistingImage ? "" : listingImage;
    const effectiveImageSrc = pendingImagePreview || (absImg ? absImg(effectiveExistingImage) : effectiveExistingImage);
    const hasImage = Boolean(effectiveImageSrc);
    const handleDeleteImageClick = () => {
        if (pendingImageFile) {
            setPendingImageFile(null);
            return;
        }
        if (effectiveExistingImage) {
            setRemoveExistingImage(true);
        }
    };

    return (
        <div className={`grid ${variantEnabled ? 'grid-cols-[72px_minmax(290px,2.35fr)_minmax(115px,0.9fr)_minmax(90px,0.8fr)_minmax(70px,0.6fr)_minmax(70px,0.6fr)_minmax(70px,0.6fr)_minmax(110px,0.9fr)_70px]' : 'grid-cols-[72px_minmax(320px,2.6fr)_minmax(120px,1fr)_minmax(100px,0.9fr)_minmax(80px,0.7fr)_minmax(80px,0.7fr)_minmax(80px,0.7fr)_70px]'} bg-white text-[13px] text-gray-700 items-center hover:bg-gray-50 transition-colors py-1`}>

            {/* Listing Image */}
            <div className="px-3 py-2 flex items-center justify-center">
                {isEditing ? (
                    <div className="relative h-8 w-8">
                        <div className="h-8 w-8 overflow-hidden rounded border border-gray-200 bg-gray-50">
                            {hasImage ? (
                                <img
                                    src={effectiveImageSrc}
                                    alt="Listing"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <img
                                    src={imagePlaceholder}
                                    alt="No image"
                                    className="h-full w-full object-cover opacity-40"
                                />
                            )}
                        </div>

                        <button
                            type="button"
                            className="absolute -left-2 -top-2 z-10 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-blue-600 hover:bg-blue-50 border border-gray-200 shadow-sm"
                            title="Upload/replace image"
                            onClick={() => imageInputRef.current?.click()}
                        >
                            <Upload size={10} />
                        </button>

                        {hasImage && (
                            <button
                                type="button"
                                className="absolute -right-2 -top-2 z-10 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-red-600 hover:bg-red-50 border border-gray-200 shadow-sm"
                                title="Remove image"
                                onClick={handleDeleteImageClick}
                            >
                                <X size={10} />
                            </button>
                        )}

                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                setRemoveExistingImage(false);
                                setPendingImageFile(e.target.files?.[0] || null);
                            }}
                        />
                    </div>
                ) : (
                    <ImageGallery
                        images={listingImage ? [{ url: listingImage, alt: listing.productName || "Listing image", productName: listing.productName || "" }] : []}
                        absImg={absImg || ((u) => u)}
                        placeholder={imagePlaceholder}
                        compact
                        className="h-8 w-8"
                        thumbnailClassName="h-8 w-8 bg-white"
                    />
                )}
            </div>

            {/* Product Name */}
            <div className="px-4 py-2 pr-5">
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
