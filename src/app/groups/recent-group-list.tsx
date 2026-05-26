'use client'
import { AddGroupByUrlButton } from '@/app/groups/add-group-by-url-button'
import {
  RecentGroups,
  archiveGroup,
  getArchivedGroups,
  getRecentGroups,
  getStarredGroups,
  unarchiveGroup,
} from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import { getGroups } from '@/lib/api'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import {
  Archive,
  ArchiveRestore,
  Loader2,
  MoreHorizontal,
  UserMinus,
  Users,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PropsWithChildren, useEffect, useState } from 'react'
import { LinkRecentGroupsBanner } from './link-recent-groups-banner'
import { RecentGroupListCard } from './recent-group-list-card'

type MyGroupsData = AppRouterOutput['groups']['members']['listMyGroups']

export type RecentGroupsState =
  | { status: 'pending' }
  | {
      status: 'partial'
      groups: RecentGroups
      starredGroups: string[]
      archivedGroups: string[]
    }
  | {
      status: 'complete'
      groups: RecentGroups
      groupsDetails: Awaited<ReturnType<typeof getGroups>>
      starredGroups: string[]
      archivedGroups: string[]
    }

function sortGroups({
  groups,
  starredGroups,
  archivedGroups,
}: {
  groups: RecentGroups
  starredGroups: string[]
  archivedGroups: string[]
}) {
  const starredGroupInfo = []
  const groupInfo = []
  const archivedGroupInfo = []
  for (const group of groups) {
    if (starredGroups.includes(group.id)) {
      starredGroupInfo.push(group)
    } else if (archivedGroups.includes(group.id)) {
      archivedGroupInfo.push(group)
    } else {
      groupInfo.push(group)
    }
  }
  return { starredGroupInfo, groupInfo, archivedGroupInfo }
}

function MyGroupCard({
  group,
  isArchived,
  onArchiveToggle,
  onRemove,
}: {
  group: MyGroupsData['groups'][number]
  isArchived: boolean
  onArchiveToggle: () => void
  onRemove: () => void
}) {
  const router = useRouter()

  return (
    <li>
      <div
        role="link"
        tabIndex={0}
        className="block rounded-lg border bg-card shadow-sm hover:bg-accent transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => router.push(`/groups/${group.id}/expenses`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            router.push(`/groups/${group.id}/expenses`)
          }
        }}
      >
        <CardContent className="p-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{group.name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Users className="w-3 h-3 shrink-0" />
              {group.participants.length} participant
              {group.participants.length !== 1 ? 's' : ''} · you are{' '}
              <span className="font-medium">{group.myParticipant.name}</span>
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 -mr-1"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onArchiveToggle()
                }}
              >
                {isArchived ? (
                  <>
                    <ArchiveRestore className="w-4 h-4 mr-2" />
                    Unarchive
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove()
                }}
              >
                <UserMinus className="w-4 h-4 mr-2" />
                Remove from My Groups
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </div>
    </li>
  )
}

