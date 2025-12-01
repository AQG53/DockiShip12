import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Loader2 } from "lucide-react";

// Reusable searchable select with inline “+ Add” when no match
// Props:
// - value: string | any
// - onChange(value)
// - options: Array<string | { value, label }>
// - placeholder?: string
// - disabled?: boolean
// - loading?: boolean
// - allowAdd?: boolean (default true)
// - onAdd?: async (query) => ({ value, label } | string | void)
// - normalize?: (opt) => { value, label }
const SelectSearchAdd = forwardRef(function SelectSearchAdd({
  value,
  onChange,
  options = [],
  placeholder = "Select",
  searchPlaceholder,
  disabled = false,
  loading = false,
  allowAdd = true,
  onAdd,
  normalize,
}, ref) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const list = useMemo(() => {
    const norm = (opt) => {
      if (normalize) return normalize(opt);
      if (typeof opt === 'string') return { value: opt, label: opt };
      const v = opt?.value ?? opt?.id ?? '';
      const l = opt?.label ?? opt?.name ?? String(v);
      return { value: v, label: l };
    };
    return (options || []).map(norm).filter(o => o.value && o.label);
  }, [options, normalize]);

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase();
    if (!q) return list;
    return list.filter(o => o.label.toLowerCase().includes(q));
  }, [list, query]);

  const selectedLabel = useMemo(() => {
    const hit = list.find(o => String(o.value) === String(value));
    return hit?.label ?? (typeof value === 'string' ? value : '');
  }, [list, value]);

  const canAdd = allowAdd && !!onAdd && (query?.trim()?.length > 0) && !filtered.some(o => o.label.toLowerCase() === query.trim().toLowerCase());

  const inputCls = "h-8 w-full rounded-lg border border-gray-300 bg-white px-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
    focus: () => buttonRef.current?.focus(),
  }), []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        className={`flex w-full items-center justify-between h-8 px-2 rounded-lg border ${disabled ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-gray-900 border-gray-300'} text-[13px]`}
        onClick={() => setOpen(o => !o)}
        title={selectedLabel || placeholder}
        ref={buttonRef}
      >
        <span className="truncate text-left mr-2">{selectedLabel || placeholder}</span>
        <ChevronDown size={16} className="text-gray-500" />
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="p-2">
            <input
              className={inputCls}
              placeholder={searchPlaceholder || placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="max-h-56 overflow-auto">
            {loading ? (
              <div className="px-3 py-2 text-[12px] text-gray-600 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>
            ) : (
              <>
                {filtered.length > 0 && filtered.map(o => (
                  <div
                    key={String(o.value)}
                    className="px-3 py-2 text-[13px] hover:bg-gray-50 cursor-pointer"
                    onClick={() => { onChange?.(o.value); setOpen(false); setQuery(""); }}
                  >
                    {o.label}
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="px-3 py-2 text-[12px] text-gray-600">No matches</div>
                )}
                {canAdd && (
                  <button
                    type="button"
                    className="m-2 inline-flex items-center gap-1 h-8 px-2 rounded-md bg-amber-100 text-amber-900 text-[12px] hover:bg-amber-200 disabled:opacity-50"
                    disabled={adding}
                    onClick={async () => {
                      if (!onAdd) return;
                      try {
                        setAdding(true);
                        const res = await onAdd(query.trim());
                        const nextVal = typeof res === 'string' ? res : (res?.value ?? res?.id ?? query.trim());
                        onChange?.(nextVal);
                        setOpen(false);
                        setQuery("");
                      } finally {
                        setAdding(false);
                      }
                    }}
                  >
                    {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add "{query.trim()}"
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default SelectSearchAdd;
