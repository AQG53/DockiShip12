import { useEffect, useMemo, useState } from "react";
import { ArrowUpToLine, Eraser, Info, Minus, Plus } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { absOrderImage, ORDER_IMG_PLACEHOLDER, resolveOrderItemImage } from "../utils/orderItemImage";

const inputClass =
  "h-8 rounded-md border border-gray-300 px-2 text-[13px] tabular-nums text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 w-20 text-center";

const moneyInputClass =
  "h-8 min-w-0 rounded-md border border-gray-300 px-2 text-right text-[13px] tabular-nums text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:bg-gray-50 disabled:text-gray-400";

const detailLabelClass = "text-[11px] font-medium uppercase tracking-wide text-gray-500";
const qtyTextClass = "text-sm font-semibold tabular-nums text-blue-700";
const looseTextClass = "text-sm font-semibold tabular-nums text-amber-700";
const totalTextClass = "text-sm font-semibold tabular-nums text-emerald-700";

const getItemLabel = (item) => {
  const base =
    item?.productDescription
    || item?.channelListing?.productName
    || item?.channelListing?.product?.name
    || "Order Item";
  const sku = item?.channelListing?.productVariant?.sku || item?.channelListing?.externalSku || "";
  return sku ? `${base} (${sku})` : base;
};

const toInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
};

const toAmount = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const sanitizeDecimal = (value) => {
  const raw = String(value ?? "");
  const normalized = raw.replace(/[^0-9.]/g, "");
  const firstDot = normalized.indexOf(".");
  if (firstDot === -1) return normalized;
  return `${normalized.slice(0, firstDot + 1)}${normalized.slice(firstDot + 1).replace(/\./g, "")}`;
};

const sanitizeDecimal3 = (value) => {
  const sanitized = sanitizeDecimal(value);
  const dotIndex = sanitized.indexOf(".");
  if (dotIndex === -1) return sanitized;
  return `${sanitized.slice(0, dotIndex + 1)}${sanitized.slice(dotIndex + 1, dotIndex + 4)}`;
};

const parseNonNegativeMoney = (raw, fallback = 0) => {
  const parsed = toAmount(raw, NaN);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
};

const clampMoney = (value, max) => {
  const normalizedValue = parseNonNegativeMoney(value, 0);
  const normalizedMax = Number.isFinite(max) ? Math.max(0, max) : 0;
  return Math.min(normalizedValue, normalizedMax);
};

const normalizePackState = (totalUnitsRaw, unitsPerPackRaw) => {
  const unitsPerPack = Math.max(1, toInt(unitsPerPackRaw, 1));
  const totalUnits = toInt(totalUnitsRaw, 0);
  return {
    unitsPerPack,
    totalUnits,
    fullPacks: Math.floor(totalUnits / unitsPerPack),
    looseUnits: totalUnits % unitsPerPack,
  };
};

const getAvailableUnitsState = (item, priorReturnedUnits = 0) => {
  const unitsPerPack = Math.max(
    1,
    toInt(item?.unitsPerPack ?? item?.units ?? item?.channelListing?.units ?? 1, 1),
  );
  const storedTotalUnits = toInt(item?.totalUnits, 0);
  if (storedTotalUnits > 0) {
    return normalizePackState(storedTotalUnits, unitsPerPack);
  }

  const explicitTotalUnits = (toInt(item?.quantity, 0) * unitsPerPack) + toInt(item?.looseUnits, 0);
  if (explicitTotalUnits > 0) {
    return normalizePackState(explicitTotalUnits, unitsPerPack);
  }

  const remainderUnits = priorReturnedUnits % unitsPerPack;
  const inferredTotalUnits = Math.max(0, (toInt(item?.quantity, 0) * unitsPerPack) - remainderUnits);
  return normalizePackState(inferredTotalUnits, unitsPerPack);
};

