# Changelog

All notable changes to this fork of Spliit (Dhar) are documented here.

## [Unreleased]

### Added
- **Auth.js v5 authentication** with email/password and Google OAuth
  - Sign up / sign in pages at `/auth/signup` and `/auth/signin`
  - Sign out page at `/auth/signout`
  - `User`, `Account`, `Session`, `VerificationToken` tables (Auth.js standard schema)
  - Password hashing with bcrypt
- **GroupMember table** — links an authenticated user account to a `Participant` in a `Group`
- **Participant claiming flow** — when a logged-in user opens a group link for the first time, a modal prompts them to select which group participant they are; the selection is persisted server-side
- **My Groups section** — the `/groups` page now shows a "My Groups" section at the top for authenticated users, listing every group where they have a claimed participant
- **Auth-aware active user** — when an authenticated user has a claimed participant, the active user is set automatically (no manual localStorage selection needed)
- **Registered user search in participant form** — when adding participants to a group, authenticated users see a dropdown of registered accounts that match what they're typing
- **User avatar + menu** in the global header — shows initials or Google profile picture; dropdown includes sign out
- **Sign In button** in the header for unauthenticated users
- New tRPC procedures:
  - `groups.members.claim` — claim a participant in a group
  - `groups.members.getForGroup` — get the current user's membership for a specific group
  - `groups.members.listMyGroups` — list all groups where the user has a membership
  - `users.search` — search registered users by name or email
- `Separator` shadcn/ui component

### Changed
- `active-user-modal.tsx` — skips showing for authenticated users who already have a claimed participant; auto-sets localStorage from the server-side membership
- `group-form.tsx` — participant name input replaced with `ParticipantInput` combobox that suggests registered users while still allowing free-text entry
- `recent-group-list.tsx` — renders "My Groups" section above recent groups for authenticated users
- `app/layout.tsx` — wrapped in `SessionProvider`; header now shows auth state
- `trpc/init.ts` — context now includes session; added `authedProcedure` middleware
- Updated `README.md`, added `CHANGELOG.md`, added `AGENTS.md`

### Database
- New migration `20250525000000_add_auth` — adds `User`, `Account`, `Session`, `VerificationToken`, `GroupMember` tables; no existing data is modified

---

## Prior history

This fork is based on [spliit-app/spliit](https://github.com/spliit-app/spliit). See the [upstream changelog](https://github.com/spliit-app/spliit/releases) for changes prior to this fork.
