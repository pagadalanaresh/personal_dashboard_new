"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bell,
  Briefcase,
  GripVertical,
  Hand,
  Info,
  MoreHorizontal,
  Pencil,
  ShieldAlert,
  ShoppingCart,
  Star,
  Target,
  Trash2,
  TriangleAlert,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useTrendScores } from "@/hooks/use-trend-scores";
import {
  cn,
  compareNullableValues,
  displaySymbol,
  formatPercent,
  stockHref,
} from "@/lib/utils";
import { useMarket } from "@/lib/market-context";
import type { EnrichedWatchlistItem } from "@/lib/watchlist";

function AlertBadge({ alert }: { alert: EnrichedWatchlistItem["alert"] }) {
  if (!alert) return null;
  if (alert === "stop") {
    return (
      <Badge className={cn("gap-1", "bg-negative-muted text-negative")}>
        <TriangleAlert className="h-3 w-3" />
        Stop loss hit
      </Badge>
    );
  }
  return (
    <Badge className={cn("gap-1", "bg-warning-muted text-warning-foreground")}>
      <Bell className="h-3 w-3" />
      {alert === "above" ? "Crossed target" : "Near target"}
    </Badge>
  );
}

function BuyChange({
  buyPrice,
  changeFromBuyPercent,
}: {
  buyPrice: number | null;
  changeFromBuyPercent: number | null;
}) {
  const { format: fmt } = useMarket();
  if (changeFromBuyPercent == null || buyPrice == null) {
    return <span className="text-xs text-muted-foreground">No buy price</span>;
  }
  return (
    <div className="flex flex-col items-end">
      <ChangeIndicator
        value={changeFromBuyPercent}
        formatted={formatPercent(changeFromBuyPercent)}
        className="justify-end"
      />
      <span className="text-xs text-muted-foreground font-tabular">
        {fmt(buyPrice)}
      </span>
    </div>
  );
}

function StopLossCell({ price, stopLoss }: { price: number; stopLoss: number | null }) {
  const { format: fmt } = useMarket();
  if (stopLoss == null) {
    return <span className="text-xs text-muted-foreground">No stop set</span>;
  }
  const breached = price <= stopLoss;
  return (
    <span
      className={cn(
        "text-xs font-tabular",
        breached ? "font-medium text-negative" : "text-muted-foreground"
      )}
    >
      {fmt(stopLoss)}
    </span>
  );
}

