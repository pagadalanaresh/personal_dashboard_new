"use client";

import { useMarket, type CurrencyScope } from "@/lib/market-context";
import { cn } from "@/lib/utils";

const OPTIONS: { value: CurrencyScope; label: string }[] = [
  { value: "INR", label: "₹ INR" },
  { value: "USD", label: "$ USD" },
];

export function CurrencyToggle() {
  const { displayCurrency, setDisplayCurrency } = useMarket();

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setDisplayCurrency(option.value)}
          aria-current={displayCurrency === option.value ? "true" : undefined}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition-colors",
            displayCurrency === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
