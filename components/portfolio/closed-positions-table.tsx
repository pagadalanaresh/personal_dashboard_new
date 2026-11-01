"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowUpDown, Trash2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChangeIndicator } from "@/components/shared/change-indicator";
import { NotesPopover } from "@/components/shared/notes-popover";
import { PositionBadge } from "@/components/shared/position-badge";
import {
  displaySymbol,
  formatNumber,
  formatPercent,
  stockHref,
} from "@/lib/utils";
import { useMarket } from "@/lib/market-context";
import type { ClosedPosition } from "@/lib/closed-positions";

type SortKey = "symbol" | "quantity" | "totalInvested" | "totalProceeds" | "realizedPL" | "openDate" | "closeDate";

function keyFor(position: ClosedPosition) {
  return position.transactionIds.join(",");
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

export function ClosedPositionsTable({
  positions,
  selectedKeys,
  onToggleSelect,
  onToggleSelectAll,
  onDelete,
  onSaveNotes,
}: {
  positions: ClosedPosition[];
  selectedKeys: Set<string>;
  onToggleSelect: (key: string) => void;
  onToggleSelectAll: (keys: string[]) => void;
  onDelete: (position: ClosedPosition) => void;
  onSaveNotes: (position: ClosedPosition, notes: string) => Promise<void>;
}) {
  const { format: fmt } = useMarket();
  const [sortKey, setSortKey] = React.useState<SortKey>("closeDate");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const sortedPositions = React.useMemo(() => {
    const sorted = [...positions].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal);
      }
      return (aVal as number) - (bVal as number);
    });
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [positions, sortKey, sortDir]);

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
                    sortedPositions.length > 0 &&
                    sortedPositions.every((p) => selectedKeys.has(keyFor(p)))
                  }
                  onCheckedChange={() => onToggleSelectAll(sortedPositions.map(keyFor))}
                  aria-label="Select all closed positions"
                />
              </TableHead>
              <TableHead>
                <SortButton label="Holding" sortableKey="symbol" onSort={toggleSort} />
              </TableHead>
              <TableHead>Position</TableHead>
              <TableHead className="text-right">
                <SortButton label="Qty traded" sortableKey="quantity" onSort={toggleSort} />
              </TableHead>
              <TableHead className="text-right">
                <SortButton label="Invested" sortableKey="totalInvested" onSort={toggleSort} />
              </TableHead>
              <TableHead className="text-right">
                <SortButton label="Proceeds" sortableKey="totalProceeds" onSort={toggleSort} />
              </TableHead>
              <TableHead className="text-right">
                <SortButton label="Realized P&L" sortableKey="realizedPL" onSort={toggleSort} />
              </TableHead>
              <TableHead>
                <SortButton label="Opened" sortableKey="openDate" onSort={toggleSort} />
              </TableHead>
              <TableHead>
                <SortButton label="Closed" sortableKey="closeDate" onSort={toggleSort} />
              </TableHead>
              <TableHead className="w-10" />
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPositions.map((position) => {
              const key = keyFor(position);
              return (
                <TableRow key={key} className="group">
                  <TableCell>
                    <Checkbox
                      checked={selectedKeys.has(key)}
                      onCheckedChange={() => onToggleSelect(key)}
                      aria-label={`Select closed position for ${position.symbol}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Link href={stockHref(position.symbol)} className="flex flex-col hover:underline">
                      <span className="font-medium">{displaySymbol(position.symbol)}</span>
                      <span className="max-w-[20ch] truncate text-xs font-normal text-muted-foreground no-underline">
                        {position.name}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <PositionBadge position={position.position} />
                  </TableCell>
                  <TableCell className="text-right font-tabular">
                    {formatNumber(position.quantity)}
                  </TableCell>
                  <TableCell className="text-right font-tabular">
                    {fmt(position.totalInvested)}
                  </TableCell>
                  <TableCell className="text-right font-tabular">
                    {fmt(position.totalProceeds)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <ChangeIndicator
                        value={position.realizedPL}
                        formatted={fmt(position.realizedPL, { signDisplay: "always" })}
                        className="justify-end"
                      />
                      <span className="font-tabular text-xs text-muted-foreground">
                        {formatPercent(position.realizedPLPercent)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {format(new Date(position.openDate), "d MMM yyyy")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {format(new Date(position.closeDate), "d MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <NotesPopover
                      notes={position.notes}
                      label={displaySymbol(position.symbol)}
                      onSave={(notes) => onSaveNotes(position, notes)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-60 group-hover:opacity-100"
                      aria-label={`Delete closed position for ${position.symbol}`}
                      onClick={() => onDelete(position)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {sortedPositions.map((position) => {
          const key = keyFor(position);
          return (
            <div
              key={key}
              className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedKeys.has(key)}
                    onCheckedChange={() => onToggleSelect(key)}
                    aria-label={`Select closed position for ${position.symbol}`}
                    className="mt-0.5"
                  />
                  <Link href={stockHref(position.symbol)} className="hover:underline">
                    <p className="font-medium">{displaySymbol(position.symbol)}</p>
                    <p className="text-xs text-muted-foreground no-underline">{position.name}</p>
                  </Link>
                </div>
                <div className="flex items-center gap-1">
                  <div className="text-right">
                    <ChangeIndicator
                      value={position.realizedPL}
                      formatted={fmt(position.realizedPL, { signDisplay: "always" })}
                    />
                    <p className="font-tabular text-xs text-muted-foreground">
                      {formatPercent(position.realizedPLPercent)}
                    </p>
                  </div>
                  <NotesPopover
                    notes={position.notes}
                    label={displaySymbol(position.symbol)}
                    onSave={(notes) => onSaveNotes(position, notes)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`Delete closed position for ${position.symbol}`}
                    onClick={() => onDelete(position)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Position</p>
                  <PositionBadge position={position.position} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Qty traded</p>
                  <p className="font-tabular">{formatNumber(position.quantity)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Invested &middot; Proceeds</p>
                  <p className="font-tabular">
                    {fmt(position.totalInvested)} &rarr;{" "}
                    {fmt(position.totalProceeds)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Opened</p>
                  <p>{format(new Date(position.openDate), "d MMM yyyy")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Closed</p>
                  <p>{format(new Date(position.closeDate), "d MMM yyyy")}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
