import { auth } from '@/auth'
import { Prisma } from '@prisma/client'
import { TRPCError, initTRPC } from '@trpc/server'
import { cache } from 'react'
import superjson from 'superjson'

superjson.registerCustom<Prisma.Decimal, string>(
  {
    isApplicable: (v): v is Prisma.Decimal => Prisma.Decimal.isDecimal(v),
    serialize: (v) => v.toJSON(),
    deserialize: (v) => new Prisma.Decimal(v),
  },
  'decimal.js',
)

export const createTRPCContext = cache(async () => {
  const session = await auth()
  return { session }
})

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
})

export const createTRPCRouter = t.router
export const baseProcedure = t.procedure

export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: { session: ctx.session as NonNullable<typeof ctx.session> },
  })
})
