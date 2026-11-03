"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { watchlistSchema, type WatchlistInput, type WatchlistFormValues } from "@/lib/validations";
import type { SymbolLookup } from "@/lib/market-data";
import type { EnrichedWatchlistItem } from "@/lib/watchlist";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useWatchlistSections } from "@/hooks/use-watchlist-sections";
import { useMarket } from "@/lib/market-context";
import { cn } from "@/lib/utils";

export function WatchlistFormSheet({
  open,
  onOpenChange,
  item,
  onSubmit,
  defaultSymbol,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: EnrichedWatchlistItem | null;
  onSubmit: (input: WatchlistInput) => Promise<void>;
  // Prefills a fresh "add" flow (e.g. from the stock detail page) without
  // locking the symbol field the way editing an existing item does.
  defaultSymbol?: { symbol: string; name: string };
}) {
  const isEditing = !!item;
  const isMobile = useIsMobile();
  const { market } = useMarket();
  const currencySymbol = market === "US" ? "$" : "₹";
  const { sections } = useWatchlistSections();
  const form = useForm<WatchlistFormValues, unknown, WatchlistInput>({
    resolver: zodResolver(watchlistSchema),
    defaultValues: {
      symbol: "",
      name: "",
      buyPrice: undefined,
      targetPrice: undefined,
      stopLoss: undefined,
      position: "SHORT",
      sectionId: null,
      notes: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset(
        item
          ? {
              symbol: item.symbol,
              name: item.name,
              buyPrice: item.buyPrice ?? undefined,
              targetPrice: item.targetPrice ?? undefined,
              stopLoss: item.stopLoss ?? undefined,
              position: item.position,
              sectionId: item.sectionId,
              notes: item.notes ?? "",
            }
          : defaultSymbol
            ? {
                symbol: defaultSymbol.symbol,
                name: defaultSymbol.name,
                buyPrice: undefined,
                targetPrice: undefined,
                stopLoss: undefined,
                position: "SHORT",
                sectionId: null,
                notes: "",
              }
            : {
                symbol: "",
                name: "",
                buyPrice: undefined,
                targetPrice: undefined,
                stopLoss: undefined,
                position: "SHORT",
                sectionId: null,
                notes: "",
              }
      );
    }
  }, [open, item, defaultSymbol, form]);

  const symbolValue = form.watch("symbol");
  const nameValue = form.watch("name");
  const positionValue = form.watch("position");
  const sectionIdValue = form.watch("sectionId");

  function handleSymbolSelect(result: SymbolLookup) {
    form.setValue("symbol", result.symbol, { shouldValidate: true, shouldDirty: true });
    form.setValue("name", result.name, { shouldDirty: true });
  }

  async function handleSubmit(values: WatchlistInput) {
    try {
      await onSubmit(values);
      toast.success(isEditing ? "Watchlist item updated" : "Added to watchlist");
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
          <SheetTitle>{isEditing ? "Edit watchlist item" : "Add to watchlist"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? `Update the buy, target, and stop-loss price for ${item?.symbol}.`
              : `Search ${market === "US" ? "US-listed" : "NSE-listed"} companies to track, with an optional buy, target, and stop-loss price.`}
          </SheetDescription>
        </SheetHeader>
        <form
          id="watchlist-form"
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
            {form.formState.errors.symbol && (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.symbol.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="buyPrice">Buy price ({currencySymbol}, optional)</Label>
            <Input
              id="buyPrice"
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="e.g. 1200"
              aria-invalid={!!form.formState.errors.buyPrice}
              {...form.register("buyPrice")}
            />
            {form.formState.errors.buyPrice ? (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.buyPrice.message}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                What you paid (or plan to pay) — used to show gain/loss in the list.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetPrice">Target price ({currencySymbol}, optional)</Label>
            <Input
              id="targetPrice"
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="e.g. 1500"
              aria-invalid={!!form.formState.errors.targetPrice}
              {...form.register("targetPrice")}
            />
            {form.formState.errors.targetPrice ? (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.targetPrice.message}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                We&apos;ll flag this symbol once price gets close to your target.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="stopLoss">Stop loss ({currencySymbol}, optional)</Label>
            <Input
              id="stopLoss"
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="e.g. 1050"
              aria-invalid={!!form.formState.errors.stopLoss}
              {...form.register("stopLoss")}
            />
            {form.formState.errors.stopLoss ? (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.stopLoss.message}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                We&apos;ll flag this symbol if price drops to or below your stop loss.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Position</Label>
            <Select
              items={{ SHORT: "Short", LONG: "Long" }}
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
            <Label>Section</Label>
            <Select
              items={{
                none: "No section",
                ...Object.fromEntries(sections.map((section) => [section.id, section.name])),
              }}
              value={sectionIdValue ?? "none"}
              onValueChange={(value) =>
                form.setValue("sectionId", value === "none" ? null : value, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No section</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Why you're watching this, a reminder…"
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
            form="watchlist-form"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Save changes" : "Add to watchlist"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
