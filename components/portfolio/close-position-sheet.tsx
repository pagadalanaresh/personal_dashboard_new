"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn, formatNumber } from "@/lib/utils";
import { useMarket } from "@/lib/market-context";
import type { EnrichedHolding } from "@/lib/holdings";

const closePositionSchema = z.object({
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  closeDate: z.coerce.date().optional(),
});

type ClosePositionFormValues = z.input<typeof closePositionSchema>;
export type ClosePositionInput = z.output<typeof closePositionSchema>;

function displaySymbol(symbol: string) {
  return symbol.replace(/\.NS$/i, "");
}

export function ClosePositionSheet({
  open,
  onOpenChange,
  holding,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holding: EnrichedHolding | null;
  onSubmit: (input: ClosePositionInput) => Promise<void>;
}) {
  const { market, format: fmt } = useMarket();
  const currencySymbol = market === "US" ? "$" : "₹";
  const form = useForm<ClosePositionFormValues, unknown, ClosePositionInput>({
    resolver: zodResolver(closePositionSchema),
    defaultValues: { quantity: 0, price: 0, closeDate: new Date() },
  });

  React.useEffect(() => {
    if (open && holding) {
      form.reset({ quantity: holding.quantity, price: holding.price, closeDate: new Date() });
    }
  }, [open, holding, form]);

  const quantity = Number(form.watch("quantity")) || 0;
  const price = Number(form.watch("price")) || 0;
  const closeDateValue = form.watch("closeDate") as Date | undefined;
  const proceeds = quantity * price;
  const estimatedPL = holding ? proceeds - quantity * holding.avgCostBasis : 0;
  const isFullClose = !!holding && quantity >= holding.quantity;

  async function handleSubmit(values: ClosePositionInput) {
    if (!holding) return;
    if (values.quantity > holding.quantity + 1e-6) {
      form.setError("quantity", {
        message: `You only hold ${formatNumber(holding.quantity)} shares`,
      });
      return;
    }
    try {
      await onSubmit(values);
      toast.success(isFullClose ? "Position closed" : "Shares sold");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  if (!holding) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Close {displaySymbol(holding.symbol)}</SheetTitle>
          <SheetDescription>
            Sell some or all of your {formatNumber(holding.quantity)} shares to book profit or
            loss. This logs a sell transaction.
          </SheetDescription>
        </SheetHeader>
        <form
          id="close-position-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="close-quantity">Quantity</Label>
              <Input
                id="close-quantity"
                type="number"
                step="any"
                inputMode="decimal"
                aria-invalid={!!form.formState.errors.quantity}
                {...form.register("quantity")}
              />
              <p className="text-xs text-muted-foreground">
                You hold {formatNumber(holding.quantity)}
              </p>
              {form.formState.errors.quantity && (
                <p className="text-xs text-destructive" role="alert">
                  {form.formState.errors.quantity.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="close-price">Price / share ({currencySymbol})</Label>
              <Input
                id="close-price"
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
            <Label>Close date</Label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button type="button" variant="outline" className="w-full justify-start font-normal" />
                }
              >
                <CalendarIcon className="h-4 w-4" />
                {closeDateValue ? format(closeDateValue, "PPP") : "Pick a date"}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={closeDateValue}
                  onSelect={(date) => date && form.setValue("closeDate", date)}
                  disabled={{ after: new Date() }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Proceeds</span>
              <span className="font-tabular">{fmt(proceeds)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estimated P&amp;L</span>
              <span
                className={cn(
                  "font-tabular font-medium",
                  estimatedPL >= 0 ? "text-positive" : "text-negative"
                )}
              >
                {fmt(estimatedPL, { signDisplay: "always" })}
              </span>
            </div>
          </div>
        </form>
        <SheetFooter className="mt-auto border-t border-border pt-4">
          <Button
            type="submit"
            form="close-position-form"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isFullClose ? "Close position" : "Sell shares"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
