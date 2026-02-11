import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";

export function Modal({
    open,
    onClose,
    title,
    titleRight,
    sideContent,
    sideContentClassName = "",
    children,
    footer,
    widthClass = "max-w-md",
    showCloseButton = true,
}) {
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

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="flex items-start justify-center gap-4 w-full max-w-[calc(100vw-2rem)]">
                                <div
                                    className={`w-full ${widthClass} transform rounded-xl bg-white text-left align-middle shadow-xl transition-all flex flex-col max-h-[85vh]`}
                                >
                                    {(title || showCloseButton || titleRight) && (
                                        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 shrink-0">
                                            <Dialog.Title
                                                as="h3"
                                                className="text-lg font-medium leading-6 text-gray-900"
                                            >
                                                {title}
                                            </Dialog.Title>
                                            <div className="flex items-center gap-3">
                                                {titleRight}
                                                {showCloseButton && (
                                                    <button
                                                        type="button"
                                                        className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                                                        onClick={onClose}
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-6 overflow-y-auto">
                                        {children}
                                    </div>

                                    {footer && (
                                        <div className="bg-gray-50 px-4 py-3 flex justify-end gap-3 border-t border-gray-200 shrink-0 rounded-b-xl">
                                            {footer}
                                        </div>
                                    )}
                                </div>

                                {sideContent && (
                                    <div className={`hidden xl:block w-[320px] max-h-[85vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl ${sideContentClassName}`}>
                                        {sideContent}
                                    </div>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
