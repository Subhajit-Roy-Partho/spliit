import { prisma } from '@/lib/prisma'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const searchUsersProcedure = baseProcedure
  .input(z.object({ query: z.string().min(1) }))
  .query(async ({ input: { query } }) => {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, email: true, image: true },
      take: 10,
    })
    return { users }
  })
