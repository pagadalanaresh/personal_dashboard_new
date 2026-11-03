"use client";

import * as React from "react";
import { Loader2, NotebookPen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function NotesPopover({
  notes,
  onSave,
  label,
  className,
}: {
  notes: string | null;
  onSave: (notes: string) => Promise<void>;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(notes ?? "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setValue(notes ?? "");
  }, [open, notes]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(value.trim());
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              notes ? "text-foreground" : "text-muted-foreground opacity-60 group-hover:opacity-100",
              className
            )}
            aria-label={notes ? `Edit note for ${label}` : `Add note for ${label}`}
          />
        }
      >
        <NotebookPen className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2" align="end">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Add a note for ${label}…`}
          className="min-h-24 resize-none text-sm"
          maxLength={500}
          autoFocus
        />
        <Button size="sm" className="w-full" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save
        </Button>
      </PopoverContent>
    </Popover>
  );
}
