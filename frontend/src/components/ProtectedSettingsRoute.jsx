import React from "react";
import { Navigate } from "react-router";
import useUserPermissions from "../hooks/useUserPermissions";
import PageLoader from "./PageLoader";

export default function ProtectedSettingsRoute({ perm, children }) {
  const { perms, ready } = useUserPermissions();

  if (!ready) return <PageLoader />;

  if (!perms || !perms.has(perm)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
