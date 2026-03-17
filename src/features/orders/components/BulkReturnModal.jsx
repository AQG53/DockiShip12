import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { absOrderImage, ORDER_IMG_PLACEHOLDER, resolveOrderItemImage } from "../utils/orderItemImage";

const inputClass =
  "h-8 rounded-md border border-gray-300 px-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 w-24 text-right";

const toInt = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
};

const getItemLabel = (item) => {
  const base =
    item?.productDescription
    || item?.channelListing?.productName
    || item?.channelListing?.product?.name
    || "Order Item";
  const sku = item?.channelListing?.productVariant?.sku || item?.channelListing?.externalSku || "";
  return sku ? `${base} (${sku})` : base;
};

export default function BulkReturnModal({
  open,
  onClose,
  orders,
  isLoading,
  onSubmit,
}) {
  const [qtyMap, setQtyMap] = useState({});
  const [note, setNote] = useState("");

  const rows = useMemo(() => {
    const list = [];
    (Array.isArray(orders) ? orders : []).forEach((order) => {
      const returnedUnitsByItem = new Map();
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
          returnedUnitsByItem.set(orderItemId, (returnedUnitsByItem.get(orderItemId) || 0) + restockedUnits);
        });
      });

      const orderItems = Array.isArray(order?.items) ? order.items : [];
      orderItems.forEach((item) => {
        const availableQty = Math.max(0, toInt(item?.quantity));
        const units = Math.max(1, toInt(item?.channelListing?.units || 1));
        const previouslyReturnedUnits = toInt(returnedUnitsByItem.get(item.id) || 0);
        const remainderUnits = previouslyReturnedUnits % units;
        const availableUnits = Math.max(0, (availableQty * units) - remainderUnits);
        list.push({
          orderId: order.id,
          orderLabel: order.orderId || order.id,
          orderItemId: item.id,
          key: `${order.id}::${item.id}`,
          label: getItemLabel(item),
          imageUrl: resolveOrderItemImage(item),
          availableQty,
          units,
          availableUnits,
        });
      });
    });
    return list;
  }, [orders]);

  useEffect(() => {
    if (!open) return;
    const next = {};
    rows.forEach((row) => {
      next[row.key] = "";
    });
    setQtyMap(next);
    setNote("");
  }, [open, rows]);

  const totals = useMemo(() => {
    let selectedLines = 0;
    let totalUnits = 0;
    rows.forEach((row) => {
      const units = Math.min(row.availableUnits, toInt(qtyMap[row.key]));
      if (units > 0) {
        selectedLines += 1;
        totalUnits += units;
      }
    });
    return { selectedLines, totalUnits };
  }, [rows, qtyMap]);

  const grouped = useMemo(() => {
    const byOrder = new Map();
    rows.forEach((row) => {
      if (!byOrder.has(row.orderId)) {
        byOrder.set(row.orderId, {
          orderId: row.orderId,
          orderLabel: row.orderLabel,
          items: [],
        });
      }
      byOrder.get(row.orderId).items.push(row);
    });
    return Array.from(byOrder.values());
  }, [rows]);

  const setQty = (rowKey, rawValue, maxUnits) => {
    const clean = String(rawValue ?? "").replace(/[^0-9]/g, "");
    if (!clean) {
      setQtyMap((prev) => ({ ...prev, [rowKey]: "" }));
      return;
    }
    const value = Math.min(maxUnits, toInt(clean));
    setQtyMap((prev) => ({ ...prev, [rowKey]: String(value) }));
  };

  const handleSubmit = async () => {
    const payload = grouped
      .map((orderGroup) => {
        const returns = orderGroup.items
          .map((row) => {
            const units = Math.min(row.availableUnits, toInt(qtyMap[row.key]));
            if (units <= 0) return null;
            return {
              orderItemId: row.orderItemId,
              returnUnits: units,
            };
          })
          .filter(Boolean);

        if (returns.length === 0) return null;

        return {
          orderId: orderGroup.orderId,
          returns,
          returnNote: note.trim() || undefined,
        };
      })
      .filter(Boolean);

    if (payload.length === 0) return;

    await onSubmit?.(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bulk Return"
      widthClass="max-w-5xl"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button variant="warning" onClick={handleSubmit} isLoading={isLoading} disabled={totals.selectedLines === 0}>
            Apply Bulk Return
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
          Select returned units across selected orders.
          <span className="ml-2 font-medium">Lines: {totals.selectedLines}</span>
          <span className="ml-3 font-medium">Units: {totals.totalUnits}</span>
        </div>

        <div className="max-h-[52vh] overflow-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Order</th>
                <th className="px-3 py-2 text-left font-medium">Product</th>
                <th className="px-3 py-2 text-right font-medium">Quantity</th>
                <th className="px-3 py-2 text-right font-medium">Units</th>
                <th className="px-3 py-2 text-right font-medium">Return Units</th>
                <th className="px-3 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((group) => (
                group.items.map((row, idx) => (
                  <tr key={row.key} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-900">{idx === 0 ? group.orderLabel : ""}</td>
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
                    <td className="px-3 py-2 text-right text-gray-700">{row.availableQty}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{row.units}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        className={inputClass}
                        value={qtyMap[row.key] ?? ""}
                        onChange={(e) => setQty(row.key, e.target.value, row.availableUnits)}
                        inputMode="numeric"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:text-blue-700"
                        onClick={() => setQtyMap((prev) => ({ ...prev, [row.key]: String(row.availableUnits) }))}
                        disabled={row.availableUnits <= 0}
                      >
                        Max
                      </button>
                    </td>
                  </tr>
                ))
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={6}>
                    No order items available for return.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Return Note for Selected Orders (Optional)</label>
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
