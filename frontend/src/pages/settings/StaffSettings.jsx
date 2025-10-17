import { useState } from "react";
import { Plus, Pencil, Trash2, Loader } from "lucide-react";
import { NoData } from "../../components/NoData.jsx";
import { AddMemberModal } from "../../components/AddMemberModal";
import { useMembers, useDeleteMember } from "../../hooks/useMembers"
import { ConfirmModal } from "../../components/ConfirmModal.jsx";
import { formatDate } from "../../utils/index.js";
import toast from "react-hot-toast";

export default function StaffSettings() {
    const { data: members = [], isLoading, isError, error, refetch } = useMembers();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const { mutate: deleteMember, isPending: isDeleting } = useDeleteMember();

    const openAddModal = () => {
        setEditingMember(null);
        setShowAddModal(true);
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setEditingMember(null);
    };

    const handleSaveMember = async (payload) => {
        console.log("Save member:", payload);
        setShowAddModal(false);
        await refetch();
    };

    const handleEdit = (member) => {
        setEditingMember(member);
        setShowAddModal(true);
    };

    const handleDelete = (member) => {
        setConfirmDelete(member);
    };

    const confirmDeleteMember = () => {
        if (!confirmDelete?.id) return;
        deleteMember(confirmDelete.id, {
            onSuccess: () => {
                toast.success("Member deleted successfully");
                setConfirmDelete(null);
            },
            onError: (err) => {
                const msg =
                    err?.response?.data?.message ||
                    err?.message ||
                    "Failed to delete member";
                toast.error(msg);
                setConfirmDelete(null);
            },
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Staff Settings</h1>
                <button
                    onClick={openAddModal}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ffd026] text-blue-600 text-sm font-bold hover:opacity-90 cursor-pointer"
                >
                    <Plus size={16} />
                    Add Member
                </button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white">
                <div className="grid grid-cols-7 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                    <div>Name</div>
                    <div>Email</div>
                    <div>Roles</div>
                    <div>Status</div>
                    <div>Active</div>
                    <div>Created At</div>
                    <div>Action</div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
                        <Loader className="animate-spin" />
                        <span>Loading members...</span>
                    </div>
                ) : isError ? (
                    <div className="flex items-center justify-between px-4 py-4 text-red-600 text-sm">
                        <span>{error?.message || "Failed to load members."}</span>
                        <button
                            onClick={() => refetch()}
                            className="px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-700"
                        >
                            Retry
                        </button>
                    </div>
                ) : members.length === 0 ? (
                    <NoData />
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {members.map((m) => {
                            const roleNames =
                                (m.roles || []).map((r) => r?.name).filter(Boolean).join(", ") || "-";
                            return (
                                <li
                                    key={m.id || m.email}
                                    className="grid grid-cols-7 px-4 py-3 text-sm text-gray-700 items-start gap-2"
                                >
                                    {/* Name */}
                                    <div className="break-words font-medium whitespace-pre-line">
                                        {m.fullName || "-"}
                                    </div>

                                    {/* Email */}
                                    <div className="break-words text-gray-600 whitespace-pre-line">
                                        {m.email || "-"}
                                    </div>

                                    {/* Roles */}
                                    <div className="break-words whitespace-pre-line">{roleNames}</div>

                                    {/* Status */}
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`w-2 h-2 rounded-full ${m.status === "active"
                                                ? "bg-green-500"
                                                : m.status === "invited"
                                                    ? "bg-yellow-500"
                                                    : "bg-gray-400"
                                                }`}
                                        />
                                        <span
                                            className={
                                                m.status === "active"
                                                    ? "text-green-600"
                                                    : m.status === "invited"
                                                        ? "text-yellow-600"
                                                        : "text-gray-500"
                                            }
                                        >
                                            {m.status
                                                ? m.status[0].toUpperCase() + m.status.slice(1)
                                                : "—"}
                                        </span>
                                    </div>

                                    {/* Active */}
                                    <div className="break-words whitespace-pre-line">
                                        {m.isActive ? "Yes" : "No"}
                                    </div>

                                    <div className="break-words whitespace-pre-line">
                                        {formatDate(m.createdAt)}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleEdit(m)}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer"
                                        >
                                            <Pencil size={14} /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(m)}
                                            disabled={isDeleting}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 text-red-600 disabled:opacity-50 cursor-pointer"
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {showAddModal && (
                <AddMemberModal
                    open={showAddModal}
                    onClose={closeAddModal}
                    onSave={handleSaveMember}
                    mode={editingMember ? "edit" : "create"}
                    member={editingMember}
                />
            )}

            {confirmDelete && (
                <ConfirmModal
                    open={!!confirmDelete}
                    title="Delete Member"
                    loading={isDeleting}
                    onClose={() => setConfirmDelete(null)}
                    onConfirm={confirmDeleteMember}
                >
                    <p className="text-gray-700">
                        Are you sure you want to delete{" "}
                        <span className="font-semibold">{confirmDelete.fullName}</span>? This action
                        cannot be undone.
                    </p>
                </ConfirmModal>
            )}
        </div>
    );
}