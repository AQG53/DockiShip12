import { useState } from "react";
import { Tab } from "@headlessui/react";
import MarketplaceChannelsList from "../components/MarketplaceChannelsList";
import CourierMediumsList from "../components/CourierMediumsList";
import RemarkTypesList from "../components/RemarkTypesList";
// Re-using WarehouseList from existing module
import WarehouseList from "../../inventory/pages/WarehouseList";

function classNames(...classes) {
    return classes.filter(Boolean).join(" ");
}

export default function OrderSettings() {
    const [categories] = useState([
        "Marketplaces",
        "Courier Mediums",
        "Remarks",
        "Warehouses",
    ]);

    return (
        <div className="w-full py-4">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Order & Shipping Settings</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Configure your sales channels, shipping carriers, and operational settings.
                </p>
            </div>

            <Tab.Group>
                <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1 mb-6">
                    {categories.map((category) => (
                        <Tab
                            key={category}
                            className={({ selected }) =>
                                classNames(
                                    "w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors",
                                    "focus:outline-none",
                                    selected
                                        ? "bg-white text-gray-900 shadow"
                                        : "text-gray-600 hover:bg-white/60 hover:text-gray-900"
                                )
                            }
                        >
                            {category}
                        </Tab>
                    ))}
                </Tab.List>
                <Tab.Panels>
                    <Tab.Panel className="focus:outline-none">
                        <MarketplaceChannelsList />
                    </Tab.Panel>
                    <Tab.Panel className="focus:outline-none">
                        <CourierMediumsList />
                    </Tab.Panel>
                    <Tab.Panel className="focus:outline-none">
                        <RemarkTypesList />
                    </Tab.Panel>
                    <Tab.Panel className="focus:outline-none">
                        <WarehouseList />
                    </Tab.Panel>
                </Tab.Panels>
            </Tab.Group>
        </div>
    );
}
