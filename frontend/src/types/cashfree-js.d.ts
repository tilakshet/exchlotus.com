/**
 * `@cashfreepayments/cashfree-js` ships no type declarations at all (no
 * .d.ts in the published package) — this covers only the two calls this
 * project actually uses (dashboard.account.deposit.tsx), not the SDK's
 * full surface.
 */
declare module "@cashfreepayments/cashfree-js" {
  export interface Cashfree {
    checkout(options: {
      paymentSessionId: string
      redirectTarget?: "_self" | "_blank" | "_top" | HTMLElement
    }): Promise<unknown>
  }

  export function load(options: { mode: "sandbox" | "production" }): Promise<Cashfree>
}
