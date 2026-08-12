import { randomUUID } from "node:crypto"
import { prisma } from "../src/lib/prisma"
import { hashPassword } from "../src/modules/auth/password.util"

/**
 * Seeds the exact player/balance used in the spec's own worked examples
 * (§5.2–5.5: user_id "12345", starting balance 1500.75) so the documented
 * request/response pairs can be replayed against this implementation
 * as a sanity check. Also gives it a phone + password so "Login with
 * Password" (phone-based, see auth.service.ts) has a real account to
 * exercise — phone: "+919876500000", password: "password123".
 *
 * Also seeds a second, dedicated local-testing account (not tied to the
 * spec's fixture data) with an INR balance and a round, easy-to-type
 * phone number — this is the one to hand to anyone testing the app
 * locally rather than the spec fixture above.
 */
async function main() {
  const fixturePasswordHash = await hashPassword("password123")

  const fixturePlayer = await prisma.player.upsert({
    where: { externalId: "12345" },
    update: { passwordHash: fixturePasswordHash, phone: "+919876500000" },
    create: {
      externalId: "12345",
      username: "John Silva",
      email: "user@example.com",
      phone: "+919876500000",
      passwordHash: fixturePasswordHash,
      currency: "USD",
      wallet: { create: { balance: 1500.75, currency: "USD" } },
    },
  })

  const testPasswordHash = await hashPassword("Test@1234")

  const testPlayer = await prisma.player.upsert({
    where: { phone: "+911234567890" },
    update: { passwordHash: testPasswordHash },
    create: {
      externalId: randomUUID(),
      username: "Test Player",
      phone: "+911234567890",
      passwordHash: testPasswordHash,
      currency: "INR",
      wallet: { create: { balance: 10000, currency: "INR" } },
    },
  })

  console.log("\nLocal test credentials")
  console.log("----------------------")
  console.log(`Spec fixture player  — phone: +919876500000  password: password123  (externalId ${fixturePlayer.externalId})`)
  console.log(`Local testing player — phone: +911234567890  password: Test@1234    (₹10,000 starting balance)`)
  console.log("Login with OTP works for any phone number — the dev code is returned inline in the UI, no SMS needed.")
  console.log("Categories are populated from the gaming provider on catalog sync (POST /api/catalog/sync) — none are seeded.")
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
