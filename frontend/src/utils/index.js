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
    { name: 'Home', href: '#home', id: 'home' },
    { name: 'Purchases', href: '#purchases', id: 'purchases' },
    { name: 'Inventory', href: '#inventory', id: 'inventory' },
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
