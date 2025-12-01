import { Fragment, useState, useRef, useEffect } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
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
}) {
  const list = Array.isArray(options) ? options : [];
  const containerRef = useRef(null);
  const [position, setPosition] = useState("bottom");

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

  // Calculate position on open
  const handleOpen = () => {
    setQuery("");
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // Assume max height of dropdown is around 250px
      if (spaceBelow < 250 && rect.top > 250) {
        setPosition("top");
      } else {
        setPosition("bottom");
      }
    }
  };

  const ADD_NEW_SENTINEL = "__ADD_NEW_SENTINEL__";

  return (
    <Listbox
      value={value}
      onChange={(val) => {
        if (val === ADD_NEW_SENTINEL) {
          onAddNew?.();
          setQuery("");
          return;
        }
        onChange(val);
        setQuery("");
      }}
      disabled={disabled}
    >
      {({ open }) => {
        // Recalculate position when opening
        useEffect(() => {
          if (open) handleOpen();
        }, [open]);

        return (
          <div className="relative" ref={containerRef}>
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
              leaveTo="opacity-0 scale-95"
            >
              <ListboxOptions
                className={`absolute z-[200] max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 text-[12px] shadow-lg focus:outline-none ${position === "top" ? "bottom-full mb-1" : "top-full mt-1"
                  }`}
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
                  })
                )}

                {onAddNew && (
                  <ListboxOption
                    value={ADD_NEW_SENTINEL}
                    className={({ active }) =>
                      `cursor-pointer select-none px-2 py-1.5 border-t border-gray-100 ${active ? "bg-amber-50" : ""
                      }`
                    }
                  >
                    <div className="flex items-center gap-2 text-amber-700 font-medium">
                      <Plus size={14} />
                      <span>{addNewLabel}</span>
                    </div>
                  </ListboxOption>
                )}
              </ListboxOptions>
            </Transition>
          </div>
        );
      }}
    </Listbox>
  );
}
