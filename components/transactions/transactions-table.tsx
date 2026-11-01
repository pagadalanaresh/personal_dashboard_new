"use client";

import { ArrowDownRight, ArrowUpRight, Trash2 } from "lucide-react";
import { format } from "date-fns";

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
import { cn, formatNumber } from "@/lib/utils";
import { useMarket } from "@/lib/market-context";
import type { TransactionDto } from "@/lib/transactions";

function displaySymbol(symbol: string) {
  return symbol.replace(/\.NS$/i, "");
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

export function TransactionsTable({
  transactions,
  onDelete,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: {
  transactions: TransactionDto[];
  onDelete: (transaction: TransactionDto) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
}) {
  const { format: fmt } = useMarket();
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
              <TableHead>Date</TableHead>
              <TableHead>Holding</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
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
                <TableCell className="text-right font-tabular font-medium">
                  {fmt(tx.total)}
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

      <div className="flex flex-col gap-3 md:hidden">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedIds.has(tx.id)}
                  onCheckedChange={() => onToggleSelect(tx.id)}
                  aria-label={`Select transaction for ${tx.symbol}`}
                  className="mt-0.5"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{displaySymbol(tx.symbol)}</span>
                    <TypeBadge type={tx.type} />
                  </div>
                  <p className="text-xs text-muted-foreground">{tx.name}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`Delete transaction for ${tx.symbol}`}
                onClick={() => onDelete(tx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p>{format(new Date(tx.date), "d MMM yyyy")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-tabular font-medium">{fmt(tx.total)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Quantity</p>
                <p className="font-tabular">{formatNumber(tx.quantity)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="font-tabular">{fmt(tx.price)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
