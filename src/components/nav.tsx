import Link from "next/link";
import { PriceRefreshButton } from "./price-refresh-button";
import { Button } from "./ui/button";
import { FileUp } from "lucide-react";

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-background/95 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-semibold tracking-[-0.03em] text-white">
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