function TargetProgress({
  price,
  buyPrice,
  targetPrice,
}: {
  price: number;
  buyPrice: number | null;
  targetPrice: number | null;
}) {
  const { format: fmt } = useMarket();
  if (targetPrice == null) {
    return (
      <span className="block text-center text-xs text-muted-foreground">No target set</span>
    );
  }
  const rangeStart = buyPrice ?? 0;
  const percentToTarget =
    targetPrice === rangeStart
      ? 100
      : Math.min(100, Math.max(0, ((price - rangeStart) / (targetPrice - rangeStart)) * 100));
  const isLoss = buyPrice != null && price < buyPrice;
  const displayValue = isLoss ? Math.max(percentToTarget, 4) : percentToTarget;
  // Upside is measured against your suggested/buy price, not the constantly
  // moving current price — that's the actual trade setup you planned.
  const upsideBasisPrice = buyPrice ?? price;
  const upsideToTargetPercent =
    upsideBasisPrice === 0 ? 0 : ((targetPrice - upsideBasisPrice) / upsideBasisPrice) * 100;
  const isHighUpside = upsideToTargetPercent > 20;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-medium font-tabular">{fmt(price)}</span>
      <div className="flex items-center justify-center gap-2">
        <span className="w-16 shrink-0 text-xs text-muted-foreground font-tabular">
          {buyPrice != null ? fmt(buyPrice) : "—"}
        </span>
        <Progress
          value={displayValue}
          className="h-1.5 w-24"
          indicatorClassName={isLoss ? "bg-negative" : undefined}
        />
        <span className="flex w-16 shrink-0 items-center gap-1 text-xs text-muted-foreground font-tabular">
          {fmt(targetPrice)}
          {isHighUpside && (
            <span title={`${upsideToTargetPercent.toFixed(0)}% upside to target`}>
              <Star className="h-3 w-3 shrink-0 fill-warning text-warning" />
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export const WATCHLIST_ITEM_DRAG_TYPE = "application/x-watchlist-item-id";

// "none" keeps whatever order the section's items already came in (e.g.
// drag-and-drop placement) — sorting only kicks in once a column is clicked.
type SortKey =
  | "none"
  | "symbol"
  | "price"
  | "changePercent"
  | "changeFromBuyPercent"
  | "targetPrice"
  | "trendScore";

type WatchlistRow = EnrichedWatchlistItem & { trendScore: number | null };

// Kite's mobile Watchlist screen has no column headers to tap — sorting
// lives behind a single "Sort" control that opens a sheet of options, each
// with a short code prefix (A-Z, %, LTP...) instead of an icon.
const SORT_OPTIONS: { key: SortKey; prefix: string; label: string; hint?: string }[] = [
  { key: "symbol", prefix: "A-Z", label: "Alphabetically" },
  { key: "changePercent", prefix: "%", label: "Day's change" },
  { key: "price", prefix: "LTP", label: "Last traded price" },
  { key: "changeFromBuyPercent", prefix: "P&L", label: "Vs buy price", hint: "Percent" },
  { key: "targetPrice", prefix: "TGT", label: "Target price" },
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

function InPortfolioBadge() {
  return (
    <span title="You already hold this stock">
      <Briefcase className="h-3.5 w-3.5 text-primary" />
    </span>
  );
}

export function WatchlistTable({
  items,
  heldSymbols,
  onEdit,
  onDelete,
  onBuy,
  onSaveNotes,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: {
  items: EnrichedWatchlistItem[];
  heldSymbols: Set<string>;
  onEdit: (item: EnrichedWatchlistItem) => void;
  onDelete: (item: EnrichedWatchlistItem) => void;
  onBuy: (item: EnrichedWatchlistItem) => void;
  onSaveNotes: (item: EnrichedWatchlistItem, notes: string) => Promise<void>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
}) {
  const { format: fmt } = useMarket();
  const router = useRouter();
  const dragStartY = React.useRef<number | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [sortKey, setSortKey] = React.useState<SortKey>("none");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [sortSheetOpen, setSortSheetOpen] = React.useState(false);
  const [quickViewItem, setQuickViewItem] = React.useState<WatchlistRow | null>(null);

  const { scores: trendScores, isLoading: trendLoading } = useTrendScores(
    React.useMemo(() => items.map((item) => item.symbol), [items])
  );

  const rows: WatchlistRow[] = React.useMemo(
    () =>
      items.map((item) => ({
        ...item,
        trendScore: trendScores.get(item.symbol)?.score ?? null,
      })),
    [items, trendScores]
  );

  const sortedItems = React.useMemo(() => {
    if (sortKey === "none") return rows;
    return [...rows].sort((a, b) => {
      const cmp = compareNullableValues(a[sortKey], b[sortKey]);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData(WATCHLIST_ITEM_DRAG_TYPE, id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  }

  function handleDragEnd() {
    setDraggingId(null);
  }

  // Dragging the quick-view sheet's handle up opens the full details page
  // (like swiping up a Kite instrument sheet); dragging down just closes
  // it, same as the sheet's normal swipe-to-dismiss.
  function handleSheetDragStart(e: React.PointerEvent) {
    dragStartY.current = e.clientY;
  }

  function handleSheetDragEnd(e: React.PointerEvent, item: WatchlistRow) {
    if (dragStartY.current == null) return;
    const delta = dragStartY.current - e.clientY; // positive = dragged up
    dragStartY.current = null;
    if (delta > 40) {
      setQuickViewItem(null);
      router.push(stockHref(item.symbol));
    } else if (delta < -40) {
      setQuickViewItem(null);
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
                  checked={sortedItems.length > 0 && sortedItems.every((item) => selectedIds.has(item.id))}
                  onCheckedChange={() => onToggleSelectAll(sortedItems.map((item) => item.id))}
                  aria-label="Select all watchlist items"
                />
              </TableHead>
              <TableHead>
                <SortButton label="Symbol" sortableKey="symbol" onSort={toggleSort} />
              </TableHead>
              <TableHead>Position</TableHead>
              <TableHead className="text-right">
                <SortButton label="Price" sortableKey="price" onSort={toggleSort} />
              </TableHead>
              <TableHead className="text-right">
                <SortButton label="Day change" sortableKey="changePercent" onSort={toggleSort} />
              </TableHead>
              <TableHead>
                <SortButton label="Trend" sortableKey="trendScore" onSort={toggleSort} />
              </TableHead>
              <TableHead className="text-right">
                <SortButton label="Vs buy" sortableKey="changeFromBuyPercent" onSort={toggleSort} />
              </TableHead>
              <TableHead className="text-center">
                <SortButton label="Target" sortableKey="targetPrice" onSort={toggleSort} />
              </TableHead>
              <TableHead>Stop loss</TableHead>
              <TableHead>Alert</TableHead>
              <TableHead className="w-10" />
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item) => (
              <TableRow
                key={item.id}
                className={cn(
                  "group cursor-grab transition-opacity active:cursor-grabbing",
                  draggingId === item.id && "opacity-40"
                )}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragEnd={handleDragEnd}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => onToggleSelect(item.id)}
                    aria-label={`Select ${item.symbol}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-60" />
                    <Link href={stockHref(item.symbol)} className="flex flex-col hover:underline">
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium">{displaySymbol(item.symbol)}</span>
                        {heldSymbols.has(item.symbol) && <InPortfolioBadge />}
                      </span>
                      <span className="max-w-[20ch] truncate text-xs font-normal text-muted-foreground no-underline">
                        {item.name}
                      </span>
                    </Link>
                  </div>
                </TableCell>
                <TableCell>
                  <PositionBadge position={item.position} />
                </TableCell>
                <TableCell className="text-right font-tabular">
                  {fmt(item.price)}
                </TableCell>
                <TableCell className="text-right">
                  <ChangeIndicator
                    value={item.changePercent}
                    formatted={formatPercent(item.changePercent)}
                    className="justify-end"
                  />
                </TableCell>
                <TableCell>
                  <TrendBadge trend={trendScores.get(item.symbol)} isLoading={trendLoading} />
                </TableCell>
                <TableCell className="text-right">
                  <BuyChange buyPrice={item.buyPrice} changeFromBuyPercent={item.changeFromBuyPercent} />
                </TableCell>
                <TableCell>
                  <TargetProgress
                    price={item.price}
                    buyPrice={item.buyPrice}
                    targetPrice={item.targetPrice}
                  />
                </TableCell>
                <TableCell>
                  <StopLossCell price={item.price} stopLoss={item.stopLoss} />
                </TableCell>
                <TableCell>
                  <AlertBadge alert={item.alert} />
                </TableCell>
                <TableCell>
                  <NotesPopover
                    notes={item.notes}
                    label={displaySymbol(item.symbol)}
                    onSave={(notes) => onSaveNotes(item, notes)}
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
                          aria-label={`Actions for ${item.symbol}`}
                        />
                      }
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onBuy(item)}>
                        <ShoppingCart className="h-4 w-4" />
                        Buy
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(item)}>
                        <Pencil className="h-4 w-4" />
                        Edit target
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(item)}
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
          {sortedItems.map((item, index) => (
            // Swipe-to-reveal (native scroll-snap) adds Edit/Remove
            // shortcuts; drag-to-reorder into sections still works exactly
            // as before. Tapping the row (like tapping a Kite watchlist
            // instrument) opens the quick-view sheet below.
            <div key={item.id} className={cn("overflow-hidden", index !== 0 && "border-t border-border")}>
            <div className="grid grid-cols-[calc(100%+1px)_8.5rem] snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div
              className={cn(
                "snap-start [scroll-snap-stop:always] bg-card px-3 py-2.5 transition-opacity",
                draggingId === item.id && "opacity-40"
              )}
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragEnd={handleDragEnd}
              onClick={() => setQuickViewItem(item)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="text-[15px] font-semibold">{displaySymbol(item.symbol)}</span>
                  {heldSymbols.has(item.symbol) && <InPortfolioBadge />}
                </span>
                <span className="font-tabular shrink-0 text-sm font-semibold">
                  {fmt(item.price)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PositionBadge position={item.position} />
                  <TrendBadge trend={trendScores.get(item.symbol)} isLoading={trendLoading} />
                </div>
                <span
                  className={cn(
                    "font-tabular shrink-0 text-xs font-medium",
                    item.changePercent >= 0 ? "text-positive" : "text-negative"
                  )}
                >
                  {formatPercent(item.changePercent)}
                </span>
              </div>
              {item.buyPrice != null && (
                <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>Vs buy ({fmt(item.buyPrice)})</span>
                  <span
                    className={cn(
                      "font-tabular font-medium",
                      (item.changeFromBuyPercent ?? 0) >= 0 ? "text-positive" : "text-negative"
                    )}
                  >
                    {formatPercent(item.changeFromBuyPercent ?? 0)}
                  </span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Target className="h-3.5 w-3.5" />
                  <TargetProgress
                    price={item.price}
                    buyPrice={item.buyPrice}
                    targetPrice={item.targetPrice}
                  />
                </div>
                <AlertBadge alert={item.alert} />
              </div>
              {item.stopLoss != null && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Stop loss</span>
                  <StopLossCell price={item.price} stopLoss={item.stopLoss} />
                </div>
              )}
            </div>
            <div className="flex snap-start [scroll-snap-stop:always]">
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="flex flex-1 flex-col items-center justify-center gap-1 bg-warning text-xs font-semibold text-warning-foreground"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="flex flex-1 flex-col items-center justify-center gap-1 bg-destructive text-xs font-semibold text-white"
              >
                <Trash2 className="h-4 w-4" />
                Remove
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
        open={!!quickViewItem}
        onOpenChange={(open) => !open && setQuickViewItem(null)}
      >
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-[calc(1rem+env(safe-area-inset-bottom))]"
          showCloseButton={false}
        >
          {quickViewItem && (
            <>
              {/* Drag handle: swipe up to open the full details page, swipe
                  down to dismiss — same gesture area, opposite directions. */}
              <div
                className="flex touch-none items-center justify-center py-2"
                onPointerDown={handleSheetDragStart}
                onPointerUp={(e) => handleSheetDragEnd(e, quickViewItem)}
              >
                <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="px-4 pb-3">
                <p className="text-xl font-bold">{displaySymbol(quickViewItem.symbol)}</p>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span className="font-tabular font-medium">{fmt(quickViewItem.price)}</span>
                  <span
                    className={cn(
                      "font-tabular text-xs font-medium",
                      quickViewItem.changePercent >= 0 ? "text-positive" : "text-negative"
                    )}
                  >
                    {formatPercent(quickViewItem.changePercent)}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 border-t border-border px-4 py-4">
                <Button
                  className="h-12 flex-1 text-base font-semibold"
                  onClick={() => {
                    onBuy(quickViewItem);
                    setQuickViewItem(null);
                  }}
                >
                  Buy
                </Button>
                <button
                  type="button"
                  className="h-12 flex-1 rounded-lg bg-destructive text-base font-semibold text-white"
                  onClick={() => {
                    onDelete(quickViewItem);
                    setQuickViewItem(null);
                  }}
                >
                  Remove
                </button>
              </div>
              <div className="flex gap-3 px-4 pb-2">
                <Link
                  href={stockHref(quickViewItem.symbol)}
                  className="flex flex-1 items-center gap-2 py-2 text-sm font-medium text-primary"
                  onClick={() => setQuickViewItem(null)}
                >
                  <Info className="h-4 w-4 shrink-0" />
                  Details
                </Link>
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 py-2 text-sm font-medium text-primary"
                  onClick={() => {
                    onEdit(quickViewItem);
                    setQuickViewItem(null);
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
