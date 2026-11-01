"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHoldings } from "@/hooks/use-holdings";
import { downloadCsv } from "@/lib/csv-export";
import { displaySymbol } from "@/lib/utils";

export function ExportDataCard() {
  const { holdings, isLoading } = useHoldings();

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
        <CardDescription>Export your holdings for use elsewhere.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" disabled={isLoading || holdings.length === 0} onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export portfolio as CSV
        </Button>
        {!isLoading && holdings.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Add a holding first to export your portfolio.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