const resolveSalePricePerUnit = (item, unitsState, currentLineSelling) => {
  const explicitPerUnit = toAmount(item?.salePricePerUnit, NaN);
  if (Number.isFinite(explicitPerUnit) && explicitPerUnit > 0) {
    return explicitPerUnit;
  }

  if (Number.isFinite(currentLineSelling) && currentLineSelling > 0 && unitsState.totalUnits > 0) {
    return currentLineSelling / unitsState.totalUnits;
  }

  const packPrice = toAmount(item?.unitPrice, NaN);
  if (Number.isFinite(packPrice) && packPrice > 0 && unitsState.unitsPerPack > 0) {
    return packPrice / unitsState.unitsPerPack;
  }

  return 0;
};

const resolvePackSalePrice = (item, unitsState, currentLineSelling) => {
  const explicitPackPrice = toAmount(item?.unitPrice, NaN);
  if (Number.isFinite(explicitPackPrice) && explicitPackPrice > 0) {
    return explicitPackPrice;
  }

  const salePricePerUnit = resolveSalePricePerUnit(item, unitsState, currentLineSelling);
  if (salePricePerUnit > 0 && unitsState.unitsPerPack > 0) {
    return salePricePerUnit * unitsState.unitsPerPack;
  }

  return 0;
};

