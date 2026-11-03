"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Banknote,
  Bell,
  Hand,
  Info,
  MoreHorizontal,
  Pencil,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChangeIndicator } from "@/components/shared/change-indicator";
import { NotesPopover } from "@/components/shared/notes-popover";
import { PositionBadge } from "@/components/shared/position-badge";
import { TrendBadge } from "@/components/shared/trend-badge";
import {
  cn,
  compareNullableValues,
  displaySymbol,
  formatNumber,
  formatPercent,
  stockHref,
} from "@/lib/utils";
import { useMarket } from "@/lib/market-context";
import { useTrendScores } from "@/hooks/use-trend-scores";
import type { EnrichedHolding } from "@/lib/holdings";

type SortKey =
  | "symbol"
  | "marketValue"
  | "gainLoss"
  | "dayChange"
  | "dayChangePercent"
  | "weight"
  | "trendScore";

type HoldingRow = EnrichedHolding & { weight: number; trendScore: number | null };

// Kite's mobile Holdings screen has no column headers to tap — sorting
// lives behind a single "Sort" control that opens a sheet of options, each
// with a short code prefix (A-Z, %, LTP, P&L...) instead of an icon.
const SORT_OPTIONS: { key: SortKey; prefix: string; label: string; hint?: string }[] = [
  { key: "symbol", prefix: "A-Z", label: "Alphabetically" },
  { key: "dayChangePercent", prefix: "%", label: "Day's change" },
  { key: "dayChange", prefix: "D₹", label: "Day's profit" },
  { key: "marketValue", prefix: "₹", label: "Current value" },
  { key: "gainLoss", prefix: "P&L", label: "Total profit", hint: "Absolute" },
  { key: "weight", prefix: "WT", label: "Weight" },
  { key: "trendScore", prefix: "TR", label: "Trend" },
];

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

