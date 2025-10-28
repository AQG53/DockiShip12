import { Fragment, useMemo, useState, useEffect, useRef } from "react";
import { useAuthCheck } from "../hooks/useAuthCheck";
import { useProductMetaEnums, useCreateProduct, useGetProduct, useUpdateProductParent, useUpdateVariant } from "../hooks/useProducts";
import toast from "react-hot-toast";
import {
    Dialog,
    Transition,
    Listbox,
    TransitionChild,
    DialogPanel,
    ListboxButton,
    ListboxOptions,
    ListboxOption,
} from "@headlessui/react";
import { Check, ChevronDown, Package, Plus, Trash2, Truck, DollarSign, Upload } from "lucide-react";

const ADD_SIZE_SENTINEL = "__ADD_SIZE__";

export default function CreateProductModal({ open, onClose, onSave, edit = false, productId = null }) {
    const { mutateAsync: createProductMut, isPending: saving } = useCreateProduct();
    const { data: auth } = useAuthCheck({ refetchOnWindowFocus: false });
    const { data: productDetail } = useGetProduct(edit && open ? productId : null, {
        refetchOnWindowFocus: false,
    });
    const { mutateAsync: updateParent, isPending: savingParent } = useUpdateProductParent();
    const { mutateAsync: updateVariant, isPending: savingVariant } = useUpdateVariant();

    const CURRENCY = auth?.tenant?.currency || "PKR";

    const { data: enums } = useProductMetaEnums();

    const labelize = (str) =>
        typeof str === "string"
            ? str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
            : str;

    const statuses = useMemo(
        () => (enums?.ProductStatus || ["active", "inactive", "archived"]).map(labelize),
        [enums]
    );
    const conditions = useMemo(
        () => (enums?.ProductCondition || ["NEW", "USED", "RECONDITIONED"]).map(labelize),
        [enums]
    );

    const weightUnits = useMemo(
        () => enums?.WeightUnit || ["g", "kg", "lb"],
        [enums]
    );
    const dimUnits = useMemo(
        () => enums?.LengthUnit || ["mm", "cm", "inch"],
        [enums]
    );
    const resolveSubUnit = (unit) => {
        if (unit === "kg") return "g";
        if (unit === "lb") return "oz";
        if (unit === "g") return "g";
        return "g";
    };
    const barcodeTypes = useMemo(() => ["UPC", "EAN", "ISBN", "QR"], []);
    const groups = useMemo(() => ["Select", "Electronics", "Apparel", "Grocery"], []);
    // const origins = useMemo(() => ["Select"], []);
    const tags = useMemo(() => ["Select", "Featured", "Clearance", "Seasonal"], []);
    const suppliers = useMemo(() => ["Select", "ABC Traders", "Global Supply Co.", "Local Vendor"], []);

    // Sizes are now stateful so we can add new ones
    const [sizes, setSizes] = useState([
        { code: "", text: "—" },
        { code: "S", text: "Small" },
        { code: "M", text: "Medium" },
        { code: "L", text: "Large" },
        { code: "XL", text: "X-Large" },
    ]);

    // --- variants/images state ---
    const [variantEnabled, setVariantEnabled] = useState(false);
    const [variants, setVariants] = useState([]);
    const [variantPrices, setVariantPrices] = useState({});
    const [images, setImages] = useState([]);
    const fileInputRef = useRef(null);

    // --- saved products preview ---
    const [savedProducts, setSavedProducts] = useState([]);

    // Size modal state
    const [sizeModalOpen, setSizeModalOpen] = useState(false);
    const [newSizeCode, setNewSizeCode] = useState("");
    const [newSizeText, setNewSizeText] = useState("");

    // --- form state ---
    const [sku, setSku] = useState("");
    const [barcodeType, setBarcodeType] = useState(barcodeTypes[0]);
    const [barcode, setBarcode] = useState("");
    const [name, setName] = useState("");

    const [group, setGroup] = useState(groups[0]);
    const [condition, setCondition] = useState(enums?.ProductCondition?.[0] || "NEW");
    const [brand, setBrand] = useState("");
    const [status, setStatus] = useState(enums?.ProductStatus?.[0] || "active");
    const [origins, setOrigins] = useState(["Select"]);
    const [origin, setOrigin] = useState("Select");
    const [originLoading, setOriginLoading] = useState(false);

    const [weightMain, setWeightMain] = useState("");
    const [weightUnit, setWeightUnit] = useState((enums?.WeightUnit || ["g", "kg", "lb"]).includes("kg") ? "kg" : (enums?.WeightUnit?.[0] || "kg"));
    const [weightSub, setWeightSub] = useState("");
    const [weightSubUnit, setWeightSubUnit] = useState(resolveSubUnit(weightUnit));

    const [dimL, setDimL] = useState("");
    const [dimW, setDimW] = useState("");
    const [dimH, setDimH] = useState("");
    const [dimUnit, setDimUnit] = useState(enums?.LengthUnit?.[0] || "cm");

    const [tag, setTag] = useState(tags[0]);

    // --- new: supplier & pricing ---
    const [supplier, setSupplier] = useState(suppliers[0]);
    const [purchasingPrice, setPurchasingPrice] = useState("");
    const [retailPrice, setRetailPrice] = useState("");
    const [sellingPrice, setSellingPrice] = useState("");

    const [missing, setMissing] = useState({});   // map: key -> human label

    const err = (key) => Boolean(missing[key]);   // convenience
    const labelizeErr = (key, fallback) => missing[key] || fallback;

    // Build a flat list of missing fields for the current form
    // mode: { isDraft: boolean }
    function collectMissing({ isDraft }) {
        const m = {};

        // Draft = only SKU + Name
        if (isDraft) {
            if (!isNonEmpty(sku)) m["sku"] = "SKU";
            if (!isNonEmpty(name)) m["name"] = "Product Name";
            return m;
        }

        // Normal saves
        // Parent (common)
        if (!isNonEmpty(sku)) m["sku"] = "SKU";
        if (!isNonEmpty(name)) m["name"] = "Product Name";
        if (!isNonEmpty(status)) m["status"] = "Status";
        if (origin === "Select") m["origin"] = "Place of origin";

        if (!variantEnabled) {
            // Simple product → pricing is mandatory
            if (!isNonEmpty(condition)) m["condition"] = "Condition";
            if (!isNonEmpty(retailPrice)) m["retailPrice"] = "Retail Price";
            if (!isNonEmpty(sellingPrice)) m["sellingPrice"] = "Selling Price";
            if (!isNonEmpty(weightMain)) m["weightMain"] = "Weight";
            if (!isNonEmpty(dimL)) m["dimL"] = "Length";
            if (!isNonEmpty(dimW)) m["dimW"] = "Width";
            if (!isNonEmpty(dimH)) m["dimH"] = "Height";
        } else {
            // Variants: for each row → size, sku, weight/dims/unit + pricing
            if (!variants.length) {
                m["variants.none"] = "At least one Variant row";
            } else {
                variants.forEach((v, idx) => {
                    const row = variantPrices[v.id] || {};
                    const rowPrefix = `v:${v.id}:`;
                    const humanRow = `Variant #${idx + 1}`;
                    const hasSize = isNonEmpty(v.sizeCode) || isNonEmpty(v.sizeText);
                    if (!hasSize) m[rowPrefix + "size"] = `${humanRow}: Size`;
                    if (!isNonEmpty(v.sku)) m[rowPrefix + "sku"] = `${humanRow}: Variant SKU`;
                    if (!isNonEmpty(v.weight)) m[rowPrefix + "weight"] = `${humanRow}: Weight`;
                    if (!isNonEmpty(v.length)) m[rowPrefix + "length"] = `${humanRow}: Length`;
                    if (!isNonEmpty(v.width)) m[rowPrefix + "width"] = `${humanRow}: Width`;
                    if (!isNonEmpty(v.height)) m[rowPrefix + "height"] = `${humanRow}: Height`;
                    if (!isNonEmpty(v.unit)) m[rowPrefix + "unit"] = `${humanRow}: Unit`;
                    if (!isNonEmpty(row.retail)) m[rowPrefix + "retail"] = `${humanRow}: Retail Price`;
                    if (!isNonEmpty(row.original)) m[rowPrefix + "original"] = `${humanRow}: Original Price`;
                });
            }
        }
        return m;
    }


    const skuRef = useRef(null);

    function resetFormToDefaults() {
        setMissing({});
        setSku("");
        setBarcodeType(barcodeTypes[0]);
        setBarcode("");
        setName("");
        setGroup(groups[0]);
        setCondition(enums?.ProductCondition?.[0] || "NEW");
        setBrand("");
        setStatus(enums?.ProductStatus?.[0] || "active");
        setOrigin("Select");

        setWeightMain("");
        setWeightUnit(
            (enums?.WeightUnit || ["g", "kg", "lb"]).includes("kg") ? "kg"
                : (enums?.WeightUnit?.[0] || "kg")
        );
        setWeightSub("");

        setDimL("");
        setDimW("");
        setDimH("");
        setDimUnit(enums?.LengthUnit?.[0] || "cm");

        setTag(tags[0]);

        // new
        setSupplier(suppliers[0]);
        setPurchasingPrice("");
        setRetailPrice("");
        setSellingPrice("");

        setVariantEnabled(false);
        setVariants([]);
        setImages([]);
        setSavedProducts([]);
        setVariantPrices({});
    }

    const computeAutoSku = (parentSku, v, index) => {
        const parent = (parentSku || "").trim();
        if (!parent) {
            return `X-${index + 1}`;
        }
        const tail = v.sizeCode?.trim() || "X";
        return `${parent}-${tail}`;
    };

    const addVariantAdHoc = () => {
        setVariants((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                sizeCode: "",
                sizeText: "—",
                sku: computeAutoSku(sku, { sizeCode: "" }, prev.length),
                barcode: "",
                weight: "",
                weightUnit: weightUnit,
                length: "",
                width: "",
                height: "",
                unit: dimUnit,
                active: true,
                autoSku: true,
            },
        ]);
    };

    const patchVariant = (id, patch) =>
        setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));

    const deleteVariant = (id) => {
        setVariants((prev) => {
            const next = prev.filter((v) => v.id !== id);
            return next.map((v, i) => (v.autoSku ? { ...v, sku: computeAutoSku(sku, v, i) } : v));
        });
    };

    useEffect(() => {
        if (!enums) return;

        setStatus(prev =>
            enums.ProductStatus?.includes(prev) ? prev : (enums.ProductStatus?.[0] || "active")
        );
        setCondition(prev =>
            enums.ProductCondition?.includes(prev) ? prev : (enums.ProductCondition?.[0] || "NEW")
        );
        setWeightUnit(prev => {
            const list = enums.WeightUnit || ["g", "kg", "lb"];
            if (list.includes(prev)) return prev;
            return list.includes("kg") ? "kg" : (list[0] || "kg");
        });
        setDimUnit(prev =>
            (enums.LengthUnit || ["mm", "cm", "inch"]).includes(prev)
                ? prev
                : (enums.LengthUnit?.[0] || "cm")
        );
    }, [enums]);


    useEffect(() => {
        let aborted = false;

        async function loadCountryCodes() {
            try {
                setOriginLoading(true);
                const res = await fetch("https://restcountries.com/v3.1/all?fields=cca2,name");
                const data = await res.json();
                if (aborted) return;

                const items = Array.isArray(data)
                    ? data
                        .map((c) => ({
                            value: c?.cca2 ?? "",
                            label: c?.name?.common ?? c?.cca2 ?? "",
                        }))
                        .filter((x) => x.value && x.label)
                        .sort((a, b) => a.label.localeCompare(b.label))
                    : [];

                setOrigins(["Select", ...items]);
            } catch (e) {
                console.error("Failed to load country codes", e);
            } finally {
                if (!aborted) setOriginLoading(false);
            }
        }

        // only fetch if modal is opened and list is empty (except "Select")
        if (open && (!Array.isArray(origins) || origins.length <= 1)) {
            loadCountryCodes();
        }

        return () => {
            aborted = true;
        };
    }, [open]);


    useEffect(() => {
        setWeightSubUnit(resolveSubUnit(weightUnit));
    }, [weightUnit]);

    useEffect(() => {
        if (!variantEnabled) return;
        setVariants((prev) =>
            prev.map((v, i) => {
                if (!v.autoSku) return v;
                return { ...v, sku: computeAutoSku(sku, v, i) };
            })
        );
    }, [sku, variantEnabled]);

    useEffect(() => {
        if (!open) {
            resetFormToDefaults();
        }
    }, [open]);

    useEffect(() => {
        if (!variantEnabled) {
            setVariantPrices({});
            return;
        }
        setVariantPrices((prev) => {
            const next = { ...prev };
            // ensure all existing variants have a pricing row
            variants.forEach((v) => {
                if (!next[v.id]) next[v.id] = { retail: "", original: "" };
            });
            // remove rows for deleted variants
            Object.keys(next).forEach((id) => {
                if (!variants.some((v) => v.id === id)) delete next[id];
            });
            return next;
        });
    }, [variantEnabled, variants]);

    useEffect(() => {
        if (!edit || !open || !productDetail) return;

        // parent/base
        setSku(productDetail.sku || "");
        setName(productDetail.name || "");
        setBrand(productDetail.brand || "");
        setStatus(productDetail.status || (enums?.ProductStatus?.[0] || "active"));
        setCondition(productDetail.condition || (enums?.ProductCondition?.[0] || "NEW"));
        setOrigin(productDetail.originCountry || "Select");

        // weight + dims (for simple) – backend simple uses parent fields; variant-style often stores in variant
        setWeightUnit(productDetail.weightUnit || weightUnit);
        setWeightMain(
            productDetail.weight != null ? String(productDetail.weight) : ""
        );
        setDimUnit(productDetail.dimensionUnit || dimUnit);
        setDimL(productDetail.length != null ? String(productDetail.length) : "");
        setDimW(productDetail.width != null ? String(productDetail.width) : "");
        setDimH(productDetail.height != null ? String(productDetail.height) : "");

        // pricing (simple)
        setRetailPrice(
            productDetail.retailPrice != null ? String(productDetail.retailPrice) : ""
        );
        setSellingPrice(
            productDetail.originalPrice != null ? String(productDetail.originalPrice) : ""
        );

        // variants
        const arr = productDetail.ProductVariant || [];
        if (Array.isArray(arr) && arr.length > 0) {
            setVariantEnabled(arr.length > 0);
            // map into our local rows
            const rows = arr.map(v => ({
                id: v.id, // important for PATCH
                sizeCode: "", // unknown code; we display sizeText as label
                sizeText: v.sizeText || "—",
                sku: v.sku || "",
                barcode: v.barcode || "",
                weight: v.weight != null ? String(v.weight) : "",
                weightUnit: v.weightUnit || weightUnit,
                length: v.length != null ? String(v.length) : "",
                width: v.width != null ? String(v.width) : "",
                height: v.height != null ? String(v.height) : "",
                unit: v.dimensionUnit || dimUnit,
                active: (v.status || "active") === "active",
                autoSku: false,
            }));
            setVariants(rows);

            // per-variant pricing table state
            const priceMap = {};
            arr.forEach(v => {
                priceMap[v.id] = {
                    retail: v.retailPrice != null ? String(v.retailPrice) : "",
                    original: v.originalPrice != null ? String(v.originalPrice) : "",
                };
            });
            setVariantPrices(priceMap);
        } else {
            setVariantEnabled(false);
            setVariants([]);
            setVariantPrices({});
        }
    }, [edit, open, productDetail, enums]);


    // ----- VALIDATION -----
    const isNonEmpty = (v) => String(v ?? "").trim().length > 0;

    const hasRequiredSimple = () => {
        // Required: * fields (SKU, Name, Condition, Status, Origin) + Pricing (Retail & Selling)
        return (
            isNonEmpty(sku) &&
            isNonEmpty(name) &&
            isNonEmpty(condition) &&
            isNonEmpty(status) &&
            origin !== "Select" &&
            isNonEmpty(retailPrice) &&
            isNonEmpty(sellingPrice)
        );
    };

    const hasRequiredVariants = () => {
        if (!variantEnabled) return false;
        if (variants.length === 0) return false;

        // Pricing required for each variant too
        return variants.every((v) => {
            const prices = variantPrices[v.id] || {};
            const hasSize = isNonEmpty(v.sizeCode) || isNonEmpty(v.sizeText);
            return (
                hasSize &&
                isNonEmpty(v.sku) &&
                isNonEmpty(v.weight) &&
                isNonEmpty(v.length) &&
                isNonEmpty(v.width) &&
                isNonEmpty(v.height) &&
                isNonEmpty(v.unit) &&
                isNonEmpty(prices.retail) &&
                isNonEmpty(prices.original)
            );
        });
    };

    const canSaveDraft = isNonEmpty(sku) && isNonEmpty(name);
    const canSaveNormal = !variantEnabled ? hasRequiredSimple() : (
        isNonEmpty(sku) &&
        isNonEmpty(name) &&
        isNonEmpty(status) &&
        origin !== "Select" &&
        hasRequiredVariants()
    );

    // ----- PAYLOAD BUILDERS (map UI -> backend) -----
    const nowIso = () => new Date().toISOString();

    const buildSimplePayload = ({ isDraft }) => ({
        sku: sku.trim(),
        name: name.trim(),
        brand: isNonEmpty(brand) ? brand.trim() : undefined,
        status: status,
        originCountry: origin !== "Select" ? origin : undefined, // ISO2
        isDraft: !!isDraft,
        publishedAt: isDraft ? null : nowIso(),
        // Backend simple fields (see Postman example)
        condition,
        weight: isNonEmpty(weightMain) ? Number(weightMain) : undefined,
        weightUnit,
        length: isNonEmpty(dimL) ? Number(dimL) : undefined,
        width: isNonEmpty(dimW) ? Number(dimW) : undefined,
        height: isNonEmpty(dimH) ? Number(dimH) : undefined,
        dimensionUnit: dimUnit,
        ...(isDraft
            ? {}
            : {
                retailPrice: Number(retailPrice),
                retailCurrency: CURRENCY,
                originalPrice: Number(sellingPrice),
                originalCurrency: CURRENCY,
            }),
        variants: [], // keep empty if no variants
    });

    const buildVariantPayload = ({ isDraft }) => {
        const mappedVariants = variants.map((v) => {
            const priceRow = variantPrices[v.id] || {};
            return {
                sku: (v.sku || "").trim(),
                sizeId: null, // if you later wire real size IDs, fill here
                sizeText: v.sizeText || v.sizeCode || "",
                barcode: isNonEmpty(v.barcode) ? v.barcode.trim() : undefined,
                status,
                condition,
                weight: Number(v.weight),
                weightUnit: v.weightUnit || weightUnit,
                length: Number(v.length),
                width: Number(v.width),
                height: Number(v.height),
                dimensionUnit: v.unit || dimUnit,
                ...(isDraft
                    ? {}
                    : {
                        retailPrice: Number(priceRow.retail),
                        retailCurrency: CURRENCY,
                        originalPrice: Number(priceRow.original),
                        originalCurrency: CURRENCY,
                    }),
                attributes: {}, // reserved
            };
        });

        return {
            sku: sku.trim(),
            name: name.trim(),
            brand: isNonEmpty(brand) ? brand.trim() : undefined,
            status,
            originCountry: origin !== "Select" ? origin : undefined,
            isDraft: !!isDraft,
            publishedAt: isDraft ? null : nowIso(),
            variants: mappedVariants,
        };
    };

    const handleSave = async (mode = "single", { isDraft = false } = {}) => {
        const payload = variantEnabled
            ? buildVariantPayload({ isDraft })
            : buildSimplePayload({ isDraft });

        try {
            if (!edit) {
                await createProductMut(payload);
                toast.success(isDraft ? "Draft saved" : "Product created");
            } else {
                // 1) always patch parent-level fields first
                const parentPayload = {
                    // Minimal safe parent fields (see Postman: name, brand, status, isDraft)
                    name: payload.name,
                    sku: payload.sku,
                    brand: payload.brand,
                    status: payload.status,
                    isDraft: !!isDraft,
                    // optional: you can pass originCountry if backend supports in PATCH parent:
                    originCountry: payload.originCountry,
                };
                await updateParent({ productId, payload: parentPayload });

                // 2) if variants enabled, patch each row separately
                if (variantEnabled && Array.isArray(variants) && variants.length) {
                    for (const v of variants) {
                        const row = variantPrices[v.id] || {};
                        const variantPayload = {
                            // fields the backend PATCH supports for variants (see Postman):
                            barcode: v.barcode || undefined,
                            status: v.active ? "active" : "inactive",
                            isDraft: !!isDraft,
                            condition,
                            retailPrice: row.retail != null && row.retail !== "" ? Number(row.retail) : undefined,
                            originalPrice: row.original != null && row.original !== "" ? Number(row.original) : undefined,
                            weight: v.weight != null && v.weight !== "" ? Number(v.weight) : undefined,
                            weightUnit: v.weightUnit || undefined,
                            length: v.length != null && v.length !== "" ? Number(v.length) : undefined,
                            width: v.width != null && v.width !== "" ? Number(v.width) : undefined,
                            height: v.height != null && v.height !== "" ? Number(v.height) : undefined,
                            dimensionUnit: v.unit || undefined,
                        };
                        await updateVariant({ productId, variantId: v.id, payload: variantPayload });
                    }
                }

                toast.success(isDraft ? "Draft updated" : "Product updated");
            }

            if (!edit && mode === "again" && !isDraft) {
                // Save & Add Another: keep modal open, reset lightweight
                setSavedProducts((prev) => [...prev, payload]);
                // reset core fields for next quick entry
                setSku("");
                setBarcode("");
                setName("");
                setBrand("");
                setWeightMain("");
                setWeightSub("");
                setDimL("");
                setDimW("");
                setDimH("");
                setVariantEnabled(false);
                setVariants([]);
                setImages([]);
                setSupplier(suppliers[0]);
                setPurchasingPrice("");
                setRetailPrice("");
                setSellingPrice("");
                setVariantPrices({});
                onSave?.(); // refresh table
                setTimeout(() => skuRef.current?.focus(), 0);
            } else {
                // Single save OR draft: close
                onSave?.(); // refresh table
                resetFormToDefaults();
                onClose?.();
            }
        } catch (e) {
            toast.error(e?.response?.data?.message || e?.message || "Failed to save");
        }
    };

    const card = "rounded-2xl border border-gray-200 bg-white shadow-sm";
    const input =
        "h-8 w-full rounded-lg border border-gray-300 bg-white px-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
    const label = "text-[12px] text-gray-600";
    const primaryBtn =
        "inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[#ffd026] text-blue-700 text-sm font-bold hover:brightness-95 disabled:opacity-50";
    const ghostBtn =
        "inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100";
    const outlineBtn =
        "inline-flex items-center justify-center h-9 px-3 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50";

    if (!open) return null;

    return (
        <Transition appear show={open} as={Fragment}>
            <Dialog
                as="div"
                className="relative z-[70]"
                onClose={() => {
                    resetFormToDefaults();
                    onClose?.();
                }}
            >
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

                <div className="fixed inset-0">
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
                            <DialogPanel className="w-full max-w-[1100px] max-h-[90vh] rounded-xl bg-[#f6f7fb] border border-gray-200 shadow-2xl flex flex-col">
                                {/* Header */}
                                <div className="flex items-center justify-between bg-white px-4 py-3 border-b rounded-t-xl border-gray-200 ">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500">Product</span>
                                        <span className="text-gray-400">›</span>
                                        <span className="font-medium text-gray-800">
                                            {edit
                                                ? (variantEnabled ? "Edit Product (Parent + Variants)" : "Edit Product")
                                                : (variantEnabled ? "Create Product (Parent + Variants)" : "Create Product")}
                                        </span>
                                    </div>
                                </div>

                                {/* Scrollable Body */}
                                <div className="px-4 pt-3 pb-4 overflow-y-auto">

                                    {/* Section: Product Info */}
                                    <div className={`${card}`}>
                                        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
                                            <div className="flex items-center  ">
                                                <span>
                                                    <Package size={16} className="text-amber-700 p-1 h-7 w-7 rounded-md border border-[#FCD33F]/70 bg-[#FFF9E5]" />
                                                </span>
                                                <h3 className="px-2 text-sm font-semibold text-gray-900">Product Info</h3>
                                            </div>

                                            <div className="flex items-center mx- gap-3">
                                                <span className="text-[12px] text-gray-600">Enable variants</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setVariantEnabled((v) => !v)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${variantEnabled ? "bg-amber-500" : "bg-gray-300"
                                                        }`}
                                                    title="Toggle product variants"
                                                >
                                                    <span
                                                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${variantEnabled ? "translate-x-6" : "translate-x-1"
                                                            }`}
                                                    />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-4">
                                            <div className="grid grid-cols-12 gap-3">
                                                <Field
                                                    className="col-span-12 md:col-span-6"
                                                    label={variantEnabled ? "Parent Product SKU *" : "Stock SKU *"}
                                                >
                                                    <input
                                                        ref={skuRef}
                                                        className={`${input} ${err("sku") ? "border-red-400 ring-1 ring-red-200" : ""}`}
                                                        placeholder="Enter"
                                                        value={sku}
                                                        onChange={(e) => setSku(e.target.value)}
                                                    />
                                                </Field>

                                                <div className="col-span-12 md:col-span-6 grid grid-cols-12 items-end">
                                                    <Field className="col-span-3 relative overflow-visible" label="Barcode Type">
                                                        <SelectCompact
                                                            value={barcodeType}
                                                            onChange={setBarcodeType}
                                                            options={barcodeTypes}
                                                            buttonClassName="rounded-r-none border-r"
                                                        />
                                                    </Field>
                                                    <Field className="col-span-9" label="Barcode (Optional)">
                                                        <input
                                                            className={`${input} rounded-l-none border-l-0`}
                                                            placeholder="Enter"
                                                            value={barcode}
                                                            onChange={(e) => setBarcode(e.target.value)}
                                                        />
                                                    </Field>
                                                </div>

                                                <Field className="col-span-12" label="Product Name *">
                                                    <input
                                                        className={`${input} ${err("name") ? "border-red-400 ring-1 ring-red-200" : ""}`}
                                                        placeholder="Enter"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                    />
                                                </Field>

                                                <div className="col-span-12 md:col-span-6">
                                                    <label className={label}>Condition *</label>
                                                    <SelectCompact
                                                        value={condition}
                                                        onChange={setCondition}
                                                        options={(enums?.ProductCondition || ["NEW", "USED", "RECONDITIONED"]).map(c => ({ value: c, label: labelize(c) }))}
                                                    />
                                                </div>
                                                <Field className="col-span-12 md:col-span-6" label="Brand (Optional)">
                                                    <input
                                                        className={input}
                                                        placeholder="Enter"
                                                        value={brand}
                                                        onChange={(e) => setBrand(e.target.value)}
                                                    />
                                                </Field>

                                                <div className="col-span-12 md:col-span-6">
                                                    <label className={label}>Status *</label>
                                                    <SelectCompact
                                                        value={status}
                                                        onChange={setStatus}
                                                        options={(enums?.ProductStatus || ["active", "inactive", "archived"]).map(s => ({ value: s, label: labelize(s) }))}
                                                    />
                                                </div>
                                                <div className="col-span-12 md:col-span-6 md:max-w-[240px]">
                                                    <label className={label}>Place of origin *</label>
                                                    <SelectCompact
                                                        value={origin}
                                                        onChange={(v) => { setOrigin(v); if (missing["origin"]) setMissing(p => { const n = { ...p }; delete n["origin"]; return n; }); }}
                                                        options={origins}
                                                        disabled={originLoading}
                                                        buttonClassName={`h-8 text-[12px] px-2 ${err("origin") ? "ring-1 ring-red-200 border-red-400" : ""}`}
                                                    />
                                                    {originLoading && (
                                                        <p className="mt-1 text-[11px] text-gray-500">Loading countries…</p>
                                                    )}
                                                </div>


                                                {!variantEnabled && (
                                                    <div className="col-span-12 md:col-span-6 ">
                                                        <label className={label}>Weight</label>
                                                        <div className="grid grid-cols-12">
                                                            <input
                                                                className={`${input} col-span-6 ${err("weightMain") ? "border-red-400 ring-1 ring-red-200" : ""} rounded-r-none border-r`}
                                                                placeholder="Enter"
                                                                value={weightMain}
                                                                onChange={(e) => setWeightMain(e.target.value)}
                                                            />
                                                            <div className="col-span-2">
                                                                <SelectCompact
                                                                    value={weightUnit}
                                                                    onChange={setWeightUnit}
                                                                    options={(weightUnits || []).map(u => ({ value: u, label: u }))}
                                                                    buttonClassName="rounded-l-none border-l-0"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {!variantEnabled && (
                                                    <div className="col-span-12 md:col-span-6">
                                                        <label className={label}>Dimension</label>
                                                        <div className="grid grid-cols-12 gap-2">
                                                            <input
                                                                className={`${input} ${err("dimL") ? "border-red-400 ring-1 ring-red-200" : ""} col-span-3 mx-2`}
                                                                placeholder="Length"
                                                                value={dimL}
                                                                onChange={(e) => setDimL(e.target.value)}
                                                            />
                                                            <input
                                                                className={`${input} ${err("dimW") ? "border-red-400 ring-1 ring-red-200" : ""} col-span-3 mx-2`}
                                                                placeholder="Width"
                                                                value={dimW}
                                                                onChange={(e) => setDimW(e.target.value)}
                                                            />
                                                            <input
                                                                className={`${input} ${err("dimH") ? "border-red-400 ring-1 ring-red-200" : ""} col-span-3 mx-2 rounded-r-none`}
                                                                placeholder="Height"
                                                                value={dimH}
                                                                onChange={(e) => setDimH(e.target.value)}
                                                            />
                                                            <div className="col-span-3">
                                                                <SelectCompact
                                                                    value={dimUnit}
                                                                    onChange={setDimUnit}
                                                                    options={(dimUnits || []).map(u => ({ value: u, label: u }))}
                                                                    buttonClassName="rounded-l-none border-l-0"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="col-span-12">
                                                    <label className={label}>Tag (Optional)</label>
                                                    <SelectCompact value={tag} onChange={setTag} options={tags} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Variants Section - keeping original code */}
                                    <div className={`${card} mt-3`}>
                                        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#FCD33F]/70 bg-[#FFF9E5]">
                                                <svg width="16" height="16" viewBox="0 0 24 24" className="text-amber-700">
                                                    <path fill="currentColor" d="M3 5h18v2H3zM3 11h18v2H3zM3 17h18v2H3z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-sm font-semibold text-gray-900">Variants</h3>
                                        </div>

                                        <div className="p-4 space-y-3">
                                            {!variantEnabled ? (
                                                <p className="text-[13px] text-gray-600">
                                                    Keep this off for a single product. Turn it on in the header to create size variants.
                                                </p>
                                            ) : (
                                                <>
                                                    <div className="rounded-xl border border-gray-200 overflow-visible">
                                                        <div className="grid grid-cols-[180px_100px_100px_150px_80px_80px_80px_80px_68px_87px] gap-px text-[12px] font-medium text-gray-700 border-b border-gray-200 rounded-xl">
                                                            <div className="bg-gray-50 px-2 py-2 text-center rounded-tl-xl">Size</div>
                                                            <div className="bg-gray-50 px-2 py-2 text-center">Variant SKU *</div>
                                                            <div className="bg-gray-50 px-2 py-2 text-center">Barcode</div>
                                                            <div className="bg-gray-50 px-2 py-2 text-center">Weight</div>
                                                            <div className="bg-gray-50 px-2 py-2 text-center">Length</div>
                                                            <div className="bg-gray-50 px-2 py-2 text-center">Width</div>
                                                            <div className="bg-gray-50 px-2 py-2 text-center">Height</div>
                                                            <div className="bg-gray-50 px-2 py-2 text-center">Unit</div>
                                                            <div className="bg-gray-50 px-2 py-2 text-center">Active</div>
                                                            <div className="bg-gray-50 px-2 py-2 text-center rounded-tr-xl">Actions</div>
                                                        </div>

                                                        {variants.length === 0 ? (
                                                            <div className="p-3 text-[13px] text-gray-600 flex items-center justify-center">
                                                                No variants yet — use "Add Variant Row" below.
                                                            </div>
                                                        ) : (
                                                            <div className="divide-y divide-gray-100">
                                                                {variants.map((v, idx) => (
                                                                    <div
                                                                        key={v.id}
                                                                        className="grid grid-cols-[180px_100px_100px_150px_80px_80px_80px_80px_68px_87px] gap-px bg-gray-100"
                                                                    >
                                                                        <div className="bg-white px-2 py-1.5 relative overflow-visible">
                                                                            <SelectCompact
                                                                                value={
                                                                                    sizes.find((s) => s.code === v.sizeCode)?.text ||
                                                                                    v.sizeText ||
                                                                                    "—"
                                                                                }
                                                                                onChange={(val) => {
                                                                                    if (val === ADD_SIZE_SENTINEL) {
                                                                                        setSizeModalOpen(true);
                                                                                        return;
                                                                                    }
                                                                                    const found =
                                                                                        sizes.find((s) => s.text === val || s.code === val) ||
                                                                                        { code: "", text: "—" };
                                                                                    const next = {
                                                                                        sizeCode: found.code,
                                                                                        sizeText: found.text,
                                                                                    };
                                                                                    if (v.autoSku) {
                                                                                        next.sku = computeAutoSku(sku, { sizeCode: found.code }, idx);
                                                                                    }
                                                                                    patchVariant(v.id, next);
                                                                                }}
                                                                                options={[...sizes.map((s) => s.text), ADD_SIZE_SENTINEL]}
                                                                                renderOption={(opt) =>
                                                                                    opt === ADD_SIZE_SENTINEL ? (
                                                                                        <span className="flex items-center gap-2 text-amber-700">
                                                                                            <Plus size={14} />
                                                                                            Add new size…
                                                                                        </span>
                                                                                    ) : (
                                                                                        opt
                                                                                    )
                                                                                }
                                                                            />
                                                                        </div>

                                                                        <div className="bg-white px-2 py-1.5 col-span-1">
                                                                            <input
                                                                                className={`${input} ${err(`v:${v.id}:sku`) ? "border-red-400 ring-1 ring-red-200" : ""}`}
                                                                                placeholder="e.g., 123-XL"
                                                                                value={v.sku}
                                                                                onChange={(e) => patchVariant(v.id, { sku: e.target.value, autoSku: false })}
                                                                            />
                                                                        </div>

                                                                        <div className="bg-white px-2 py-1.5">
                                                                            <input
                                                                                className={input}
                                                                                placeholder="Optional"
                                                                                value={v.barcode}
                                                                                onChange={(e) => patchVariant(v.id, { barcode: e.target.value })}
                                                                            />
                                                                        </div>

                                                                        <div className="bg-white px-2 py-1.5">
                                                                            <div className="grid grid-cols-12">
                                                                                <input
                                                                                    className={`${input} col-span-6 ${err(`v:${v.id}:weight`) ? "border-red-400 ring-1 ring-red-200" : ""} rounded-r-none border-r`}
                                                                                    placeholder="Weight"
                                                                                    value={v.weight}
                                                                                    onChange={(e) => patchVariant(v.id, { weight: e.target.value })}
                                                                                />
                                                                                <div className="col-span-5 relative overflow-visible">
                                                                                    <SelectCompact
                                                                                        value={v.weightUnit || weightUnit}
                                                                                        onChange={(val) => patchVariant(v.id, { weightUnit: val })}
                                                                                        options={(weightUnits || []).map(u => ({ value: u, label: u }))}
                                                                                        buttonClassName="rounded-l-none border-l-0"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="bg-white px-2 py-1.5">
                                                                            <input
                                                                                className={`${input} ${err(`v:${v.id}:length`) ? "border-red-400 ring-1 ring-red-200" : ""}`}
                                                                                placeholder="Length"
                                                                                value={v.length}
                                                                                onChange={(e) => patchVariant(v.id, { length: e.target.value })}
                                                                            />
                                                                        </div>
                                                                        <div className="bg-white px-2 py-1.5">
                                                                            <input
                                                                                className={`${input} ${err(`v:${v.id}:width`) ? "border-red-400 ring-1 ring-red-200" : ""}`}
                                                                                placeholder="Width"
                                                                                value={v.width}
                                                                                onChange={(e) => patchVariant(v.id, { width: e.target.value })}
                                                                            />
                                                                        </div>
                                                                        <div className="bg-white px-2 py-1.5">
                                                                            <input
                                                                                className={`${input} ${err(`v:${v.id}:height`) ? "border-red-400 ring-1 ring-red-200" : ""}`}
                                                                                placeholder="Height"
                                                                                value={v.height}
                                                                                onChange={(e) => patchVariant(v.id, { height: e.target.value })}
                                                                            />
                                                                        </div>

                                                                        <div className="bg-white px-2 py-1.5 relative overflow-visible">
                                                                            <SelectCompact
                                                                                value={v.unit || dimUnit}
                                                                                onChange={(val) => patchVariant(v.id, { unit: val })}
                                                                                options={(dimUnits || []).map(u => ({ value: u, label: u }))}
                                                                            />
                                                                        </div>

                                                                        <div className="bg-white px-2 py-1.5 flex items-center justify-center">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => patchVariant(v.id, { active: !v.active })}
                                                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${v.active ? "bg-amber-500" : "bg-gray-300"
                                                                                    }`}
                                                                                title="Active"
                                                                            >
                                                                                <span
                                                                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${v.active ? "translate-x-6" : "translate-x-1"
                                                                                        }`}
                                                                                />
                                                                            </button>
                                                                        </div>

                                                                        <div className="bg-white px-2 py-1.5 flex items-center justify-center">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => deleteVariant(v.id)}
                                                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                                                                                title="Delete variant"
                                                                            >
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                                        <button type="button" className={outlineBtn} onClick={addVariantAdHoc}>
                                                            Add Variant Row
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* NEW: Supplier */}
                                    {/* <div className={`${card} mt-3`}>
                                        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#FCD33F]/70 bg-[#FFF9E5]">
                                                <Truck size={16} className="text-amber-700" />
                                            </div>
                                            <h3 className="text-sm font-semibold text-gray-900">Supplier</h3>
                                        </div>

                                        <div className="p-4">
                                            <div className="grid grid-cols-12 gap-3">
                                                <div className="col-span-12 md:col-span-6">
                                                    <label className={label}>Supplier</label>
                                                    <SelectCompact value={supplier} onChange={setSupplier} options={suppliers} />
                                                </div>
                                                <Field className="col-span-12 md:col-span-6" label="Purchasing Price">
                                                    <div className="grid grid-cols-12">
                                                        <input
                                                            className={`${input} col-span-9 rounded-r-none border-r`}
                                                            placeholder="e.g., 250.00"
                                                            value={purchasingPrice}
                                                            onChange={(e) => setPurchasingPrice(e.target.value)}
                                                        />
                                                        <div className="col-span-3">
                                                            <div className="h-8 w-full rounded-r-lg border border-gray-300 bg-gray-50 text-[13px] text-gray-700 flex items-center justify-center select-none">
                                                                {CURRENCY}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Field>
                                            </div>
                                        </div>
                                    </div> */}

                                    {/* NEW: Pricing */}
                                    <div className={`${card} mt-3`}>
                                        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#FCD33F]/70 bg-[#FFF9E5]">
                                                <DollarSign size={16} className="text-amber-700" />
                                            </div>
                                            <h3 className="text-sm font-semibold text-gray-900">Pricing</h3>
                                        </div>

                                        <div className="p-4">
                                            {!variantEnabled ? (
                                                <div className="grid grid-cols-12 gap-3">
                                                    <Field className="col-span-12 md:col-span-6" label="Retail Price">
                                                        <div className="grid grid-cols-12">
                                                            <input
                                                                className={`${input} col-span-9 ${err("retailPrice") ? "border-red-400 ring-1 ring-red-200" : ""} rounded-r-none border-r`}
                                                                placeholder="e.g., 299.00"
                                                                value={retailPrice}
                                                                onChange={(e) => setRetailPrice(e.target.value)}
                                                            />
                                                            <div className="col-span-3">
                                                                <div className="h-8 w-full rounded-r-lg border border-gray-300 bg-gray-50 text-[13px] text-gray-700 flex items-center justify-center select-none">
                                                                    {CURRENCY}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Field>

                                                    <Field className="col-span-12 md:col-span-6" label="Selling Price">
                                                        <div className="grid grid-cols-12">
                                                            <input
                                                                className={`${input} col-span-9 ${err("sellingPrice") ? "border-red-400 ring-1 ring-red-200" : ""} rounded-r-none border-r`}
                                                                placeholder="e.g., 279.00"
                                                                value={sellingPrice}
                                                                onChange={(e) => setSellingPrice(e.target.value)}
                                                            />
                                                            <div className="col-span-3">
                                                                <div className="h-8 w-full rounded-r-lg border border-gray-300 bg-gray-50 text-[13px] text-gray-700 flex items-center justify-center select-none">
                                                                    {CURRENCY}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Field>
                                                </div>
                                            ) : (
                                                // --- per-variant pricing table ---
                                                <div className="rounded-xl border border-gray-200 overflow-hidden">
                                                    <div className="grid grid-cols-[1fr_160px_160px_90px] text-[12px] font-medium text-gray-700">
                                                        <div className="bg-gray-50 px-3 py-2">Variant SKU</div>
                                                        <div className="bg-gray-50 px-3 py-2">Retail Price</div>
                                                        <div className="bg-gray-50 px-3 py-2">Original Price</div>
                                                        <div className="bg-gray-50 px-3 py-2 text-center">Currency</div>
                                                    </div>

                                                    {variants.length === 0 ? (
                                                        <div className="p-3 text-[13px] text-gray-600">
                                                            No variants yet — add rows above to set pricing.
                                                        </div>
                                                    ) : (
                                                        <div className="divide-y divide-gray-100">
                                                            {variants.map((v) => {
                                                                const row = variantPrices[v.id] || { retail: "", original: "" };
                                                                return (
                                                                    <div
                                                                        key={v.id}
                                                                        className="grid grid-cols-[1fr_160px_160px_90px] bg-white"
                                                                    >
                                                                        <div className="px-5 py-2 font-mono font-bold text-[14px] text-gray-800 truncate flex items-center">
                                                                            {v.sku || "(no-sku)"}
                                                                        </div>

                                                                        <div className="px-3 py-2">
                                                                            <input
                                                                                className={`${input} ${err("v:" + v.id + ":retail") ? "border-red-400 ring-1 ring-red-200" : ""}`}
                                                                                placeholder="e.g., 299.00"
                                                                                value={row.retail}
                                                                                onChange={(e) =>
                                                                                    setVariantPrices((prev) => ({
                                                                                        ...prev,
                                                                                        [v.id]: { ...(prev[v.id] || {}), retail: e.target.value },
                                                                                    }))
                                                                                }
                                                                            />
                                                                        </div>

                                                                        <div className="px-3 py-2">
                                                                            <input
                                                                                className={`${input} ${err("v:" + v.id + ":original") ? "border-red-400 ring-1 ring-red-200" : ""}`}
                                                                                placeholder="e.g., 349.00"
                                                                                value={row.original}
                                                                                onChange={(e) =>
                                                                                    setVariantPrices((prev) => ({
                                                                                        ...prev,
                                                                                        [v.id]: { ...(prev[v.id] || {}), original: e.target.value },
                                                                                    }))
                                                                                }
                                                                            />
                                                                        </div>

                                                                        <div className="px-3 py-2 flex items-center justify-center text-[12px] text-gray-700 bg-gray-50">
                                                                            {CURRENCY}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Upload Images */}
                                    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-gray-900">Images</span>
                                            <div className="text-[12px] text-gray-500">
                                                {images.length ? `${images.length} selected` : "No files selected"}
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-amber-300 bg-[#FFF9E5] text-amber-800 text-sm font-semibold hover:bg-amber-50 hover:border-amber-400 transition"
                                                onClick={() => fileInputRef.current?.click()}>
                                                <Upload size={16} />
                                                Upload Images
                                            </button>
                                            <p className="mt-2 text-[12px] leading-5 text-gray-600"> <span className="block font-medium text-gray-700">Note:</span> The image format must be JPG, JPEG, PNG, and must not exceed 5MB. </p>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={(e) => setImages(Array.from(e.target.files || []))}
                                            />
                                        </div>
                                    </div>

                                    {/* Saved Products Preview */}
                                    {savedProducts.length > 0 && (
                                        <div className="mt-3 rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                                            <div className="flex items-center justify-between px-4 py-3 border-b border-green-200 bg-white/50">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-md border border-green-300 bg-green-100">
                                                        <Check size={16} className="text-green-700" />
                                                    </div>
                                                    <h3 className="text-sm font-semibold text-green-800">
                                                        Products Added ({savedProducts.length})
                                                    </h3>
                                                </div>
                                                <button
                                                    onClick={() => setSavedProducts([])}
                                                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                                                >
                                                    Clear All
                                                </button>
                                            </div>

                                            <div className="p-3 space-y-2">
                                                {savedProducts.map((product, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="bg-white rounded-lg border border-green-200 p-3 hover:shadow-sm transition-shadow"
                                                    >
                                                        <div className="grid grid-cols-12 gap-3 text-[13px]">
                                                            <div className="col-span-1 flex items-center">
                                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                                                    {idx + 1}
                                                                </span>
                                                            </div>

                                                            <div className="col-span-2">
                                                                <p className="text-gray-500 text-xs px-2">SKU</p>
                                                                <p className="font-semibold text-gray-900 truncate">{product.sku}</p>
                                                            </div>

                                                            <div className="col-span-3">
                                                                <p className="text-gray-500 text-xs px-3">Name</p>
                                                                <p className="font-medium text-gray-900 truncate">{product.name}</p>
                                                            </div>

                                                            <div className="col-span-2">
                                                                <p className="text-gray-500 text-xs px-3">Status</p>
                                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${product.status === 'Active' ? 'bg-green-100 text-green-700' :
                                                                    product.status === 'Inactive' ? 'bg-gray-100 text-gray-700' :
                                                                        'bg-orange-100 text-orange-700'
                                                                    }`}>
                                                                    {product.status.toUpperCase()}
                                                                </span>
                                                            </div>

                                                            <div className="col-span-2">
                                                                <p className="text-gray-500 text-xs px-2">Type</p>
                                                                <p className="font-medium text-gray-700">
                                                                    {product.variantEnabled ? 'Parent' : 'Simple'}
                                                                </p>
                                                            </div>

                                                            <div className="col-span-2">
                                                                <p className="text-gray-500 text-xs">Variants</p>
                                                                <p className="font-medium text-gray-700">
                                                                    {product.variantEnabled ? product.variants.length : 'N/A'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {product.variantEnabled && product.variants.length > 0 && (
                                                            <div className="mt-2 pt-2 border-t border-green-100">
                                                                <p className="text-xs text-gray-500 mb-1">Variant SKUs:</p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {product.variants.map((v, vIdx) => (
                                                                        <span
                                                                            key={vIdx}
                                                                            className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-mono"
                                                                        >
                                                                            {v.sku}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="border-t border-gray-200 bg-white rounded-b-xl px-4 py-3 flex items-center justify-end gap-2">
                                    <button
                                        className={ghostBtn}
                                        onClick={() => {
                                            resetFormToDefaults();
                                            onClose?.();
                                        }}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        className={outlineBtn}
                                        disabled={saving}
                                        onClick={() => {
                                            const m = collectMissing({ isDraft: true });
                                            setMissing(m);
                                            if (Object.keys(m).length) {
                                                toast.error("Please fill required fields for Draft.");
                                                return;
                                            }
                                            handleSave("single", { isDraft: true });
                                        }}
                                    >
                                        Save to Draft
                                    </button>

                                    <button
                                        className={primaryBtn}
                                        disabled={saving}
                                        onClick={() => {
                                            const m = collectMissing({ isDraft: false });
                                            setMissing(m);
                                            if (Object.keys(m).length) {
                                                toast.error("Please complete required fields.");
                                                return;
                                            }
                                            handleSave("again");
                                        }}
                                    >
                                        Save & Add Another
                                    </button>

                                    <button
                                        className={primaryBtn}
                                        disabled={saving}
                                        onClick={() => {
                                            const m = collectMissing({ isDraft: false });
                                            setMissing(m);
                                            if (Object.keys(m).length) {
                                                toast.error("Please complete required fields.");
                                                return;
                                            }
                                            handleSave("single");
                                        }}
                                    >
                                        Save
                                    </button>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>

            {/* Add Size Modal */}
            <Transition appear show={sizeModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[80]" onClose={() => setSizeModalOpen(false)}>
                    <TransitionChild as={Fragment} enter="transition-opacity ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100" leave="transition-opacity ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-black/30" />
                    </TransitionChild>

                    <div className="fixed inset-0">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <TransitionChild
                                as={Fragment}
                                enter="transition ease-out duration-150"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="transition ease-in duration-100"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <DialogPanel className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
                                    <h3 className="text-base font-semibold text-gray-900 mb-2">Add New Size</h3>
                                    <p className="text-[13px] text-gray-600 mb-4">
                                        Create a size option to reuse across variants.
                                    </p>

                                    <div className="space-y-3">
                                        <div>
                                            <label className={label}>Size Code *</label>
                                            <input
                                                className={input}
                                                placeholder="e.g., XXL"
                                                value={newSizeCode}
                                                onChange={(e) => setNewSizeCode(e.target.value.toUpperCase())}
                                            />
                                        </div>
                                        <div>
                                            <label className={label}>Size Label *</label>
                                            <input
                                                className={input}
                                                placeholder="e.g., 2X-Large"
                                                value={newSizeText}
                                                onChange={(e) => setNewSizeText(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-end gap-2">
                                        <button className={ghostBtn} onClick={() => setSizeModalOpen(false)}>
                                            Cancel
                                        </button>
                                        <button
                                            className={primaryBtn}
                                            disabled={!newSizeCode.trim() || !newSizeText.trim()}
                                            onClick={() => {
                                                const code = newSizeCode.trim();
                                                const text = newSizeText.trim();
                                                if (!code || !text) return;
                                                setSizes((prev) => {
                                                    const exists = prev.some((s) => s.code.toUpperCase() === code.toUpperCase());
                                                    const next = exists ? prev : [...prev, { code, text }];
                                                    return [
                                                        next.find((s) => s.code === "") || { code: "", text: "—" },
                                                        ...next.filter((s) => s.code !== ""),
                                                    ];
                                                });
                                                setNewSizeCode("");
                                                setNewSizeText("");
                                                setSizeModalOpen(false);
                                            }}
                                        >
                                            Add Size
                                        </button>
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </Transition >
    );
}

/* ---------- atoms ---------- */
function Field({ label, children, className = "" }) {
    return (
        <div className={className}>
            {label ? <label className="text-[12px] text-gray-600">{label}</label> : null}
            {children}
        </div>
    );
}

function SelectCompact({
    value,
    onChange,
    options,
    buttonClassName = "",
    renderOption,
    disabled = false,
}) {
    const list = Array.isArray(options) ? options : [];

    const getOptValue = (opt) =>
        typeof opt === "string" ? opt : (opt?.value ?? "");
    const getOptLabel = (opt) =>
        typeof opt === "string" ? opt : (opt?.label ?? getOptValue(opt));

    const currentLabel = (() => {
        if (value === "Select") return "Select";
        const found = list.find((opt) =>
            typeof opt === "string" ? opt === value : opt?.value === value
        );
        if (!found) return String(value ?? "");
        return getOptLabel(found);
    })();

    return (
        <Listbox value={value} onChange={onChange} disabled={disabled}>
            <div className="relative">
                <ListboxButton
                    className={`relative w-full h-8 rounded-lg border border-gray-300 bg-white pl-2 pr-7 text-left text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 ${disabled ? "opacity-60 cursor-not-allowed" : ""
                        } ${buttonClassName}`}
                >
                    <span className="block truncate">{currentLabel}</span>
                    <span className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center">
                        <ChevronDown size={16} className="text-gray-500" />
                    </span>
                </ListboxButton>

                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                >
                    <ListboxOptions className="absolute mb-1 z-[200] max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 text-[12px] shadow-lg focus:outline-none">
                        {list.map((opt) => {
                            const val = getOptValue(opt);
                            const lab = getOptLabel(opt);
                            return (
                                <ListboxOption
                                    key={String(val || lab)}
                                    value={val}
                                    className={({ active }) =>
                                        `cursor-pointer select-none px-2 py-1 ${active ? "bg-gray-100 text-gray-900" : "text-gray-800"
                                        }`
                                    }
                                >
                                    {({ selected }) => (
                                        <div className="flex items-center gap-2">
                                            {selected ? (
                                                <Check size={14} className="text-amber-700" />
                                            ) : (
                                                <span className="w-[14px]" />
                                            )}
                                            <span className="block truncate">
                                                {renderOption ? renderOption(opt) : lab}
                                            </span>
                                        </div>
                                    )}
                                </ListboxOption>
                            );
                        })}
                    </ListboxOptions>
                </Transition>
            </div>
        </Listbox>
    );
}



