import { useEffect, useState } from "react";
import { getTenantId } from "../lib/axios";

export function useTenant() {
  const [tenantId, setTenantId] = useState(() => getTenantId());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "ds_tenant_id") setTenantId(getTenantId());
    };
    const onCustom  = () => setTenantId(getTenantId());

    window.addEventListener("storage", onStorage);
    window.addEventListener("tenant-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("tenant-changed", onCustom);
    };
  }, []);

  return tenantId;
}
