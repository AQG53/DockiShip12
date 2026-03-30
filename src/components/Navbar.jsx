import React, { useEffect, useMemo, useRef, useState } from 'react'
import logo from "../assets/logo1.png"
import { ChevronDown, ChevronRight, LogOut, Settings, User, User2 } from 'lucide-react';
import { logout } from "../lib/api"
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";
import { useNavigate, Link, useLocation } from 'react-router';
import { settingsItems } from '../utils';
import { navLinks } from '../utils';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';
import { useAuthCheck } from "../hooks/useAuthCheck";
import useUserPermissions from "../hooks/useUserPermissions";

const TOKEN_KEY = "ds_access_token";

const Navbar = () => {
  const [activeLink, setActiveLink] = useState('home');
  const [hoveredNavId, setHoveredNavId] = useState(null);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const [openUser, setOpenUser] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [token, setToken] = useState(null);
  const [claims, setClaims] = useState(null);
  const navCloseTimerRef = useRef(null);
  const location = useLocation();
  const { data, isLoading } = useAuthCheck();
  const { perms, claims: permissionClaims } = useUserPermissions();

  useEffect(() => {
    const map = new Map([
      ['/', 'home'],
      ['/inventory', 'inventory'],
      ['/purchases', 'purchases'],
      ['/orders', 'orders'],
    ]);

    const match = Array.from(map.keys()).find((p) =>
      location.pathname === p || location.pathname.startsWith(p + '/')
    );

    if (match) {
      setActiveLink(map.get(match));
    } else {
      setActiveLink('');
    }
  }, [location.pathname]);

  useEffect(() => {
    const readToken = () => {
      const t = localStorage.getItem(TOKEN_KEY);
      setToken(t || null);
      if (t) {
        try {
          const raw = t.startsWith('Bearer ') ? t.slice(7) : t;
          setClaims(jwtDecode(raw));
        } catch {
          setClaims(null);
        }
      } else {
        setClaims(null);
      }
    };

    readToken();

    const onAuthChanged = () => readToken();
    window.addEventListener("auth-changed", onAuthChanged);

    const onStorage = (e) => {
      if (e.key === TOKEN_KEY) readToken();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("auth-changed", onAuthChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate('/login/owner')
  };

  const openNavDropdown = (id) => {
    if (navCloseTimerRef.current) {
      clearTimeout(navCloseTimerRef.current);
      navCloseTimerRef.current = null;
    }
    setHoveredNavId(id);
  };

  const closeNavDropdown = () => {
    if (navCloseTimerRef.current) clearTimeout(navCloseTimerRef.current);
    navCloseTimerRef.current = setTimeout(() => setHoveredNavId(null), 110);
  };

  useEffect(() => {
    return () => {
      if (navCloseTimerRef.current) clearTimeout(navCloseTimerRef.current);
    };
  }, []);

  const moduleSet = useMemo(() => {
    const permList = Array.from(perms || []);
    return new Set(
      permList
        .filter(Boolean)
        .map((p) => p.split('.')[0])
    );
  }, [perms]);
  const isOwner = (
    Array.isArray(data?.roles)
      ? data.roles
      : (Array.isArray(permissionClaims?.roles) ? permissionClaims.roles : claims?.roles || [])
  )
    .some((r) => String(r).toLowerCase() === 'owner');

  const canSeeInventory = isOwner || moduleSet.has('inventory');
  const canSeePurchases = isOwner || moduleSet.has('purchases') || moduleSet.has('suppliers');
  const canSeeOrders = isOwner || moduleSet.has('orders');
  const canAccessInventoryProducts = isOwner || perms?.has('inventory.product.read') || perms?.has('inventory.product.manage');
  const canAccessWarehouses = isOwner || perms?.has('warehouses.read') || perms?.has('warehouses.manage');
  const canAccessSuppliers = isOwner || perms?.has('suppliers.read') || perms?.has('suppliers.manage');
  const canAccessPurchaseOrders = isOwner || Array.from(perms || []).some((perm) => {
    const value = String(perm).toLowerCase();
    return value.startsWith('purchases.po.') || value.startsWith('purchases.');
  });
  const canAccessOrderListing = isOwner || Array.from(perms || []).some((perm) => String(perm).toLowerCase().startsWith('orders.'));
  const canSeeInventoryNav = canSeeInventory || canAccessWarehouses;
  const canAccessSettingsItem = ({ permsAny }) => {
    if (isOwner) return true;
    const required = Array.isArray(permsAny) ? permsAny : [];
    if (required.length === 0) return false;
    return required.some((perm) => perms?.has(String(perm).toLowerCase()));
  };


  const visibleLinks = useMemo(() => {
    return navLinks.filter((link) => {
      const key = (link.id || link.name || '').toString().toLowerCase();
      if (key === 'home') return true;
      if (key === 'inventory') return canSeeInventoryNav;
      if (key === 'purchases') return canSeePurchases;
      if (key === 'orders') return canSeeOrders;
      return false;
    });
  }, [navLinks, canSeeInventoryNav, canSeePurchases, canSeeOrders]);

  return (
    <nav className="bg-[#ffeb9e] shadow-md fixed w-full top-0 z-50">
      <div className="max-w-full px-6">
        <div className="flex justify-between items-center h-15">
          <div className="flex items-center gap-2 mr-8">
            <Link to="/">
              <img
                src={logo}
                alt="Logo"
                className="h-18 w-auto cursor-pointer"
              />
            </Link>
          </div>

          <div className="flex items-center space-x-1 flex-1 px-5">
            {visibleLinks.map((link) => (
              <div
                key={link.name}
                className="relative"
                onMouseEnter={() => openNavDropdown(link.id)}
                onMouseLeave={closeNavDropdown}
              >
                <Link
                  to={link.to}
                  className="relative"
                  onClick={() => {
                    setActiveLink(link.id);
                    setHoveredNavId(null);
                  }}
                >
                  <div className={`px-4 py-2 text-sm font-medium transition-colors rounded-2xl
                              ${activeLink === link.id ? 'text-blue-600 bg-yellow-100'
                      : 'text-gray-700 hover:bg-yellow-100'}`}>
                    {link.name}
                  </div>
                </Link>

                {Array.isArray(link.submenu) && link.submenu.length > 0 && (
                  <div
                    className={`absolute left-0 top-full z-50 pt-2 transition-all duration-150 ease-out ${hoveredNavId === link.id ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"}`}
                  >
                    <div className="w-72 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl p-2 shadow-[0_18px_45px_-20px_rgba(15,23,42,0.45)]">
                      <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Quick Access
                      </div>
                      <div className="space-y-1">
                        {link.submenu
                          .filter((sub) => {
                            if (link.id === 'inventory') {
                              if (sub.path === '/inventory/warehouses') return canAccessWarehouses;
                              return canAccessInventoryProducts;
                            }
                            if (link.id === 'purchases') {
                              if (sub.path === '/purchases/suppliers/manage') return canAccessSuppliers;
                              if (sub.path === '/purchases/to-purchase') return canAccessPurchaseOrders;
                            }
                            if (link.id === 'orders') {
                              return canAccessOrderListing;
                            }
                            return true;
                          })
                          .map((sub) => {
                          const isSubActive = location.pathname === sub.path || location.pathname.startsWith(`${sub.path}/`);
                          return (
                            <button
                              type="button"
                              key={sub.path}
                              onClick={() => {
                                setActiveLink(link.id);
                                setHoveredNavId(null);
                                navigate(sub.path);
                              }}
                              className={`w-full rounded-xl border px-3 py-2 text-left transition-all duration-150 ${isSubActive
                                ? "border-blue-200 bg-blue-50"
                                : "border-transparent bg-slate-50/40 hover:border-slate-200 hover:bg-white"
                                }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-slate-800">{sub.label}</span>
                                <ChevronRight size={14} className="text-slate-400" />
                              </div>
                              <p className="mt-0.5 text-xs text-slate-500">{sub.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className='flex items-center gap-5'>
            {/* <div className='flex items-center gap-2'>
              <div className='relative w-5 h-5'>
                <svg className='w-5 h-5 transform -rotate-90'>
                  <circle
                    cx='10'
                    cy='10'
                    r='8'
                    stroke='#d4d4d4'
                    strokeWidth='3'
                    fill='none'
                  />
                  <circle
                    cx='10'
                    cy='10'
                    r='8'
                    stroke='#3b82f6'
                    strokeWidth='3'
                    fill='none'
                    strokeDasharray={`${(progress / 3) * 50.27} 50.27`}
                    className='transition-all duration-500'
                  />
                </svg>
              </div>
              <span className='text-gray-700 text-sm'>
                <span className='text-blue-600 font-semibold'>{progress}</span>/3
              </span>
            </div> */}

            {/* <button className='flex items-center gap-1 text-gray-700 hover:text-blue-600 text-sm font-medium'>
              Support
              <ChevronDown
                size={16}
                className={`transform transition-transform duration-200 ease-out
                  ${openUser ? "rotate-180" : "rotate-0"}`}
              />
            </button>

            <button className='flex items-center gap-1 text-gray-700 hover:text-blue-600 text-sm font-medium'>
              EN
              <ChevronDown
                size={16}
                className={`transform transition-transform duration-200 ease-out
                  ${openUser ? "rotate-180" : "rotate-0"}`}
              />
            </button> */}

            {!isLoading && data && (
              <div className="flex flex-col items-end text-right mr-2">
                <span className="text-sm font-medium text-gray-500">
                  Company: {data?.tenant?.name || "No Tenant"}
                </span>
                <span className="text-xs text-gray-500">
                  Role: {data?.roles?.[0] || "No Role"}
                </span>
              </div>
            )}

            <Menu
              as="div"
              className="relative inline-block text-left"
              onMouseEnter={() => setOpenSettings(true)}
              onMouseLeave={() => setOpenSettings(false)}
            >
              <MenuButton
                onClick={() => setOpenSettings((o) => !o)}
                className="flex items-center gap-1 text-gray-700 hover:text-blue-600 text-sm font-medium focus:outline-none"
              >
                <Settings size={20} />
              </MenuButton>

              <Transition
                show={openSettings}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <MenuItems
                  static
                  className="absolute right-0 mt-2 w-48 origin-top-right bg-white border border-gray-200 rounded-xl shadow-lg focus:outline-none overflow-hidden"
                >
                  {settingsItems.map(({ label, path, permsAny }) => {
                    if (!canAccessSettingsItem({ permsAny })) return null;

                    return (
                      <MenuItem
                        key={label}
                        as="button"
                        onClick={() => {
                          setActiveLink("");
                          navigate(path);
                          setOpenSettings(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer 
                                hover:bg-amber-50 data-[focus]:bg-gray-100 data-[focus]:text-blue-600
                                  first:rounded-t-xl last:rounded-b-xl"
                      >
                        {label}
                      </MenuItem>
                    );
                  })}

                </MenuItems>
              </Transition>
            </Menu>

            <Menu
              as="div"
              className="relative inline-block text-left"
              onMouseEnter={() => setOpenUser(true)}
              onMouseLeave={() => setOpenUser(false)}
            >
              <MenuButton
                onClick={() => setOpenUser((o) => !o)}
                className="flex items-center gap-1 text-gray-700 hover:text-blue-600 text-sm font-medium focus:outline-none"
              >
                <User2 size={20} />
                <ChevronDown
                  size={16}
                  className={`transform transition-transform duration-200 ease-out
                  ${openUser ? "rotate-180" : "rotate-0"}`}
                />
              </MenuButton>

              <Transition
                show={openUser}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <MenuItems
                  static
                  className="absolute right-0 mt-2 w-35 origin-top-right bg-white border border-gray-200 rounded-xl shadow-lg focus:outline-none"
                >
                  <MenuItem
                    as="a"
                    onClick={() => { setActiveLink(""); navigate("/my-profile") }}
                    className="cursor-pointer flex items-center gap-2 px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-blue-600 hover:bg-amber-50 first:rounded-t-xl"
                  >
                    <User size={16} />
                    My Profile
                  </MenuItem>

                  <MenuItem
                    as="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-blue-600 cursor-pointer last:rounded-b-xl hover:bg-amber-50"
                  >
                    <LogOut size={16} className='text-red-500' />
                    Logout
                  </MenuItem>
                </MenuItems>
              </Transition>
            </Menu>
          </div>

        </div>
      </div>
    </nav>
  );
}

export default Navbar
