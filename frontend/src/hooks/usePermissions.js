import { useQuery } from "@tanstack/react-query";
import { listPermissions } from "../lib/api";

export function usePermissions() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: listPermissions,
    staleTime: 5 * 60 * 1000,
  });
}
