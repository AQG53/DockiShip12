import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { DataTable } from "../../../components/ui/DataTable";
import { HeadlessSelect } from "../../../components/ui/HeadlessSelect";
import {
    useSearchMarketplaceChannels,
    useCreateMarketplaceChannel,
    useUpdateMarketplaceChannel,
    useDeleteMarketplaceChannel,
} from "../../../hooks/useProducts";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { Switch } from "@headlessui/react";

const inputClass =
    "h-9 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 w-full";

export default function MarketplaceChannelsList() {
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

    const { data: rows = [], isLoading } = useSearchMarketplaceChannels({
        q: debouncedSearch,
    });

    const createMut = useCreateMarketplaceChannel();
    const updateMut = useUpdateMarketplaceChannel();
    const deleteMut = useDeleteMarketplaceChannel();
    const [deleteTarget, setDeleteTarget] = useState(null);

    const handleToggle = (row) => {
        updateMut.mutate({
            id: row.id,
            payload: { isActive: !(row.isActive !== false) } // if active (true/undefined) -> make false
        }, {
            onSuccess: () => toast.success("Updated"),
            onError: () => toast.error("Failed to update status")
        });
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteMut.mutateAsync(deleteTarget.id);
            toast.success("Channel deleted");
            setDeleteTarget(null);
        } catch (e) {
            console.error("Delete failed:", e);
            toast.error(e?.response?.data?.message || e?.message || "Failed to delete");
        }
    };

    // Filter by status locally since the API doesn't support status filter
    const filteredRows = useMemo(() => {
        if (!statusFilter.id) return rows;
        return rows.filter(row =>
            statusFilter.id === 'active' ? row.isActive !== false : row.isActive === false
        );
    }, [rows, statusFilter.id]);

    const [modalOpen, setModalOpen] = useState(false);
    const [name, setName] = useState("");
    const [storeUrl, setStoreUrl] = useState("");

    const openModal = () => {
        setName("");
        setStoreUrl("");
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Name is required");
            return;
        }
        try {
            await createMut.mutateAsync({
                marketplace: name,
                storeUrl: storeUrl.trim() || undefined,
            });
            toast.success("Created successfully");
            setModalOpen(false);
        } catch (err) {
            toast.error(err?.message || "Failed to save");
        }
    };

    const saving = createMut.isPending;

    const columns = [
        {
            key: "marketplace",
            label: "Name",
            className: "text-gray-900 font-medium",
            render: (row) => row.marketplace || row.name || "—",
        },
        {
            key: "storeUrl",
            label: "URL",
            className: "text-gray-600",
            render: (row) => row.storeUrl ? (
                <a
                    href={row.storeUrl.startsWith('http') ? row.storeUrl : `https://${row.storeUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate block max-w-[200px]"
                >
                    {row.storeUrl}
                </a>
            ) : "—",
        },
        {
            key: "status",
            label: "Status",
            className: "text-center w-[120px]",
            headerClassName: "text-center",
            render: (row) => (
                <div className="flex justify-center">
                    <Switch
                        checked={row.isActive !== false}
                        onChange={() => handleToggle(row)}
                        className={`${row.isActive !== false ? 'bg-emerald-500' : 'bg-gray-200'
                            } relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`}
                    >
                        <span
                            className={`${row.isActive !== false ? 'translate-x-5' : 'translate-x-1'
                                } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                        />
                    </Switch>
                </div>
            ),
        },
        {
            key: "actions",
            label: "Actions",
            className: "text-center w-[100px]",
            align: "center",
            render: (row) => (
                <div className="flex justify-center">
                    <button
                        onClick={() => setDeleteTarget(row)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete Channel"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
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
                <Plus size={16} className="mr-2" /> Add Channel
            </Button>
        </>
    );

    return (
        <div className="space-y-4">
            <DataTable
                columns={columns}
                rows={filteredRows}
                isLoading={isLoading}
                gridCols="grid-cols-[1fr_1fr_120px_100px]"
                toolbar={toolbar}
            />

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Add Marketplace Channel"
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
                <div>
                    <label className="block text-[12px] font-medium text-gray-700 mb-1">
                        Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClass}
                        placeholder="e.g. TikTok Shop, Daraz"
                        autoFocus
                    />
                </div>
                <div className="mt-3">
                    <label className="block text-[12px] font-medium text-gray-700 mb-1">
                        URL <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                        type="text"
                        value={storeUrl}
                        onChange={(e) => setStoreUrl(e.target.value)}
                        className={inputClass}
                        placeholder="e.g. https://shop.tiktok.com/yourstore"
                    />
                </div>
            </Modal>
            <ConfirmModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Delete Channel"
                confirmText="Delete Channel"
                onConfirm={handleDelete}
                isLoading={deleteMut.isPending}
                variant="danger"
            >
                <p>Are you sure you want to delete <span className="font-semibold">"{deleteTarget?.marketplace || deleteTarget?.name}"</span>? This will also remove any product listings associated with this channel.</p>
            </ConfirmModal>
        </div>
    );
}
