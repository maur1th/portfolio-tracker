"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/format";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, TrendingUp, Target, Calendar } from "lucide-react";
import type { DcaSuggestion } from "@/lib/dca-suggestions";

interface VAWidgetProps {
  config: {
    id: number;
    startDate: string;
    monthlyIncrement: number;
    initialValue: number;
  } | null;
  calculation: {
    targetValue: number;
    currentValue: number;
    amountToInvest: number;
    monthsElapsed: number;
    onTrack: boolean;
  } | null;
  latestSnapshotDate: string | null;
  contributionsThisMonth: number;
  snapshotHistory: Array<{
    date: string;
    totalValueEur: number;
    totalCostEur: number;
  }>;
  currentPortfolioValue: number;
  suggestions: DcaSuggestion[];
  suggestionsAmount: number;
  isNextMonth: boolean;
}

function computeTargetForSnapshot(
  config: { startDate: string; monthlyIncrement: number; initialValue: number },
  snapshotDate: string,
  allSnapshots: Array<{ date: string; totalValueEur: number }>
): number {
  const date = new Date(snapshotDate);
  const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

  const prevMonthSnapshots = allSnapshots
    .filter((s) => s.date.startsWith(prevMonthStr))
    .sort((a, b) => a.date.localeCompare(b.date));

  const baseValue =
    prevMonthSnapshots.length > 0
      ? prevMonthSnapshots[prevMonthSnapshots.length - 1].totalValueEur
      : config.initialValue;

  return baseValue + config.monthlyIncrement;
}

export function VAWidget({
  config,
  calculation,
  latestSnapshotDate,
  contributionsThisMonth,
  snapshotHistory,
  currentPortfolioValue,
  suggestions,
  suggestionsAmount,
  isNextMonth,
}: VAWidgetProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [monthlyIncrement, setMonthlyIncrement] = useState("");
  const [initialValue, setInitialValue] = useState("");
  const [loading, setLoading] = useState(false);

  const currentMonth = new Date().toISOString().substring(0, 7);
  const hasSnapshotThisMonth = latestSnapshotDate?.startsWith(currentMonth);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/va-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          monthlyIncrement: parseFloat(monthlyIncrement),
          initialValue: parseFloat(initialValue),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save configuration");
      }

      toast.success("Configuration Value Averaging enregistrée");
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (config) {
      setStartDate(config.startDate);
      setMonthlyIncrement(config.monthlyIncrement.toString());
      setInitialValue(config.initialValue.toString());
    }
    setIsEditing(true);
  };

  const handleSetup = () => {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstOfMonth.toISOString().split("T")[0]);
    setMonthlyIncrement("1000");
    setInitialValue(currentPortfolioValue.toFixed(2));
    setIsEditing(true);
  };

  if (!config || isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Value Averaging</CardTitle>
        </CardHeader>
        <CardContent>
          {!config && !isEditing ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Définissez une trajectoire de valeur cible pour votre portefeuille.
                Chaque mois, investissez pour atteindre l'objectif : plus en cas de baisse,
                moins en cas de hausse.
              </p>
              <Button onClick={handleSetup}>Configurer Value Averaging</Button>
            </div>
          ) : (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Date de départ</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyIncrement">Incrément mensuel (EUR)</Label>
                <Input
                  id="monthlyIncrement"
                  type="number"
                  step="0.01"
                  value={monthlyIncrement}
                  onChange={(e) => setMonthlyIncrement(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initialValue">Valeur initiale (EUR)</Label>
                <Input
                  id="initialValue"
                  type="number"
                  step="0.01"
                  value={initialValue}
                  onChange={(e) => setInitialValue(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Valeur du portefeuille au démarrage du plan
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </Button>
                {config && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Annuler
                  </Button>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!calculation) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Value Averaging</CardTitle>
        <Button variant="outline" size="sm" onClick={handleEdit}>
          Modifier
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasSnapshotThisMonth && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Prix non actualisés depuis le {latestSnapshotDate || "jamais"}.
              Actualisez les prix pour un calcul précis.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" />
              Objectif ce mois
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(calculation.targetValue)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Valeur actuelle
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(calculation.currentValue)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">À investir</div>
            <div
              className={`text-2xl font-bold ${
                calculation.onTrack ? "text-green-600" : "text-amber-600"
              }`}
            >
              {formatCurrency(calculation.amountToInvest)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Mois écoulés
            </div>
            <div className="text-2xl font-bold">{calculation.monthsElapsed}</div>
          </div>
        </div>

        {contributionsThisMonth > 0 && (
          <div className="text-sm text-muted-foreground">
            Investi ce mois : {formatCurrency(contributionsThisMonth)}
          </div>
        )}

        {suggestions.length > 0 && (
          <>
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">
                {isNextMonth
                  ? "Suggestions DCA — mois prochain"
                  : "Suggestions DCA"}
              </h3>
              {isNextMonth && (
                <p className="text-xs text-muted-foreground mb-3">
                  Objectif atteint ce mois. Projection basée sur l'incrément mensuel.
                </p>
              )}
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <div
                    key={`${s.ticker}-${s.category}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <span className="font-medium">{s.instrumentName}</span>
                      <span className="text-muted-foreground ml-1">({s.ticker})</span>
                      <span className="text-muted-foreground ml-2">· {s.accountName}</span>
                      <span className="text-xs text-muted-foreground ml-2">{s.category}</span>
                    </div>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(s.suggestedAmount)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t flex items-center justify-between text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(suggestionsAmount)}</span>
              </div>
            </div>
          </>
        )}

        {snapshotHistory.length > 0 && (
          <div className="border-t pt-4 space-y-2">
            <div className="text-sm font-medium">Historique (6 derniers mois)</div>
            <div className="space-y-1 text-xs">
              {snapshotHistory.slice(-6).reverse().map((snapshot) => {
                const target = computeTargetForSnapshot(
                  config,
                  snapshot.date,
                  snapshotHistory
                );
                const onTrack = snapshot.totalValueEur >= target;

                return (
                  <div
                    key={snapshot.date}
                    className="flex justify-between items-center text-muted-foreground"
                  >
                    <span>{snapshot.date}</span>
                    <span className={onTrack ? "text-green-600" : "text-amber-600"}>
                      {formatCurrency(snapshot.totalValueEur)} / {formatCurrency(target)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
