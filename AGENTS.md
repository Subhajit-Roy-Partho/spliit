# AGENTS.md — Developer & AI Agent Reference

This document is the authoritative guide for both human contributors and AI agents working in the **Dhar** (fork of Spliit) codebase. It covers architecture, data flow, auth system, database schema, tRPC conventions, and everything needed to resume work in a new session.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Directory Structure](#3-directory-structure)
4. [Authentication System](#4-authentication-system)
5. [Database Schema](#5-database-schema)
6. [tRPC API Layer](#6-trpc-api-layer)
7. [Key UI Components](#7-key-ui-components)
8. [Feature: Participant Claiming](#8-feature-participant-claiming)
9. [Feature: My Groups Dashboard](#9-feature-my-groups-dashboard)
10. [Environment Variables](#10-environment-variables)
11. [Build & Run Commands](#11-build--run-commands)
12. [Vercel Deployment](#12-vercel-deployment)
13. [Coding Conventions](#13-coding-conventions)
14. [Known Issues & TODOs](#14-known-issues--todos)

---

## 1. Project Overview

Dhar is a fork of [Spliit](https://github.com/spliit-app/spliit), an open-source Splitwise alternative. The primary additions in this fork are:

- **User authentication** (Auth.js v5, email + Google OAuth)
- **Account-to-participant linking** (a logged-in user can claim a participant slot in any group)
- **Persistent "My Groups" dashboard** showing groups where the user is a member
- **Registered user search** when adding participants to a group

The app remains backward-compatible: groups and expenses work without any account; auth is purely additive.

---

## 2. Tech Stack

| Concern | Tool | Version |
|---|---|---|
| Framework | Next.js (App Router) | ^16 |
| Auth | next-auth (Auth.js v5) | 5.0.0-beta.31 |
| ORM | Prisma | ^6 |
| Database | PostgreSQL | - |
| API | tRPC | ^11 |
| State / Data | TanStack Query (via tRPC React) | ^5 |
| UI | shadcn/ui + Tailwind CSS | - |
| i18n | next-intl | ^4 |
| Form | react-hook-form + Zod | - |
| Hosting | Vercel | - |

---

## 3. Directory Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts   # Auth.js API handler
│   │   │   └── register/route.ts        # POST /api/auth/register (signup)
│   │   └── trpc/[trpc]/route.ts         # tRPC HTTP endpoint
│   ├── auth/
│   │   ├── signin/page.tsx              # /auth/signin
│   │   ├── signup/page.tsx              # /auth/signup
│   │   └── signout/page.tsx             # /auth/signout
│   ├── groups/
│   │   ├── [groupId]/
│   │   │   ├── claim-participant-modal.tsx  # NEW: link account to participant
│   │   │   ├── expenses/
│   │   │   │   ├── active-user-modal.tsx    # Updated: skips for auth users
│   │   │   │   └── page.client.tsx          # Updated: includes claim modal
│   │   │   └── edit/edit-group.tsx
│   │   ├── recent-group-list.tsx        # Updated: My Groups section + link banner
│   ├── link-recent-groups-banner.tsx # NEW: prompt to link recent groups
│   │   └── create/
│   ├── layout.tsx                       # Updated: SessionProvider + auth header
│   └── page.tsx
├── auth.ts                              # Auth.js v5 config (NEW)
├── middleware.ts                        # Auth middleware (minimal, non-blocking)
├── components/
│   ├── group-form.tsx                   # Updated: ParticipantInput
│   ├── participant-input.tsx            # NEW: user-search combobox
│   └── ui/
│       └── separator.tsx               # NEW: shadcn Separator
├── lib/
│   ├── api.ts                           # Prisma wrappers for groups/expenses
│   ├── env.ts                           # Zod-validated environment
│   └── prisma.ts                        # Prisma singleton
├── trpc/
│   ├── init.ts                          # Updated: session in context, authedProcedure
│   └── routers/
│       ├── _app.ts                      # Updated: users router added
│       ├── groups/
│       │   ├── index.ts                 # Updated: members sub-router
│       │   └── members/
│       │       ├── index.ts
│       │       ├── claim.procedure.ts
│       │       ├── getForGroup.procedure.ts
│       │       └── listMyGroups.procedure.ts
│       └── users/
│           ├── index.ts
│           └── search.procedure.ts
├── types/
│   └── next-auth.d.ts                   # Session type augmentation
prisma/
├── schema.prisma                        # Updated: User, Account, Session, etc.
└── migrations/
    └── 20250525000000_add_auth/
        └── migration.sql
```

---

## 4. Authentication System

### Configuration: `src/auth.ts`

- Uses `@auth/prisma-adapter` with **JWT sessions** (`strategy: 'jwt'`)
  - ⚠️ **IMPORTANT**: `strategy: 'database'` is broken in `next-auth@5.0.0-beta.31` with credentials — sessions never get written to the DB, so `/api/auth/session` always returns null. JWT strategy is the fix.
- Two providers: **Google OAuth** and **Credentials** (email + password)
- JWT callbacks propagate `user.id` into the token and then into `session.user.id`
- Sign-in page: `/auth/signin`; error page: same

### Session in tRPC

`src/trpc/init.ts` calls `auth()` inside `createTRPCContext`. This gives every tRPC procedure access to `ctx.session`.

```typescript
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user?.id) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { session: ctx.session } })
})
```

Use `authedProcedure` for any mutation or query that requires a logged-in user.

### Session in Server Components

```typescript
import { auth } from '@/auth'
const session = await auth()
// session.user.id, session.user.email, session.user.name
```

### Session in Client Components

```typescript
import { useSession } from 'next-auth/react'
const { data: session, status } = useSession()
// status: 'loading' | 'authenticated' | 'unauthenticated'
```

### Registration

`POST /api/auth/register` accepts `{ name, email, password }`, hashes the password with bcrypt (12 rounds), and creates a `User` row. The signup page calls this endpoint then immediately signs in with credentials.

### Google OAuth Flow

1. User clicks "Continue with Google" → redirected to Google
2. Google redirects to `/api/auth/callback/google`
3. Auth.js / Prisma adapter creates or finds `User`, creates `Account` row
4. Session is stored in `Session` table

---

## 5. Database Schema

### Auth.js models (do not modify manually)

- `User` — `id`, `name`, `email`, `emailVerified`, `image`, `password` (null for OAuth users)
- `Account` — links `User` to OAuth provider
- `Session` — database sessions (created/destroyed by Auth.js)
- `VerificationToken` — used for email verification flows

### `GroupMember` (new)

```prisma
model GroupMember {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation(...)
  participantId String      @unique   // one participant = one account
  participant   Participant @relation(...)
  groupId       String
  group         Group       @relation(...)

  @@unique([userId, groupId])  // one account = one participant per group
}
```

**Key constraints:**
- `participantId @unique` — a participant can only be claimed by one account
- `@@unique([userId, groupId])` — a user can only claim one participant per group
- Deleting a `Participant` or `User` cascades to delete `GroupMember`

### Existing models (unchanged)

- `Group`, `Participant`, `Expense`, `ExpensePaidFor`, `ExpenseDocument`, `Category`, `Activity`, `RecurringExpenseLink`

---

## 6. tRPC API Layer

### Router tree

```
appRouter
├── groups
│   ├── expenses.*
│   ├── balances.*
│   ├── stats.*
│   ├── activities.*
│   ├── members
│   │   ├── claim          (authed) — link user to participant in a group
│   │   ├── getForGroup    (authed) — get user's membership for a group
│   │   └── listMyGroups   (authed) — all groups where user has a membership
│   ├── get
│   ├── getDetails
│   ├── list
│   ├── create
│   └── update
├── categories.*
└── users
    └── search             (public) — search users by name/email
```

### Authenticated procedures

Any procedure using `authedProcedure` will return HTTP 401 if called without a valid session. On the client, tRPC will throw a `TRPCClientError` with `code: 'UNAUTHORIZED'`.

### `users.search`

Public query. Input: `{ query: string }`. Returns up to 10 users matching the query (name or email). Used by `ParticipantInput` to suggest registered users.

---

## 7. Key UI Components

### `ParticipantInput` (`src/components/participant-input.tsx`)

Drop-in replacement for `<Input>` in participant name fields. When the user is authenticated, it debounces the input and queries `users.search` to show a popover with matching registered users. Selecting a user fills in their name. If the user is unauthenticated, renders a plain `<Input>`.

Used in: `group-form.tsx` (participant list in create/edit group form)

### `ClaimParticipantModal` (`src/app/groups/[groupId]/claim-participant-modal.tsx`)

Shows automatically when:
1. User is **authenticated**
2. User has **no existing `GroupMember`** for this group
3. Group data has loaded

Presents a radio list of participants. On submit, calls `groups.members.claim`. On success, invalidates `getForGroup` and `listMyGroups` queries.

### `ActiveUserModal` (`src/app/groups/[groupId]/expenses/active-user-modal.tsx`)

The original "who are you?" modal for **unauthenticated** users. Updated to:
- Skip entirely for authenticated users (they use `ClaimParticipantModal`)
- Auto-set the localStorage `activeUser` key from the user's `GroupMember` if one exists

---

## 8. Feature: Participant Claiming

### Why it exists

Before auth, each device stored an "active user" in localStorage — fragile and device-specific. With auth, we persist this link server-side as a `GroupMember` record.

### The flow

```
User A creates group with participants: ["Alice", "Bob", "Charlie"]
User B (Soumya) opens the group link while logged in
→ ClaimParticipantModal opens
→ Soumya selects "Bob"
→ GroupMember { userId: Soumya's id, participantId: Bob's id, groupId } created
→ Now Soumya sees Bob's balance as "your balance" everywhere
→ Soumya's group appears in "My Groups"
```

### Conflict handling

- If another user already claimed a participant, the mutation throws `'This participant is already claimed by another account'`
- A user can re-claim a different participant in the same group (the existing `GroupMember` is updated via `upsert`)

---

## 9. Feature: My Groups Dashboard

Shown on `/groups` when the user is authenticated. Queries `groups.members.listMyGroups` which fetches all `GroupMember` records for the current user, joined with `Group` and `Participant`. Each card shows the group name, participant count, and which participant the user is.

### Feature: Link Recent Groups Banner

`LinkRecentGroupsBanner` (`src/app/groups/link-recent-groups-banner.tsx`) shows when:
1. User is authenticated
2. There are recent groups in localStorage not yet linked to the user's account

It computes unclaimed group IDs (`recentGroupIds - myGroupIds`), fetches their names, and shows a dismissible card. Clicking a group button opens a `ControlledClaimDialog` — the same claim form logic as `ClaimParticipantModal` but with explicit open/close control.

### Feature: Auto-claim on group creation

When a signed-in user creates a group and selects an active participant in the "Settings" section of the group form, a `GroupMember` record is created automatically so the group appears in "My Groups" immediately.

- `groups.create` procedure accepts optional `activeParticipantName`
- `GroupForm.onSubmit` passes `activeParticipantName` (non-null only for new groups, not edits)
- `create-group.tsx` forwards this to `mutateAsync`

---

## 10. Environment Variables

| Variable | Required | Where used |
|---|---|---|
| `POSTGRES_PRISMA_URL` | Yes | Prisma (pooled) |
| `POSTGRES_URL_NON_POOLING` | Yes | Prisma (direct for migrations) |
| `AUTH_SECRET` | Yes | Auth.js (signs sessions) |
| `AUTH_URL` | Yes (prod) | Auth.js redirect base URL |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth |
| `NEXT_PUBLIC_BASE_URL` | No | OG meta tags; auto-detected from `VERCEL_URL` |
| `NEXT_PUBLIC_DEFAULT_CURRENCY_CODE` | No | Default currency in group form |
| `S3_UPLOAD_KEY/SECRET/BUCKET/REGION` | If docs enabled | Expense document uploads |
| `OPENAI_API_KEY` | If receipt extract enabled | Receipt / category extraction |

---

## 11. Build & Run Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Lint
npm run lint

# Type check
npm run check-types

# Tests
npm test

# Database
npx prisma migrate dev         # new migration in dev
npx prisma migrate deploy      # apply migrations in prod/CI
npx prisma generate            # regenerate client
npx prisma studio              # GUI

# Auth secret
openssl rand -base64 32        # generate AUTH_SECRET
```

---

## 12. Vercel Deployment

Project: `split-subho` in scope `subhajit-roys-projects`  
Production URL: `https://dhar.vercel.app`

To set/update environment variables:

```bash
vercel link --scope subhajit-roys-projects --project split-subho --yes
echo "value" | vercel env add VAR_NAME production --force
```

The `postinstall` script (`prisma migrate deploy && prisma generate`) runs automatically on every Vercel build and applies any pending migrations.

---

## 13. Coding Conventions

- **TypeScript strict mode** throughout
- **Server components** for data fetching; **client components** marked `'use client'`
- **tRPC procedures** in `src/trpc/routers/` — one file per procedure, grouped by domain
- **`baseProcedure`** for public procedures; **`authedProcedure`** for authenticated ones
- **Prisma** accessed only through `src/lib/api.ts` (server-only) or directly in tRPC procedures
- **Form validation** with Zod schemas in `src/lib/schemas.ts`
- **i18n** — all user-facing strings go through `useTranslations` / `getTranslations`; add new keys to `messages/en-US.json` and other locale files as needed
- Auth.js session in **server components**: `const session = await auth()`
- Auth.js session in **client components**: `const { data: session } = useSession()`

---

## 14. Known Issues & TODOs

- [ ] `messages/en-US.json` — no new translation keys added yet for auth UI strings (currently hardcoded in English in the auth pages)
- [ ] Password reset flow not implemented (requires email provider)
- [ ] `middleware.ts` exists but is minimal — no forced redirects for protected routes (auth is optional / additive)
- [ ] `AUTH_URL` should ideally be auto-detected from `VERCEL_URL` in production (currently set manually as env var)
- [ ] Re-claim UI in group settings (currently only accessible via the first-visit modal or the "Link Recent Groups" banner)
- [ ] The `users.search` endpoint returns emails — consider hiding email if privacy is a concern
- [ ] Google OAuth credentials in Vercel were added with real values — **rotate the client secret** (`GOOGLE_CLIENT_SECRET`) as it was shared in chat

## 15. Bug Fixes Applied

### JWT Strategy (critical)

`src/auth.ts` was changed from `strategy: 'database'` to `strategy: 'jwt'`. The database strategy in next-auth@5.0.0-beta.31 has a known bug where the Credentials provider never writes sessions to the DB, causing `/api/auth/session` to always return null and the header to never update. JWT strategy stores sessions in encrypted cookies and works correctly.

### Header Not Updating After Sign-in

`src/components/header-auth.tsx` was created as a `'use client'` component using `useSession()`. Previously the header used `await auth()` in a server component which only runs at request time and does not reactively update on client-side auth state changes. `SessionProvider` wraps the entire app in `layout.tsx`.

### Groups Not Appearing in My Groups

Root cause: `groups.create` never created a `GroupMember`. Fixed by:
1. Adding `activeParticipantName?: string` to `groups.create` input
2. Having `GroupForm` pass the selected active participant name on submission
3. Having `create-group.tsx` forward the value to the mutation
