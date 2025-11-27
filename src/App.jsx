import Dashboard from './pages/Dashboard.jsx'
import LoginPage from './pages/LoginPage.jsx'
import LoginPageMember from './pages/LoginPageMember.jsx'
import { Navigate, Route, Routes } from 'react-router'
import useAuthUser from './hooks/useAuthUser.js'
import { Toaster } from "react-hot-toast"

import PageLoader from './components/PageLoader.jsx'
import RoleManage from './pages/settings/RoleManage.jsx'
import SettingsLayout from './pages/settings/SettingsLayout.jsx'
import SignupPage from './pages/SignupPage.jsx'
import TenantSetupPage from './pages/TenantSetup.jsx'
//import ShopSettings from './pages/settings/ShopSettings.jsx'
//import OrderSettings from './pages/settings/OrderSettings.jsx'
//import GeneralSettings from './pages/settings/GeneralSettings.jsx'
//import ListingSettings from './pages/settings/ListingSettings.jsx'
//import InventorySettings from './pages/settings/InventorySettings.jsx'
import StaffSettings from './pages/settings/StaffSettings.jsx'
import RequestReset from './pages/RequestReset.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import MyProfilePage from './pages/MyProfile.jsx'
import useTenantGuard from "./hooks/useTenantGuard.js";
import ProtectedSettingsRoute from './components/ProtectedSettingsRoute.jsx'
import ShopManage from './pages/settings/ShopManage.jsx'
import { useEffect } from 'react'
import useUserPermissions from './hooks/useUserPermissions.js'
import AcceptInvite from './pages/AcceptInvite.jsx'
import InventoryPage from './pages/inventory/InventoryPage.jsx'
import InventoryLayout from './pages/inventory/InventoryLayout.jsx'
import ProductList from './pages/inventory/ProductList.jsx'
import WarehouseList from './pages/inventory/WarehouseList.jsx'
import PurchasesLayout from './pages/purchases/PurchasesLayout.jsx'
import PurchasesPage from './pages/purchases/PurchasesPage.jsx'
import SuppliersManage from './pages/purchases/SuppliersManage.jsx'

function OwnerOnly({ children }) {
  const { claims, ready } = useUserPermissions();
  if (!ready) return <PageLoader />;

  const firstRole = String(claims?.roles?.[0] ?? '').toLowerCase();
  const isOwner = firstRole === 'owner';
  return isOwner ? children : <Navigate to="/" replace />;
}

const App = () => {
  const { isLoading, isAuthenticated } = useAuthUser();

  const { claims } = useUserPermissions();
  useEffect(() => {
    if (claims?.user)
      console.log(claims)
  }, [claims])

  const hasTenant = useTenantGuard();

  if (isLoading) {
    return <PageLoader />
  }

  return (
    <div className='min-h-screen'>
      <Routes>
        <Route
          path="/"
          element={
            !isAuthenticated ? (
              <Navigate to={"/login/owner"} replace />
            ) : hasTenant === false ? (
              <Navigate to={"/setup/tenant"} replace />
            ) : (
              <Dashboard />
            )
          }
        />

        <Route
          path="/login/owner"
          element={
            !isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />
          }
        />

        <Route
          path='/login/member'
          element={!isAuthenticated ? <LoginPageMember /> : <Navigate to="/" replace />}
        />

        <Route
          path='/signup/owner'
          element={
            isAuthenticated ? <Navigate to="/setup/tenant" replace /> : <SignupPage />
          }
        />

        <Route
          path='/setup/tenant'
          element={!isAuthenticated ? <Navigate to="/login/owner" /> : <TenantSetupPage />}
        />

        <Route
          path='/password/request'
          element={!isAuthenticated ? <RequestReset /> : <Navigate to="/" replace />}
        />

        <Route
          path='/reset-password'
          element={<ResetPassword />}
        />
        <Route
          path='/my-profile'
          element={isAuthenticated ? <MyProfilePage /> : <Navigate to="/login/owner" replace />}
        />

        <Route
          path='/inventory'
          element={isAuthenticated ? <InventoryLayout /> : <Navigate to="/login/owner" replace />}
        >
          <Route index element={<Navigate to="products/simple" replace />} />

          {/* Products */}
          <Route path="products/simple" element={<ProductList />} />
          {/*<Route path="products/bundle" element={<ProductsBundle />} /> */}

          {/* Inventory */}
          <Route path="list" element={<InventoryPage />} />
          <Route path="warehouses" element={<WarehouseList />} />
          {/* <Route path="inventory/inbound" element={<ManualInbound />} />
          <Route path="inventory/outbound" element={<ManualOutbound />} />
          <Route path="inventory/movement" element={<StockMovement />} /> */}

          {/* 3PF */}
          {/* <Route path="3pf/amazon-fpa" element={<AmazonFPA />} />
          <Route path="3pf/walmart-wfs" element={<WalmartWFS />} /> */}

          {/* Sync */}
          {/* <Route path="sync/log" element={<SyncLog />} />
          <Route path="sync/locking" element={<InventoryLocking />} /> */}
        </Route>

        <Route
          path='/purchases'
          element={isAuthenticated ? <PurchasesLayout /> : <Navigate to="/login/owner" replace />}
        >
          <Route index element={<Navigate to="suppliers/manage" replace />} />

          {/* Products */}
          <Route path="suppliers/manage" element={<SuppliersManage />} />
          {/*<Route path="products/bundle" element={<ProductsBundle />} /> */}

          {/* Inventory */}
          <Route path="to-purchase" element={<PurchasesPage />} />
          {/* <Route path="inventory/inbound" element={<ManualInbound />} />
          <Route path="inventory/outbound" element={<ManualOutbound />} />
          <Route path="inventory/movement" element={<StockMovement />} /> */}
        </Route>

        <Route
          path='/invite/accept'
          element={<AcceptInvite />}
        />
        <Route
          path="/settings"
          element={isAuthenticated ? <SettingsLayout /> : <Navigate to="/login/owner" replace />}
        >
          <Route index element={<Navigate to="roles" replace />} />
          <Route
            path="shop"
            element={
              <OwnerOnly>
                <ShopManage />
              </OwnerOnly>
            }
          />
          {/* <Route path="orders" element={<OrderSettings />} />
          <Route path="general" element={<GeneralSettings />} />
          <Route path="listings" element={<ListingSettings />} />
          <Route path="inventory" element={<InventorySettings />} /> */}
          <Route path="staff" element={
            <ProtectedSettingsRoute perm={"user.manage"}>
              <StaffSettings />
            </ProtectedSettingsRoute>
          }
          />
          <Route path="roles" element={
            <ProtectedSettingsRoute perm={"role.manage"}>
              <RoleManage />
            </ProtectedSettingsRoute>
          }
          />
        </Route>
        <Route
          path='/*'
          element={<Navigate to={"/"} />}
        />
      </Routes>
      <Toaster />
    </div>
  )
}

export default App