function MyGroupsList({
  myGroupsData,
  recentGroupIds,
  myGroupIds,
  archivedGroups,
  refreshArchivedGroups,
}: {
  myGroupsData: MyGroupsData | undefined
  recentGroupIds: string[]
  myGroupIds: string[]
  archivedGroups: string[]
  refreshArchivedGroups: () => void
}) {
  const { mutateAsync: removeMember } = trpc.groups.members.remove.useMutation()
  const utils = trpc.useUtils()
  const { toast } = useToast()

  if (!myGroupsData) {
    return (
      <p className="text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 inline animate-spin mr-1" />
        Loading your groups…
      </p>
    )
  }

  const handleRemove = async (groupId: string, groupName: string) => {
    await removeMember({ groupId })
    await utils.groups.members.listMyGroups.invalidate()
    toast({
      title: 'Removed',
      description: `${groupName} removed from My Groups. You can still access it via Recent Groups.`,
    })
  }

  const handleArchiveToggle = (groupId: string) => {
    if (archivedGroups.includes(groupId)) {
      unarchiveGroup(groupId)
    } else {
      archiveGroup(groupId)
    }
    refreshArchivedGroups()
  }

  // Split into active and archived
  const activeGroups = myGroupsData.groups.filter(
    (g) => !archivedGroups.includes(g.id),
  )
  const archivedMyGroups = myGroupsData.groups.filter((g) =>
    archivedGroups.includes(g.id),
  )

  return (
    <>
      <LinkRecentGroupsBanner
        recentGroupIds={recentGroupIds}
        myGroupIds={myGroupIds}
      />

      {!myGroupsData.groups.length ? (
        <p className="text-sm text-muted-foreground">
          You haven&apos;t claimed a participant in any group yet. Open a group
          link and claim your participant to see it here.
        </p>
      ) : (
        <>
          {activeGroups.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {activeGroups.map((group) => (
                <MyGroupCard
                  key={group.id}
                  group={group}
                  isArchived={false}
                  onArchiveToggle={() => handleArchiveToggle(group.id)}
                  onRemove={() => handleRemove(group.id, group.name)}
                />
              ))}
            </ul>
          )}
          {archivedMyGroups.length > 0 && (
            <div className="mt-4 opacity-60">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Archived
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {archivedMyGroups.map((group) => (
                  <MyGroupCard
                    key={group.id}
                    group={group}
                    isArchived={true}
                    onArchiveToggle={() => handleArchiveToggle(group.id)}
                    onRemove={() => handleRemove(group.id, group.name)}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </>
  )
}

export function RecentGroupList() {
  const { data: session, status } = useSession()
  const [state, setState] = useState<RecentGroupsState>({ status: 'pending' })

  function loadGroups() {
    const groupsInStorage = getRecentGroups()
    const starredGroups = getStarredGroups()
    const archivedGroups = getArchivedGroups()
    setState({
      status: 'partial',
      groups: groupsInStorage,
      starredGroups,
      archivedGroups,
    })
  }

  useEffect(() => {
    loadGroups()
  }, [])

  if (state.status === 'pending') return null

  return (
    <RecentGroupList_
      groups={state.groups}
      starredGroups={state.starredGroups}
      archivedGroups={state.archivedGroups}
      refreshGroupsFromStorage={() => loadGroups()}
      isAuthenticated={status === 'authenticated' && !!session?.user}
    />
  )
}

function RecentGroupList_({
  groups,
  starredGroups,
  archivedGroups,
  refreshGroupsFromStorage,
  isAuthenticated,
}: {
  groups: RecentGroups
  starredGroups: string[]
  archivedGroups: string[]
  refreshGroupsFromStorage: () => void
  isAuthenticated: boolean
}) {
  const t = useTranslations('Groups')
  const { data, isLoading } = trpc.groups.list.useQuery({
    groupIds: groups.map((group) => group.id),
  })
  const { data: myGroupsData } = trpc.groups.members.listMyGroups.useQuery(
    undefined,
    { enabled: isAuthenticated },
  )

  const myGroupIds = myGroupsData?.groups.map((g) => g.id) ?? []

  // Exclude groups already shown in "My Groups" from the recent/starred/archived lists
  const recentGroups =
    isAuthenticated && myGroupIds.length > 0
      ? groups.filter((g) => !myGroupIds.includes(g.id))
      : groups

  const { starredGroupInfo, groupInfo, archivedGroupInfo } = sortGroups({
    groups: recentGroups,
    starredGroups,
    archivedGroups,
  })

  return (
    <GroupsPage reload={refreshGroupsFromStorage}>
      {isAuthenticated && (
        <section className="mb-8">
          <h2 className="font-semibold text-lg mb-3">My Groups</h2>
          <MyGroupsList
            myGroupsData={myGroupsData}
            recentGroupIds={groups.map((g) => g.id)}
            myGroupIds={myGroupIds}
            archivedGroups={archivedGroups}
            refreshArchivedGroups={refreshGroupsFromStorage}
          />
        </section>
      )}

      {isLoading && !data ? (
        <p>
          <Loader2 className="w-4 m-4 mr-2 inline animate-spin" />{' '}
          {t('loadingRecent')}
        </p>
      ) : data?.groups.length === 0 && groups.length === 0 ? (
        <div className="text-sm space-y-2">
          <p>{t('NoRecent.description')}</p>
          <p>
            <Button variant="link" asChild className="-m-4">
              <Link href={`/groups/create`}>{t('NoRecent.create')}</Link>
            </Button>{' '}
            {t('NoRecent.orAsk')}
          </p>
        </div>
      ) : (
        <>
          {starredGroupInfo.length > 0 && (
            <>
              <h2 className="mb-2">{t('starred')}</h2>
              <GroupList
                groups={starredGroupInfo}
                groupDetails={data?.groups}
                archivedGroups={archivedGroups}
                starredGroups={starredGroups}
                refreshGroupsFromStorage={refreshGroupsFromStorage}
              />
            </>
          )}
          {groupInfo.length > 0 && (
            <>
              <h2 className="mt-6 mb-2">{t('recent')}</h2>
              <GroupList
                groups={groupInfo}
                groupDetails={data?.groups}
                archivedGroups={archivedGroups}
                starredGroups={starredGroups}
                refreshGroupsFromStorage={refreshGroupsFromStorage}
              />
            </>
          )}
          {archivedGroupInfo.length > 0 && (
            <>
              <h2 className="mt-6 mb-2 opacity-50">{t('archived')}</h2>
              <div className="opacity-50">
                <GroupList
                  groups={archivedGroupInfo}
                  groupDetails={data?.groups}
                  archivedGroups={archivedGroups}
                  starredGroups={starredGroups}
                  refreshGroupsFromStorage={refreshGroupsFromStorage}
                />
              </div>
            </>
          )}
        </>
      )}
    </GroupsPage>
  )
}

function GroupList({
  groups,
  groupDetails,
  starredGroups,
  archivedGroups,
  refreshGroupsFromStorage,
}: {
  groups: RecentGroups
  groupDetails?: AppRouterOutput['groups']['list']['groups']
  starredGroups: string[]
  archivedGroups: string[]
  refreshGroupsFromStorage: () => void
}) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {groups.map((group) => (
        <RecentGroupListCard
          key={group.id}
          group={group}
          groupDetail={groupDetails?.find((gd) => gd.id === group.id)}
          isStarred={starredGroups.includes(group.id)}
          isArchived={archivedGroups.includes(group.id)}
          refreshGroupsFromStorage={refreshGroupsFromStorage}
        />
      ))}
    </ul>
  )
}

function GroupsPage({
  children,
  reload,
}: PropsWithChildren<{ reload: () => void }>) {
  const t = useTranslations('Groups')
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="font-bold text-2xl flex-1">
          <Link href="/groups">{t('myGroups')}</Link>
        </h1>
        <div className="flex gap-2">
          <AddGroupByUrlButton reload={reload} />
          <Button asChild>
            <Link href="/groups/create">{t('create')}</Link>
          </Button>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </>
  )
}
