import { useMutation } from "@tanstack/react-query";
import { inviteMember, assignRolesToUser, findUserByEmail } from "../lib/api";


export function useInviteMemberWithOptionalRole() {
  return useMutation({
    mutationFn: async ({ fullName, email, roleId }) => {
      const inviteRes = await inviteMember({ fullName, email });

      let userId = inviteRes?.id || inviteRes?.userId || inviteRes?.memberId || null;

      if (!userId) {
        const found = await findUserByEmail(email);
        userId = found?.userId || found?.id || null;
      }

      if (roleId && userId) {
        await assignRolesToUser(userId, [roleId]);
      }

      return { invite: inviteRes, assignedRoleId: roleId || null, userId: userId || null };
    },
  });
}

export function useAssignMemberRoles() {
  return useMutation({
    mutationFn: async ({ userId, roleId }) => {
      return assignRolesToUser(userId, [roleId]);
    },
  });
}
