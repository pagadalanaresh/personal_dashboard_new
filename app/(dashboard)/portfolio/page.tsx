"use client";

import * as React from "react";
import { DollarSign, IndianRupee, Plus, Search, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkActionsBar } from "@/components/shared/bulk-actions-bar";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { HoldingFormSheet } from "@/components/portfolio/holding-form-sheet";
import { ClosePositionSheet, type ClosePositionInput } from "@/components/portfolio/close-position-sheet";
import { TransactionFormSheet } from "@/components/transactions/transaction-form-sheet";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useHoldings } from "@/hooks/use-holdings";
import { useTransactions } from "@/hooks/use-transactions";
import { CurrencyToggle } from "@/components/shared/currency-toggle";
import { useMarket } from "@/lib/market-context";
import { formatPercent } from "@/lib/utils";
import type { EnrichedHolding } from "@/lib/holdings";

async function parseOrThrow(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export default function PortfolioPage() {
  const { market, format: fmt, formatSigned: fmtSigned } = useMarket();
  const { holdings, isLoading, addHolding, updateHolding, deleteHolding, deleteHoldings, refresh } =
    useHoldings();
  const { addTransaction } = useTransactions();
  const [search, setSearch] = React.useState("");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingHolding, setEditingHolding] = React.useState<EnrichedHolding | null>(null);
  const [closingHolding, setClosingHolding] = React.useState<EnrichedHolding | null>(null);
  const [addingSharesTo, setAddingSharesTo] = React.useState<EnrichedHolding | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<EnrichedHolding | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);

  const filteredHoldings = holdings.filter((h) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return h.symbol.toLowerCase().includes(q) || h.name.toLowerCase().includes(q);
  });

  const totalMarketValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const totalInvested = holdings.reduce((sum, h) => sum + h.costBasisTotal, 0);
  const totalGainLoss = totalMarketValue - totalInvested;
  const totalGainLossPercent = totalInvested === 0 ? 0 : (totalGainLoss / totalInvested) * 100;
  const totalDayChange = holdings.reduce((sum, h) => sum + h.dayChange, 0);
  const previousTotal = totalMarketValue - totalDayChange;
  const totalDayChangePercent = previousTotal === 0 ? 0 : (totalDayChange / previousTotal) * 100;

  function openAddSheet() {
    setEditingHolding(null);
    setSheetOpen(true);
  }

  function openEditSheet(holding: EnrichedHolding) {
    setEditingHolding(holding);
    setSheetOpen(true);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids: string[]) {
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await deleteHolding(pendingDelete.id);
      toast.success(`Removed ${pendingDelete.symbol}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove holding");
    } finally {
      setPendingDelete(null);
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    try {
      await deleteHoldings(ids);
      toast.success(`Removed ${ids.length} holding${ids.length === 1 ? "" : "s"}`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove holdings");
    } finally {
      setBulkDeleteOpen(false);
    }
  }

  async function handleSaveNotes(holding: EnrichedHolding, notes: string) {
    await updateHolding(holding.id, {
      symbol: holding.symbol,
      name: holding.name,
      quantity: holding.quantity,
      avgCostBasis: holding.avgCostBasis,
      position: holding.position,
      notes,
    });
  }

  // Closing a position is just logging a sell transaction — the existing
  // transaction ledger (which already drives Holdings and Closed Positions)
  // takes care of recomputing or removing the holding.
  async function handleClosePosition(input: ClosePositionInput) {
    if (!closingHolding) return;
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: closingHolding.symbol,
        name: closingHolding.name,
        type: "SELL",
        quantity: input.quantity,
        price: input.price,
        position: closingHolding.position,
        market: closingHolding.market,
        date: input.closeDate,
      }),
    });
    await parseOrThrow(response);
    await refresh();
  }

  return (
    <div>
      <PageHeader
        description="Every position you hold, with live weight and performance."
        actions={
          <div className="flex items-center gap-2">
            {market === "US" && <CurrencyToggle />}
            <Button onClick={openAddSheet}>
              <Plus className="h-4 w-4" />
              Add holding
            </Button>
          </div>
        }
      />

      {!isLoading && holdings.length > 0 && (
        <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Total gain / loss"
            value={fmt(totalGainLoss, { signDisplay: "always" })}
            changeValue={totalGainLossPercent}
            changeFormatted={formatPercent(totalGainLossPercent)}
            icon={totalGainLoss >= 0 ? TrendingUp : TrendingDown}
          />
          <MetricCard
            title="Today's change"
            value={fmtSigned(totalDayChange)}
            changeValue={totalDayChangePercent}
            changeFormatted={formatPercent(totalDayChangePercent)}
            icon={totalDayChange >= 0 ? TrendingUp : TrendingDown}
          />
          <MetricCard
            title="Total invested"
            value={fmt(totalInvested)}
            icon={market === "US" ? DollarSign : IndianRupee}
          />
        </div>
      )}

      {!isLoading && holdings.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by symbol or name"
            className="pl-9"
          />
        </div>
      )}

      {!isLoading && holdings.length > 0 && (
        <BulkActionsBar
          count={selectedIds.size}
          onDelete={() => setBulkDeleteOpen(true)}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : holdings.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No holdings yet"
          description="Add your first position to start tracking performance, allocation, and gain/loss."
          action={
            <Button onClick={openAddSheet}>
              <Plus className="h-4 w-4" />
              Add your first holding
            </Button>
          }
        />
      ) : filteredHoldings.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description={`Nothing matches "${search}". Try a different symbol or name.`}
        />
      ) : (
        <HoldingsTable
          holdings={filteredHoldings}
          totalMarketValue={totalMarketValue}
          onAddShares={setAddingSharesTo}
          onEdit={openEditSheet}
          onClose={setClosingHolding}
          onDelete={setPendingDelete}
          onSaveNotes={handleSaveNotes}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
        />
      )}

      <HoldingFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        holding={editingHolding}
        onSubmit={(input) =>
          editingHolding ? updateHolding(editingHolding.id, input) : addHolding(input)
        }
      />

      <ClosePositionSheet
        open={!!closingHolding}
        onOpenChange={(open) => !open && setClosingHolding(null)}
        holding={closingHolding}
        onSubmit={handleClosePosition}
      />

      <TransactionFormSheet
        open={!!addingSharesTo}
        onOpenChange={(open) => !open && setAddingSharesTo(null)}
        holdings={holdings}
        onSubmit={(input) =>
          addTransaction(
            addingSharesTo ? { ...input, position: addingSharesTo.position } : input
          ).then(refresh)
        }
        defaultSymbol={
          addingSharesTo
            ? { symbol: addingSharesTo.symbol, name: addingSharesTo.name, price: addingSharesTo.price }
            : undefined
        }
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingDelete?.symbol}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the position from your portfolio. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selectedIds.size} holdings?</AlertDialogTitle>
            <AlertDialogDescription>
              These positions will be removed from your portfolio. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
