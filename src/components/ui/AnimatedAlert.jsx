import { Fragment, useState, useCallback, createContext, useContext } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

// Context for global alert management
const AlertContext = createContext(null);

export function useAnimatedAlert() {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error("useAnimatedAlert must be used within AnimatedAlertProvider");
    }
    return context;
}

// Animated Icon Components
const AnimatedSuccessIcon = () => (
    <div className="w-16 h-16 mx-auto mb-4 relative">
        <div className="absolute inset-0 animate-ping bg-emerald-200 rounded-full opacity-75" style={{ animationDuration: '1.5s' }} />
        <div className="relative bg-emerald-100 rounded-full p-3 animate-bounce" style={{ animationDuration: '0.6s' }}>
            <CheckCircle className="w-10 h-10 text-emerald-500" strokeWidth={2.5} />
        </div>
    </div>
);

const AnimatedErrorIcon = () => (
    <div className="w-16 h-16 mx-auto mb-4 relative">
        <div className="absolute inset-0 animate-ping bg-red-200 rounded-full opacity-75" style={{ animationDuration: '1.5s' }} />
        <div className="relative bg-red-100 rounded-full p-3 animate-shake">
            <XCircle className="w-10 h-10 text-red-500" strokeWidth={2.5} />
        </div>
    </div>
);

const AnimatedInfoIcon = () => (
    <div className="w-16 h-16 mx-auto mb-4 relative">
        <div className="absolute inset-0 animate-ping bg-blue-200 rounded-full opacity-75" style={{ animationDuration: '1.5s' }} />
        <div className="relative bg-blue-100 rounded-full p-3 animate-pulse">
            <Info className="w-10 h-10 text-blue-500" strokeWidth={2.5} />
        </div>
    </div>
);

// Main Alert Component
export function AnimatedAlert({
    open,
    onClose,
    type = "info", // 'success' | 'error' | 'info'
    title,
    message,
    confirmLabel = "OK",
    onConfirm,
}) {
    const getIcon = () => {
        switch (type) {
            case "success":
                return <AnimatedSuccessIcon />;
            case "error":
                return <AnimatedErrorIcon />;
            case "info":
            default:
                return <AnimatedInfoIcon />;
        }
    };

    const getButtonClass = () => {
        switch (type) {
            case "success":
                return "bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-500";
            case "error":
                return "bg-red-500 hover:bg-red-600 focus:ring-red-500";
            case "info":
            default:
                return "bg-blue-500 hover:bg-blue-600 focus:ring-blue-500";
        }
    };

    const handleConfirm = () => {
        onConfirm?.();
        onClose();
    };

    return (
        <Transition appear show={open} as={Fragment}>
            <Dialog as="div" className="relative z-[200]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-75"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-75"
                        >
                            <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-center align-middle shadow-xl transition-all">
                                <button
                                    onClick={onClose}
                                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={18} />
                                </button>

                                {getIcon()}

                                <Dialog.Title
                                    as="h3"
                                    className="text-xl font-bold leading-6 text-gray-900 mb-2"
                                >
                                    {title}
                                </Dialog.Title>

                                {message && (
                                    <p className="text-sm text-gray-600 mb-6 px-2">
                                        {message}
                                    </p>
                                )}

                                <button
                                    type="button"
                                    className={`w-full inline-flex justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${getButtonClass()}`}
                                    onClick={handleConfirm}
                                >
                                    {confirmLabel}
                                </button>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

// Provider for easier global usage
export function AnimatedAlertProvider({ children }) {
    const [alertState, setAlertState] = useState({
        open: false,
        type: "info",
        title: "",
        message: "",
        confirmLabel: "OK",
        onConfirm: null,
    });

    const showAlert = useCallback(({ type = "info", title, message, confirmLabel = "OK", onConfirm }) => {
        setAlertState({
            open: true,
            type,
            title,
            message,
            confirmLabel,
            onConfirm,
        });
    }, []);

    const closeAlert = useCallback(() => {
        setAlertState(prev => ({ ...prev, open: false }));
    }, []);

    // Shorthand methods
    const success = useCallback((title, message, confirmLabel) => {
        showAlert({ type: "success", title, message, confirmLabel });
    }, [showAlert]);

    const error = useCallback((title, message, confirmLabel) => {
        showAlert({ type: "error", title, message, confirmLabel });
    }, [showAlert]);

    const info = useCallback((title, message, confirmLabel) => {
        showAlert({ type: "info", title, message, confirmLabel });
    }, [showAlert]);

    return (
        <AlertContext.Provider value={{ showAlert, success, error, info }}>
            {children}
            <AnimatedAlert
                open={alertState.open}
                onClose={closeAlert}
                type={alertState.type}
                title={alertState.title}
                message={alertState.message}
                confirmLabel={alertState.confirmLabel}
                onConfirm={alertState.onConfirm}
            />
        </AlertContext.Provider>
    );
}

// Standalone show functions (for use without provider)
export function showAnimatedAlert(props) {
    // This would require a root-level mount, but for simplicity,
    // we recommend using the AnimatedAlertProvider approach
    console.warn("For standalone usage, please wrap your app with AnimatedAlertProvider and use the useAnimatedAlert hook.");
}
