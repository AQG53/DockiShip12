import { useMutation } from "@tanstack/react-query";
import { login_member, login_owner } from "../lib/api";

export function useLogin_Owner() {
  return useMutation({
    mutationFn: login_owner
  });
}
export function useLogin_Member() {
  return useMutation({
    mutationFn: login_member
  });
}
