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
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DcaSuggestion } from "@/lib/dca-suggestions";
import type { Geography } from "@/lib/exposure";
import { formatCurrency } from "@/lib/format";
import {
  buildChartData,
  computeContributionProgress,
  computeMonthProgress,
  computeProgressRatios,
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
    badge: "text-emerald-200",
    accent: "text-emerald-300",
    bar: "bg-emerald-400",
    track: "bg-emerald-400/16",
  },
  behind: {
    badge: "text-amber-100",
    accent: "text-amber-300",
    bar: "bg-amber-400",
    track: "bg-amber-400/14",
  },
  "on-track": {
    badge: "text-sky-100",
    accent: "text-sky-300",
    bar: "bg-sky-400",
    track: "bg-sky-400/14",
  },
} as const;

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
    <div className="rounded-[1rem] border border-white/8 bg-card p-4">
      <div className="mb-5 flex items-center gap-2 text-white">
        <Icon className="h-4 w-4 text-slate-300" />
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
        <CardHeader className="border-b border-white/8 pb-4">
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
  const { daysRemaining, daysProgress } = computeMonthProgress(new Date());
  const contributionProgress = computeContributionProgress(
    contributionsThisMonth,
    calculation.amountToInvest,
    daysProgress
  );
  const chartData = buildChartData(config, snapshotHistory);
  const { targetRatio, currentRatio } = computeProgressRatios(
    calculation.currentValue,
    calculation.targetValue
  );
  const nextMonthTarget = calculation.currentValue + config.monthlyIncrement;
  const targetLeft = Math.max(6, Math.min(targetRatio, 94));
  const currentLeft = Math.max(6, Math.min(currentRatio, 100));
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
      <CardHeader className="border-b border-white/8 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-white/10 bg-white/5 p-2">
            <Activity className="h-4 w-4 text-emerald-300" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold tracking-[-0.03em]">Value Averaging</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Pilotage mensuel de la trajectoire cible du portefeuille</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-4 md:p-5">
        <div className={`relative overflow-hidden rounded-[1rem] border border-white/8 bg-card px-5 py-4 ${headerTone.track}`}>
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-[clamp(1rem,1.6vw,1.35rem)] font-semibold tracking-[-0.03em] text-white">Statut:</span>
              <span className={`text-[clamp(1rem,1.6vw,1.35rem)] font-semibold tracking-[-0.03em] ${headerTone.badge}`}>
                {calculation.onTrack ? "En avance sur l'objectif" : "Sous la cible"}
              </span>
            </div>

            <div className="relative min-h-16 flex-1 xl:mx-8">
              <div className="absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-white/10" />
              <div
                className="absolute left-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full border-t-2 border-dashed border-white/35"
                style={{ width: `${targetLeft}%` }}
              />
              <div
                className={`absolute left-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full ${headerTone.bar}`}
                style={{ width: `${currentLeft}%` }}
              />
              <div
                className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={{ left: `${targetLeft}%` }}
              >
                <Flag className="mb-3 h-4 w-4 fill-emerald-300/20 text-emerald-300" />
                <div className="h-4 w-4 rounded-full border border-emerald-300 bg-slate-950/90 shadow-[0_0_18px_rgba(110,231,183,0.35)]">
                  <div className="m-auto mt-[3px] h-2 w-2 rounded-full bg-emerald-300" />
                </div>
              </div>
              <div
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${currentLeft}%` }}
              >
                <div className="h-3 w-3 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.45)]" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 xl:justify-end">
              <div className="text-right">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">À investir</div>
                <div className={`text-[clamp(1.2rem,1.9vw,1.6rem)] font-semibold tracking-[-0.03em] ${calculation.amountToInvest === 0 ? "text-emerald-200" : "text-amber-200"}`}>
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

        {!hasSnapshotThisMonth ? (
          <Alert className="border-amber-400/20 bg-amber-400/8 text-amber-50 [&>svg]:text-amber-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Prix non actualisés depuis le {latestSnapshotDate || "jamais"}. Actualisez les prix pour un calcul précis.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-3">
          <SectionCard icon={Target} title="Current Standings">
            <div className="grid gap-5">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Valeur actuelle</div>
                  <div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-white">
                    {formatCurrency(calculation.currentValue)}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-sm text-muted-foreground">Trajectoire cible</div>
                  <div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-300">
                    {formatCurrency(calculation.targetValue)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-white/8 pt-4">
                <span className="text-sm text-muted-foreground">Variance</span>
                <span className={`flex items-center gap-1 text-lg font-semibold tracking-[-0.03em] ${varianceIsPositive ? "text-emerald-300" : "text-rose-300"}`}>
                  {varianceIsPositive ? "+" : ""}
                  {formatCurrency(variance)}
                  {varianceIsPositive ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                </span>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={Activity} title="Monthly Activity">
            <div className="grid gap-5">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Investi ce mois</div>
                  <div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-white">
                    {formatCurrency(contributionsThisMonth)}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-sm text-muted-foreground">Reste à investir</div>
                  <div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-200">
                    {formatCurrency(calculation.amountToInvest)}
                  </div>
                </div>
              </div>
              <div className="space-y-3 border-t border-white/8 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className={`${paceTone.accent} font-medium`}>{monthPaceLabel}</span>
                  <span className="text-muted-foreground">{daysRemaining} jours restants</span>
                </div>
                <div className="space-y-2">
                  <div className="relative h-3 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-white/10"
                      style={{ width: `${contributionProgress.expectedRatio}%` }}
                    />
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full ${paceTone.bar}`}
                      style={{ width: `${contributionProgress.actualRatio}%` }}
                    />
                    <div
                      className="absolute inset-y-[-4px] w-px bg-white/70"
                      style={{ left: `${Math.max(0, Math.min(contributionProgress.expectedRatio, 100))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>Progression du mois</span>
                    <span>{contributionProgress.actualRatio.toFixed(0)}% investi / {contributionProgress.expectedRatio.toFixed(0)}% attendu</span>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={TrendingUp} title="Next Month Preview">
            <div className="grid gap-5">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Total projeté</div>
                  <div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-white">
                    {formatCurrency(nextMonthTarget)}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-sm text-muted-foreground">Stratégie</div>
                  <div className="mt-1 text-lg font-semibold tracking-[-0.03em] text-slate-200">Incrément standard</div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-white/8 pt-4">
                <div>
                  <div className="text-sm text-muted-foreground">Incrément mensuel</div>
                  <div className="mt-1 text-lg font-semibold tracking-[-0.03em] text-white">
                    {formatCurrency(config.monthlyIncrement)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Mois écoulés</div>
                  <div className="mt-1 text-lg font-semibold tracking-[-0.03em] text-slate-200">{calculation.monthsElapsed}</div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
          <div className="rounded-[1rem] border border-white/8 bg-card p-4">
            <div className="mb-5 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <h3 className="text-base font-semibold tracking-[-0.02em] text-white">
                {isNextMonth ? "Next Month Suggestions" : "Suggestions du mois"}
              </h3>
              <span className="text-sm text-muted-foreground">Basé sur {formatCurrency(suggestionsAmount || config.monthlyIncrement)}</span>
            </div>

            {suggestions.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {suggestions.map((suggestion) => {
                  const allocation = suggestionsAmount > 0 ? (suggestion.suggestedAmount / suggestionsAmount) * 100 : 0;
                  const emoji = GEOGRAPHY_EMOJI[suggestion.category as Geography] ?? "📊";

                  return (
                    <div
                      key={`${suggestion.ticker}-${suggestion.category}`}
                      className="rounded-[0.95rem] border border-white/10 bg-background/30 p-4"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="line-clamp-2 text-sm font-semibold tracking-[-0.02em] text-white">
                            [ETF] {suggestion.instrumentName}
                          </div>
                        </div>
                        <div className="text-xl leading-none" title={suggestion.category}>
                          {emoji}
                        </div>
                      </div>
                      <div className="mb-4 text-sm text-slate-300">
                        Allocation: {allocation.toFixed(0)}% <span className="mx-1 text-white/20">|</span>
                        <span className="font-semibold text-white">{formatCurrency(suggestion.suggestedAmount)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{suggestion.ticker} · {suggestion.accountName}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[1rem] border border-dashed border-white/10 bg-white/3 px-4 py-8 text-center text-sm text-muted-foreground">
                Aucune suggestion pour le moment.
              </div>
            )}
          </div>

          <div className="rounded-[1rem] border border-white/8 bg-card p-4">
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h3 className="text-base font-semibold tracking-[-0.02em] text-white">
                Historical Performance <span className="text-sm text-muted-foreground">(6 derniers mois)</span>
              </h3>
              <div className="flex flex-wrap items-center gap-5 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-8 border-t-2 border-dashed border-white/50" />
                  <span>Trajectoire cible</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-[2px] w-8 bg-emerald-300" />
                  <span>Valeur réelle</span>
                </div>
              </div>
            </div>

            <div className="h-[250px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <XAxis
                      dataKey="date"
                      axisLine={{ stroke: "rgba(255,255,255,0.14)" }}
                      tickLine={false}
                      tick={{ fill: "rgba(203,213,225,0.86)", fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "rgba(203,213,225,0.86)", fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k €`}
                      orientation="right"
                      dx={10}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.96)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "18px",
                        boxShadow: "0 16px 40px rgba(2, 6, 23, 0.45)",
                      }}
                      itemStyle={{ color: "#f8fafc", fontSize: "13px", fontWeight: 600 }}
                      labelStyle={{ color: "rgba(203,213,225,0.86)", fontSize: "12px", marginBottom: "4px" }}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === "target" ? "Objectif" : "Valeur réelle",
                      ]}
                    />
                    <ReferenceLine y={calculation.targetValue} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 6" />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="rgba(226,232,240,0.72)"
                      strokeWidth={2}
                      strokeDasharray="6 6"
                      dot={false}
                      activeDot={{ r: 4, fill: "#f8fafc", stroke: "rgba(15,23,42,0.96)", strokeWidth: 2 }}
                      name="target"
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#7be0bb"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5, fill: "#7be0bb", stroke: "rgba(15,23,42,0.96)", strokeWidth: 2 }}
                      name="actual"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Données insuffisantes.
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
