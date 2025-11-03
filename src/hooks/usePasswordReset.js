import { useMutation } from "@tanstack/react-query";
import { requestPasswordReset, resetPassword } from '../lib/api';

export function useRequestReset() {
  return useMutation({
    mutationFn: async ({ email }) => {
      return requestPasswordReset({ email});
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, newPassword }) => resetPassword({ token, newPassword }),
  });
}
