import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

export function ActionMenu({
    actions = [],
    direction = "down",
    openOnHover = false,
    hoverOpenDelay = 180,
    hoverCloseDelay = 220,
}) {
    if (!actions.length) return null;

    const rootRef = useRef(null);
    const buttonRef = useRef(null);
    const menuRef = useRef(null);
    const openTimerRef = useRef(null);
    const closeTimerRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
    const rafRef = useRef(null);

    const clearTimer = (ref) => {
        if (!ref.current) return;
        clearTimeout(ref.current);
        ref.current = null;
    };

    const clearTimers = () => {
        clearTimer(openTimerRef);
        clearTimer(closeTimerRef);
    };

    const openMenu = () => {
        clearTimer(closeTimerRef);
        setOpen(true);
    };

    const closeMenu = () => {
        clearTimer(openTimerRef);
        setOpen(false);
    };

    const scheduleOpen = () => {
        if (!openOnHover) return;
        clearTimer(closeTimerRef);
        if (open) return;
        openTimerRef.current = setTimeout(() => {
            setOpen(true);
            openTimerRef.current = null;
        }, hoverOpenDelay);
    };

    const scheduleClose = () => {
        if (!openOnHover) return;
        clearTimer(openTimerRef);
        closeTimerRef.current = setTimeout(() => {
            setOpen(false);
            closeTimerRef.current = null;
        }, hoverCloseDelay);
    };

    const updatePosition = useCallback(() => {
        if (!buttonRef.current) return;

        const EDGE_GAP = 8;
        const POPUP_GAP = 6;
        const fallbackHeight = Math.max(actions.length * 36 + 12, 120);
        const menuWidth = menuRef.current?.offsetWidth || 144;
        const menuHeight = menuRef.current?.offsetHeight || fallbackHeight;
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceAbove = rect.top - EDGE_GAP;
        const spaceBelow = window.innerHeight - rect.bottom - EDGE_GAP;

        let top = rect.bottom + POPUP_GAP;
        if (direction === "up") {
            top = spaceAbove >= menuHeight || spaceAbove >= spaceBelow
                ? rect.top - menuHeight - POPUP_GAP
                : rect.bottom + POPUP_GAP;
        } else if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
            top = rect.top - menuHeight - POPUP_GAP;
        }

        let left = rect.right - menuWidth;
        left = Math.max(EDGE_GAP, Math.min(left, window.innerWidth - menuWidth - EDGE_GAP));
        top = Math.max(EDGE_GAP, Math.min(top, window.innerHeight - menuHeight - EDGE_GAP));

        setMenuPos({ top, left });
    }, [actions.length, direction]);

    useEffect(() => {
        const handleOutside = (event) => {
            if (!rootRef.current) return;
            if (rootRef.current.contains(event.target)) return;
            if (menuRef.current && menuRef.current.contains(event.target)) return;
            closeMenu();
        };

        document.addEventListener("mousedown", handleOutside);
        return () => {
            document.removeEventListener("mousedown", handleOutside);
            clearTimers();
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    useEffect(() => {
        if (!open) return;

        updatePosition();
        rafRef.current = requestAnimationFrame(() => {
            updatePosition();
            rafRef.current = null;
        });

        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);
        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [open, updatePosition]);

    return (
        <div
            ref={rootRef}
            className="relative inline-block text-left"
            onMouseEnter={scheduleOpen}
            onMouseLeave={scheduleClose}
        >
            <button
                ref={buttonRef}
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    clearTimers();
                    setOpen((prev) => !prev);
                }}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                <MoreHorizontal size={16} />
            </button>
            {open && createPortal(
                    <div
                        ref={menuRef}
                        className="z-[1100] w-36 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none transition ease-out duration-100 opacity-100 scale-100"
                        style={{
                            position: "fixed",
                            top: `${menuPos.top}px`,
                            left: `${menuPos.left}px`,
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => clearTimer(closeTimerRef)}
                        onMouseLeave={scheduleClose}
                    >
                        <div className="py-1">
                            {actions.map((action, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        action.onClick?.();
                                        closeMenu();
                                    }}
                                    className={`group flex w-full items-center px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 hover:text-gray-900 ${action.className || ""}`}
                                >
                                    {action.icon && <action.icon className="mr-2 h-4 w-4" aria-hidden="true" />}
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}
