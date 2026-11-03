"use client";

import * as React from "react";
import { Plus, Search, Wallet } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkActionsBar } from "@/components/shared/bulk-actions-bar";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { HoldingFormSheet } from "@/components/portfolio/holding-form-sheet";
import { ClosePositionSheet, type ClosePositionInput } from "@/components/portfolio/close-position-sheet";
import { TransactionFormSheet } from "@/components/transactions/transaction-form-sheet";
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
import { useRegisterPageAction } from "@/lib/page-action-context";
import { cn, formatPercent } from "@/lib/utils";
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

  useRegisterPageAction(
    React.useMemo(() => ({ label: "Add holding", onClick: openAddSheet }), [])
  );

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
    <div className="pb-16 md:pb-0">
      <PageHeader
        title="Portfolio"
        description="Every position you hold, with live weight and performance."
        actions={
          <div className="flex items-center gap-2">
            {market === "US" && <CurrencyToggle />}
            {/* Mobile gets a compact "+" in the nav bar instead (see
                Header/PageActionProvider) — the iOS convention of an
                add action living in the nav bar, not a labeled button
                competing for space in the scrolling content. */}
            <Button onClick={openAddSheet} className="hidden md:inline-flex">
              <Plus className="h-4 w-4" />
              Add holding
            </Button>
          </div>
        }
      />

      {!isLoading && holdings.length > 0 && (
        // Zerodha Kite Holdings-screen summary card: Invested/Current on
        // top, a thin divider, then P&L with a colored percentage pill.
        <div className="mb-4 rounded-xl bg-muted/60 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Invested</p>
              <p className="mt-1 font-tabular text-xl font-semibold tracking-tight">
                {fmt(totalInvested)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="mt-1 font-tabular text-xl font-semibold tracking-tight">
                {fmt(totalMarketValue)}
              </p>
            </div>
          </div>
          <div className="my-3 border-t border-border" />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">P&amp;L</p>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-tabular text-xl font-semibold tracking-tight",
                  totalGainLoss >= 0 ? "text-positive" : "text-negative"
                )}
              >
                {fmt(totalGainLoss, { signDisplay: "always" })}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  totalGainLoss >= 0 ? "bg-positive-muted text-positive" : "bg-negative-muted text-negative"
                )}
              >
                {formatPercent(totalGainLossPercent)}
              </span>
            </div>
          </div>
        </div>
      )}

      {!isLoading && holdings.length > 0 && (
        <div className="relative mb-4 hidden max-w-sm md:block">
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

      {!isLoading && holdings.length > 0 && (
        // Pinned above the mobile tab bar, full-bleed edge-to-edge like
        // Kite's bar (not a floating rounded card) — kept visible while
        // scrolling the list instead of sitting at the bottom of the
        // content. Desktop has no tab bar to clear, so it stays inline there.
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between bg-muted/90 px-4 py-3 backdrop-blur-sm md:static md:inset-auto md:z-auto md:mt-3 md:rounded-lg md:bg-muted/60 md:backdrop-blur-none">
          <p className="text-sm text-muted-foreground">Day&apos;s P&amp;L</p>
          <p className="flex items-baseline gap-2">
            <span
              className={cn(
                "font-tabular text-sm font-semibold",
                totalDayChange >= 0 ? "text-positive" : "text-negative"
              )}
            >
              {fmtSigned(totalDayChange)}
            </span>
            <span
              className={cn(
                "font-tabular text-xs font-medium",
                totalDayChange >= 0 ? "text-positive" : "text-negative"
              )}
            >
              {formatPercent(totalDayChangePercent)}
            </span>
          </p>
        </div>
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
