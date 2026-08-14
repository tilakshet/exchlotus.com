import { describe, expect, it } from "vitest"
import type { Request } from "express"
import { updateRolePermissions } from "./roles.service"

describe("updateRolePermissions", () => {
  it("rejects an admin editing the permissions of their own role, before touching the database", async () => {
    // roleId === actorRoleId short-circuits before any Prisma call, so this
    // is genuinely testable without a database — a fake Request is enough.
    const fakeReq = {} as Request
    await expect(updateRolePermissions(fakeReq, "admin-1", "role-1", "role-1", ["users.view"])).rejects.toMatchObject({
      code: "SELF_ROLE_EDIT",
    })
  })
})
