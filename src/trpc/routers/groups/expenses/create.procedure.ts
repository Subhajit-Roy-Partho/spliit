import { createExpense } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { expenseFormSchema } from '@/lib/schemas'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const createGroupExpenseProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      expenseFormValues: expenseFormSchema,
      participantId: z.string().optional(),
    }),
  )
  .mutation(
    async ({ input: { groupId, expenseFormValues, participantId } }) => {
      const expense = await createExpense(
        expenseFormValues,
        groupId,
        participantId,
      )
      await prisma.group.update({
        where: { id: groupId },
        data: { updatedAt: new Date() },
      })
      return { expenseId: expense.id }
    },
  )
