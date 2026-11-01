"use client";

import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REFRESH_INTERVAL_OPTIONS_MINUTES, useRefreshInterval } from "@/hooks/use-refresh-interval";

export function RefreshIntervalCard() {
  const [minutes, setMinutes] = useRefreshInterval();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-4.5 w-4.5 text-muted-foreground" />
          Live price refresh
        </CardTitle>
        <CardDescription>
          How often to re-fetch prices while the NSE market is open (9:15–15:30 IST, Mon–Fri).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select value={String(minutes)} onValueChange={(value) => setMinutes(Number(value))}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REFRESH_INTERVAL_OPTIONS_MINUTES.map((option) => (
              <SelectItem key={option} value={String(option)}>
                Every {option} minute{option === 1 ? "" : "s"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-2 text-xs text-muted-foreground">
          Prices don&apos;t refresh while the market is closed.
        </p>
      </CardContent>
    </Card>
  );
}
