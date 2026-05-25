import { prisma } from '@/lib/prisma'
import { authedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const claimParticipantProcedure = authedProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      participantId: z.string().min(1),
    }),
  )
  .mutation(async ({ ctx, input: { groupId, participantId } }) => {
    const userId = ctx.session.user.id

    const participant = await prisma.participant.findFirst({
      where: { id: participantId, groupId },
    })
    if (!participant) throw new Error('Participant not found in group')

    const existingByParticipant = await prisma.groupMember.findUnique({
      where: { participantId },
    })
    if (existingByParticipant && existingByParticipant.userId !== userId) {
      throw new Error('This participant is already claimed by another account')
    }

    await prisma.groupMember.upsert({
      where: { userId_groupId: { userId, groupId } },
      create: { userId, participantId, groupId },
      update: { participantId },
    })

    return { participantId }
  })
