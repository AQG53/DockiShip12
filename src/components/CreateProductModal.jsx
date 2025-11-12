import { Fragment, useMemo, useState, useEffect, useRef } from "react";
import { useAuthCheck } from "../hooks/useAuthCheck";
import { useProductMetaEnums, useCreateProduct, useGetProduct, useUpdateProductParent, useUpdateVariant, useAddVariant, useUploadProductImages } from "../hooks/useProducts";
import { useSuppliers } from "../hooks/useSuppliers";
import {
  useSearchMarketplaceChannels,
  useSearchMarketplaceProviders,
  useCreateMarketplaceChannel,
  useProductMarketplaceListings,
  useAddProductMarketplaceListing,
  useDeleteProductMarketplaceListing,
} from "../hooks/useProducts";

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
import { Check, ChevronDown, Package, Plus, Trash2, Truck, DollarSign, Upload, Loader2 } from "lucide-react";
import { deleteProductImage, linkSupplierProducts, unlinkSupplierProduct } from "../lib/api";
import { randomId } from "../lib/id";
import SelectSearchAdd from "./SelectSearchAdd";

const ADD_SIZE_SENTINEL = "__ADD_SIZE__";
const ADD_COLOR_SENTINEL = "__ADD_COLOR__";

export default function CreateProductModal({ open, onClose, onSave, edit = false, productId = null }) {
    const { mutateAsync: createProductMut, isPending: saving } = useCreateProduct();
    const { data: auth } = useAuthCheck({ refetchOnWindowFocus: false });
    const { data: productDetail, refetch: refetchProductDetail, isLoading: loadingProduct } = useGetProduct(edit && open ? productId : null, {
        refetchOnWindowFocus: false,
    });
    const { mutateAsync: updateParent, isPending: savingParent } = useUpdateProductParent();
    const { mutateAsync: updateVariant, isPending: savingVariant } = useUpdateVariant();
    const { mutateAsync: addVariant, isPending: addingVariant } = useAddVariant();
    const { mutateAsync: uploadImages, isPending: uploadingImages } = useUploadProductImages();

    const CURRENCY = auth?.tenant?.currency;

    const { data: enums } = useProductMetaEnums();

    // Editing guard: simple products cannot be converted to variants
    const isEditSimple = Boolean(edit && (productDetail?.kind === 'simple'));

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
    // Only allow kg/lb in the main unit selector (lowercase labels)
    const mainWeightOptions = useMemo(
        () => ([{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]),
        []
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
    // Suppliers list (for linking in edit mode)
    const { data: supplierList = [], isLoading: suppliersLoading } = useSuppliers({
        refetchOnWindowFocus: false,
    });
    const supplierOptions = useMemo(() => {
        const base = Array.isArray(supplierList) ? supplierList : [];
        return [
            "Select",
            ...base.map((s) => ({ value: s.id, label: s.companyName || s.id })),
        ];
    }, [supplierList]);

    // Sizes are now stateful so we can add new ones
    const [sizes, setSizes] = useState([
        { code: "", text: "—" },
        { code: "S", text: "Small" },
        { code: "M", text: "Medium" },
        { code: "L", text: "Large" },
        { code: "XL", text: "X-Large" },
    ]);
    // Colors are stateful too (simple list of labels; first entry is placeholder "—")
    const [colors, setColors] = useState(["—", "Red", "Blue", "Green"]);

    // --- variants/images state ---
    const [variantEnabled, setVariantEnabled] = useState(false);
    const [variants, setVariants] = useState([]);
    const [variantPrices, setVariantPrices] = useState({});
    const [images, setImages] = useState([]);
    const [variantImages, setVariantImages] = useState({}); // map: local variant id -> File[]
    const [imagePreviews, setImagePreviews] = useState([]);
    
    const fileInputRef = useRef(null);
    const variantInputsRef = useRef({});

    // --- saved products preview ---
    const [savedProducts, setSavedProducts] = useState([]);

    // Size modal state
    const [sizeModalOpen, setSizeModalOpen] = useState(false);
    const [newSizeCode, setNewSizeCode] = useState("");
    const [newSizeText, setNewSizeText] = useState("");
    const [sizeContext, setSizeContext] = useState(null); // null | { kind: 'simple' } | { kind: 'variant', id: string }
    // Color modal state
    const [colorModalOpen, setColorModalOpen] = useState(false);
    const [newColorText, setNewColorText] = useState("");
    const [colorContext, setColorContext] = useState(null); // null | { kind: 'simple' } | { kind: 'variant', id: string }

    const deriveSizeCode = (label) => {
        const s = String(label || '').trim();
        if (!s) return '';
        return s.toUpperCase().replace(/\s+/g, '');
    };

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
    // Default weight to lb when available, else first enum
    const [weightUnit, setWeightUnit] = useState(
        (enums?.WeightUnit || ["lb", "kg", "g"]).includes("lb") ? "lb" : (enums?.WeightUnit?.[0] || "lb")
    );
    const [weightSub, setWeightSub] = useState("");

    const [dimL, setDimL] = useState("");
    const [dimW, setDimW] = useState("");
    const [dimH, setDimH] = useState("");
    // Default dimensions to inch when available
    const [dimUnit, setDimUnit] = useState(
        (enums?.LengthUnit || ["inch", "cm", "mm"]).includes("inch") ? "inch" : (enums?.LengthUnit?.[0] || "inch")
    );

    const [tag, setTag] = useState(tags[0]);
    // Simple product-only attributes
    const [mainSizeText, setMainSizeText] = useState("");
    const [mainColorText, setMainColorText] = useState("");

    // --- new: supplier & pricing ---
    const [supplier, setSupplier] = useState("Select");
    const [linkingSupplier, setLinkingSupplier] = useState(false);
    const [linkSelect, setLinkSelect] = useState("Select");
    const [unlinkingSupplierId, setUnlinkingSupplierId] = useState(null);
    // Create-mode supplier rows: [{ supplierId, price }]
    const [supplierRows, setSupplierRows] = useState([{ supplierId: 'Select', price: '' }]);
    // Edit-mode pending link rows
    const [pendingLinks, setPendingLinks] = useState([{ supplierId: 'Select', price: '' }]);
    const selectedSupplierIds = useMemo(() => {
        const s = new Set();
        (supplierRows || []).forEach((r) => {
            if (r && r.supplierId && r.supplierId !== 'Select') s.add(r.supplierId);
        });
        return s;
    }, [supplierRows]);
    // Edit add row price
    const [addLinkPrice, setAddLinkPrice] = useState("");
    const [createLinkIds, setCreateLinkIds] = useState(new Set());
    const [purchasingPrice, setPurchasingPrice] = useState("");
    const [editLinkPrices, setEditLinkPrices] = useState({});
    const [editLinkSel, setEditLinkSel] = useState({});
    const [retailPrice, setRetailPrice] = useState("");
    const [sellingPrice, setSellingPrice] = useState("");

    const [missing, setMissing] = useState({});   // map: key -> human label

    const err = (key) => Boolean(missing[key]);   // convenience
    const labelizeErr = (key, fallback) => missing[key] || fallback;

    // UI-saving blocker to avoid double clicks and show overlay while full save flow runs
    const [savingUi, setSavingUi] = useState(false);

    // --- Marketplaces state ---
const [selectedProvider, setSelectedProvider] = useState("Select");
const [selectedChannelId, setSelectedChannelId] = useState(null);

// inline creation is now handled inside dropdowns via SelectSearchAdd

// listing form
  const [listingSku, setListingSku] = useState("");
  const [listingUnits, setListingUnits] = useState("");
  const [selectedVariantForListing, setSelectedVariantForListing] = useState("product");
  const [assign, setAssign] = useState("");

// UI: focus and hinting for provider→channel flow
const channelSelectRef = useRef(null);
const [providerIsCustom, setProviderIsCustom] = useState(false);

// effective product id in edit mode
const effectiveProductId = (productDetail?.id || productId) ?? null;

// Providers list (edit-only context)
const { data: providers = [], isLoading: providersLoading } =
  useSearchMarketplaceProviders({}, { enabled: !!(edit && open) });

// Channels for selected provider
const { data: allChannels = [], isLoading: channelsLoading, refetch: refetchChannels } =
  useSearchMarketplaceChannels(
    { productName: selectedProvider !== "Select" ? selectedProvider : undefined, page: 1, perPage: 200 },
    { enabled: !!(edit && open && selectedProvider !== "Select") }
  );

// Listings for this product
const {
  data: listings = [],
  isLoading: listingsLoading,
  refetch: refetchListings
} = useProductMarketplaceListings(effectiveProductId ?? undefined, {
  enabled: !!(edit && open && effectiveProductId)
});

// Mutations
const { mutateAsync: createChannel, isPending: creatingChannel } = useCreateMarketplaceChannel();
const { mutateAsync: addListing, isPending: addingListing } = useAddProductMarketplaceListing(effectiveProductId ?? "");
const { mutateAsync: deleteListing, isPending: deletingListing } = useDeleteProductMarketplaceListing(effectiveProductId ?? "");

// Derive providers and channels
const providerOptions = useMemo(() => {
  const arr = Array.isArray(providers) ? providers : [];
  return ["Select", ...arr.sort((a, b) => String(a).localeCompare(String(b)))];
}, [providers]);

const channelOptions = useMemo(() => {
  const arr = (allChannels || []).filter(c =>
    selectedProvider === "Select"
      ? true
      : String(c?.provider ?? c?.providerName ?? "") === selectedProvider
  );
  return arr
    .map(c => ({
      value: c.id ?? c.channelId ?? c._id,
      label: c.name ?? c.channelName ?? `Channel ${c.id ?? c.channelId ?? ""}`,
    }))
    .filter(o => o.value && o.label);
}, [allChannels, selectedProvider]);

// Track whether provider is custom (not in provider list)
useEffect(() => {
  const list = providerOptions.filter(p => p !== "Select");
  setProviderIsCustom(Boolean(selectedProvider && selectedProvider !== "Select" && !list.includes(selectedProvider)));
}, [selectedProvider, providerOptions]);


const findVariantLabel = (vid) => {
  if (!vid) return "—";
  const hit = variants.find(v => String(v.id) === String(vid));
  if (!hit) return String(vid);
  return hit.sku || hit.sizeText || hit.sizeCode || String(vid);
};

    // Build a flat list of missing fields for the current form
    // mode: { isDraft: boolean }
    function collectMissing({ isDraft }) {
        const m = {};

        // Draft = minimal required fields
        if (isDraft) {
            if (!isNonEmpty(name)) m["name"] = "Product Name";
            return m;
        }

        // Normal saves
        // Parent (common)
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

    // Helper: generate SKU from product name
    const makeSkuFromName = (s) => {
        const str = String(s || '').trim();
        const initials = str
            ? str.split(/\s+/).map(w => (w[0] || '').toUpperCase()).join('')
            : 'PRD';
        const digits = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
        return `${initials || 'PRD'}-${digits}`;
    };

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
        setMainSizeText("");
        setMainColorText("");

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
        setSupplier("Select");
        setPurchasingPrice("");
        setRetailPrice("");
        setSellingPrice("");

        // suppliers: clear any previous selections (create-mode + edit-mode drafts)
        setSupplierRows([{ supplierId: 'Select', price: '' }]);
        setPendingLinks([{ supplierId: 'Select', price: '' }]);

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

    // --- helpers to sync parent <-> variants ---
    const prevVariantEnabledRef = useRef(variantEnabled);

    function seedVariantsFromParent() {
      // create one variant row seeded from parent fields
      const localId = `local-${randomId()}`;
      const nextVariant = {
        id: localId,
        sizeCode: "",
        sizeText: "—",
        sku: computeAutoSku(sku, { sizeCode: "" }, 0),
        barcode: "",
        weight: isNonEmpty(weightMain) ? String(weightMain) : "",
        weightUnit: weightUnit,
        length: isNonEmpty(dimL) ? String(dimL) : "",
        width: isNonEmpty(dimW) ? String(dimW) : "",
        height: isNonEmpty(dimH) ? String(dimH) : "",
        unit: dimUnit,
        active: true,
        autoSku: true,
      };

      setVariants([nextVariant]);

      // seed prices into variantPrices if parent has them
      setVariantPrices((prev) => ({
        ...prev,
        [localId]: {
          retail: isNonEmpty(retailPrice) ? String(retailPrice) : "",
          original: isNonEmpty(sellingPrice) ? String(sellingPrice) : "",
        },
      }));
    }

    function copyParentIntoExistingVariants() {
      // push down parent fields only where variant fields are empty
      setVariants((prev) =>
        prev.map((v) => ({
          ...v,
          weight: isNonEmpty(v.weight) ? v.weight : (isNonEmpty(weightMain) ? String(weightMain) : v.weight),
          weightUnit: v.weightUnit || weightUnit,
          length: isNonEmpty(v.length) ? v.length : (isNonEmpty(dimL) ? String(dimL) : v.length),
          width: isNonEmpty(v.width) ? v.width : (isNonEmpty(dimW) ? String(dimW) : v.width),
          height: isNonEmpty(v.height) ? v.height : (isNonEmpty(dimH) ? String(dimH) : v.height),
          unit: v.unit || dimUnit,
        }))
      );

      // If variant has no prices, seed from parent
      setVariantPrices((prev) => {
        const next = { ...prev };
        variants.forEach((v) => {
          const row = next[v.id] || { retail: "", original: "" };
          if (!isNonEmpty(row.retail) && isNonEmpty(retailPrice)) row.retail = String(retailPrice);
          if (!isNonEmpty(row.original) && isNonEmpty(sellingPrice)) row.original = String(sellingPrice);
          next[v.id] = row;
        });
        return next;
      });
    }

    function pullFirstVariantIntoParent() {
      if (!variants || variants.length === 0) return;
      const first = variants[0];
      // copy measurements back to parent
      setWeightMain(isNonEmpty(first.weight) ? String(first.weight) : "");
      setWeightUnit(first.weightUnit || weightUnit);
      setDimL(isNonEmpty(first.length) ? String(first.length) : "");
      setDimW(isNonEmpty(first.width) ? String(first.width) : "");
      setDimH(isNonEmpty(first.height) ? String(first.height) : "");
      setDimUnit(first.unit || dimUnit);

      // copy pricing back from first variant if exists
      const row = variantPrices[first.id] || {};
      if (isNonEmpty(row.retail)) setRetailPrice(String(row.retail));
      if (isNonEmpty(row.original)) setSellingPrice(String(row.original));
    }

    const addVariantAdHoc = () => {
        setVariants((prev) => [
            ...prev,
            {
                // Use a local-only id to distinguish unsaved rows from server variants
                id: `local-${randomId()}`,
                sizeCode: "",
                sizeText: "—",
                colorText: "",
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


    const weightSubLabel = resolveSubUnit(weightUnit);

    // Helper: decompose numeric weight into main + sub based on unit
    const decomposeWeight = (val, unit) => {
        const n = Number(val);
        if (!Number.isFinite(n) || n < 0) return { main: "", sub: "" };
        if ((unit || '').toLowerCase() === 'kg') {
            const main = Math.floor(n);
            const sub = Math.round((n - main) * 1000);
            return { main: String(main), sub: String(sub) };
        }
        // default to lb → oz
        const main = Math.floor(n);
        const sub = Math.round((n - main) * 16);
        return { main: String(main), sub: String(sub) };
    };

    useEffect(() => {
        if (!variantEnabled) return;
        setVariants((prev) =>
            prev.map((v, i) => {
                if (!v.autoSku) return v;
                return { ...v, sku: computeAutoSku(sku, v, i) };
            })
        );
    }, [sku, variantEnabled]);

    // Build object URLs for selected images for preview
    useEffect(() => {
        const urls = (images || []).map((f) => ({ file: f, url: URL.createObjectURL(f) }));
        setImagePreviews(urls);
        return () => {
            try { urls.forEach(x => URL.revokeObjectURL(x.url)); } catch {}
        };
    }, [images]);

    // Force variants off when editing a simple product
    useEffect(() => {
        if (isEditSimple && variantEnabled) {
            setVariantEnabled(false);
        }
    }, [isEditSimple]);

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

    // Detect toggle transitions: seed on enable; pull back on disable
    useEffect(() => {
      const prev = prevVariantEnabledRef.current;
      if (!prev && variantEnabled) {
        // turned ON
        if (variants.length === 0) {
          seedVariantsFromParent();
        } else {
          // ensure existing variants have parent defaults for blanks
          copyParentIntoExistingVariants();
        }
      } else if (prev && !variantEnabled) {
        // turned OFF
        pullFirstVariantIntoParent();
      }
      prevVariantEnabledRef.current = variantEnabled;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [variantEnabled]);

    // While variants are enabled, when parent fields change, auto-fill missing fields in variants
    useEffect(() => {
      if (!variantEnabled || variants.length === 0) return;
      copyParentIntoExistingVariants();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weightMain, weightUnit, dimL, dimW, dimH, dimUnit, retailPrice, sellingPrice, variantEnabled]);

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
        const wu = productDetail.weightUnit || weightUnit;
        setWeightUnit(wu);
        if (productDetail.weight != null) {
            const parts = decomposeWeight(productDetail.weight, wu);
            setWeightMain(parts.main);
            setWeightSub(parts.sub);
        } else {
            setWeightMain("");
            setWeightSub("");
        }
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

        // simple-only attributes
        setMainSizeText(productDetail.sizeText || "");
        setMainColorText(productDetail.colorText || "");

        // supplier (no primary; linking managed below)
        setSupplier("Select");
        setPurchasingPrice(
          productDetail.lastPurchasePrice != null ? String(productDetail.lastPurchasePrice) : ""
        );

        // variants
        const arr = productDetail.ProductVariant || [];
        if (Array.isArray(arr) && arr.length > 0) {
            setVariantEnabled(arr.length > 0);
            // map into our local rows
            const rows = arr.map(v => {
                // Use size.code (not sizeId) for UI code; fall back to provided sizeText/name/code
                const code = v?.size?.code || "";
                const text = v?.sizeText || v?.size?.name || v?.size?.code || (code ? String(code) : "—");
                return {
                    id: v.id, // important for PATCH
                    sizeCode: String(code || ""),
                    sizeText: String(text || "—"),
                    colorText: v.colorText || "",
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
                };
            });
            setVariants(rows);

            // Ensure size options include any codes/names from server
            try {
                setSizes(prev => {
                    const base = Array.isArray(prev) ? prev : [];
                    const placeholder = base.find(s => s.code === "") || { code: "", text: "—" };
                    const rest = base.filter(s => s.code !== "");
                    const seenCodes = new Set(rest.map(s => s.code));
                    const seenTexts = new Set(rest.map(s => s.text));
                    const add = [];
                    rows.forEach(r => {
                        if (r.sizeCode) {
                            if (!seenCodes.has(r.sizeCode)) {
                                add.push({ code: r.sizeCode, text: r.sizeText || r.sizeCode });
                                seenCodes.add(r.sizeCode);
                                seenTexts.add(r.sizeText || r.sizeCode);
                            }
                        } else if (r.sizeText) {
                            // No code from server; add by text so it's selectable
                            if (!seenTexts.has(r.sizeText)) {
                                add.push({ code: r.sizeText, text: r.sizeText });
                                seenTexts.add(r.sizeText);
                            }
                        }
                    });
                    return [placeholder, ...rest, ...add];
                });
                // Ensure any colorText from server is present in our colors list
                setColors(prev => {
                    const base = Array.isArray(prev) && prev.length ? prev : ["—"];
                    const set = new Set(base);
                    const add = [];
                    rows.forEach(r => {
                        const c = (r.colorText || "").trim();
                        if (c && !set.has(c)) { set.add(c); add.push(c); }
                    });
                    return add.length ? [...base, ...add] : base;
                });
            } catch {}

            // per-variant pricing table state
            const priceMap = {};
            arr.forEach(v => {
                priceMap[v.id] = {
                    retail: v.retailPrice != null ? String(v.retailPrice) : "",
                    original: v.originalPrice != null ? String(v.originalPrice) : "",
                    purchase: v.lastPurchasePrice != null ? String(v.lastPurchasePrice) : "",
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
        // Required: * fields (Name, Condition, Status, Origin) + Pricing (Retail & Selling)
        return (
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

    const canSaveDraft = isNonEmpty(name);
    const canSaveNormal = !variantEnabled ? hasRequiredSimple() : (
        isNonEmpty(name) &&
        isNonEmpty(status) &&
        origin !== "Select" &&
        hasRequiredVariants()
    );

    // If user clicked "Save & Add Another" and hasn't started filling a new item yet,
    // allow closing without validation when pressing "Save" (acts as "Done").
    const isPristineNewEntry = () => !isNonEmpty(name) && variants.length === 0;

    // ----- PAYLOAD BUILDERS (map UI -> backend) -----
    const nowIso = () => new Date().toISOString();

    const buildSimplePayload = ({ isDraft }) => {
        const wm = Number(weightMain);
        const ws = Number(weightSub);
        let totalWeight = undefined;
        if (Number.isFinite(wm) || Number.isFinite(ws)) {
            if ((weightUnit || '').toLowerCase() === 'kg') {
                const main = Number.isFinite(wm) ? wm : 0;
                const sub = Number.isFinite(ws) ? ws / 1000 : 0;
                totalWeight = main + sub;
            } else {
                const main = Number.isFinite(wm) ? wm : 0;
                const sub = Number.isFinite(ws) ? ws / 16 : 0;
                totalWeight = main + sub;
            }
        }
        // Ensure SKU is present if name is given
        const finalSku = (isNonEmpty(sku) && sku) || (isNonEmpty(name) ? makeSkuFromName(name) : "");
        return ({
            sku: isNonEmpty(finalSku) ? finalSku.trim() : undefined,
            name: name.trim(),
            brand: isNonEmpty(brand) ? brand.trim() : undefined,
            status: status,
            originCountry: origin !== "Select" ? origin : undefined, // ISO2
            isDraft: !!isDraft,
            publishedAt: isDraft ? null : nowIso(),
            // Backend simple fields
            condition,
            weight: totalWeight,
            weightUnit,
            length: isNonEmpty(dimL) ? Number(dimL) : undefined,
            width: isNonEmpty(dimW) ? Number(dimW) : undefined,
            height: isNonEmpty(dimH) ? Number(dimH) : undefined,
            dimensionUnit: dimUnit,
            // simple-only attributes (applied to single default variant)
            sizeText: isNonEmpty(mainSizeText) ? mainSizeText.trim() : undefined,
            colorText: isNonEmpty(mainColorText) ? mainColorText.trim() : undefined,
            ...(isDraft
                ? {}
                : {
                    retailPrice: Number(retailPrice),
                    retailCurrency: CURRENCY,
                    originalPrice: Number(sellingPrice),
                    originalCurrency: CURRENCY,
                }),
            ...(purchasingPrice?.trim() ? {
                lastPurchasePrice: Number(purchasingPrice),
                lastPurchaseCurr: CURRENCY,
            } : {}),
            variants: [], // keep empty if no variants
        });
    };

    const buildVariantPayload = ({ isDraft }) => {
        const mappedVariants = variants.map((v) => {
            const priceRow = variantPrices[v.id] || {};
            return {
                sku: (v.sku || "").trim(),
                sizeId: null, // if you later wire real size IDs, fill here
                sizeText: v.sizeText || v.sizeCode || "",
                colorText: v.colorText || "",
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
                        lastPurchasePrice: priceRow.purchase != null && priceRow.purchase !== "" ? Number(priceRow.purchase) : undefined,
                        lastPurchaseCurr: CURRENCY,
                    }),
                attributes: {}, // reserved
            };
        });

        const finalSku = (isNonEmpty(sku) && sku) || (isNonEmpty(name) ? makeSkuFromName(name) : "");
        return {
            sku: isNonEmpty(finalSku) ? finalSku.trim() : undefined,
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
        if (savingUi) return;
        setSavingUi(true);
        const usingVariants = variantEnabled && !isEditSimple;
        const payload = usingVariants
            ? buildVariantPayload({ isDraft })
            : buildSimplePayload({ isDraft });

        try {
            let createdOrUpdated = null;
            if (!edit) {
                createdOrUpdated = await createProductMut(payload);
                toast.success(isDraft ? "Draft saved" : "Product created");
                // Link any selected suppliers after create with per-supplier price
                try {
                  const pid = createdOrUpdated?.id;
                  if (pid) {
                    const linked = new Set();
                    for (const row of supplierRows) {
                      const sid = row?.supplierId;
                      if (!sid || sid === 'Select' || linked.has(sid)) continue;
                      linked.add(sid);
                      const priceNum = row.price && row.price.trim() !== '' ? Number(row.price) : undefined;
                      await linkSupplierProducts(sid, [pid], { lastPurchasePrice: priceNum, currency: CURRENCY });
                    }
                  }
                } catch (e) {
                  console.error(e);
                  toast.error('Product created but failed to link some suppliers');
                }
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
                    // For simple product, pass size/color to sync single variant
                    sizeText: !usingVariants ? (isNonEmpty(mainSizeText) ? mainSizeText.trim() : undefined) : undefined,
                    colorText: !usingVariants ? (isNonEmpty(mainColorText) ? mainColorText.trim() : undefined) : undefined,
                    // per-supplier pricing handled via links
                };
                const effectiveProductId = productDetail?.id || productId;
                if (!effectiveProductId) throw new Error("Missing product id for update");
                await updateParent({ productId: effectiveProductId, payload: parentPayload });

                // If editing a simple product, also sync its single variant SKU
                if (isEditSimple && parentPayload.sku && productDetail?.variantId) {
                    try {
                        await updateVariant({ productId: effectiveProductId, variantId: productDetail.variantId, payload: { sku: parentPayload.sku } });
                    } catch (e) {
                        console.error(e);
                        toast.error('Failed to sync variant SKU');
                    }
                }

                // 2) if variants enabled, patch each row separately
                if (usingVariants && Array.isArray(variants) && variants.length) {
                    for (const v of variants) {
                        const row = variantPrices[v.id] || {};
                        const common = {
                            sku: (v.sku || "").trim(),
                            sizeText: v.sizeText || v.sizeCode || "",
                            colorText: v.colorText || "",
                            barcode: v.barcode || undefined,
                            status: v.active ? "active" : "inactive",
                            isDraft: !!isDraft,
                            condition,
                            retailPrice: row.retail != null && row.retail !== "" ? Number(row.retail) : undefined,
                            originalPrice: row.original != null && row.original !== "" ? Number(row.original) : undefined,
                            retailCurrency: CURRENCY,
                            originalCurrency: CURRENCY,
                            lastPurchasePrice: row.purchase != null && row.purchase !== "" ? Number(row.purchase) : undefined,
                            lastPurchaseCurr: CURRENCY,
                            weight: v.weight != null && v.weight !== "" ? Number(v.weight) : undefined,
                            weightUnit: v.weightUnit || weightUnit,
                            length: v.length != null && v.length !== "" ? Number(v.length) : undefined,
                            width: v.width != null && v.width !== "" ? Number(v.width) : undefined,
                            height: v.height != null && v.height !== "" ? Number(v.height) : undefined,
                            dimensionUnit: v.unit || dimUnit,
                            attributes: {}, // reserved
                        };

                        const isLocal = typeof v.id === 'string' && v.id.startsWith('local-');
                        if (!v.id || isLocal) {
                            // NEW VARIANT → POST /products/:id/variants
                            await addVariant({ productId: effectiveProductId, payload: common });
                        } else {
                            // EXISTING VARIANT → PATCH /products/:id/variants/:variantId
                            await updateVariant({ productId: effectiveProductId, variantId: v.id, payload: common });
                        }
                    }
                }

                createdOrUpdated = { id: effectiveProductId };
                // 3) Sync suppliers draft (save-only)
                try {
                    const pid = effectiveProductId;
                    const original = Array.isArray(productDetail?.supplierLinks) ? productDetail.supplierLinks : [];
                    const origIds = new Set(original.map(lnk => lnk?.supplier?.id).filter(Boolean));

                    // Build desired from existing rows (possibly changed) + pending
                    const desiredMap = new Map(); // supplierId -> price
                    for (const lnk of original) {
                        const oldId = lnk?.supplier?.id;
                        if (!oldId) continue;
                        const newId = (editLinkSel && editLinkSel[oldId]) || oldId;
                        if (newId === 'Select') continue; // removed
                        const raw = editLinkPrices ? editLinkPrices[oldId] : undefined;
                        const price = raw != null && String(raw).trim() !== '' ? Number(raw) : (lnk?.lastPurchasePrice != null ? Number(lnk.lastPurchasePrice) : undefined);
                        desiredMap.set(newId, price);
                    }
                    for (const row of (pendingLinks || [])) {
                        const sid = row?.supplierId;
                        if (!sid || sid === 'Select') continue;
                        const price = row?.price != null && String(row.price).trim() !== '' ? Number(row.price) : undefined;
                        desiredMap.set(sid, price);
                    }

                    const desiredIds = new Set(desiredMap.keys());
                    // Link/Update all desired (idempotent: updates price if exists)
                    for (const [sid, price] of desiredMap.entries()) {
                        await linkSupplierProducts(sid, [pid], { lastPurchasePrice: price, currency: CURRENCY });
                    }
                    // Unlink removed
                    for (const oldId of origIds) {
                        if (!desiredIds.has(oldId)) {
                            await unlinkSupplierProduct(oldId, pid);
                        }
                    }
                } catch (e) {
                    console.error(e);
                    toast.error('Failed to save supplier links');
                }

                toast.success(isDraft ? "Draft updated" : "Product updated");
            }

            // Upload product-level images (if selected)
            try {
                const pid = (createdOrUpdated && createdOrUpdated.id) || (productDetail?.id || effectiveProductId);
                if (pid && Array.isArray(images) && images.length > 0) {
                    await uploadImages({ productId: pid, files: images });
                    toast.success("Images uploaded");
                    setImages([]);
                }
            } catch (e) {
                console.error(e);
                toast.error("Failed to upload images");
            }

            // Upload staged variant images after create (map by SKU)
            try {
                const pid = (createdOrUpdated && createdOrUpdated.id) || (productDetail?.id || effectiveProductId);
                if (!edit && usingVariants && pid && Object.keys(variantImages || {}).length) {
                    const createdVars = (createdOrUpdated && createdOrUpdated.ProductVariant) || [];
                    const idBySku = new Map(createdVars.map(cv => [cv.sku, cv.id]));
                    for (const v of variants) {
                        const files = variantImages[v.id];
                        if (files && files.length && v.sku) {
                            const cvId = idBySku.get(v.sku);
                            if (cvId) {
                                await uploadImages({ productId: pid, files, variantId: cvId });
                            }
                        }
                    }
                    setVariantImages({});
                }
            } catch (e) {
                console.error(e);
                toast.error("Failed to upload some variant images");
            }

            if (!edit && mode === "again" && !isDraft) {
                // Save & Add Another: keep modal open, preserve commonly repeated fields
                // so the next product doesn't require re-entering prices/dimensions, etc.
                setSavedProducts((prev) => [...prev, payload]);

                // Clear validation state and per-item identifiers
                setMissing({});

                // Reset only the fields that are usually unique per product
                setSku("");
                setBarcode("");
                setName("");
                setBrand("");

                // Preserve condition/status/origin/units and price/dimensions to speed up entry
                // Keep variant toggle as-is, but reset its rows/prices for a clean start
                setVariants([]);
                setVariantPrices({});
                setVariantImages({});
                setImages([]);

                // Clear suppliers for the next entry
                setSupplierRows([{ supplierId: 'Select', price: '' }]);
                setPendingLinks([{ supplierId: 'Select', price: '' }]);

                // Keep supplier and pricing by default (common in bulk entry)
                // setSupplier(suppliers[0]); // intentionally preserved
                // setPurchasingPrice("");   // intentionally preserved
                // setRetailPrice("");       // intentionally preserved
                // setSellingPrice("");      // intentionally preserved

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
        } finally {
            setSavingUi(false);
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

    const savingBusy = savingUi || saving || savingParent || savingVariant || addingVariant || uploadingImages;

    const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
    const IMG_PLACEHOLDER =
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="100%" height="100%" fill="#f3f4f6"/><g fill="#9ca3af"><circle cx="26" cy="30" r="8"/><path d="M8 60l15-15 10 10 12-12 27 27H8z"/></g></svg>'
        );
    const absImg = (url) => (!url ? IMG_PLACEHOLDER : (/^https?:\/\//i.test(url) ? url : `${API_BASE}${url}`));

    return (
        <Transition appear show={open} as={Fragment}>
            <Dialog
                as="div"
                className="relative z-[70]"
                onClose={() => {
                    if (savingBusy) return; // prevent closing while saving
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
                            <DialogPanel className="relative w-full max-w-[1100px] max-h-[90vh] rounded-xl bg-[#f6f7fb] border border-gray-200 shadow-2xl flex flex-col">
                                {savingBusy && (
                                    <div className="absolute inset-0 z-[500] bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
                                        <div className="flex items-center gap-2 text-gray-700 text-sm font-semibold">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Saving…
                                        </div>
                                    </div>
                                )}
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

                                            {!isEditSimple && (
                                                <div className="flex items-center mx- gap-3">
                                                    <span className="text-[12px] text-gray-600">Enable variants</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setVariantEnabled((v) => !v)}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${variantEnabled ? "bg-amber-500" : "bg-gray-300"}`}
                                                        title="Toggle product variants"
                                                    >
                                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${variantEnabled ? "translate-x-6" : "translate-x-1"}`} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-4">
                                            {/* Hide variant toggle/info entirely when editing a simple product */}
                                            <div className="grid grid-cols-12 gap-3">
                                                {/* Product Name */}
                                                <Field className="col-span-12 md:col-span-5" label="Product Name *">
                                                    <input
                                                        className={`${input} ${err("name") ? "border-red-400 ring-1 ring-red-200" : ""}`}
                                                        placeholder="Enter"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        onBlur={() => {
                                                            if (String(name || '').trim().length > 0) {
                                                                const initials = String(name).trim().split(/\s+/).map(w => (w[0] || '').toUpperCase()).join('') || 'PRD';
                                                                const digits = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
                                                                setSku(`${initials}-${digits}`);
                                                            }
                                                        }}
                                                    />
                                                </Field>

                                                {/* SKU (auto) */}
                                                <Field
                                                    className="col-span-12 md:col-span-3"
                                                    label={variantEnabled ? "Parent SKU (auto)" : "Stock SKU (auto)"}
                                                >
                                                    <input
                                                        ref={skuRef}
                                                        className={`${input} ${err("sku") ? "border-red-400 ring-1 ring-red-200" : ""}`}
                                                        placeholder="Auto-generated from name"
                                                        value={sku}
                                                        readOnly
                                                    />
                                                    
                                                </Field>

                                                {/* Barcode type + input */}
                                                <div className="col-span-12 md:col-span-4 grid grid-cols-12 items-end">
                                                    <Field className="col-span-4 relative overflow-visible" label="Barcode Type">
                                                        <SelectCompact
                                                            value={barcodeType}
                                                            onChange={setBarcodeType}
                                                            options={barcodeTypes}
                                                            buttonClassName="rounded-r-none border-r"
                                                        />
                                                    </Field>
                                                    <Field className="col-span-8" label="Barcode">
                                                        <input
                                                            className={`${input} rounded-l-none border-l-0`}
                                                            placeholder="Enter"
                                                            value={barcode}
                                                            onChange={(e) => setBarcode(e.target.value)}
                                                        />
                                                    </Field>
                                                </div>

                                                {/* Simple product: Size & Color (dropdowns with Add…) */}
                                                {!variantEnabled && (
                                                    <>
                                                        <Field className="col-span-12 md:col-span-6" label="Size">
                                                            <SelectCompact
                                                                value={mainSizeText || "—"}
                                                                onChange={(val) => {
                                                                    if (val === ADD_SIZE_SENTINEL) {
                                                                        setSizeContext({ kind: 'simple' });
                                                                        setTimeout(() => setSizeModalOpen(true), 0);
                                                                        return;
                                                                    }
                                                                    setMainSizeText(val === "—" ? "" : String(val));
                                                                }}
                                                                options={[...sizes.map(s => s.text), ADD_SIZE_SENTINEL]}
                                                                renderOption={(opt) => opt === ADD_SIZE_SENTINEL ? (
                                                                    <span className="flex items-center gap-2 text-amber-700"><Plus size={14} />Add new size…</span>
                                                                ) : opt}
                                                                filterable
                                                            />
                                                        </Field>
                                                        <Field className="col-span-12 md:col-span-6" label="Color">
                                                            <SelectCompact
                                                                value={mainColorText || "—"}
                                                                onChange={(val) => {
                                                                    if (val === ADD_COLOR_SENTINEL) {
                                                                        setColorContext({ kind: 'simple' });
                                                                        setTimeout(() => setColorModalOpen(true), 0);
                                                                        return;
                                                                    }
                                                                    setMainColorText(val === "—" ? "" : String(val));
                                                                }}
                                                                options={[...colors, ADD_COLOR_SENTINEL]}
                                                                renderOption={(opt) => opt === ADD_COLOR_SENTINEL ? (
                                                                    <span className="flex items-center gap-2 text-amber-700"><Plus size={14} />Add new color…</span>
                                                                ) : opt}
                                                                filterable
                                                            />
                                                        </Field>
                                                    </>
                                                )}

                                                <div className="col-span-12 md:col-span-6">
                                                <label className={label}>Condition <span className="text-red-500">*</span></label>
                                                    <SelectCompact
                                                        value={condition}
                                                        onChange={setCondition}
                                                        options={(enums?.ProductCondition || ["NEW", "USED", "RECONDITIONED"]).map(c => ({ value: c, label: labelize(c) }))}
                                                    />
                                                </div>
                                                <Field className="col-span-12 md:col-span-6" label="Brand">
                                                    <input
                                                        className={input}
                                                        placeholder="Enter"
                                                        value={brand}
                                                        onChange={(e) => setBrand(e.target.value)}
                                                    />
                                                </Field>

                                                <div className="col-span-12 md:col-span-6">
                                                    <label className={label}>Status <span className="text-red-500">*</span></label>
                                                    <SelectCompact
                                                        value={status}
                                                        onChange={setStatus}
                                                        options={(enums?.ProductStatus || ["active", "inactive", "archived"]).map(s => ({ value: s, label: labelize(s) }))}
                                                    />
                                                </div>
                                                <div className="col-span-12 md:col-span-6 md:max-w-[280px]">
                                                    <label className={label}>Place of origin <span className="text-red-500">*</span></label>
                                                    <SelectCompact
                                                        value={origin}
                                                        onChange={(v) => { setOrigin(v); if (missing["origin"]) setMissing(p => { const n = { ...p }; delete n["origin"]; return n; }); }}
                                                        options={origins}
                                                        disabled={originLoading}
                                                        buttonClassName={`h-8 text-[12px] px-2 ${err("origin") ? "ring-1 ring-red-200 border-red-400" : ""}`}
                                                        filterable
                                                    />
                                                    {originLoading && (
                                                        <p className="mt-1 text-[11px] text-gray-500">Loading countries…</p>
                                                    )}
                                                </div>


                                                    {!variantEnabled && (
                                                    <div className="col-span-12 md:col-span-6 ">
                                                        <label className={label}>Weight <span className="text-red-500">*</span></label>
                                                        <div className="grid grid-cols-12 gap-0">
                                                            <input
                                                                className={`${input} col-span-6 ${err("weightMain") ? "border-red-400 ring-1 ring-red-200" : ""} rounded-r-none border-r`}
                                                                placeholder="Enter"
                                                                value={weightMain}
                                                                onChange={(e) => setWeightMain(e.target.value)}
                                                            />
                                                            <div className="col-span-3">
                                                                <SelectCompact
                                                                    value={weightUnit}
                                                                    onChange={setWeightUnit}
                                                                    options={mainWeightOptions}
                                                                    buttonClassName="rounded-l-none border-l-0"
                                                                />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <input
                                                                  className={`${input} rounded-r-none border-r`}
                                                                  placeholder={weightSubLabel === 'g' ? 'Gram' : 'Oz'}
                                                                  value={weightSub}
                                                                  onChange={(e) => setWeightSub(e.target.value)}
                                                                />
                                                            </div>
                                                             <div className="col-span-1">
                                                              <div className="h-8 w-full rounded-r-lg border border-gray-300 bg-gray-50 text-[13px] text-gray-700 flex items-center justify-center select-none">
                                                                {weightSubLabel}
                                                              </div>
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
                                                    <label className={label}>Tag</label>
                                                    <SelectCompact value={tag} onChange={setTag} options={tags} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {edit && open && loadingProduct && (
                                      <div className="mt-3 space-y-3 animate-pulse">
                                        <div className="h-5 w-48 bg-gray-200 rounded" />
                                        <div className="h-24 bg-gray-200 rounded" />
                                        <div className="h-5 w-64 bg-gray-200 rounded" />
                                        <div className="h-24 bg-gray-200 rounded" />
                                      </div>
                                    )}

                                    {/* Variants Section (only when enabled and not editing a simple product) */}
                                    {variantEnabled && !isEditSimple && (
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
                                                    {/* Simplified variant cards layout */}
                                                    <div>
                                                        {variants.length === 0 ? (
                                                            <div className="p-3 text-[13px] text-gray-600 flex items-center justify-center">
                                                                No variants yet — use "Add Variant Row" below.
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {variants.map((v, idx) => {
                                                                    const sizeLabel = v.sizeCode ? (sizes.find(s => s.code === v.sizeCode)?.text || v.sizeText || "—") : (v.sizeText || "—");
                                                                    return (
                                                                        <div key={v.id} className="bg-white rounded-lg border border-gray-200 p-3">
                                                                            <div className="flex items-center justify-between">
                                                                                <div className="text-sm font-semibold text-gray-900">
                                                                                    Variant {idx + 1}: {sizeLabel} · {v.sku || "(no SKU)"}
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-xs text-gray-600">Active</span>
                                                                                    <button type="button" onClick={() => patchVariant(v.id, { active: !v.active })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${v.active ? "bg-amber-500" : "bg-gray-300"}`} title="Active">
                                                                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${v.active ? "translate-x-6" : "translate-x-1"}`} />
                                                                                    </button>
                                                                                    <button type="button" onClick={() => deleteVariant(v.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50" title="Delete variant"><Trash2 size={16} /></button>
                                                                                    {v.id ? (
                                                                                        <>
                                                                                            <button type="button" className="inline-flex items-center h-8 px-2 rounded-md border border-amber-300 bg-[#FFF9E5] text-amber-800 text-[12px] font-semibold hover:bg-amber-50" title="Upload images for this variant" onClick={() => variantInputsRef.current?.[v.id]?.click()}>
                                                                                                <Upload size={14} />
                                                                                                <span className="ml-1">Images</span>
                                                                                            </button>
                                                                                            <input type="file" accept="image/*" multiple className="hidden" ref={(el) => { if (!variantInputsRef.current) variantInputsRef.current = {}; variantInputsRef.current[v.id] = el; }} onChange={async (e) => {
                                                                                                const files = Array.from(e.target.files || []);
                                                                                                if (!files.length) return;
                                                                                                if (edit && productDetail?.id && !String(v.id).startsWith('local-')) {
                                                                                                    try { const pid = productDetail?.id || productId; await uploadImages({ productId: pid, files, variantId: v.id }); toast.success('Variant images uploaded'); e.target.value = ''; } catch (err) { console.error(err); toast.error('Failed to upload variant images'); }
                                                                                                } else {
                                                                                                    // stage files for upload after create
                                                                                                    setVariantImages(prev => ({ ...prev, [v.id]: files }));
                                                                                                    toast.success('Variant images selected');
                                                                                                }
                                                                                            }} />
                                                                                        </>
                                                                                    ) : null}
                                                                                </div>
                                                                            </div>

                                                                            <div className="mt-3">
                                                                                <p className="text-xs font-semibold text-gray-700 mb-1">Basic Info</p>
                                                                                <div className="grid grid-cols-12 gap-2">
                                                                                    <Field className="col-span-12 md:col-span-3" label="Size">
                                                                                        <SelectCompact
                                                                                            value={sizeLabel}
                                                                                            onChange={(val) => {
                                                                                                if (val === ADD_SIZE_SENTINEL) {
                                                                                                    setSizeContext({ kind: 'variant', id: v.id });
                                                                                                    setTimeout(() => setSizeModalOpen(true), 0);
                                                                                                    return;
                                                                                                }
                                                                                                const found = sizes.find((s) => s.text === val || s.code === val) || { code: "", text: "—" };
                                                                                                const next = { sizeCode: found.code, sizeText: found.text };
                                                                                                if (v.autoSku) next.sku = computeAutoSku(sku, { sizeCode: found.code }, idx);
                                                                                                patchVariant(v.id, next);
                                                                                            }}
                                                                                            options={[...sizes.map((s) => s.text), ADD_SIZE_SENTINEL]}
                                                                                            renderOption={(opt) => opt === ADD_SIZE_SENTINEL ? (
                                                                                                <span className="flex items-center gap-2 text-amber-700"><Plus size={14} />Add new size…</span>
                                                                                            ) : opt}
                                                                                        />
                                                                                    </Field>
                                                                                    <Field className="col-span-12 md:col-span-3" label="Color">
                                                                                        <SelectCompact
                                                                                            value={v.colorText || "—"}
                                                                                            onChange={(val) => {
                                                                                                if (val === ADD_COLOR_SENTINEL) {
                                                                                                    setColorContext({ kind: 'variant', id: v.id });
                                                                                                    setTimeout(() => setColorModalOpen(true), 0);
                                                                                                    return;
                                                                                                }
                                                                                                patchVariant(v.id, { colorText: val === "—" ? "" : String(val) });
                                                                                            }}
                                                                                            options={[...colors, ADD_COLOR_SENTINEL]}
                                                                                            renderOption={(opt) => opt === ADD_COLOR_SENTINEL ? (
                                                                                                <span className="flex items-center gap-2 text-amber-700"><Plus size={14} />Add new color…</span>
                                                                                            ) : opt}
                                                                                            filterable
                                                                                        />
                                                                                    </Field>
                                                                                    <Field className="col-span-12 md:col-span-4" label="Variant SKU *">
                                                                                        <input className={`${input} ${err(`v:${v.id}:sku`) ? "border-red-400 ring-1 ring-red-200" : ""}`} placeholder="e.g., 123-XL" value={v.sku} onChange={(e) => patchVariant(v.id, { sku: e.target.value, autoSku: false })} />
                                                                                    </Field>
                                                                                    <Field className="col-span-12 md:col-span-2" label="Barcode">
                                                                                        <input className={input} placeholder="Optional" value={v.barcode} onChange={(e) => patchVariant(v.id, { barcode: e.target.value })} />
                                                                                    </Field>
                                                                                </div>
                                                                                <p className="text-xs font-semibold text-gray-700 mt-3 mb-1">Measurements</p>
                                                                                <div className="grid grid-cols-12 gap-2">
                                                                                    <Field className="col-span-12 md:col-span-4" label="Weight">
                                                                                        <div className="grid grid-cols-12">
                                                                                            <input className={`${input} col-span-7 ${err(`v:${v.id}:weight`) ? "border-red-400 ring-1 ring-red-200" : ""} rounded-r-none border-r`} placeholder="e.g., 1.0" value={v.weight} onChange={(e) => patchVariant(v.id, { weight: e.target.value })} />
                                                                                            <div className="col-span-5">
                                                                                <SelectCompact value={v.weightUnit || weightUnit} onChange={(val) => patchVariant(v.id, { weightUnit: val })} options={mainWeightOptions} buttonClassName="rounded-l-none border-l-0" />
                                                                                            </div>
                                                                                        </div>
                                                                                    </Field>
                                                                                    <Field className="col-span-12 md:col-span-8" label="Dimensions (L × W × H) + Unit">
                                                                                        <div className="grid grid-cols-12 gap-2">
                                                                                            <input className={`${input} col-span-3 ${err(`v:${v.id}:length`) ? "border-red-400 ring-1 ring-red-200" : ""}`} placeholder="Length" value={v.length} onChange={(e) => patchVariant(v.id, { length: e.target.value })} />
                                                                                            <input className={`${input} col-span-3 ${err(`v:${v.id}:width`) ? "border-red-400 ring-1 ring-red-200" : ""}`} placeholder="Width" value={v.width} onChange={(e) => patchVariant(v.id, { width: e.target.value })} />
                                                                                            <input className={`${input} col-span-3 ${err(`v:${v.id}:height`) ? "border-red-400 ring-1 ring-red-200" : ""}`} placeholder="Height" value={v.height} onChange={(e) => patchVariant(v.id, { height: e.target.value })} />
                                                                                            <div className="col-span-3">
                                                                                                <SelectCompact value={v.unit || dimUnit} onChange={(val) => patchVariant(v.id, { unit: val })} options={(dimUnits || []).map(u => ({ value: u, label: u }))} />
                                                                                            </div>
                                                                                        </div>
                                                                                    </Field>
                                                                                    {variantImages[v.id] && variantImages[v.id].length > 0 && (
                                                                                        <div className="col-span-12 mt-1">
                                                                                            <p className="text-[11px] text-gray-600 mb-1">Selected images (will upload on save)</p>
                                                                                            <div className="flex flex-wrap gap-2">
                                                                                                {variantImages[v.id].map((f, i) => (
                                                                                                    <img key={i} src={URL.createObjectURL(f)} className="h-12 w-12 object-cover rounded border border-gray-200" />
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="rounded-xl border border-gray-200 overflow-x-auto overflow-y-visible hidden">
                                                        <div className="min-w-[1180px] grid grid-cols-[200px_180px_140px_210px_120px_120px_120px_110px_90px_140px] gap-px text-[12px] font-medium text-gray-700 border-b border-gray-200 rounded-xl">
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
                                                            <div className="divide-y divide-gray-100 min-w-[1180px]">
                                                                {variants.map((v, idx) => (
                                                                    <div
                                                                        key={v.id}
                                                                        className="grid grid-cols-[200px_180px_140px_210px_120px_120px_120px_110px_90px_140px] gap-px bg-gray-100"
                                                                    >
                                                                        <div className="bg-white px-2 py-1.5 relative overflow-visible">
                                                                            <SelectCompact
                                                                                value={
                                                                                    v.sizeCode
                                                                                        ? (sizes.find((s) => s.code === v.sizeCode)?.text || v.sizeText || "—")
                                                                                        : (v.sizeText || "—")
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
                                                                                        options={mainWeightOptions}
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

                                                                        <div className="bg-white px-2 py-1.5 flex items-center justify-center gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => deleteVariant(v.id)}
                                                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                                                                                title="Delete variant"
                                                                            >
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                            {edit && v.id && !String(v.id).startsWith('local-') ? (
                                                                                <>
                                                                                    <button
                                                                                        type="button"
                                                                                        className="inline-flex items-center h-8 px-2 rounded-md border border-amber-300 bg-[#FFF9E5] text-amber-800 text-[12px] font-semibold hover:bg-amber-50"
                                                                                        title="Upload images for this variant"
                                                                                        onClick={() => variantInputsRef.current?.[v.id]?.click()}
                                                                                    >
                                                                                        <Upload size={14} />
                                                                                        <span className="ml-1">Images</span>
                                                                                    </button>
                                                                                    <input
                                                                                        type="file"
                                                                                        accept="image/*"
                                                                                        multiple
                                                                                        className="hidden"
                                                                                        ref={(el) => {
                                                                                            if (!variantInputsRef.current) variantInputsRef.current = {};
                                                                                            variantInputsRef.current[v.id] = el;
                                                                                        }}
                                                                                        onChange={async (e) => {
                                                                                            const files = Array.from(e.target.files || []);
                                                                                            if (!files.length) return;
                                                                                            try {
                                                                                                const pid = productDetail?.id || productId;
                                                                                                await uploadImages({ productId: pid, files, variantId: v.id });
                                                                                                toast.success('Variant images uploaded');
                                                                                                e.target.value = '';
                                                                                            } catch (err) {
                                                                                                console.error(err);
                                                                                                toast.error('Failed to upload variant images');
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                </>
                                                                            ) : null}
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
                                    )}

                                    {/* Supplier Link */}
                                    <div className={`${card} mt-3`}>
                                        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#FCD33F]/70 bg-[#FFF9E5]">
                                                <Truck size={16} className="text-amber-700" />
                                            </div>
                                            <h3 className="text-sm font-semibold text-gray-900">Supplier</h3>
                                        </div>

                                        <div className="p-4">
                                            <div className="grid grid-cols-12 gap-3">
                                                {(edit && productDetail) ? (
                                                  <div className="col-span-12">
                                                    <div className="mt-2 pt-1">
                                                      <div className="text-[13px] font-semibold text-gray-900 mb-2">Suppliers</div>

                                                      {/* Existing links first */}
                                                      <div className="space-y-2">
                                                        {(productDetail?.supplierLinks || []).map((lnk) => (
                                                          <div key={lnk?.supplier?.id} className="grid grid-cols-12 items-center gap-2">
                                                            <div className="col-span-5">
                                                              <SelectCompact
                                                                value={editLinkSel[lnk?.supplier?.id] ?? lnk?.supplier?.id}
                                                                onChange={(newId) => setEditLinkSel(prev => ({ ...prev, [lnk?.supplier?.id]: newId }))}
                                                                options={(() => {
                                                                  const existingIds = new Set((productDetail?.supplierLinks || []).map((ls) => ls?.supplier?.id).filter(Boolean));
                                                                  return supplierOptions.filter((opt) => typeof opt === 'string' ? true : (opt.value === (editLinkSel[lnk?.supplier?.id] ?? lnk?.supplier?.id) || !existingIds.has(opt.value)));
                                                                })()}
                                                                disabled={suppliersLoading || linkingSupplier}
                                                                filterable
                                                              />
                                                            </div>
                                                            <div className="col-span-5">
                                                              <div className="grid grid-cols-12">
                                                                <input
                                                                  className={`${input} col-span-9 rounded-r-none border-r`}
                                                                  placeholder="Last purchase e.g., 120.00"
                                                                  value={(editLinkPrices[lnk?.supplier?.id] ?? (lnk?.lastPurchasePrice != null ? String(lnk.lastPurchasePrice) : ''))}
                                                                  onChange={(e) => setEditLinkPrices(prev => ({ ...prev, [lnk?.supplier?.id]: e.target.value }))}
                                                                />
                                                                <div className="col-span-3">
                                                                  <div className="h-8 w-full rounded-r-lg border border-gray-300 bg-gray-50 text-[13px] text-gray-700 flex items-center justify-center select-none">
                                                                    {CURRENCY}
                                                                  </div>
                                                                </div>
                                                              </div>
                                                            </div>
                                                            <div className="col-span-2 text-right flex items-center justify-end">
                                                              <button
                                                                type="button"
                                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                                                                title="Remove"
                                                                onClick={() => {
                                                                  const sid = lnk?.supplier?.id;
                                                                  setEditLinkSel(prev => ({ ...prev, [sid]: 'Select' }));
                                                                }}
                                                              >
                                                                <Trash2 size={16} />
                                                              </button>
                                                            </div>
                                                          </div>
                                                        ))}
                                                      </div>

                                                      {/* Pending rows (new links) */}
                                                      {(() => {
                                                        const existingIds = new Set((productDetail?.supplierLinks || []).map((ls) => ls?.supplier?.id).filter(Boolean));
                                                        const pendingSelected = new Set((pendingLinks || []).map((r) => r.supplierId).filter((v) => v && v !== 'Select'));
                                                        const filteredOptions = (rowSupplierId) => supplierOptions.filter((opt) =>
                                                          typeof opt === 'string'
                                                            ? true
                                                            : (opt.value === rowSupplierId || (!existingIds.has(opt.value) && !pendingSelected.has(opt.value)))
                                                        );
                                                        return (
                                                          <>
                                                            <div className="mt-2 space-y-2">
                                                              {pendingLinks.map((row, idx) => (
                                                                <div key={`pending-${idx}`} className="grid grid-cols-12 items-center gap-2">
                                                                  <div className="col-span-5">
                                                                    <SelectCompact
                                                                      value={row.supplierId}
                                                                      onChange={(v) => setPendingLinks(prev => prev.map((r,i)=> i===idx ? { ...r, supplierId: v } : r))}
                                                                      options={filteredOptions(row.supplierId)}
                                                                      disabled={suppliersLoading || linkingSupplier}
                                                                      filterable
                                                                    />
                                                                  </div>
                                                                  <div className="col-span-5">
                                                                    <div className="grid grid-cols-12">
                                                                      <input
                                                                        className={`${input} col-span-9 rounded-r-none border-r`}
                                                                        placeholder="Last purchase e.g., 120.00"
                                                                        value={row.price}
                                                                        onChange={(e) => setPendingLinks(prev => prev.map((r,i)=> i===idx ? { ...r, price: e.target.value } : r))}
                                                                      />
                                                                      <div className="col-span-3">
                                                                        <div className="h-8 w-full rounded-r-lg border border-gray-300 bg-gray-50 text-[13px] text-gray-700 flex items-center justify-center select-none">
                                                                          {CURRENCY}
                                                                        </div>
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                  <div className="col-span-2 text-right flex items-center justify-end">
                                                                    <button
                                                                      type="button"
                                                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                                                                      title="Remove"
                                                                      onClick={() => setPendingLinks(prev => prev.filter((_,i)=> i!==idx))}
                                                                    >
                                                                      <Trash2 size={16} />
                                                                    </button>
                                                                  </div>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          </>
                                                        );
                                                      })()}

                                                      {/* Add button at the end */}
                                                      <div className="mt-3">
                                                        <button
                                                          type="button"
                                                          className={outlineBtn}
                                                          onClick={() => setPendingLinks(prev => [...prev, { supplierId: 'Select', price: '' }])}
                                                        >
                                                          Add another supplier
                                                        </button>
                                                      </div>
                                                        {/* (Existing links rendered above) */}
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div className="col-span-12">
                                                    <div className="mt-2 border-t border-gray-100 pt-3">
                                                      <div className="text-[13px] font-semibold text-gray-900 mb-2">Suppliers</div>
                                                      <div className="space-y-2">
                                                        {supplierRows.map((row, idx) => (
                                                          <div key={idx} className="grid grid-cols-12 items-center gap-2">
                                                            <div className="col-span-5">
                                                              <SelectCompact
                                                                value={row.supplierId}
                                                                onChange={(v) => setSupplierRows(prev => prev.map((r,i)=> i===idx ? { ...r, supplierId: v } : r))}
                                                                options={supplierOptions.filter((opt) =>
                                                                  typeof opt === 'string'
                                                                    ? true
                                                                    : (opt.value === row.supplierId || !selectedSupplierIds.has(opt.value))
                                                                )}
                                                                disabled={suppliersLoading}
                                                                filterable
                                                              />
                                                            </div>
                                                            <div className="col-span-5">
                                                              <div className="grid grid-cols-12">
                                                                <input
                                                                  className={`${input} col-span-9 rounded-r-none border-r`}
                                                                  placeholder="Last purchase e.g., 120.00"
                                                                  value={row.price}
                                                                  onChange={(e) => setSupplierRows(prev => prev.map((r,i)=> i===idx ? { ...r, price: e.target.value } : r))}
                                                                />
                                                                <div className="col-span-3">
                                                                  <div className="h-8 w-full rounded-r-lg border border-gray-300 bg-gray-50 text-[13px] text-gray-700 flex items-center justify-center select-none">
                                                                    {CURRENCY}
                                                                  </div>
                                                                </div>
                                                              </div>
                                                            </div>
                                                            <div className="col-span-2 text-right">
                                                              {supplierRows.length > 1 && (
                                                                <button type="button" className="text-red-700 hover:underline text-[12px]" onClick={() => setSupplierRows(prev => prev.filter((_,i)=> i!==idx))}>Remove</button>
                                                              )}
                                                            </div>
                                                          </div>
                                                        ))}
                                                      </div>
                                                      <div className="mt-2">
                                                        <button
                                                          type="button"
                                                          className={outlineBtn}
                                                          disabled={supplierOptions.filter((opt) => typeof opt !== 'string' && !selectedSupplierIds.has(opt.value)).length === 0}
                                                          onClick={() => setSupplierRows(prev => [...prev, { supplierId: 'Select', price: '' }])}
                                                        >
                                                          Add another supplier
                                                        </button>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

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
                                                    <Field className="col-span-12 md:col-span-6" label="Retail Price *">
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

                                                    <Field className="col-span-12 md:col-span-6" label="Selling Price *">
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
                                                    <div className="grid grid-cols-[1fr_140px_140px_140px_90px] text-[12px] font-medium text-gray-700">
                                                        <div className="bg-gray-50 px-3 py-2">Variant SKU</div>
                                                        <div className="bg-gray-50 px-3 py-2">Retail Price</div>
                                                        <div className="bg-gray-50 px-3 py-2">Original Price</div>
                                                        <div className="bg-gray-50 px-3 py-2">Last Purchase</div>
                                                        <div className="bg-gray-50 px-3 py-2 text-center">Currency</div>
                                                    </div>

                                                    {variants.length === 0 ? (
                                                        <div className="p-3 text-[13px] text-gray-600">
                                                            No variants yet — add rows above to set pricing.
                                                        </div>
                                                    ) : (
                                                        <div className="divide-y divide-gray-100">
                                                            {variants.map((v) => {
                                                                const row = variantPrices[v.id] || { retail: "", original: "", purchase: "" };
                                                                return (
                                                                    <div
                                                                        key={v.id}
                                                                        className="grid grid-cols-[1fr_140px_140px_140px_90px] bg-white"
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

                                                                        <div className="px-3 py-2">
                                                                            <input
                                                                                className={input}
                                                                                placeholder="e.g., 120.00"
                                                                                value={row.purchase}
                                                                                onChange={(e) =>
                                                                                    setVariantPrices((prev) => ({
                                                                                        ...prev,
                                                                                        [v.id]: { ...(prev[v.id] || {}), purchase: e.target.value },
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
                                            {imagePreviews.length > 0 && (
                                                <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                                    {imagePreviews.map((p, idx) => (
                                                        <div key={idx} className="relative group">
                                                            <img src={p.url} className="h-20 w-20 object-cover rounded-md border border-gray-200" />
                                                            <button
                                                                type="button"
                                                                className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-red-200 text-red-600 rounded-full h-6 w-6 text-xs"
                                                                title="Remove"
                                                                onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Existing images in edit mode */}
                                            {edit && Array.isArray(productDetail?.images) && productDetail.images.length > 0 && (
                                                <div className="mt-4">
                                                    <p className="text-[12px] text-gray-600 mb-2">Existing Product Images</p>
                                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                                        {productDetail.images
                                                            .filter(img => {
                                                                const u = String(img.url || "");
                                                                const rest = u.split('/uploads/')[1] || '';
                                                                // product-level images have exactly 2 segments: <tenant-product>/<file>
                                                                return rest.split('/').length === 2;
                                                            })
                                                            .map(img => (
                                                                <div key={img.id} className="relative group">
                                                                    <img
                                                                        src={absImg(img.url)}
                                                                        className="h-20 w-20 object-cover rounded-md border border-gray-200 bg-gray-100"
                                                                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMG_PLACEHOLDER; }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-red-200 text-red-600 rounded-full h-6 w-6 text-xs"
                                                                        title="Delete"
                                                                        onClick={async () => {
                                                                            try {
                                                                                await deleteProductImage(productDetail.id, img.id);
                                                                                await refetchProductDetail();
                                                                            } catch (e) { console.error(e); }
                                                                        }}
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            )}

                                            {edit && Array.isArray(productDetail?.ProductVariant) && productDetail.ProductVariant.length > 0 && (
                                                <div className="mt-4">
                                                    <p className="text-[12px] text-gray-600 mb-2">Existing Variant Images</p>
                                                    {productDetail.ProductVariant.map(pv => {
                                                        const imgs = (productDetail.images || []).filter(img => {
                                                            const u = String(img.url || "");
                                                            const parts = u.split('/uploads/')[1]?.split('/') || [];
                                                            const maybeVar = parts.length >= 3 ? parts[1] : null;
                                                            return maybeVar === pv.id;
                                                        });
                                                        return (
                                                            <div key={pv.id} className="mb-2">
                                                                <div className="text-[12px] text-gray-700 mb-1">{pv.sku || pv.sizeText || pv.id}</div>
                                                                {imgs.length === 0 ? (
                                                                    <div className="text-[12px] text-gray-500">No images</div>
                                                                ) : (
                                                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                                                        {imgs.map(img => (
                                                                            <div key={img.id} className="relative group">
                                                                                <img
                                                                                    src={absImg(img.url)}
                                                                                    className="h-20 w-20 object-cover rounded-md border border-gray-200 bg-gray-100"
                                                                                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMG_PLACEHOLDER; }}
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-red-200 text-red-600 rounded-full h-6 w-6 text-xs"
                                                                                    title="Delete"
                                                                                    onClick={async () => {
                                                                                        try {
                                                                                            await deleteProductImage(productDetail.id, img.id);
                                                                                            await refetchProductDetail();
                                                                                        } catch (e) { console.error(e); }
                                                                                    }}
                                                                                >
                                                                                    ×
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
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
                                                                    {/* Marketplaces (edit only) */}
{edit && (
  <div className="mt-3 rounded-2xl border border-gray-200 bg-white">
    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 rounded-t-2xl">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#FCD33F]/70 bg-[#FFF9E5]">
          <svg width="16" height="16" viewBox="0 0 24 24" className="text-amber-700"><path fill="currentColor" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z"/></svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Marketplaces</h3>
      </div>
      {channelsLoading && <span className="text-[12px] text-gray-500">Loading…</span>}
    </div>

    <div className="p-4 space-y-4">
      {/* Create listing */}
      <div className="rounded-xl border border-gray-200">
        <div className="px-4 py-2 border-b border-gray-100 text-[13px] font-semibold text-gray-800">
          Add Listing
        </div>

        <div className={`p-4 grid ${ (Array.isArray(variants) && variants.length > 0) ? 'grid-cols-[1.2fr_1.4fr_1.2fr_1fr_0.7fr_0.7fr_120px]' : 'grid-cols-[1.2fr_1.4fr_1fr_0.7fr_0.7fr_120px]' } gap-3 items-end`}>
          {/* Product Name (was Provider) */}
          <div>
            <label className={label}>Product Name</label>
            <input
              className={input}
              placeholder="Enter product name"
              value={selectedProvider === 'Select' ? '' : selectedProvider}
              onChange={(e) => { setSelectedProvider(e.target.value || 'Select'); setSelectedChannelId(null); }}
            />
          </div>

          {/* Marketplace Name (was Channel) */}
          <div>
            <label className={label}>Marketplace</label>
            <SelectSearchAdd
              ref={channelSelectRef}
              value={selectedChannelId || ""}
              onChange={(v) => setSelectedChannelId(v)}
              options={channelOptions}
              placeholder="Select marketplace"
              disabled={false}
              loading={channelsLoading}
              allowAdd={true}
              onAdd={async (name) => {
                if (selectedProvider === "Select") return;
                const ch = await createChannel({ name: name.trim(), productName: selectedProvider });
                await refetchChannels();
                setSelectedProvider(ch?.provider || selectedProvider);
                setSelectedChannelId(ch?.id || null);
                return { value: ch?.id, label: ch?.name };
              }}
            />
            {/* Helper tip removed as requested */}
          </div>

          {/* Variant pick (only when variants exist) */}
          {Array.isArray(variants) && variants.length > 0 && (
            <div>
              <label className={label}>Attach To</label>
              <SelectCompact
                value={selectedVariantForListing}
                onChange={(v) => setSelectedVariantForListing(v)}
                options={[
                  { value: "product", label: "Product (no variant)" },
                  ...(variants.map(v => ({
                    value: String(v.id),
                    label: (v.sku || v.sizeText || v.sizeCode || "Variant")
                  })))
                ]}
                filterable
              />
            </div>
          )}

          {/* SKU (optional) */}
          <div>
            <Field label="Listing SKU">
              <input
                className={input}
                placeholder="e.g., AMZ-123-XL"
                value={listingSku}
                onChange={(e) => setListingSku(e.target.value)}
              />
            </Field>
          </div>

          {/* Units */}
          <div>
            <Field label="Units *">
              <input
                className={input}
                placeholder="e.g., 25"
                value={listingUnits}
                onChange={(e) => setListingUnits(e.target.value)}
              />
            </Field>
          </div>

          {/* Assign (dummy) */}
          <div>
            <Field label="Assign">
              <input
                className={input}
                placeholder="e.g., 5"
                value={assign || ''}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, '');
                  setAssign(v);
                }}
              />
            </Field>
          </div>

          {/* Inline add moved into the dropdowns above */}

          {/* Add Listing CTA */}
          <div className="flex justify-end">
            <button
              type="button"
              className={primaryBtn}
              disabled={
                addingListing ||
                !effectiveProductId ||
                !selectedChannelId ||
                !listingUnits.trim()
              }
              onClick={async () => {
                try {
                  let channelId = selectedChannelId;

                  if (!channelId) {
                    toast.error("Select a channel (or add one)");
                    return;
                  }

                  // Backend expects provider + channel name + externalSku; resolve from channelId
                  const channel = (allChannels || []).find(c => String(c.id ?? c.channelId ?? c._id) === String(channelId));
                  if (!channel) {
                    toast.error("Channel not found");
                    return;
                  }

                  const payload = {
                    productName: channel.provider,
                    name: channel.name,
                    units: Number(listingUnits),
                  };
                  if (listingSku && listingSku.trim()) {
                    payload.externalSku = listingSku.trim();
                  }
                  if (selectedVariantForListing && selectedVariantForListing !== "product") {
                    payload.variantId = selectedVariantForListing;
                  }

                  await addListing(payload);
                  toast.success("Listing added");
                  setListingSku("");
                  setListingUnits("");
                  await refetchListings();
                } catch (e) {
                  toast.error(e?.response?.data?.message || e?.message || "Failed to add listing");
                }
              }}
            >
              Add Listing
            </button>
          </div>
        </div>
      </div>

      {/* Existing listings */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-[1.2fr_1.4fr_1fr_0.7fr_1fr_90px] text-[12px] font-medium text-gray-700">
          <div className="bg-gray-50 px-3 py-2">Product Name</div>
          <div className="bg-gray-50 px-3 py-2">Marketplace</div>
          <div className="bg-gray-50 px-3 py-2">SKU</div>
          <div className="bg-gray-50 px-3 py-2 text-center">Units</div>
          <div className="bg-gray-50 px-3 py-2">Variant</div>
          <div className="bg-gray-50 px-3 py-2 text-center">Actions</div>
        </div>

        {listingsLoading ? (
          <div className="p-3 text-[13px] text-gray-600">Loading…</div>
        ) : (Array.isArray(listings) && listings.length > 0) ? (
          <div className="divide-y divide-gray-100">
            {listings.map((l) => {
              const provider = l?.channel?.provider ?? l?.provider ?? "";
              const channelName = l?.channel?.name ?? l?.channelName ?? "";
              const sku = l?.sku ?? "";
              const units = Number.isFinite(l?.units) ? l.units : (l?.units ?? "");
              const variantId = l?.variantId ?? null;
              return (
                <div key={l.id} className="grid grid-cols-[1.2fr_1.4fr_1fr_0.7fr_1fr_90px] bg-white">
                  <div className="px-3 py-2">{provider || "—"}</div>
                  <div className="px-3 py-2">{channelName || "—"}</div>
                  <div className="px-3 py-2 font-mono text-[13px]">{sku || "—"}</div>
                  <div className="px-3 py-2 text-center">{units}</div>
                  <div className="px-3 py-2">{findVariantLabel(variantId)}</div>
                  <div className="px-2 py-2 flex items-center justify-center">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                      disabled={deletingListing}
                      title="Delete listing"
                      onClick={async () => {
                        try {
                          await deleteListing(l.id);
                          await refetchListings();
                        } catch (e) {
                          toast.error(e?.response?.data?.message || e?.message || "Failed to delete");
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3 text-[13px] text-gray-600">No listings yet.</div>
        )}
      </div>
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
                                        disabled={savingBusy}
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
                                        disabled={savingBusy}
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
                                        disabled={savingBusy}
                                        onClick={() => {
                                            // If previous product was saved via "Save & Add Another" and the user
                                            // hasn't started a new entry (pristine), treat this as "Done": just close.
                                            if (savedProducts.length > 0 && isPristineNewEntry()) {
                                                resetFormToDefaults();
                                                onClose?.();
                                                return;
                                            }

                                            const m = collectMissing({ isDraft: false });
                                            setMissing(m);
                                            if (Object.keys(m).length) {
                                                toast.error("Please complete required fields.");
                                                return;
                                            }
                                            handleSave("single");
                                        }}
                                    >
                                        {savedProducts.length > 0 && isPristineNewEntry() ? "Done" : "Save"}
                                    </button>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>

            {/* Add Size Modal */}
            <Transition appear show={sizeModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[300]" onClose={() => setSizeModalOpen(false)}>
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
                                            <label className={label}>Size Label *</label>
                                            <input
                                                className={input}
                                                placeholder="e.g., Medium"
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
                                            disabled={!newSizeText.trim()}
                                            onClick={() => {
                                                const text = newSizeText.trim();
                                                const code = deriveSizeCode(text);
                                                if (!code || !text) return;
                                                setSizes((prev) => {
                                                    const exists = prev.some((s) => s.code.toUpperCase() === code.toUpperCase() || s.text === text);
                                                    const next = exists ? prev : [...prev, { code, text }];
                                                    return [
                                                        next.find((s) => s.code === "") || { code: "", text: "—" },
                                                        ...next.filter((s) => s.code !== ""),
                                                    ];
                                                });
                                                if (sizeContext && sizeContext.kind === 'simple') {
                                                    setMainSizeText(text);
                                                } else if (sizeContext && sizeContext.kind === 'variant' && sizeContext.id) {
                                                    const found = { code, text };
                                                    const idx = variants.findIndex(x => x.id === sizeContext.id);
                                                    const v = variants.find(x => x.id === sizeContext.id);
                                                    const patch = { sizeCode: found.code, sizeText: found.text };
                                                    if (v && v.autoSku) patch.sku = computeAutoSku(sku, { sizeCode: found.code }, idx);
                                                    patchVariant(sizeContext.id, patch);
                                                }
                                                setNewSizeText("");
                                                setNewSizeCode("");
                                                setSizeContext(null);
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

            {/* Add Color Modal */}
            <Transition appear show={colorModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[300]" onClose={() => setColorModalOpen(false)}>
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
                                <DialogPanel className="w-full max-w-sm rounded-xl bg-white p-4 border border-gray-200 shadow-xl">
                                    <h3 className="text-base font-semibold text-gray-900 mb-2">Add New Color</h3>
                                    <div className="space-y-2">
                                        <label className={label}>Color Label *</label>
                                        <input className={input} placeholder="e.g., Red" value={newColorText} onChange={(e) => setNewColorText(e.target.value)} />
                                    </div>
                                    <div className="mt-3 flex items-center justify-end gap-2">
                                        <button className={ghostBtn} onClick={() => setColorModalOpen(false)}>Cancel</button>
                                        <button className={primaryBtn} disabled={!newColorText.trim()} onClick={() => {
                                            const txt = newColorText.trim();
                                            setColors((prev) => {
                                                const base = Array.isArray(prev) && prev.length ? prev : ["—"];
                                                if (base.includes(txt)) return base;
                                                return [...base, txt];
                                            });
        
                                            if (colorContext && colorContext.kind === 'simple') {
                                                setMainColorText(txt);
                                            } else if (colorContext && colorContext.kind === 'variant' && colorContext.id) {
                                                patchVariant(colorContext.id, { colorText: txt });
                                            }
        
                                            setNewColorText("");
                                            setColorContext(null);
                                            setColorModalOpen(false);
                                        }}>Add Color</button>
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
    const renderLabel = (text) => {
        if (typeof text !== 'string') return text;
        const parts = text.split('*');
        if (parts.length === 1) return text;
        const out = [];
        parts.forEach((p, i) => {
            out.push(<span key={`p${i}`}>{p}</span>);
            if (i < parts.length - 1) out.push(<span key={`a${i}`} className="text-red-500">*</span>);
        });
        return out;
    };
    return (
        <div className={className}>
            {label ? <label className="text-[12px] text-gray-600">{renderLabel(label)}</label> : null}
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
    filterable = false,
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

    const [query, setQuery] = useState("");
    const filtered = !filterable || !query
        ? list
        : list.filter((opt) => String(getOptLabel(opt)).toLowerCase().includes(query.toLowerCase()));

    return (
        <Listbox value={value} onChange={(val) => { onChange(val); setQuery(""); }} disabled={disabled}>
            <div className="relative">
                <ListboxButton
                    onClick={() => setQuery("")}
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
                        {filterable && (
                            <div className="px-2 pb-1 sticky top-0 bg-white">
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="w-full h-7 rounded-md border border-gray-300 px-2 text-[12px]"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}
                        {filtered.map((opt) => {
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
