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
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

/**
 * Fallback for when the PayIn gateway returns a raw `upi://` app-intent
 * link instead of a hosted checkout page (see isWebPaymentUrl in
 * dashboard.account.deposit.tsx) — there's no page for the browser to
 * navigate to, so this renders the same URI as a scannable QR code
 * (desktop) plus, on platforms where it actually works (see isIOS above),
 * a real `<a href>` (a direct user-gesture click on an anchor is what
 * actually triggers custom-scheme app links reliably, unlike a
 * script-driven `location.href` set after an async gap).
 */
export function UpiPaymentPanel({ paymentUrl, amount, onCancel }: { paymentUrl: string; amount: number; onCancel: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  // No SSR here (a pure client-rendered Vite app) — navigator is always
  // available at render time, no effect/state indirection needed.
  const onIOS = isIOS()

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(paymentUrl, { margin: 1, width: 240 }).then((url) => {
      if (!cancelled) setQrDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [paymentUrl])

  return (
    <section className="flex flex-col items-center gap-4 rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-6 text-center">
      <h2 className="text-lg font-semibold text-[color:var(--acc-text-primary)]">Scan to Pay {formatInr(amount)}</h2>
      <p className="text-sm text-[color:var(--acc-text-secondary)]">
        {onIOS ? "Open your UPI app and use its own QR scanner to scan this code." : "Open any UPI app and scan this code — or, on your phone, tap the button below instead."}
      </p>

      <div className="flex size-56 items-center justify-center rounded-[var(--acc-radius-md)] border border-[color:var(--acc-border)] bg-white p-3">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="UPI payment QR code" className="size-full" />
        ) : (
          <QrCodeIcon className="size-10 animate-pulse text-[color:var(--acc-text-secondary)]" aria-hidden="true" />
        )}
      </div>

      {onIOS ? (
        // No tappable upi:// link here on purpose — see isIOS's doc comment.
        // iOS has been observed taking that exact tap to WhatsApp instead of
        // a UPI app, so the fix is steering people to the one path that
        // actually works (their UPI app's own scanner), not offering a
        // button known to fail.
        <div
          className="flex items-start gap-2.5 rounded-[var(--acc-radius-md)] border px-4 py-3 text-left text-sm"
          style={{ borderColor: "var(--acc-border)", background: "var(--acc-input-bg)", color: "var(--acc-text-secondary)" }}
        >
          <Smartphone className="mt-0.5 size-5 shrink-0" style={{ color: "var(--acc-accent)" }} aria-hidden="true" />
          <span>
            <strong className="text-[color:var(--acc-text-primary)]">On iPhone/iPad:</strong> open GPay, PhonePe, Paytm, or your bank's UPI app and use its
            "Scan QR" option on the code above. Don't scan it with the Camera app or tap a link — iOS can't open UPI links directly and may open an
            unrelated app instead.
          </span>
        </div>
      ) : (
        <a
          href={paymentUrl}
          className="flex h-12 w-full items-center justify-center rounded-[var(--acc-radius-md)] px-8 text-base font-bold outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)] sm:w-auto"
          style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
        >
          Open UPI App
        </a>
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
