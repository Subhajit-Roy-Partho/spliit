import { createTRPCRouter } from '@/trpc/init'
import { claimParticipantProcedure } from './claim.procedure'
import { getMemberForGroupProcedure } from './getForGroup.procedure'
import { listMyGroupsProcedure } from './listMyGroups.procedure'

export const groupMembersRouter = createTRPCRouter({
  claim: claimParticipantProcedure,
  getForGroup: getMemberForGroupProcedure,
  listMyGroups: listMyGroupsProcedure,
})
