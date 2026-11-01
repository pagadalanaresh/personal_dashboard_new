"use client";

import * as React from "react";
import type { AdminUserSummary } from "@/lib/admin";
import type { AdminUpdateUserInput } from "@/lib/validations";

async function parseOrThrow(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function useAdminUsers() {
  const [users, setUsers] = React.useState<AdminUserSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await parseOrThrow(response);
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const updateUser = React.useCallback(
    async (id: string, input: AdminUpdateUserInput) => {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      await parseOrThrow(response);
      await load();
    },
    [load]
  );

  const impersonate = React.useCallback(async (id: string) => {
    const response = await fetch(`/api/admin/users/${id}/impersonate`, { method: "POST" });
    await parseOrThrow(response);
  }, []);

  return { users, isLoading, error, updateUser, impersonate, refresh: load };
}
