import { NavLink, useLocation } from "react-router";
import { Disclosure } from "@headlessui/react";
import { ChevronDown, User2, ShoppingBag } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthCheck } from "../hooks/useAuthCheck";

const sections = [
  {
    id: "suppliers",
    icon: User2,
    label: "Manage Suppliers",
    items: [
      { label: "Supplier", to: "/purchases/suppliers/manage" },
    ],
  },
  {
    id: "purchase-orders",
    icon: ShoppingBag,
    label: "Purchase Orders",
    items: [
      { label: "To Purchase", to: "/purchases/to-purchase?status=to_purchase" },
      { label: "In Transit", to: "/purchases/to-purchase?status=in_transit" },
      { label: "Partially Received", to: "/purchases/to-purchase?status=partially_received" },
      { label: "Received", to: "/purchases/to-purchase?status=received" },
      { label: "Canceled", to: "/purchases/to-purchase?status=canceled" },
    ],
  }
];

export default function PurchasesSidebar() {
  const location = useLocation();
  const { pathname, search } = location;
  const fullPath = pathname + search;
  const { data: auth } = useAuthCheck({ refetchOnWindowFocus: false });
  const perms = auth?.perms || [];

  const [openSections, setOpenSections] = useState(() => new Set(sections.map((s) => s.id)));

  const filteredSections = sections.filter((sec) => {
    if (sec.id === "suppliers") return perms.includes("suppliers.read");
    if (sec.id === "purchase-orders") return perms.includes("purchases.po.read");
    return true;
  });

  useEffect(() => {
    const match = filteredSections.find((s) => s.items.some((it) => {
      // If item has query params, match full path
      if (it.to.includes("?")) {
        return fullPath === it.to;
      }
      // Otherwise match pathname start (for sub-routes) but ensure we don't match if current url has query params and item doesn't
      // Actually for "All", we might want it to be active only if no query param?
      // The user said "rename it to All", usually "All" implies no filter.
      // If I am at /purchases/to-purchase?status=sent, "All" (/purchases/to-purchase) should probably NOT be active.
      // So exact match for query params is important.

      // If the item path has no query, but current location has query, they are different.
      if (search && !it.to.includes("?")) {
        // Exception: if the item path is a prefix of pathname? 
        // But here all are under /purchases/to-purchase.
        // Let's keep it simple: strict match for this section.
        return pathname === it.to && search === "";
      }

      return pathname.startsWith(it.to);
    }));

    if (!match) return;
    setOpenSections((prev) => {
      if (prev.has(match.id)) return prev;
      const next = new Set(prev);
      next.add(match.id);
      return next;
    });
  }, [pathname, search, fullPath, filteredSections]);

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
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-[#f6f7fb]">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Purchases
        </h2>

        <nav className="space-y-2">
          {filteredSections.map((sec) => {
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
                            className={() => {
                              // Custom active logic because NavLink default ignores query params by default or behaves strictly
                              // We want exact match including query params
                              const isActive = fullPath === it.to || (it.to === "/purchases/to-purchase" && fullPath === "/purchases/to-purchase");

                              return [
                                "block rounded-lg px-3 py-2 text-sm",
                                isActive
                                  ? "text-blue-600 bg-yellow-100 border-l-4 border-blue-500"
                                  : "text-gray-700 hover:bg-amber-50"
                              ].join(" ");
                            }}
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
