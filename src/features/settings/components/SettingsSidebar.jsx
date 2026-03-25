import { NavLink } from "react-router";
import useUserPermissions from "../../../hooks/useUserPermissions";
import {
  Store,
  Truck,
  Settings as Cog,
  Users,
  Shield
} from "lucide-react";

const items = [
  {
    label: "Shop Manage",
    path: "/settings/shop",
    Icon: Store,
    permsAny: ["settings.shop.read", "settings.shop.manage", "settings.manage"],
  },
  {
    label: "Order & Shipping",
    path: "/settings/orders",
    Icon: Truck,
    permsAny: ["order_settings.read", "order_settings.manage", "settings.orders.read", "settings.orders.manage", "settings.manage"],
  },
  {
    label: "General Settings",
    path: "/settings/general",
    Icon: Cog,
    permsAny: ["settings.general.read", "settings.general.manage", "settings.manage"],
  },
  {
    label: "Staff Settings",
    path: "/settings/staff",
    Icon: Users,
    permsAny: ["user.manage"],
  },
  {
    label: "Role Manage",
    path: "/settings/roles",
    Icon: Shield,
    permsAny: ["role.manage"],
  },
];

export default function SettingsSidebar() {
  const { perms, claims } = useUserPermissions();
  const isOwner = Array.isArray(claims?.roles)
    && claims.roles.some((role) => String(role).toLowerCase() === "owner");

  const canAccessItem = (item) => {
    if (isOwner) return true;
    const required = Array.isArray(item?.permsAny)
      ? item.permsAny.map((p) => String(p).toLowerCase())
      : [];
    if (required.length === 0) return true;
    return required.some((perm) => perms?.has(perm));
  };

  const visibleItems = items.filter(canAccessItem);

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-[#f6f7fb] h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Settings
        </h2>

        <nav className="space-y-1">
          {visibleItems.map(({ label, path, Icon }) => (
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