export function HoldingsTable({
  holdings,
  totalMarketValue,
  onAddShares,
  onEdit,
  onClose,
  onDelete,
  onSaveNotes,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: {
  holdings: EnrichedHolding[];
  totalMarketValue: number;
  onAddShares: (holding: EnrichedHolding) => void;
  onEdit: (holding: EnrichedHolding) => void;
  onClose: (holding: EnrichedHolding) => void;
  onDelete: (holding: EnrichedHolding) => void;
  onSaveNotes: (holding: EnrichedHolding, notes: string) => Promise<void>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
}) {
  const { format: fmt } = useMarket();
  const router = useRouter();
  const dragStartY = React.useRef<number | null>(null);
  const [sortKey, setSortKey] = React.useState<SortKey>("marketValue");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [sortSheetOpen, setSortSheetOpen] = React.useState(false);
  const [quickViewHolding, setQuickViewHolding] = React.useState<HoldingRow | null>(null);
  // Picking "Day's profit" vs "Total profit" in the sort sheet also
  // switches which P&L the mobile row displays — not just the order.
  const [profitDisplay, setProfitDisplay] = React.useState<"total" | "day">("total");

  const { scores: trendScores, isLoading: trendLoading } = useTrendScores(
    React.useMemo(() => holdings.map((h) => h.symbol), [holdings])
  );

  const rows: HoldingRow[] = React.useMemo(
    () =>
      holdings.map((h) => ({
        ...h,
        weight: totalMarketValue === 0 ? 0 : (h.marketValue / totalMarketValue) * 100,
        trendScore: trendScores.get(h.symbol)?.score ?? null,
      })),
    [holdings, totalMarketValue, trendScores]
  );

  const sortedRows = React.useMemo(() => {
    const sorted = [...rows].sort((a, b) => compareNullableValues(a[sortKey], b[sortKey]));
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  // Dragging the quick-view sheet's handle up opens the full details page
  // (like swiping up a Kite instrument sheet); dragging down just closes
  // it, same as the sheet's normal swipe-to-dismiss.
  function handleSheetDragStart(e: React.PointerEvent) {
    dragStartY.current = e.clientY;
  }

  function handleSheetDragEnd(e: React.PointerEvent, holding: HoldingRow) {
    if (dragStartY.current == null) return;
    const delta = dragStartY.current - e.clientY; // positive = dragged up
    dragStartY.current = null;
    if (delta > 40) {
      setQuickViewHolding(null);
      router.push(stockHref(holding.symbol));
    } else if (delta < -40) {
      setQuickViewHolding(null);
    }
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-md border border-border md:block">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    sortedRows.length > 0 && sortedRows.every((h) => selectedIds.has(h.id))
                  }
                  onCheckedChange={() => onToggleSelectAll(sortedRows.map((h) => h.id))}
                  aria-label="Select all holdings"
                />
              </TableHead>
              <TableHead>
                <SortButton label="Holding" sortableKey="symbol" onSort={toggleSort} />
              </TableHead>
              <TableHead>Position</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Avg cost</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">
                <SortButton label="Day change" sortableKey="dayChangePercent" onSort={toggleSort} />
              </TableHead>
              <TableHead>
                <SortButton label="Trend" sortableKey="trendScore" onSort={toggleSort} />
              </TableHead>
              <TableHead className="text-right">
                <SortButton label="Market value" sortableKey="marketValue" onSort={toggleSort} />
              </TableHead>
              <TableHead className="text-right">
                <SortButton label="Gain / loss" sortableKey="gainLoss" onSort={toggleSort} />
              </TableHead>
              <TableHead className="w-36">
                <SortButton label="Weight" sortableKey="weight" onSort={toggleSort} />
              </TableHead>
              <TableHead className="w-10" />
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((holding) => (
              <TableRow key={holding.id} className="group">
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(holding.id)}
                    onCheckedChange={() => onToggleSelect(holding.id)}
                    aria-label={`Select ${holding.symbol}`}
                  />
                </TableCell>
                <TableCell>
                  <Link href={stockHref(holding.symbol)} className="flex flex-col hover:underline">
                    <span className="font-medium">{displaySymbol(holding.symbol)}</span>
                    <span className="max-w-[16ch] truncate text-xs font-normal text-muted-foreground no-underline">
                      {holding.name}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <PositionBadge position={holding.position} />
                </TableCell>
                <TableCell className="text-right font-tabular">
                  {formatNumber(holding.quantity)}
                </TableCell>
                <TableCell className="text-right font-tabular">
                  {fmt(holding.avgCostBasis)}
                </TableCell>
                <TableCell className="text-right font-tabular">
                  {fmt(holding.price)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <ChangeIndicator
                      value={holding.dayChange}
                      formatted={fmt(holding.dayChange, { signDisplay: "always" })}
                      className="justify-end"
                    />
                    <span className="font-tabular text-xs text-muted-foreground">
                      {formatPercent(holding.dayChangePercent)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <TrendBadge trend={trendScores.get(holding.symbol)} isLoading={trendLoading} />
                </TableCell>
                <TableCell className="text-right font-tabular font-medium">
                  {fmt(holding.marketValue)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <ChangeIndicator
                      value={holding.gainLoss}
                      formatted={fmt(holding.gainLoss, { signDisplay: "always" })}
                      className="justify-end"
                    />
                    <span className="font-tabular text-xs text-muted-foreground">
                      {formatPercent(holding.gainLossPercent)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={holding.weight} className="h-1.5" />
                    <span className="w-10 text-right text-xs text-muted-foreground font-tabular">
                      {holding.weight.toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <NotesPopover
                    notes={holding.notes}
                    label={displaySymbol(holding.symbol)}
                    onSave={(notes) => onSaveNotes(holding, notes)}
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-60 group-hover:opacity-100"
                          aria-label={`Actions for ${holding.symbol}`}
                        />
                      }
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onAddShares(holding)}>
                        <ShoppingCart className="h-4 w-4" />
                        Add shares
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onClose(holding)}>
                        <Banknote className="h-4 w-4" />
                        Close position
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(holding)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(holding)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
            Swipe left for quick actions
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
        {/* Flat Kite-style list: one bordered container, rows divided by a
            top border instead of individual floating shadowed cards. */}
        <div className="overflow-hidden rounded-md border border-border">
          {sortedRows.map((holding, index) => (
            // iOS swipe-to-reveal (Mail/Reminders pattern) via native
            // scroll-snap — no gesture library needed. Everything that was
            // already here (notes, full action menu) stays exactly as it
            // was; swipe just adds Edit/Delete shortcuts on top, since a
            // drag never fires the tap handlers underneath.
            <div key={holding.id} className={cn("overflow-hidden", index !== 0 && "border-t border-border")}>
            {/* Grid (not flex) tracks here on purpose: a flex child sized
                via width/flex-basis percentage inside an overflow-x-auto +
                snap-x flex container can resolve against the scrollable
                content width instead of the visible width in some WebKit
                versions, leaking a sliver of the next snap point. Explicit
                grid-template-columns tracks don't have that bug. */}
            <div className="grid grid-cols-[calc(100%+1px)_8.5rem] snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div
              className="snap-start [scroll-snap-stop:always] bg-card px-3 py-2.5"
              onClick={() => setQuickViewHolding(holding)}
            >
              {(() => {
                const activeProfit = profitDisplay === "day" ? holding.dayChange : holding.gainLoss;
                const activeProfitPercent =
                  profitDisplay === "day" ? holding.dayChangePercent : holding.gainLossPercent;
                return (
                  <>
                    {/* Zerodha Kite Holdings-row layout: qty/avg + overall %
                        on top, symbol + P&L in the middle, invested amount +
                        LTP/day-change on the bottom. The middle P&L and top
                        % switch between total and today's profit based on
                        the Sort sheet's selection. Tapping the row (like
                        tapping a holding in Kite) opens the quick-view sheet
                        below instead of navigating away directly. */}
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Qty. {formatNumber(holding.quantity)} &middot; Avg.{" "}
                        {fmt(holding.avgCostBasis)}
                      </p>
                      <p
                        className={cn(
                          "font-tabular shrink-0 text-xs font-medium",
                          activeProfit >= 0 ? "text-positive" : "text-negative"
                        )}
                      >
                        {formatPercent(activeProfitPercent)}
                      </p>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="text-[15px] font-semibold">
                        {displaySymbol(holding.symbol)}
                      </span>
                      <span
                        className={cn(
                          "font-tabular shrink-0 text-sm font-semibold",
                          activeProfit >= 0 ? "text-positive" : "text-negative"
                        )}
                      >
                        {fmt(activeProfit, { signDisplay: "always" })}
                        {profitDisplay === "day" && (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">today</span>
                        )}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-baseline justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Invested {fmt(holding.costBasisTotal)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        LTP {fmt(holding.price)}{" "}
                        <span
                          className={cn(
                            "font-medium",
                            holding.dayChange >= 0 ? "text-positive" : "text-negative"
                          )}
                        >
                          ({formatPercent(holding.dayChangePercent)})
                        </span>
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="flex snap-start [scroll-snap-stop:always]">
              <button
                type="button"
                onClick={() => onEdit(holding)}
                className="flex flex-1 flex-col items-center justify-center gap-1 bg-warning text-xs font-semibold text-warning-foreground"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(holding)}
                className="flex flex-1 flex-col items-center justify-center gap-1 bg-destructive text-xs font-semibold text-white"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
            </div>
            </div>
          ))}
        </div>
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
                    if (option.key === "dayChange") setProfitDisplay("day");
                    else if (option.key === "gainLoss") setProfitDisplay("total");
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
                    {option.hint && (
                      <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                        {option.hint}
                      </span>
                    )}
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

      <Sheet
        open={!!quickViewHolding}
        onOpenChange={(open) => !open && setQuickViewHolding(null)}
      >
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-[calc(1rem+env(safe-area-inset-bottom))]"
          showCloseButton={false}
        >
          {quickViewHolding && (
            <>
              {/* Drag handle: swipe up to open the full details page, swipe
                  down to dismiss — same gesture area, opposite directions. */}
              <div
                className="flex touch-none items-center justify-center py-2"
                onPointerDown={handleSheetDragStart}
                onPointerUp={(e) => handleSheetDragEnd(e, quickViewHolding)}
              >
                <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="px-4 pb-3">
                <p className="text-xl font-bold">{displaySymbol(quickViewHolding.symbol)}</p>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{quickViewHolding.market}</span>
                  <span className="font-tabular font-medium">{fmt(quickViewHolding.price)}</span>
                  <span
                    className={cn(
                      "font-tabular text-xs font-medium",
                      quickViewHolding.dayChange >= 0 ? "text-positive" : "text-negative"
                    )}
                  >
                    {fmt(quickViewHolding.dayChange, { signDisplay: "always" })} (
                    {formatPercent(quickViewHolding.dayChangePercent)})
                  </span>
                </div>
              </div>
              <div className="flex gap-3 border-t border-border px-4 py-4">
                <Button
                  className="h-12 flex-1 text-base font-semibold"
                  onClick={() => {
                    onAddShares(quickViewHolding);
                    setQuickViewHolding(null);
                  }}
                >
                  Add
                </Button>
                <button
                  type="button"
                  className="h-12 flex-1 rounded-lg bg-destructive text-base font-semibold text-white"
                  onClick={() => {
                    onClose(quickViewHolding);
                    setQuickViewHolding(null);
                  }}
                >
                  Exit
                </button>
              </div>
              <div className="flex gap-3 px-4 pb-2">
                <Link
                  href={stockHref(quickViewHolding.symbol)}
                  className="flex flex-1 items-center gap-2 py-2 text-sm font-medium text-primary"
                  onClick={() => setQuickViewHolding(null)}
                >
                  <Info className="h-4 w-4 shrink-0" />
                  Details
                </Link>
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 py-2 text-sm font-medium text-primary"
                  onClick={() => {
                    toast("Price alerts are coming soon");
                    setQuickViewHolding(null);
                  }}
                >
                  <Bell className="h-4 w-4 shrink-0" />
                  Set alert
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
