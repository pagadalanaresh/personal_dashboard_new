"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useMarket } from "@/lib/market-context";
import type { SymbolLookup, SymbolSearchResult } from "@/lib/market-data";

function displaySymbol(symbol: string) {
  return symbol.replace(/\.NS$/i, "");
}

export function SymbolSearchField({
  value,
  disabled,
  invalid,
  onSelect,
}: {
  value: { symbol: string; name: string } | null;
  disabled?: boolean;
  invalid?: boolean;
  onSelect: (result: SymbolLookup) => void;
}) {
  const { market } = useMarket();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SymbolSearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selectingSymbol, setSelectingSymbol] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || query.trim().length < 2) {
      // Clear stale results when the query is cleared or popover closes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    let cancelled = false;
    const timeout = setTimeout(() => {
      setSearching(true);
      fetch(`/api/market-data/search?q=${encodeURIComponent(query)}&market=${market}`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setResults(data.results ?? []);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, open, market]);

  async function handleSelect(result: SymbolSearchResult) {
    setSelectingSymbol(result.symbol);
    try {
      const response = await fetch(
        `/api/market-data/lookup?symbol=${encodeURIComponent(result.symbol)}&market=${market}`
      );
      const data = await response.json();
      onSelect({
        symbol: result.symbol,
        name: result.name,
        price: response.ok ? data.result.price : 0,
      });
    } finally {
      setSelectingSymbol(null);
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            aria-invalid={invalid}
            className="w-full justify-between font-normal"
          />
        }
      >
        {value ? (
          <span className="flex min-w-0 items-baseline gap-1.5 truncate">
            <span className="font-medium">{displaySymbol(value.symbol)}</span>
            <span className="truncate text-muted-foreground">{value.name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">
            Search {market === "US" ? "US" : "NSE"} stocks…
          </span>
        )}
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by company or symbol…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {query.trim().length < 2 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters
              </p>
            ) : searching ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching {market === "US" ? "US" : "NSE"}…
              </div>
            ) : results.length === 0 ? (
              <CommandEmpty>
                No {market === "US" ? "US" : "NSE"} matches for &quot;{query}&quot;
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {results.map((result) => (
                  <CommandItem
                    key={result.symbol}
                    value={result.symbol}
                    disabled={selectingSymbol !== null}
                    onSelect={() => handleSelect(result)}
                    className={cn(
                      "flex items-center justify-between",
                      selectingSymbol === result.symbol && "opacity-60"
                    )}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium">{displaySymbol(result.symbol)}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {result.name}
                      </span>
                    </span>
                    {selectingSymbol === result.symbol && (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
