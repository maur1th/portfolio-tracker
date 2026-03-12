"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, PieChart } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { ExposureBreakdown } from "@/lib/exposure";
import { EtfWeightsRefreshButton } from "./etf-weights-refresh-button";

interface ExposureChartsProps {
  exposure: ExposureBreakdown;
  lastCountryWeightsFetchDate: string | null;
  geoTargets: Record<string, number>;
  capTargets: Record<string, number>;
}

interface BreakdownItem {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export function ExposureCharts({ exposure, lastCountryWeightsFetchDate, geoTargets, capTargets }: ExposureChartsProps) {
  const [showValues, setShowValues] = useState(true);
  const { geography, assetClass, marketCap, unmatchedCapEtfs, unmatchedGeoEtfs, totalValueEur } = exposure;

  // Geography: exclude "Non classé" (commodities, money market) and compute % relative to equity total
  const equityGeoEntries = Object.entries(geography).filter(
    ([label]) => label !== "Non classé"
  );
  const equityGeoTotal = equityGeoEntries.reduce((sum, [, v]) => sum + v, 0);
  const geographyItems: BreakdownItem[] = equityGeoEntries
    .map(([label, value]) => ({
      label,
      value,
      percentage: equityGeoTotal > 0 ? (value / equityGeoTotal) * 100 : 0,
      color: getGeographyColor(label),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // Convert asset class to sorted array
  const assetClassItems: BreakdownItem[] = Object.entries(assetClass)
    .map(([label, value]) => ({
      label,
      value,
      percentage: totalValueEur > 0 ? (value / totalValueEur) * 100 : 0,
      color: getAssetClassColor(label),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // Market cap: exclude "N/A" (stocks, non-equity) and compute % relative to equity ETF total
  const equityCapEntries = Object.entries(marketCap).filter(
    ([label]) => label !== "N/A"
  );
  const equityCapTotal = equityCapEntries.reduce((sum, [, v]) => sum + v, 0);
  const marketCapItems: BreakdownItem[] = equityCapEntries
    .map(([label, value]) => ({
      label,
      value,
      percentage: equityCapTotal > 0 ? (value / equityCapTotal) * 100 : 0,
      color: getMarketCapColor(label),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  if (totalValueEur === 0) {
    return null;
  }

  return (
    <Card className="bg-dash-panel border-dash-border shadow-dash-panel overflow-hidden">
      <CardHeader className="flex flex-col gap-4 border-b border-white/8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-border bg-[hsl(var(--surface-muted))] p-2">
            <PieChart className="h-4 w-4 text-emerald-300" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold tracking-[-0.03em] text-white">
              Exposition du portefeuille
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Répartition par classe d&apos;actif, géographie et capitalisation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowValues((v) => !v)}
            title={showValues ? "Masquer les montants" : "Afficher les montants"}
          >
            {showValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <EtfWeightsRefreshButton lastFetchedAt={lastCountryWeightsFetchDate} />
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <ExposureSection title="Classe d'actif" items={assetClassItems} showValues={showValues} />
          <ExposureSection
            title="Actions / Géographie"
            items={geographyItems}
            showValues={showValues}
            targets={geoTargets}
          />
          <ExposureSection
            title="Actions / Capitalisation"
            items={marketCapItems}
            showValues={showValues}
            targets={capTargets}
          />
        </div>
        {(unmatchedCapEtfs.length > 0 || unmatchedGeoEtfs.length > 0) && (
          <div className="mt-5 rounded-[1rem] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {unmatchedGeoEtfs.length > 0 && (
              <div>
                <p className="font-medium mb-1">Géographie non classée :</p>
                <ul className="list-disc list-inside text-xs text-yellow-200/80">
                  {unmatchedGeoEtfs.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            )}
            {unmatchedCapEtfs.length > 0 && (
              <div className={unmatchedGeoEtfs.length > 0 ? "mt-2" : ""}>
                <p className="font-medium mb-1">Capitalisation estimée (85/15/0) :</p>
                <ul className="list-disc list-inside text-xs text-yellow-200/80">
                  {unmatchedCapEtfs.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ExposureSectionProps {
  title: string;
  items: BreakdownItem[];
  targets?: Record<string, number>;
  showValues: boolean;
}

function ExposureSection({ title, items, targets, showValues }: ExposureSectionProps) {
  return (
    <div className="bg-dash-subtle rounded-[1.2rem] border border-white/10 p-5">
      <h3 className="mb-5 text-lg font-semibold tracking-[-0.03em] text-white">
        {title}
      </h3>
      <div className="space-y-5">
        {items.map((item) => {
          const target = targets?.[item.label];
          return (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-white">
                  {item.label}
                  {target != null && (
                    <span className="text-dash-faint ml-1 text-xs font-normal">
                      (cible {target} %)
                    </span>
                  )}
                </span>
                <span className="text-dash-soft">
                  {formatPercent(item.percentage / 100)}
                </span>
              </div>
              <div className="bg-dash-track relative mb-2 h-3 w-full rounded-full">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, item.percentage)}%`,
                    backgroundColor: item.color,
                  }}
                />
                {target != null && (
                  <div
                    className="absolute top-[-2px] h-4 w-0.5 rounded-full bg-white/70"
                    style={{ left: `${Math.min(100, target)}%` }}
                    title={`Cible : ${target} %`}
                  />
                )}
              </div>
              {showValues && (
                <div className="text-dash-soft text-sm">
                  {formatCurrency(item.value)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getGeographyColor(geography: string): string {
  const colors: Record<string, string> = {
    US: "rgb(59, 130, 246)", // blue-500
    Europe: "rgb(34, 197, 94)", // green-500
    Monde: "rgb(168, 85, 247)", // purple-500
    Émergents: "rgb(251, 146, 60)", // orange-500
    Japon: "rgb(236, 72, 153)", // pink-500
    "Asie-Pacifique": "rgb(14, 165, 233)", // sky-500
    UK: "rgb(99, 102, 241)", // indigo-500
    "Non classé": "rgb(156, 163, 175)", // gray-400
  };
  return colors[geography] || colors["Non classé"];
}

function getAssetClassColor(assetClass: string): string {
  const colors: Record<string, string> = {
    Actions: "rgb(34, 197, 94)", // green-500
    Obligations: "rgb(59, 130, 246)", // blue-500
    "Matières premières": "rgb(234, 179, 8)", // yellow-500
    Immobilier: "rgb(168, 85, 247)", // purple-500
    Monétaire: "rgb(14, 165, 233)", // sky-500
    "Non classé": "rgb(156, 163, 175)", // gray-400
  };
  return colors[assetClass] || colors["Non classé"];
}

function getMarketCapColor(marketCap: string): string {
  const colors: Record<string, string> = {
    "Large Cap": "rgb(34, 197, 94)", // green-500
    "Mid Cap": "rgb(59, 130, 246)", // blue-500
    "Small Cap": "rgb(251, 146, 60)", // orange-500
    "N/A": "rgb(156, 163, 175)", // gray-400
  };
  return colors[marketCap] || colors["N/A"];
}
