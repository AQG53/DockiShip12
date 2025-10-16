import { useEffect, useMemo, useState } from "react";
import { Loader, ChevronDown, Check } from "lucide-react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from "@headlessui/react";
import toast from "react-hot-toast";
import { useRoles } from "../hooks/useRoles";

import {
  inviteMember,
  findUserByEmail,
  assignRolesToUser,
} from "../lib/api";

export function AddMemberModal({ open, onClose, onSave, mode = "create", member = null }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);

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

  const selectedRoles = useMemo(
    () => roles.filter((r) => selectedRoleIds.includes(r.id)),
    [roles, selectedRoleIds]
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

      setSelectedRoleIds(already);
    } else {
      setFullName("");
      setEmail("");
      setSelectedRoleIds([]);
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

        if (selectedRoleIds.length > 0) {
          const found = await findUserByEmail(email.trim().toLowerCase());
          const userId = found?.userId || found?.id;
          if (!userId) {
            toast.error("Invited, but couldn’t resolve user id to assign roles");
          } else {
            await assignRolesToUser(userId, selectedRoleIds);
          }
        }

        toast.success(
          selectedRoleIds.length > 0 ? "Member invited & roles assigned" : "Member invited"
        );
        setIsSaving(false);
        onSave?.({ fullName, email, roleIds: selectedRoleIds });
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
      await assignRolesToUser(member.id, selectedRoleIds);
      toast.success("Roles updated");
      setIsSaving(false);
      onSave?.({ userId: member.id, roleIds: selectedRoleIds });
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

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-[71] flex min-h-screen items-start md:items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-2xl rounded-xl bg-[#f6f7fb] border border-gray-200 shadow-2xl overflow-visible max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-gray-200 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-gray-500">Staff Settings</span>
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
                disabled={isSaving}
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

          {/* Content */}
          <div className="p-4">
            <div className="rounded-xl bg-white shadow-sm">
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
                    value={selectedRoleIds}
                    onChange={setSelectedRoleIds}
                    multiple
                    disabled={rolesLoading || rolesError}
                  >
                    <div className="relative">
                      <ListboxButton
                        className={`w-full inline-flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                          rolesLoading
                            ? "border-gray-200 bg-gray-100 text-gray-400"
                            : "border-gray-300 bg-white text-gray-800"
                        } outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed`}
                      >
                        <span className="truncate text-left">
                          {rolesLoading
                            ? "Loading roles…"
                            : rolesError
                            ? "Failed to load roles"
                            : selectedRoles.length === 0
                            ? "No role"
                            : selectedRoles.length === 1
                            ? selectedRoles[0].name
                            : `${selectedRoles[0].name}, ${selectedRoles[1]?.name ?? ""}${
                                selectedRoles.length > 2 ? `  +${selectedRoles.length - 2}` : ""
                              }`}
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
                          <ListboxOption value="__CLEAR_ALL__" disabled>
                            {() => (
                              <div className="px-3 py-2 text-[11px] text-gray-500 border-b border-gray-100">
                                Select one or more roles
                              </div>
                            )}
                          </ListboxOption>

                          {roles.map((role) => (
                            <ListboxOption
                              key={role.id}
                              value={role.id}
                              className={({ active, selected }) =>
                                `flex items-center justify-between px-3 py-2 text-sm cursor-pointer ${
                                  active ? "bg-gray-50" : ""
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
        </div>
      </div>
    </div>
  );
}
