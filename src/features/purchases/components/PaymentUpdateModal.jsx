
import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, DollarSign, Loader, Plus, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { useAddPayment, usePurchaseOrder } from "../hooks/usePurchaseOrders";

export function PaymentUpdateModal({ open, onClose, po: initialPo, onSave }) {
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Fetch full PO details to get transactions
    const { data: fullPo, isLoading: loadingPo } = usePurchaseOrder(initialPo?.id);
    const { mutateAsync: addPayment, isPending: loading } = useAddPayment();

    const po = fullPo || initialPo;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const val = Number(amount);
        if (!Number.isFinite(val) || val <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        const totalAmount = Number(po?.totalAmount) || 0;
        const currentPaid = Number(po?.amountPaid) || 0;

        if (currentPaid + val > totalAmount) {
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: po?.currency || 'USD'
            }).format(totalAmount);
            toast.error(`Total paid cannot exceed total amount (${formatted})`);
            return;
        }

        try {
            await addPayment({
                id: po.id,
                payload: {
                    amount: val,
                    date: date ? new Date(date).toISOString() : undefined,
                }
            });
            toast.success("Payment added successfully");
            setAmount("");
            onSave();
            // Don't close, let them see the updated history
        } catch (err) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Failed to add payment");
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
    const currentPaid = Number(po?.amountPaid) || 0;
    const remaining = Math.max(0, totalAmount - currentPaid);

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
                            <Dialog.Panel className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                                {/* Header */}
                                <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="h-9 w-9 rounded-md bg-blue-100 border border-blue-200 flex items-center justify-center">
                                            <DollarSign size={18} className="text-blue-700" />
                                        </div>
                                        <div>
                                            <Dialog.Title className="text-base font-semibold text-gray-900">
                                                Manage Payments
                                            </Dialog.Title>
                                            <p className="text-xs text-gray-500">{po?.poNumber}</p>
                                        </div>
                                    </div>
                                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</div>
                                            <div className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</div>
                                        </div>
                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                            <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Paid</div>
                                            <div className="mt-1 text-lg font-bold text-emerald-700">{formatCurrency(currentPaid)}</div>
                                        </div>
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                            <div className="text-xs font-medium text-amber-600 uppercase tracking-wider">Remaining</div>
                                            <div className="mt-1 text-lg font-bold text-amber-700">{formatCurrency(remaining)}</div>
                                        </div>
                                    </div>

                                    {/* Add Payment Form */}
                                    {remaining > 0 && (
                                        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                <Plus size={16} className="text-blue-600" />
                                                Add New Payment
                                            </h4>
                                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <label className="block text-xs font-medium text-gray-700">Amount</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => setAmount(String(remaining))}
                                                            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                                        >
                                                            Fill Remaining
                                                        </button>
                                                    </div>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <span className="text-gray-500 sm:text-sm">$</span>
                                                        </div>
                                                        <input
                                                            type="number"
                                                            min="0.01"
                                                            max={remaining}
                                                            step="0.01"
                                                            required
                                                            className={`${input} pl-7`}
                                                            value={amount}
                                                            onChange={(e) => setAmount(e.target.value)}
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                                                    <input
                                                        type="date"
                                                        required
                                                        className={input}
                                                        value={date}
                                                        onChange={(e) => setDate(e.target.value)}
                                                    />
                                                </div>
                                                <div className="md:col-span-2 flex justify-end">
                                                    <button
                                                        type="submit"
                                                        disabled={loading}
                                                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                                    >
                                                        {loading ? <Loader size={16} className="animate-spin" /> : "Add Payment"}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}

                                    {/* Transaction History */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Payment History</h4>
                                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {po?.transactions && po.transactions.length > 0 ? (
                                                        po.transactions.map((txn) => (
                                                            <tr key={txn.id}>
                                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                                    {new Date(txn.date).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                                    {formatCurrency(txn.amount)}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="2" className="px-4 py-8 text-center text-sm text-gray-500">
                                                                No payments recorded yet.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="border-t border-gray-200 bg-white px-4 py-3 flex justify-end shrink-0">
                                    <button
                                        onClick={onClose}
                                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Close
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
