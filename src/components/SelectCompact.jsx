import { useState, useEffect } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { Check, ChevronDown, Plus } from "lucide-react";

export default function SelectCompact({
  value,
  onChange,
  options,
  buttonClassName = "",
  renderOption,
  disabled = false,
  filterable = false,
  onAddNew,
  addNewLabel = "Add New",
  placeholder,
  multiple = false,
  onSearch,
  hideCheck = false,
}) {
  const list = Array.isArray(options) ? options : [];

  const getOptValue = (opt) => (typeof opt === "string" ? opt : opt?.value ?? "");
  const getOptLabel = (opt) =>
    typeof opt === "string" ? opt : opt?.label ?? getOptValue(opt);

  const currentLabel = (() => {
    if (multiple) {
      if (!Array.isArray(value) || value.length === 0) return placeholder || "Select";
      if (value.length === 1) {
        const val = value[0];
        const found = list.find((opt) => (typeof opt === "string" ? opt === val : opt?.value === val));
        return found ? getOptLabel(found) : String(val);
      }
      return `${value.length} selected`;
    }
    if (!value && placeholder) return placeholder;
    if (value === "Select") return "Select";
    const found = list.find((opt) =>
      typeof opt === "string" ? opt === value : opt?.value === value,
    );
    if (!found) return String(value ?? "");
    return getOptLabel(found);
  })();

  const [query, setQuery] = useState("");

  // Debounce search callback
  useEffect(() => {
    if (!onSearch) return;
    const timeout = setTimeout(() => {
      onSearch(query);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, onSearch]);

  const filtered =
    !filterable || !query
      ? list
      // If onSearch is provided, we assume the parent handles filtering (server-side),
      // so we show the list as-is (which should be the search results).
      // Otherwise client-side filter:
      : (onSearch ? list : list.filter((opt) =>
        String(getOptLabel(opt)).toLowerCase().includes(query.toLowerCase()),
      ));

  const ADD_NEW_SENTINEL = "__ADD_NEW_SENTINEL__";

  const isPlaceholder = (!value || (multiple && value.length === 0)) && !!placeholder;

  return (
    <Listbox
      value={value}
      multiple={multiple}
      onChange={(val) => {
        if (val === ADD_NEW_SENTINEL) {
          onAddNew?.();
          setQuery("");
          if (onSearch) onSearch("");
          return;
        }
        onChange(val);
        if (!multiple) {
          setQuery("");
          if (onSearch) onSearch("");
        }
      }}
      disabled={disabled}
    >
      <div className="relative">
        <ListboxButton
          className={`relative w-full h-8 rounded-lg border border-gray-300 bg-white pl-2 pr-7 text-left text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900/10 ${disabled ? "opacity-60 cursor-not-allowed" : ""
            } ${buttonClassName} ${isPlaceholder ? "text-gray-400" : "text-gray-900"}`}
        >
          <span className="block truncate">{currentLabel}</span>
          <span className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center">
            <ChevronDown size={16} className="text-gray-500" />
          </span>
        </ListboxButton>

        <ListboxOptions
          anchor="bottom start"
          transition
          className="w-[var(--button-width)] [--anchor-gap:4px] z-[5000] max-h-56 overflow-auto rounded-xl border border-gray-200 bg-white py-1 text-[12px] shadow-lg focus:outline-none transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0"
        >
          {filterable && (
            <div className="px-2 pb-1 sticky top-0 bg-white z-10">
              <input
                type="text"
                placeholder="Search..."
                className="w-full h-7 rounded-md border border-gray-300 px-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          {filtered.length === 0 && !onAddNew ? (
            <div className="px-2 py-2 text-gray-500 text-center italic">No options</div>
          ) : (
            filtered.map((opt) => {
              const val = getOptValue(opt);
              const lab = getOptLabel(opt);
              return (
                <ListboxOption
                  key={String(val || lab)}
                  value={val}
                  className="group cursor-pointer select-none px-2 py-1 data-[focus]:bg-gray-100 data-[focus]:text-gray-900 text-gray-800"
                >
                  <div className="flex items-center gap-2">
                    {!hideCheck && (
                      <div className="w-[14px]">
                        <Check size={14} className="text-amber-700 hidden group-data-[selected]:block" />
                      </div>
                    )}
                    <span className="block truncate">
                      {renderOption ? renderOption(opt) : lab}
                    </span>
                  </div>
                </ListboxOption>
              );
            })
          )}

          {onAddNew && (
            <ListboxOption
              value={ADD_NEW_SENTINEL}
              className="cursor-pointer select-none px-2 py-1.5 border-t border-gray-100 data-[focus]:bg-amber-50"
            >
              <div className="flex items-center gap-2 text-amber-700 font-medium">
                <Plus size={14} />
                <span>{addNewLabel}</span>
              </div>
            </ListboxOption>
          )}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
