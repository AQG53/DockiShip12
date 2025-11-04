import { Fragment, useMemo, useState } from "react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from "@headlessui/react";
import {
  ChevronDown,
  Check,
  Search,
  Plus,
  Store,
  MoreHorizontal,
  Filter,
  Edit,
  StickyNote,
  Trash2,
} from "lucide-react";
import AddSupplierModal from "../../components/AddSupplierModal";

export default function SuppliersManage() {
  const fields = [
    { id: "company", name: "Company Name" },
    { id: "currency", name: "Currency" },
    { id: "time", name: "Time" },
  ];
  const [field, setField] = useState(fields[0]);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const clearAll = () => {
    setField(fields[0]);
    setQuery("");
  };

  const rows = useMemo(
    () => [
      {
        id: "1",
        company: "test",
        productQty: 0,
        currency: "USD",
        createdAt: "10-25-25 08:29",
        lastPurchase: "--",
      },
    ],
    []
  );

  const card = "rounded-xl border border-gray-200 bg-white";
  const input =
    "h-8 rounded-lg border border-gray-300 px-2.5 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
  const btnPrimary =
    "inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ffd026] text-blue-600 text-sm font-bold hover:opacity-90";
  const btnOutline =
    "inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-700";
  const btnGhost =
    "inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-sm text-gray-700";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-md bg-amber-100 border border-gray-200 flex items-center justify-center">
            <Store size={18} className="text-amber-700" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Suppliers</h1>
        </div>
      </div>

      <div className={card}>
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <HeadlessSelect
              value={field}
              onChange={setField}
              options={fields}
              className="w-[150px]"
            />

            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-2">
                <Search className="h-4 w-4 text-gray-400" />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className={`${input} w-[280px] pl-7`}
              />
              <span className="pointer-events-none absolute right-2 top-2">
                <Filter className="h-4 w-4 text-gray-400" />
              </span>
            </div>

            <button className={btnOutline} onClick={clearAll}>
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className={card}>
        <div className="px-4 py-2.5 border-b border-gray-200 text-sm text-gray-600 flex items-center justify-end gap-4">
          <button
            className={btnPrimary}
            onClick={() => setAddOpen(true)}
          >
            <Plus size={16} /> Add suppliers
          </button>
        </div>

        <div className="grid grid-cols-12 bg-gray-50 px-4 py-2.5 text-[12px] font-semibold text-gray-700">
          <div className="col-span-3">Company Name</div>
          <div className="col-span-2">Product Quantity</div>
          <div className="col-span-2">Currency</div>
          <div className="col-span-3">Time</div>
          <div className="col-span-2 pl-18">Action</div>
        </div>

        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-12 px-4 py-2.5 text-[13px] text-gray-800 items-center gap-2"
              >

                <div className="col-span-3 truncate">{r.company}</div>

                <div className="col-span-2">{r.productQty}</div>

                <div className="col-span-2">{r.currency}</div>

                <div className="col-span-3 leading-5 flex flex-col gap-1">
                  <div className="inline-flex gap-25">
                    <div className="text-gray-700">Create</div>
                    <div className="text-[12px] text-gray-500">{r.createdAt}</div>
                  </div>
                  <div className="inline-flex gap-25">
                    <div className="text-gray-700">Recent purchase</div>
                    <div className="text-[12px] text-gray-500">{r.lastPurchase}</div>
                  </div>
                </div>

                <div className="col-span-2 flex flex-col items-start pt-1 px-10">
                  <div className="mb-0.5">
                    <button className="text-amber-600 hover:underline text-[13px] whitespace-nowrap">Related products</button>
                  </div>

                  <div className="relative group pl-10">
                    <button className="text-amber-600 hover:opacity-80 p-0.5 ml-0.5">
                      <span className="text-lg leading-none">...</span> 
                    </button>

                    <div className="absolute z-10 w-20 -mt-1 ml-[-20px] transition-opacity duration-150 ease-out opacity-0 group-hover:opacity-100 group-hover:block hidden">
                      <div className="rounded-xl border border-gray-200 bg-white py-1 text-xs shadow-lg focus:outline-none">
                        <button className="w-full inline-flex items-center gap-2 text-left px-3 py-2 text-gray-800 hover:bg-gray-100"><span><Edit className="w-3 h-3" /></span>Edit</button>
                        <button className="w-full inline-flex items-center gap-2 text-left px-3 py-2 text-gray-800 hover:bg-gray-100"><span><StickyNote className="w-3 h-3" /></span>Notes</button>
                        <button className="w-full inline-flex items-center gap-2 text-left px-3 py-2 text-gray-800 hover:bg-gray-100"><span><Trash2 className="w-3 h-3 text-red-700" /></span>Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>

            ))}
          </ul>
        )}
      </div>

      <AddSupplierModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(payload) => {
          // await refetchSuppliers();
          setAddOpen(false);
        }}
      />
    </div >
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center py-14 text-gray-400 text-[13px]">
      <div className="flex flex-col items-center gap-2">
        <svg
          className="h-10 w-10 opacity-40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="3" y="4" width="18" height="14" rx="2"></rect>
          <path d="M7 8h10M7 12h6M3 18h18"></path>
        </svg>
        <p>No Suppliers</p>
      </div>
    </div>
  );
}

function HeadlessSelect({ value, onChange, options, className = "" }) {
  return (
    <Listbox value={value} onChange={onChange}>
      <div className={`relative ${className}`}>
        <ListboxButton className="relative w-full h-8 rounded-lg border border-gray-300 bg-white pl-2.5 pr-7 text-left text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10">
          <span className="block truncate">{value?.name}</span>
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <ChevronDown size={16} className="text-gray-500" />
          </span>
        </ListboxButton>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-lg focus:outline-none">
            {options.map((opt) => (
              <ListboxOption
                key={opt.id || opt.name}
                value={opt}
                className={({ active }) =>
                  `relative cursor-pointer select-none px-3 py-2 ${active ? "bg-gray-100 text-gray-900" : "text-gray-800"
                  }`
                }
              >
                {({ selected }) => (
                  <div className="flex items-center gap-2">
                    {selected ? (
                      <Check size={16} className="text-amber-700" />
                    ) : (
                      <span className="w-4" />
                    )}
                    <span className="block">{opt.name}</span>
                  </div>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Transition>
      </div>
    </Listbox>
  );
}
