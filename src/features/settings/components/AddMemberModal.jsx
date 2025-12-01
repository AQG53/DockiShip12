import { useEffect, useMemo, useState } from "react";
import { Loader, ChevronDown, Check } from "lucide-react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from "@headlessui/react";
import toast from "react-hot-toast";
import { useRoles } from "../../../hooks/useRoles";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";

import {
  inviteMember,
  findUserByEmail,
  assignRolesToUser,
} from "../../../lib/api";

export function AddMemberModal({ open, onClose, onSave, mode = "create", member = null }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(null);

  const {
    data: roles = [],
    isLoading: rolesLoading,
    isError: rolesError,
  } = useRoles();

  const roleIdByName = useMemo(() => {
    const map = new Map();
    for (const r of roles) map.set(r.name, r.id);
    return map;
  }, [roles]);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId),
    [roles, selectedRoleId]
  );


  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && member) {
      setFullName(member.fullName || "");
      setEmail(member.email || "");

      const already = Array.isArray(member.roles)
        ? member.roles
          .map((r) => (typeof r === "string" ? r : r?.name))
          .filter(Boolean)
          .map((name) => roleIdByName.get(name))
          .filter(Boolean)
        : [];

      setSelectedRoleId(already[0] || null);
    } else {
      setFullName("");
      setEmail("");
      setSelectedRoleId(null);
    }
  }, [open, mode, member, roleIdByName]);

  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (mode === "create") {
      if (!fullName.trim()) return toast.error("Full name is required");
      if (!email.trim()) return toast.error("Email is required");
      if (!validateEmail(email)) return toast.error("Please enter a valid email");

      try {
        setIsSaving(true);
        await inviteMember({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
        });

        const found = await findUserByEmail(email.trim().toLowerCase());
        const userId = found?.userId || found?.id;
        if (userId) {
          const rolesToAssign = selectedRoleId ? [selectedRoleId] : [];
          await assignRolesToUser(userId, rolesToAssign);
        }

        toast.success(
          selectedRoleId > 0 ? "Member invited & role assigned" : "Member invited"
        );
        setIsSaving(false);
        onSave?.({ fullName, email, roleIds: selectedRoleId });
        onClose?.();
      } catch (err) {
        console.error(err);
        toast.error(err?.response?.data?.message || "Failed to invite member");
        setIsSaving(false);
      }
      return;
    }

    if (!member?.id) {
      toast.error("Missing member id");
      return;
    }
    try {
      setIsSaving(true);
      const rolesToAssign = selectedRoleId ? [selectedRoleId] : [];
      await assignRolesToUser(member.id, rolesToAssign);
      toast.success("Roles updated");
      setIsSaving(false);
      onSave?.({ userId: member.id, roleIds: selectedRoleId });
      onClose?.();
    } catch (err) {
      setIsSaving(false);
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update roles");
    }
  };

  if (!open) return null;

  const title = mode === "edit" ? "Edit Member" : "Add Member";
  const saveLabel = mode === "edit" ? "Update" : "Save";

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button
        variant="warning"
        onClick={handleSave}
        isLoading={isSaving}
        disabled={isSaving}
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
      widthClass="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-white shadow-sm border border-gray-100">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Member Information</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {mode === "edit"
                ? "Assign one or more roles to this member"
                : "Fill in details to invite a new team member (you can assign multiple roles)"}
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Full Name */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-center">
              <label className="text-sm text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={mode === "edit"}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
                placeholder="John Doe"
              />
            </div>

            {/* Email */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-center">
              <label className="text-sm text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={mode === "edit"}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
                placeholder="john@dockiship.com"
              />
            </div>

            {/* Roles (MULTI) */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-start">
              <label className="text-sm text-gray-700">Roles</label>

              <Listbox
                value={selectedRoleId}
                onChange={setSelectedRoleId}
                disabled={rolesLoading || rolesError}
              >
                <div className="relative">
                  <ListboxButton
                    className={`w-full inline-flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${rolesLoading
                      ? "border-gray-200 bg-gray-100 text-gray-400"
                      : "border-gray-300 bg-white text-gray-800"
                      } outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed`}
                  >
                    <span className="truncate text-left">
                      {rolesLoading
                        ? "Loading roles…"
                        : rolesError
                          ? "Failed to load roles"
                          : !selectedRole
                            ? "No role"
                            : selectedRole.name}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </ListboxButton>

                  <Transition
                    enter="transition ease-out duration-100"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                  >
                    <ListboxOptions className="absolute z-[72] mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg focus:outline-none max-h-60 overflow-auto">
                      <ListboxOption value={null}>
                        {() => (
                          <div className="px-3 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
                            No role
                          </div>
                        )}
                      </ListboxOption>
                      {roles.map((role) => (
                        <ListboxOption
                          key={role.id}
                          value={role.id}
                          className={({ active, selected }) =>
                            `flex items-center justify-between px-3 py-2 text-sm cursor-pointer ${active ? "bg-gray-50" : ""
                            } ${selected ? "text-blue-600" : "text-gray-700"}`
                          }
                        >
                          {({ selected }) => (
                            <>
                              <span className="truncate">{role.name}</span>
                              {selected && <Check className="h-4 w-4" />}
                            </>
                          )}
                        </ListboxOption>
                      ))}
                    </ListboxOptions>
                  </Transition>
                </div>
              </Listbox>
            </div>

            {mode === "edit" && (
              <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <strong>Note:</strong> Name and Email cannot be changed after account creation.
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
