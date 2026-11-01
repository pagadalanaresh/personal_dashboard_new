"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

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
import { displaySymbol, stockHref } from "@/lib/utils";
import { useMarket } from "@/lib/market-context";
import type { SymbolSearchResult } from "@/lib/market-data";

export function StockSearch() {
  const router = useRouter();
  const { market } = useMarket();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SymbolSearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    if (!open || query.trim().length < 2) {
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

  function handleSelect(result: SymbolSearchResult) {
    setOpen(false);
    setQuery("");
    router.push(stockHref(result.symbol));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full max-w-sm justify-start font-normal text-muted-foreground"
          />
        }
      >
        <Search className="h-4 w-4 shrink-0" />
        Search any {market === "US" ? "US" : "NSE"} stock…
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
              <p className="py-6 text-center text-sm text-muted-foreground">
                Searching {market === "US" ? "US" : "NSE"}…
              </p>
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
                    onSelect={() => handleSelect(result)}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium">{displaySymbol(result.symbol)}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {result.name}
                      </span>
                    </span>
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
