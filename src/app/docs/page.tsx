'use client'

import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [showIosInstructions, setShowIosInstructions] = useState(false)

  useEffect(() => {
    const isIosDevice =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window.navigator as unknown as { standalone?: boolean }).standalone

    setIsIos(isIosDevice)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
  }

  if (installed) {
    return (
      <p className="text-green-600 dark:text-green-400 font-medium">
        App is already installed on your device.
      </p>
    )
  }

  if (isIos) {
    return (
      <div className="space-y-2">
        <Button
          variant="outline"
          onClick={() => setShowIosInstructions((v) => !v)}
        >
          Install on iPhone / iPad
        </Button>
        {showIosInstructions && (
          <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
            <li>
              Tap the <strong>Share</strong> button in Safari (square with arrow
              up icon)
            </li>
            <li>
              Scroll down and tap{' '}
              <strong>&quot;Add to Home Screen&quot;</strong>
            </li>
            <li>
              Tap <strong>Add</strong> in the top right
            </li>
          </ol>
        )}
      </div>
    )
  }

  if (deferredPrompt) {
    return <Button onClick={handleInstall}>Install App on this Device</Button>
  }

  return (
    <p className="text-sm text-muted-foreground">
      Open this page in Chrome or Edge on Android, or Safari on iOS to install
      the app.
    </p>
  )
}

