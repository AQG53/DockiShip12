export const settingsItems = [
  {
    label: "Shop Manage",
    path: "/settings/shop",
    permsAny: ["settings.shop.read", "settings.shop.manage", "settings.manage"],
  },
  {
    label: "Order & Shipping",
    path: "/settings/orders",
    permsAny: ["order_settings.read", "order_settings.manage", "settings.orders.read", "settings.orders.manage", "settings.manage"],
  },
  {
    label: "General Settings",
    path: "/settings/general",
    permsAny: ["settings.general.read", "settings.general.manage", "settings.manage"],
  },
  {
    label: "Staff Settings",
    path: "/settings/staff",
    permsAny: ["user.manage"],
  },
  {
    label: "Role Manage",
    path: "/settings/roles",
    permsAny: ["role.manage"],
  },
];

export const navLinks = [
  { name: "Home", to: "/", id: "home" },
  {
    name: "Inventory",
    to: "/inventory",
    id: "inventory",
    submenu: [
      {
        label: "Products",
        path: "/inventory/products/simple",
        description: "Manage products and variants",
      },
      {
        label: "Inventory Listing",
        path: "/inventory/list",
        description: "Track stock and in-transit levels",
      },
      {
        label: "Warehouses",
        path: "/inventory/warehouses",
        description: "Configure warehouse locations",
      },
    ],
  },
  {
    name: "Orders",
    to: "/orders",
    id: "orders",
    submenu: [
      {
        label: "Order Listing",
        path: "/orders",
        description: "View and manage all orders",
      },
    ],
  },
  {
    name: "Purchases",
    to: "/purchases",
    id: "purchases",
    submenu: [
      {
        label: "Supplier Manage",
        path: "/purchases/suppliers/manage",
        description: "Link suppliers and products",
      },
      {
        label: "To Purchase",
        path: "/purchases/to-purchase",
        description: "Create and track purchase orders",
      },
    ],
  },
];


export function formatDate(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleString();
  } catch {
    return String(d);
  }
}
