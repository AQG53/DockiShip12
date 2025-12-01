import { Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";
import { MoreHorizontal } from "lucide-react";
import { Fragment } from "react";

export function ActionMenu({ actions = [] }) {
    if (!actions.length) return null;

    return (
        <Menu as="div" className="relative inline-block text-left">
            <MenuButton className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <MoreHorizontal size={16} />
            </MenuButton>
            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <MenuItems className="absolute right-0 z-10 mt-1 w-36 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        {actions.map((action, i) => (
                            <MenuItem key={i}>
                                {({ active }) => (
                                    <button
                                        onClick={action.onClick}
                                        className={`${active ? "bg-gray-100 text-gray-900" : "text-gray-700"
                                            } group flex w-full items-center px-4 py-2 text-left text-xs ${action.className || ""}`}
                                    >
                                        {action.icon && <action.icon className="mr-2 h-4 w-4" aria-hidden="true" />}
                                        {action.label}
                                    </button>
                                )}
                            </MenuItem>
                        ))}
                    </div>
                </MenuItems>
            </Transition>
        </Menu>
    );
}
