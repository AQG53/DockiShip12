import { useEffect, useMemo, useState } from "react";
import { Loader, X } from "lucide-react";
import { usePermissions } from "../../../hooks/usePermissions";
import PermissionMultiSelect from "./PermissionMultiSelect";
import toast from "react-hot-toast";
import { useCreateRole } from "../../../hooks/useCreateRole";
import { useUpdateRole } from "../../../hooks/useUpdateRole";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";

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
            const parts = full.split(".").filter(Boolean);
            if (parts.length < 2) continue;
            const resource = parts.slice(0, -1).join(".");
            const action = parts[parts.length - 1];
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
            const parts = p.split(".").filter(Boolean);
            if (parts.length < 2) continue;
            const res = parts.slice(0, -1).join(".");
            const act = parts[parts.length - 1];
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

    const footer = (
        <>
            <Button variant="ghost" onClick={onClose}>
                Cancel
            </Button>
            <Button
                variant="warning"
                onClick={handleSave}
                isLoading={isSaving}
                disabled={isSaving || (mode === "create" && !name.trim())}
            >
                {saveLabel}
            </Button>
        </>
    );

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            footer={footer}
            widthClass="max-w-5xl"
        >
            <form onSubmit={handleSave} className="space-y-4">
                {/* Basic Information */}
                <section className="rounded-xl bg-white shadow-sm border border-gray-100">
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
                <section className="rounded-xl bg-white shadow-sm border border-gray-100">
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
        </Modal>
    );
}
