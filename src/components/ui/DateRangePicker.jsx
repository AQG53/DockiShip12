import React, { forwardRef, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar as CalendarIcon, X } from "lucide-react";

// Custom Input Component to match your UI
const CustomInput = forwardRef(({ value, onClick, placeholder, onClear, hasValue }, ref) => (
    <div className="relative group w-full">
        <button
            onClick={onClick}
            ref={ref}
            type="button"
            className={`flex items-center justify-between gap-2 px-3 h-9 text-sm font-medium border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full ${hasValue
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
                }`}
        >
            <div className="flex items-center gap-2">
                <CalendarIcon size={16} className={hasValue ? "text-emerald-500" : "text-gray-400"} />
                <span className="truncate">{value || placeholder}</span>
            </div>
            {hasValue && (
                <div
                    role="button"
                    tabIndex={0}
                    className="p-0.5 rounded-full hover:bg-emerald-200/50 cursor-pointer z-10"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClear();
                    }}
                >
                    <X size={14} />
                </div>
            )}
        </button>
    </div>
));
CustomInput.displayName = "CustomInput";

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

const getWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = atStartOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday));
    const end = atEndOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
    return { from: start, to: end };
};

const getMonthRange = () => {
    const now = new Date();
    const start = atStartOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    const end = atEndOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return { from: start, to: end };
};

const getYearRange = () => {
    const now = new Date();
    const start = atStartOfDay(new Date(now.getFullYear(), 0, 1));
    const end = atEndOfDay(new Date(now.getFullYear(), 11, 31));
    return { from: start, to: end };
};

export default function DateRangePicker({ date, setDate, showQuickPresets = true }) {
    const handleChange = (update) => {
        // update is [start, end] when selectsRange is true
        const [start, end] = update;
        setDate({ from: start, to: end });
    };

    const handleClear = () => {
        setDate(undefined);
    };

    const startDate = date?.from;
    const endDate = date?.to;
    const presets = useMemo(() => ([
        { id: "week", label: "This Week", range: getWeekRange() },
        { id: "month", label: "This Month", range: getMonthRange() },
        { id: "year", label: "This Year", range: getYearRange() },
    ]), []);

    const isSameDay = (a, b) => {
        if (!a || !b) return false;
        return atStartOfDay(a).getTime() === atStartOfDay(b).getTime();
    };

    const activePreset = presets.find((preset) =>
        isSameDay(startDate, preset.range.from) && isSameDay(endDate, preset.range.to)
    )?.id;

    // Formatting custom header if needed, but default is usually fine.
    // We inject custom CSS style block for Emerald theme overrides.

    return (
        <div className="relative z-50 w-full">
            <style>{`
                .react-datepicker-popper {
                    z-index: 9999 !important;
                }
                .react-datepicker-wrapper {
                    width: 100%;
                }
                .react-datepicker {
                    font-family: inherit;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.75rem;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
                    font-size: 0.9rem;
                }
                .react-datepicker__header {
                    background-color: #f9fafb;
                    border-bottom: 1px solid #e5e7eb;
                    border-top-left-radius: 0.75rem;
                    border-top-right-radius: 0.75rem;
                    padding-top: 1rem;
                }
                .react-datepicker__triangle {
                    display: none;
                }
                .react-datepicker__day-name {
                    color: #6b7280;
                    font-weight: 600;
                    margin: 0.4rem;
                }
                .react-datepicker__day {
                    margin: 0.4rem;
                    border-radius: 0.5rem;
                    font-weight: 500;
                }
                .react-datepicker__day--selected, 
                .react-datepicker__day--in-selecting-range, 
                .react-datepicker__day--in-range {
                    background-color: #10b981 !important;
                    color: white !important;
                }
                .react-datepicker__day--in-selecting-range:not(.react-datepicker__day--in-range) {
                    background-color: #a7f3d0 !important; /* Lighter emerald for preview */
                    color: #064e3b !important;
                }
                .react-datepicker__day--keyboard-selected {
                    background-color: #d1fae5 !important;
                    color: #065f46 !important;
                }
                .react-datepicker__day:hover {
                    background-color: #f3f4f6 !important;
                }
                .react-datepicker__day--selected:hover,
                .react-datepicker__day--in-range:hover {
                    background-color: #059669 !important;
                }
                .react-datepicker__month-select,
                .react-datepicker__year-select {
                    padding: 2px 4px;
                    border-radius: 4px;
                    border: 1px solid #d1d5db;
                    margin: 0 4px;
                    cursor: pointer;
                    background: white;
                }
            `}</style>

            <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={handleChange}
                customInput={
                    <CustomInput
                        onClear={handleClear}
                        hasValue={!!startDate}
                    />
                }
                placeholderText="Filter by date"
                dateFormat="MMM d, yyyy"
                isClearable={false} // We handle clearing manually via the X icon
                shouldCloseOnSelect={false} // Keep open to pick range end? Default logic usually handles it.
                // Actually, standard behavior: close after endDate selection.
                // We let default behavior run.
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                popperProps={{
                    strategy: "fixed",
                }}
            >
                {showQuickPresets && (
                    <div className="px-2 pt-2 pb-1 border-b border-gray-200">
                        <div className="flex flex-wrap gap-1.5">
                            {presets.map((preset) => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => setDate(preset.range)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${activePreset === preset.id
                                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent"
                                        }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <div className="flex items-center justify-end p-2 border-t border-gray-200">
                    <button
                        onClick={handleClear}
                        className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors px-2 py-1 bg-red-50 hover:bg-red-100 rounded"
                    >
                        Reset
                    </button>
                </div>
            </DatePicker>
        </div>
    );
}
