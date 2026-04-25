import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FolderOpen, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
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
import { projectsApi } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import type { Project, ProjectInput, ProjectStatus } from "@/lib/types";

const emptyProject: ProjectInput = {
  name: "",
  description: "",
  start_date: "",
  end_date: "",
  total_budget: 0,
  status: "active",
};

const ProjectsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
  });

  const createMut = useMutation({
    mutationFn: (data: ProjectInput) => projectsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created");
      setCreating(false);
    },
    onError: () => toast.error("Failed to create project"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProjectInput }) =>
      projectsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project updated");
      setEditing(null);
    },
    onError: () => toast.error("Failed to update project"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
      setDeleting(null);
    },
    onError: () => toast.error("Failed to delete project"),
  });

  return (
    <div>
      <PageHeader
        eyebrow="01 / Workspace"
        title="Projects"
        description="All active and archived projects. Open one to view its dashboard, expenses and income."
        actions={
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button className="font-mono text-xs uppercase tracking-wider">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <ProjectFormDialog
              title="Create project"
              initial={emptyProject}
              submitting={createMut.isPending}
              onSubmit={(data) => createMut.mutate(data)}
            />
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : !projects || projects.length === 0 ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <article key={p.id} className="panel p-5 flex flex-col group">
              <div className="flex items-start justify-between gap-3 mb-3">
                <button
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="text-left min-w-0 flex-1"
                >
                  <h3 className="font-mono text-base text-brand-dark truncate group-hover:underline">
                    {p.name}
                  </h3>
                </button>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[2.5rem]">
                {p.description || "No description"}
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs mb-4 pt-4 border-t border-border">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                    Period
                  </div>
                  <div className="data-point text-xs">
                    {formatDate(p.start_date)} → {formatDate(p.end_date)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                    Budget
                  </div>
                  <div className="data-point text-xs">{formatMoney(p.total_budget)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <Button
                  size="sm"
                  variant="default"
                  className="font-mono text-[11px] uppercase tracking-wider flex-1"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
                  Open
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleting(p)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <ProjectFormDialog
            title="Edit project"
            initial={{
              name: editing.name,
              description: editing.description,
              start_date: editing.start_date ?? "",
              end_date: editing.end_date ?? "",
              total_budget: editing.total_budget,
              status: editing.status,
            }}
            submitting={updateMut.isPending}
            onSubmit={(data) => updateMut.mutate({ id: editing.id, data })}
          />
        )}
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{deleting?.name}" and all related expenses and income records.
              This cannot be undone.
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

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="panel p-12 text-center">
    <div className="font-mono text-sm text-muted-foreground mb-4">// No projects yet</div>
    <h2 className="text-xl mb-2">Create your first project</h2>
    <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
      Projects organize expenses, income, and PDF imports under a single budget and timeline.
    </p>
    <Button onClick={onCreate}>
      <Plus className="h-4 w-4 mr-2" />
      New Project
    </Button>
  </div>
);

interface FormDialogProps {
  title: string;
  initial: ProjectInput;
  submitting: boolean;
  onSubmit: (data: ProjectInput) => void;
}

const ProjectFormDialog = ({ title, initial, submitting, onSubmit }: FormDialogProps) => {
  const [form, setForm] = useState<ProjectInput>(initial);

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-mono">{title}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name?.trim()) {
            toast.error("Name is required");
            return;
          }
          onSubmit({
            ...form,
            start_date: form.start_date || null,
            end_date: form.end_date || null,
            total_budget: Number(form.total_budget) || 0,
          });
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={3}
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="start">Start date</Label>
            <Input
              id="start"
              type="date"
              value={form.start_date ?? ""}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end">End date</Label>
            <Input
              id="end"
              type="date"
              value={form.end_date ?? ""}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="budget">Total budget (MYR)</Label>
            <Input
              id="budget"
              type="number"
              min={0}
              step="0.01"
              value={form.total_budget ?? 0}
              onChange={(e) => setForm({ ...form, total_budget: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as ProjectStatus })}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On hold</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
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

export default ProjectsPage;
