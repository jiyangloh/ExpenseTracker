import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Filter, X } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { expensesApi, projectsApi } from "@/lib/api";
import { EXPENSE_CATEGORIES, type Expense, type ExpenseInput } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";

const todayStr = () => new Date().toISOString().slice(0, 10);

const ExpensesPage = () => {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();

  const projectId = params.get("project_id") ?? "";
  const dateFrom = params.get("date_from") ?? "";
  const dateTo = params.get("date_to") ?? "";
  const category = params.get("category") ?? "";
  const claimedParam = params.get("is_claimed"); // "true" | "false" | null

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (!v) next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: true });
  };

  const projectsQ = useQuery({ queryKey: ["projects"], queryFn: () => projectsApi.list() });

  const filters = useMemo(
    () => ({
      project_id: projectId || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      category: category || undefined,
      is_claimed: claimedParam === null ? undefined : claimedParam === "true",
    }),
    [projectId, dateFrom, dateTo, category, claimedParam],
  );

  const expensesQ = useQuery({
    queryKey: ["expenses", filters],
    queryFn: () => expensesApi.list(filters),
  });

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set());
  }, [expensesQ.data]);

  const createMut = useMutation({
    mutationFn: (data: ExpenseInput) => expensesApi.create(data),
    onSuccess: () => {
      invalidateAll();
      toast.success("Expense added");
      setCreating(false);
    },
    onError: () => toast.error("Failed to add expense"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseInput }) =>
      expensesApi.update(id, data),
    onSuccess: () => {
      invalidateAll();
      toast.success("Expense updated");
      setEditing(null);
    },
    onError: () => toast.error("Failed to update expense"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess: () => {
      invalidateAll();
      toast.success("Expense deleted");
      setDeleting(null);
    },
    onError: () => toast.error("Failed to delete expense"),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_claimed }: { id: string; is_claimed: boolean }) =>
      expensesApi.toggleClaim(id, is_claimed),
    onSuccess: () => invalidateAll(),
  });

  const bulkMut = useMutation({
    mutationFn: ({ ids, is_claimed }: { ids: string[]; is_claimed: boolean }) =>
      expensesApi.bulkClaim(ids, is_claimed),
    onSuccess: () => {
      invalidateAll();
      toast.success("Bulk update applied");
      setSelected(new Set());
    },
  });

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  const expenses = expensesQ.data ?? [];
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const totalClaimed = expenses.filter((e) => e.is_claimed).reduce((s, e) => s + e.amount, 0);

  const allChecked = expenses.length > 0 && selected.size === expenses.length;
  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(expenses.map((e) => e.id)));

  const hasFilters = !!(projectId || dateFrom || dateTo || category || claimedParam !== null);

  return (
    <div>
      <PageHeader
        eyebrow="02 / Ledger"
        title="Expenses"
        description="All expense records across projects. Filter, edit, or update claim status."
        actions={
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <ExpenseFormDialog
              title="Add expense"
              initial={{
                project_id: projectId || projectsQ.data?.[0]?.id || "",
                transaction_date: todayStr(),
                description: "",
                amount: 0,
                category: EXPENSE_CATEGORIES[0],
                currency: "MYR",
                is_claimed: false,
              }}
              projects={projectsQ.data ?? []}
              submitting={createMut.isPending}
              onSubmit={(data) => createMut.mutate(data)}
            />
          </Dialog>
        }
      />

      {/* Filters */}
      <div className="panel p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            Filters
          </span>
          {hasFilters && (
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-7 text-xs"
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
            >
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Project</Label>
            <Select value={projectId || "all"} onValueChange={(v) => setParam("project_id", v === "all" ? "" : v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {(projectsQ.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">From</Label>
            <Input type="date" className="mt-1" value={dateFrom} onChange={(e) => setParam("date_from", e.target.value)} />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">To</Label>
            <Input type="date" className="mt-1" value={dateTo} onChange={(e) => setParam("date_to", e.target.value)} />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Category</Label>
            <Select value={category || "all"} onValueChange={(v) => setParam("category", v === "all" ? "" : v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Claim status</Label>
            <Select
              value={claimedParam ?? "all"}
              onValueChange={(v) => setParam("is_claimed", v === "all" ? "" : v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Claimed</SelectItem>
                <SelectItem value="false">Outstanding</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <SummaryPill label="Records" value={String(expenses.length)} />
        <SummaryPill label="Total" value={formatMoney(total)} />
        <SummaryPill label="Claimed" value={formatMoney(totalClaimed)} />
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="panel p-3 mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-mono">{selected.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkMut.mutate({ ids: Array.from(selected), is_claimed: true })}
            >
              Mark claimed
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkMut.mutate({ ids: Array.from(selected), is_claimed: false })}
            >
              Mark outstanding
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="panel overflow-hidden">
        {expensesQ.isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No expenses match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-light/40 text-[10px] uppercase tracking-wider">
                  <th className="text-left font-mono font-medium px-3 py-2.5 w-10">
                    <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
                  </th>
                  <th className="text-left font-mono font-medium px-3 py-2.5">Date</th>
                  <th className="text-left font-mono font-medium px-3 py-2.5">Description</th>
                  <th className="text-left font-mono font-medium px-3 py-2.5">Category</th>
                  <th className="text-left font-mono font-medium px-3 py-2.5">Source</th>
                  <th className="text-right font-mono font-medium px-3 py-2.5">Amount</th>
                  <th className="text-center font-mono font-medium px-3 py-2.5">Claim</th>
                  <th className="text-right font-mono font-medium px-3 py-2.5 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => {
                  const checked = selected.has(e.id);
                  return (
                    <tr key={e.id} className="border-t border-border hover:bg-muted/50">
                      <td className="px-3 py-3">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const next = new Set(selected);
                            if (v) next.add(e.id);
                            else next.delete(e.id);
                            setSelected(next);
                          }}
                        />
                      </td>
                      <td className="px-3 py-3 data-point text-xs whitespace-nowrap">
                        {formatDate(e.transaction_date)}
                      </td>
                      <td className="px-3 py-3 max-w-[280px]">
                        <div className="truncate">{e.description}</div>
                        {e.notes && (
                          <div className="text-[11px] text-muted-foreground truncate">{e.notes}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {e.category}
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] uppercase tracking-wider"
                        >
                          {e.source}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right data-point whitespace-nowrap">
                        {formatMoney(e.amount, e.currency)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Switch
                          checked={e.is_claimed}
                          onCheckedChange={(v) => toggleMut.mutate({ id: e.id, is_claimed: v })}
                        />
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setEditing(e)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleting(e)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <ExpenseFormDialog
            title="Edit expense"
            initial={{
              project_id: editing.project_id,
              transaction_date: editing.transaction_date,
              post_date: editing.post_date,
              description: editing.description,
              amount: editing.amount,
              currency: editing.currency,
              category: editing.category,
              is_claimed: editing.is_claimed,
              claimed_date: editing.claimed_date,
              notes: editing.notes,
            }}
            projects={projectsQ.data ?? []}
            submitting={updateMut.isPending}
            onSubmit={(data) => updateMut.mutate({ id: editing.id, data })}
          />
        )}
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.description}" — {deleting && formatMoney(deleting.amount, deleting.currency)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMut.mutate(deleting.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const SummaryPill = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-border bg-card px-4 py-2.5 flex items-baseline justify-between">
    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
      {label}
    </span>
    <span className="data-point text-sm">{value}</span>
  </div>
);

interface ExpenseFormProps {
  title: string;
  initial: ExpenseInput;
  projects: Array<{ id: string; name: string }>;
  submitting: boolean;
  onSubmit: (data: ExpenseInput) => void;
}

const ExpenseFormDialog = ({ title, initial, projects, submitting, onSubmit }: ExpenseFormProps) => {
  const [form, setForm] = useState<ExpenseInput>(initial);
  return (
    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-mono">{title}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.project_id) return toast.error("Project is required");
          if (!form.description?.trim()) return toast.error("Description is required");
          if (!form.amount || form.amount <= 0) return toast.error("Amount must be > 0");
          onSubmit({
            ...form,
            amount: Number(form.amount),
            claimed_date: form.is_claimed ? form.claimed_date || todayStr() : null,
          });
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label>Project</Label>
          <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Transaction date</Label>
            <Input
              type="date"
              value={form.transaction_date}
              onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Post date</Label>
            <Input
              type="date"
              value={form.post_date ?? ""}
              onChange={(e) => setForm({ ...form, post_date: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Input
              value={form.currency ?? "MYR"}
              onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Amount</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            required
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <Label className="text-sm">Claimed</Label>
            <div className="text-xs text-muted-foreground">Mark as reimbursed</div>
          </div>
          <Switch
            checked={!!form.is_claimed}
            onCheckedChange={(v) => setForm({ ...form, is_claimed: v })}
          />
        </div>
        {form.is_claimed && (
          <div className="space-y-1.5">
            <Label>Claimed date</Label>
            <Input
              type="date"
              value={form.claimed_date ?? ""}
              onChange={(e) => setForm({ ...form, claimed_date: e.target.value })}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea
            rows={2}
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default ExpensesPage;
