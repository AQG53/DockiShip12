import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition, Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { Building2, Plus, X, Search, ChevronDown, Check, Eye } from "lucide-react";
import toast from "react-hot-toast";
import useUserPermissions from "../../auth/hooks/useUserPermissions";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { NoData } from "../../../components/NoData";
import PageLoader from "../../../components/PageLoader";
import {
  useWarehouses,
  useCreateWarehouse,
  useUpdateWarehouse,
  useArchiveWarehouse,
} from "../hooks/useWarehouses";
import { lookupPostalCode } from "../../../lib/api";
import SelectCompact from "../../../components/SelectCompact";
import { useCountryOptions } from "../../../hooks/useCountryOptions";
import { Button } from "../../../components/ui/Button";
import { ActionMenu } from "../../../components/ui/ActionMenu";
import { HeadlessSelect } from "../../../components/ui/HeadlessSelect";
import ViewWarehouseModal from "../components/ViewWarehouseModal";

const inputClass =
  "h-9 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 w-full";
const card = "rounded-xl border border-gray-200 bg-white";
const badge = (active) =>
  `inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"
  }`;
const GRID = "grid grid-cols-[1fr_1.4fr_1fr_0.9fr_0.9fr_0.9fr_0.8fr]";

const defaultForm = {
  name: "",
  address1: "",
  zipCode: "",
  city: "",
  state: "",
  country: "",
};

const sanitizePostalInput = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).replace(/[^0-9]/g, "");
};

