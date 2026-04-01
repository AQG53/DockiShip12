import { Fragment, useState, useEffect } from "react";
import { Popover, Transition } from "@headlessui/react";
import { ListFilter, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { HeadlessSelect } from "../../../components/ui/HeadlessSelect";
import DateRangePicker from "../../../components/ui/DateRangePicker";

const atStartOfDay = (value) => {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
};

const atEndOfDay = (value) => {
    const d = new Date(value);
    d.setHours(23, 59, 59, 999);
    return d;
};

const getLastMonthRange = () => {
    const now = new Date();
    const start = atStartOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const end = atEndOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    return { from: start, to: end };
};

const getLastWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const diffToCurrentMonday = day === 0 ? -6 : 1 - day;
    const currentWeekStart = atStartOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToCurrentMonday));
    const start = atStartOfDay(new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() - 7));
    const end = atEndOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
    return { from: start, to: end };
};

const isSameDay = (a, b) => {
    if (!a || !b) return false;
    return atStartOfDay(a).getTime() === atStartOfDay(b).getTime();
};

export default function OrdersFilter({
    filters, // { search, status, medium, courier, remark, dateRange, partialDeliveredOnly }
    options, // { statusOptions, mediumOptions, courierOptions, remarkOptions }
    onApply,
    statusReadOnly = false,
    defaultDateRange
}) {
    // Buffered State
    const [localFilters, setLocalFilters] = useState(filters);

    // Sync when popover opens (via key or manual reset, but mainly we init state once)
    // Actually, we want to reset local state to current actual filters whenever the popover *opens*.
    // But Headless UI Popover unmounts contents by default? No, usually keeps. 
    // We'll trust the parent re-renders or we sync in useEffect.
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
            status: options.statusOptions[0],
            medium: options.mediumOptions[0],
            courier: options.courierOptions[0],
            remark: options.remarkOptions[0],
            dateRange: defaultDateRange,
            settled: { id: "all", name: "All" },
            partialDeliveredOnly: false,
        });
    };

    const hasActiveFilters =
        localFilters.search ||
        localFilters.status?.id !== "ALL" ||
        localFilters.medium?.id ||
        localFilters.courier?.id ||
        localFilters.remark?.id ||
        localFilters.dateRange?.from ||
        localFilters.partialDeliveredOnly;

    const showPartialDeliveredToggle = statusReadOnly && localFilters.status?.id === "DELIVERED";
    const lastMonthRange = getLastMonthRange();
    const lastWeekRange = getLastWeekRange();
    const isLastMonthActive = isSameDay(localFilters.dateRange?.from, lastMonthRange.from) && isSameDay(localFilters.dateRange?.to, lastMonthRange.to);
    const isLastWeekActive = isSameDay(localFilters.dateRange?.from, lastWeekRange.from) && isSameDay(localFilters.dateRange?.to, lastWeekRange.to);

    return (
        <Popover className="relative">
            {({ close }) => (
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
                                {/* Search removed from here */}

                                {/* Date Range */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-700">Date range</label>
                                    </div>
                                    <DateRangePicker
                                        date={localFilters.dateRange}
                                        setDate={(range) => setLocalFilters(prev => ({ ...prev, dateRange: range }))}
                                    />
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setLocalFilters(prev => ({ ...prev, dateRange: lastMonthRange }))}
                                            className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${isLastMonthActive
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                                                }`}
                                        >
                                            Last Month
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setLocalFilters(prev => ({ ...prev, dateRange: lastWeekRange }))}
                                            className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${isLastWeekActive
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                                                }`}
                                        >
                                            Last Week
                                        </button>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-700">Status</label>
                                        {!statusReadOnly && localFilters.status?.id !== "ALL" && (
                                            <button
                                                onClick={() => setLocalFilters(prev => ({ ...prev, status: options.statusOptions[0] }))}
                                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-stretch gap-2">
                                        <HeadlessSelect
                                            value={localFilters.status}
                                            onChange={(val) => !statusReadOnly && setLocalFilters(prev => ({ ...prev, status: val }))}
                                            options={options.statusOptions}
                                            className={`min-w-0 flex-1 ${statusReadOnly ? "opacity-60 cursor-not-allowed pointer-events-none" : ""}`}
                                        />
                                        {showPartialDeliveredToggle && (
                                            <button
                                                type="button"
                                                onClick={() => setLocalFilters(prev => ({ ...prev, partialDeliveredOnly: !prev.partialDeliveredOnly }))}
                                                title="Show only partially delivered orders"
                                                className={`shrink-0 rounded-lg border px-3 text-xs font-medium transition-colors ${localFilters.partialDeliveredOnly
                                                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                                                    : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                                                    }`}
                                            >
                                                Partially Delivered
                                            </button>
                                        )}
                                    </div>
                                    {statusReadOnly && (
                                        <p className="text-[11px] text-gray-400">
                                            Status is locked for this view.
                                        </p>
                                    )}
                                </div>

                                {/* Medium */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-700">Medium</label>
                                        {localFilters.medium?.id && (
                                            <button
                                                onClick={() => setLocalFilters(prev => ({ ...prev, medium: options.mediumOptions[0] }))}
                                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                    <HeadlessSelect
                                        value={localFilters.medium}
                                        onChange={(val) => setLocalFilters(prev => ({ ...prev, medium: val }))}
                                        options={options.mediumOptions}
                                        className="w-full"
                                    />
                                </div>

                                {/* Courier */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-700">Courier</label>
                                        {localFilters.courier?.id && (
                                            <button
                                                onClick={() => setLocalFilters(prev => ({ ...prev, courier: options.courierOptions[0] }))}
                                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                    <HeadlessSelect
                                        value={localFilters.courier}
                                        onChange={(val) => setLocalFilters(prev => ({ ...prev, courier: val }))}
                                        options={options.courierOptions}
                                        className="w-full"
                                    />
                                </div>

                                {/* Remarks */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-700">Remarks</label>
                                        {localFilters.remark?.id && (
                                            <button
                                                onClick={() => setLocalFilters(prev => ({ ...prev, remark: options.remarkOptions[0] }))}
                                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                    <HeadlessSelect
                                        value={localFilters.remark}
                                        onChange={(val) => setLocalFilters(prev => ({ ...prev, remark: val }))}
                                        options={options.remarkOptions}
                                        className="w-full"
                                    />
                                </div>

                                {/* Settled */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-700">Settlement</label>
                                        {localFilters.settled?.id && localFilters.settled?.id !== "all" && (
                                            <button
                                                onClick={() => setLocalFilters(prev => ({ ...prev, settled: { id: "all", name: "All" } }))}
                                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                    <HeadlessSelect
                                        value={localFilters.settled || { id: "all", name: "All" }}
                                        onChange={(val) => setLocalFilters(prev => ({ ...prev, settled: val }))}
                                        options={[
                                            { id: "all", name: "All" },
                                            { id: "true", name: "Settled Only" },
                                            { id: "false", name: "Unsettled Only" }
                                        ]}
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
