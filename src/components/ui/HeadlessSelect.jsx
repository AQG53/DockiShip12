import { Fragment } from "react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";

export function HeadlessSelect({ value, onChange, options, className = "", placeholder = "Select...", size = "default" }) {
    const getLabel = (opt) => opt?.name || opt?.label || opt;
    const getValue = (opt) => opt?.id || opt?.value || opt;

    const heightClass = size === "sm" ? "h-7" : "h-9";
    const textClass = size === "sm" ? "text-[12px]" : "text-[13px]";

    return (
        <Listbox value={value} onChange={onChange}>
            <div className={`relative ${className}`}>
                <ListboxButton className={`relative w-full ${heightClass} rounded-lg border border-gray-300 bg-white pl-3 pr-7 text-left ${textClass} text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10`}>
                    <span className="block truncate">{value ? getLabel(value) : placeholder}</span>
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                        <ChevronDown size={size === "sm" ? 14 : 16} className="text-gray-500" />
                    </span>
                </ListboxButton>
                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                >
                    <ListboxOptions portal anchor="bottom start" className="z-[60] mt-1 max-h-60 min-w-[var(--button-width)] overflow-auto rounded-xl border border-gray-200 bg-white py-1 text-[13px] shadow-lg focus:outline-none">
                        {options.map((opt, idx) => (
                            <ListboxOption
                                key={getValue(opt) || idx}
                                value={opt}
                                className={({ active }) =>
                                    `relative cursor-pointer select-none px-3 py-1.5 ${active ? "bg-gray-100 text-gray-900" : "text-gray-800"}`
                                }
                            >
                                {({ selected }) => (
                                    <div className="flex items-center gap-2">
                                        {selected ? <Check size={14} className="text-amber-700" /> : <span className="w-3.5" />}
                                        <span className="block truncate">{getLabel(opt)}</span>
                                    </div>
                                )}
                            </ListboxOption>
                        ))}
                    </ListboxOptions>
                </Transition>
            </div>
        </Listbox>
    );
}
