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

const App = () => {
  const { isLoading, isAuthenticated } = useAuthUser();
  // const isAuthenticated = true;
  // const isLoading = false;
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
          element={!isAuthenticated ? <ResetPassword /> : <Navigate to="/" replace />}
        />
        <Route
          path='/my-profile'
          element={isAuthenticated ? <MyProfilePage /> : <Navigate to="/login/owner" replace />}
        />
        <Route
          path="/settings"
          element={isAuthenticated ? <SettingsLayout /> : <Navigate to="/login/owner" replace />}
        >
          <Route index element={<Navigate to="roles" replace />} />
          <Route path="shop" element={<ShopManage />} />
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
          element={<Navigate to={"/"}/>}
        />
      </Routes>
      <Toaster />
    </div>
  )
}

export default App