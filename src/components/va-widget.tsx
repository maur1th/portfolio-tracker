"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Flag,
  Pencil,
  Target,
  TrendingUp,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DcaSuggestion } from "@/lib/dca-suggestions";
import type { Geography } from "@/lib/exposure";
import { formatCurrency } from "@/lib/format";
import {
  computeContributionProgress,
  computeFundingProgress,
  computeMonthProgress,
  computeVariance,
} from "@/lib/va-calculations";

const GEOGRAPHY_EMOJI: Record<Geography, string> = {
  US: "🇺🇸",
  Europe: "🇪🇺",
  Monde: "🌍",
  "Émergents": "🌎",
  Japon: "🇯🇵",
  "Asie-Pacifique": "🇨🇳",
  UK: "🇬🇧",
  "Non classé": "📊",
};

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

const statusTone = {
  ahead: {
    badge: "var(--color-success)",
    accent: "var(--color-success)",
    bar: "var(--color-success)",
    track: "var(--color-surface-tint-success)",
  },
  behind: {
    badge: "var(--color-warning)",
    accent: "var(--color-warning)",
    bar: "var(--color-warning)",
    track: "var(--color-surface-tint-warning)",
  },
  "on-track": {
    badge: "var(--color-info)",
    accent: "var(--color-info)",
    bar: "var(--color-info)",
    track: "var(--color-surface-tint-info)",
  },
} as const;

