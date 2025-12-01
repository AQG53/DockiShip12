import { NavLink, useLocation } from "react-router";
import { Disclosure } from "@headlessui/react";
import { Package, ChevronDown, MapPin } from "lucide-react";
import { useState, useEffect } from "react";

const sections = [
  {
    id: "products",
    icon: Package,
    label: "Products",
    items: [
      { label: "Listing", to: "/inventory/products/simple" }
    ],
  },
  {
    id: "warehouses",
    icon: MapPin,
    label: "Warehouse",
    items: [
      { label: "Listing", to: "/inventory/warehouses" },
    ],
  },
  // {
  //   id: "inventory",
  //   icon: Boxes,
  //   label: "Inventory",
  //   items: [
  //     { label: "Inventory List", to: "/inventory/list" }, // default
  //     { label: "Manual Inbound", to: "/inventory/inbound" },
  //     { label: "Manual Outbound", to: "/inventory/outbound" },
  //     { label: "Stock Movement", to: "/inventory/movement" },
  //   ],
  // },
  // {
  //   id: "3pf",
  //   icon: Store,
  //   label: "3PF",
  //   items: [
  //     { label: "Amazon FPA", to: "/inventory/3pf/amazon-fpa" },
  //     { label: "Walmart WFS", to: "/inventory/3pf/walmart-wfs" },
  //   ],
  // },
  // {
  //   id: "sync",
  //   icon: RefreshCcw,
  //   label: "Inventory Sync",
  //   items: [
  //     { label: "Synchronization Log", to: "/inventory/sync/log" },
  //     { label: "Inventory Locking", to: "/inventory/sync/locking" },
  //   ],
  // },
];

export default function InventorySidebar() {
  const { pathname } = useLocation();

  const [openSections, setOpenSections] = useState(() => new Set(sections.map((s) => s.id)));

  useEffect(() => {
    const match = sections.find((s) => s.items.some((it) => pathname.startsWith(it.to)));
    if (!match) return;
    setOpenSections((prev) => {
      if (prev.has(match.id)) return prev;
      const next = new Set(prev);
      next.add(match.id);
      return next;
    });
  }, [pathname]);

  const toggleSection = (id) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-[#f6f7fb] h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Inventory
        </h2>

        <nav className="space-y-2">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isOpen = openSections.has(sec.id);
            return (
              <Disclosure key={sec.id} as="div">
                {() => (
                  <>
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl"
                      onClick={() => toggleSection(sec.id)}
                    >
                      <span className="flex items-center gap-3 text-sm text-gray-800">
                        <Icon size={18} className="opacity-80" />
                        {sec.label}
                      </span>
                      <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isOpen && (
                      <div className="px-2 pb-2">
                        {sec.items.map((it) => (
                          <NavLink
                            key={it.to}
                            to={it.to}
                            className={({ isActive }) =>
                              [
                                "block rounded-lg px-3 py-2 text-sm",
                                isActive
                                  ? "text-blue-600 bg-yellow-100 border-l-4 border-blue-500"
                                  : "text-gray-700 hover:bg-amber-50"
                              ].join(" ")
                            }
                          >
                            {it.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </Disclosure>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
