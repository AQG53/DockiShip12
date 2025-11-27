import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, PackageCheck, Loader } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthCheck } from "../hooks/useAuthCheck";
import { useReceivePurchaseOrderItems } from "../hooks/usePurchaseOrders";

export function ReceiveItemsModal({ open, onClose, po, onSave, loading: fetchingPo }) {
    const { data: auth } = useAuthCheck();
    const [items, setItems] = useState([]);
    const { mutateAsync: receiveItems, isPending: loading } = useReceivePurchaseOrderItems();

    useEffect(() => {
        if (open && po) {
            // Initialize items with 0 receive quantity
            setItems(
                (po.items || []).map((item) => ({
                    ...item,
                    receiveNow: 0,
                }))
            );
        }
    }, [open, po]);

    const handleQuantityChange = (itemId, value) => {
        const val = parseInt(value) || 0;
        setItems((prev) =>
            prev.map((item) => {
                if (item.id === itemId) {
                    const remaining = item.quantity - item.receivedQty;
                    // Clamp between 0 and remaining
                    const validVal = Math.max(0, Math.min(val, remaining));
                    return { ...item, receiveNow: validVal };
                }
                return item;
            })
        );
    };

    const handleReceiveAll = () => {
        setItems((prev) =>
            prev.map((item) => {
                const remaining = Math.max(0, item.quantity - item.receivedQty);
                return { ...item, receiveNow: remaining };
            })
        );
    };

    const handleSubmit = async () => {
        const toReceive = items
            .filter((i) => i.receiveNow > 0)
            .map((i) => ({
                itemId: i.id,
                receivedQty: i.receiveNow,
            }));

        if (toReceive.length === 0) {
            toast.error("Please enter quantity to receive for at least one item");
            return;
        }

        try {
            await receiveItems({ id: po.id, items: toReceive });
            toast.success("Items received successfully");
            onSave(); // Refresh parent
            onClose();
        } catch (err) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Failed to receive items");
        }
    };

    const card = "rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden";
    const input = "h-8 w-24 rounded-lg border border-gray-300 px-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 text-center";

    return (
        <Transition appear show={open} as={Fragment}>
            <Dialog as="div" className="relative z-[90]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="transition-opacity duration-150"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="transition-opacity duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="transition ease-out duration-200"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="transition ease-in duration-150"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-[#f6f7fb] shadow-2xl overflow-hidden">
                                {/* Header */}
                                <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-9 w-9 rounded-md bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                                            <PackageCheck size={18} className="text-emerald-700" />
                                        </div>
                                        <div>
                                            <Dialog.Title className="text-base font-semibold text-gray-900">
                                                Receive Items
                                            </Dialog.Title>
                                            <p className="text-xs text-gray-500">{po?.poNumber}</p>
                                        </div>
                                    </div>
                                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    {fetchingPo ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader className="h-8 w-8 animate-spin text-gray-400" />
                                        </div>
                                    ) : (
                                        <div className={card}>
                                            <table className="min-w-full text-left text-[13px]">
                                                <thead>
                                                    <tr className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                                        <th className="px-4 py-3">Product</th>
                                                        <th className="px-4 py-3 text-center">Ordered</th>
                                                        <th className="px-4 py-3 text-center">Received</th>
                                                        <th className="px-4 py-3 text-center">Remaining</th>
                                                        <th className="px-4 py-3 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <span>Receive Now</span>
                                                                <button
                                                                    onClick={handleReceiveAll}
                                                                    className="rounded bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                                                                    title="Fill all items with remaining quantity"
                                                                >
                                                                    Receive All
                                                                </button>
                                                            </div>
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {items.map((item) => {
                                                        const remaining = item.quantity - item.receivedQty;
                                                        const isFullyReceived = remaining <= 0;
                                                        return (
                                                            <tr key={item.id} className="hover:bg-gray-50">
                                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                                    {item.product?.name || "Unknown Product"}
                                                                    {item.productVar && (
                                                                        <div className="text-xs text-gray-500 font-normal">
                                                                            {item.productVar.sku}
                                                                            {item.productVar.sizeText && ` • ${item.productVar.sizeText}`}
                                                                            {item.productVar.colorText && ` • ${item.productVar.colorText}`}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                                                                <td className="px-4 py-3 text-center text-gray-600">{item.receivedQty}</td>
                                                                <td className="px-4 py-3 text-center font-medium text-amber-600">{Math.max(0, remaining)}</td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {isFullyReceived ? (
                                                                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                                                            Completed
                                                                        </span>
                                                                    ) : (
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max={remaining}
                                                                            className={input}
                                                                            value={item.receiveNow || ""}
                                                                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                                            placeholder="0"
                                                                        />
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="border-t border-gray-200 bg-white px-4 py-3 flex justify-end gap-3">
                                    <button
                                        onClick={onClose}
                                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading || items.every(i => !i.receiveNow)}
                                        className="inline-flex items-center gap-2 rounded-lg bg-[#ffd026] px-4 py-2 text-sm font-semibold text-blue-700 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading && <Loader size={16} className="animate-spin" />}
                                        Receive
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