const renderPackSummary = (packState) => (
  <div className="mx-auto flex w-full min-w-[96px] flex-col items-center gap-1 text-center">
    <span className={qtyTextClass}>{packState.fullPacks} qty</span>
    <span className={looseTextClass}>{packState.looseUnits} loose</span>
    <span className={totalTextClass}>{packState.totalUnits} total</span>
  </div>
);

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
  const [linePriceInputMap, setLinePriceInputMap] = useState({});
  const [linePriceManualMap, setLinePriceManualMap] = useState({});
  const [shippingChargesInput, setShippingChargesInput] = useState("0.00");
  const [taxChargesInput, setTaxChargesInput] = useState("0.00");
  const [otherChargesInput, setOtherChargesInput] = useState("0.00");

  const [isShippingManual, setIsShippingManual] = useState(false);
  const [isTaxManual, setIsTaxManual] = useState(false);
  const [isOtherManual, setIsOtherManual] = useState(false);
  const prefilledShippingCharges = toAmount(order?.shippingCharges, 0);
  const prefilledTaxCharges = toAmount(order?.tax, 0);
  const prefilledOtherCharges = toAmount(order?.otherCharges, 0);

  const returnedUnitsByItem = useMemo(() => {
    const map = new Map();
    const records = Array.isArray(order?.returnRecords) ? order.returnRecords : [];
    records.forEach((record) => {
      const items = Array.isArray(record?.items) ? record.items : [];
      items.forEach((item) => {
        const orderItemId = item?.orderItemId;
        if (!orderItemId) return;
        const returnedUnits = toInt(item?.restockedUnits ?? item?.returnedQty ?? 0);
        if (returnedUnits <= 0) return;
        map.set(orderItemId, (map.get(orderItemId) || 0) + returnedUnits);
      });
    });
    return map;
  }, [order?.returnRecords]);

  const rows = useMemo(() => {
    const items = Array.isArray(order?.items) ? order.items : [];
    return items.map((item) => {
      const priorReturnedUnits = toInt(returnedUnitsByItem.get(item.id) || 0);
      const unitsState = getAvailableUnitsState(item, priorReturnedUnits);
      const currentLineSelling = toAmount(item?.totalAmount, 0);
      const packSalePrice = resolvePackSalePrice(item, unitsState, currentLineSelling);

      return {
        id: item.id,
        label: getItemLabel(item),
        imageUrl: resolveOrderItemImage(item),
        unitsPerPack: unitsState.unitsPerPack,
        fullPacks: unitsState.fullPacks,
        looseUnits: unitsState.looseUnits,
        totalUnits: unitsState.totalUnits,
        currentLineSelling,
        currentLineCost: toAmount(item?.totalCost, 0),
        packSalePrice,
      };
    });
  }, [order, returnedUnitsByItem]);

  useEffect(() => {
    if (!open) return;
    const nextQtyMap = {};
    const nextPriceMap = {};
    rows.forEach((row) => {
      nextQtyMap[row.id] = "";
      nextPriceMap[row.id] = row.packSalePrice > 0 ? row.packSalePrice.toFixed(2) : "";
    });
    setQtyMap(nextQtyMap);
    setLinePriceInputMap(nextPriceMap);
    setLinePriceManualMap({});
    setNote("");
    setIsShippingManual(false);
    setIsTaxManual(false);
    setIsOtherManual(false);
    setShippingChargesInput("0.00");
    setTaxChargesInput("0.00");
    setOtherChargesInput("0.00");
  }, [open, rows]);

  const financials = useMemo(() => {
    let selectedLines = 0;
    let totalReturnUnits = 0;
    let totalRemainingUnits = 0;
    let totalReturnSellingAmount = 0;
    const lineDetails = new Map();

    rows.forEach((row) => {
      const returnUnits = Math.min(row.totalUnits, toInt(qtyMap[row.id], 0));
      const remainingUnits = Math.max(0, row.totalUnits - returnUnits);
      const autoRemainingSubtotal = row.totalUnits > 0
        ? ((row.currentLineSelling * remainingUnits) / row.totalUnits)
        : 0;
      const hasManualPrice = linePriceManualMap[row.id] === true;
      const finalPackSalePrice = hasManualPrice
        ? parseNonNegativeMoney(linePriceInputMap[row.id], row.packSalePrice)
        : row.packSalePrice;
      const finalSalePricePerUnit = row.unitsPerPack > 0
        ? (finalPackSalePrice / row.unitsPerPack)
        : 0;
      const finalRemainingSubtotal = remainingUnits > 0
        ? clampMoney(finalSalePricePerUnit * remainingUnits, row.currentLineSelling)
        : 0;
      const finalReturnSellingAmount = clampMoney(
        row.currentLineSelling - finalRemainingSubtotal,
        row.currentLineSelling,
      );

      lineDetails.set(row.id, {
        returnUnits,
        remainingUnits,
        remainingPackState: normalizePackState(remainingUnits, row.unitsPerPack),
        autoRemainingSubtotal,
        finalPackSalePrice,
        finalSalePricePerUnit,
        finalRemainingSubtotal,
        finalReturnSellingAmount,
        hasManualPrice,
      });

      if (returnUnits > 0) {
        selectedLines += 1;
        totalReturnUnits += returnUnits;
        totalRemainingUnits += remainingUnits;
        totalReturnSellingAmount += finalReturnSellingAmount;
      }
    });

    return {
      selectedLines,
      totalReturnUnits,
      totalRemainingUnits,
      totalReturnSellingAmount,
      lineDetails,
    };
  }, [rows, qtyMap, linePriceInputMap, linePriceManualMap]);

  useEffect(() => {
    if (!isShippingManual) setShippingChargesInput(prefilledShippingCharges.toFixed(2));
  }, [prefilledShippingCharges, isShippingManual]);

  useEffect(() => {
    if (!isTaxManual) setTaxChargesInput(prefilledTaxCharges.toFixed(2));
  }, [prefilledTaxCharges, isTaxManual]);

  useEffect(() => {
    if (!isOtherManual) setOtherChargesInput(prefilledOtherCharges.toFixed(2));
  }, [prefilledOtherCharges, isOtherManual]);

  const setQty = (rowId, rawValue, maxUnits) => {
    const clean = String(rawValue ?? "").replace(/[^0-9]/g, "");
    if (!clean) {
      setQtyMap((prev) => ({ ...prev, [rowId]: "" }));
      return;
    }
    const value = Math.min(maxUnits, toInt(clean, 0));
    setQtyMap((prev) => ({ ...prev, [rowId]: String(value) }));
  };

  const nudgeQty = (rowId, delta, maxUnits) => {
    setQtyMap((prev) => {
      const current = toInt(prev[rowId], 0);
      const next = Math.max(0, Math.min(maxUnits, current + delta));
      return { ...prev, [rowId]: next === 0 ? "" : String(next) };
    });
  };

  const toggleRowSelected = (row) => {
    const currentUnits = toInt(qtyMap[row.id], 0);
    setQtyMap((prev) => ({
      ...prev,
      [row.id]: currentUnits > 0 ? "" : (row.totalUnits > 0 ? "1" : ""),
    }));
  };

  const handleReturnAll = () => {
    const next = {};
    rows.forEach((row) => {
      next[row.id] = row.totalUnits > 0 ? String(row.totalUnits) : "";
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

  const setLinePrice = (rowId, rawValue) => {
    const sanitized = sanitizeDecimal3(rawValue);
    setLinePriceManualMap((prev) => ({ ...prev, [rowId]: true }));
    setLinePriceInputMap((prev) => ({ ...prev, [rowId]: sanitized }));
  };

  const resetLinePrice = (rowId, fallbackPrice) => {
    setLinePriceManualMap((prev) => ({ ...prev, [rowId]: false }));
    setLinePriceInputMap((prev) => ({ ...prev, [rowId]: fallbackPrice > 0 ? fallbackPrice.toFixed(2) : "" }));
  };

  const finalReturnSellingAmount = financials.totalReturnSellingAmount;
  const finalShippingCharges = parseNonNegativeMoney(shippingChargesInput, prefilledShippingCharges);
  const finalTaxCharges = parseNonNegativeMoney(taxChargesInput, prefilledTaxCharges);
  const finalOtherCharges = parseNonNegativeMoney(otherChargesInput, prefilledOtherCharges);

  const handleSubmit = async () => {
    const returns = rows
      .map((row) => {
        const line = financials.lineDetails.get(row.id);
        if (!line || line.returnUnits <= 0) return null;
        return {
          orderItemId: row.id,
          returnUnits: line.returnUnits,
          returnSellingAmount: line.finalReturnSellingAmount,
        };
      })
      .filter(Boolean);

    if (returns.length === 0) return;

    await onSubmit?.({
      returns,
      returnNote: note.trim() || undefined,
      returnSellingAmount: finalReturnSellingAmount,
      returnShippingCharges: finalShippingCharges,
      returnTaxCharges: finalTaxCharges,
      returnOtherCharges: finalOtherCharges,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={order?.orderId ? `${title} - ${order.orderId}` : title}
      widthClass="max-w-7xl"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button variant="warning" onClick={handleSubmit} isLoading={isLoading} disabled={financials.selectedLines === 0}>
            {confirmLabel}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900 flex items-start gap-2">
          <Info size={14} className="mt-0.5 text-blue-700 flex-shrink-0" />
          <div>
            <p className="font-medium">Select order products and enter returned units.</p>
            <p className="mt-0.5 text-blue-800/90">Each row shows the current packs plus loose units, the remaining packs plus loose units after return, the pack sale price, and the remaining subtotal that will stay on the order.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <p className={detailLabelClass}>Selected Lines</p>
            <p className="text-lg font-semibold tabular-nums text-gray-900">{financials.selectedLines}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <p className={detailLabelClass}>Return Units</p>
            <p className="text-lg font-semibold tabular-nums text-gray-900">{financials.totalReturnUnits}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <p className={detailLabelClass}>Remaining Units</p>
            <p className="text-lg font-semibold tabular-nums text-gray-900">{financials.totalRemainingUnits}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <p className="text-xs text-gray-600">Quick actions</p>
          <div className="flex items-center gap-2">
            <Button size="xs" variant="secondary" onClick={handleClearAll} disabled={rows.length === 0}>
              <Eraser size={13} className="mr-1" /> Clear All
            </Button>
            <Button size="xs" variant="secondary" onClick={handleReturnAll} disabled={rows.length === 0}>
              <ArrowUpToLine size={13} className="mr-1" /> Return All
            </Button>
          </div>
        </div>

        <div className="max-h-[38vh] overflow-y-auto rounded-lg border border-gray-200">
          <table className="w-full table-fixed text-sm">
            <thead className="sticky top-0 bg-gray-50 text-gray-600">
              <tr>
                <th className="w-[72px] px-3 py-2 text-center align-middle font-medium">Select</th>
                <th className="w-[26%] px-3 py-2 text-left align-middle font-medium">Product</th>
                <th className="w-[9%] px-3 py-2 text-center align-middle font-medium">Units/Pack</th>
                <th className="w-[12%] px-3 py-2 text-center align-middle font-medium">Current</th>
                <th className="w-[16%] px-3 py-2 text-center align-middle font-medium">Return Units</th>
                <th className="w-[12%] px-3 py-2 text-center align-middle font-medium">Remaining</th>
                <th className="w-[15%] px-3 py-2 text-center align-middle font-medium">Pack Sale Price</th>
                <th className="w-[10%] px-3 py-2 text-center align-middle font-medium">Remaining Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isSelected = toInt(qtyMap[row.id], 0) > 0;
                const line = financials.lineDetails.get(row.id);
                const returnUnits = line?.returnUnits || 0;
                const remainingState = line?.remainingPackState ?? normalizePackState(row.totalUnits, row.unitsPerPack);
                const priceInputValue = line?.hasManualPrice
                  ? (linePriceInputMap[row.id] ?? "")
                  : row.packSalePrice.toFixed(2);

                return (
                  <tr key={row.id} className={`border-t border-gray-100 ${isSelected ? "bg-amber-50/50" : ""}`}>
                    <td className="px-3 py-2 text-center align-middle">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={isSelected}
                        onChange={() => toggleRowSelected(row)}
                        disabled={row.totalUnits <= 0}
                      />
                    </td>
                    <td className="px-3 py-2 align-middle text-gray-900">
                      <div className="flex items-start gap-2">
                        <div className="h-8 w-8 rounded border border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0">
                          <img
                            src={absOrderImage(row.imageUrl)}
                            alt={row.label}
                            className="h-full w-full object-contain"
                            onError={(e) => { e.currentTarget.src = ORDER_IMG_PLACEHOLDER; }}
                          />
                        </div>
                        <span className="block min-w-0 whitespace-normal break-words leading-snug">{row.label}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center align-middle tabular-nums text-gray-700">{row.unitsPerPack}</td>
                    <td className="px-3 py-2 align-middle">
                      {renderPackSummary(row)}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="mx-auto grid w-max grid-cols-[28px_80px_28px] items-center gap-1.5">
                        <button
                          type="button"
                          className="h-7 w-7 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                          onClick={() => nudgeQty(row.id, -1, row.totalUnits)}
                          disabled={row.totalUnits <= 0 || toInt(qtyMap[row.id], 0) <= 0}
                          title="Decrease"
                        >
                          <Minus size={12} className="mx-auto" />
                        </button>
                        <input
                          className={inputClass}
                          value={qtyMap[row.id] ?? ""}
                          onChange={(e) => setQty(row.id, e.target.value, row.totalUnits)}
                          inputMode="numeric"
                          placeholder="0"
                        />
                        <button
                          type="button"
                          className="h-7 w-7 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                          onClick={() => nudgeQty(row.id, 1, row.totalUnits)}
                          disabled={row.totalUnits <= 0 || toInt(qtyMap[row.id], 0) >= row.totalUnits}
                          title="Increase"
                        >
                          <Plus size={12} className="mx-auto" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      {renderPackSummary(remainingState)}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="mx-auto flex w-full max-w-[188px] items-center justify-center gap-1.5">
                        <input
                          className={`${moneyInputClass} min-w-[88px] flex-1`}
                          value={priceInputValue}
                          onChange={(e) => setLinePrice(row.id, e.target.value)}
                          inputMode="decimal"
                          placeholder="0.00"
                          disabled={returnUnits <= 0 || remainingState.totalUnits <= 0}
                        />
                        <button
                          type="button"
                          className="h-8 w-[46px] flex-shrink-0 rounded border border-gray-300 px-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                          onClick={() => resetLinePrice(row.id, row.packSalePrice)}
                          disabled={returnUnits <= 0 || remainingState.totalUnits <= 0 || !line?.hasManualPrice}
                          title="Reset to auto"
                        >
                          Auto
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center align-middle font-medium tabular-nums text-gray-900">
                      {toAmount(line?.finalRemainingSubtotal, row.currentLineSelling).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={7}>
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
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 h-24"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason or receiving notes"
          />
        </div>
      </div>
    </Modal>
  );
}
