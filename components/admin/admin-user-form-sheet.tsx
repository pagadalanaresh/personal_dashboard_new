"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { PasswordField } from "@/components/auth/auth-form";
import { adminUpdateUserSchema, type AdminUpdateUserInput } from "@/lib/validations";
import type { AdminUserSummary } from "@/lib/admin";

export function AdminUserFormSheet({
  open,
  onOpenChange,
  user,
  isSelf,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUserSummary | null;
  isSelf: boolean;
  onSubmit: (input: AdminUpdateUserInput) => Promise<void>;
}) {
  const form = useForm<AdminUpdateUserInput>({
    resolver: zodResolver(adminUpdateUserSchema),
    defaultValues: { name: "", email: "", role: "USER", password: "" },
  });

  React.useEffect(() => {
    if (open && user) {
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role as "USER" | "ADMIN",
        password: "",
      });
    }
  }, [open, user, form]);

  const role = form.watch("role");

  async function handleSubmit(values: AdminUpdateUserInput) {
    try {
      await onSubmit(values);
      toast.success("User updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit user</SheetTitle>
          <SheetDescription>Update profile details and access for {user.email}.</SheetDescription>
        </SheetHeader>
        <form
          id="admin-user-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              aria-invalid={!!form.formState.errors.name}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              aria-invalid={!!form.formState.errors.email}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={role}
              disabled={isSelf}
              onValueChange={(value) =>
                form.setValue("role", value as "USER" | "ADMIN", { shouldValidate: true })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            {isSelf && (
              <p className="text-xs text-muted-foreground">
                You can&apos;t change your own admin access.
              </p>
            )}
          </div>
          <PasswordField
            id="password"
            label="New password"
            autoComplete="new-password"
            error={form.formState.errors.password?.message}
            hint="Leave blank to keep their current password."
            register={form.register}
          />
        </form>
        <SheetFooter className="mt-auto border-t border-border pt-4">
          <Button
            type="submit"
            form="admin-user-form"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
