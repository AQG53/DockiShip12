import React from "react";
import { Navigate } from "react-router";
import useUserPermissions from "../../../hooks/useUserPermissions";
import PageLoader from "../../../components/PageLoader";

export default function ProtectedSettingsRoute({ perm, permsAny = [], children }) {
  const { perms, claims, ready } = useUserPermissions();

  if (!ready) return <PageLoader />;

  const roleNames = Array.isArray(claims?.roles) ? claims.roles.map((role) => String(role).toLowerCase()) : [];
  const isOwner = roleNames.includes("owner");
  if (isOwner) return children;

  const required = [
    ...(perm ? [perm] : []),
    ...(Array.isArray(permsAny) ? permsAny : []),
  ].map((p) => String(p).toLowerCase());

  if (required.length === 0) return children;

  const allowed = required.some((requiredPerm) => perms?.has(requiredPerm));
  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return children;
}
