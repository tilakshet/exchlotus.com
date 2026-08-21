import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { QrCode as QrCodeIcon } from "lucide-react"
import { formatInr } from "@/lib/utils"

/**
 * Fallback for when the PayIn gateway returns a raw `upi://` app-intent
 * link instead of a hosted checkout page (see isWebPaymentUrl in
 * dashboard.account.deposit.tsx) — there's no page for the browser to
 * navigate to, so this renders the same URI as a scannable QR code
 * (desktop) plus a real `<a href>` (mobile: a direct user-gesture click on
 * an anchor is what actually triggers custom-scheme app links reliably,
 * unlike a script-driven `location.href` set after an async gap).
 */
export function UpiPaymentPanel({ paymentUrl, amount, onCancel }: { paymentUrl: string; amount: number; onCancel: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

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
      <p className="text-sm text-[color:var(--acc-text-secondary)]">Open any UPI app and scan this code — or, on your phone, tap the button below instead.</p>

      <div className="flex size-56 items-center justify-center rounded-[var(--acc-radius-md)] border border-[color:var(--acc-border)] bg-white p-3">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="UPI payment QR code" className="size-full" />
        ) : (
          <QrCodeIcon className="size-10 animate-pulse text-[color:var(--acc-text-secondary)]" aria-hidden="true" />
        )}
      </div>

      <a
        href={paymentUrl}
        className="flex h-12 w-full items-center justify-center rounded-[var(--acc-radius-md)] px-8 text-base font-bold outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)] sm:w-auto"
        style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
      >
        Open UPI App
      </a>

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
