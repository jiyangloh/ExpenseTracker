interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "primary" | "success" | "warning" | "destructive";
}

const toneClass: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-card text-card-foreground",
  primary: "bg-brand-dark text-brand-foreground",
  success: "bg-card text-card-foreground",
  warning: "bg-card text-card-foreground",
  destructive: "bg-card text-card-foreground",
};

const hintTone: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-muted-foreground",
  primary: "text-brand-foreground/70",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

const StatCard = ({ label, value, hint, tone = "default" }: StatCardProps) => {
  return (
    <div className={`stat-card ${toneClass[tone]}`}>
      <div
        className={`text-[10px] font-mono uppercase tracking-[0.18em] mb-2 ${
          tone === "primary" ? "text-brand-foreground/80" : "text-muted-foreground"
        }`}
      >
        {label}
      </div>
      <div className="data-point text-2xl md:text-3xl break-all">{value}</div>
      {hint && <div className={`text-xs mt-2 ${hintTone[tone]}`}>{hint}</div>}
    </div>
  );
};

export default StatCard;
