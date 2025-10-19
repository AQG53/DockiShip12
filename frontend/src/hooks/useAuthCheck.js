import { useQuery } from "@tanstack/react-query";
import { authCheck } from "../lib/api"; 

export function useAuthCheck(options = {}) {
  return useQuery({
    queryKey: ["auth", "check"],
    queryFn: authCheck,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    ...options,
  });
}
