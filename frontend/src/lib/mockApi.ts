// In-memory mock backend used only when VITE_USE_MOCK_API=true.
// The real FastAPI backend is the default source of truth.

import type {
  DashboardSummary,
  Expense,
  ExpenseFilters,
  ExpenseInput,
  Income,
  IncomeInput,
  ParsedTransaction,
  PdfConfirmRequest,
  PdfConfirmResponse,
  PdfParseResponse,
  Project,
  ProjectInput,
} from "./types";

const id = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
const sleep = (ms = 200) => new Promise((r) => setTimeout(r, ms));

const PROJECTS: Project[] = [
  {
    id: "p1",
    name: "Crimson Bloom Initiative",
    description: "Brand refresh & launch campaign for Q1 2025.",
    start_date: "2024-09-01",
    end_date: "2025-03-31",
    total_budget: 120000,
    status: "active",
    created_at: now(),
    updated_at: now(),
  },
  {
    id: "p2",
    name: "Site Survey — North Block",
    description: "Field surveys, equipment rental, contractor visits.",
    start_date: "2024-08-15",
    end_date: "2024-12-30",
    total_budget: 45000,
    status: "active",
    created_at: now(),
    updated_at: now(),
  },
  {
    id: "p3",
    name: "Internal Tooling Rebuild",
    description: "Migrate legacy ops tools — paused pending approval.",
    start_date: "2024-06-01",
    end_date: null,
    total_budget: 30000,
    status: "on_hold",
    created_at: now(),
    updated_at: now(),
  },
];

const EXPENSES: Expense[] = [
  mkExp("p1", "2024-10-26", "Cloud subscription — Vercel Pro", 380.5, "Software", true, "2024-10-28"),
  mkExp("p1", "2024-10-25", "Conference tickets — TechFest", 1750, "Travel", false),
  mkExp("p1", "2024-10-22", "Adobe Creative Cloud", 220, "Software", true, "2024-10-30"),
  mkExp("p1", "2024-10-18", "Facebook Ads", 950, "Marketing", false),
  mkExp("p1", "2024-10-15", "Team lunch — kickoff", 412.4, "Food & Dining", true, "2024-10-20"),
  mkExp("p2", "2024-10-24", "Steel beams — Section B", 8750.5, "Equipment", false),
  mkExp("p2", "2024-10-20", "Concrete mixer rental", 450, "Equipment", true, "2024-10-25"),
  mkExp("p2", "2024-10-12", "Site visit fuel & toll", 180.75, "Travel", false),
  mkExp("p3", "2024-09-30", "GitHub Enterprise", 320, "Software", true, "2024-10-02"),
];

function mkExp(
  pid: string,
  date: string,
  desc: string,
  amt: number,
  cat: string,
  claimed: boolean,
  claimedDate?: string,
): Expense {
  return {
    id: id(),
    project_id: pid,
    pdf_import_id: null,
    transaction_date: date,
    post_date: date,
    description: desc,
    amount: amt,
    currency: "MYR",
    category: cat,
    is_claimed: claimed,
    claimed_date: claimedDate ?? null,
    notes: null,
    source: "manual",
    source_file: null,
    created_at: now(),
    updated_at: now(),
  };
}

const INCOMES: Income[] = [
  {
    id: id(),
    project_id: "p1",
    date: "2024-09-15",
    source: "Client retainer — Sept",
    amount: 25000,
    currency: "MYR",
    notes: null,
    created_at: now(),
    updated_at: now(),
  },
  {
    id: id(),
    project_id: "p1",
    date: "2024-10-15",
    source: "Client retainer — Oct",
    amount: 25000,
    currency: "MYR",
    notes: null,
    created_at: now(),
    updated_at: now(),
  },
  {
    id: id(),
    project_id: "p2",
    date: "2024-09-01",
    source: "Phase 1 milestone payment",
    amount: 15000,
    currency: "MYR",
    notes: null,
    created_at: now(),
    updated_at: now(),
  },
];

