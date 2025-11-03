import { useMutation } from "@tanstack/react-query";
import { updateRoleFull } from "../lib/api";

export function useUpdateRole() {
  return useMutation({
    mutationFn: ({ roleId, name, description, permissionNames }) =>
      updateRoleFull(roleId, { name, description, permissionNames }),
  });
}
