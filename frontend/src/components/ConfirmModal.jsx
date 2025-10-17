import { X } from "lucide-react";

export function ConfirmModal({ title, children, open, onClose, onConfirm, loading }) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={loading ? undefined : onClose}
      />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button
            className="p-2 rounded-full hover:bg-amber-200 text-black cursor-pointer bg-amber-100"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">{children}</div>

        <div className="flex gap-3 p-4 border-t border-gray-200">
          <button
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg disabled:opacity-60"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="flex-1 bg-black hover:bg-gray-800 text-white font-semibold py-2.5 rounded-lg disabled:opacity-60"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin text-blue-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                <span>Confirming...</span>
              </span>
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}