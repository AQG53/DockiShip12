import { Fragment, useState } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel } from "@headlessui/react";
import { Building2, MapPin, Mail, Phone, Globe2, Check } from "lucide-react";
import toast from "react-hot-toast";

export default function AddSupplierModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({
    companyName: "",
    currency: "",
    contacts: "",
    email: "",
    phone: "",
    country: "",
    address1: "",
    address2: "",
    zipCode: "",
    city: "",
    state: "",
    notes: "",
  });

  const [saving, setSaving] = useState(false);

  const input =
    "h-8 w-full rounded-lg border border-gray-300 bg-white px-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
  const label = "text-[12px] text-gray-600";
  const card = "rounded-xl border border-gray-200 bg-white";
  const primaryBtn =
    "inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[#ffd026] text-blue-700 text-sm font-bold hover:brightness-95 disabled:opacity-50";
  const ghostBtn =
    "inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100";

  const handleChange = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.companyName || !form.currency) {
      toast.error("Please fill required fields");
      return;
    }
    setSaving(true);
    try {
      // to be replaced with backend api call
      console.log("Saving supplier", form);
      toast.success("Supplier added");
      onSave?.(form);
      onClose?.();
      setForm({
        companyName: "",
        currency: "",
        contacts: "",
        email: "",
        phone: "",
        country: "",
        address1: "",
        address2: "",
        zipCode: "",
        city: "",
        state: "",
        notes: "",
      });
    } catch (e) {
      toast.error("Failed to add supplier");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[70]" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="transition-opacity ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </TransitionChild>

        <div className="fixed inset-0">
          <div className="flex min-h-full items-start justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="transition ease-out duration-150"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-[900px] max-h-[90vh] rounded-xl bg-[#f6f7fb] border border-gray-200 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between bg-white px-4 py-3 border-b rounded-t-xl border-gray-200">
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-amber-600" />
                    <h2 className="text-base font-semibold text-gray-900">Add Suppliers</h2>
                  </div>
                </div>

                {/* Body */}
                <div className="px-4 pt-3 pb-4 overflow-y-auto space-y-4">
                  {/* Basic Information */}
                  <div className={card}>
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900">Basic information</h3>
                    </div>
                    <div className="p-4 grid grid-cols-12 gap-3">
                      <Field className="col-span-12" label="Company Name *">
                        <input
                          className={input}
                          placeholder="Please enter Company Name"
                          value={form.companyName}
                          onChange={(e) => handleChange("companyName", e.target.value)}
                        />
                      </Field>

                      <Field className="col-span-12 md:col-span-6" label="Currency *">
                        <input
                          className={input}
                          placeholder="Please select Currency"
                          value={form.currency}
                          onChange={(e) => handleChange("currency", e.target.value)}
                        />
                      </Field>

                      <Field className="col-span-12 md:col-span-6" label="Contacts">
                        <input
                          className={input}
                          placeholder="Please enter Contacts"
                          value={form.contacts}
                          onChange={(e) => handleChange("contacts", e.target.value)}
                        />
                      </Field>

                      <Field className="col-span-12 md:col-span-6" label="Email">
                        <input
                          className={input}
                          placeholder="Please enter Email"
                          value={form.email}
                          onChange={(e) => handleChange("email", e.target.value)}
                        />
                      </Field>

                      <Field className="col-span-12 md:col-span-6" label="Phone">
                        <input
                          className={input}
                          placeholder="Please enter Phone"
                          value={form.phone}
                          onChange={(e) => handleChange("phone", e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className={card}>
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900">Address information</h3>
                    </div>
                    <div className="p-4 grid grid-cols-12 gap-3">
                      <Field className="col-span-12 md:col-span-6" label="Country *">
                        <input
                          className={input}
                          placeholder="Please select Country"
                          value={form.country}
                          onChange={(e) => handleChange("country", e.target.value)}
                        />
                      </Field>

                      <Field className="col-span-12" label="Address1 *">
                        <input
                          className={input}
                          placeholder="Please enter Address1"
                          value={form.address1}
                          onChange={(e) => handleChange("address1", e.target.value)}
                        />
                      </Field>

                      <Field className="col-span-12" label="Address2">
                        <input
                          className={input}
                          placeholder="Please enter Address2"
                          value={form.address2}
                          onChange={(e) => handleChange("address2", e.target.value)}
                        />
                      </Field>

                      <Field className="col-span-12 md:col-span-4" label="Zip Code *">
                        <input
                          className={input}
                          placeholder="Please enter Zip Code"
                          value={form.zipCode}
                          onChange={(e) => handleChange("zipCode", e.target.value)}
                        />
                      </Field>

                      <Field className="col-span-12 md:col-span-4" label="City *">
                        <input
                          className={input}
                          placeholder="Please enter City"
                          value={form.city}
                          onChange={(e) => handleChange("city", e.target.value)}
                        />
                      </Field>

                      <Field className="col-span-12 md:col-span-4" label="State *">
                        <input
                          className={input}
                          placeholder="Please enter State"
                          value={form.state}
                          onChange={(e) => handleChange("state", e.target.value)}
                        />
                      </Field>

                      <Field className="col-span-12" label="Notes">
                        <textarea
                          className={`${input} min-h-[80px] p-1.5`}
                          maxLength={500}
                          placeholder="Please enter Notes"
                          value={form.notes}
                          onChange={(e) => handleChange("notes", e.target.value)}
                        />
                        <div className="text-right text-[11px] text-gray-400">
                          {form.notes.length} / 500
                        </div>
                      </Field>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 bg-white rounded-b-xl px-4 py-3 flex items-center justify-end gap-2">
                  <button className={ghostBtn} onClick={onClose}>
                    Cancel
                  </button>
                  <button
                    className={primaryBtn}
                    disabled={saving}
                    onClick={handleSave}
                  >
                    Save
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      {label && <label className="text-[12px] text-gray-600">{label}</label>}
      {children}
    </div>
  );
}
