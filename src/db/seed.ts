import { db } from "./index";
import { brokers, accounts } from "./schema";

async function seed() {
  console.log("Seeding database...");

  const boursobankBroker = await db
    .insert(brokers)
    .values({ name: "Boursobank" })
    .returning();

  const ibkrBroker = await db.insert(brokers).values({ name: "IBKR" }).returning();

  await db.insert(accounts).values([
    {
      brokerId: boursobankBroker[0].id,
      name: "PEA",
      type: "PEA",
      currency: "EUR",
    },
    {
      brokerId: boursobankBroker[0].id,
      name: "CTO",
      type: "CTO",
      currency: "EUR",
    },
    {
      brokerId: ibkrBroker[0].id,
      name: "CTO",
      type: "CTO",
      currency: "USD",
    },
  ]);

  console.log("Seed complete!");
  process.exit(0);
}

seed();
