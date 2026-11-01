"use client";

import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BulkActionsBar({
  count,
  onDelete,
  onClear,
}: {
  count: number;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-2">
      <span className="text-sm text-muted-foreground">
        {count} selected
      </span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
          Delete selected
        </Button>
      </div>
    </div>
  );
}
