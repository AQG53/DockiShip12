import React from "react";
import { Outlet } from "react-router";
import SettingsSidebar from "../../components/SettingsSidebar";
import Navbar from "../../components/Navbar";

export default function SettingsLayout() {
    return (
        <div className="flex min-h-[calc(100vh-64px)] pt-16">
            <Navbar />
            <SettingsSidebar />

            <main className="flex-1 bg-white">
                <div className="mx-auto max-w-6xl p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
