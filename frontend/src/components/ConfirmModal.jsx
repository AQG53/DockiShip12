import { X } from "lucide-react";

export function ConfirmModal({ title, children, onClose, onConfirm, loading }) {
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
            className="p-2 rounded-full hover:bg-red-200 text-gray-500 cursor-pointer bg-red-100"
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
            {loading ? 'Confirming…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}