import { createAnalyticsProvider } from '@/lib/analytics/context'
import { AnalyticsOptions, AnalyticsTransport } from '@/lib/analytics/types'
import Script from 'next/script'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * The stock gtag.js snippet, with the measurement ID filled in from options.
 * `dataLayer` + the `gtag` stub queue events fired before the library loads,
 * so early pageviews are replayed rather than dropped.
 */
function GoogleInit({ options }: { options: AnalyticsOptions }) {
  return (
    <Script
      id="analytics-google-init"
      dangerouslySetInnerHTML={{
        __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${options.measurementId}', { send_page_view: false });`,
      }}
    />
  )
}

function GoogleScript({ options }: { options: AnalyticsOptions }) {
  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${options.measurementId}`}
      />
      <GoogleInit options={options} />
    </>
  )
}

/**
 * GA4 event names may only contain letters, numbers and underscores, so the
 * internal `domain: action` names are mapped (`group: create` → `group_create`).
 */
function toGoogleEventName(event: string): string {
  return event
    .replace(/:\s*/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
}

/**
 * Options, set through environment variables:
 *
 * - `measurementId` (required): the GA4 measurement ID (`G-…`), from
 *   `GOOGLE_ANALYTICS_ID`.
 *
 * Automatic pageviews are disabled (`send_page_view: false`) on purpose: the
 * stock snippet would report `location.href` on every navigation, which on a
 * group page carries the group ID. Pageviews are sent explicitly by
 * `TrackPage` instead, with the URL already anonymized by the provider
 * framework — the same reason the Plausible provider uses its `manual` script.
 */
const googleTransport: AnalyticsTransport = (event, props, url) => {
  if (event === 'pageview') {
    window.gtag?.('event', 'page_view', { page_location: url })
    return
  }
  window.gtag?.('event', toGoogleEventName(event), {
    ...props,
    page_location: url,
  })
}

export const GoogleAnalyticsProvider = createAnalyticsProvider({
  Script: GoogleScript,
  useTransport: () => googleTransport,
})
