# Dhar — Shared Expense Tracker

<p align="center">
  <img src="public/logo-with-text.png" alt="Dhar" height="60" />
</p>

<p align="center">
  A free, open-source, self-hostable expense-sharing app — a spiritual successor to Splitwise.<br/>
  Create groups, add participants, split bills, and track who owes what.
</p>

<p align="center">
  <a href="https://dhar.vercel.app"><strong>🌐 Live App</strong></a> ·
  <a href="#getting-started"><strong>Run locally</strong></a> ·
  <a href="CHANGELOG.md"><strong>Changelog</strong></a>
</p>

---

## Features

- **Authentication** — Sign up / sign in with email + password or Google OAuth
- **Groups** — Create shared expense groups and invite friends via link
- **Participant claiming** — When a friend opens your group link, they can link their account to their participant entry
- **My Groups** — Dashboard listing all groups you're a participant in
- **Expense splitting** — Evenly, by shares, by percentage, or by exact amounts
- **Balances** — See who owes whom at a glance
- **Reimbursements** — Record payments to settle balances
- **Receipt scanning** — Extract expense details from a photo (requires OpenAI API key)
- **Recurring expenses** — Daily, weekly, or monthly recurrence
- **Export** — Download expenses as CSV or JSON
- **PWA** — Works offline and installable on mobile
- **i18n** — Available in 20+ languages

## Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Auth | [Auth.js v5](https://authjs.dev/) (Credentials + Google OAuth) |
| Database | PostgreSQL via [Prisma](https://prisma.io) |
| API | [tRPC](https://trpc.io) |
| UI | [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/) |
| Hosting | [Vercel](https://vercel.com/) |

## Getting Started

### Prerequisites

- Node.js ≥ 20
- PostgreSQL (or use the Docker helper below)

### 1. Clone and install

```bash
git clone https://github.com/Subhajit-Roy-Partho/spliit.git
cd spliit
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
# Database
POSTGRES_PRISMA_URL=postgresql://postgres:password@localhost/spliit
POSTGRES_URL_NON_POOLING=postgresql://postgres:password@localhost/spliit

# Auth.js — generate with: openssl rand -base64 32
AUTH_SECRET=your-secret-here
AUTH_URL=http://localhost:3000

# Google OAuth (https://console.cloud.google.com/)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 3. Start a local database (optional)

```bash
./scripts/start-local-db.sh
```

### 4. Run migrations and start

```bash
npm run dev
```

`postinstall` automatically runs `prisma migrate deploy && prisma generate`.

Open [http://localhost:3000](http://localhost:3000).

## Google OAuth Setup

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your OAuth 2.0 client:

| Field | Value |
|---|---|
| Authorised JavaScript origins | `http://localhost:3000`, `https://dhar.vercel.app` |
| Authorised redirect URIs | `http://localhost:3000/api/auth/callback/google`, `https://dhar.vercel.app/api/auth/callback/google` |

## Deployment on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSubhajit-Roy-Partho%2Fspliit&stores=%5B%7B%22type%22%3A%22postgres%22%7D%5D)

Required environment variables on Vercel:

| Variable | Description |
|---|---|
| `POSTGRES_PRISMA_URL` | Pooled connection string |
| `POSTGRES_URL_NON_POOLING` | Direct connection string |
| `AUTH_SECRET` | Random 32-byte base64 string (`openssl rand -base64 32`) |
| `AUTH_URL` | Your production URL, e.g. `https://dhar.vercel.app` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run check-types  # TypeScript type check
npm test             # Jest unit tests
npm run prettier     # Format src/

# Prisma
npx prisma studio            # Open DB GUI
npx prisma migrate dev       # Create + apply new migration
npx prisma migrate deploy    # Apply pending migrations (production)
npx prisma generate          # Regenerate client after schema change
```

## Credits

This project is a fork of [Spliit](https://github.com/spliit-app/spliit), originally created by [Sebastien Castiel](https://scastiel.dev) and [contributors](https://github.com/spliit-app/spliit/graphs/contributors). The original project is licensed under MIT. This fork adds user authentication, account linking, and a personalised "My Groups" dashboard.
