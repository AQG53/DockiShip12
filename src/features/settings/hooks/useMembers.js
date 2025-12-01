import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUsers, deleteUser } from "../../../lib/api";
import { getTenantId } from "../../../lib/axios";

export function useMembers(options = {}) {
    const tenantId = getTenantId();
    return useQuery({
        queryKey: ["members", tenantId],
        enabled: !!tenantId,
        queryFn: () => listUsers(),
        keepPreviousData: false,
        staleTime: 0,
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
