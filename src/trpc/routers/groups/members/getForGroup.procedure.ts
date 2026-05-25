import { prisma } from '@/lib/prisma'
import { authedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const getMemberForGroupProcedure = authedProcedure
  .input(z.object({ groupId: z.string().min(1) }))
  .query(async ({ ctx, input: { groupId } }) => {
    const userId = ctx.session.user.id
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
      include: { participant: true },
    })
    return { member }
  })
