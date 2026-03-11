import Link from "next/link";
import { PriceRefreshButton } from "./price-refresh-button";
import { Button } from "./ui/button";
import { FileUp } from "lucide-react";

export function Nav() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            Portfolio Tracker
          </Link>
          <div className="flex gap-2">
            <PriceRefreshButton />
            <Button asChild variant="outline">
              <Link href="/import">
                <FileUp />
                Importer CSV
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
