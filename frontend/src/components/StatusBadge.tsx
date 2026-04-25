import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "@/lib/types";

const variants: Record<ProjectStatus, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-success/15 text-success border-success/30" },
  on_hold: { label: "On hold", cls: "bg-warning/15 text-warning border-warning/30" },
  closed: { label: "Closed", cls: "bg-muted text-muted-foreground border-border" },
};

const StatusBadge = ({ status }: { status: ProjectStatus }) => {
  const v = variants[status];
  return (
    <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider ${v.cls}`}>
      {v.label}
    </Badge>
  );
};

export default StatusBadge;
