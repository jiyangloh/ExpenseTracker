import { useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileUp, Plus, Receipt, Wallet } from "lucide-react";

import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { expensesApi, incomeApi, projectsApi } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";

const ProjectDetailPage = () => {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();

  const projectQ = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => projectsApi.get(projectId),
  });
  const dashboardQ = useQuery({
    queryKey: ["dashboard", projectId],
    queryFn: () => projectsApi.dashboard(projectId),
  });
  const expensesQ = useQuery({
    queryKey: ["expenses", { project_id: projectId }],
    queryFn: () => expensesApi.list({ project_id: projectId }),
  });
  const incomeQ = useQuery({
    queryKey: ["income", projectId],
    queryFn: () => incomeApi.list(projectId),
  });

  const recentExpenses = useMemo(() => (expensesQ.data ?? []).slice(0, 8), [expensesQ.data]);
  const recentIncome = useMemo(() => (incomeQ.data ?? []).slice(0, 5), [incomeQ.data]);

  const categoryRows = useMemo(() => {
    if (!dashboardQ.data) return [];
    const total = dashboardQ.data.total_expenses || 1;
    return dashboardQ.data.expenses_by_category
      .map((row) => ({ cat: row.category, amt: row.total, pct: (row.total / total) * 100 }))
      .sort((a, b) => b.amt - a.amt);
  }, [dashboardQ.data]);

  if (projectQ.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/2" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (projectQ.isError || !projectQ.data) {
    return (
      <div className="panel p-12 text-center">
        <h2 className="text-lg mb-2">Project not found</h2>
        <Button variant="outline" onClick={() => navigate("/")}>
          Back to projects
        </Button>
      </div>
    );
  }

  const project = projectQ.data;
  const dash = dashboardQ.data;
  const claimedAmount =
    dash?.expenses_by_claim_status.find((row) => row.is_claimed)?.total ?? dash?.total_claimed ?? 0;
  const outstandingAmount =
    dash?.expenses_by_claim_status.find((row) => !row.is_claimed)?.total ??
    dash?.total_not_claimed ??
    0;

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Projects
      </Link>

      <PageHeader
        eyebrow={`Project · ${project.id}`}
        title={project.name}
        description={project.description || "No description"}
        actions={
          <>
            <StatusBadge status={project.status} />
            <Button variant="outline" asChild>
              <Link to={`/expenses?project_id=${project.id}`}>
                <Receipt className="h-4 w-4 mr-1.5" /> Expenses
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/income?project_id=${project.id}`}>
                <Wallet className="h-4 w-4 mr-1.5" /> Income
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/pdf-import?project_id=${project.id}`}>
                <FileUp className="h-4 w-4 mr-1.5" /> Upload PDF
              </Link>
            </Button>
          </>
        }
      />

      {/* Project meta strip */}
      <div className="panel p-5 mb-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <Meta label="Start" value={formatDate(project.start_date)} />
        <Meta label="End" value={formatDate(project.end_date)} />
        <Meta label="Budget" value={formatMoney(project.total_budget)} />
        <Meta label="Updated" value={formatDate(project.updated_at)} />
      </div>

      {/* Stats */}
      {dashboardQ.isLoading || !dash ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Income" value={formatMoney(dash.total_income)} />
          <StatCard label="Total Expenses" value={formatMoney(dash.total_expenses)} />
          <StatCard
            label="Net Position"
            value={formatMoney(dash.net_position)}
            tone="primary"
            hint={dash.net_position >= 0 ? "Surplus" : "Deficit"}
          />
          <StatCard
            label="Claimed / Outstanding"
            value={`${formatMoney(dash.total_claimed)}`}
            hint={`${formatMoney(dash.total_not_claimed)} outstanding`}
          />
        </div>
      )}

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Category breakdown */}
        <div className="panel p-6 lg:col-span-2">
          <SectionHeader title="Category Breakdown" subtitle="Expense totals grouped by category" />
          {categoryRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No expenses yet.</p>
          ) : (
            <div className="space-y-4">
              {categoryRows.map((row) => (
                <div key={row.cat}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="font-medium">{row.cat}</span>
                    <span className="data-point text-xs">{formatMoney(row.amt)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-brand-dark"
                      style={{ width: `${row.pct.toFixed(1)}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1">
                    {row.pct.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Claim status */}
        <div className="panel p-6">
          <SectionHeader title="Claim Status" subtitle="Reimbursement progress" />
          {dash && (
            <div className="space-y-5">
              <ClaimRow
                label="Claimed"
                amount={claimedAmount}
                total={dash.total_expenses}
                color="bg-success"
              />
              <ClaimRow
                label="Outstanding"
                amount={outstandingAmount}
                total={dash.total_expenses}
                color="bg-warning"
              />
            </div>
          )}
        </div>
      </div>

      {/* Recent expenses + income */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="panel p-6 lg:col-span-2">
          <SectionHeader
            title="Recent Expenses"
            subtitle={`${recentExpenses.length} of ${expensesQ.data?.length ?? 0}`}
            action={
              <Button variant="outline" size="sm" asChild>
                <Link to={`/expenses?project_id=${project.id}`}>View all</Link>
              </Button>
            }
          />
          {recentExpenses.length === 0 ? (
            <EmptyMini
              text="No expenses yet"
              cta={
                <Button size="sm" asChild>
                  <Link to={`/expenses?project_id=${project.id}`}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Add expense
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-mono font-medium px-2 py-2">Date</th>
                    <th className="text-left font-mono font-medium px-2 py-2">Description</th>
                    <th className="text-left font-mono font-medium px-2 py-2">Category</th>
                    <th className="text-right font-mono font-medium px-2 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentExpenses.map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-2 py-2.5 data-point text-xs">{formatDate(e.transaction_date)}</td>
                      <td className="px-2 py-2.5 truncate max-w-[200px]">{e.description}</td>
                      <td className="px-2 py-2.5 text-xs text-muted-foreground">{e.category}</td>
                      <td className="px-2 py-2.5 text-right data-point">
                        {formatMoney(e.amount, e.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel p-6">
          <SectionHeader
            title="Recent Income"
            action={
              <Button variant="outline" size="sm" asChild>
                <Link to={`/income?project_id=${project.id}`}>View all</Link>
              </Button>
            }
          />
          {recentIncome.length === 0 ? (
            <EmptyMini
              text="No income recorded"
              cta={
                <Button size="sm" asChild>
                  <Link to={`/income?project_id=${project.id}`}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Add income
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {recentIncome.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{i.source}</div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                      {formatDate(i.date)}
                    </div>
                  </div>
                  <div className="data-point text-sm text-success whitespace-nowrap">
                    +{formatMoney(i.amount, i.currency)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const Meta = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
      {label}
    </div>
    <div className="data-point text-sm">{value}</div>
  </div>
);

const SectionHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex items-end justify-between gap-3 mb-4 pb-3 border-b border-border">
    <div>
      <h2 className="font-mono text-base text-brand-dark">{title}</h2>
      {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
    </div>
    {action}
  </div>
);

const ClaimRow = ({
  label,
  amount,
  total,
  color,
}: {
  label: string;
  amount: number;
  total: number;
  color: string;
}) => {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="data-point text-sm">{formatMoney(amount)}</span>
      </div>
      <div className="h-2 bg-muted rounded-sm overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct.toFixed(1)}%` }} />
      </div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1">
        {pct.toFixed(1)}% of total
      </div>
    </div>
  );
};

const EmptyMini = ({ text, cta }: { text: string; cta?: React.ReactNode }) => (
  <div className="text-center py-6">
    <p className="text-sm text-muted-foreground mb-3">{text}</p>
    {cta}
  </div>
);

export default ProjectDetailPage;
