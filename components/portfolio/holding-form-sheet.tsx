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
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { holdingSchema, type HoldingInput, type HoldingFormValues } from "@/lib/validations";
import type { EnrichedHolding } from "@/lib/holdings";
import type { SymbolLookup } from "@/lib/market-data";

type HoldingFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holding: EnrichedHolding | null;
  onSubmit: (input: HoldingInput) => Promise<void>;
  // Prefills a fresh "add" flow (e.g. from the stock detail page) without
  // locking the symbol field the way editing an existing holding does.
  defaultSymbol?: { symbol: string; name: string; price: number };
};

export function HoldingFormSheet({
  open,
  onOpenChange,
  holding,
  onSubmit,
  defaultSymbol,
}: HoldingFormSheetProps) {
  const isEditing = !!holding;
  const isMobile = useIsMobile();
  const { market } = useMarket();
  const currencySymbol = market === "US" ? "$" : "₹";
  const form = useForm<HoldingFormValues, unknown, HoldingInput>({
    resolver: zodResolver(holdingSchema),
    defaultValues: {
      symbol: "",
      name: "",
      quantity: 0,
      avgCostBasis: 0,
      position: "SHORT",
      buyDate: new Date(),
      notes: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset(
        holding
          ? {
              symbol: holding.symbol,
              name: holding.name,
              quantity: holding.quantity,
              avgCostBasis: holding.avgCostBasis,
              position: holding.position,
              buyDate: holding.createdAt,
              notes: holding.notes ?? "",
            }
          : defaultSymbol
            ? {
                symbol: defaultSymbol.symbol,
                name: defaultSymbol.name,
                quantity: 0,
                avgCostBasis: defaultSymbol.price,
                position: "SHORT",
                buyDate: new Date(),
                notes: "",
              }
            : {
                symbol: "",
                name: "",
                quantity: 0,
                avgCostBasis: 0,
                position: "SHORT",
                buyDate: new Date(),
                notes: "",
              }
      );
    }
  }, [open, holding, defaultSymbol, form]);

  const symbolValue = form.watch("symbol");
  const nameValue = form.watch("name");
  const positionValue = form.watch("position");
  const buyDateValue = form.watch("buyDate") as Date | undefined;

  function handleSymbolSelect(result: SymbolLookup) {
    form.setValue("symbol", result.symbol, { shouldValidate: true, shouldDirty: true });
    form.setValue("name", result.name, { shouldDirty: true });
    form.setValue("avgCostBasis", result.price, { shouldDirty: true });
    form.clearErrors("symbol");
  }

  async function handleSubmit(values: HoldingInput) {
    try {
      await onSubmit(values);
      toast.success(isEditing ? "Holding updated" : "Holding added");
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
          <SheetTitle>{isEditing ? "Edit holding" : "Add holding"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? `Update the position details for ${holding?.symbol}.`
              : `Search ${market === "US" ? "US-listed" : "NSE-listed"} companies to add a position to your portfolio.`}
          </SheetDescription>
        </SheetHeader>
        <form
          id="holding-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
        >
          <div className="space-y-2">
            <Label>{market === "US" ? "US symbol" : "NSE symbol"}</Label>
            <SymbolSearchField
              value={symbolValue ? { symbol: symbolValue, name: nameValue || symbolValue } : null}
              disabled={isEditing}
              invalid={!!form.formState.errors.symbol}
              onSelect={handleSymbolSelect}
            />
            {form.formState.errors.symbol ? (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.symbol.message}
              </p>
            ) : !isEditing ? (
              <p className="text-xs text-muted-foreground">
                Company name and current price fill in automatically once you pick a match.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Company name</Label>
            <Input
              id="name"
              placeholder="Reliance Industries Limited"
              aria-invalid={!!form.formState.errors.name}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.name.message}
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
              <Label htmlFor="avgCostBasis">Avg. cost / share ({currencySymbol})</Label>
              <Input
                id="avgCostBasis"
                type="number"
                step="any"
                inputMode="decimal"
                aria-invalid={!!form.formState.errors.avgCostBasis}
                {...form.register("avgCostBasis")}
              />
              {form.formState.errors.avgCostBasis && (
                <p className="text-xs text-destructive" role="alert">
                  {form.formState.errors.avgCostBasis.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Position</Label>
            <Select
              value={positionValue}
              onValueChange={(value) =>
                form.setValue("position", value as "SHORT" | "LONG", { shouldValidate: true })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SHORT">Short</SelectItem>
                <SelectItem value="LONG">Long</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Buy date</Label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button type="button" variant="outline" className="w-full justify-start font-normal" />
                }
              >
                <CalendarIcon className="h-4 w-4" />
                {buyDateValue ? format(buyDateValue, "PPP") : "Pick a date"}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={buyDateValue}
                  onSelect={(date) => date && form.setValue("buyDate", date)}
                  disabled={{ after: new Date() }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Why you bought, your thesis, a reminder…"
              className="min-h-20 resize-none"
              maxLength={500}
              aria-invalid={!!form.formState.errors.notes}
              {...form.register("notes")}
            />
            {form.formState.errors.notes && (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.notes.message}
              </p>
            )}
          </div>
        </form>
        <SheetFooter className="mt-auto border-t border-border pt-4">
          <Button
            type="submit"
            form="holding-form"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Save changes" : "Add holding"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
