"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { Account } from "@/types";
import type { ParsedPosition } from "@/lib/csv-parsers/types";
import { Plus, Trash2 } from "lucide-react";

interface AccountWithBroker extends Account {
  brokerName: string;
}

interface PositionRow {
  isin: string;
  name: string;
  quantity: string;
  avgCostPerUnit: string;
  currency: string;
}

const emptyRow = (): PositionRow => ({
  isin: "",
  name: "",
  quantity: "",
  avgCostPerUnit: "",
  currency: "EUR",
});

interface ManualPositionEntryProps {
  accounts: AccountWithBroker[];
}

export function ManualPositionEntry({ accounts }: ManualPositionEntryProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [accountId, setAccountId] = useState<string>("");
  const [rows, setRows] = useState<PositionRow[]>([emptyRow()]);
  const [loading, setLoading] = useState(false);

  const updateRow = (index: number, field: keyof PositionRow, value: string) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (index: number) => {
    setRows((prev) => (prev.length === 1 ? [emptyRow()] : prev.filter((_, i) => i !== index)));
  };

  const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

  const isFormValid = () => {
    if (!accountId) return false;
    return rows.every(
      (r) =>
        ISIN_RE.test(r.isin.trim().toUpperCase()) &&
        r.name.trim() !== "" &&
        parseFloat(r.quantity) > 0 &&
        parseFloat(r.avgCostPerUnit) > 0
    );
  };

  const parsedPositions: ParsedPosition[] = useMemo(
    () =>
      rows.map((r) => ({
        isin: r.isin.trim(),
        name: r.name.trim(),
        quantity: parseFloat(r.quantity),
        avgCostPerUnit: parseFloat(r.avgCostPerUnit),
        currency: r.currency || "EUR",
      })),
    [rows],
  );

  const handleImport = async () => {
    if (!accountId || parsedPositions.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: parseInt(accountId),
          positions: parsedPositions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.details && Array.isArray(error.details)) {
          toast.error(error.error + ": " + error.details.join("; "));
        } else {
          toast.error(error.error || "Échec de l'import");
        }
        return;
      }

      const data = await response.json();
      if (data.errors && data.errors.length > 0) {
        toast.warning(data.message);
      } else {
        toast.success(data.message);
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Échec de l'import");
    } finally {
      setLoading(false);
    }
  };

  if (accounts.length === 0) return null;

  return (
    <div className="space-y-6">
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Saisie manuelle des positions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-account">Compte</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="manual-account">
                  <SelectValue placeholder="Sélectionner un compte" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.brokerName} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {rows.map((row, index) => (
                <div key={index} className="grid grid-cols-[1fr_1.5fr_0.7fr_0.7fr_0.5fr_auto] gap-2 items-end">
                  {index === 0 && (
                    <>
                      <Label className="text-xs text-muted-foreground">ISIN</Label>
                      <Label className="text-xs text-muted-foreground">Nom</Label>
                      <Label className="text-xs text-muted-foreground">Quantité</Label>
                      <Label className="text-xs text-muted-foreground">Px. Revient</Label>
                      <Label className="text-xs text-muted-foreground">Devise</Label>
                      <div />
                    </>
                  )}
                  <Input
                    placeholder="LU1781541252"
                    value={row.isin}
                    onChange={(e) => updateRow(index, "isin", e.target.value)}
                  />
                  <Input
                    placeholder="Amundi Core MSCI Japan"
                    value={row.name}
                    onChange={(e) => updateRow(index, "name", e.target.value)}
                  />
                  <Input
                    type="number"
                    step="any"
                    placeholder="24.5932"
                    value={row.quantity}
                    onChange={(e) => updateRow(index, "quantity", e.target.value)}
                  />
                  <Input
                    type="number"
                    step="any"
                    placeholder="20.33"
                    value={row.avgCostPerUnit}
                    onChange={(e) => updateRow(index, "avgCostPerUnit", e.target.value)}
                  />
                  <Input
                    placeholder="EUR"
                    value={row.currency}
                    onChange={(e) => updateRow(index, "currency", e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(index)}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter une ligne
            </Button>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 font-semibold">
                ⚠️ Attention
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                L&apos;import remplacera toutes les positions existantes pour ce compte.
              </p>
            </div>

            <Button onClick={() => setStep(2)} disabled={!isFormValid()}>
              Vérifier
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Vérifier les positions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>ISIN</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                    <TableHead className="text-right">Px. Revient</TableHead>
                    <TableHead>Devise</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedPositions.map((pos, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{pos.name}</TableCell>
                      <TableCell className="font-mono text-sm">{pos.isin || "-"}</TableCell>
                      <TableCell className="text-right">{pos.quantity}</TableCell>
                      <TableCell className="text-right">{pos.avgCostPerUnit.toFixed(2)}</TableCell>
                      <TableCell>{pos.currency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={loading}>
                {loading ? "Import en cours..." : `Importer ${parsedPositions.length} position${parsedPositions.length > 1 ? "s" : ""}`}
              </Button>
              <Button variant="outline" onClick={() => setStep(1)}>
                Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
