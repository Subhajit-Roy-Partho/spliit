import { createTRPCRouter } from '@/trpc/init'
import { searchUsersProcedure } from './search.procedure'

export const usersRouter = createTRPCRouter({
  search: searchUsersProcedure,
})
