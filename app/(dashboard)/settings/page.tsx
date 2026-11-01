import { redirect } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { AppearanceCard } from "@/components/settings/appearance-card";
import { RefreshIntervalCard } from "@/components/settings/refresh-interval-card";
import { ChangePasswordCard } from "@/components/settings/change-password-card";
import { ExportDataCard } from "@/components/settings/export-data-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const provider = process.env.MARKET_DATA_PROVIDER === "yahoo" ? "yahoo" : "mock";

  return (
    <div className="space-y-6">
      <PageHeader description="Manage your profile, appearance, and data preferences." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-primary text-lg text-primary-foreground">
                  {initialsFor(session.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{session.name}</p>
                <p className="text-sm text-muted-foreground">{session.email}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="settings-name">Full name</Label>
                <Input id="settings-name" defaultValue={session.name} disabled />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-email">Email</Label>
                <Input id="settings-email" defaultValue={session.email} disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        <AppearanceCard />

        <RefreshIntervalCard />

        <ExportDataCard />

        <ChangePasswordCard />

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TriangleAlert className="h-4 w-4 text-warning" />
              Disclaimer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Wealthfolio is a personal tracking tool, not a source of financial or
              investment advice.{" "}
              {provider === "yahoo"
                ? "Prices are sourced from an unofficial Yahoo Finance client and may be delayed, incomplete, or briefly unavailable."
                : "Market data shown while running locally is simulated and does not reflect real prices."}{" "}
              Always verify figures with your broker before making decisions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
