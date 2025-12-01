import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, DollarSign, Loader } from "lucide-react";
import toast from "react-hot-toast";
import { useUpdatePayment } from "../hooks/usePurchaseOrders";

export function PaymentUpdateModal({ open, onClose, po, onSave }) {
    const [amountPaid, setAmountPaid] = useState("");
    const { mutateAsync: updatePayment, isPending: loading } = useUpdatePayment();

    useEffect(() => {
        if (open && po) {
            setAmountPaid(po.amountPaid != null ? String(po.amountPaid) : "");
        }
    }, [open, po]);

    const handleSubmit = async () => {
        const amount = Number(amountPaid);
        if (!Number.isFinite(amount) || amount < 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        if (amount > totalAmount) {
            toast.error(`Amount paid cannot exceed total amount (${formatCurrency(totalAmount)})`);
            return;
        }

        try {
            await updatePayment({ id: po.id, amountPaid: amount });
            toast.success("Payment updated successfully");
            onSave();
            onClose();
        } catch (err) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Failed to update payment");
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: po?.currency || 'USD'
        }).format(value);
    };

    const input = "h-9 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
    const totalAmount = Number(po?.totalAmount) || 0;
    const currentPaid = Number(amountPaid) || 0;

    let paymentStatus = "Unpaid";
    let statusColor = "text-red-600 bg-red-50";
    if (currentPaid >= totalAmount && totalAmount > 0) {
        paymentStatus = "Fully Paid";
        statusColor = "text-emerald-700 bg-emerald-100";
    } else if (currentPaid > 0) {
        paymentStatus = "Partially Paid";
        statusColor = "text-amber-700 bg-amber-100";
    }

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
                            <Dialog.Panel className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
                                {/* Header */}
                                <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-9 w-9 rounded-md bg-blue-100 border border-blue-200 flex items-center justify-center">
                                            <DollarSign size={18} className="text-blue-700" />
                                        </div>
                                        <div>
                                            <Dialog.Title className="text-base font-semibold text-gray-900">
                                                Update Payment
                                            </Dialog.Title>
                                            <p className="text-xs text-gray-500">{po?.poNumber}</p>
                                        </div>
                                    </div>
                                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-4 space-y-4">
                                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600">Total Amount</span>
                                            <span className="font-semibold text-gray-900">
                                                {new Intl.NumberFormat('en-US', {
                                                    style: 'currency',
                                                    currency: po?.currency || 'USD'
                                                }).format(totalAmount)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600">Payment Status</span>
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                                                {paymentStatus}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Amount Paid
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setAmountPaid(String(totalAmount))}
                                                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                            >
                                                Fill Total
                                            </button>
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            max={totalAmount}
                                            step="0.01"
                                            className={input}
                                            value={amountPaid}
                                            onChange={(e) => setAmountPaid(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
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
                                        disabled={loading}
                                        className="inline-flex items-center gap-2 rounded-lg bg-[#ffd026] px-4 py-2 text-sm font-semibold text-blue-700 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading && <Loader size={16} className="animate-spin" />}
                                        Update
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
