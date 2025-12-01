import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authCheck } from "../../../lib/api";
import { TOKEN_KEY } from "../../../lib/axios";

export function useAuthCheck(options = {}) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["auth", "check"],
    queryFn: authCheck,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 1,
    ...options,
  });

  useEffect(() => {
    const refetchAuth = () => {
      qc.invalidateQueries({ queryKey: ["auth", "check"], exact: false });
      query.refetch();
    };

    window.addEventListener("auth-changed", refetchAuth);
    window.addEventListener("storage", (e) => {
      if (e.key === TOKEN_KEY) refetchAuth();
    });

    return () => {
      window.removeEventListener("auth-changed", refetchAuth);
      window.removeEventListener("storage", refetchAuth);
    };
  }, [qc, query]);

  return query;
}
