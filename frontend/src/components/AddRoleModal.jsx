import { useEffect, useMemo, useState } from "react";
import { Loader } from "lucide-react";
import { usePermissions } from "../hooks/usePermissions";
import PermissionMultiSelect from "../components/PermissionMultiSelect";
import toast from "react-hot-toast";
import { useCreateRole } from "../hooks/useCreateRole";
import { useUpdateRole } from "../hooks/useUpdateRole";

export function AddRoleModal({ open, onClose, onSave, mode = "create", role = null }) {
    const MAX_DESC = 500;

    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [selected, setSelected] = useState({});

    const { data: permissionNames = [], isLoading, isError, error } = usePermissions();
    const { mutate: createRoleMutate, isPending: isCreating } = useCreateRole();
    const { mutate: updateRole, isPending: isUpdating } = useUpdateRole();

    const grouped = useMemo(() => {
        const map = new Map();
        for (const full of permissionNames) {
            if (typeof full !== "string") continue;
            const [resource, action] = full.split(".");
            if (!resource || !action) continue;
            if (!map.has(resource)) map.set(resource, new Set());
            map.get(resource).add(action);
        }
        return Array.from(map.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([resource, actionSet]) => ({
                resource,
                actions: Array.from(actionSet).sort(),
            }));
    }, [permissionNames]);

    useEffect(() => {
        if (mode !== "edit" || !role) return;
        setName(role.name || "");
        setDesc(role.description || "");

        const perms = role.permissions || role.permissionNames || [];
        const next = {};
        for (const p of perms) {
            if (typeof p !== "string") continue;
            const [res, act] = p.split(".");
            if (!res || !act) continue;
            if (!next[res]) next[res] = new Set();
            next[res].add(act);
        }
        setSelected(next);
    }, [mode, role]);

    const handlePick = (resource, newList) => {
        setSelected(prev => ({
            ...prev,
            [resource]: new Set(newList),
        }));
    };

    const flattenSelected = () =>
        Object.entries(selected).flatMap(([res, set]) => Array.from(set || []).map(act => `${res}.${act}`));


    const handleSave = (e) => {
        e?.preventDefault?.();

        let permissionNames = flattenSelected();
        if (!permissionNames.length && role?.permissions?.length) {
            permissionNames = role.permissions;
        }

        if (mode === "edit") {
            if (!role?.id) {
                toast.error("Missing role id");
                return;
            }
            updateRole(
                { roleId: role.id, name: name.trim(), description: desc.trim(), permissionNames },
                {
                    onSuccess: (res) => {
                        toast.success("Role updated");
                        onSave?.(res);
                        onClose?.();
                    },
                    onError: (err) => {
                        toast.error(err?.response?.data?.message || err?.message || "Failed to update role");
                    },
                }
            );
            return;
        }

        const roleName = (name || "").trim();
        if (!roleName) {
            toast.error("Role name is required");
            return;
        }
        const payload = {
            name: roleName,
            description: (desc || "").trim(),
            permissionNames,
        };
        createRoleMutate(payload, {
            onSuccess: (created) => {
                toast.success("Role created");
                onSave?.(created);
                onClose?.();
            },
            onError: (err) => {
                const msg = err?.response?.data?.message || err?.message || "Failed to create role";
                toast.error(msg);
            },
        });
    };

    if (!open) return null;

    const isSaving = isCreating || isUpdating;
    const title = mode === "edit" ? "Edit Role" : "Add Role";
    const saveLabel = mode === "edit" ? "Update" : "Save";
    const lockFields = mode === "edit";

    return (
        <div className="fixed inset-0 z-[70]">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            <div className="relative z-[71] flex min-h-screen items-start md:items-center justify-center p-4 overflow-y-auto">
                <div className="w-full max-w-5xl rounded-xl bg-[#f6f7fb] border border-gray-200 shadow-2xl overflow-hidden">
                    <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="text-gray-500">Role Manage</span>
                            <span className="text-gray-400">›</span>
                            <span className="font-medium text-gray-800">{title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onClose}
                                className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-bold hover:bg-gray-50 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || (mode === "create" && !name.trim())}
                                className="px-3 py-2 rounded-lg bg-[#ffd026] text-blue-600 text-sm font-bold hover:opacity-90 disabled:opacity-50"
                            >
                                {isSaving ? (
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
                                        <span>Saving...</span>
                                    </span>
                                ) : (
                                    saveLabel
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[85vh] overflow-y-auto">

                        <form onSubmit={handleSave} className="p-4 space-y-4">
                            {/* Basic Information */}
                            <section className="rounded-xl bg-white shadow-sm">
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <h3 className="font-semibold text-gray-800">Basic Information</h3>
                                    {lockFields && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Name & Description are locked. You can only edit permissions.
                                        </p>
                                    )}
                                </div>

                                <div className="p-4 grid gap-4">
                                    {/* Role Name */}
                                    <div className="grid grid-cols-[160px_1fr] gap-4 items-center">
                                        <label className="text-sm text-gray-700">
                                            Role Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className={"w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"}
                                            placeholder="Inventory"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div className="grid grid-cols-[160px_1fr] gap-4">
                                        <label className="text-sm text-gray-700">Description</label>
                                        <div className="space-y-1">
                                            <textarea
                                                value={desc}
                                                onChange={(e) => {
                                                    const v = e.target.value.slice(0, MAX_DESC);
                                                    setDesc(v);
                                                }}
                                                rows={4}
                                                className={"w-full rounded-lg border resize-none border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"}
                                                placeholder="This role..."
                                            />
                                            <div className="text-xs text-gray-400 text-right">
                                                {desc.length} / {MAX_DESC}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Permission Settings (API-driven, nicer UI) */}
                            <section className="rounded-xl bg-white shadow-sm">
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <h3 className="font-semibold text-gray-800">Permission Settings</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Choose allowed actions for each permission module.
                                    </p>
                                </div>

                                <div className="p-4 space-y-4">
                                    {isLoading && <div className="flex items-center justify-center text-sm text-gray-600">
                                        <Loader className="animate-spin items-center" />
                                    </div>}
                                    {isError && (
                                        <div className="text-sm text-red-600">
                                            Failed to load permissions: {error?.message || "Unknown error"}
                                        </div>
                                    )}

                                    {!isLoading && !isError && grouped.length === 0 && (
                                        <div className="text-sm text-gray-600">No permissions found.</div>
                                    )}

                                    {!isLoading && !isError && grouped.length > 0 && (
                                        <div className="space-y-3">
                                            {grouped.map(({ resource, actions }) => {
                                                const picked = Array.from(selected[resource] || []);
                                                const title =
                                                    resource.charAt(0).toUpperCase() + resource.slice(1).replaceAll("_", " ");

                                                return (
                                                    <div
                                                        key={resource}
                                                        className="grid grid-cols-[200px_1fr] gap-4 items-start"
                                                    >
                                                        <div className="pt-2">
                                                            <div className="text-sm font-medium text-gray-800">{title}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {actions.length} action{actions.length !== 1 ? "s" : ""}
                                                            </div>
                                                        </div>

                                                        <PermissionMultiSelect
                                                            label="Actions"
                                                            actions={actions}
                                                            value={picked}
                                                            onChange={(vals) =>
                                                                handlePick(resource, vals)
                                                            }
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </section>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
