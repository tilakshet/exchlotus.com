import { useCallback, useEffect, useState } from "react"
import type { BankAccount } from "@/types/bank"

const STORAGE_KEY = "exchlotus.bankAccounts"

function load(): BankAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as BankAccount[]) : []
  } catch {
    return []
  }
}

/**
 * There's no payout-method backend endpoint (no bank verification, no
 * payment gateway) — this is local-only (per browser, not synced across
 * devices or used by the actual withdrawal API) until one exists. Saving
 * and selecting an account here is real (persists, survives reload,
 * removable), it's just not connected to any real payout rail, same as
 * the rest of the wallet in this build. Flagged rather than silently
 * pretending it's a verified backend-linked payout method.
 */
export function useBankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
  }, [accounts])

  const addAccount = useCallback((input: Omit<BankAccount, "id" | "createdAt">) => {
    const account: BankAccount = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    setAccounts((prev) => [...prev, account])
    return account
  }, [])

  const removeAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  return { accounts, addAccount, removeAccount }
}
