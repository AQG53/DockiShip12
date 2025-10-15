import { useQuery } from "@tanstack/react-query";
import { listUsers } from "../lib/api";

export function useMembers(options = {}) {
  return useQuery({
    queryKey: ["members"],
    queryFn: () => listUsers(),
    keepPreviousData: true,
    staleTime: 60_000,
    ...options,
    retry: false,
  });
}
