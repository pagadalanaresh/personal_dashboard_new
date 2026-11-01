"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserCog } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ImpersonationBanner({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [isExiting, setIsExiting] = React.useState(false);

  async function handleExit() {
    setIsExiting(true);
    try {
      const response = await fetch("/api/admin/impersonate/exit", { method: "POST" });
      if (!response.ok) throw new Error("Failed to exit impersonation");
      router.push("/admin/users");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      setIsExiting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm sm:px-6 lg:px-8">
      <span className="flex items-center gap-2 text-warning-foreground">
        <UserCog className="h-4 w-4" />
        Viewing as <strong className="font-medium">{name}</strong> ({email})
      </span>
      <Button variant="outline" size="sm" onClick={handleExit} disabled={isExiting}>
        Exit impersonation
      </Button>
    </div>
  );
}
