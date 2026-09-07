import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("../../lib/env", () => ({
  env: {
    QRX_CLIENT_ID: "test-client",
    QRX_SECRET_ID: "test-secret",
    QRX_PAN_BASE_URL: "https://qrx.example/api",
    QRX_TIMEOUT_MS: 1000,
  },
}))

import { QrxPanError, verifyPanWithQrx } from "./qrx-pan.service"

const successBody = {
  status: true,
  status_key: "SUCCESS",
  data: {
    pan: "ABCDE1234F",
    pan_type: "Individual",
    fullname: "TEST USER",
    aadhaar_linked: true,
    address: { city: "Delhi" },
  },
  request_id: "REQ-1",
}

afterEach(() => vi.restoreAllMocks())

describe("verifyPanWithQrx", () => {
  it("maps a successful provider response and sends server-side credentials", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(successBody), { status: 200 }))

    await expect(verifyPanWithQrx("ABCDE1234F")).resolves.toEqual({
      details: expect.objectContaining({ pan: "ABCDE1234F", fullname: "TEST USER", aadhaar_linked: true }),
      requestId: "REQ-1",
    })
    expect(fetchMock).toHaveBeenCalledWith(
      "https://qrx.example/api/qrx/verify_pan_details",
      expect.objectContaining({
        headers: expect.objectContaining({ clientid: "test-client", secretid: "test-secret" }),
        body: JSON.stringify({ pan: "ABCDE1234F" }),
      })
    )
  })

  it("rejects an unsuccessful provider status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ status: false, status_key: "FAILED" }), { status: 200 }))
    await expect(verifyPanWithQrx("ABCDE1234F")).rejects.toMatchObject({ code: "NOT_VERIFIED" })
  })

  it("treats HTTP failures as temporary provider outages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 503 }))
    await expect(verifyPanWithQrx("ABCDE1234F")).rejects.toEqual(expect.objectContaining({ code: "UNAVAILABLE" }))
  })

  it("rejects incomplete successful responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ status: true, status_key: "SUCCESS", data: {} }), { status: 200 }))
    await expect(verifyPanWithQrx("ABCDE1234F")).rejects.toBeInstanceOf(QrxPanError)
    await expect(verifyPanWithQrx("ABCDE1234F")).rejects.toMatchObject({ code: "INVALID_RESPONSE" })
  })

  it("treats network and timeout failures as temporary outages", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("The operation was aborted"))
    await expect(verifyPanWithQrx("ABCDE1234F")).rejects.toMatchObject({ code: "UNAVAILABLE" })
  })
})
