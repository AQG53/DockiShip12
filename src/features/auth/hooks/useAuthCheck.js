import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authCheck } from "../../../lib/api";
import { TOKEN_KEY } from "../../../lib/axios";

export function useAuthCheck(options = {}) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["auth", "check"],
    queryFn: authCheck,
    staleTime: 30 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    ...options,
  });

  useEffect(() => {
    const refetchAuth = () => {
      qc.invalidateQueries({ queryKey: ["auth", "check"], exact: false });
    };
    const onStorage = (e) => {
      if (e.key === TOKEN_KEY) refetchAuth();
    };

    window.addEventListener("auth-changed", refetchAuth);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("auth-changed", refetchAuth);
      window.removeEventListener("storage", onStorage);
    };
  }, [qc]);

  return query;
}
