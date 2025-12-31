import { NavLink, useLocation } from "react-router";
import { Disclosure } from "@headlessui/react";
import { ChevronDown, User2, ShoppingBag } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useAuthCheck } from "../../../hooks/useAuthCheck";
import { usePurchaseOrders } from "../hooks/usePurchaseOrders";

export default function PurchasesSidebar() {
  const location = useLocation();
  const { pathname, search } = location;
  const fullPath = pathname + search;
  const { data: auth } = useAuthCheck({ refetchOnWindowFocus: false });
  const perms = auth?.perms || [];
  const roles = auth?.roles || [];
  const isOwner = roles.some((r) => {
    if (typeof r === 'string') return r.toLowerCase() === 'owner';
    return String(r?.name).toLowerCase() === 'owner';
  });

  // Fetch all orders to calculate counts
  const { data } = usePurchaseOrders();
  const apiCounts = data?.counts || {};

  const counts = useMemo(() => {
    const c = {
      all: 0,
      to_purchase: 0,
      in_transit: 0,
      partially_received: 0,
      received: 0,
      canceled: 0,
    };

    // Use API counts if available
    if (Object.keys(apiCounts).length > 0) {
      c.to_purchase = apiCounts.to_purchase || 0;
      c.in_transit = apiCounts.in_transit || 0;
      c.partially_received = apiCounts.partially_received || 0;
      c.received = apiCounts.received || 0;
      c.canceled = apiCounts.canceled || 0;
      c.all = Object.values(apiCounts).reduce((a, b) => a + b, 0);
    }
    // Fallback to local calculation (though likely incomplete due to pagination)
    else if (Array.isArray(data?.rows)) {
      c.all = data.rows.length;
      data.rows.forEach((o) => {
        const s = o.status;
        if (c[s] !== undefined) c[s]++;
      });
    }
    return c;
  }, [data, apiCounts]);

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
        { label: "All Purchases", count: counts.all, to: "/purchases/to-purchase" },
        { label: "In Transit", count: counts.in_transit, to: "/purchases/to-purchase?status=in_transit" },
        { label: "Partially Received", count: counts.partially_received, to: "/purchases/to-purchase?status=partially_received" },
        { label: "Received", count: counts.received, to: "/purchases/to-purchase?status=received" },
        { label: "Canceled", count: counts.canceled, to: "/purchases/to-purchase?status=canceled" },
      ],
    }
  ];

  const [openSections, setOpenSections] = useState(() => new Set(sections.map((s) => s.id)));

  const filteredSections = sections.filter((sec) => {
    if (isOwner) return true;
    if (sec.id === "suppliers") return perms.includes("suppliers.read");
    if (sec.id === "purchase-orders") return perms.includes("purchases.po.read");
    return true;
  });

  useEffect(() => {
    const match = filteredSections.find((s) => s.items.some((it) => {
      if (it.to.includes("?")) {
        return fullPath === it.to;
      }
      if (search && !it.to.includes("?")) {
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
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-[#f6f7fb] h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
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
                              const isActive = fullPath === it.to || (it.to === "/purchases/to-purchase" && fullPath === "/purchases/to-purchase");

                              return [
                                "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                                isActive
                                  ? "text-blue-600 bg-yellow-100 border-l-4 border-blue-500"
                                  : "text-gray-700 hover:bg-amber-50"
                              ].join(" ");
                            }}
                          >
                            <span>{it.label}</span>
                            {it.count !== undefined && (
                              <span className="text-xs font-medium text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded-full">
                                {it.count}
                              </span>
                            )}
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
