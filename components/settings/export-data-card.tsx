"use client";

import * as React from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useHoldings } from "@/hooks/use-holdings";
import { downloadCsv } from "@/lib/csv-export";
import { downloadJson } from "@/lib/json-export";
import { displaySymbol } from "@/lib/utils";

type PendingImport = {
  raw: unknown;
  counts: {
    holdings: number;
    transactions: number;
    watchlistSections: number;
    watchlistItems: number;
  };
};

async function parseOrThrow(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function ExportDataCard() {
  const { holdings, isLoading } = useHoldings();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = React.useState<PendingImport | null>(null);
  const [isExportingBackup, setIsExportingBackup] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);

  async function handleExportBackup() {
    setIsExportingBackup(true);
    try {
      const response = await fetch("/api/account/export", { cache: "no-store" });
      const data = await parseOrThrow(response);
      downloadJson(`wealthfolio-backup-${format(new Date(), "yyyy-MM-dd")}.json`, data);
      toast.success("Account backup exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export account backup");
    } finally {
      setIsExportingBackup(false);
    }
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      setPendingImport({
        raw,
        counts: {
          holdings: Array.isArray(raw?.holdings) ? raw.holdings.length : 0,
          transactions: Array.isArray(raw?.transactions) ? raw.transactions.length : 0,
          watchlistSections: Array.isArray(raw?.watchlistSections) ? raw.watchlistSections.length : 0,
          watchlistItems: Array.isArray(raw?.watchlistItems) ? raw.watchlistItems.length : 0,
        },
      });
    } catch {
      toast.error("That file isn't valid JSON");
    }
  }

  async function handleConfirmImport() {
    if (!pendingImport) return;
    setIsImporting(true);
    try {
      const response = await fetch("/api/account/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingImport.raw),
      });
      const data = await parseOrThrow(response);
      const s = data.summary;
      toast.success(
        `Imported ${s.holdingsImported} holdings, ${s.transactionsImported} transactions, ${s.watchlistItemsImported} watchlist items`
      );
      setPendingImport(null);
      // Every page's data hooks seed from an in-memory cache that only
      // clears on a full reload — simplest way to guarantee holdings,
      // transactions, and watchlist all reflect the just-imported data.
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import account backup");
    } finally {
      setIsImporting(false);
    }
  }

  function handleExport() {
    const header = [
      "Symbol",
      "Name",
      "Quantity",
      "Avg Cost",
      "Price",
      "Market Value",
      "Invested",
      "Gain/Loss",
      "Gain/Loss %",
      "Notes",
    ];
    const rows = holdings.map((h) => [
      displaySymbol(h.symbol),
      h.name,
      h.quantity,
      h.avgCostBasis,
      h.price,
      h.marketValue.toFixed(2),
      h.costBasisTotal.toFixed(2),
      h.gainLoss.toFixed(2),
      h.gainLossPercent.toFixed(2),
      h.notes ?? "",
    ]);
    downloadCsv(`portfolio-${format(new Date(), "yyyy-MM-dd")}.csv`, header, rows);
    toast.success("Portfolio exported");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data &amp; export</CardTitle>
        <CardDescription>Export your holdings, or back up and restore your whole account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Button variant="outline" disabled={isLoading || holdings.length === 0} onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export portfolio as CSV
          </Button>
          {!isLoading && holdings.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Add a holding first to export your portfolio.
            </p>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium">Full account backup</p>
          <p className="text-xs text-muted-foreground">
            Exports every holding, transaction, and watchlist item/section as JSON — enough to
            fully restore your account by importing it back later.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" disabled={isExportingBackup} onClick={handleExportBackup}>
              <Download className="h-4 w-4" />
              {isExportingBackup ? "Exporting…" : "Export account backup"}
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Import account backup
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleFileSelected}
            />
          </div>
        </div>
      </CardContent>

      <AlertDialog open={!!pendingImport} onOpenChange={(open) => !open && setPendingImport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will add/update {pendingImport?.counts.holdings ?? 0} holdings,{" "}
              {pendingImport?.counts.transactions ?? 0} transactions,{" "}
              {pendingImport?.counts.watchlistSections ?? 0} watchlist sections, and{" "}
              {pendingImport?.counts.watchlistItems ?? 0} watchlist items in your account.
              <br />
              <br />
              Holdings and watchlist items already in your account with a matching symbol will be
              overwritten with the backup&apos;s values. Transactions are added, with exact
              duplicates skipped. This can&apos;t be undone automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport} disabled={isImporting}>
              {isImporting ? "Importing…" : "Import"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
