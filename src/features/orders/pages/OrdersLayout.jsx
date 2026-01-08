import { Outlet } from "react-router";
import Navbar from "../../../components/Navbar";
import OrdersSidebar from "../components/OrdersSidebar";

export default function OrdersLayout() {
    return (
        <div className="flex min-h-[calc(100vh-64px)] pt-16">
            <Navbar />
            <OrdersSidebar />
            <main className="flex-1 bg-white">
                <div className="mx-auto w-full p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
