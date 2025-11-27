import { Fragment, useState } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";

export default function SelectCompact({
  value,
  onChange,
  options,
  buttonClassName = "",
  renderOption,
  disabled = false,
  filterable = false,
}) {
  const list = Array.isArray(options) ? options : [];

  const getOptValue = (opt) => (typeof opt === "string" ? opt : opt?.value ?? "");
  const getOptLabel = (opt) =>
    typeof opt === "string" ? opt : opt?.label ?? getOptValue(opt);

  const currentLabel = (() => {
    if (value === "Select") return "Select";
    const found = list.find((opt) =>
      typeof opt === "string" ? opt === value : opt?.value === value,
    );
    if (!found) return String(value ?? "");
    return getOptLabel(found);
  })();

  const [query, setQuery] = useState("");
  const filtered =
    !filterable || !query
      ? list
      : list.filter((opt) =>
          String(getOptLabel(opt)).toLowerCase().includes(query.toLowerCase()),
        );

  return (
    <Listbox
      value={value}
      onChange={(val) => {
        onChange(val);
        setQuery("");
      }}
      disabled={disabled}
    >
      <div className="relative">
        <ListboxButton
          onClick={() => setQuery("")}
          className={`relative w-full h-8 rounded-lg border border-gray-300 bg-white pl-2 pr-7 text-left text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
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
          leaveTo="opacity-0 scale-95"
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
                    `cursor-pointer select-none px-2 py-1 ${
                      active ? "bg-gray-100 text-gray-900" : "text-gray-800"
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
