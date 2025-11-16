import { Fragment, useEffect, useState, useRef } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel, Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { Building2, MapPin, Mail, Phone, Globe2, Check, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { useCreateSupplier, useUpdateSupplier } from "../hooks/useSuppliers";

const sanitizePostalInput = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).replace(/[^0-9]/g, "");
};

const sanitizePhoneInput = (value) => {
  if (value === undefined || value === null) return "";
  let cleaned = String(value).replace(/[^0-9+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) {
    cleaned = "+" + cleaned.slice(1).replace(/\+/g, "");
  } else {
    cleaned = cleaned.replace(/\+/g, "");
  }
  return cleaned;
};

export default function AddSupplierModal({ open, onClose, onSave, supplier }) {
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
  const [countries, setCountries] = useState(["Select"]);
  const [countryLoading, setCountryLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const contactsRef = useRef(null);

  const currencies = [
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'GBP', label: 'British Pound (£)' },
    { value: 'CAD', label: 'Canadian Dollar (C$)' },
    { value: 'AUD', label: 'Australian Dollar (A$)' },
    { value: 'JPY', label: 'Japanese Yen (¥)' },
    { value: 'CNY', label: 'Chinese Yuan (¥)' },
    { value: 'INR', label: 'Indian Rupee (₹)' },
    { value: 'PKR', label: 'Pakistani Rupee (Rs)' },
  ];

  const isEdit = !!(supplier && supplier.id);
  const { mutateAsync: createMutate } = useCreateSupplier();
  const { mutateAsync: updateMutate } = useUpdateSupplier();

  useEffect(() => {
    if (open) {
      if (supplier) {
        setForm({
          companyName: supplier.companyName || "",
          currency: supplier.currency || "USD",
          contacts: supplier.contacts || "",
          email: supplier.email || "",
          phone: sanitizePhoneInput(supplier.phone || ""),
          country: supplier.country || "",
          address1: supplier.address1 || "",
          address2: supplier.address2 || "",
          zipCode: sanitizePostalInput(supplier.zipCode || ""),
          city: supplier.city || "",
          state: supplier.state || "",
          notes: supplier.notes || "",
        });
      } else {
        setForm({
          companyName: "",
          currency: "USD",
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
      }
    }
  }, [open, supplier]);

  // Load country list when modal opens (searchable select)
  useEffect(() => {
    let aborted = false;
    async function loadCountryCodes() {
      try {
        setCountryLoading(true);
        const res = await fetch("https://restcountries.com/v3.1/all?fields=cca2,name");
        const data = await res.json();
        if (aborted) return;
        const items = Array.isArray(data)
          ? data
              .map((c) => ({ value: (c?.cca2 || '').toUpperCase(), label: c?.name?.common || c?.cca2 || '' }))
              .filter((x) => x.value && x.label)
              .sort((a, b) => a.label.localeCompare(b.label))
          : [];
        setCountries(["Select", ...items]);
      } catch (e) {
        console.error("Failed to load country codes", e);
      } finally {
        if (!aborted) setCountryLoading(false);
      }
    }
    if (open && countries.length <= 1) loadCountryCodes();
    return () => { aborted = true; };
  }, [open]);

  const input =
    "h-8 w-full rounded-lg border border-gray-300 bg-white px-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
  const label = "text-[12px] text-gray-600";
  const card = "rounded-xl border border-gray-200 bg-white";
  const primaryBtn =
    "inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[#ffd026] text-blue-700 text-sm font-bold hover:brightness-95 disabled:opacity-50";
  const ghostBtn =
    "inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100";

  const adjustContactsHeight = () => {
    const el = contactsRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleChange = (key, value) => {
    let next = value;
    if (key === "zipCode") {
      next = sanitizePostalInput(value);
    } else if (key === "phone") {
      next = sanitizePhoneInput(value);
    }
    setForm((prev) => ({ ...prev, [key]: next }));
  };

  useEffect(() => {
    adjustContactsHeight();
  }, [form.contacts]);

  const fetchWithTimeout = async (url, ms = 6000) => {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      return res;
    } finally {
      clearTimeout(timeout);
    }
  };

  async function lookupPostalByCountry(country, postal) {
    if (!country || !postal) return null;
    const cc = String(country).trim().toUpperCase();
    const pc = String(postal).trim();
    if (!cc || !pc) return null;

    const urls = [
      `https://api.zippopotam.us/${encodeURIComponent(cc)}/${encodeURIComponent(pc)}`,
      `http://api.zippopotam.us/${encodeURIComponent(cc)}/${encodeURIComponent(pc)}`,
    ];

    for (const url of urls) {
      try {
        const res = await fetchWithTimeout(url, 6000);
        if (!res?.ok) continue;
        const data = await res.json();
        const p = Array.isArray(data?.places) ? data.places[0] : null;
        if (!p) continue;
        const city = p["place name"] || p["place"] || "";
        const state = p["state abbreviation"] || p["state"] || "";
        if (!city && !state) continue;
        return { city, state };
      } catch (_) {
        continue;
      }
    }
    return null;
  }

  async function lookupPostalByGeo(postal) {
    if (!postal) return null;
    const pc = String(postal).trim();
    if (!pc) return null;
    const params = new URLSearchParams({
      format: "json",
      addressdetails: "1",
      limit: "1",
      q: pc,
    });
    try {
      const res = await fetchWithTimeout(`https://nominatim.openstreetmap.org/search?${params}`, 6000);
      if (!res?.ok) return null;
      const data = await res.json();
      const first = Array.isArray(data) && data.length ? data[0] : null;
      if (!first) return null;
      const address = first.address || {};
      const city =
        address.city ||
        address.town ||
        address.village ||
        address.hamlet ||
        address.county ||
        "";
      const state = address.state || address.region || address.state_district || "";
      const countryCode = address.country_code ? address.country_code.toUpperCase() : "";
      if (!city && !state && !countryCode) return null;
      return { city, state, countryCode };
    } catch (e) {
      console.error("Geolocation lookup failed", e);
      return null;
    }
  }

  const handleZipBlur = async () => {
    if (!form.zipCode) return;
    setZipLoading(true);
    try {
      let city = "";
      let state = "";
      let countryCode = "";

      const geoResult = await lookupPostalByGeo(form.zipCode);
      if (geoResult) {
        city = geoResult.city || "";
        state = geoResult.state || "";
        countryCode = geoResult.countryCode || "";
      }

      const hasManualCountry = !!form.country && form.country !== "Select";
      if ((!city || !state) && hasManualCountry) {
        const countryResult = await lookupPostalByCountry(form.country, form.zipCode);
        if (countryResult) {
          city = city || countryResult.city || "";
          state = state || countryResult.state || "";
          countryCode = countryCode || form.country.toUpperCase();
        }
      }

      if (!city && !state && !countryCode) return;

      setForm((prev) => ({
        ...prev,
        city: city || prev.city,
        state: state || prev.state,
        country: countryCode || prev.country,
      }));
    } finally {
      setZipLoading(false);
    }
  };

  const emailValid = !form.email || /.+@.+\..+/.test(form.email);
  const countryValid = !!form.country && /^[A-Z]{2}$/.test(form.country.toUpperCase());
  // Enforce all required fields before enabling Save
  const requiredOk =
    !!form.companyName &&
    !!form.currency &&
    countryValid &&
    !!form.address1 &&
    !!form.zipCode &&
    !!form.city &&
    !!form.state;
  const canSave = requiredOk && emailValid && !saving;

  const handleSave = async () => {
    if (!requiredOk) {
      toast.error("Please fill all required fields");
      return;
    }
    if (!emailValid) {
      toast.error("Email must be a valid email");
      return;
    }
    // countryValid is already part of requiredOk
    setSaving(true);
    try {
      if (isEdit) {
        const payload = { ...form };
        if (payload.country === "Select") delete payload.country;
        if (!payload.country) delete payload.country;
        const res = await updateMutate({ id: supplier.id, payload });
        toast.success("Supplier updated");
        onSave?.(res);
      } else {
        const payload = { ...form };
        if (payload.country === "Select") delete payload.country;
        if (!payload.country) delete payload.country;
        const res = await createMutate(payload);
        toast.success("Supplier added");
        onSave?.(res);
      }
      onClose?.();
    } catch (e) {
      toast.error(isEdit ? "Failed to update supplier" : "Failed to add supplier");
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
                    <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h2>
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
                        <SelectCompact
                          value={form.currency || "Select"}
                          onChange={(v) => handleChange("currency", v === "Select" ? "" : v)}
                          options={["Select", ...currencies]}
                          buttonClassName={`h-8 text-[12px] ${!form.currency ? "ring-1 ring-red-200 border-red-400" : ""}`}
                        />
                      </Field>

                      <Field className="col-span-12 md:col-span-6" label="Contacts">
                        <textarea
                          ref={contactsRef}
                          rows={1}
                          className={`${input} min-h-[34px] resize-none`}
                          placeholder="Please enter Contacts"
                          value={form.contacts}
                          onChange={(e) => handleChange("contacts", e.target.value)}
                        />
                      </Field>

                      <Field className="col-span-12 md:col-span-6" label="Email">
                        <input
                          type="email"
                          className={`${input} ${form.email && !emailValid ? "ring-1 ring-red-200 border-red-400" : ""}`}
                          placeholder="Please enter Email"
                          value={form.email}
                          onChange={(e) => handleChange("email", e.target.value)}
                        />
                        {form.email && !emailValid && (
                          <div className="text-[11px] text-red-600 mt-1">Enter a valid email address</div>
                        )}
                      </Field>

                      <Field className="col-span-12 md:col-span-6" label="Phone">
                        <input
                          type="tel"
                          className={input}
                          placeholder="Please enter Phone"
                          value={form.phone}
                          onChange={(e) => handleChange("phone", e.target.value)}
                          inputMode="tel"
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
                      <Field className="col-span-12 md:col-span-3" label="Zip Code *">
                        <input
                          className={input}
                          placeholder="Please enter Zip Code"
                          value={form.zipCode}
                          onChange={(e) => handleChange("zipCode", e.target.value)}
                          onBlur={handleZipBlur}
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                        {zipLoading && (
                          <div className="text-[11px] text-gray-500 mt-1">Looking up city and state…</div>
                        )}
                      </Field>

                      <Field className="col-span-12 md:col-span-3" label="Country *">
                        <SelectCompact
                          value={form.country || "Select"}
                          onChange={(v) => handleChange("country", v === "Select" ? "" : v)}
                          options={countries}
                          disabled={countryLoading}
                          filterable
                          buttonClassName={`h-8 text-[12px] ${form.country && !countryValid ? "ring-1 ring-red-200 border-red-400" : ""}`}
                        />
                        {countryLoading && (
                          <div className="text-[11px] text-gray-500 mt-1">Loading countries…</div>
                        )}
                        {form.country && !countryValid && (
                          <div className="text-[11px] text-red-600 mt-1">Country must be ISO two-letter code</div>
                        )}
                      </Field>

                      <Field className="col-span-12 md:col-span-3" label="City *">
                        <input
                          className={input}
                          placeholder="Please enter City"
                          value={form.city}
                          onChange={(e) => handleChange("city", e.target.value)}
                        />
                      </Field>

                      <Field className="col-span-12 md:col-span-3" label="State *">
                        <input
                          className={input}
                          placeholder="Please enter State"
                          value={form.state}
                          onChange={(e) => handleChange("state", e.target.value)}
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
                    disabled={!canSave}
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
      {label && (
        <label className="text-[12px] text-gray-600">
          {typeof label === "string" && label.includes("*") ? (
            <>
              {label.slice(0, label.lastIndexOf("*"))}
              <span className="text-red-600">*</span>
            </>
          ) : (
            label
          )}
        </label>
      )}
      {children}
    </div>
  );
}

function SelectCompact({
  value,
  onChange,
  options,
  buttonClassName = "",
  renderOption,
  disabled = false,
  filterable = false,
}) {
  const list = Array.isArray(options) ? options : [];
  const getOptValue = (opt) => (typeof opt === "string" ? opt : opt?.value ?? "");
  const getOptLabel = (opt) => (typeof opt === "string" ? opt : opt?.label ?? getOptValue(opt));

  const currentLabel = (() => {
    if (value === "Select") return "Select";
    const found = list.find((opt) => (typeof opt === "string" ? opt === value : opt?.value === value));
    if (!found) return String(value ?? "");
    return getOptLabel(found);
  })();

  const [query, setQuery] = useState("");
  const filtered = !filterable || !query
    ? list
    : list.filter((opt) => String(getOptLabel(opt)).toLowerCase().includes(query.toLowerCase()));

  return (
    <Listbox value={value} onChange={(val) => { onChange(val); setQuery(""); }} disabled={disabled}>
      <div className="relative">
        <ListboxButton
          onClick={() => setQuery("")}
          className={`relative w-full h-8 rounded-lg border border-gray-300 bg-white pl-2 pr-7 text-left text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${buttonClassName}`}
        >
          <span className="block truncate">{currentLabel}</span>
          <span className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-gray-500">
            <ChevronDown size={14} />
          </span>
        </ListboxButton>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <ListboxOptions className="absolute mb-1 z-[200] max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 text-[12px] shadow-lg focus:outline-none">
            {filterable && (
              <div className="px-2 pb-1 sticky top-0 bg-white">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full h-7 rounded-md border border-gray-300 px-2 text-[12px]"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            {filtered.map((opt) => {
              const val = getOptValue(opt);
              const lab = getOptLabel(opt);
              return (
                <ListboxOption
                  key={String(val || lab)}
                  value={val}
                  className={({ active }) => `cursor-pointer select-none px-2 py-1 ${active ? "bg-gray-100 text-gray-900" : "text-gray-800"}`}
                >
                  {({ selected }) => (
                    <div className="flex items-center gap-2">
                      {selected ? (
                        <Check size={14} className="text-amber-700" />
                      ) : (
                        <span className="w-[14px]" />
                      )}
                      <span className="block truncate">{renderOption ? renderOption(opt) : lab}</span>
                    </div>
                  )}
                </ListboxOption>
              );
            })}
          </ListboxOptions>
        </Transition>
      </div>
    </Listbox>
  );
}
