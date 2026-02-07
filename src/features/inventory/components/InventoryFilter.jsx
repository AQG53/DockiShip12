import { Fragment, useState, useEffect } from "react";
import { Popover, Transition } from "@headlessui/react";
import { ListFilter, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { HeadlessSelect } from "../../../components/ui/HeadlessSelect";

export default function InventoryFilter({
    filters, // { search, warehouse, stockStatus }
    options, // { warehouseOptions }
    onApply,
}) {
    // Buffered State
    const [localFilters, setLocalFilters] = useState(filters);

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    const handleApply = (close) => {
        onApply(localFilters);
        close();
    };

    const handleReset = () => {
        setLocalFilters({
            search: "",
            warehouse: { id: "", name: "All Warehouses" },
            stockStatus: { id: "", name: "All Stock Status" },
        });
    };

    const hasActiveFilters =
        localFilters.search ||
        localFilters.warehouse?.id ||
        localFilters.stockStatus?.id;

    const stockStatusOptions = [
        { id: "", name: "All Stock Status" },
        { id: "in_stock", name: "In Stock" },
        { id: "low_stock", name: "Low Stock" },
        { id: "out_of_stock", name: "Out of Stock" },
    ];

    return (
        <Popover className="relative">
            {({ open, close }) => (
                <>
                    <Popover.Button as={Button} variant="secondary" className="flex items-center gap-2 h-9 px-4 rounded-lg font-medium text-[13px] shadow-sm transition-all focus:ring-2 focus:ring-emerald-500/20 active:scale-95">
                        <ListFilter size={16} className="text-gray-500" />
                        <span>Filter</span>
                        {hasActiveFilters && (
                            <span className="ml-1 flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                        )}
                    </Popover.Button>

                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1"
                    >
                        <Popover.Panel className="absolute left-0 z-50 mt-2 w-[340px] origin-top-left rounded-xl bg-white shadow-2xl focus:outline-none">
                            <div className="flex items-center justify-between border-b px-4 py-3">
                                <h3 className="font-semibold text-gray-900">Filter</h3>
                                <button
                                    onClick={() => close()}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="max-h-[70vh] overflow-y-auto p-4 space-y-5">

                                {/* Warehouse */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-700">Warehouse</label>
                                        {localFilters.warehouse?.id && (
                                            <button
                                                onClick={() => setLocalFilters(prev => ({ ...prev, warehouse: { id: "", name: "All Warehouses" } }))}
                                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                    <HeadlessSelect
                                        value={localFilters.warehouse || { id: "", name: "All Warehouses" }}
                                        onChange={(val) => setLocalFilters(prev => ({ ...prev, warehouse: val }))}
                                        options={[{ id: "", name: "All Warehouses" }, ...(options.warehouseOptions || [])]}
                                        className="w-full"
                                    />
                                </div>

                                {/* Stock Status */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-700">Stock Status</label>
                                        {localFilters.stockStatus?.id && (
                                            <button
                                                onClick={() => setLocalFilters(prev => ({ ...prev, stockStatus: { id: "", name: "All Stock Status" } }))}
                                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                    <HeadlessSelect
                                        value={localFilters.stockStatus || { id: "", name: "All Stock Status" }}
                                        onChange={(val) => setLocalFilters(prev => ({ ...prev, stockStatus: val }))}
                                        options={stockStatusOptions}
                                        className="w-full"
                                    />
                                </div>

                            </div>

                            <div className="flex items-center justify-between border-t px-4 py-3 bg-gray-50 rounded-b-xl">
                                <Button
                                    variant="ghost"
                                    onClick={handleReset}
                                    className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 font-medium"
                                >
                                    Reset all
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => handleApply(close)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium px-6"
                                >
                                    Apply now
                                </Button>
                            </div>
                        </Popover.Panel>
                    </Transition>
                </>
            )}
        </Popover>
    );
}
