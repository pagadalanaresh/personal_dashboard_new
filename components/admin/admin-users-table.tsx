"use client";

import { format } from "date-fns";
import { MoreHorizontal, Pencil } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminUserSummary } from "@/lib/admin";

function UserCell({
  user,
  isSelf,
  onImpersonate,
}: {
  user: AdminUserSummary;
  isSelf: boolean;
  onImpersonate: (user: AdminUserSummary) => void;
}) {
  if (isSelf) {
    return (
      <div className="flex flex-col">
        <span className="font-medium">
          {user.name}
          <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
        </span>
        <span className="text-xs text-muted-foreground">{user.email}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onImpersonate(user)}
      title={`Sign in as ${user.name} in a new tab`}
      className="flex flex-col text-left hover:underline"
    >
      <span className="font-medium">{user.name}</span>
      <span className="text-xs text-muted-foreground no-underline">{user.email}</span>
    </button>
  );
}

export function AdminUsersTable({
  users,
  currentUserId,
  onEdit,
  onImpersonate,
}: {
  users: AdminUserSummary[];
  currentUserId: string;
  onEdit: (user: AdminUserSummary) => void;
  onImpersonate: (user: AdminUserSummary) => void;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Holdings</TableHead>
              <TableHead className="text-right">Watchlist</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <TableRow key={user.id} className="group">
                  <TableCell>
                    <UserCell user={user} isSelf={isSelf} onImpersonate={onImpersonate} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-tabular">{user.holdingsCount}</TableCell>
                  <TableCell className="text-right font-tabular">{user.watchlistCount}</TableCell>
                  <TableCell className="text-right font-tabular">
                    {user.transactionsCount}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {format(new Date(user.createdAt), "d MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-60 group-hover:opacity-100"
                            aria-label={`Actions for ${user.email}`}
                          />
                        }
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(user)}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          return (
            <div
              key={user.id}
              className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between">
                <UserCell user={user} isSelf={isSelf} onImpersonate={onImpersonate} />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Actions for ${user.email}`}
                      />
                    }
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(user)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>
                    {user.role}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p>{format(new Date(user.createdAt), "d MMM yyyy")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Holdings &middot; Watchlist</p>
                  <p className="font-tabular">
                    {user.holdingsCount} &middot; {user.watchlistCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Transactions</p>
                  <p className="font-tabular">{user.transactionsCount}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
