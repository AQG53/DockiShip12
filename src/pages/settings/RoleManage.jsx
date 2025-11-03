import React, { useEffect, useState } from "react";
import { Plus, Inbox, Pencil, Trash2, X, Loader } from "lucide-react";
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
                <h1 className="text-xl font-semibold">Role</h1>
                <button
                    onClick={openModal}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ffd026] text-blue-600 text-sm font-bold hover:opacity-90 cursor-pointer"
                >
                    <Plus size={16} />
                    Add Role
                </button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white">
                <div className="grid grid-cols-4 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                    <div>Role Name</div>
                    <div>Role Description</div>
                    <div>Create Time</div>
                    <div>Action</div>
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
                            <li key={r.id} className="grid grid-cols-4 px-4 py-3 text-sm text-gray-700">
                                <div className="truncate">{r.name}</div>
                                <div className="truncate text-gray-600">{r.description || "—"}</div>
                                <div className="text-gray-600">{formatDate(r.createdAt)}</div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEdit(r)}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer"
                                    >
                                        <Pencil size={14} /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(r)}
                                        disabled={isDeleting}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 text-red-600 cursor-pointer"
                                    >
                                        <Trash2 size={14} /> Delete
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