export default function DocsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-12">
      <section>
        <h1 className="text-3xl font-bold mb-2">Dhar — Documentation</h1>
        <p className="text-muted-foreground">
          Dhar is a free, open-source expense splitting app — a fork of{' '}
          <a
            href="https://github.com/spliit-app/spliit"
            className="underline"
            target="_blank"
            rel="noopener"
          >
            Spliit
          </a>{' '}
          by{' '}
          <a
            href="https://scastiel.dev"
            className="underline"
            target="_blank"
            rel="noopener"
          >
            Sebastien Castiel
          </a>
          , extended and maintained by{' '}
          <a
            href="https://subhajitroy.dev"
            className="underline"
            target="_blank"
            rel="noopener"
          >
            Subhajit Roy
          </a>
          .
        </p>
      </section>

      <section id="install">
        <h2 className="text-2xl font-semibold mb-3">Install as App (PWA)</h2>
        <p className="text-muted-foreground mb-4">
          Dhar works as a Progressive Web App (PWA). You can install it on
          Android, iPhone, iPad, or desktop so it opens like a native app — no
          app store needed.
        </p>
        <PwaInstallButton />
        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <div>
            <strong className="text-foreground">Android (Chrome)</strong>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Open this site in Chrome</li>
              <li>
                Tap the three-dot menu and select{' '}
                <strong>&quot;Add to Home screen&quot;</strong>
              </li>
              <li>Confirm by tapping Add</li>
            </ol>
          </div>
          <div>
            <strong className="text-foreground">Desktop (Chrome / Edge)</strong>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Click the install icon in the address bar (right side)</li>
              <li>
                Or open the menu and choose{' '}
                <strong>&quot;Install Dhar&quot;</strong>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section id="features">
        <h2 className="text-2xl font-semibold mb-4">Features</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-1">Groups</h3>
            <p className="text-muted-foreground text-sm">
              Create a group for any shared expense scenario — a trip, a
              household, a dinner. Each group has its own participants,
              expenses, and balances. No account is required to create or join a
              group.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-1">
              My Groups (with account)
            </h3>
            <p className="text-muted-foreground text-sm">
              Sign in with Google or email/password to save groups to your
              account. Groups appear in &quot;My Groups&quot; so you never lose
              access. You can archive groups to keep things tidy, or remove them
              from your list.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-1">Expenses</h3>
            <p className="text-muted-foreground text-sm">
              Add expenses with a title, amount, date, payer, and participants.
              Choose how to split: equally, by shares, by percentage, or by
              exact amount. You can also reimburse specific amounts between
              participants.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-1">Itemized Bill</h3>
            <p className="text-muted-foreground text-sm">
              Break an expense down into individual line items (e.g. each dish
              at a restaurant). For each item, exclude participants who
              didn&apos;t share it. The total and each participant&apos;s share
              are computed automatically.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-1">Receipt Scanning (AI)</h3>
            <p className="text-muted-foreground text-sm">
              Take or upload a photo of a receipt and let AI fill in the expense
              details for you — title, date, category, total, and itemized line
              items. Requires a signed-in account. Two modes:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>
                <strong>Fast</strong> — quick extraction, good for clear
                receipts
              </li>
              <li>
                <strong>Accurate</strong> — slower but better at complex or
                handwritten receipts
              </li>
            </ul>
            <p className="text-muted-foreground text-sm mt-2">
              After selecting an image the crop tool opens automatically. Smart
              crop pre-selects the receipt boundary — adjust if needed, then
              click <strong>Crop &amp; Scan</strong>. Check{' '}
              <strong>Reduce image size</strong> for faster processing on slow
              connections.
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Supported receipt quirks: Costco{' '}
              <code className="text-xs bg-muted px-1 rounded">-A</code> savings
              lines, negative discount lines, tax, tip, service charge (added as
              separate items split equally), multi-quantity lines.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-1">Balances & Settlements</h3>
            <p className="text-muted-foreground text-sm">
              View who owes whom across all expenses. The app computes the
              minimum set of transfers to settle all debts. Export expenses to
              CSV or JSON.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-1">Participant Claiming</h3>
            <p className="text-muted-foreground text-sm">
              If you created a group without an account, sign in and link your
              account to a participant in each group. This personalizes the
              &quot;your balance&quot; view and associates expenses you pay to
              your account.
            </p>
          </div>
        </div>
      </section>

      <section id="how-to">
        <h2 className="text-2xl font-semibold mb-4">How-To Guides</h2>
        <div className="space-y-6 text-sm">
          <div>
            <h3 className="text-lg font-medium mb-2">
              Create your first group
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>
                Go to <strong>Groups</strong> in the top nav
              </li>
              <li>
                Click <strong>Create group</strong>
              </li>
              <li>Enter a group name and add participants</li>
              <li>Save — your group is ready</li>
            </ol>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">
              Add an itemized expense
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Open a group and click Create expense</li>
              <li>
                Enable the <strong>Itemized Bill</strong> toggle
              </li>
              <li>Add each item with its name and price</li>
              <li>
                For each item, click the participant chips to exclude anyone who
                didn&apos;t share it
              </li>
              <li>The total and shares update automatically</li>
            </ol>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Scan a receipt with AI</h3>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Sign in to your account</li>
              <li>
                Open a group and click the receipt icon next to Create expense
              </li>
              <li>Choose Fast or Accurate mode</li>
              <li>Upload a photo of your receipt</li>
              <li>Review the extracted details and click Continue</li>
              <li>The expense form is pre-filled — adjust anything and save</li>
            </ol>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Settle up</h3>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Open a group and go to Balances</li>
              <li>See the suggested transfers to settle all debts</li>
              <li>
                Record a reimbursement as a new expense (type: Reimbursement)
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section id="changelog">
        <h2 className="text-2xl font-semibold mb-4">Changelog</h2>
        <div className="space-y-6 text-sm">
          <div>
            <h3 className="font-semibold text-base">May 2026 — Dhar v1.0</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
              <li>
                <strong>Authentication</strong>: Sign in with Google or
                email/password via Auth.js v5
              </li>
              <li>
                <strong>My Groups dashboard</strong>: Save, archive, and remove
                groups from your account
              </li>
              <li>
                <strong>Participant claiming</strong>: Link your account to a
                participant in any group
              </li>
              <li>
                <strong>Itemized bill</strong>: Add individual line items with
                per-participant exclusions
              </li>
              <li>
                <strong>AI receipt scanning</strong>: Upload a receipt photo and
                auto-fill expense details with itemized line items (NanoGPT
                proxy, two model tiers)
              </li>
              <li>
                <strong>PWA</strong>: Install as a home screen app on any device
              </li>
              <li>
                <strong>Security</strong>: Receipt scanning API requires
                authentication
              </li>
              <li>
                Forked from{' '}
                <a
                  href="https://github.com/spliit-app/spliit"
                  className="underline"
                  target="_blank"
                  rel="noopener"
                >
                  Spliit
                </a>{' '}
                — all original features preserved
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="about">
        <h2 className="text-2xl font-semibold mb-3">About</h2>
        <p className="text-muted-foreground text-sm">
          Dhar is a fork of{' '}
          <a
            href="https://github.com/spliit-app/spliit"
            className="underline"
            target="_blank"
            rel="noopener"
          >
            Spliit
          </a>
          , an open-source Splitwise alternative created by{' '}
          <a
            href="https://scastiel.dev"
            className="underline"
            target="_blank"
            rel="noopener"
          >
            Sebastien Castiel
          </a>{' '}
          and contributors. Dhar adds authentication, itemized billing, AI
          receipt scanning, and more — built and maintained by{' '}
          <a
            href="https://subhajitroy.dev"
            className="underline"
            target="_blank"
            rel="noopener"
          >
            Subhajit Roy
          </a>
          . Source code is available on{' '}
          <a
            href="https://github.com"
            className="underline"
            target="_blank"
            rel="noopener"
          >
            GitHub
          </a>
          .
        </p>
      </section>
    </main>
  )
}
