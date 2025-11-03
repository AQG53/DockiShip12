import { useMutation } from "@tanstack/react-query";
import { createTenant } from "../lib/api";

export function useCreateTenant() {
  return useMutation({
    mutationFn: ({ tenantName, description }) =>
      createTenant({ tenantName, description }),
  });
}
