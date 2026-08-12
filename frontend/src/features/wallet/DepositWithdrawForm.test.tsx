import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DepositWithdrawForm } from "./DepositWithdrawForm"
import * as walletApi from "@/api/wallet.api"

vi.mock("@/api/wallet.api")

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const result = render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
  // "Deposit"/"Withdraw" each label two elements (the mode-toggle tab and the
  // submit button) — the submit button is the one inside the <form>.
  const form = result.container.querySelector("form")
  if (!form) throw new Error("form not found")
  return { ...result, form: within(form) }
}

describe("DepositWithdrawForm", () => {
  beforeEach(() => {
    vi.mocked(walletApi.deposit).mockReset()
    vi.mocked(walletApi.withdraw).mockReset()
  })

  it("rejects a zero/blank amount without calling the API", async () => {
    const user = userEvent.setup()
    const { form } = renderWithClient(<DepositWithdrawForm />)

    await user.click(form.getByRole("button", { name: "Deposit" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(/greater than 0/i)
    expect(walletApi.deposit).not.toHaveBeenCalled()
  })

  it("submits a valid deposit amount to the deposit API, not withdraw", async () => {
    vi.mocked(walletApi.deposit).mockResolvedValue({ balance: 1250, replayed: false })
    const user = userEvent.setup()
    const { form } = renderWithClient(<DepositWithdrawForm />)

    await user.type(screen.getByPlaceholderText("Amount"), "250")
    await user.click(form.getByRole("button", { name: "Deposit" }))

    await waitFor(() => expect(walletApi.deposit).toHaveBeenCalled())
    expect(vi.mocked(walletApi.deposit).mock.calls[0][0]).toBe(250)
    expect(walletApi.withdraw).not.toHaveBeenCalled()
  })

  it("switches to withdraw mode and calls the withdraw API instead", async () => {
    vi.mocked(walletApi.withdraw).mockResolvedValue({ balance: 750, replayed: false })
    const user = userEvent.setup()
    const { form } = renderWithClient(<DepositWithdrawForm />)

    await user.click(screen.getByRole("button", { name: "Withdraw" }))
    await user.type(screen.getByPlaceholderText("Amount"), "100")
    await user.click(form.getByRole("button", { name: "Withdraw" }))

    await waitFor(() => expect(walletApi.withdraw).toHaveBeenCalled())
    expect(vi.mocked(walletApi.withdraw).mock.calls[0][0]).toBe(100)
    expect(walletApi.deposit).not.toHaveBeenCalled()
  })

  it("surfaces a friendly message when the API call fails", async () => {
    const { ApiError } = await import("@/api/api-error")
    vi.mocked(walletApi.deposit).mockRejectedValue(new ApiError(422, "INSUFFICIENT_BALANCE", "insufficient"))
    const user = userEvent.setup()
    const { form } = renderWithClient(<DepositWithdrawForm />)

    await user.type(screen.getByPlaceholderText("Amount"), "999999")
    await user.click(form.getByRole("button", { name: "Deposit" }))

    expect(await screen.findByText(/insufficient balance/i)).toBeInTheDocument()
  })
})
