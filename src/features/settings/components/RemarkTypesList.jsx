import { useState, useEffect, useMemo } from "react";
import { Plus, Search } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../../components/ui/Button";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { Modal } from "../../../components/ui/Modal";
import { DataTable } from "../../../components/ui/DataTable";
import { HeadlessSelect } from "../../../components/ui/HeadlessSelect";
import {
    useRemarkTypes,
    useCreateRemarkType,
    useUpdateRemarkType,
    useDeleteRemarkType,
} from "../hooks/useRemarkTypes";

const inputClass =
    "h-9 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 w-full";

export default function RemarkTypesList() {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const statusOptions = useMemo(() => [
        { id: "", name: "All Status" },
        { id: "active", name: "Active" },
        { id: "inactive", name: "Inactive" },
    ], []);
    const [statusFilter, setStatusFilter] = useState(statusOptions[1]); // Default to Active

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: rows = [], isLoading } = useRemarkTypes({
        search: debouncedSearch,
        status: statusFilter.id,
    });
    const createMut = useCreateRemarkType();
    const updateMut = useUpdateRemarkType();
    const deleteMut = useDeleteRemarkType();

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [target, setTarget] = useState(null);

    // Form state
    const [form, setForm] = useState({ name: "", description: "" });

    const openModal = (item = null) => {
        setEditing(item);
        setForm({ name: item?.name || "", description: item?.description || "" });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error("Name is required");
            return;
        }
        try {
            if (editing) {
                await updateMut.mutateAsync({ id: editing.id, payload: form });
                toast.success("Updated successfully");
            } else {
                await createMut.mutateAsync(form);
                toast.success("Created successfully");
            }
            setModalOpen(false);
        } catch (err) {
            toast.error(err?.message || "Failed to save");
        }
    };

    const handleDelete = async () => {
        if (!target) return;
        try {
            await deleteMut.mutateAsync(target.id);
            toast.success("Deleted successfully");
            setConfirmOpen(false);
        } catch (err) {
            toast.error(err?.message || "Failed to delete");
        }
    };

    const handleToggleActive = async (row) => {
        try {
            await updateMut.mutateAsync({ id: row.id, payload: { isActive: !row.isActive } });
            toast.success(row.isActive ? "Deactivated" : "Activated");
        } catch (err) {
            toast.error(err?.message || "Failed to update status");
        }
    };

    const saving = createMut.isPending || updateMut.isPending;

    const columns = [
        {
            key: "name",
            label: "Name",
            className: "text-gray-900 font-medium",
        },
        {
            key: "description",
            label: "Description",
            className: "text-gray-500 truncate",
            render: (row) => row.description || "—",
        },
        {
            key: "status",
            label: "Status",
            className: "text-center",
            headerClassName: "text-center",
            render: (row) => (
                <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${row.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-700"
                    }`}>
                    {row.isActive ? "Active" : "Inactive"}
                </span>
            ),
        },
        {
            key: "actions",
            label: "Actions",
            headerClassName: "text-right",
            className: "text-right",
            render: (row) => (
                <div className="flex justify-end gap-1">
                    <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => openModal(row)}
                    >
                        Edit
                    </Button>
                    <Button
                        variant={row.isActive ? "danger-outline" : "secondary"}
                        size="xs"
                        className={!row.isActive ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : ""}
                        onClick={() => handleToggleActive(row)}
                    >
                        {row.isActive ? "Deactivate" : "Activate"}
                    </Button>
                </div>
            ),
        },
    ];

    const toolbar = (
        <>
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search"
                        className="h-9 w-[220px] rounded-lg border border-gray-300 pl-8 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    />
                </div>
                <HeadlessSelect
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={statusOptions}
                    className="w-[140px]"
                />
            </div>
            <Button variant="warning" onClick={() => openModal()}>
                <Plus size={16} className="mr-2" /> Add Remark Type
            </Button>
        </>
    );

    return (
        <div className="space-y-4">
            <DataTable
                columns={columns}
                rows={rows}
                isLoading={isLoading}
                gridCols="grid-cols-[1fr_1.5fr_100px_180px]"
                toolbar={toolbar}
            />

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? "Edit Remark Type" : "Add Remark Type"}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="warning" onClick={handleSave} isLoading={saving}>
                            Save
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <div>
                        <label className="block text-[12px] font-medium text-gray-700 mb-1">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className={inputClass}
                            placeholder="e.g. Dispute Filed"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-[12px] font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <input
                            type="text"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className={inputClass}
                            placeholder="Optional details..."
                        />
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleDelete}
                title="Delete Remark Type"
                loading={deleteMut.isPending}
            >
                Are you sure you want to delete <strong>{target?.name}</strong>? This action cannot be undone.
            </ConfirmModal>
        </div>
    );
}
