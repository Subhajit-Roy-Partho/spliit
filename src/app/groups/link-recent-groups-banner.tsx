'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/components/ui/use-toast'
import { useMediaQuery } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { Link2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useState } from 'react'

function ControlledClaimForm({
  groupId,
  groupName,
  onClose,
  className,
}: {
  groupId: string
  groupName: string
  onClose: () => void
  className?: string
}) {
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')
  const { data: groupData } = trpc.groups.get.useQuery({ groupId })
  const { mutateAsync: claim, isPending } = trpc.groups.members.claim.useMutation()
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
      await utils.groups.members.listMyGroups.invalidate()
      await utils.groups.members.getForGroup.invalidate({ groupId })
      toast({
        title: 'Linked!',
        description: `Your account is now linked to a participant in ${groupName}.`,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to link participant.')
    }
  }

  return (
    <form className={cn('grid items-start gap-4', className)} onSubmit={handleSubmit}>
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>
      )}
      {groupData?.group ? (
        <RadioGroup onValueChange={setSelected}>
          <div className="flex flex-col gap-3 my-2">
            {groupData.group.participants.map((participant) => (
              <div key={participant.id} className="flex items-center space-x-2">
                <RadioGroupItem value={participant.id} id={`link-${participant.id}`} />
                <Label htmlFor={`link-${participant.id}`} className="flex-1 cursor-pointer">
                  {participant.name}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      ) : (
        <p className="text-sm text-muted-foreground">Loading participants…</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || !selected}>
          {isPending ? 'Linking…' : 'Link my account'}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Skip
        </Button>
      </div>
    </form>
  )
}

function ControlledClaimDialog({
  groupId,
  groupName,
  onClose,
}: {
  groupId: string
  groupName: string
  onClose: () => void
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { data: session } = useSession()
  const description = `You're logged in as ${session?.user?.name ?? session?.user?.email}. Select which participant in "${groupName}" represents you.`

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Which participant are you?</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <ControlledClaimForm groupId={groupId} groupName={groupName} onClose={onClose} />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Which participant are you?</DrawerTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </DrawerHeader>
        <ControlledClaimForm
          groupId={groupId}
          groupName={groupName}
          onClose={onClose}
          className="px-4 pb-4"
        />
      </DrawerContent>
    </Drawer>
  )
}

export function LinkRecentGroupsBanner({
  recentGroupIds,
  myGroupIds,
}: {
  recentGroupIds: string[]
  myGroupIds: string[]
}) {
  const unclaimedIds = recentGroupIds.filter((id) => !myGroupIds.includes(id))
  const { data } = trpc.groups.list.useQuery(
    { groupIds: unclaimedIds },
    { enabled: unclaimedIds.length > 0 },
  )
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || !unclaimedIds.length) return null
  const groups = data?.groups.filter((g) => unclaimedIds.includes(g.id)) ?? []
  if (!groups.length) return null

  const activeGroup = groups.find((g) => g.id === activeGroupId)

  return (
    <>
      <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Link2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-medium text-sm">
                  Link your account to groups you&apos;ve visited
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                You&apos;ve visited {groups.length} group
                {groups.length !== 1 ? 's' : ''} without linking your account.
                Link to track your expenses across devices.
              </p>
              <div className="flex flex-wrap gap-2">
                {groups.map((group) => (
                  <Button
                    key={group.id}
                    size="sm"
                    variant="secondary"
                    onClick={() => setActiveGroupId(group.id)}
                  >
                    {group.name}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="shrink-0 text-muted-foreground"
            >
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeGroupId && activeGroup && (
        <ControlledClaimDialog
          groupId={activeGroupId}
          groupName={activeGroup.name}
          onClose={() => setActiveGroupId(null)}
        />
      )}
    </>
  )
}
