import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { QrCode as QrCodeIcon, Smartphone } from "lucide-react"
import { formatInr } from "@/lib/utils"

/**
 * iOS has no OS-level handler for the generic `upi://` scheme the way
 * Android does. Tapping a `upi://` link in Safari, or scanning one with the
 * iPhone Camera app (which itself just hands unrecognized-scheme URLs to
 * Safari), fails silently or falls through to whatever app iOS's "Open in"
 * heuristics land on — observed in practice landing on WhatsApp, not a UPI
 * app. Android has no such gap: its intent system routes `upi://` straight
 * to an installed UPI app, which is why the exact same paymentUrl works
 * fine there. iPadOS reports its platform as "MacIntel" with touch support
 * (no separate "iPad" UA token since iPadOS 13), hence the touch check.
 */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false
  return /Android/.test(navigator.userAgent)
}

/**
 * Unlike the generic `upi://` scheme, GPay/PhonePe/Paytm each register their
 * own custom URL scheme on iOS specifically for UPI deep-linking, so an
 * `<a href>` to one of these (tapped directly, not set via script) does
 * open the installed app with the payment pre-filled. Same query params as
 * the gateway's original `upi://pay?...` link — only the scheme/host differ.
 */
const IOS_UPI_APPS = [
  { name: "GPay", scheme: "gpay://upi/pay" },
  { name: "PhonePe", scheme: "phonepe://upi/pay" },
  { name: "Paytm", scheme: "paytmmp://upi/pay" },
] as const

export function buildIOSAppLinks(paymentUrl: string): { name: string; url: string }[] {
  const query = paymentUrl.split("?")[1] ?? ""
  return IOS_UPI_APPS.map(({ name, scheme }) => ({ name, url: query ? `${scheme}?${query}` : scheme }))
}

const IOS_APP_ATTEMPT_TIMEOUT_MS = 1200

/**
 * There's no iOS equivalent of Android's UPI Intent chooser (isIOS's doc
 * comment) — no single link means "ask the OS which installed app should
 * handle this." The closest approximation: try each app's scheme in turn,
 * and use the fact that switching to an installed app backgrounds Safari
 * (fires `visibilitychange`) to detect success — if the page is still
 * visible after a short timeout, that scheme wasn't claimed by anything, so
 * move on to the next one. Same technique most iOS deep-linking SDKs use,
 * since there's no direct "is this app installed" API.
 */
export function tryOpenIOSAppsInSequence(links: { name: string; url: string }[]): () => void {
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | undefined

  function onVisibilityChange() {
    if (document.hidden) cleanup()
  }
  function cleanup() {
    document.removeEventListener("visibilitychange", onVisibilityChange)
    if (timer) clearTimeout(timer)
  }

  function attempt(index: number) {
    if (cancelled || index >= links.length) return
    document.addEventListener("visibilitychange", onVisibilityChange)
    window.location.href = links[index].url
    timer = setTimeout(() => {
      cleanup()
      if (!cancelled && !document.hidden) attempt(index + 1)
    }, IOS_APP_ATTEMPT_TIMEOUT_MS)
  }

  attempt(0)
  return () => {
    cancelled = true
    cleanup()
  }
}

/**
 * Fallback for when the PayIn gateway returns a raw `upi://` app-intent
 * link instead of a hosted checkout page (see isWebPaymentUrl in
 * dashboard.account.deposit.tsx) — there's no page for the browser to
 * navigate to. A QR code only makes sense on desktop, where there's no UPI
 * app to hand the link to in the first place — on a phone we go straight
 * for opening the app, since that's the whole point of being on the device
 * that has it installed.
 */
export function UpiPaymentPanel({ paymentUrl, amount, onCancel }: { paymentUrl: string; amount: number; onCancel: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  // No SSR here (a pure client-rendered Vite app) — navigator is always
  // available at render time, no effect/state indirection needed.
  const onIOS = isIOS()
  const onAndroid = isAndroid()
  const isMobile = onIOS || onAndroid
  const iosAppLinks = onIOS ? buildIOSAppLinks(paymentUrl) : []

  useEffect(() => {
    // QR is desktop-only UI (see doc comment above) — skip generating it on
    // mobile, nothing renders it there.
    if (isMobile) return
    let cancelled = false
    QRCode.toDataURL(paymentUrl, { margin: 1, width: 240 }).then((url) => {
      if (!cancelled) setQrDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [paymentUrl, isMobile])

  return (
    <section className="flex flex-col items-center gap-4 rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-6 text-center">
      <h2 className="text-lg font-semibold text-[color:var(--acc-text-primary)]">Pay {formatInr(amount)}</h2>
      <p className="text-sm text-[color:var(--acc-text-secondary)]">
        {onIOS
          ? "Opening your UPI app… if nothing happens, tap it below."
          : onAndroid
            ? "Choose your UPI app to pay. Didn't see the app list? Tap below."
            : "Open any UPI app on your phone and scan this code."}
      </p>

      {!isMobile && (
        <div className="flex size-56 items-center justify-center rounded-[var(--acc-radius-md)] border border-[color:var(--acc-border)] bg-white p-3">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="UPI payment QR code" className="size-full" />
          ) : (
            <QrCodeIcon className="size-10 animate-pulse text-[color:var(--acc-text-secondary)]" aria-hidden="true" />
          )}
        </div>
      )}

      {onIOS ? (
        // No tappable link to the gateway's raw `upi://` URL — iOS has been
        // observed taking that exact tap to WhatsApp instead of a UPI app
        // (see isIOS's doc comment). GPay/PhonePe/Paytm each register their
        // own scheme though (buildIOSAppLinks), so those work as real links.
        <div className="flex w-full flex-col gap-2.5">
          <div className="grid grid-cols-3 gap-2">
            {iosAppLinks.map(({ name, url }) => (
              <a
                key={name}
                href={url}
                className="flex h-11 items-center justify-center rounded-[var(--acc-radius-md)] px-2 text-sm font-bold outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
                style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
              >
                {name}
              </a>
            ))}
          </div>
          <div
            className="flex items-start gap-2.5 rounded-[var(--acc-radius-md)] border px-4 py-3 text-left text-sm"
            style={{ borderColor: "var(--acc-border)", background: "var(--acc-input-bg)", color: "var(--acc-text-secondary)" }}
          >
            <Smartphone className="mt-0.5 size-5 shrink-0" style={{ color: "var(--acc-accent)" }} aria-hidden="true" />
            <span>
              <strong className="text-[color:var(--acc-text-primary)]">Using a different UPI app?</strong> Open it, tap its "Scan QR" option, then switch
              to a desktop or another device to scan the code — don't use the Camera app, since iOS can't open UPI links directly and may open an
              unrelated app.
            </span>
          </div>
        </div>
      ) : (
        onAndroid && (
          <a
            href={paymentUrl}
            className="flex h-12 w-full items-center justify-center rounded-[var(--acc-radius-md)] px-8 text-base font-bold outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)] sm:w-auto"
            style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
          >
            Open UPI App
          </a>
        )
      )}

      <p className="text-xs text-[color:var(--acc-text-secondary)]">Your balance updates automatically once the payment is confirmed — usually within a minute.</p>

      <button
        type="button"
        onClick={onCancel}
        className="text-sm font-medium text-[color:var(--acc-text-secondary)] underline outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
      >
        Use a different amount
      </button>
    </section>
  )
}
