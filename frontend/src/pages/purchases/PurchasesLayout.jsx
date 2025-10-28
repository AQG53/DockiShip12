import { Outlet } from "react-router";
import Navbar from "../../components/Navbar";
import PurchasesSidebar from "../../components/PurchasesSidebar";

export default function InventoryLayout() {
    return (
        <div className="flex min-h-[calc(100vh-64px)] pt-16">
            <Navbar />
            <PurchasesSidebar />
            <main className="flex-1 bg-white">
                <div className="mx-auto max-w-6xl p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
