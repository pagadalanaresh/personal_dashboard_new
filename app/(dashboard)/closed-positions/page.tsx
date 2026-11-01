"use client";

import * as React from "react";
import { format } from "date-fns";
import { Archive, DollarSign, IndianRupee, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkActionsBar } from "@/components/shared/bulk-actions-bar";
import { ClosedPositionsTable } from "@/components/portfolio/closed-positions-table";
import { ClosedPositionsChart } from "@/components/portfolio/closed-positions-chart";
import { MetricCard } from "@/components/dashboard/metric-card";
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
import { useClosedPositions } from "@/hooks/use-closed-positions";
import { CurrencyToggle } from "@/components/shared/currency-toggle";
import { useMarket } from "@/lib/market-context";
import { displaySymbol, formatPercent } from "@/lib/utils";
import type { ClosedPosition } from "@/lib/closed-positions";

function keyFor(position: ClosedPosition) {
  return position.transactionIds.join(",");
}

// A partial sell's transactionIds is just the one sell tx (see
// lib/closed-positions.ts) — only a position's final close carries the
// whole episode's buys and sells.
function isPartialSell(position: ClosedPosition) {
  return position.transactionIds.length === 1;
}

export default function ClosedPositionsPage() {
  const { market, format: fmt } = useMarket();
  const { positions, isLoading, deletePositions, updateNotes } = useClosedPositions();
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = React.useState<ClosedPosition | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);

  const totalRealizedPL = positions.reduce((sum, p) => sum + p.realizedPL, 0);
  const totalInvested = positions.reduce((sum, p) => sum + p.totalInvested, 0);
  const totalRealizedPLPercent = totalInvested === 0 ? 0 : (totalRealizedPL / totalInvested) * 100;

  const visiblePositions = selectedKey
    ? positions.filter((p) => keyFor(p) === selectedKey)
    : positions;

  function toggleSelect(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectAll(keys: string[]) {
    setSelectedKeys((prev) => {
      const allSelected = keys.length > 0 && keys.every((key) => prev.has(key));
      return allSelected ? new Set() : new Set(keys);
    });
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await deletePositions(pendingDelete.transactionIds);
      toast.success(`Removed closed position for ${displaySymbol(pendingDelete.symbol)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove closed position");
    } finally {
      setPendingDelete(null);
    }
  }

  async function handleBulkDelete() {
    const selectedPositions = positions.filter((p) => selectedKeys.has(keyFor(p)));
    const transactionIds = selectedPositions.flatMap((p) => p.transactionIds);
    try {
      await deletePositions(transactionIds);
      toast.success(
        `Removed ${selectedPositions.length} closed position${selectedPositions.length === 1 ? "" : "s"}`
      );
      setSelectedKeys(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove closed positions");
    } finally {
      setBulkDeleteOpen(false);
    }
  }

  async function handleSaveNotes(position: ClosedPosition, notes: string) {
    await updateNotes(position.closingTransactionId, notes);
  }

  return (
    <div>
      <PageHeader
        description="Positions you've fully exited, with realized profit and loss."
        actions={market === "US" ? <CurrencyToggle /> : undefined}
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : positions.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="No closed positions yet"
          description="Close a position from Portfolio to book profit or loss — it'll show up here."
        />
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 sm:max-w-lg">
            <MetricCard
              title="Total realized P&L"
              value={fmt(totalRealizedPL, { signDisplay: "always" })}
              changeValue={totalRealizedPLPercent}
              changeFormatted={formatPercent(totalRealizedPLPercent)}
              icon={totalRealizedPL >= 0 ? TrendingUp : TrendingDown}
            />
            <MetricCard
              title="Total invested"
              value={fmt(totalInvested)}
              icon={market === "US" ? DollarSign : IndianRupee}
            />
          </div>

          <ClosedPositionsChart
            positions={positions}
            selectedKey={selectedKey}
            onSelectKey={setSelectedKey}
          />

          {selectedKey && visiblePositions[0] && (
            <p className="mb-4 text-sm text-muted-foreground">
              Showing {displaySymbol(visiblePositions[0].symbol)} closed on{" "}
              {format(new Date(visiblePositions[0].closeDate), "d MMM yyyy")} —{" "}
              <button
                type="button"
                onClick={() => setSelectedKey(null)}
                className="underline hover:text-foreground"
              >
                clear filter
              </button>
            </p>
          )}

          <BulkActionsBar
            count={selectedKeys.size}
            onDelete={() => setBulkDeleteOpen(true)}
            onClear={() => setSelectedKeys(new Set())}
          />

          <ClosedPositionsTable
            positions={visiblePositions}
            selectedKeys={selectedKeys}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onDelete={setPendingDelete}
            onSaveNotes={handleSaveNotes}
          />
        </>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove closed position for {pendingDelete && displaySymbol(pendingDelete.symbol)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && isPartialSell(pendingDelete)
                ? "This deletes just this sell transaction and restores the shares to your open holding. This can't be undone."
                : "This deletes the buy and sell transactions that made up this episode. This can't be undone."}
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
            <AlertDialogTitle>Remove {selectedKeys.size} closed positions?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the underlying transaction(s) for each selected row — a partial
              sell deletes just that sell and restores the shares to your open holding, while
              a full close deletes the whole buy-and-sell round trip. This can&apos;t be
              undone.
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
