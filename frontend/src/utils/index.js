export const settingsItems = [
  { label: "Shop Manage", path: "/settings/shop" },
  { label: "Order & Shipping", path: "/settings/orders" },
  { label: "General Settings", path: "/settings/general" },
  { label: "Listing Settings", path: "/settings/listings" },
  { label: "Inventory Settings", path: "/settings/inventory" },
  { label: "Staff Settings", path: "/settings/staff" },
  { label: "Role Manage", path: "/settings/roles" },
];

export const navLinks = [
  { name: "Home", to: "/", id: "home" },
  { name: "Inventory", to: "/inventory", id: "inventory" },
  { name: "Purchases", to: "/purchases", id: "purchases" },
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
