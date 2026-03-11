"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export function PriceRefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/prices/refresh", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to refresh prices");
      }

      const data = await response.json();
      toast.success(`${data.count} prix mis à jour`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Échec de la mise à jour des prix");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleRefresh} disabled={loading} variant="outline">
      <RefreshCw className={loading ? "animate-spin" : ""} />
      {loading ? "Mise à jour..." : "Actualiser les prix"}
    </Button>
  );
}
