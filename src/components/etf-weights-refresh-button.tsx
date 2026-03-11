"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface EtfWeightsRefreshButtonProps {
  lastFetchedAt: string | null;
}

export function EtfWeightsRefreshButton({
  lastFetchedAt,
}: EtfWeightsRefreshButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/etf-weights", { method: "POST" });

      if (!response.ok) {
        throw new Error("Failed to refresh ETF weights");
      }

      const data = await response.json();
      const count = data.updated?.length ?? 0;
      const errors = data.updated?.filter(
        (r: { error?: string }) => r.error
      ).length;

      if (errors > 0) {
        toast.warning(
          `${count - errors}/${count} ETF mis à jour (${errors} erreur${errors > 1 ? "s" : ""})`
        );
      } else {
        toast.success(`${count} ETF "Monde" mis à jour`);
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Échec de la mise à jour des country weights");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleRefresh}
        disabled={loading}
        variant="outline"
        size="sm"
      >
        <RefreshCw className={loading ? "animate-spin" : ""} />
        {loading ? "Mise à jour..." : "Rafraîchir exposition"}
      </Button>
      {lastFetchedAt && (
        <span className="text-xs text-muted-foreground">
          Dernière MàJ :{" "}
          {new Date(lastFetchedAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      )}
    </div>
  );
}
