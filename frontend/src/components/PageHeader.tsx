import { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

const PageHeader = ({ eyebrow, title, description, actions }: PageHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 pb-6 border-b border-border">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl md:text-3xl text-brand-dark font-mono">{title}</h1>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
};

export default PageHeader;
