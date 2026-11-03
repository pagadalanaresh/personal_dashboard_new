"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SymbolSearchField } from "@/components/portfolio/symbol-search-field";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useMarket } from "@/lib/market-context";
import { cn } from "@/lib/utils";
import {
  transactionSchema,
  type TransactionInput,
  type TransactionFormValues,
} from "@/lib/validations";
import type { SymbolLookup } from "@/lib/market-data";
import type { EnrichedHolding } from "@/lib/holdings";

function displaySymbol(symbol: string) {
  return symbol.replace(/\.NS$/i, "");
}

export function TransactionFormSheet({
  open,
  onOpenChange,
  holdings,
  onSubmit,
  defaultSymbol,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holdings: EnrichedHolding[];
  onSubmit: (input: TransactionInput) => Promise<void>;
  // Prefills a fresh "buy" flow from elsewhere (e.g. the watchlist) without
  // locking the symbol field — the user can still change it before saving.
  defaultSymbol?: { symbol: string; name: string; price?: number };
}) {
  const isMobile = useIsMobile();
  const { market } = useMarket();
  const currencySymbol = market === "US" ? "$" : "₹";
  const form = useForm<TransactionFormValues, unknown, TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { symbol: "", name: "", type: "BUY", quantity: 0, price: 0, date: new Date() },
  });

  React.useEffect(() => {
    if (open) {
      form.reset(
        defaultSymbol
          ? {
              symbol: defaultSymbol.symbol,
              name: defaultSymbol.name,
              type: "BUY",
              quantity: 0,
              price: defaultSymbol.price ?? 0,
              date: new Date(),
            }
          : { symbol: "", name: "", type: "BUY", quantity: 0, price: 0, date: new Date() }
      );
    }
  }, [open, defaultSymbol, form]);

  const symbolValue = form.watch("symbol");
  const nameValue = form.watch("name");
  const type = form.watch("type");
  const dateValue = form.watch("date") as Date | undefined;

  const heldQuantity = holdings.find((h) => h.symbol === symbolValue)?.quantity ?? 0;

  function handleSymbolSelect(result: SymbolLookup) {
    form.setValue("symbol", result.symbol, { shouldValidate: true, shouldDirty: true });
    form.setValue("name", result.name, { shouldDirty: true });
    form.setValue("price", result.price, { shouldDirty: true });
  }

  async function handleSubmit(values: TransactionInput) {
    try {
      await onSubmit(values);
      toast.success(values.type === "BUY" ? "Buy logged" : "Sell logged");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn("flex flex-col gap-0", isMobile ? "max-h-[85vh] rounded-t-2xl" : "sm:max-w-md")}
      >
        <SheetHeader>
          <SheetTitle>Add transaction</SheetTitle>
          <SheetDescription>
            Log a buy or sell — your holdings update automatically to match.
          </SheetDescription>
        </SheetHeader>
        <form
          id="transaction-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
        >
          <div className="space-y-2">
            <Label>{market === "US" ? "US symbol" : "NSE symbol"}</Label>
            <SymbolSearchField
              value={symbolValue ? { symbol: symbolValue, name: nameValue || symbolValue } : null}
              invalid={!!form.formState.errors.symbol}
              onSelect={handleSymbolSelect}
            />
            {form.formState.errors.symbol && (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.symbol.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(value) => {
                const nextType = value as "BUY" | "SELL";
                form.setValue("type", nextType, { shouldValidate: true });
                // Prefill with the full held quantity as a starting point for
                // a full exit — the field stays editable for a partial sell.
                if (nextType === "SELL") {
                  form.setValue("quantity", heldQuantity, { shouldValidate: true, shouldDirty: true });
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">Buy</SelectItem>
                <SelectItem value="SELL">Sell</SelectItem>
              </SelectContent>
            </Select>
            {type === "SELL" && symbolValue && (
              <p className="text-xs text-muted-foreground">
                You currently hold {heldQuantity} share{heldQuantity === 1 ? "" : "s"} of{" "}
                {displaySymbol(symbolValue)}.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                inputMode="decimal"
                aria-invalid={!!form.formState.errors.quantity}
                {...form.register("quantity")}
              />
              {form.formState.errors.quantity && (
                <p className="text-xs text-destructive" role="alert">
                  {form.formState.errors.quantity.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price / share ({currencySymbol})</Label>
              <Input
                id="price"
                type="number"
                step="any"
                inputMode="decimal"
                aria-invalid={!!form.formState.errors.price}
                {...form.register("price")}
              />
              {form.formState.errors.price && (
                <p className="text-xs text-destructive" role="alert">
                  {form.formState.errors.price.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button type="button" variant="outline" className="w-full justify-start font-normal" />
                }
              >
                <CalendarIcon className="h-4 w-4" />
                {dateValue ? format(dateValue, "PPP") : "Pick a date"}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateValue}
                  onSelect={(date) => date && form.setValue("date", date)}
                  disabled={{ after: new Date() }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </form>
        <SheetFooter className="mt-auto border-t border-border pt-4">
          <Button
            type="submit"
            form="transaction-form"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {type === "BUY" ? "Log buy" : "Log sell"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
