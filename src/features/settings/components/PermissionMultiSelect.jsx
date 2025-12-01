// components/PermissionMultiSelect.jsx
import React, { Fragment, useMemo } from "react";
import { Popover, Transition } from "@headlessui/react";
import { Check, ChevronDown, X } from "lucide-react";

export default function PermissionMultiSelect({
  label = "Select actions",
  actions = [],                 // ["create","read","update","delete"]
  value = [],                   // ["create","read"]
  onChange = () => {},
  className = "",
}) {
  const selectedSet = useMemo(() => new Set(value), [value]);
  const allSelected = value.length === actions.length && actions.length > 0;

  const toggle = (a) => {
    const next = new Set(selectedSet);
    if (next.has(a)) next.delete(a);
    else next.add(a);
    onChange(Array.from(next));
  };

  const selectAll = () => onChange([...actions]);
  const clearAll = () => onChange([]);

  // Nice compact summary for the button
  const summary = useMemo(() => {
    if (value.length === 0) return "No actions";
    if (value.length === actions.length) return "All actions";
    if (value.length <= 2) return value.join(", ");
    return `${value.slice(0, 2).join(", ")} +${value.length - 2}`;
  }, [value, actions.length]);

  return (
    <Popover className={`relative ${className}`}>
      <Popover.Button
        className="w-full inline-flex items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-600">{label}:</span>
          <span className="font-medium">{summary}</span>
        </div>
        <ChevronDown size={16} className="text-gray-500" />
      </Popover.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Popover.Panel className="absolute z-50 mt-2 w-[min(420px,92vw)] rounded-xl border border-gray-200 bg-white shadow-lg">
          {/* Header actions */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <div className="text-xs text-gray-600">
              {value.length} selected
              {actions.length > 0 ? ` · ${actions.length} available` : ""}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearAll}
                className="text-xs px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={selectAll}
                className={`text-xs px-2 py-1 rounded-md border ${allSelected ? "border-gray-200 text-gray-400 cursor-not-allowed" : "border-gray-300 hover:bg-gray-50"}`}
                disabled={allSelected}
              >
                Select all
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="max-h-64 overflow-auto p-2">
            {actions.length === 0 ? (
              <div className="text-sm text-gray-500 px-2 py-3">No actions found.</div>
            ) : (
              <ul className="space-y-1">
                {actions.map((a) => {
                  const checked = selectedSet.has(a);
                  return (
                    <li key={a}>
                      <button
                        type="button"
                        onClick={() => toggle(a)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm ${checked ? "bg-blue-50 text-blue-800 border border-blue-200" : "hover:bg-gray-50 border border-transparent"} transition`}
                      >
                        <span className="capitalize">{a}</span>
                        <span
                          className={`w-5 h-5 inline-flex items-center justify-center rounded-md border ${checked ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 text-transparent"}`}
                          aria-hidden="true"
                        >
                          <Check size={14} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Selected chips */}
          {value.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                {value.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-100 px-2 py-1 text-xs"
                  >
                    {a}
                    <button
                      type="button"
                      onClick={() => toggle(a)}
                      className="p-0.5 hover:text-red-600"
                      aria-label={`Remove ${a}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}
