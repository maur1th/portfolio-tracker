import { db } from "@/db";
import { accounts, brokers } from "@/db/schema";
import { CSVUpload } from "@/components/csv-upload";
import { eq } from "drizzle-orm";

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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Importer des positions depuis CSV</h1>
      <CSVUpload accounts={allAccounts} />
    </div>
  );
}
