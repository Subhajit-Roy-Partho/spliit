'use client'
import { AddGroupByUrlButton } from '@/app/groups/add-group-by-url-button'
import {
  RecentGroups,
  getArchivedGroups,
  getRecentGroups,
  getStarredGroups,
} from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getGroups } from '@/lib/api'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { Loader2, Users } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { PropsWithChildren, useEffect, useState } from 'react'
import { RecentGroupListCard } from './recent-group-list-card'

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

function MyGroupsList() {
  const { data, isLoading } = trpc.groups.members.listMyGroups.useQuery()

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 inline animate-spin mr-1" />
        Loading your groups…
      </p>
    )
  }

  if (!data?.groups.length) {
    return (
      <p className="text-sm text-muted-foreground">
        You haven&apos;t claimed a participant in any group yet. Open a group
        link and claim your participant to see it here.
      </p>
    )
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {data.groups.map((group) => (
        <li key={group.id}>
          <Card className="hover:bg-accent transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <Link
                  href={`/groups/${group.id}/expenses`}
                  className="font-medium hover:underline"
                >
                  {group.name}
                </Link>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Users className="w-3 h-3" />
                  {group.participants.length} participant
                  {group.participants.length !== 1 ? 's' : ''} · you are{' '}
                  <span className="font-medium">{group.myParticipant.name}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
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

  const { starredGroupInfo, groupInfo, archivedGroupInfo } = sortGroups({
    groups,
    starredGroups,
    archivedGroups,
  })

  return (
    <GroupsPage reload={refreshGroupsFromStorage}>
      {isAuthenticated && (
        <section className="mb-8">
          <h2 className="font-semibold text-lg mb-3">My Groups</h2>
          <MyGroupsList />
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
