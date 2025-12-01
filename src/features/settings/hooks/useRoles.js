import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteRole, getRoles } from "../../../lib/api";
import { useTenant } from "./useTenant";

export function useRoles() {
    const tenantId = useTenant();
    return useQuery({
        queryKey: ["roles", tenantId],
        queryFn: getRoles,
        enabled: !!tenantId,
    });
}

export function useDeleteRole(options = {}) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (roleId) => deleteRole(roleId),
        onSuccess: async (...args) => {
            if (typeof options.onSuccess === "function") {
                await options.onSuccess(...args);
            }
            await qc.invalidateQueries({ queryKey: ["roles"] });
        },
        ...options,
    });
}
