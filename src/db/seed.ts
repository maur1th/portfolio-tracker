import { db } from "./index";
import { brokers, accounts } from "./schema";
import { eq, and } from "drizzle-orm";

async function getOrCreateBroker(name: string) {
  const existing = await db
    .select()
    .from(brokers)
    .where(eq(brokers.name, name))
    .limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(brokers).values({ name }).returning();
  return created;
}

async function getOrCreateAccount(
  brokerId: number,
  name: string,
  type: "PEA" | "CTO" | "PER",
  currency: string,
) {
  const existing = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.brokerId, brokerId), eq(accounts.name, name)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db
    .insert(accounts)
    .values({ brokerId, name, type, currency })
    .returning();
  return created;
}

async function seed() {
  console.log("Seeding database...");

  const boursobankBroker = await getOrCreateBroker("Boursobank");
  const ibkrBroker = await getOrCreateBroker("IBKR");
  const lucyaCardifBroker = await getOrCreateBroker("Lucya Cardif");

  await getOrCreateAccount(boursobankBroker.id, "PEA", "PEA", "EUR");
  await getOrCreateAccount(boursobankBroker.id, "CTO", "CTO", "EUR");
  await getOrCreateAccount(ibkrBroker.id, "CTO", "CTO", "USD");
  await getOrCreateAccount(lucyaCardifBroker.id, "PER", "PER", "EUR");

  console.log("Seed complete!");
  process.exit(0);
}

seed();
