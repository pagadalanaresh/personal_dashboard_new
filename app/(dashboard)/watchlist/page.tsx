"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { WatchlistSection } from "@prisma/client";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkActionsBar } from "@/components/shared/bulk-actions-bar";
import { WatchlistTable, WATCHLIST_ITEM_DRAG_TYPE } from "@/components/watchlist/watchlist-table";
import { WatchlistFormSheet } from "@/components/watchlist/watchlist-form-sheet";
import { TransactionFormSheet } from "@/components/transactions/transaction-form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useWatchlistSections } from "@/hooks/use-watchlist-sections";
import { useHoldings } from "@/hooks/use-holdings";
import { useTransactions } from "@/hooks/use-transactions";
import type { EnrichedWatchlistItem } from "@/lib/watchlist";
import { cn } from "@/lib/utils";

export default function WatchlistPage() {
  const { items, isLoading, addItem, updateItem, deleteItem, deleteItems, moveToSection } =
    useWatchlist();
  const { sections, addSection, renameSection, deleteSection } = useWatchlistSections();
  const { holdings } = useHoldings();
  const heldSymbols = React.useMemo(() => new Set(holdings.map((h) => h.symbol)), [holdings]);
  const { addTransaction } = useTransactions();
  const [search, setSearch] = React.useState("");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<EnrichedWatchlistItem | null>(null);
  const [buyingItem, setBuyingItem] = React.useState<EnrichedWatchlistItem | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<EnrichedWatchlistItem | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(new Set());
  const [sectionDialogOpen, setSectionDialogOpen] = React.useState(false);
  const [editingSection, setEditingSection] = React.useState<WatchlistSection | null>(null);
  const [sectionName, setSectionName] = React.useState("");
  const [savingSection, setSavingSection] = React.useState(false);
  const [pendingDeleteSection, setPendingDeleteSection] = React.useState<WatchlistSection | null>(null);
  const [dragOverKey, setDragOverKey] = React.useState<string | null>(null);

  const filtered = items.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
  });

  const groups = React.useMemo(() => {
    const bySection = new Map<string, EnrichedWatchlistItem[]>();
    const noSection: EnrichedWatchlistItem[] = [];
    for (const item of filtered) {
      if (item.sectionId) {
        const list = bySection.get(item.sectionId) ?? [];
        list.push(item);
        bySection.set(item.sectionId, list);
      } else {
        noSection.push(item);
      }
    }
    return [
      ...sections.map((section) => ({
        key: section.id,
        section,
        items: bySection.get(section.id) ?? [],
      })),
      { key: "none", section: null as WatchlistSection | null, items: noSection },
    ].filter((group) => group.section || group.items.length > 0);
  }, [filtered, sections]);

  function openAddSheet() {
    setEditingItem(null);
    setSheetOpen(true);
  }

  function openEditSheet(item: EnrichedWatchlistItem) {
    setEditingItem(item);
    setSheetOpen(true);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids: string[]) {
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await deleteItem(pendingDelete.id);
      toast.success(`Removed ${pendingDelete.symbol} from watchlist`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove item");
    } finally {
      setPendingDelete(null);
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    try {
      await deleteItems(ids);
      toast.success(`Removed ${ids.length} item${ids.length === 1 ? "" : "s"} from watchlist`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove items");
    } finally {
      setBulkDeleteOpen(false);
    }
  }

  async function handleSaveNotes(item: EnrichedWatchlistItem, notes: string) {
    await updateItem(item.id, {
      symbol: item.symbol,
      name: item.name,
      buyPrice: item.buyPrice ?? undefined,
      targetPrice: item.targetPrice ?? undefined,
      stopLoss: item.stopLoss ?? undefined,
      position: item.position,
      sectionId: item.sectionId,
      notes,
    });
  }

  function toggleCollapsed(key: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleDropOnSection(e: React.DragEvent, sectionId: string | null) {
    e.preventDefault();
    setDragOverKey(null);
    const itemId = e.dataTransfer.getData(WATCHLIST_ITEM_DRAG_TYPE);
    if (!itemId) return;
    const draggedItem = items.find((i) => i.id === itemId);
    if (!draggedItem || draggedItem.sectionId === sectionId) return;
    moveToSection(itemId, sectionId).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to move item");
    });
  }

  function openAddSection() {
    setEditingSection(null);
    setSectionName("");
    setSectionDialogOpen(true);
  }

  function openRenameSection(section: WatchlistSection) {
    setEditingSection(section);
    setSectionName(section.name);
    setSectionDialogOpen(true);
  }

  async function handleSaveSection(e: React.FormEvent) {
    e.preventDefault();
    const name = sectionName.trim();
    if (!name) return;
    setSavingSection(true);
    try {
      if (editingSection) {
        await renameSection(editingSection.id, { name });
        toast.success("Section renamed");
      } else {
        await addSection({ name });
        toast.success("Section added");
      }
      setSectionDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save section");
    } finally {
      setSavingSection(false);
    }
  }

  async function handleDeleteSection() {
    if (!pendingDeleteSection) return;
    try {
      await deleteSection(pendingDeleteSection.id);
      toast.success(`Deleted "${pendingDeleteSection.name}"`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete section");
    } finally {
      setPendingDeleteSection(null);
    }
  }

  return (
    <div>
      <PageHeader
        description="Track symbols you're considering and get alerted when they hit your target price."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openAddSection}>
              <FolderPlus className="h-4 w-4" />
              Add section
            </Button>
            <Button onClick={openAddSheet}>
              <Plus className="h-4 w-4" />
              Add to watchlist
            </Button>
          </div>
        }
      />

      {!isLoading && items.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by symbol or name"
            className="pl-9"
          />
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <BulkActionsBar
          count={selectedIds.size}
          onDelete={() => setBulkDeleteOpen(true)}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Your watchlist is empty"
          description="Add NSE symbols you're considering and set a target price to get notified when they get close."
          action={
            <Button onClick={openAddSheet}>
              <Plus className="h-4 w-4" />
              Add your first symbol
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description={`Nothing matches "${search}". Try a different symbol or name.`}
        />
      ) : sections.length === 0 ? (
        <WatchlistTable
          items={filtered}
          heldSymbols={heldSymbols}
          onEdit={openEditSheet}
          onDelete={setPendingDelete}
          onBuy={setBuyingItem}
          onSaveNotes={handleSaveNotes}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const isCollapsed = collapsedSections.has(group.key);
            const label = group.section ? group.section.name : "No section";
            const sectionId = group.section?.id ?? null;
            return (
              <div
                key={group.key}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setDragOverKey(group.key)}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverKey((prev) => (prev === group.key ? null : prev));
                  }
                }}
                onDrop={(e) => handleDropOnSection(e, sectionId)}
                className={cn(
                  "rounded-xl transition-shadow",
                  dragOverKey === group.key && "ring-2 ring-primary/40"
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(group.key)}
                    className="flex items-center gap-1.5 text-sm font-medium text-foreground"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    {label}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({group.items.length})
                    </span>
                  </button>
                  {group.section && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label={`Actions for ${group.section.name}`}
                          />
                        }
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openRenameSection(group.section!)}>
                          <Pencil className="h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setPendingDeleteSection(group.section!)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete section
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {!isCollapsed &&
                  (group.items.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                      No symbols in this section yet.
                    </p>
                  ) : (
                    <WatchlistTable
                      items={group.items}
                      heldSymbols={heldSymbols}
                      onEdit={openEditSheet}
                      onDelete={setPendingDelete}
                      onBuy={setBuyingItem}
                      onSaveNotes={handleSaveNotes}
                      selectedIds={selectedIds}
                      onToggleSelect={toggleSelect}
                      onToggleSelectAll={toggleSelectAll}
                    />
                  ))}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Star className="h-3 w-3 shrink-0 fill-warning text-warning" />
          Target is more than 20% above your suggested/buy price
        </p>
      )}

      <WatchlistFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        item={editingItem}
        onSubmit={(input) => (editingItem ? updateItem(editingItem.id, input) : addItem(input))}
      />

      <TransactionFormSheet
        open={!!buyingItem}
        onOpenChange={(open) => !open && setBuyingItem(null)}
        holdings={holdings}
        onSubmit={(input) =>
          addTransaction(buyingItem ? { ...input, position: buyingItem.position } : input)
        }
        defaultSymbol={
          buyingItem
            ? {
                symbol: buyingItem.symbol,
                name: buyingItem.name,
                price: buyingItem.buyPrice ?? buyingItem.price,
              }
            : undefined
        }
      />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingDelete?.symbol}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from your watchlist. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selectedIds.size} items from watchlist?</AlertDialogTitle>
            <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSection ? "Rename section" : "Add section"}</DialogTitle>
            <DialogDescription>
              {editingSection
                ? "Give this section a new name."
                : "Create a named group to organize your watchlist, like a trading platform's watchlist tabs."}
            </DialogDescription>
          </DialogHeader>
          <form id="section-form" onSubmit={handleSaveSection} className="space-y-2">
            <Label htmlFor="section-name">Name</Label>
            <Input
              id="section-name"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="e.g. Long term, IPO watch"
              maxLength={50}
              autoFocus
            />
          </form>
          <DialogFooter>
            <Button
              type="submit"
              form="section-form"
              disabled={savingSection || !sectionName.trim()}
            >
              {savingSection && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingSection ? "Save" : "Add section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingDeleteSection}
        onOpenChange={(open) => !open && setPendingDeleteSection(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{pendingDeleteSection?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Symbols in this section move to &quot;No section&quot; — they won&apos;t be removed
              from your watchlist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSection}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
