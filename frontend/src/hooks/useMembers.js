import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUsers, deleteUser } from "../lib/api";

export function useMembers(options = {}) {
  return useQuery({
    queryKey: ["members"],
    queryFn: () => listUsers(),
    keepPreviousData: true,
    staleTime: 60_000,
    retry: false,
    ...options,
  });
}

export function useDeleteMember(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => deleteUser(userId),
    onSuccess: async (...args) => {
      if (typeof options.onSuccess === "function") {
        await options.onSuccess(...args);
      }
      await qc.invalidateQueries({ queryKey: ["members"] });
    },
    ...options,
  });
}