const vaTheme = {
  background: "var(--color-background)",
  surfaceMuted: "var(--color-surface-muted)",
  surfaceWarning: "var(--color-surface-tint-warning)",
  lineSoft: "var(--color-line-soft)",
  textSoft: "var(--color-text-soft)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
};

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Activity;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1rem] border border-border bg-card p-4">
      <div className="mb-5 flex items-center gap-2 text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-base font-semibold tracking-[-0.02em]">{title}</h3>
      </div>
      {children}
    </div>
  );
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
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-2xl font-semibold tracking-[-0.04em]">Value Averaging</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {!config && !isEditing ? (
            <div className="space-y-5">
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Définissez une trajectoire cible pour le portefeuille. L&apos;objectif mensuel
                s&apos;adapte au marché : plus d&apos;investissement après une baisse, moins après une hausse.
              </p>
              <Button onClick={handleSetup}>Configurer Value Averaging</Button>
            </div>
          ) : (
            <form onSubmit={handleSaveConfig} className="grid gap-4 md:grid-cols-3">
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
                <p className="text-xs text-muted-foreground">Valeur du portefeuille au démarrage du plan</p>
              </div>
              <div className="flex gap-2 md:col-span-3">
                <Button type="submit" disabled={loading}>
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </Button>
                {config ? (
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Annuler
                  </Button>
                ) : null}
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

  const { variance, isPositive: varianceIsPositive } = computeVariance(
    calculation.currentValue,
    calculation.targetValue
  );
  const { currentDay, daysInMonth, daysRemaining, daysProgress } = computeMonthProgress(new Date());
  const contributionProgress = computeContributionProgress(
    contributionsThisMonth,
    calculation.amountToInvest,
    daysProgress
  );
  const { progressRatio, remainingRatio } = computeFundingProgress(
    config.monthlyIncrement,
    calculation.amountToInvest
  );
  const nextMonthTarget = calculation.currentValue + config.monthlyIncrement;
  const fundingLeft = Math.min(Math.max(progressRatio, 0), 100);
  const fundingMarkerLeft = Math.min(Math.max(progressRatio, 2), 98);
  const contributionMarkerLeft = Math.min(Math.max(contributionProgress.actualRatio, 2), 98);
  const headerTone = calculation.onTrack ? statusTone.ahead : statusTone.behind;
  const paceTone = statusTone[contributionProgress.pace];
  const monthPaceLabel =
    contributionProgress.pace === "ahead"
      ? "Rythme d'investissement en avance"
      : contributionProgress.pace === "behind"
        ? "Rythme d'investissement en retard"
        : "Rythme d'investissement dans la cible";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border py-4">
        <div className="flex items-center gap-3">
          <div
            className="rounded-full border p-2"
            style={{ borderColor: vaTheme.lineSoft, backgroundColor: vaTheme.surfaceMuted }}
          >
            <Activity className="h-4 w-4" style={{ color: vaTheme.success }} />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold tracking-[-0.03em]">Value Averaging</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Pilotage mensuel de la trajectoire cible du portefeuille
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-4 md:p-5">
        <div
          className="relative overflow-hidden rounded-[1rem] border border-border bg-card px-5 py-4"
          style={{ backgroundColor: headerTone.track }}
        >
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-[clamp(1rem,1.6vw,1.35rem)] font-semibold tracking-[-0.03em] text-foreground">
                  Statut:
                </span>
                <span
                  className="text-[clamp(1rem,1.6vw,1.35rem)] font-semibold tracking-[-0.03em]"
                  style={{ color: headerTone.badge }}
                >
                  {calculation.onTrack ? "En avance sur l'objectif" : "Sous la cible"}
                </span>
              </div>

              <div className="flex items-center gap-4 xl:min-w-0 xl:flex-1 xl:px-6">
                <div className="relative min-w-0 flex-1">
                  <div
                    className="absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full"
                    style={{ backgroundColor: vaTheme.surfaceMuted }}
                  />
                  <div
                    className="absolute left-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full"
                    style={{ width: `${fundingLeft}%`, backgroundColor: headerTone.bar }}
                  />
                  <div
                    className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                    style={{ left: `${fundingMarkerLeft}%` }}
                  >
                    <Flag className="mb-3 h-4 w-4" style={{ color: vaTheme.success }} />
                    <div
                      className="h-4 w-4 rounded-full border bg-background"
                      style={{ borderColor: vaTheme.success }}
                    >
                      <div
                        className="m-auto mt-[3px] h-2 w-2 rounded-full"
                        style={{ backgroundColor: vaTheme.success }}
                      />
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {remainingRatio.toFixed(0)}% restant
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 xl:justify-end">
                <div className="text-right">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    À investir
                  </div>
                  <div
                    className="text-[clamp(1.2rem,1.9vw,1.6rem)] font-semibold tracking-[-0.03em]"
                    style={{
                      color:
                        calculation.amountToInvest === 0
                          ? vaTheme.success
                          : vaTheme.warning,
                    }}
                  >
                    {formatCurrency(calculation.amountToInvest)}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleEdit} className="h-10 px-4">
                  <Pencil className="h-3.5 w-3.5" />
                  Modifier
                </Button>
              </div>
            </div>
          </div>
        </div>

        {!hasSnapshotThisMonth ? (
          <Alert
            className="text-foreground"
            style={{ borderColor: vaTheme.warning, backgroundColor: vaTheme.surfaceWarning }}
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Prix non actualisés depuis le {latestSnapshotDate || "jamais"}. Actualisez les prix pour un calcul précis.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-3">
          <SectionCard icon={Target} title="Situation actuelle">
            <div className="grid gap-5">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Valeur actuelle</div>
                  <div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-foreground">
                    {formatCurrency(calculation.currentValue)}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-sm text-muted-foreground">Trajectoire cible</div>
                  <div
                    className="mt-1 text-xl font-semibold tracking-[-0.03em]"
                    style={{ color: vaTheme.textSoft }}
                  >
                    {formatCurrency(calculation.targetValue)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm text-muted-foreground">Variance</span>
                <span
                  className="flex items-center gap-1 text-lg font-semibold tracking-[-0.03em]"
                  style={{ color: varianceIsPositive ? vaTheme.success : vaTheme.danger }}
                >
                  {varianceIsPositive ? "+" : ""}
                  {formatCurrency(variance)}
                  {varianceIsPositive ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                </span>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={Activity} title="Activité du mois">
            <div className="grid gap-5">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Investi ce mois</div>
                  <div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-foreground">
                    {formatCurrency(contributionsThisMonth)}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-sm text-muted-foreground">Reste à investir</div>
                  <div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-foreground">
                    {formatCurrency(calculation.amountToInvest)}
                  </div>
                </div>
              </div>
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium" style={{ color: paceTone.accent }}>
                    {monthPaceLabel}
                  </span>
                  <span className="text-muted-foreground">{daysRemaining} jours restants</span>
                </div>
                <div className="space-y-2">
                  <div
                    className="relative h-5 rounded-full"
                    style={{ backgroundColor: vaTheme.surfaceMuted }}
                  >
                    <div
                      className="absolute inset-y-1 left-0 rounded-full"
                      style={{
                        width: `${contributionProgress.expectedRatio}%`,
                        backgroundColor: vaTheme.lineSoft,
                      }}
                    />
                    <div
                      className="absolute inset-y-1 left-0 rounded-full"
                      style={{ width: `${daysProgress}%`, backgroundColor: vaTheme.lineSoft }}
                    />
                    <div
                      className="absolute top-1/2 h-5 w-[2px] -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${contributionMarkerLeft}%`,
                        backgroundColor: paceTone.bar,
                      }}
                    />
                    <div
                      className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                      style={{
                        left: `${contributionMarkerLeft}%`,
                        borderColor: paceTone.bar,
                        backgroundColor: vaTheme.background,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>Progression du mois</span>
                    <span>{currentDay}/{daysInMonth} jours</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Investissement vs objectif mensuel</span>
                    <span>
                      {contributionProgress.actualRatio.toFixed(0)}% investi /{" "}
                      {contributionProgress.expectedRatio.toFixed(0)}% attendu
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={TrendingUp} title="Aperçu du mois suivant">
            <div className="grid gap-5">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Total projeté</div>
                  <div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-foreground">
                    {formatCurrency(nextMonthTarget)}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-sm text-muted-foreground">Stratégie</div>
                  <div
                    className="mt-1 text-lg font-semibold tracking-[-0.03em]"
                    style={{ color: vaTheme.textSoft }}
                  >
                    Incrément standard
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <div>
                  <div className="text-sm text-muted-foreground">Incrément mensuel</div>
                  <div className="mt-1 text-lg font-semibold tracking-[-0.03em] text-foreground">
                    {formatCurrency(config.monthlyIncrement)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Mois écoulés</div>
                  <div
                    className="mt-1 text-lg font-semibold tracking-[-0.03em]"
                    style={{ color: vaTheme.textSoft }}
                  >
                    {calculation.monthsElapsed}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[1rem] border border-border bg-card p-4">
            <div className="mb-5 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" style={{ color: vaTheme.success }} />
              <h3 className="text-base font-semibold tracking-[-0.02em] text-foreground">
                {isNextMonth ? "Suggestions du mois suivant" : "Suggestions du mois"}
              </h3>
              <span className="text-sm text-muted-foreground">
                Basé sur {formatCurrency(suggestionsAmount || config.monthlyIncrement)}
              </span>
            </div>

            {suggestions.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {suggestions.map((suggestion) => {
                  const allocation = suggestionsAmount > 0 ? (suggestion.suggestedAmount / suggestionsAmount) * 100 : 0;
                  const emoji = GEOGRAPHY_EMOJI[suggestion.category as Geography] ?? "📊";

                  return (
                    <div
                      key={`${suggestion.ticker}-${suggestion.category}`}
                      className="rounded-[0.95rem] border p-4"
                      style={{ borderColor: vaTheme.lineSoft, backgroundColor: vaTheme.surfaceMuted }}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="line-clamp-2 text-sm font-semibold tracking-[-0.02em] text-foreground">
                            [ETF] {suggestion.instrumentName}
                          </div>
                        </div>
                        <div className="text-xl leading-none" title={suggestion.category}>
                          {emoji}
                        </div>
                      </div>
                      <div className="mb-4 text-sm" style={{ color: vaTheme.textSoft }}>
                        Allocation : {allocation.toFixed(0)}% <span className="mx-1 text-muted-foreground">|</span>
                        <span className="font-semibold text-foreground">{formatCurrency(suggestion.suggestedAmount)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{suggestion.ticker} · {suggestion.accountName}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className="rounded-[1rem] border border-dashed px-4 py-8 text-center text-sm text-muted-foreground"
                style={{ borderColor: vaTheme.lineSoft, backgroundColor: vaTheme.surfaceMuted }}
              >
                Aucune suggestion pour le moment.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
