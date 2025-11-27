import { Fragment } from "react";
import {
    Dialog,
    Transition,
    TransitionChild,
    DialogPanel,
} from "@headlessui/react";
import { X } from "lucide-react";

export default function ViewModal({
    open,
    onClose,
    title,
    subtitle,
    icon: Icon,
    iconClassName = "text-amber-700",
    iconContainerClassName = "bg-amber-100 border-amber-200",
    tabs = [], // Array of { id, label }
    activeTab,
    onTabChange,
    children,
    footer,
    widthClass = "max-w-4xl",
    heightClass = "h-[85vh]",
    headerRight,
}) {
    return (
        <Transition appear show={open} as={Fragment}>
            <Dialog as="div" className="relative z-[70]" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="transition-opacity ease-out duration-150"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="transition-opacity ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <TransitionChild
                            as={Fragment}
                            enter="transition ease-out duration-150"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel
                                className={`w-full ${widthClass} ${heightClass} rounded-xl bg-[#f6f7fb] border border-gray-200 shadow-2xl flex flex-col`}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-gray-200 rounded-t-xl flex-shrink-0">
                                    <div className="flex items-center gap-3">
                                        {Icon && (
                                            <div
                                                className={`w-10 h-10 rounded-lg border flex items-center justify-center ${iconContainerClassName}`}
                                            >
                                                <Icon size={20} className={iconClassName} />
                                            </div>
                                        )}
                                        <div>
                                            <h2 className="text-base font-semibold text-gray-900">
                                                {title}
                                            </h2>
                                            {subtitle && (
                                                <p className="text-xs text-gray-500">{subtitle}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {headerRight}
                                        <button
                                            onClick={onClose}
                                            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Tabs */}
                                {tabs.length > 0 && (
                                    <div className="px-4 border-b border-gray-200 flex-shrink-0">
                                        <div className="flex items-center gap-6">
                                            {tabs.map((tab) => {
                                                const isActive = activeTab === tab.id;
                                                return (
                                                    <button
                                                        key={tab.id}
                                                        className={`py-3 text-sm font-medium border-b-2 transition-colors ${isActive
                                                            ? "border-blue-600 text-blue-600"
                                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                                            }`}
                                                        onClick={() => onTabChange && onTabChange(tab.id)}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Body */}
                                <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                                    {children}
                                </div>

                                {/* Footer */}
                                {footer && (
                                    <div className="border-t border-gray-200 bg-white px-4 py-3 rounded-b-xl flex items-center justify-end gap-2 flex-shrink-0">
                                        {footer}
                                    </div>
                                )}
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
