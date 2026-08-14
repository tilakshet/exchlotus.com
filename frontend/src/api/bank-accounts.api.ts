import { apiRequest } from "./http"
import type { BankAccount } from "@/types/bank"

export function listBankAccounts(): Promise<BankAccount[]> {
  return apiRequest<BankAccount[]>("/api/bank-accounts")
}

export function addBankAccount(input: Omit<BankAccount, "id" | "createdAt">): Promise<BankAccount> {
  return apiRequest<BankAccount>("/api/bank-accounts", { method: "POST", body: input })
}

export function removeBankAccount(id: string): Promise<void> {
  return apiRequest<void>(`/api/bank-accounts/${id}`, { method: "DELETE" })
}
