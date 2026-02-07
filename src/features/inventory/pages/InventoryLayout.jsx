import { Outlet } from "react-router";
import Navbar from "../../../components/Navbar";
import InventorySidebar from "../components/InventorySidebar";

export default function InventoryLayout() {
    return (
        <div className="flex min-h-[calc(100vh-64px)] pt-16">
            <Navbar />
            <InventorySidebar />
            <main className="flex-1 bg-white min-w-0 overflow-hidden">
                <div className="mx-auto w-full p-6 h-full overflow-y-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
