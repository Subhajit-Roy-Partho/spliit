import { auth } from '@/auth'
import { ApplePwaSplash } from '@/app/apple-pwa-splash'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { ProgressBar } from '@/components/progress-bar'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Toaster } from '@/components/ui/toaster'
import { env } from '@/lib/env'
import { TRPCProvider } from '@/trpc/client'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider, useTranslations } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { SessionProvider } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import './globals.css'
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_BASE_URL),
  title: {
    default: 'Spliit · Share Expenses with Friends & Family',
    template: '%s · Spliit',
  },
  description:
    'Spliit is a minimalist web application to share expenses with friends and family. No ads, no account, no problem.',
  openGraph: {
    title: 'Spliit · Share Expenses with Friends & Family',
    description:
      'Spliit is a minimalist web application to share expenses with friends and family. No ads, no account, no problem.',
    images: `/banner.png`,
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@scastiel',
    site: '@scastiel',
    images: `/banner.png`,
    title: 'Spliit · Share Expenses with Friends & Family',
    description:
      'Spliit is a minimalist web application to share expenses with friends and family. No ads, no account, no problem.',
  },
  appleWebApp: {
    capable: true,
    title: 'Spliit',
  },
  applicationName: 'Spliit',
  icons: [
    {
      url: '/android-chrome-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      url: '/android-chrome-512x512.png',
      sizes: '512x512',
      type: 'image/png',
    },
  ],
}

export const viewport: Viewport = {
  themeColor: '#047857',
}

function UserMenu({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null }
}) {
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? '?'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -my-3 text-primary"
        >
          <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? ''}
                width={28}
                height={28}
                className="rounded-full"
              />
            ) : (
              initials
            )}
          </span>
          <span className="hidden sm:inline max-w-[120px] truncate text-sm">
            {user.name ?? user.email}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate">{user.name ?? 'User'}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/groups">My Groups</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/auth/signout">Sign out</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

async function Content({ children }: { children: React.ReactNode }) {
  const t = useTranslations()
  const session = await auth()

  return (
    <TRPCProvider>
      <header className="fixed top-0 left-0 right-0 h-16 flex justify-between bg-white dark:bg-gray-950 bg-opacity-50 dark:bg-opacity-50 p-2 border-b backdrop-blur-sm z-50">
        <SpeedInsights />
        <Link
          className="flex items-center gap-2 hover:scale-105 transition-transform"
          href="/"
        >
          <h1>
            <Image
              src="/logo-with-text.png"
              className="m-1 h-auto w-auto"
              width={(35 * 522) / 180}
              height={35}
              alt="Spliit"
            />
          </h1>
        </Link>
        <div role="navigation" aria-label="Menu" className="flex">
          <ul className="flex items-center text-sm">
            <li>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="-my-3 text-primary"
              >
                <Link href="/groups">{t('Header.groups')}</Link>
              </Button>
            </li>
            <li>
              <LocaleSwitcher />
            </li>
            <li>
              <ThemeToggle />
            </li>
            <li className="ml-1">
              {session?.user ? (
                <UserMenu user={session.user} />
              ) : (
                <Button variant="ghost" size="sm" asChild className="-my-3 text-primary">
                  <Link href="/auth/signin">Sign in</Link>
                </Button>
              )}
            </li>
          </ul>
        </div>
      </header>

      <div className="pt-16 flex-1 flex flex-col">{children}</div>

      <footer className="sm:p-8 md:p-16 sm:mt-16 sm:text-sm md:text-base md:mt-32 bg-slate-50 dark:bg-card border-t p-6 mt-8 flex flex-col sm:flex-row sm:justify-between gap-4 text-xs [&_a]:underline">
        <div className="flex flex-col space-y-2">
          <div className="sm:text-lg font-semibold text-base flex space-x-2 items-center">
            <Link className="flex items-center gap-2" href="/">
              <Image
                src="/logo-with-text.png"
                className="m-1 h-auto w-auto"
                width={(35 * 522) / 180}
                height={35}
                alt="Spliit"
              />
            </Link>
          </div>
          <div className="flex flex-col space-y a--no-underline-text-white">
            <span>{t('Footer.madeIn')}</span>
            <span>
              {t.rich('Footer.builtBy', {
                author: (txt) => (
                  <a href="https://scastiel.dev" target="_blank" rel="noopener">
                    {txt}
                  </a>
                ),
                source: (txt) => (
                  <a
                    href="https://github.com/spliit-app/spliit/graphs/contributors"
                    target="_blank"
                    rel="noopener"
                  >
                    {txt}
                  </a>
                ),
              })}
            </span>
          </div>
        </div>
      </footer>
      <Toaster />
    </TRPCProvider>
  )
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()
  return (
    <html lang={locale} suppressHydrationWarning>
      <ApplePwaSplash icon="/logo-with-text.png" color="#027756" />
      <body className="min-h-[100dvh] flex flex-col items-stretch bg-slate-50 bg-opacity-30 dark:bg-background">
        <SessionProvider>
          <NextIntlClientProvider messages={messages}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <Suspense>
                <ProgressBar />
              </Suspense>
              <Content>{children}</Content>
            </ThemeProvider>
          </NextIntlClientProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
