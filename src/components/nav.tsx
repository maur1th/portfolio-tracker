"use client";

import Link from "next/link";
import { PriceRefreshButton } from "./price-refresh-button";
import { Button } from "./ui/button";
import { Eye, EyeOff, FileUp } from "lucide-react";
import { usePrivacy } from "./privacy-provider";

export function Nav() {
  const { privacyMode, togglePrivacy } = usePrivacy();
  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-background/95 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-semibold tracking-[-0.03em] text-white">
            Portfolio Tracker
          </Link>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePrivacy}
              title={privacyMode ? "Afficher les montants" : "Masquer les montants"}
              className="h-12 w-12"
            >
              {privacyMode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </Button>
            <PriceRefreshButton />
            <Button asChild variant="outline" className="bg-white/5 border-dash-border text-foreground shadow-dash-action h-12 px-5 text-base hover:bg-white/8">
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
