"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Hand,
  Trash2,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn, compareNullableValues, formatNumber, stockHref } from "@/lib/utils";
import { useMarket } from "@/lib/market-context";
import type { TransactionDto } from "@/lib/transactions";

function displaySymbol(symbol: string) {
  return symbol.replace(/\.NS$/i, "");
}

// Kite's mobile screens have no column headers to tap — sorting lives
// behind a single "Sort" control that opens a sheet of options, each with
// a short code prefix (DT, A-Z, QTY...) instead of an icon.
type SortKey = "date" | "symbol" | "quantity" | "price" | "total";

const SORT_OPTIONS: { key: SortKey; prefix: string; label: string }[] = [
  { key: "date", prefix: "DT", label: "Date" },
  { key: "symbol", prefix: "A-Z", label: "Alphabetically" },
  { key: "quantity", prefix: "QTY", label: "Quantity" },
  { key: "price", prefix: "₹", label: "Price" },
  { key: "total", prefix: "TOT", label: "Total value" },
];

function dateGroupLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "d MMM yyyy");
}

function TypeBadge({ type }: { type: "BUY" | "SELL" }) {
  const isBuy = type === "BUY";
  return (
    <Badge
      className={cn(
        "gap-1",
        isBuy ? "bg-positive-muted text-positive" : "bg-negative-muted text-negative"
      )}
    >
      {isBuy ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {isBuy ? "Buy" : "Sell"}
    </Badge>
  );
}

function SortButton({
  label,
  sortableKey,
  onSort,
}: {
  label: string;
  sortableKey: SortKey;
  onSort: (key: SortKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(sortableKey)}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );
}

export function TransactionsTable({
  transactions,
  realizedPLById,
  onDelete,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: {
  transactions: TransactionDto[];
  // Sell-only — a buy never realizes P&L, so it falls back to showing its
  // total instead.
  realizedPLById: Map<string, number>;
  onDelete: (transaction: TransactionDto) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
}) {
  const { format: fmt } = useMarket();
  const router = useRouter();
  const dragStartY = React.useRef<number | null>(null);
  const [sortKey, setSortKey] = React.useState<SortKey>("date");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [sortSheetOpen, setSortSheetOpen] = React.useState(false);
  const [quickViewTx, setQuickViewTx] = React.useState<TransactionDto | null>(null);

  const sortedTransactions = React.useMemo(() => {
    const sorted = [...transactions].sort((a, b) => compareNullableValues(a[sortKey], b[sortKey]));
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [transactions, sortKey, sortDir]);

  // Grouped by calendar day with a header shown once per contiguous run —
  // a real trading app's order/trade history, not a flat list repeating
  // the date on every row.
  const groupedTransactions = React.useMemo(() => {
    const groups: { label: string; items: TransactionDto[] }[] = [];
    for (const tx of sortedTransactions) {
      const label = dateGroupLabel(tx.date);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.label === label) {
        lastGroup.items.push(tx);
      } else {
        groups.push({ label, items: [tx] });
      }
    }
    return groups;
  }, [sortedTransactions]);

  // A sell shows its realized P&L (signed, colored) instead of its total —
  // a buy has no P&L to realize yet, so it keeps showing its total,
  // uncolored.
  function amountFor(tx: TransactionDto) {
    if (tx.type === "SELL") {
      const pl = realizedPLById.get(tx.id);
      if (pl != null) return { value: pl, isPL: true };
    }
    return { value: tx.total, isPL: false };
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  // Dragging the quick-view sheet's handle up opens the holding's details
  // page (like swiping up a Kite instrument sheet); dragging down just
  // closes it, same as the sheet's normal swipe-to-dismiss.
  function handleSheetDragStart(e: React.PointerEvent) {
    dragStartY.current = e.clientY;
  }

  function handleSheetDragEnd(e: React.PointerEvent, tx: TransactionDto) {
    if (dragStartY.current == null) return;
    const delta = dragStartY.current - e.clientY; // positive = dragged up
    dragStartY.current = null;
    if (delta > 40) {
      setQuickViewTx(null);
      router.push(stockHref(tx.symbol));
    } else if (delta < -40) {
      setQuickViewTx(null);
    }
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    transactions.length > 0 && transactions.every((tx) => selectedIds.has(tx.id))
                  }
                  onCheckedChange={() => onToggleSelectAll(transactions.map((tx) => tx.id))}
                  aria-label="Select all transactions"
                />
              </TableHead>
              <TableHead>
                <SortButton label="Date" sortableKey="date" onSort={toggleSort} />
              </TableHead>
              <TableHead>
                <SortButton label="Holding" sortableKey="symbol" onSort={toggleSort} />
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">
                <SortButton label="Qty" sortableKey="quantity" onSort={toggleSort} />
              </TableHead>
              <TableHead className="text-right">
                <SortButton label="Price" sortableKey="price" onSort={toggleSort} />
              </TableHead>
              <TableHead className="text-right">
                <SortButton label="Total / P&L" sortableKey="total" onSort={toggleSort} />
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTransactions.map((tx) => (
              <TableRow key={tx.id} className="group">
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(tx.id)}
                    onCheckedChange={() => onToggleSelect(tx.id)}
                    aria-label={`Select transaction for ${tx.symbol}`}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {format(new Date(tx.date), "d MMM yyyy")}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{displaySymbol(tx.symbol)}</span>
                    <span className="max-w-[20ch] truncate text-xs text-muted-foreground">
                      {tx.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <TypeBadge type={tx.type} />
                </TableCell>
                <TableCell className="text-right font-tabular">
                  {formatNumber(tx.quantity)}
                </TableCell>
                <TableCell className="text-right font-tabular">
                  {fmt(tx.price)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-tabular font-medium",
                    amountFor(tx).isPL && (amountFor(tx).value >= 0 ? "text-positive" : "text-negative")
                  )}
                >
                  {amountFor(tx).isPL ? fmt(amountFor(tx).value, { signDisplay: "always" }) : fmt(amountFor(tx).value)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-60 group-hover:opacity-100"
                    aria-label={`Delete transaction for ${tx.symbol}`}
                    onClick={() => onDelete(tx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Hand className="h-3.5 w-3.5" />
            Swipe left to delete
          </p>
          <button
            type="button"
            onClick={() => setSortSheetOpen(true)}
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground"
          >
            {SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "Sort"}
            {sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
          </button>
        </div>
        {groupedTransactions.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 mt-3 text-xs font-semibold text-muted-foreground first:mt-0">
              {group.label}
            </p>
            {/* Flat Kite-style list: one bordered container per date group,
                rows divided by a top border instead of individual floating
                shadowed cards. */}
            <div className="overflow-hidden rounded-md border border-border">
              {group.items.map((tx, index) => {
                const isBuy = tx.type === "BUY";
                return (
                  // Swipe-to-delete (native scroll-snap) — the always-visible
                  // delete button stays too, swipe is just the faster
                  // shortcut. Tapping the row opens the quick-view sheet.
                  <div key={tx.id} className={cn("overflow-hidden", index !== 0 && "border-t border-border")}>
                  {/* Grid (not flex) tracks here on purpose: a flex child
                      sized via width/flex-basis percentage inside an
                      overflow-x-auto + snap-x flex container can resolve
                      against the scrollable content width instead of the
                      visible width in some WebKit versions, leaking a
                      sliver of the next snap point. Explicit
                      grid-template-columns tracks don't have that bug. */}
                  <div className="grid grid-cols-[calc(100%+1px)_5rem] snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div
                    className="flex snap-start items-center gap-3 [scroll-snap-stop:always] bg-card px-3 py-2.5"
                    onClick={() => setQuickViewTx(tx)}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        isBuy ? "bg-positive-muted text-positive" : "bg-negative-muted text-negative"
                      )}
                    >
                      {isBuy ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      {(() => {
                        const amount = amountFor(tx);
                        return (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[15px] font-semibold">
                              {displaySymbol(tx.symbol)}
                            </span>
                            <span
                              className={cn(
                                "font-tabular shrink-0 text-sm font-semibold",
                                amount.isPL
                                  ? amount.value >= 0
                                    ? "text-positive"
                                    : "text-negative"
                                  : isBuy
                                    ? "text-positive"
                                    : "text-negative"
                              )}
                            >
                              {amount.isPL
                                ? fmt(amount.value, { signDisplay: "always" })
                                : `${isBuy ? "+" : "-"}${fmt(amount.value)}`}
                            </span>
                          </div>
                        );
                      })()}
                      <p className="text-xs text-muted-foreground">
                        {isBuy ? "Buy" : "Sell"} &middot; {formatNumber(tx.quantity)} @{" "}
                        {fmt(tx.price)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(tx)}
                    className="flex snap-start flex-col items-center justify-center gap-1 bg-destructive text-xs font-semibold text-white [scroll-snap-stop:always]"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                  </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Sheet open={sortSheetOpen} onOpenChange={setSortSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
          showCloseButton={false}
        >
          <SheetHeader className="pb-1">
            <SheetTitle className="text-xl font-bold">Sort</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col">
            {SORT_OPTIONS.map((option) => {
              const isActive = option.key === sortKey;
              return (
                <button
                  key={option.key}
                  type="button"
                  className="flex h-14 items-center gap-4 border-b border-border px-4 text-left last:border-b-0 active:bg-muted"
                  onClick={() => {
                    toggleSort(option.key);
                    setSortSheetOpen(false);
                  }}
                >
                  <span
                    className={cn(
                      "w-10 shrink-0 text-xs font-semibold",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {option.prefix}
                  </span>
                  <span className={cn("flex-1 text-base", isActive ? "font-semibold" : "font-normal")}>
                    {option.label}
                  </span>
                  {isActive &&
                    (sortDir === "asc" ? (
                      <ArrowUp className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <ArrowDown className="h-4 w-4 shrink-0 text-primary" />
                    ))}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!quickViewTx} onOpenChange={(open) => !open && setQuickViewTx(null)}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-[calc(1rem+env(safe-area-inset-bottom))]"
          showCloseButton={false}
        >
          {quickViewTx && (
            <>
              {/* Drag handle: swipe up to open the holding's details page,
                  swipe down to dismiss — same gesture area, opposite
                  directions. */}
              <div
                className="flex touch-none items-center justify-center py-2"
                onPointerDown={handleSheetDragStart}
                onPointerUp={(e) => handleSheetDragEnd(e, quickViewTx)}
              >
                <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="px-4 pb-3">
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold">{displaySymbol(quickViewTx.symbol)}</p>
                  <TypeBadge type={quickViewTx.type} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {format(new Date(quickViewTx.date), "d MMM yyyy")}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-border px-4 py-4 text-center">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="font-tabular text-sm font-semibold whitespace-nowrap">
                    {formatNumber(quickViewTx.quantity)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="font-tabular text-sm font-semibold whitespace-nowrap">
                    {fmt(quickViewTx.price)}
                  </p>
                </div>
                {(() => {
                  const amount = amountFor(quickViewTx);
                  return (
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {amount.isPL ? "P&L" : "Total"}
                      </p>
                      <p
                        className={cn(
                          "font-tabular text-sm font-semibold whitespace-nowrap",
                          amount.isPL && (amount.value >= 0 ? "text-positive" : "text-negative")
                        )}
                      >
                        {amount.isPL
                          ? fmt(amount.value, { signDisplay: "always" })
                          : fmt(amount.value)}
                      </p>
                    </div>
                  );
                })()}
              </div>
              <div className="flex gap-3 border-t border-border px-4 py-4">
                <button
                  type="button"
                  className="h-12 flex-1 rounded-lg bg-primary text-base font-semibold text-primary-foreground"
                  onClick={() => {
                    const symbol = quickViewTx.symbol;
                    setQuickViewTx(null);
                    router.push(stockHref(symbol));
                  }}
                >
                  View holding
                </button>
                <button
                  type="button"
                  className="h-12 flex-1 rounded-lg bg-destructive text-base font-semibold text-white"
                  onClick={() => {
                    onDelete(quickViewTx);
                    setQuickViewTx(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
