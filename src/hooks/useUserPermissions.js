import { useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useAuthCheck } from "./useAuthCheck";

const TOKEN_KEY = "ds_access_token";

export default function useUserPermissions() {
  const [claims, setClaims] = useState(null);
  const [decodedReady, setDecodedReady] = useState(false);
  const [hasToken, setHasToken] = useState(() => !!localStorage.getItem(TOKEN_KEY));
  const { data: authData, isLoading: authLoading } = useAuthCheck({
    enabled: hasToken,
    retry: 0,
    refetchOnMount: false,
  });

  const compute = () => {
    try {
      const t = localStorage.getItem(TOKEN_KEY);
      setHasToken(!!t);
      if (!t) {
        setClaims(null);
        setDecodedReady(true);
        return;
      }
      const raw = t.startsWith("Bearer ") ? t.slice(7) : t;
      const dec = jwtDecode(raw);
      setClaims(dec || null);
    } catch (e) {
      console.error("usePermissions: failed to decode token", e);
      setClaims(null);
    } finally {
      setDecodedReady(true);
    }
  };

  useEffect(() => {
    compute(); // initial
    const onAuthChanged = () => compute();
    const onStorage = (e) => {
      if (e.key === TOKEN_KEY) compute();
    };
    window.addEventListener("auth-changed", onAuthChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("auth-changed", onAuthChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const perms = useMemo(() => {
    const apiPerms = Array.isArray(authData?.perms) ? authData.perms : [];
    const tokenPerms = Array.isArray(claims?.perms) ? claims.perms : [];
    const source = apiPerms.length > 0 ? apiPerms : tokenPerms;
    return new Set(source.map((p) => String(p).toLowerCase()));
  }, [authData?.perms, claims?.perms]);

  const resolvedClaims = useMemo(() => {
    if (authData) {
      return {
        ...(claims || {}),
        roles: Array.isArray(authData.roles) ? authData.roles : [],
        perms: Array.isArray(authData.perms) ? authData.perms : [],
      };
    }
    return claims;
  }, [authData, claims]);

  // Keep route guards stable during background refetches.
  const ready = decodedReady && (!hasToken || !authLoading);

  return { perms, claims: resolvedClaims, ready };
}
