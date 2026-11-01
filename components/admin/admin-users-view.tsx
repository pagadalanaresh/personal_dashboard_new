"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { AdminUserFormSheet } from "@/components/admin/admin-user-form-sheet";
import { useAdminUsers } from "@/hooks/use-admin-users";
import type { AdminUserSummary } from "@/lib/admin";

export function AdminUsersView({ currentUserId }: { currentUserId: string }) {
  const { users, isLoading, updateUser, impersonate } = useAdminUsers();
  const [editingUser, setEditingUser] = React.useState<AdminUserSummary | null>(null);
  const [impersonatingUser, setImpersonatingUser] = React.useState<AdminUserSummary | null>(null);
  const [isImpersonating, setIsImpersonating] = React.useState(false);

  async function handleImpersonate() {
    if (!impersonatingUser) return;
    // Open the tab synchronously (before the await below) so browsers don't
    // treat it as an unrequested popup — it's navigated once sign-in succeeds.
    const newTab = window.open("", "_blank");
    setIsImpersonating(true);
    try {
      await impersonate(impersonatingUser.id);
      toast.success(`Signed in as ${impersonatingUser.name} in a new tab`);
      if (newTab) {
        newTab.location.href = "/dashboard";
      } else {
        toast.info("Your browser blocked the new tab — allow pop-ups for this site to use it.");
      }
    } catch (error) {
      newTab?.close();
      toast.error(error instanceof Error ? error.message : "Failed to sign in as this user");
    } finally {
      setIsImpersonating(false);
      setImpersonatingUser(null);
    }
  }

  return (
    <div>
      <PageHeader description="View and manage every account on Wealthfolio. Click a user's name to sign in as them in a new tab." />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users yet" description="No accounts have signed up." />
      ) : (
        <AdminUsersTable
          users={users}
          currentUserId={currentUserId}
          onEdit={setEditingUser}
          onImpersonate={setImpersonatingUser}
        />
      )}

      <AdminUserFormSheet
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        user={editingUser}
        isSelf={editingUser?.id === currentUserId}
        onSubmit={(input) => {
          if (!editingUser) return Promise.resolve();
          return updateUser(editingUser.id, input);
        }}
      />

      <AlertDialog
        open={!!impersonatingUser}
        onOpenChange={(open) => !open && setImpersonatingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign in as {impersonatingUser?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll see the app exactly as {impersonatingUser?.email} does. Your own admin
              session is saved, so you can return to it anytime from the banner shown while
              impersonating.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImpersonating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImpersonate} disabled={isImpersonating}>
              Sign in as user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
