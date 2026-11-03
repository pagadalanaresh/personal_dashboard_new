"use client";

import * as React from "react";
import { CalendarIcon, Download, Plus, Receipt, Search } from "lucide-react";
import { format, isWithinInterval, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkActionsBar } from "@/components/shared/bulk-actions-bar";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { TransactionFormSheet } from "@/components/transactions/transaction-form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useTransactions } from "@/hooks/use-transactions";
import { useHoldings } from "@/hooks/use-holdings";
import { useMarket } from "@/lib/market-context";
import { useRegisterPageAction } from "@/lib/page-action-context";
import { formatNumber } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv-export";
import { computeRealizedPLByTransaction } from "@/lib/transaction-pl";
import type { TransactionDto } from "@/lib/transactions";

type TypeFilter = "ALL" | "BUY" | "SELL";

function exportToCsv(transactions: TransactionDto[]) {
  const header = ["Date", "Symbol", "Name", "Type", "Quantity", "Price", "Total"];
  const rows = transactions.map((tx) => [
    format(new Date(tx.date), "yyyy-MM-dd"),
    tx.symbol,
    tx.name,
    tx.type,
    tx.quantity,
    tx.price,
    tx.total,
  ]);
  downloadCsv(`transactions-${format(new Date(), "yyyy-MM-dd")}.csv`, header, rows);
}

export default function TransactionsPage() {
  const { format: fmt } = useMarket();
  const { transactions, isLoading, addTransaction, deleteTransaction, deleteTransactions } =
    useTransactions();
  const { holdings } = useHoldings();
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("ALL");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<TransactionDto | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);

  useRegisterPageAction(
    React.useMemo(() => ({ label: "Add transaction", onClick: () => setSheetOpen(true) }), [])
  );

  // Computed from the full, unfiltered ledger — a sell's realized P&L
  // depends on the running average cost of every prior buy for that
  // symbol, so this can't be derived from just the filtered/visible rows.
  const realizedPLById = React.useMemo(
    () => computeRealizedPLByTransaction(transactions),
    [transactions]
  );

  const filtered = transactions.filter((tx) => {
    const q = search.trim().toLowerCase();
    if (q && !tx.symbol.toLowerCase().includes(q) && !tx.name.toLowerCase().includes(q)) {
      return false;
    }
    if (typeFilter !== "ALL" && tx.type !== typeFilter) return false;
    if (dateRange?.from) {
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      if (!isWithinInterval(new Date(tx.date), { start: dateRange.from, end: to })) {
        return false;
      }
    }
    return true;
  });

  const totalBuys = transactions.filter((t) => t.type === "BUY").reduce((s, t) => s + t.total, 0);
  const totalSells = transactions.filter((t) => t.type === "SELL").reduce((s, t) => s + t.total, 0);
  const buyCount = transactions.filter((t) => t.type === "BUY").length;
  const sellCount = transactions.filter((t) => t.type === "SELL").length;

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
      await deleteTransaction(pendingDelete.id);
      toast.success("Transaction removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove transaction");
    } finally {
      setPendingDelete(null);
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    try {
      await deleteTransactions(ids);
      toast.success(`Removed ${ids.length} transaction${ids.length === 1 ? "" : "s"}`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove transactions");
    } finally {
      setBulkDeleteOpen(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="A full record of every buy and sell, with filters and CSV export."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={transactions.length === 0}
              onClick={() => exportToCsv(filtered)}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            {/* Mobile gets a compact "+" in the nav bar instead. */}
            <Button onClick={() => setSheetOpen(true)} className="hidden md:inline-flex">
              <Plus className="h-4 w-4" />
              Add transaction
            </Button>
          </div>
        }
      />

      {!isLoading && transactions.length > 0 && (
        // Flat Kite-style stat strip — plain label/value pairs with a
        // bottom border, no cards, shadows, or icons.
        <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-border pb-4 sm:justify-start sm:gap-x-10 sm:gap-y-2">
          <div>
            <p className="text-xs text-muted-foreground">Net invested</p>
            <p className="font-tabular text-lg font-semibold tracking-tight whitespace-nowrap">
              {fmt(totalBuys - totalSells)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Buys logged</p>
            <p className="font-tabular text-lg font-semibold tracking-tight">{buyCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sells logged</p>
            <p className="font-tabular text-lg font-semibold tracking-tight">{sellCount}</p>
          </div>
        </div>
      )}

      {!isLoading && transactions.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative hidden max-w-xs flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by symbol or name"
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="BUY">Buy</SelectItem>
              <SelectItem value="SELL">Sell</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger
              render={<Button type="button" variant="outline" className="font-normal" />}
            >
              <CalendarIcon className="h-4 w-4" />
              {dateRange?.from
                ? dateRange.to
                  ? `${format(dateRange.from, "d MMM")} – ${format(dateRange.to, "d MMM")}`
                  : format(dateRange.from, "d MMM yyyy")
                : "Date range"}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
              {dateRange?.from && (
                <div className="border-t border-border p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setDateRange(undefined)}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      )}

      {!isLoading && transactions.length > 0 && (
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
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No transactions yet"
          description="Log your first buy or sell to start building your transaction history — your holdings will stay in sync automatically."
          action={
            <Button onClick={() => setSheetOpen(true)}>
              <Plus className="h-4 w-4" />
              Add your first transaction
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description="Try a different symbol, type, or date range."
        />
      ) : (
        <TransactionsTable
          transactions={filtered}
          realizedPLById={realizedPLById}
          onDelete={setPendingDelete}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
        />
      )}

      <TransactionFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        holdings={holdings}
        onSubmit={addTransaction}
      />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && (
                <>
                  {pendingDelete.type === "BUY" ? "Buy" : "Sell"} of{" "}
                  {formatNumber(pendingDelete.quantity)} {pendingDelete.symbol.replace(/\.NS$/i, "")}{" "}
                  will be removed and your holding recalculated. This can&apos;t be undone.
                </>
              )}
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
            <AlertDialogTitle>Remove {selectedIds.size} transactions?</AlertDialogTitle>
            <AlertDialogDescription>
              These transactions will be removed and affected holdings recalculated. This
              can&apos;t be undone.
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
