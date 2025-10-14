import { useQuery } from "@tanstack/react-query";
import { getRoles } from "../lib/api";
import { useTenant } from "./useTenant";

export function useRoles() {
  const tenantId = useTenant();
  return useQuery({
    queryKey: ["roles", tenantId],
    queryFn: getRoles,
    enabled: !!tenantId,
  });
}
