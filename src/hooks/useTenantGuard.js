import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "ds_access_token";

export default function useTenantGuard() {
  const [hasTenant, setHasTenant] = useState(null);

  const computeTenantStatus = () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setHasTenant(null);
        return;
      }

      const raw = token.startsWith("Bearer ") ? token.slice(7) : token;
      const decoded = jwtDecode(raw);

      setHasTenant(!!decoded?.tenantId);
    } catch (err) {
      console.error("Failed to decode JWT:", err);
      setHasTenant(null);
    }
  };

  useEffect(() => {
    computeTenantStatus();

    const onAuthChanged = () => computeTenantStatus();

    const onStorage = (e) => {
      if (e.key === TOKEN_KEY) computeTenantStatus();
    };

    window.addEventListener("auth-changed", onAuthChanged);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("auth-changed", onAuthChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return hasTenant;
}
