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
import { AlertCircle, TrendingUp, Target, Calendar, Activity, CheckCircle2, Flag, Pencil, Bell, User } from "lucide-react";
import type { DcaSuggestion } from "@/lib/dca-suggestions";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

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

  const variance = calculation.currentValue - calculation.targetValue;
  const varianceIsPositive = variance >= 0;

  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysInMonth = lastDay.getDate();
  const daysRemaining = daysInMonth - today.getDate();
  const daysProgress = ((today.getDate() / daysInMonth) * 100);

  const chartData = snapshotHistory.slice(-6).map(snapshot => ({
    date: new Date(snapshot.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    target: computeTargetForSnapshot(config, snapshot.date, snapshotHistory),
    actual: snapshot.totalValueEur,
  }));

  const maxValue = Math.max(calculation.currentValue, calculation.targetValue);
  const targetRatio = (calculation.targetValue / maxValue) * 100;
  const currentRatio = (calculation.currentValue / maxValue) * 100;

  return (
    <Card className="bg-[#0b0e14] border-slate-800/60 text-slate-50 overflow-hidden font-sans rounded-lg shadow-xl">
      <CardHeader className="border-b border-slate-800/60 flex flex-row items-center justify-between py-3 px-5 space-y-0">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-slate-300" />
          <CardTitle className="text-sm font-semibold text-slate-200">Pulse</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Header Banner */}
        <div className="px-5 py-4 border-b border-slate-800/60 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[15px] font-bold tracking-tight flex items-center gap-2 whitespace-nowrap">
            Status: <span className={calculation.onTrack ? "text-emerald-400 font-normal" : "text-amber-400 font-normal"}>{calculation.onTrack ? "Ahead of Target" : "Behind Target"}</span>
          </div>
          
          {/* Custom Progress Bar */}
          <div className="flex-1 mx-4 relative hidden md:block mt-6">
            <div className="w-full h-1 bg-muted rounded-full flex overflow-hidden">
              <div 
                className={`h-full ${calculation.onTrack ? "bg-emerald-500/80" : "bg-amber-500/80"}`} 
                style={{ width: `${currentRatio}%` }}
              ></div>
            </div>
            {/* Target Marker */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center" 
              style={{ left: `${targetRatio}%`, transform: `translate(-50%, -50%)` }}
            >
              <div className="w-2.5 h-2.5 bg-card rounded-full flex items-center justify-center z-10 border border-emerald-400">
                <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
              </div>
              <div className="absolute -top-5">
                 <Flag className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-[15px] font-bold tracking-tight whitespace-nowrap">
              To Invest: <span className={calculation.amountToInvest === 0 ? "text-emerald-400 font-normal" : "text-amber-400 font-normal"}>{formatCurrency(calculation.amountToInvest)}</span>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEdit} 
              className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white rounded-full h-7 px-3 text-xs font-medium"
            >
              <Pencil className="w-3 h-3 mr-1.5" /> Modifier
            </Button>
          </div>
        </div>
        
        {!hasSnapshotThisMonth && (
          <div className="px-5 pt-4">
            <Alert className="bg-slate-900/50 border-slate-800 text-slate-300">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <AlertDescription>
                Prix non actualisés depuis le {latestSnapshotDate || "jamais"}.
                Actualisez les prix pour un calcul précis.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Top 3 Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800/60 border-b border-slate-800/60">
          {/* Current Standings */}
          <div className="p-5">
            <div className="flex items-center gap-2 text-slate-300 mb-5">
              <Target className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Current Standings</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[12px] text-slate-400 mb-1 font-medium">Current Value</div>
                <div className="text-[28px] font-bold tracking-tight leading-none">{formatCurrency(calculation.currentValue)}</div>
              </div>
              <div className="flex justify-between items-end border-t border-slate-800/60 pt-4">
                <div>
                  <div className="text-[12px] text-slate-400 mb-1 font-medium">Target Path</div>
                  <div className="text-[14px] font-semibold">{formatCurrency(calculation.targetValue)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] text-slate-400 mb-1 font-medium text-right">Variance</div>
                  <div className={`text-[14px] font-semibold flex items-center justify-end gap-1 ${varianceIsPositive ? "text-emerald-400" : "text-rose-400"}`}>
                    {varianceIsPositive ? "+" : ""}{formatCurrency(variance)}
                    {varianceIsPositive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Activity */}
          <div className="p-5">
            <div className="flex items-center gap-2 text-slate-300 mb-5">
              <Activity className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Monthly Activity</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[12px] text-slate-400 mb-1 font-medium">Invested this Month</div>
                <div className="text-[28px] font-bold tracking-tight leading-none">{formatCurrency(contributionsThisMonth)}</div>
              </div>
              <div className="flex flex-col gap-2 border-t border-slate-800/60 pt-4">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[12px] text-slate-400 mb-1 font-medium">Target Remaining</div>
                    <div className="text-[14px] font-semibold">{formatCurrency(calculation.amountToInvest)}</div>
                  </div>
                </div>
                <div className="pt-2">
                   <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5 font-medium">
                     <span>Days Remaining</span>
                     <span>{daysRemaining} days remaining</span>
                   </div>
                   <div className="h-[4px] bg-muted rounded-full overflow-hidden">
                     <div className="h-full bg-slate-500 rounded-full" style={{ width: `${daysProgress}%` }}></div>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Month Preview */}
          <div className="p-5">
            <div className="flex items-center gap-2 text-slate-300 mb-5">
              <TrendingUp className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Next Month Preview</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[12px] text-slate-400 mb-1 font-medium">Projected Total</div>
                <div className="text-[28px] font-bold tracking-tight leading-none">{formatCurrency(config.monthlyIncrement)}</div>
              </div>
              <div className="flex justify-between items-end border-t border-slate-800/60 pt-4">
                 <div>
                   <div className="text-[12px] text-slate-400 mb-1 font-medium">Strategy</div>
                   <div className="text-[14px] font-semibold">Standard Increment</div>
                 </div>
                 <div className="text-right">
                   <div className="text-[12px] text-slate-400 mb-1 font-medium text-right">Status</div>
                   <div className="text-[14px] font-semibold">Pending</div>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] divide-y md:divide-y-0 md:divide-x divide-slate-800/60">
          {/* Suggestions */}
          <div className="p-5 bg-slate-900/40">
             <div className="flex items-center gap-2 mb-1">
               <CheckCircle2 className="w-4 h-4 text-slate-300" />
               <h3 className="text-[14px] font-semibold">Next Month Suggestions</h3>
             </div>
             <div className="text-[13px] text-slate-400 mb-4 ml-6 font-medium">- Based on {formatCurrency(config.monthlyIncrement)} monthly increment</div>
             
             <div className="space-y-0 flex flex-col">
               {suggestions.length > 0 ? suggestions.map((s, idx) => {
                  const allocation = suggestionsAmount > 0 ? (s.suggestedAmount / suggestionsAmount) * 100 : 0;
                  return (
                    <div key={`${s.ticker}-${s.category}`} className={`py-4 ${idx !== suggestions.length - 1 ? 'border-b border-slate-800/60' : ''}`}>
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-bold text-[13px] line-clamp-1 mr-2" title={s.instrumentName}>[ETF] {s.instrumentName}</span>
                        <span className="text-base leading-none" title={s.category}>
                          {s.category.toLowerCase().includes('europ') ? '🇪🇺' : s.category.toLowerCase().includes('asie') || s.category.toLowerCase().includes('asia') ? '🇨🇳' : '🌎'}
                        </span>
                      </div>
                      <div className="text-[12px] text-slate-400 mb-1 font-medium">
                        Allocation: {allocation.toFixed(0)}% <span className="mx-1 text-slate-600">|</span> <span className="font-bold text-slate-50">{formatCurrency(s.suggestedAmount)}</span>
                      </div>
                      <div className="text-[12px] text-slate-500 font-medium">
                        {s.ticker} • {s.accountName}
                      </div>
                    </div>
                  )
               }) : (
                 <div className="text-sm text-slate-500 py-4 text-center">Aucune suggestion pour le moment.</div>
               )}
             </div>
          </div>

          {/* Chart */}
          <div className="p-5 flex flex-col">
             <div className="mb-6">
               <h3 className="text-[14px] font-semibold inline-block">
                 Historical Performance <span className="text-[13px] text-slate-400 ml-1 font-medium">(Last 6 months)</span>
               </h3>
               
               <div className="flex items-center justify-start md:justify-between w-full text-[12px] text-slate-400 font-medium mt-3">
                 <div className="flex items-center gap-6">
                   <div className="flex items-center gap-2">
                     <div className="w-5 h-0 border-t-[2px] border-dashed border-emerald-500/80"></div>
                     <span>Value Averaging Target Path</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="w-5 h-[2px] bg-emerald-400"></div>
                     <span>Actual Portfolio Value</span>
                   </div>
                 </div>
               </div>
             </div>
             
             <div className="flex-1 min-h-[220px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis 
                        dataKey="date" 
                        axisLine={{ stroke: '#1e293b', strokeWidth: 1 }} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                        dy={10} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k €`} 
                        orientation="right" 
                        dx={10} 
                        domain={['auto', 'auto']}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0b0e14', border: '1px solid #1e293b', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)' }}
                        itemStyle={{ color: '#f8fafc', fontSize: '13px', fontWeight: 600 }}
                        labelStyle={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px', fontWeight: 500 }}
                        formatter={(value: number, name: string) => [
                          formatCurrency(value), 
                          name === 'target' ? 'Target Path' : 'Actual Value'
                        ]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="target" 
                        stroke="#10b981" 
                        strokeWidth={2} 
                        strokeDasharray="4 4" 
                        dot={false} 
                        activeDot={{ r: 4, fill: '#10b981', stroke: '#0b0e14', strokeWidth: 2 }}
                        name="target" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="actual" 
                        stroke="#34d399" 
                        strokeWidth={2} 
                        dot={false} 
                        activeDot={{ r: 4, fill: '#34d399', stroke: '#0b0e14', strokeWidth: 2 }}
                        name="actual" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
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
