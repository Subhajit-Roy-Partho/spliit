'use client'

import { GroupForm } from '@/components/group-form'
import { trpc } from '@/trpc/client'
import { useSession } from 'next-auth/react'
import { useCurrentGroup } from '../current-group-context'

export const EditGroup = () => {
  const { groupId } = useCurrentGroup()
  const { data, isLoading } = trpc.groups.getDetails.useQuery({ groupId })
  const { mutateAsync: updateGroup } = trpc.groups.update.useMutation()
  const { mutateAsync: claimParticipant } = trpc.groups.members.claim.useMutation()
  const utils = trpc.useUtils()
  const { status } = useSession()

  if (isLoading) return <></>

  return (
    <GroupForm
      group={data?.group}
      onSubmit={async (groupFormValues, participantId) => {
        await updateGroup({ groupId, participantId, groupFormValues })
        // Sync the GroupMember when an authenticated user changes their active participant.
        // Without this, active-user-modal.tsx overwrites localStorage from the stale DB record
        // on every expenses page load, making the Settings change appear to have no effect.
        if (status === 'authenticated' && participantId) {
          try {
            await claimParticipant({ groupId, participantId })
          } catch {
            // Ignore: participant may be claimed by another account
          }
        }
        await utils.groups.invalidate()
        await utils.groups.members.invalidate()
      }}
      protectedParticipantIds={data?.participantsWithExpenses}
    />
  )
}
