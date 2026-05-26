import { createGroup } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { groupFormSchema } from '@/lib/schemas'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const createGroupProcedure = baseProcedure
  .input(
    z.object({
      groupFormValues: groupFormSchema,
      // When a signed-in user creates a group, they can specify which participant
      // they are by name so a GroupMember is created automatically.
      activeParticipantName: z.string().optional(),
    }),
  )
  .mutation(
    async ({ ctx, input: { groupFormValues, activeParticipantName } }) => {
      const group = await createGroup(groupFormValues)

      const userId = ctx.session?.user?.id
      if (userId && activeParticipantName) {
        const participant = group.participants.find(
          (p) => p.name === activeParticipantName,
        )
        if (participant) {
          await prisma.groupMember.create({
            data: { userId, participantId: participant.id, groupId: group.id },
          })
        }
      }

      return { groupId: group.id }
    },
  )
