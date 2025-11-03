import { NavLink } from "react-router";
import {
  Store,
  Truck,
  Settings as Cog,
  Layers,
  Boxes,
  Users,
  Shield
} from "lucide-react";

const items = [
  { label: "Shop Manage",        path: "/settings/shop",      Icon: Store },
  { label: "Order & Shipping",   path: "/settings/orders",    Icon: Truck },
  { label: "General Settings",   path: "/settings/general",   Icon: Cog },
  { label: "Listing Settings",   path: "/settings/listings",  Icon: Layers },
  { label: "Inventory Settings", path: "/settings/inventory", Icon: Boxes },
  { label: "Staff Settings",     path: "/settings/staff",     Icon: Users },
  { label: "Role Manage",        path: "/settings/roles",     Icon: Shield },
];

export default function SettingsSidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-[#f6f7fb]">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Settings
        </h2>

        <nav className="space-y-1">
          {items.map(({ label, path, Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                [
                  "group flex items-center gap-3 px-3 py-2 rounded-xl transition-colors",
                  "text-sm",
                  isActive
                    ? "text-blue-600 bg-yellow-100 border-l-4 border-blue-500"
                    : "text-gray-700 hover:bg-amber-50"
                ].join(" ")
              }
            >
              <Icon size={18} className="opacity-80 group-hover:opacity-100" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
