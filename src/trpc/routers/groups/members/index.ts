import { createTRPCRouter } from '@/trpc/init'
import { claimParticipantProcedure } from './claim.procedure'
import { getMemberForGroupProcedure } from './getForGroup.procedure'
import { listMyGroupsProcedure } from './listMyGroups.procedure'
import { removeGroupMemberProcedure } from './remove.procedure'

export const groupMembersRouter = createTRPCRouter({
  claim: claimParticipantProcedure,
  getForGroup: getMemberForGroupProcedure,
  listMyGroups: listMyGroupsProcedure,
  remove: removeGroupMemberProcedure,
})
