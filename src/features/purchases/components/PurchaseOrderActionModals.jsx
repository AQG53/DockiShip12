import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Loader2 } from "lucide-react";

export function ConfirmPOModal({ open, onClose, onConfirm, loading }) {
    const [trackingIds, setTrackingIds] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(trackingIds);
        setTrackingIds("");
    };

    return (
        <Transition appear show={open} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-gray-900"
                                >
                                    Confirm Purchase Order
                                </Dialog.Title>
                                <form onSubmit={handleSubmit} className="mt-2">
                                    <p className="text-sm text-gray-500 mb-4">
                                        You can optionally enter the tracking IDs for this order.
                                    </p>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tracking IDs <span className="text-gray-400 text-xs">(Optional)</span>
                                    </label>
                                    <textarea
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                        placeholder="e.g. TRK123456789"
                                        value={trackingIds}
                                        onChange={(e) => setTrackingIds(e.target.value)}
                                    />

                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none"
                                            onClick={onClose}
                                            disabled={loading}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none disabled:opacity-50"
                                            disabled={loading}
                                        >
                                            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Confirm Order"}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

export function CancelPOModal({ open, onClose, onConfirm, loading }) {
    const [reason, setReason] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(reason);
        setReason("");
    };

    return (
        <Transition appear show={open} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-gray-900"
                                >
                                    Cancel Purchase Order
                                </Dialog.Title>
                                <form onSubmit={handleSubmit} className="mt-2">
                                    <p className="text-sm text-gray-500 mb-4">
                                        Are you sure you want to cancel this order? Please provide a reason.
                                    </p>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cancellation Reason
                                    </label>
                                    <textarea
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                        rows={3}
                                        placeholder="e.g. Supplier out of stock"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        required
                                    />

                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none"
                                            onClick={onClose}
                                            disabled={loading}
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="submit"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none disabled:opacity-50"
                                            disabled={loading}
                                        >
                                            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Cancel Order"}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
