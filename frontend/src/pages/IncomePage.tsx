import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/PageHeader";
import MoneyInput from "@/components/MoneyInput";
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
import { Skeleton } from "@/components/ui/skeleton";
import { incomeApi, projectsApi } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import type { Income, IncomeInput } from "@/lib/types";

const todayStr = () => new Date().toISOString().slice(0, 10);

const IncomePage = () => {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const projectId = params.get("project_id") ?? "";

  const projectsQ = useQuery({ queryKey: ["projects"], queryFn: () => projectsApi.list() });
  const incomeQ = useQuery({
    queryKey: ["income", projectId || "all"],
    queryFn: () => incomeApi.list(projectId || undefined),
  });

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [deleting, setDeleting] = useState<Income | null>(null);

  const createMut = useMutation({
    mutationFn: (data: IncomeInput) => incomeApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Income added");
      setCreating(false);
    },
    onError: () => toast.error("Failed to add income"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: IncomeInput }) => incomeApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Income updated");
      setEditing(null);
    },
    onError: () => toast.error("Failed to update income"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => incomeApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Income deleted");
      setDeleting(null);
    },
    onError: () => toast.error("Failed to delete income"),
  });

  const records = incomeQ.data ?? [];
  const total = records.reduce((s, i) => s + i.amount, 0);

  const setProj = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === "all") next.delete("project_id");
    else next.set("project_id", v);
    setParams(next, { replace: true });
  };

  return (
    <div>
      <PageHeader
        eyebrow="03 / Ledger"
        title="Income"
        description="Manually entered project income. Income is never extracted from credit card PDFs."
        actions={
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Income
              </Button>
            </DialogTrigger>
            <IncomeFormDialog
              title="Add income"
              initial={{
                project_id: projectId || projectsQ.data?.[0]?.id || "",
                date: todayStr(),
                source: "",
                amount: 0,
                currency: "MYR",
              }}
              projects={projectsQ.data ?? []}
              submitting={createMut.isPending}
              onSubmit={(data) => createMut.mutate(data)}
            />
          </Dialog>
        }
      />

      <div className="panel p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Project filter
          </Label>
          <Select value={projectId || "all"} onValueChange={setProj}>
            <SelectTrigger className="mt-1">
              <SelectValue />
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
        <div className="flex justify-end gap-3">
          <div className="rounded-md border border-border bg-card px-4 py-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Records
            </div>
            <div className="data-point text-base">{records.length}</div>
          </div>
          <div className="rounded-md border border-border bg-card px-4 py-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Total
            </div>
            <div className="data-point text-base text-success">{formatMoney(total)}</div>
          </div>
        </div>
      </div>

      <div className="panel overflow-hidden">
        {incomeQ.isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No income recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-light/40 text-[10px] uppercase tracking-wider">
                  <th className="text-left font-mono font-medium px-3 py-2.5">Date</th>
                  <th className="text-left font-mono font-medium px-3 py-2.5">Source</th>
                  <th className="text-left font-mono font-medium px-3 py-2.5">Project</th>
                  <th className="text-right font-mono font-medium px-3 py-2.5">Amount</th>
                  <th className="text-right font-mono font-medium px-3 py-2.5 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((i) => {
                  const proj = projectsQ.data?.find((p) => p.id === i.project_id);
                  return (
                    <tr key={i.id} className="border-t border-border hover:bg-muted/50">
                      <td className="px-3 py-3 data-point text-xs whitespace-nowrap">
                        {formatDate(i.date)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium">{i.source}</div>
                        {i.notes && (
                          <div className="text-[11px] text-muted-foreground truncate">{i.notes}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {proj?.name ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-right data-point text-success whitespace-nowrap">
                        +{formatMoney(i.amount, i.currency)}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setEditing(i)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleting(i)}
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

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <IncomeFormDialog
            title="Edit income"
            initial={{
              project_id: editing.project_id,
              date: editing.date,
              source: editing.source,
              amount: editing.amount,
              currency: editing.currency,
              notes: editing.notes,
            }}
            projects={projectsQ.data ?? []}
            submitting={updateMut.isPending}
            onSubmit={(data) => updateMut.mutate({ id: editing.id, data })}
          />
        )}
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete income record?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.source}" — {deleting && formatMoney(deleting.amount, deleting.currency)}
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

interface IncomeFormProps {
  title: string;
  initial: IncomeInput;
  projects: Array<{ id: string; name: string }>;
  submitting: boolean;
  onSubmit: (data: IncomeInput) => void;
}

const IncomeFormDialog = ({ title, initial, projects, submitting, onSubmit }: IncomeFormProps) => {
  const [form, setForm] = useState<IncomeInput>(initial);
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-mono">{title}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.project_id) return toast.error("Project is required");
          if (!form.source?.trim()) return toast.error("Source is required");
          if (!form.amount || form.amount <= 0) return toast.error("Amount must be > 0");
          onSubmit({ ...form, amount: Number(form.amount), currency: "MYR" });
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
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Source</Label>
          <Input
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            placeholder="e.g. Client retainer — September"
            required
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label>Amount</Label>
            <MoneyInput
              placeholder="0.00"
              value={form.amount}
              onValueChange={(value) => setForm({ ...form, amount: value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Input
              value="MYR"
              readOnly
              aria-readonly="true"
              className="bg-muted text-muted-foreground"
            />
          </div>
        </div>
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

export default IncomePage;
