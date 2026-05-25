import { prisma } from '@/lib/prisma'
import { authedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const removeGroupMemberProcedure = authedProcedure
  .input(z.object({ groupId: z.string().min(1) }))
  .mutation(async ({ ctx, input: { groupId } }) => {
    const userId = ctx.session.user.id
    await prisma.groupMember.deleteMany({ where: { userId, groupId } })
  })
