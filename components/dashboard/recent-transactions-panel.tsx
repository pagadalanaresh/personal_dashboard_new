import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Receipt } from "lucide-react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, displaySymbol, stockHref } from "@/lib/utils";
import { useMarket } from "@/lib/market-context";
import type { TransactionDto } from "@/lib/transactions";

export function RecentTransactionsPanel({
  transactions,
  isLoading,
}: {
  transactions: TransactionDto[];
  isLoading: boolean;
}) {
  const { format: fmt } = useMarket();
  const recent = transactions.slice(0, 5);

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle>Recent transactions</CardTitle>
        <CardDescription>Your latest buys and sells</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : recent.length > 0 ? (
          <div className="divide-y divide-border">
            {recent.map((tx) => {
              const isBuy = tx.type === "BUY";
              return (
                <Link
                  key={tx.id}
                  href={stockHref(tx.symbol)}
                  className="-mx-2 flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full",
                        isBuy ? "bg-positive-muted text-positive" : "bg-negative-muted text-negative"
                      )}
                    >
                      {isBuy ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{displaySymbol(tx.symbol)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.date), "d MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <p className="font-tabular text-sm font-medium">{fmt(tx.total)}</p>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Receipt}
            title="No transactions yet"
            description="Buys and sells you log will show up here, and your holdings will stay in sync automatically."
            className="border-none py-6"
            action={
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/transactions" />}
              >
                Go to transactions
              </Button>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
