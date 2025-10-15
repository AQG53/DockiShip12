import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRole } from "../lib/api";
import { getTenantId } from "../lib/axios";

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      const tenantId = getTenantId();
      qc.invalidateQueries({ queryKey: ["roles", tenantId] });
    },
  });
}
