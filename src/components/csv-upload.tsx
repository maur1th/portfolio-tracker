"use client";

import { useState } from "react";
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
import type { ParsedPosition, ParsedTransaction, BrokerType } from "@/lib/csv-parsers/types";
import { parseBoursobankCSV } from "@/lib/csv-parsers/boursobank";
import { parseIBKRTransactions, computePositionsFromTransactions } from "@/lib/csv-parsers/ibkr-transactions";

interface AccountWithBroker extends Account {
  brokerName: string;
}

interface CSVUploadProps {
  accounts: AccountWithBroker[];
}

export function CSVUpload({ accounts }: CSVUploadProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [accountId, setAccountId] = useState<string>("");
  const [parsedPositions, setParsedPositions] = useState<ParsedPosition[]>([]);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedAccount = accounts.find(
    (a) => a.id === parseInt(accountId)
  );

  const brokerType: BrokerType | "" = selectedAccount
    ? selectedAccount.brokerName === "Boursobank"
      ? "boursobank"
      : "ibkr"
    : "";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !brokerType || !accountId) return;

    const content = await file.text();

    try {
      if (brokerType === "boursobank") {
        const positions = parseBoursobankCSV(content);
        if (positions.length === 0) {
          toast.error("Aucune position trouvée dans le fichier");
          return;
        }
        setParsedPositions(positions);
        setParsedTransactions([]);
      } else if (brokerType === "ibkr") {
        const txns = parseIBKRTransactions(content);
        if (txns.length === 0) {
          toast.error("Aucune transaction trouvée dans le fichier");
          return;
        }
        const positions = computePositionsFromTransactions(txns);
        setParsedTransactions(txns);
        setParsedPositions(positions);
      } else {
        throw new Error("Unknown broker type");
      }

      setStep(2);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'analyse du fichier CSV");
    }
  };

  const handleImport = async () => {
    if (!accountId || parsedPositions.length === 0) return;

    setLoading(true);

    const isTransactionImport = brokerType === "ibkr" && parsedTransactions.length > 0;

    try {
      const url = isTransactionImport ? "/api/import-transactions" : "/api/import";
      const payload = isTransactionImport
        ? { accountId: parseInt(accountId), transactions: parsedTransactions }
        : { accountId: parseInt(accountId), positions: parsedPositions };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.details && Array.isArray(error.details)) {
          console.error("Import errors:", error.details);
          toast.error(error.error + ": " + error.details.join("; "));
        } else {
          toast.error(error.error || "Failed to import positions");
        }
        return;
      }

      const data = await response.json();
      console.log("Import result:", data);

      if (data.errors && data.errors.length > 0) {
        console.warn("Import warnings:", data.errors);
        toast.warning(data.message);
      } else {
        toast.success(data.message);
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to import positions"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Étape 1: Sélectionner le compte et le fichier CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account">Compte</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="account">
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

            <div className="space-y-2">
              <Label htmlFor="file">Fichier CSV</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={!accountId}
              />
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 font-semibold">
                ⚠️ Attention
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                {brokerType === "ibkr"
                  ? "Les nouvelles transactions seront ajoutées (les doublons sont ignorés). Les positions seront recalculées."
                  : "L'import remplacera toutes les positions existantes pour ce compte."}
              </p>
            </div>

            {brokerType && (
              <div className="p-4 bg-muted/50 border rounded-md space-y-2">
                <p className="text-sm font-semibold">Comment obtenir le fichier CSV ?</p>
                {brokerType === "boursobank" ? (
                  <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                    <li>Se connecter sur <span className="font-medium">boursobank.com</span></li>
                    <li>Aller dans <span className="font-medium">Patrimoine &gt; {selectedAccount?.name === "PEA" ? "PEA" : "Compte-Titres"}</span></li>
                    <li>Cliquer sur <span className="font-medium">Exporter en CSV</span> (icône en haut à droite du tableau des positions)</li>
                  </ol>
                ) : (
                  <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                    <li>Se connecter sur <span className="font-medium">IBKR Portal</span></li>
                    <li>Aller dans <span className="font-medium">Performance & Reports &gt; Flex Queries</span></li>
                    <li>Lancer la Flex Query <span className="font-medium">Transaction History</span> au format CSV</li>
                  </ol>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Étape 2: Vérifier les positions importées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {parsedTransactions.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {parsedTransactions.length} transactions analysées — {parsedPositions.length} position{parsedPositions.length > 1 ? "s" : ""} calculée{parsedPositions.length > 1 ? "s" : ""}
              </p>
            )}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>ISIN</TableHead>
                    <TableHead>Ticker</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                    <TableHead className="text-right">PRU</TableHead>
                    <TableHead>Devise</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedPositions.map((pos, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{pos.name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {pos.isin || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {pos.ticker || "-"}
                      </TableCell>
                      <TableCell className="text-right">{pos.quantity}</TableCell>
                      <TableCell className="text-right">
                        {pos.avgCostPerUnit.toFixed(2)}
                      </TableCell>
                      <TableCell>{pos.currency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={loading}>
                {loading ? "Import en cours..." : `Importer ${parsedPositions.length} positions`}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setParsedPositions([]);
                  setParsedTransactions([]);
                }}
              >
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
