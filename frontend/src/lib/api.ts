import type {
  BulkClaimResponse,
  DashboardSummary,
  Expense,
  ExpenseFilters,
  ExpenseInput,
  Income,
  IncomeInput,
  ParsedTransaction,
  PdfConfirmRequest,
  PdfConfirmResponse,
  PdfImport,
  PdfParseResponse,
  Project,
  ProjectInput,
} from "./types";
import { mockApi } from "./mockApi";

/**
 * Centralized API service layer.
 * All persistent reads/writes go through here. Components must not call fetch directly.
 *
 * The real FastAPI backend is used by default. Set VITE_API_BASE_URL if the
 * backend is running somewhere other than http://127.0.0.1:8010.
 * Set VITE_USE_MOCK_API=true only when you intentionally want demo data.
 */

const DEFAULT_BASE_URL = "http://127.0.0.1:8010";
const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const BASE_URL = (configuredBaseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
export const USE_MOCK =
  String(import.meta.env.VITE_USE_MOCK_API ?? "").toLowerCase() === "true";

class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type RequestQuery = Record<string, string | number | boolean | undefined>;

type ApiProject = Omit<Project, "id"> & { id: number };
type ApiExpense = Omit<Expense, "id" | "project_id" | "pdf_import_id" | "category"> & {
  id: number;
  project_id: number;
  pdf_import_id: number | null;
  category: string | null;
};
type ApiIncome = Omit<Income, "id" | "project_id"> & { id: number; project_id: number };
type ApiDashboardSummary = Omit<DashboardSummary, "project_id"> & { project_id: number };
type ApiParsedTransaction = Omit<ParsedTransaction, "category"> & { category?: string | null };
type ApiPdfParseResponse = Omit<PdfParseResponse, "project_id" | "transactions"> & {
  project_id: number;
  transactions: ApiParsedTransaction[];
};
type ApiPdfImport = Omit<PdfImport, "id" | "project_id"> & {
  id: number;
  project_id: number;
};
type ApiPdfConfirmResponse = Omit<PdfConfirmResponse, "pdf_import" | "expenses"> & {
  pdf_import: ApiPdfImport;
  expenses: ApiExpense[];
};
type ApiBulkClaimResponse = Omit<BulkClaimResponse, "expenses"> & { expenses: ApiExpense[] };

function toApiId(id: string | number): number {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error(`Invalid backend ID: ${id}`);
  }
  return numericId;
}

function toProject(project: ApiProject): Project {
  return { ...project, id: String(project.id) };
}

function toExpense(expense: ApiExpense): Expense {
  return {
    ...expense,
    id: String(expense.id),
    project_id: String(expense.project_id),
    pdf_import_id: expense.pdf_import_id === null ? null : String(expense.pdf_import_id),
    category: expense.category ?? "Other",
  };
}

function toIncome(income: ApiIncome): Income {
  return { ...income, id: String(income.id), project_id: String(income.project_id) };
}

function toDashboard(dashboard: ApiDashboardSummary): DashboardSummary {
  return { ...dashboard, project_id: String(dashboard.project_id) };
}

function toParsedTransaction(transaction: ApiParsedTransaction): ParsedTransaction {
  return {
    index: transaction.index,
    selected: transaction.selected,
    transaction_date: transaction.transaction_date,
    post_date: transaction.post_date ?? null,
    description: transaction.description,
    amount: transaction.amount,
    currency: transaction.currency ?? "MYR",
    category: transaction.category ?? "Other",
    is_claimed: transaction.is_claimed ?? false,
    claimed_date: transaction.claimed_date ?? null,
    notes: transaction.notes ?? null,
    is_likely_duplicate: transaction.is_likely_duplicate ?? false,
    duplicate_reason: transaction.duplicate_reason ?? null,
  };
}

function toPdfParseResponse(response: ApiPdfParseResponse): PdfParseResponse {
  return {
    ...response,
    project_id: String(response.project_id),
    transactions: response.transactions.map(toParsedTransaction),
  };
}

function toPdfImport(pdfImport: ApiPdfImport): PdfImport {
  return {
    ...pdfImport,
    id: String(pdfImport.id),
    project_id: String(pdfImport.project_id),
  };
}