export const mockApi = {
  projects: {
    async list() {
      await sleep();
      return [...PROJECTS];
    },
    async get(pid: string) {
      await sleep();
      const p = PROJECTS.find((x) => x.id === pid);
      if (!p) throw new Error("Project not found");
      return p;
    },
    async create(data: ProjectInput) {
      await sleep();
      const p: Project = {
        id: id(),
        name: data.name,
        description: data.description ?? "",
        start_date: data.start_date ?? null,
        end_date: data.end_date ?? null,
        total_budget: data.total_budget ?? 0,
        status: data.status ?? "active",
        created_at: now(),
        updated_at: now(),
      };
      PROJECTS.unshift(p);
      return p;
    },
    async update(pid: string, data: ProjectInput) {
      await sleep();
      const idx = PROJECTS.findIndex((x) => x.id === pid);
      if (idx < 0) throw new Error("Project not found");
      PROJECTS[idx] = {
        ...PROJECTS[idx],
        ...data,
        description: data.description ?? PROJECTS[idx].description,
        total_budget: data.total_budget ?? PROJECTS[idx].total_budget,
        status: data.status ?? PROJECTS[idx].status,
        updated_at: now(),
      };
      return PROJECTS[idx];
    },
    async remove(pid: string) {
      await sleep();
      const idx = PROJECTS.findIndex((x) => x.id === pid);
      if (idx >= 0) PROJECTS.splice(idx, 1);
    },
    async dashboard(pid: string): Promise<DashboardSummary> {
      await sleep();
      const project = PROJECTS.find((x) => x.id === pid);
      if (!project) throw new Error("Project not found");
      const projectExpenses = EXPENSES.filter((e) => e.project_id === pid);
      const projectIncome = INCOMES.filter((i) => i.project_id === pid);
      const total_income = projectIncome.reduce((s, i) => s + i.amount, 0);
      const total_expenses = projectExpenses.reduce((s, e) => s + e.amount, 0);
      const total_claimed = projectExpenses
        .filter((e) => e.is_claimed)
        .reduce((s, e) => s + e.amount, 0);
      const total_not_claimed = total_expenses - total_claimed;
      const expenses_by_category: Record<string, number> = {};
      projectExpenses.forEach((e) => {
        expenses_by_category[e.category] = (expenses_by_category[e.category] ?? 0) + e.amount;
      });
      return {
        project_id: pid,
        project_name: project.name,
        total_income,
        total_expenses,
        net_position: total_income - total_expenses,
        total_claimed,
        total_not_claimed,
        expenses_by_category: Object.entries(expenses_by_category).map(([category, total]) => ({
          category,
          total,
        })),
        expenses_by_claim_status: [
          { is_claimed: true, total: total_claimed },
          { is_claimed: false, total: total_not_claimed },
        ],
      };
    },
  },

  expenses: {
    async list(filters: ExpenseFilters) {
      await sleep();
      return EXPENSES.filter((e) => {
        if (filters.project_id && e.project_id !== filters.project_id) return false;
        if (filters.category && e.category !== filters.category) return false;
        if (filters.is_claimed !== undefined && e.is_claimed !== filters.is_claimed) return false;
        if (filters.date_from && e.transaction_date < filters.date_from) return false;
        if (filters.date_to && e.transaction_date > filters.date_to) return false;
        return true;
      }).sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
    },
    async get(eid: string) {
      await sleep();
      const e = EXPENSES.find((x) => x.id === eid);
      if (!e) throw new Error("Expense not found");
      return e;
    },
    async create(data: ExpenseInput) {
      await sleep();
      const e: Expense = {
        id: id(),
        project_id: data.project_id,
        pdf_import_id: null,
        transaction_date: data.transaction_date,
        post_date: data.post_date ?? data.transaction_date,
        description: data.description,
        amount: data.amount,
        currency: data.currency ?? "MYR",
        category: data.category,
        is_claimed: data.is_claimed ?? false,
        claimed_date: data.claimed_date ?? null,
        notes: data.notes ?? null,
        source: "manual",
        source_file: null,
        created_at: now(),
        updated_at: now(),
      };
      EXPENSES.unshift(e);
      return e;
    },
    async update(eid: string, data: ExpenseInput) {
      await sleep();
      const idx = EXPENSES.findIndex((x) => x.id === eid);
      if (idx < 0) throw new Error("Expense not found");
      EXPENSES[idx] = {
        ...EXPENSES[idx],
        ...data,
        currency: data.currency ?? EXPENSES[idx].currency,
        is_claimed: data.is_claimed ?? EXPENSES[idx].is_claimed,
        claimed_date: data.claimed_date ?? EXPENSES[idx].claimed_date,
        notes: data.notes ?? EXPENSES[idx].notes,
        updated_at: now(),
      };
      return EXPENSES[idx];
    },
    async remove(eid: string) {
      await sleep();
      const idx = EXPENSES.findIndex((x) => x.id === eid);
      if (idx >= 0) EXPENSES.splice(idx, 1);
    },
    async toggleClaim(eid: string, is_claimed?: boolean, claimed_date?: string | null) {
      await sleep();
      const idx = EXPENSES.findIndex((x) => x.id === eid);
      if (idx < 0) throw new Error("Expense not found");
      const next = is_claimed ?? !EXPENSES[idx].is_claimed;
      EXPENSES[idx] = {
        ...EXPENSES[idx],
        is_claimed: next,
        claimed_date: next ? claimed_date ?? new Date().toISOString().slice(0, 10) : null,
        updated_at: now(),
      };
      return EXPENSES[idx];
    },
    async bulkClaim(ids: string[], is_claimed: boolean) {
      await sleep();
      const updated: Expense[] = [];
      ids.forEach((eid) => {
        const idx = EXPENSES.findIndex((x) => x.id === eid);
        if (idx >= 0) {
          EXPENSES[idx] = {
            ...EXPENSES[idx],
            is_claimed,
            claimed_date: is_claimed ? new Date().toISOString().slice(0, 10) : null,
            updated_at: now(),
          };
          updated.push(EXPENSES[idx]);
        }
      });
      return updated;
    },
  },

  income: {
    async list(project_id?: string) {
      await sleep();
      return INCOMES.filter((i) => !project_id || i.project_id === project_id).sort((a, b) =>
        b.date.localeCompare(a.date),
      );
    },
    async get(iid: string) {
      await sleep();
      const i = INCOMES.find((x) => x.id === iid);
      if (!i) throw new Error("Income not found");
      return i;
    },
    async create(data: IncomeInput) {
      await sleep();
      const i: Income = {
        id: id(),
        project_id: data.project_id,
        date: data.date,
        source: data.source,
        amount: data.amount,
        currency: data.currency ?? "MYR",
        notes: data.notes ?? null,
        created_at: now(),
        updated_at: now(),
      };
      INCOMES.unshift(i);
      return i;
    },
    async update(iid: string, data: IncomeInput) {
      await sleep();
      const idx = INCOMES.findIndex((x) => x.id === iid);
      if (idx < 0) throw new Error("Income not found");
      INCOMES[idx] = {
        ...INCOMES[idx],
        ...data,
        currency: data.currency ?? INCOMES[idx].currency,
        notes: data.notes ?? INCOMES[idx].notes,
        updated_at: now(),
      };
      return INCOMES[idx];
    },
    async remove(iid: string) {
      await sleep();
      const idx = INCOMES.findIndex((x) => x.id === iid);
      if (idx >= 0) INCOMES.splice(idx, 1);
    },
  },

  pdf: {
    async parse(project_id: string, file: File): Promise<PdfParseResponse> {
      await sleep(700);
      // Synthesize a realistic-looking parse result for demo purposes.
      const candidates: ParsedTransaction[] = [
        {
          transaction_date: "2024-10-02",
          post_date: "2024-10-03",
          description: "GRAB*MERCHANT KUALA LUMPUR",
          amount: 28.5,
          currency: "MYR",
          category: "Travel",
          is_claimed: false,
          notes: null,
        },
        {
          transaction_date: "2024-10-05",
          post_date: "2024-10-06",
          description: "SHELL HIGHWAY KL",
          amount: 95,
          currency: "MYR",
          category: "Travel",
          is_claimed: false,
          notes: null,
        },
        {
          transaction_date: "2024-10-09",
          post_date: "2024-10-10",
          description: "GOOGLE *CLOUD SVC",
          amount: 412.3,
          currency: "MYR",
          category: "Software",
          is_claimed: false,
          notes: null,
        },
        {
          transaction_date: "2024-10-14",
          post_date: "2024-10-15",
          description: "STARBUCKS MIDVALLEY",
          amount: 22,
          currency: "MYR",
          category: "Food & Dining",
          is_claimed: false,
          notes: null,
        },
        {
          transaction_date: "2024-10-18",
          post_date: "2024-10-19",
          description: "AMAZON WEB SERVICES",
          amount: 318.55,
          currency: "MYR",
          category: "Software",
          is_claimed: false,
          notes: null,
          is_likely_duplicate: true,
        },
      ];
      return {
        project_id,
        filename: file.name,
        file_hash: "demo-" + id(),
        statement_date: "2024-10-25",
        statement_period_start: "2024-09-26",
        statement_period_end: "2024-10-25",
        candidate_count: candidates.length,
        duplicate_file: false,
        transactions: candidates,
      };
    },
    async confirm(data: PdfConfirmRequest): Promise<PdfConfirmResponse> {
      await sleep(500);
      const importId = id();
      const selected = data.transactions.filter((t) => t.selected ?? true);
      const saved: Expense[] = selected.map((t) => {
        const e: Expense = {
          id: id(),
          project_id: data.project_id,
          pdf_import_id: importId,
          transaction_date: t.transaction_date,
          post_date: t.post_date,
          description: t.description,
          amount: t.amount,
          currency: t.currency,
          category: t.category,
          is_claimed: t.is_claimed,
          claimed_date: t.is_claimed ? new Date().toISOString().slice(0, 10) : null,
          notes: t.notes,
          source: "pdf",
          source_file: data.filename,
          created_at: now(),
          updated_at: now(),
        };
        EXPENSES.unshift(e);
        return e;
      });
      return {
        pdf_import: {
          id: importId,
          project_id: data.project_id,
          filename: data.filename,
          file_hash: data.file_hash,
          uploaded_at: now(),
          statement_period_start: data.statement_period_start,
          statement_period_end: data.statement_period_end,
          statement_date: data.statement_date,
          candidate_count: data.candidate_count,
          confirmed_count: saved.length,
          ignored_count: data.candidate_count - saved.length,
          status: "confirmed",
          notes: null,
          updated_at: now(),
        },
        created_count: saved.length,
        ignored_count: data.candidate_count - saved.length,
        expenses: saved,
      };
    },
  },
};
