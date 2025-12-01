import { useMemo } from "react";
import { X, Shield, Check } from "lucide-react";

export function ViewPermissionsModal({ open, onClose, memberName, roleName, permissions = [] }) {
    // Group permissions by resource (module)
    const groupedPermissions = useMemo(() => {
        const map = new Map();

        for (const perm of permissions) {
            if (typeof perm !== "string") continue;
            const parts = perm.split('.').filter(Boolean);
            if (parts.length < 2) continue;
            const resource = parts.slice(0, -1).join('.');
            const action = parts[parts.length - 1];

            if (!map.has(resource)) {
                map.set(resource, []);
            }
            map.get(resource).push(action);
        }

        // Convert to array and sort
        return Array.from(map.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([resource, actions]) => ({
                resource,
                actions: actions.sort()
            }));
    }, [permissions]);

    if (!open) return null;

    const formatResourceName = (resource) => {
        return resource
            .replaceAll('.', ' · ')
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const formatActionName = (action) => {
        return action.charAt(0).toUpperCase() + action.slice(1);
    };

    const getActionColor = (action) => {
        switch (action.toLowerCase()) {
            case 'create':
            case 'add':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'read':
            case 'view':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'update':
            case 'edit':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'delete':
            case 'remove':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="fixed inset-0 z-[70]">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            <div className="relative z-[71] flex min-h-screen items-start md:items-center justify-center p-4">
                <div className="w-full max-w-3xl rounded-xl bg-white border-gray-200 shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between bg-[#fff3c2] px-6 py-4 text-black">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/60 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Shield size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">Permission Details</h2>
                                <p className="text-sm text-black">
                                    {memberName} • {roleName}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="cursor-pointer hover:bg-red-300 p-2 rounded-full transition-colors"
                        >
                            <X size={20} className="text-black" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 max-h-[70vh] overflow-y-auto">
                        {groupedPermissions.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Shield size={48} className="mx-auto mb-4 opacity-30" />
                                <p>No permissions assigned to this role</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {groupedPermissions.map(({ resource, actions }) => (
                                    <div
                                        key={resource}
                                        className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 overflow-hidden"
                                    >
                                        {/* Resource Header */}
                                        <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 border-b border-gray-200">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-[#FFD53B] rounded-lg flex items-center justify-center">
                                                        <span className="text-black text-xs font-bold">
                                                            {resource.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-800">
                                                            {formatResourceName(resource)}
                                                        </h3>
                                                        <p className="text-xs text-gray-500">
                                                            {actions.length} permission{actions.length !== 1 ? 's' : ''} granted
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 text-green-600">
                                                    <Check size={16} />
                                                    <span className="text-xs font-semibold">Active</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions Grid */}
                                        <div className="p-4">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                {actions.map((action) => (
                                                    <div
                                                        key={action}
                                                        className={`${getActionColor(action)} px-3 py-2 rounded-lg border text-center font-medium text-sm flex items-center justify-center gap-2 shadow-sm`}
                                                    >
                                                        <Check size={14} />
                                                        {formatActionName(action)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Total: <span className="font-semibold text-gray-800">{permissions.length}</span> permissions
                        </div>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-[#ffd026] text-blue-600 hover:opacity-90 font-semibold transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
