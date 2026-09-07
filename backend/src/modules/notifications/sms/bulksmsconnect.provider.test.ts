import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../lib/env", () => ({
  env: {
    SMS_ENABLED: true,
    SMS_API_BASE_URL: "https://sms.example/V2",
    SMS_API_KEY: "test-key",
    SMS_SENDER_ID: "DXPAY",
    SMS_TIMEOUT_MS: 1000,
  },
}))

import { bulkSmsConnectProvider } from "./bulksmsconnect.provider"
import { SmsError } from "./sms.errors"

const okBody = {
  status: "OK",
  data: [{ id: "59813321-1", mobile: "919876543210", status: "SUBMITTED" }],
  msgid: "456559813321924",
  message: "message Submitted successfully",
}

afterEach(() => vi.restoreAllMocks())

describe("bulkSmsConnectProvider.sendSms", () => {
  it("posts the documented payload and maps a successful response", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(okBody), { status: 200 }))

    await expect(
      bulkSmsConnectProvider.sendSms({ to: "+919876543210", message: "hello 123456" })
    ).resolves.toEqual({ providerMessageId: "456559813321924", recipientId: "59813321-1" })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sms.example/V2/http-api-post.php",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          apikey: "test-key",
          senderid: "DXPAY",
          number: "919876543210",
          message: "hello 123456",
          format: "json",
        }),
      })
    )
  })

  it("rejects a non-+91 recipient before calling the provider", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
    await expect(bulkSmsConnectProvider.sendSms({ to: "+14155550123", message: "x" })).rejects.toMatchObject({
      code: "INVALID_RECIPIENT",
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("maps AZQ10 to INSUFFICIENT_CREDIT", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "AZQ10", message: "You have insufficient credit" }), { status: 200 })
    )
    await expect(bulkSmsConnectProvider.sendSms({ to: "+919876543210", message: "x" })).rejects.toMatchObject({
      code: "INSUFFICIENT_CREDIT",
    })
  })

  it("maps any other AZQ status to REJECTED", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "AZQ02", message: "Invalid Api Key" }), { status: 200 })
    )
    await expect(bulkSmsConnectProvider.sendSms({ to: "+919876543210", message: "x" })).rejects.toMatchObject({
      code: "REJECTED",
    })
  })

  it("treats a non-2xx response as UNAVAILABLE", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 502 }))
    await expect(bulkSmsConnectProvider.sendSms({ to: "+919876543210", message: "x" })).rejects.toMatchObject({
      code: "UNAVAILABLE",
    })
  })

  it("treats a network/timeout failure as UNAVAILABLE", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("The operation was aborted"))
    await expect(bulkSmsConnectProvider.sendSms({ to: "+919876543210", message: "x" })).rejects.toBeInstanceOf(SmsError)
  })
})
