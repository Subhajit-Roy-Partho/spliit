import { categoriesRouter } from '@/trpc/routers/categories'
import { groupsRouter } from '@/trpc/routers/groups'
import { usersRouter } from '@/trpc/routers/users'
import { inferRouterOutputs } from '@trpc/server'
import { createTRPCRouter } from '../init'

export const appRouter = createTRPCRouter({
  groups: groupsRouter,
  categories: categoriesRouter,
  users: usersRouter,
})

export type AppRouter = typeof appRouter
export type AppRouterOutput = inferRouterOutputs<AppRouter>