function toPdfConfirmResponse(response: ApiPdfConfirmResponse): PdfConfirmResponse {
  return {
    ...response,
    pdf_import: toPdfImport(response.pdf_import),
    expenses: response.expenses.map(toExpense),
  };
}

function toApiExpenseInput(data: ExpenseInput) {
  return {
    ...data,
    project_id: toApiId(data.project_id),
    category: data.category || null,
    currency: data.currency ?? "MYR",
    notes: data.notes || null,
  };
}

function toApiIncomeInput(data: IncomeInput) {
  return {
    ...data,
    project_id: toApiId(data.project_id),
    currency: data.currency ?? "MYR",
    notes: data.notes || null,
  };
}

function toApiPdfConfirmRequest(data: PdfConfirmRequest) {
  return {
    ...data,
    project_id: toApiId(data.project_id),
    transactions: data.transactions.map((transaction) => ({
      selected: transaction.selected ?? true,
      post_date: transaction.post_date ?? null,
      transaction_date: transaction.transaction_date,
      description: transaction.description,
      amount: transaction.amount,
      currency: transaction.currency ?? "MYR",
      category: transaction.category || null,
      is_claimed: transaction.is_claimed ?? false,
      claimed_date: transaction.is_claimed ? transaction.claimed_date ?? null : null,
      notes: transaction.notes || null,
    })),
  };
}

