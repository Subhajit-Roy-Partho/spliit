import { deleteExpense } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const deleteGroupExpenseProcedure = baseProcedure
  .input(
    z.object({
      expenseId: z.string().min(1),
      groupId: z.string().min(1),
      participantId: z.string().optional(),
    }),
  )
  .mutation(async ({ input: { expenseId, groupId, participantId } }) => {
    await deleteExpense(groupId, expenseId, participantId)
    await prisma.group.update({
      where: { id: groupId },
      data: { updatedAt: new Date() },
    })
    return {}
  })
