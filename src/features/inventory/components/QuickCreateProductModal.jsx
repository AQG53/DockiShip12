import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from "@headlessui/react";
import { Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { useCreateProduct } from "../hooks/useProducts";
import { useSuppliers } from "../../purchases/hooks/useSuppliers";
import SelectCompact from "../../../components/SelectCompact";

const input = "h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
const label = "block text-xs font-medium text-gray-700 mb-1";

export default function QuickCreateProductModal({ open, onClose, onSuccess, initialSupplierId }) {
    const { mutateAsync: createProductMut } = useCreateProduct();
    const { data: suppliers = [], isLoading: loadingSuppliers } = useSuppliers();

    // Form State
    const [name, setName] = useState("");
    const [sku, setSku] = useState("");
    const [supplierId, setSupplierId] = useState("");
    const [origin, setOrigin] = useState("Select");

    // Variants State
    const [hasVariants, setHasVariants] = useState(false);
    const [variants, setVariants] = useState([]);

    // Simple Product Attributes
    const [simpleSize, setSimpleSize] = useState("");
    const [simpleColor, setSimpleColor] = useState("");

    // Dropdown Options State
    const [originLoading, setOriginLoading] = useState(false);
    const [origins, setOrigins] = useState(["Select"]);
    const [sizes, setSizes] = useState([
        { code: "", text: "—" },
        { code: "S", text: "Small" },
        { code: "M", text: "Medium" },
        { code: "L", text: "Large" },
        { code: "XL", text: "X-Large" },
    ]);
    const [colors, setColors] = useState(["—", "Red", "Blue", "Green"]);

    // Reset form when opening
    useEffect(() => {
        if (open) {
            setName("");
            setSku("");
            setSupplierId(initialSupplierId || "");
            setOrigin("Select");
            setHasVariants(false);
            setSimpleSize("");
            setSimpleColor("");
            setVariants([
                {
                    id: randomId(),
                    size: "",
                    color: "",
                    sku: "",
                }
            ]);
        }
    }, [open, initialSupplierId]);

    // Fetch Countries
    useEffect(() => {
        let aborted = false;
        async function loadCountryCodes() {
            if (origins.length > 1 && origins[1].value) return; // already loaded (check for actual country data, not just "Select")
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
        if (open) loadCountryCodes();
        return () => { aborted = true; };
    }, [open, origins.length]);

    // Auto-generate SKU from name
    useEffect(() => {
        if (!name) {
            setSku("");
            return;
        }
        const initials = name
            .trim()
            .split(/\s+/)
            .map((w) => (w[0] || "").toUpperCase())
            .join("");
        const digits = String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
        setSku(`${initials || "PRD"}-${digits}`);
    }, [name]);

    // Update variant SKUs when main SKU changes
    useEffect(() => {
        setVariants((prev) =>
            prev.map((v, i) => ({
                ...v,
                sku: `${sku}-${v.size ? v.size.toUpperCase() : "VAR"}${v.color ? `-${v.color.toUpperCase().substring(0, 3)}` : ""}-${i + 1}`,
            }))
        );
    }, [sku, variants.length]);

    // Better SKU update logic: only update if auto-generated or empty
    const updateVariantSkus = (baseSku, currentVariants) => {
        return currentVariants.map((v, i) => {
            const sizePart = v.size ? v.size.toUpperCase() : "VAR";
            const colorPart = v.color ? `-${v.color.toUpperCase().substring(0, 3)}` : "";
            return {
                ...v,
                sku: `${baseSku}-${sizePart}${colorPart}-${i + 1}`
            };
        });
    };

    // Effect to update variant SKUs when base SKU or variant attributes change
    useEffect(() => {
        if (!sku) return;
        setVariants(prev => updateVariantSkus(sku, prev));
    }, [sku, JSON.stringify(variants.map(v => ({ s: v.size, c: v.color })))]);

    // Toggle variants: seed from simple attributes if enabling
    const handleToggleVariants = (enabled) => {
        setHasVariants(enabled);
        if (enabled && variants.length === 1 && !variants[0].size && !variants[0].color) {
            // Seed first variant with simple attributes
            setVariants([{
                id: variants[0].id,
                size: simpleSize,
                color: simpleColor,
                sku: variants[0].sku
            }]);
        }
    };

    const handleAddVariant = () => {
        setVariants((prev) => [
            ...prev,
            {
                id: randomId(),
                size: "",
                color: "",
                sku: "", // Will be updated by effect
            },
        ]);
    };

    const handleRemoveVariant = (id) => {
        if (variants.length <= 1) return;
        setVariants((prev) => prev.filter((v) => v.id !== id));
    };

    const handleVariantChange = (id, field, value) => {
        setVariants((prev) =>
            prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name) return toast.error("Product name is required");
        if (!sku) return toast.error("SKU is required");
        if (!supplierId) return toast.error("Supplier is required");

        const payload = {
            name,
            sku,
            supplierId,
            origin: origin === "Select" ? null : origin,
            kind: hasVariants ? "variant" : "simple",
            // Simple product fields
            ...(hasVariants ? {} : {
                sizeText: simpleSize,
                colorText: simpleColor,
            }),
            // Variant product fields
            variants: hasVariants ? variants.map((v) => ({
                sku: v.sku,
                sizeText: v.size,
                colorText: v.color,
                active: true,
            })) : [],
        };

        try {
            const res = await createProductMut(payload);
            toast.success("Product created successfully");
            onSuccess(res); // Pass created product back
            onClose();
        } catch (err) {
            toast.error(err?.message || "Failed to create product");
        }
    };

    const supplierOptions = ["Select", ...(Array.isArray(suppliers) ? suppliers.map((s) => ({ value: s.id, label: s.companyName || s.displayName || "Supplier" })) : [])];
    const sizeOptions = sizes.map(s => ({ value: s.text, label: s.text }));
    const colorOptions = colors.map(c => ({ value: c, label: c }));

    return (
        <Transition show={open} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="w-full max-w-2xl transform overflow-visible rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-4">
                                    <DialogTitle as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                        Quick Create Product
                                    </DialogTitle>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className={label}>
                                                Product Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                className={input}
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="e.g. Cotton T-Shirt"
                                            />
                                        </div>
                                        <div>
                                            <label className={label}>
                                                SKU <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                className={input}
                                                value={sku}
                                                onChange={(e) => setSku(e.target.value)}
                                                placeholder="Auto-generated"
                                            />
                                        </div>
                                        <div>
                                            <label className={label}>
                                                Supplier <span className="text-red-500">*</span>
                                            </label>
                                            <SelectCompact
                                                value={supplierId || "Select"}
                                                onChange={(val) => setSupplierId(val === "Select" ? "" : val)}
                                                options={supplierOptions}
                                                filterable
                                                disabled={loadingSuppliers}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={label}>
                                                Place of Origin
                                            </label>
                                            <SelectCompact
                                                value={origin}
                                                onChange={setOrigin}
                                                options={origins}
                                                disabled={originLoading}
                                                filterable
                                            />
                                            {originLoading && <p className="text-xs text-gray-500 mt-1">Loading countries...</p>}
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-200 pt-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="hasVariants"
                                                    className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                                    checked={hasVariants}
                                                    onChange={(e) => handleToggleVariants(e.target.checked)}
                                                />
                                                <label htmlFor="hasVariants" className="text-sm font-medium text-gray-900 select-none">
                                                    This product has variants
                                                </label>
                                            </div>
                                            {hasVariants && (
                                                <button
                                                    type="button"
                                                    onClick={handleAddVariant}
                                                    className="text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1"
                                                >
                                                    <Plus size={14} /> Add Variant
                                                </button>
                                            )}
                                        </div>

                                        {!hasVariants ? (
                                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                <div>
                                                    <label className={label}>
                                                        Size
                                                    </label>
                                                    <SelectCompact
                                                        value={simpleSize || "—"}
                                                        onChange={(v) => setSimpleSize(v === "—" ? "" : v)}
                                                        options={sizeOptions}
                                                        filterable
                                                    />
                                                </div>
                                                <div>
                                                    <label className={label}>
                                                        Color
                                                    </label>
                                                    <SelectCompact
                                                        value={simpleColor || "—"}
                                                        onChange={(v) => setSimpleColor(v === "—" ? "" : v)}
                                                        options={colorOptions}
                                                        filterable
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 pr-1">
                                                {variants.map((variant, idx) => (
                                                    <div key={variant.id} className="flex gap-2 items-center">
                                                        <div className="w-1/3">
                                                            <SelectCompact
                                                                value={variant.size || "—"}
                                                                onChange={(v) => handleVariantChange(variant.id, "size", v === "—" ? "" : v)}
                                                                options={sizeOptions}
                                                                filterable
                                                                placeholder="Size"
                                                            />
                                                        </div>
                                                        <div className="w-1/3">
                                                            <SelectCompact
                                                                value={variant.color || "—"}
                                                                onChange={(v) => handleVariantChange(variant.id, "color", v === "—" ? "" : v)}
                                                                options={colorOptions}
                                                                filterable
                                                                placeholder="Color"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <input
                                                                className={`${input} bg-gray-50 text-gray-500`}
                                                                value={variant.sku}
                                                                readOnly
                                                                placeholder="Variant SKU"
                                                            />
                                                        </div>
                                                        {variants.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveVariant(variant.id)}
                                                                className="text-gray-400 hover:text-red-500 p-1"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
                                        <button
                                            type="button"
                                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                            onClick={onClose}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="rounded-md border border-transparent bg-[#ffd026] px-4 py-2 text-sm font-semibold text-blue-700 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        >
                                            Create Product
                                        </button>
                                    </div>
                                </form>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

function randomId() {
    return Math.random().toString(36).substring(2, 9);
}