function extractErrorMessage(status: number, statusText: string, details: unknown): string {
  if (details && typeof details === "object" && "detail" in details) {
    const detail = (details as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "message" in detail) {
      const message = (detail as { message?: unknown }).message;
      if (typeof message === "string") return message;
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: unknown };
      if (typeof first.msg === "string") return first.msg;
      return "Validation failed.";
    }
  }
  return `Request failed: ${status} ${statusText}`;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let details: unknown = undefined;
    try {
      details = await res.json();
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new ApiError(res.status, extractErrorMessage(res.status, res.statusText, details), details);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function request<T>(
  path: string,
  options: RequestInit & { query?: RequestQuery } = {},
): Promise<T> {
  const { query, headers, ...rest } = options;
  const qs = query
    ? "?" +
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  const url = `${BASE_URL}${path}${qs}`;

  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  return parseResponse<T>(res);
}

// ---------- Projects ----------
export const projectsApi = {
  list: async (): Promise<Project[]> =>
    USE_MOCK ? mockApi.projects.list() : (await request<ApiProject[]>("/projects")).map(toProject),
  get: async (id: string): Promise<Project> =>
    USE_MOCK ? mockApi.projects.get(id) : toProject(await request<ApiProject>(`/projects/${id}`)),
  create: async (data: ProjectInput): Promise<Project> =>
    USE_MOCK
      ? mockApi.projects.create(data)
      : toProject(
          await request<ApiProject>("/projects", { method: "POST", body: JSON.stringify(data) }),
        ),
  update: async (id: string, data: ProjectInput): Promise<Project> =>
    USE_MOCK
      ? mockApi.projects.update(id, data)
      : toProject(
          await request<ApiProject>(`/projects/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
          }),
        ),
  remove: (id: string): Promise<void> =>
    USE_MOCK ? mockApi.projects.remove(id) : request<void>(`/projects/${id}`, { method: "DELETE" }),
  dashboard: async (id: string): Promise<DashboardSummary> =>
    USE_MOCK
      ? mockApi.projects.dashboard(id)
      : toDashboard(await request<ApiDashboardSummary>(`/projects/${id}/dashboard`)),
};

// ---------- Expenses ----------
export const expensesApi = {
  list: async (filters: ExpenseFilters = {}): Promise<Expense[]> =>
    USE_MOCK
      ? mockApi.expenses.list(filters)
      : (
          await request<ApiExpense[]>("/expenses", {
            query: {
              project_id: filters.project_id,
              date_from: filters.date_from,
              date_to: filters.date_to,
              category: filters.category,
              is_claimed: filters.is_claimed,
            },
          })
        ).map(toExpense),
  get: async (id: string): Promise<Expense> =>
    USE_MOCK ? mockApi.expenses.get(id) : toExpense(await request<ApiExpense>(`/expenses/${id}`)),
  create: async (data: ExpenseInput): Promise<Expense> =>
    USE_MOCK
      ? mockApi.expenses.create(data)
      : toExpense(
          await request<ApiExpense>("/expenses", {
            method: "POST",
            body: JSON.stringify(toApiExpenseInput(data)),
          }),
        ),
  update: async (id: string, data: ExpenseInput): Promise<Expense> =>
    USE_MOCK
      ? mockApi.expenses.update(id, data)
      : toExpense(
          await request<ApiExpense>(`/expenses/${id}`, {
            method: "PUT",
            body: JSON.stringify(toApiExpenseInput(data)),
          }),
        ),
  remove: (id: string): Promise<void> =>
    USE_MOCK ? mockApi.expenses.remove(id) : request<void>(`/expenses/${id}`, { method: "DELETE" }),
  toggleClaim: async (
    id: string,
    is_claimed?: boolean,
    claimed_date?: string | null,
  ): Promise<Expense> =>
    USE_MOCK
      ? mockApi.expenses.toggleClaim(id, is_claimed, claimed_date)
      : toExpense(
          await request<ApiExpense>(`/expenses/${id}/toggle-claim`, {
            method: "PATCH",
            body: JSON.stringify({ is_claimed, claimed_date }),
          }),
        ),
  bulkClaim: async (ids: string[], is_claimed: boolean): Promise<Expense[]> =>
    USE_MOCK
      ? mockApi.expenses.bulkClaim(ids, is_claimed)
      : (
          await request<ApiBulkClaimResponse>("/expenses/bulk-claim", {
            method: "PATCH",
            body: JSON.stringify({ expense_ids: ids.map(toApiId), is_claimed }),
          })
        ).expenses.map(toExpense),
};

// ---------- Income ----------
export const incomeApi = {
  list: async (project_id?: string): Promise<Income[]> =>
    USE_MOCK
      ? mockApi.income.list(project_id)
      : (
          await request<ApiIncome[]>("/income", {
            query: { project_id },
          })
        ).map(toIncome),
  get: async (id: string): Promise<Income> =>
    USE_MOCK ? mockApi.income.get(id) : toIncome(await request<ApiIncome>(`/income/${id}`)),
  create: async (data: IncomeInput): Promise<Income> =>
    USE_MOCK
      ? mockApi.income.create(data)
      : toIncome(
          await request<ApiIncome>("/income", {
            method: "POST",
            body: JSON.stringify(toApiIncomeInput(data)),
          }),
        ),
  update: async (id: string, data: IncomeInput): Promise<Income> =>
    USE_MOCK
      ? mockApi.income.update(id, data)
      : toIncome(
          await request<ApiIncome>(`/income/${id}`, {
            method: "PUT",
            body: JSON.stringify(toApiIncomeInput(data)),
          }),
        ),
  remove: (id: string): Promise<void> =>
    USE_MOCK ? mockApi.income.remove(id) : request<void>(`/income/${id}`, { method: "DELETE" }),
};

// ---------- PDF ----------
export const pdfApi = {
  parse: async (project_id: string, file: File): Promise<PdfParseResponse> => {
    if (USE_MOCK) return mockApi.pdf.parse(project_id, file);

    const fd = new FormData();
    fd.append("project_id", String(toApiId(project_id)));
    fd.append("file", file);

    const res = await fetch(`${BASE_URL}/pdf/parse`, { method: "POST", body: fd });
    return toPdfParseResponse(await parseResponse<ApiPdfParseResponse>(res));
  },
  confirm: async (data: PdfConfirmRequest): Promise<PdfConfirmResponse> =>
    USE_MOCK
      ? mockApi.pdf.confirm(data)
      : toPdfConfirmResponse(
          await request<ApiPdfConfirmResponse>("/pdf/confirm", {
            method: "POST",
            body: JSON.stringify(toApiPdfConfirmRequest(data)),
          }),
        ),
};

export { ApiError };
