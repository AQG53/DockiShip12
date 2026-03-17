import { useEffect, useMemo, useState } from "react";
import { ArrowUpToLine, Eraser, Info, Minus, Plus } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { absOrderImage, ORDER_IMG_PLACEHOLDER, resolveOrderItemImage } from "../utils/orderItemImage";

const inputClass =
  "h-8 rounded-md border border-gray-300 px-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 w-20 text-center";

const getItemLabel = (item) => {
  const base =
    item?.productDescription
    || item?.channelListing?.productName
    || item?.channelListing?.product?.name
    || "Order Item";
  const sku = item?.channelListing?.productVariant?.sku || item?.channelListing?.externalSku || "";
  return sku ? `${base} (${sku})` : base;
};

const toInt = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
};

export default function ReturnOrderModal({
  open,
  onClose,
  order,
  isLoading,
  title = "Process Return",
  confirmLabel = "Apply Return",
  onSubmit,
}) {
  const [qtyMap, setQtyMap] = useState({});
  const [note, setNote] = useState("");
  const returnedUnitsByItem = useMemo(() => {
    const map = new Map();
    const records = Array.isArray(order?.returnRecords) ? order.returnRecords : [];
    records.forEach((record) => {
      const items = Array.isArray(record?.items) ? record.items : [];
      items.forEach((item) => {
        const orderItemId = item?.orderItemId;
        if (!orderItemId) return;
        const unitsPerQty = Math.max(1, toInt(item?.unitsPerQty ?? 1));
        const returnedQty = toInt(item?.returnedQty ?? 0);
        const restockedUnits = toInt(item?.restockedUnits ?? (returnedQty * unitsPerQty));
        if (restockedUnits <= 0) return;
        map.set(orderItemId, (map.get(orderItemId) || 0) + restockedUnits);
      });
    });
    return map;
  }, [order?.returnRecords]);

  const rows = useMemo(() => {
    const items = Array.isArray(order?.items) ? order.items : [];
    return items.map((item) => {
      const availableQty = Math.max(0, toInt(item?.quantity));
      const units = Math.max(1, toInt(item?.channelListing?.units || 1));
      const previouslyReturnedUnits = toInt(returnedUnitsByItem.get(item.id) || 0);
      const remainderUnits = previouslyReturnedUnits % units;
      const availableUnits = Math.max(0, (availableQty * units) - remainderUnits);
      return {
        id: item.id,
        label: getItemLabel(item),
        imageUrl: resolveOrderItemImage(item),
        availableQty,
        units,
        availableUnits,
      };
    });
  }, [order, returnedUnitsByItem]);

  useEffect(() => {
    if (!open) return;
    const next = {};
    rows.forEach((row) => {
      next[row.id] = "";
    });
    setQtyMap(next);
    setNote("");
  }, [open, rows]);

  const totals = useMemo(() => {
    let selectedLines = 0;
    let totalUnits = 0;
    let totalQtyEquivalent = 0;

    rows.forEach((row) => {
      const units = Math.min(row.availableUnits, toInt(qtyMap[row.id]));
      if (units > 0) {
        selectedLines += 1;
        totalUnits += units;
        totalQtyEquivalent += units / row.units;
      }
    });

    return { selectedLines, totalUnits, totalQtyEquivalent };
  }, [rows, qtyMap]);

  const setQty = (rowId, rawValue, maxUnits) => {
    const clean = String(rawValue ?? "").replace(/[^0-9]/g, "");
    if (!clean) {
      setQtyMap((prev) => ({ ...prev, [rowId]: "" }));
      return;
    }

    const value = Math.min(maxUnits, toInt(clean));
    setQtyMap((prev) => ({ ...prev, [rowId]: String(value) }));
  };

  const nudgeQty = (rowId, delta, maxUnits) => {
    setQtyMap((prev) => {
      const current = toInt(prev[rowId]);
      const next = Math.max(0, Math.min(maxUnits, current + delta));
      return { ...prev, [rowId]: next === 0 ? "" : String(next) };
    });
  };

  const setRowToMax = (rowId, maxUnits) => {
    setQtyMap((prev) => ({ ...prev, [rowId]: maxUnits > 0 ? String(maxUnits) : "" }));
  };

  const handleReturnAll = () => {
    const next = {};
    rows.forEach((row) => {
      next[row.id] = row.availableUnits > 0 ? String(row.availableUnits) : "";
    });
    setQtyMap(next);
  };

  const handleClearAll = () => {
    const next = {};
    rows.forEach((row) => {
      next[row.id] = "";
    });
    setQtyMap(next);
  };

  const handleSubmit = async () => {
    const returns = rows
      .map((row) => {
        const units = Math.min(row.availableUnits, toInt(qtyMap[row.id]));
        if (units <= 0) return null;
        return {
          orderItemId: row.id,
          returnUnits: units,
        };
      })
      .filter(Boolean);

    if (returns.length === 0) {
      return;
    }

    await onSubmit?.({
      returns,
      returnNote: note.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={order?.orderId ? `${title} - ${order.orderId}` : title}
      widthClass="max-w-3xl"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button variant="warning" onClick={handleSubmit} isLoading={isLoading} disabled={totals.selectedLines === 0}>
            {confirmLabel}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900 flex items-start gap-2">
          <Info size={14} className="mt-0.5 text-blue-700 flex-shrink-0" />
          <div>
            <p className="font-medium">Select returned units received from customer for each item.</p>
            <p className="mt-0.5 text-blue-800/90">Use <span className="font-semibold">Return All</span> to auto-fill all lines to available units.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Selected Lines</p>
            <p className="text-lg font-semibold text-gray-900">{totals.selectedLines}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Return Units</p>
            <p className="text-lg font-semibold text-gray-900">{totals.totalUnits}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Qty Equivalent</p>
            <p className="text-lg font-semibold text-gray-900">{totals.totalQtyEquivalent.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <p className="text-xs text-gray-600">Quick actions</p>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="secondary"
              onClick={handleClearAll}
              disabled={rows.length === 0}
            >
              <Eraser size={13} className="mr-1" /> Clear All
            </Button>
            <Button
              size="xs"
              variant="secondary"
              onClick={handleReturnAll}
              disabled={rows.length === 0}
            >
              <ArrowUpToLine size={13} className="mr-1" /> Return All
            </Button>
          </div>
        </div>

        <div className="max-h-[50vh] overflow-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Product</th>
                <th className="px-3 py-2 text-center font-medium">Quantity</th>
                <th className="px-3 py-2 text-center font-medium">Units</th>
                <th className="px-3 py-2 font-medium">
                  <div className="mx-auto grid w-max grid-cols-[28px_80px_28px_48px] items-center gap-1.5">
                    <span aria-hidden="true" />
                    <span className="text-center">Return Units</span>
                    <span aria-hidden="true" />
                    <span aria-hidden="true" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-t border-gray-100 ${toInt(qtyMap[row.id]) > 0 ? "bg-amber-50/50" : ""}`}
                >
                  <td className="px-3 py-2 text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded border border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0">
                        <img
                          src={absOrderImage(row.imageUrl)}
                          alt={row.label}
                          className="h-full w-full object-contain"
                          onError={(e) => { e.currentTarget.src = ORDER_IMG_PLACEHOLDER; }}
                        />
                      </div>
                      <span className="line-clamp-2">{row.label}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center text-gray-700">{row.availableQty}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{row.units}</td>
                  <td className="px-3 py-2">
                    <div className="mx-auto grid w-max grid-cols-[28px_80px_28px_48px] items-center gap-1.5">
                      <button
                        type="button"
                        className="h-7 w-7 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                        onClick={() => nudgeQty(row.id, -1, row.availableUnits)}
                        disabled={row.availableUnits <= 0 || toInt(qtyMap[row.id]) <= 0}
                        title="Decrease"
                      >
                        <Minus size={12} className="mx-auto" />
                      </button>
                      <input
                        className={inputClass}
                        value={qtyMap[row.id] ?? ""}
                        onChange={(e) => setQty(row.id, e.target.value, row.availableUnits)}
                        inputMode="numeric"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        className="h-7 w-7 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                        onClick={() => nudgeQty(row.id, 1, row.availableUnits)}
                        disabled={row.availableUnits <= 0 || toInt(qtyMap[row.id]) >= row.availableUnits}
                        title="Increase"
                      >
                        <Plus size={12} className="mx-auto" />
                      </button>
                      <button
                        type="button"
                        className="h-7 w-12 rounded border border-blue-200 bg-blue-50 px-2 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                        onClick={() => setRowToMax(row.id, row.availableUnits)}
                        disabled={row.availableUnits <= 0}
                      >
                        Max
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>
                    No items found on this order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Return Note (Optional)</label>
          <textarea
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason or receiving notes"
          />
        </div>
      </div>
    </Modal>
  );
}
