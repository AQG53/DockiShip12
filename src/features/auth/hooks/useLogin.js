import { useMutation } from "@tanstack/react-query";
import { login_member, login_owner } from "../../../lib/api";

export function useLogin_Owner() {
  return useMutation({
    mutationFn: login_owner,
    retry: false,
  });
}
export function useLogin_Member() {
  return useMutation({
    mutationFn: login_member,
    retry: false,
  });
}
