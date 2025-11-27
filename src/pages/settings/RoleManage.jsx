import React, { useEffect, useState } from "react";
import { Plus, Inbox, Pencil, Trash2, X, Loader, Shield, Search } from "lucide-react";
import { AddRoleModal } from "../../components/AddRoleModal";
import { NoData } from "../../components/NoData";
import { formatDate } from "../../utils/index.js";
import { useDeleteRole, useRoles } from "../../hooks/useRoles.js";
import { ConfirmModal } from "../../components/ConfirmModal.jsx";
import toast from "react-hot-toast";

export default function RoleManage() {
    const { data: roles = [], isLoading, isError, error, refetch } = useRoles();
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: "", description: "" });
    const [editingRole, setEditingRole] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const { mutate: deleteRole, isPending: isDeleting } = useDeleteRole();
    const [search, setSearch] = useState("");

    const openModal = () => { setEditingRole(null); setShowModal(true); };
    const closeModal = () => {
        setShowModal(false);
        setForm({ name: "", description: "" });
        setEditingRole(null);
    };

    const handleSaveRole = async (payload) => {
        setShowModal(false);
        refetch();
    };

    const handleDelete = async (role) => {
        setConfirmDelete(role);
    };

    const handleEdit = (role) => {
        setForm({ name: role.name, description: role.description ?? "" });
        setShowModal(true);
        setEditingRole(role);
        setShowModal(true);
    };

    const confirmDeleteRole = () => {
        if (!confirmDelete?.id) return;
        deleteRole(confirmDelete.id, {
            onSuccess: () => {
                toast.success("Role deleted successfully");
                setConfirmDelete(null);
            },
            onError: (err) => {
                const msg =
                    err?.response?.data?.message ||
                    err?.message ||
                    "Failed to delete role";
                toast.error(msg);
                setConfirmDelete(null);
            },
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-amber-100 border border-gray-200 flex items-center justify-center">
                        <Shield size={18} className="text-amber-700" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900">Role Management</h1>
                        <p className="text-sm text-gray-500">Define roles and access permissions</p>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search roles"
                            className="h-9 rounded-lg border border-gray-300 px-3 pl-8 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 w-[240px]"
                        />
                    </div>
                    <button
                        onClick={openModal}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#ffd026] px-4 py-2 text-sm font-semibold text-blue-700 hover:opacity-90"
                    >
                        <Plus size={16} />
                        Add Role
                    </button>
                </div>
                <div className="grid grid-cols-[1fr_2fr_1fr_100px] bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-700">
                    <div>Role Name</div>
                    <div>Role Description</div>
                    <div>Create Time</div>
                    <div className="text-center">Action</div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
                        <Loader className="animate-spin" />
                        <span>Loading roles...</span>
                    </div>
                ) : isError ? (
                    <div className="flex items-center justify-center py-16 text-red-600">
                        {error?.message || "Failed to load roles"}
                    </div>
                ) : roles.length === 0 ? (
                    <NoData />
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {roles.map((r) => (
                            <li key={r.id} className="grid grid-cols-[1fr_2fr_1fr_100px] px-4 py-3 text-[13px] text-gray-700 items-center hover:bg-gray-50 transition-colors">
                                <div className="truncate">{r.name}</div>
                                <div className="truncate text-gray-600">{r.description || "—"}</div>
                                <div className="text-gray-600">{formatDate(r.createdAt)}</div>
                                <div className="flex items-center justify-center gap-1">
                                    <button
                                        onClick={() => handleEdit(r)}
                                        className="rounded-md border border-gray-300 px-1.5 py-0.5 text-[11px] font-medium hover:bg-gray-50 text-gray-700"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(r)}
                                        disabled={isDeleting}
                                        className="rounded-md border border-red-200 px-1.5 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {showModal && (
                <AddRoleModal
                    open={showModal}
                    onClose={closeModal}
                    onSave={handleSaveRole}
                    mode={editingRole ? "edit" : "create"}
                    role={editingRole}
                />
            )}

            {confirmDelete && (
                <ConfirmModal
                    open={!!confirmDelete}
                    title="Delete Role"
                    loading={isDeleting}
                    onClose={() => setConfirmDelete(null)}
                    onConfirm={confirmDeleteRole}
                >
                    <p className="text-gray-700">
                        Are you sure you want to delete{" "}
                        <span className="font-semibold">{confirmDelete.name}</span>? This action
                        cannot be undone.
                    </p>
                </ConfirmModal>
            )}
        </div>
    );
}