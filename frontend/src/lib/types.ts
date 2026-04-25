// Domain types mirroring the backend API contract.

export type ProjectStatus = "active" | "on_hold" | "closed";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  total_budget: number;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectInput {
  name: string;
  description?: string;
  start_date?: string | null;
  end_date?: string | null;
  total_budget?: number;
  status?: ProjectStatus;
}

export type ExpenseSource = "manual" | "pdf";

export interface Expense {
  id: string;
  project_id: string;
  pdf_import_id: string | null;
  transaction_date: string;
  post_date: string | null;
  description: string;
  amount: number;
  currency: string;
  category: string;
  is_claimed: boolean;
  claimed_date: string | null;
  notes: string | null;
  source: ExpenseSource;
  source_file: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseInput {
  project_id: string;
  transaction_date: string;
  post_date?: string | null;
  description: string;
  amount: number;
  currency?: string;
  category: string;
  is_claimed?: boolean;
  claimed_date?: string | null;
  notes?: string | null;
}

export interface ExpenseFilters {
  project_id?: string;
  date_from?: string;
  date_to?: string;
  category?: string;
  is_claimed?: boolean;
}

export interface Income {
  id: string;
  project_id: string;
  date: string;
  source: string;
  amount: number;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomeInput {
  project_id: string;
  date: string;
  source: string;
  amount: number;
  currency?: string;
  notes?: string | null;
}

export interface DashboardSummary {
  project_id: string;
  project_name: string;
  total_income: number;
  total_expenses: number;
  net_position: number;
  total_claimed: number;
  total_not_claimed: number;
  expenses_by_category: DashboardCategoryTotal[];
  expenses_by_claim_status: DashboardClaimStatusTotal[];
}

export interface DashboardCategoryTotal {
  category: string;
  total: number;
}

export interface DashboardClaimStatusTotal {
  is_claimed: boolean;
  total: number;
}

export interface ParsedTransaction {
  index?: number;
  selected?: boolean;
  transaction_date: string;
  post_date: string | null;
  description: string;
  amount: number;
  currency: string;
  category: string;
  is_claimed: boolean;
  claimed_date?: string | null;
  notes: string | null;
  is_likely_duplicate?: boolean;
  duplicate_reason?: string | null;
}

export interface PdfParseResponse {
  project_id: string;
  filename: string;
  file_hash: string;
  statement_date: string | null;
  statement_period_start: string | null;
  statement_period_end: string | null;
  candidate_count: number;
  duplicate_file: boolean;
  transactions: ParsedTransaction[];
}

export interface PdfConfirmRequest {
  project_id: string;
  filename: string;
  file_hash: string;
  statement_date: string | null;
  statement_period_start: string | null;
  statement_period_end: string | null;
  candidate_count: number;
  transactions: ParsedTransaction[];
}

export interface PdfImport {
  id: string;
  project_id: string;
  filename: string;
  file_hash: string;
  uploaded_at: string;
  statement_period_start: string | null;
  statement_period_end: string | null;
  statement_date: string | null;
  candidate_count: number;
  confirmed_count: number;
  ignored_count: number;
  status: string;
  notes: string | null;
  updated_at: string;
}

export interface PdfConfirmResponse {
  pdf_import: PdfImport;
  created_count: number;
  ignored_count: number;
  expenses: Expense[];
}

export interface BulkClaimResponse {
  updated_count: number;
  expenses: Expense[];
}

export const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Travel",
  "Accommodation",
  "Office Supplies",
  "Software",
  "Equipment",
  "Utilities",
  "Marketing",
  "Professional Services",
  "Entertainment",
  "Other",
] as const;
