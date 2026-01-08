import { NavLink, useLocation } from "react-router";
import { Disclosure } from "@headlessui/react";
import { ChevronDown, Package } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useOrderCounts } from "../hooks/useOrders";

// Status Mapping
const STATUS_LABELS = {
    LABEL_PRINTED: "Label Printed",
    PACKED: "Packed",
    SHIPPED: "Shipped",
    DROP_OFF: "Drop Off",
    DELIVERED: "Delivered",
    RETURN: "Return",
    CANCEL: "Cancel",
    REFUND: "Refund",
};

export default function OrdersSidebar() {
    const location = useLocation();
    const { pathname, search } = location;
    const fullPath = pathname + search;

    // Counts
    const { data: counts = {} } = useOrderCounts();

    const sections = [
        {
            id: "orders",
            icon: Package,
            label: "Order Management",
            items: [
                { label: "All Orders", count: counts.ALL, to: "/orders" },
                ...Object.entries(STATUS_LABELS).map(([key, label]) => ({
                    label,
                    count: counts[key] || 0,
                    to: `/orders?status=${key}`
                })),
            ],
        }
    ];

    const [openSections, setOpenSections] = useState(() => new Set(["orders"]));

    const toggleSection = (id) => {
        setOpenSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <aside className="w-64 shrink-0 border-r border-gray-200 bg-[#f6f7fb] h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
            <div className="p-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Orders
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
                                                        className={() => {
                                                            // Exact match needed? 
                                                            // For /orders, exact match if no search.
                                                            // For /orders?status=..., match fullPath.
                                                            let isActive = false;
                                                            if (it.to === "/orders") {
                                                                isActive = pathname === "/orders" && (!search || search === "");
                                                            } else {
                                                                isActive = fullPath === it.to;
                                                            }

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
