import { db } from "@/db";
import { accounts, brokers } from "@/db/schema";
import { CSVUpload } from "@/components/csv-upload";
import { ManualPositionEntry } from "@/components/manual-position-entry";
import { eq } from "drizzle-orm";

const CSV_BROKERS = ["Boursobank", "IBKR"];

export default async function ImportPage() {
  const allAccounts = await db
    .select({
      id: accounts.id,
      brokerId: accounts.brokerId,
      name: accounts.name,
      type: accounts.type,
      currency: accounts.currency,
      brokerName: brokers.name,
    })
    .from(accounts)
    .innerJoin(brokers, eq(accounts.brokerId, brokers.id));

  const csvAccounts = allAccounts.filter((a) => CSV_BROKERS.includes(a.brokerName));
  const manualAccounts = allAccounts.filter((a) => !CSV_BROKERS.includes(a.brokerName));

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">Importer des positions</h1>
      <CSVUpload accounts={csvAccounts} />
      <ManualPositionEntry accounts={manualAccounts} />
    </div>
  );
}
