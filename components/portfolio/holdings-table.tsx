"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpDown, Banknote, MoreHorizontal, Pencil, ShoppingCart, Trash2 } from "lucide-react";

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
import { ChangeIndicator } from "@/components/shared/change-indicator";
import { NotesPopover } from "@/components/shared/notes-popover";
import { PositionBadge } from "@/components/shared/position-badge";
import { TrendBadge } from "@/components/shared/trend-badge";
import {
  compareNullableValues,
  displaySymbol,
  formatNumber,
  formatPercent,
  stockHref,
} from "@/lib/utils";
import { useMarket } from "@/lib/market-context";
import { useTrendScores } from "@/hooks/use-trend-scores";
import type { EnrichedHolding } from "@/lib/holdings";

type SortKey = "symbol" | "marketValue" | "gainLoss" | "dayChangePercent" | "weight" | "trendScore";

type HoldingRow = EnrichedHolding & { weight: number; trendScore: number | null };

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
  const [sortKey, setSortKey] = React.useState<SortKey>("marketValue");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

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

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
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

      <div className="flex flex-col gap-3 md:hidden">
        {sortedRows.map((holding) => (
          <div key={holding.id} className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedIds.has(holding.id)}
                  onCheckedChange={() => onToggleSelect(holding.id)}
                  aria-label={`Select ${holding.symbol}`}
                  className="mt-0.5"
                />
                <Link href={stockHref(holding.symbol)} className="hover:underline">
                  <p className="font-medium">{displaySymbol(holding.symbol)}</p>
                  <p className="text-xs text-muted-foreground no-underline">{holding.name}</p>
                </Link>
              </div>
              <div className="flex items-center gap-1">
                <NotesPopover
                  notes={holding.notes}
                  label={displaySymbol(holding.symbol)}
                  onSave={(notes) => onSaveNotes(holding, notes)}
                />
                <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
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
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Position</p>
                <div className="flex items-center gap-2">
                  <PositionBadge position={holding.position} />
                  <TrendBadge trend={trendScores.get(holding.symbol)} isLoading={trendLoading} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Market value</p>
                <p className="font-tabular font-medium">{fmt(holding.marketValue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gain / loss</p>
                <ChangeIndicator
                  value={holding.gainLoss}
                  formatted={fmt(holding.gainLoss, { signDisplay: "always" })}
                />
                <p className="font-tabular text-xs text-muted-foreground">
                  {formatPercent(holding.gainLossPercent)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Qty &middot; Avg cost</p>
                <p className="font-tabular">
                  {formatNumber(holding.quantity)} @ {fmt(holding.avgCostBasis)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Day change</p>
                <ChangeIndicator
                  value={holding.dayChange}
                  formatted={fmt(holding.dayChange, { signDisplay: "always" })}
                />
                <p className="font-tabular text-xs text-muted-foreground">
                  {formatPercent(holding.dayChangePercent)}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Progress value={holding.weight} className="h-1.5" />
              <span className="text-xs text-muted-foreground font-tabular">
                {holding.weight.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
