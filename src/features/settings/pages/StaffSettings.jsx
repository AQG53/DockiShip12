import { useState } from "react";
import { Plus, Pencil, Trash2, Loader, Users, Search } from "lucide-react";
import { NoData } from "../../../components/NoData.jsx";
import { AddMemberModal } from "../components/AddMemberModal";
import { useMembers, useDeleteMember } from "../hooks/useMembers"
import { ConfirmModal } from "../../../components/ConfirmModal.jsx";
import { formatDate } from "../../../utils/index.js";
import toast from "react-hot-toast";
import { Button } from "../../../components/ui/Button";

export default function StaffSettings() {
    const { data: members = [], isLoading, isError, error, refetch } = useMembers();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const { mutate: deleteMember, isPending: isDeleting } = useDeleteMember();
    const [search, setSearch] = useState("");

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
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-amber-100 border border-gray-200 flex items-center justify-center">
                        <Users size={18} className="text-amber-700" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900">Staff Settings</h1>
                        <p className="text-sm text-gray-500">Manage team members and permissions</p>
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
                            placeholder="Search members"
                            className="h-9 rounded-lg border border-gray-300 px-3 pl-8 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 w-[240px]"
                        />
                    </div>
                    <Button
                        variant="warning"
                        onClick={openAddModal}
                    >
                        <Plus size={16} className="mr-2" />
                        Add Member
                    </Button>
                </div>
                <div className="grid grid-cols-[1fr_1.5fr_1fr_0.8fr_0.6fr_1fr_100px] bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-700">
                    <div>Name</div>
                    <div>Email</div>
                    <div>Roles</div>
                    <div>Status</div>
                    <div>Active</div>
                    <div>Created At</div>
                    <div className="text-center">Action</div>
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
                                    className="grid grid-cols-[1fr_1.5fr_1fr_0.8fr_0.6fr_1fr_100px] px-4 py-3 text-[13px] text-gray-700 items-center gap-2 hover:bg-gray-50 transition-colors"
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
                                    {(() => {
                                        const now = Date.now();
                                        const invitedAt = m.invitedAt ? new Date(m.invitedAt).getTime() : null;
                                        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                                        const isExpired = m.status === 'invited' && invitedAt != null && (now - invitedAt) > sevenDaysMs;
                                        const dotColor = m.status === 'active' ? 'bg-green-500' : (isExpired ? 'bg-red-500' : (m.status === 'invited' ? 'bg-yellow-500' : 'bg-gray-400'));
                                        const textColor = m.status === 'active' ? 'text-green-600' : (isExpired ? 'text-red-600' : (m.status === 'invited' ? 'text-yellow-600' : 'text-gray-500'));
                                        const label = isExpired ? 'Expired' : (m.status ? m.status[0].toUpperCase() + m.status.slice(1) : '—');
                                        return (
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                                                <span className={textColor}>{label}</span>
                                            </div>
                                        );
                                    })()}

                                    {/* Active */}
                                    <div className="break-words whitespace-pre-line">
                                        {m.isActive ? "Yes" : "No"}
                                    </div>

                                    <div className="break-words whitespace-pre-line">
                                        {formatDate(m.createdAt)}
                                    </div>

                                    <div className="flex items-center justify-center gap-1">
                                        <Button
                                            variant="secondary"
                                            size="xs"
                                            onClick={() => handleEdit(m)}
                                            className="rounded-md"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="danger-outline"
                                            size="xs"
                                            onClick={() => handleDelete(m)}
                                            disabled={isDeleting}
                                            className="rounded-md"
                                        >
                                            Delete
                                        </Button>
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
