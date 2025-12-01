import { Fragment } from "react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";

export function HeadlessSelect({ value, onChange, options, className = "", placeholder = "Select..." }) {
    const getLabel = (opt) => opt?.name || opt?.label || opt;
    const getValue = (opt) => opt?.id || opt?.value || opt;

    return (
        <Listbox value={value} onChange={onChange}>
            <div className={`relative ${className}`}>
                <ListboxButton className="relative w-full h-9 rounded-lg border border-gray-300 bg-white pl-3 pr-7 text-left text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                    <span className="block truncate">{value ? getLabel(value) : placeholder}</span>
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                        <ChevronDown size={16} className="text-gray-500" />
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
                    <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-lg focus:outline-none">
                        {options.map((opt, idx) => (
                            <ListboxOption
                                key={getValue(opt) || idx}
                                value={opt}
                                className={({ active }) =>
                                    `relative cursor-pointer select-none px-3 py-2 ${active ? "bg-gray-100 text-gray-900" : "text-gray-800"}`
                                }
                            >
                                {({ selected }) => (
                                    <div className="flex items-center gap-2">
                                        {selected ? <Check size={16} className="text-amber-700" /> : <span className="w-4" />}
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
