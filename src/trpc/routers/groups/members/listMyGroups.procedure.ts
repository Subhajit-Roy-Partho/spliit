import { prisma } from '@/lib/prisma'
import { authedProcedure } from '@/trpc/init'

export const listMyGroupsProcedure = authedProcedure.query(async ({ ctx }) => {
  const userId = ctx.session.user.id
  const members = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: { include: { participants: true } },
      participant: true,
    },
    orderBy: { group: { updatedAt: 'desc' } },
  })
  return {
    groups: members.map((m) => ({ ...m.group, myParticipant: m.participant })),
  }
})
