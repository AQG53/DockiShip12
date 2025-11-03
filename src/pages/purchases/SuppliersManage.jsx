import { Fragment, useMemo, useState } from "react";
import {
  Listbox,
  Transition,
} from "@headlessui/react";
import {
  ChevronDown,
  Check,
  Search,
  Upload,
  Download,
  Plus,
  Store,
} from "lucide-react";
import CreateProductModal from "../../components/CreateProductModal";

export default function SuppliersManage() {
  // ------- filters -------
  const groups = [{ id: "all", name: "All Group" }, { id: "electronics", name: "Electronics" }, { id: "apparel", name: "Apparel" }];
  const tags = [{ id: "", name: "Please select Tag" }, { id: "featured", name: "Featured" }, { id: "clearance", name: "Clearance" }];
  const warehouses = [{ id: "all", name: "All Warehouse" }, { id: "wh1", name: "Warehouse A" }, { id: "wh2", name: "Warehouse B" }];
  const invTypes = [{ id: "all", name: "All inventory types" }, { id: "stock", name: "Stock" }, { id: "bundle", name: "Bundle" }];
  const keyTypes = [{ id: "sku", name: "Stock SKU" }, { id: "name", name: "Product Name" }];

  const [group, setGroup] = useState(groups[0]);
  const [tag, setTag] = useState(tags[0]);
  const [warehouse, setWarehouse] = useState(warehouses[0]);
  const [invType, setInvType] = useState(invTypes[0]);
  const [keyType, setKeyType] = useState(keyTypes[0]);
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);

  const clearAll = () => {
    setGroup(groups[0]); setTag(tags[0]); setWarehouse(warehouses[0]);
    setInvType(invTypes[0]); setKeyType(keyTypes[0]); setSearch("");
  };

  // ------- data (empty) -------
  const rows = useMemo(() => [], []);

  // ------- shared styles to mirror StaffSettings -------
  const card = "rounded-xl border border-gray-200 bg-white";
  const input = "h-8 rounded-lg border border-gray-300 px-2.5 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
  const btnPrimary = "inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ffd026] text-blue-600 text-sm font-bold hover:opacity-90";
  const btnOutline = "inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-700";
  const btnGhost = "inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-sm text-gray-700";

  return (
    <div className="space-y-4 px-4 sm:px-5 lg:px-6 pb-8">
      {/* Header row (like StaffSettings) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-md bg-amber-100 border border-gray-200 flex items-center justify-center">
            <Store size={18} className="text-amber-700" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Suppliers</h1>
        </div>

        <div className="flex items-center gap-2">
          <button className={btnOutline} onClick={() => alert("Import CSV (coming soon)")}>
            <Upload size={16} /> Import
          </button>
          <button className={btnOutline} onClick={() => alert("Export CSV (coming soon)")}>
            <Download size={16} /> Export
          </button>
          <button className={btnPrimary} onClick={() => setOpenCreate(true)}>
            <Plus size={16} /> Add Supplier
          </button>
        </div>
      </div>

      {/* Filters bar (compact, like a control strip) */}
      <div className={card}>
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <HeadlessSelect value={group} onChange={setGroup} options={groups} className="w-[140px]" />
            <HeadlessSelect value={tag} onChange={setTag} options={tags} className="w-[160px]" />
            <HeadlessSelect value={warehouse} onChange={setWarehouse} options={warehouses} className="w-[160px]" />
            <HeadlessSelect value={invType} onChange={setInvType} options={invTypes} className="w-[170px]" />
            <HeadlessSelect value={keyType} onChange={setKeyType} options={keyTypes} className="w-[120px]" />

            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className={`${input} w-[200px] pl-7`}
              />
            </div>

            <button className={btnGhost} onClick={clearAll}>Clear</button>
          </div>
        </div>
      </div>

      {/* Table card (same spacing feel as StaffSettings list) */}
      <div className={card}>
        {/* action bar above header row */}
        <div className="px-4 py-2.5 border-b border-gray-200 text-sm text-gray-600 flex items-center gap-4">
          <button className="hover:text-gray-900" onClick={() => alert("Notes (coming soon)")}>Notes</button>
          <button className="hover:text-gray-900" onClick={() => alert("Delete (coming soon)")}>Delete</button>
        </div>

        {/* header row (grid-like look similar to StaffSettings) */}
        <div className="grid grid-cols-13 bg-gray-50 px-4 py-3 text-[12px] font-semibold text-gray-700">
          <div className="col-span-1">
            <input type="checkbox" className="h-4 w-4" />
          </div>
          <div className="col-span-1">Image</div>
          <div className="col-span-2">Product Name</div>
          <div className="col-span-2">Warehouse</div>
          <div className="col-span-1">OnHand</div>
          <div className="col-span-1">Available</div>
          <div className="col-span-1">Reserved</div>
          <div className="col-span-1">InTransit</div>
          <div className="col-span-1">Avg. Cost</div>
          <div className="col-span-1">Total Value</div>
          <div className="col-span-1">Action</div>
        </div>

        {/* rows */}
        {rows.length === 0 ? (
          <div className="flex items-center justify-center py-14 text-gray-400 text-[13px]">
            <div className="flex flex-col items-center gap-2">
              <svg className="h-10 w-10 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="14" rx="2"></rect>
                <path d="M7 8h10M7 12h6M3 18h18"></path>
              </svg>
              <p>No Data</p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((r) => (
              <li key={r.id} className="grid grid-cols-13 px-4 py-3 text-[13px] text-gray-800 items-center gap-2">
                <div className="col-span-1">
                  <input type="checkbox" className="h-4 w-4" />
                </div>
                <div className="col-span-1">
                  <div className="h-10 w-10 rounded-md bg-gray-100" />
                </div>
                <div className="col-span-2 truncate">{r.name}</div>
                <div className="col-span-2">{r.warehouse}</div>
                <div className="col-span-1">{r.onHand}</div>
                <div className="col-span-1">{r.available}</div>
                <div className="col-span-1">{r.reserved}</div>
                <div className="col-span-1">{r.inTransit}</div>
                <div className="col-span-1">—</div>
                <div className="col-span-1">—</div>
                <div className="col-span-1">
                  <button className="text-amber-700 hover:underline">View</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* modal */}
      <CreateProductModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onSave={(payload) => {
          console.log("create-product payload", payload);
        }}
      />
    </div>
  );
}

/* ---------- Headless UI Select (compact) ---------- */
function HeadlessSelect({ value, onChange, options, className = "" }) {
  return (
    <Listbox value={value} onChange={onChange}>
      <div className={`relative ${className}`}>
        <Listbox.Button className="relative w-full h-8 rounded-lg border border-gray-300 bg-white pl-2.5 pr-7 text-left text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10">
          <span className="block truncate">{value?.name}</span>
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <ChevronDown size={16} className="text-gray-500" />
          </span>
        </Listbox.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-lg focus:outline-none">
            {options.map((opt) => (
              <Listbox.Option
                key={opt.id || opt.name}
                value={opt}
                className={({ active }) =>
                  `relative cursor-pointer select-none px-3 py-2 ${active ? "bg-gray-100 text-gray-900" : "text-gray-800"}`
                }
              >
                {({ selected }) => (
                  <div className="flex items-center gap-2">
                    {selected ? <Check size={16} className="text-amber-700" /> : <span className="w-4" />}
                    <span className="block truncate">{opt.name}</span>
                  </div>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}