export default function WarehouseList() {
  const { claims, ready } = useUserPermissions();
  const perms = useMemo(
    () => new Set(Array.isArray(claims?.perms) ? claims.perms.map(String) : []),
    [claims],
  );
  const firstRole = String(claims?.roles?.[0] ?? "").toLowerCase();
  const isOwner = firstRole === "owner";
  const canManage = isOwner || perms.has("warehouses.manage");
  const canRead = isOwner || canManage || perms.has("warehouses.read");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const statusOptions = useMemo(() => [
    { id: "", name: "All Status" },
    { id: "active", name: "Active" },
    { id: "inactive", name: "Inactive" },
  ], []);
  const [statusFilter, setStatusFilter] = useState(statusOptions[1]); // Default to Active

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: rows = [], isLoading } = useWarehouses({
    enabled: canRead,
    search: debouncedSearch,
    status: statusFilter.id,
  });
  const createMut = useCreateWarehouse();
  const updateMut = useUpdateWarehouse();
  const archiveMut = useArchiveWarehouse();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetWarehouse, setTargetWarehouse] = useState(null);

  // View Modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewWarehouse, setViewWarehouse] = useState(null);

  useEffect(() => {
    if (!modalOpen) {
      setEditing(null);
    }
  }, [modalOpen]);

  const openModalFor = (warehouse) => {
    setEditing(warehouse || null);
    setModalOpen(true);
  };

  const handleSave = async (payload) => {
    try {
      if (editing?.id) {
        await updateMut.mutateAsync({ id: editing.id, payload });
        toast.success("Warehouse updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Warehouse created");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err?.message || "Failed to save warehouse");
    }
  };

  const handleArchive = async () => {
    if (!targetWarehouse?.id) return;
    try {
      await archiveMut.mutateAsync(targetWarehouse.id);
      toast.success("Warehouse archived");
      setConfirmOpen(false);
    } catch (err) {
      toast.error(err?.message || "Failed to archive");
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        You don’t have permission to view warehouses.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-amber-100 border border-gray-200 flex items-center justify-center">
            <Building2 size={18} className="text-amber-700" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Warehouses</h1>
            <p className="text-sm text-gray-500">Manage warehouse locations and addresses</p>
          </div>
        </div>
      </div>

      <div className={card}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search warehouses"
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
          {canManage && (
            <Button variant="warning" onClick={() => openModalFor(null)}>
              <Plus size={16} className="mr-2" /> Add Warehouse
            </Button>
          )}
        </div>

        <div className={`${GRID} bg-gray-50 px-4 py-3 text-[12px] font-semibold text-gray-700`}>
          <div>Code</div>
          <div>Name / Address</div>
          <div className="text-center">City</div>
          <div className="text-center">State</div>
          <div className="text-center">Country</div>
          <div className="text-center">Status</div>
          <div className="text-right">Actions</div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center p-6 text-sm text-gray-500">Loading…</div>
        ) : rows.length === 0 ? (
          <NoData className="p-6" />
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((wh) => (
              <li
                key={wh.id}
                className={`${GRID} px-4 py-3 text-[13px] text-gray-800 items-center gap-y-2 hover:bg-gray-50 transition-colors`}
              >
                <div className="font-semibold text-gray-900">{wh.code}</div>
                <div>
                  <div className="font-semibold text-gray-900">{wh.name}</div>
                  {wh.address1 || wh.address2 ? (
                    <div className="text-xs text-gray-500">
                      {[wh.address1, wh.address2].filter(Boolean).join(", ")}
                    </div>
                  ) : null}
                </div>
                <div className="text-center">{wh.city || "—"}</div>
                <div className="text-center">{wh.state || "—"}</div>
                <div className="text-center">{wh.country || "—"}</div>
                <div className="text-center">
                  <span className={badge(wh.isActive)}>{wh.isActive ? "Active" : "Inactive"}</span>
                </div>
                <div className="flex items-center justify-end gap-1">
                  {canManage && (() => {
                    const actions = [
                      {
                        label: "View",
                        onClick: () => {
                          setViewWarehouse(wh);
                          setViewModalOpen(true);
                        },
                        variant: "secondary",
                        icon: Eye,
                      },
                      {
                        label: "Edit",
                        onClick: () => openModalFor(wh),
                        variant: "secondary",
                      },
                      {
                        label: wh.isActive ? "Deactivate" : "Activate",
                        onClick: () => {
                          if (wh.isActive) {
                            setTargetWarehouse(wh);
                            setConfirmOpen(true);
                          } else {
                            updateMut.mutateAsync({ id: wh.id, payload: { isActive: true } })
                              .then(() => toast.success("Warehouse activated"))
                              .catch((e) => toast.error(e.message));
                          }
                        },
                        variant: wh.isActive ? "danger-outline" : "secondary",
                        className: wh.isActive ? "" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      }
                    ];

                    const visibleActions = actions.slice(0, 2);
                    const overflowActions = actions.slice(2);

                    return (
                      <>
                        {visibleActions.map((action, idx) => (
                          <Button
                            key={idx}
                            variant={action.variant}
                            size="xs"
                            className={`rounded-md ${action.className || ""}`}
                            onClick={action.onClick}
                          >
                            {action.label}
                          </Button>
                        ))}
                        {overflowActions.length > 0 && (
                          <ActionMenu actions={overflowActions} />
                        )}
                      </>
                    );
                  })()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <WarehouseModal
        open={modalOpen}
        initial={editing}
        saving={createMut.isPending || updateMut.isPending}
        onSave={handleSave}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Deactivate Warehouse"
        loading={updateMut.isPending}
        onConfirm={async () => {
          if (!targetWarehouse?.id) return;
          try {
            await updateMut.mutateAsync({ id: targetWarehouse.id, payload: { isActive: false } });
            toast.success("Warehouse deactivated");
            setConfirmOpen(false);
          } catch (err) {
            toast.error(err?.message || "Failed to deactivate");
          }
        }}
      >
        Are you sure you want to deactivate{" "}
        <strong>{targetWarehouse?.name || "this warehouse"}</strong>? It will be hidden from active selections.
      </ConfirmModal>

      <ViewWarehouseModal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        warehouse={viewWarehouse}
      />
    </div>
  );
}

function WarehouseModal({ open, initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(defaultForm);
  const [zipLoading, setZipLoading] = useState(false);
  const { countries, loading: countryLoading } = useCountryOptions();

  useEffect(() => {
    if (!open) return;
    setForm({
      ...defaultForm,
      ...(initial
        ? {
          name: initial.name || "",
          address1: initial.address1 || initial.address || "",
          zipCode: sanitizePostalInput(initial.zipCode || ""),
          city: initial.city || "",
          state: initial.state || "",
          country: initial.country || "",
        }
        : {}),
    });
  }, [initial, open]);

  // countries loaded via hook

  const setField = (key, value) => {
    let next = value;
    if (key === "zipCode") {
      next = sanitizePostalInput(value);
    }
    if (key === "country") {
      next = value ? String(value).toUpperCase() : "";
    }
    setForm((prev) => ({ ...prev, [key]: next }));
  };

  const handleSubmit = () => {
    const name = form.name.trim();
    const address = form.address1.trim();
    const zip = form.zipCode.trim();
    const city = form.city.trim();
    const state = form.state.trim();
    const country = form.country.trim();
    if (!name || !address || !zip) {
      toast.error("Name, address, and zip code are required");
      return;
    }
    if (!country || !city || !state) {
      toast.error("Country, state, and city are required");
      return;
    }
    const payload = {
      name,
      address1: address,
      zipCode: zip,
      city,
      state,
      country: country.toUpperCase(),
    };
    onSave(payload);
  };

  const handleZipBlur = async () => {
    if (!form.zipCode) return;
    setZipLoading(true);
    try {
      const manualCountry = (form.country || "").trim().toUpperCase();
      // If we have a country, pass it. If not, don't pass it (let backend find match).
      // However, frontend previous logic was: try geo (no country) -> try country (manual).
      // Our backend handles both cases: if country is present, it filters. If not, it searches.

      const res = await lookupPostalCode(form.zipCode, manualCountry || undefined);
      if (res && (res.city || res.state || res.country)) {
        setForm(prev => ({
          ...prev,
          city: res.city || prev.city,
          state: res.state || prev.state,
          country: res.country || prev.country
        }));
      }

    } catch (err) {
      console.error("Postal lookup failed", err);
    } finally {
      setZipLoading(false);
    }
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[80]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-[#f6f7fb] shadow-2xl">
                <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-md bg-amber-100 border border-amber-200 flex items-center justify-center">
                      <Building2 size={18} className="text-amber-700" />
                    </div>
                    <Dialog.Title className="text-base font-semibold text-gray-900">
                      {initial ? "Edit Warehouse" : "Add Warehouse"}
                    </Dialog.Title>
                  </div>
                  <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                    <X size={20} />
                  </button>
                </div>

                <div className="px-4 pt-3 pb-4 space-y-4">
                  <div className={card}>
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">General details</p>
                      <p className="text-xs text-gray-500">Warehouse name</p>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <label className="block text-[12px] text-gray-600 mb-1">
                          Name <span className="text-red-600">*</span>
                        </label>
                        <input
                          className={inputClass}
                          value={form.name}
                          onChange={(e) => setField("name", e.target.value)}
                          placeholder="e.g. West Coast DC"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={card}>
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">Location details</p>
                      <p className="text-xs text-gray-500">Address and geography</p>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="block text-[12px] text-gray-600 mb-1">
                          Address <span className="text-red-600">*</span>
                        </label>
                        <input
                          className={inputClass}
                          value={form.address1}
                          onChange={(e) => setField("address1", e.target.value)}
                          placeholder="Street, suite, etc."
                        />
                      </div>
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-12 md:col-span-6">
                          <label className="block text-[12px] text-gray-600 mb-1">
                            Country <span className="text-red-600">*</span>
                          </label>
                          <SelectCompact
                            value={form.country ? form.country : "Select"}
                            onChange={(val) => setField("country", val === "Select" ? "" : val)}
                            options={countries}
                            filterable
                            disabled={countryLoading}
                          />
                          {countryLoading && (
                            <div className="text-[11px] text-gray-500 mt-1">Loading countries…</div>
                          )}
                        </div>
                        <div className="col-span-12 md:col-span-6">
                          <label className="block text-[12px] text-gray-600 mb-1">
                            Zip Code <span className="text-red-600">*</span>
                          </label>
                          <input
                            className={inputClass}
                            value={form.zipCode}
                            onChange={(e) => setField("zipCode", e.target.value)}
                            onBlur={handleZipBlur}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="Postal code"
                          />
                          {zipLoading && (
                            <div className="text-[11px] text-gray-500 mt-1">Looking up city and state…</div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-12 md:col-span-6">
                          <label className="block text-[12px] text-gray-600 mb-1">
                            City <span className="text-red-600">*</span>
                          </label>
                          <input
                            className={inputClass}
                            value={form.city}
                            onChange={(e) => setField("city", e.target.value)}
                          />
                        </div>
                        <div className="col-span-12 md:col-span-6">
                          <label className="block text-[12px] text-gray-600 mb-1">
                            State / Province <span className="text-red-600">*</span>
                          </label>
                          <input
                            className={inputClass}
                            value={form.state}
                            onChange={(e) => setField("state", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 bg-white px-4 py-3 flex items-center justify-end gap-2">
                  <Button variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button variant="warning" onClick={handleSubmit} isLoading={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}




