'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useMediaQuery } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { useSession } from 'next-auth/react'
import { ComponentProps, useEffect, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'

export function ClaimParticipantModal({ groupId }: { groupId: string }) {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { data: groupData } = trpc.groups.get.useQuery({ groupId })
  const { data: memberData, isLoading: memberLoading } =
    trpc.groups.members.getForGroup.useQuery(
      { groupId },
      { enabled: status === 'authenticated' },
    )

  useEffect(() => {
    if (
      status === 'authenticated' &&
      !memberLoading &&
      memberData?.member === null &&
      groupData?.group
    ) {
      setOpen(true)
    }
  }, [status, memberLoading, memberData, groupData])

  if (status !== 'authenticated') return null

  const title = 'Which participant are you?'
  const description = `You're logged in as ${session?.user?.name ?? session?.user?.email}. Select which participant in this group represents you.`

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <ClaimForm
            group={groupData?.group}
            groupId={groupId}
            close={() => setOpen(false)}
          />
          <DialogFooter className="sm:justify-center">
            <p className="text-sm text-center text-muted-foreground">
              You can change this later from the group settings.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DialogDescription>{description}</DialogDescription>
        </DrawerHeader>
        <ClaimForm
          className="px-4"
          group={groupData?.group}
          groupId={groupId}
          close={() => setOpen(false)}
        />
        <DrawerFooter className="pt-2">
          <p className="text-sm text-center text-muted-foreground">
            You can change this later from the group settings.
          </p>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function ClaimForm({
  group,
  groupId,
  close,
  className,
}: ComponentProps<'form'> & {
  group?: AppRouterOutput['groups']['get']['group']
  groupId: string
  close: () => void
}) {
  const [selected, setSelected] = useState<string>('')
  const [error, setError] = useState('')
  const { mutateAsync: claim, isPending } =
    trpc.groups.members.claim.useMutation()
  const utils = trpc.useUtils()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) {
      setError('Please select a participant.')
      return
    }
    try {
      await claim({ groupId, participantId: selected })
      await utils.groups.members.getForGroup.invalidate({ groupId })
      await utils.groups.members.listMyGroups.invalidate()
      toast({ title: 'Linked!', description: 'Your account is now linked to this participant.' })
      close()
    } catch (err: any) {
      setError(err.message ?? 'Failed to link participant.')
    }
  }

  return (
    <form
      className={cn('grid items-start gap-4', className)}
      onSubmit={handleSubmit}
    >
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
          {error}
        </p>
      )}
      <RadioGroup onValueChange={setSelected}>
        <div className="flex flex-col gap-3 my-2">
          {group?.participants.map((participant) => (
            <div key={participant.id} className="flex items-center space-x-2">
              <RadioGroupItem value={participant.id} id={`claim-${participant.id}`} />
              <Label htmlFor={`claim-${participant.id}`} className="flex-1 cursor-pointer">
                {participant.name}
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || !selected}>
          {isPending ? 'Linking…' : 'Link my account'}
        </Button>
        <Button type="button" variant="ghost" onClick={close}>
          Skip
        </Button>
      </div>
    </form>
  )
}
