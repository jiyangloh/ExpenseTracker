from __future__ import annotations

from datetime import date as Date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


ProjectStatus = Literal["active", "on_hold", "closed"]
ExpenseSource = Literal["manual", "pdf"]


class ProjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    start_date: Date | None = None
    end_date: Date | None = None
    total_budget: float | None = Field(default=None, ge=0)
    status: ProjectStatus = "active"


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    start_date: Date | None = None
    end_date: Date | None = None
    total_budget: float | None = Field(default=None, ge=0)
    status: ProjectStatus | None = None


class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class ExpenseBase(BaseModel):
    project_id: int
    transaction_date: Date
    post_date: Date | None = None
    description: str = Field(min_length=1)
    amount: float = Field(gt=0)
    currency: str = Field(default="MYR", min_length=3, max_length=3)
    category: str | None = None
    is_claimed: bool = False
    claimed_date: Date | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def clear_unclaimed_date(self) -> "ExpenseBase":
        if not self.is_claimed:
            self.claimed_date = None
        return self


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    project_id: int | None = None
    transaction_date: Date | None = None
    post_date: Date | None = None
    description: str | None = Field(default=None, min_length=1)
    amount: float | None = Field(default=None, gt=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    category: str | None = None
    is_claimed: bool | None = None
    claimed_date: Date | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def clear_unclaimed_date(self) -> "ExpenseUpdate":
        if self.is_claimed is False:
            self.claimed_date = None
        return self


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    pdf_import_id: int | None = None
    transaction_date: Date
    post_date: Date | None = None
    description: str
    amount: float
    currency: str
    category: str | None = None
    is_claimed: bool
    claimed_date: Date | None = None
    notes: str | None = None
    source: ExpenseSource
    source_file: str | None = None
    created_at: datetime
    updated_at: datetime


class ClaimToggleRequest(BaseModel):
    is_claimed: bool | None = None
    claimed_date: Date | None = None


class BulkClaimRequest(BaseModel):
    expense_ids: list[int] = Field(min_length=1)
    is_claimed: bool
    claimed_date: Date | None = None


class BulkClaimResponse(BaseModel):
    updated_count: int
    expenses: list[ExpenseRead]


class IncomeBase(BaseModel):
    project_id: int
    date: Date
    source: str = Field(min_length=1, max_length=255)
    amount: float = Field(gt=0)
    currency: str = Field(default="MYR", min_length=3, max_length=3)
    notes: str | None = None


class IncomeCreate(IncomeBase):
    pass


class IncomeUpdate(BaseModel):
    project_id: int | None = None
    date: Date | None = None
    source: str | None = Field(default=None, min_length=1, max_length=255)
    amount: float | None = Field(default=None, gt=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    notes: str | None = None


class IncomeRead(IncomeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class DashboardCategoryTotal(BaseModel):
    category: str
    total: float


class DashboardClaimStatusTotal(BaseModel):
    is_claimed: bool
    total: float


class ProjectDashboard(BaseModel):
    project_id: int
    project_name: str
    total_income: float
    total_expenses: float
    net_position: float
    total_claimed: float
    total_not_claimed: float
    expenses_by_category: list[DashboardCategoryTotal]
    expenses_by_claim_status: list[DashboardClaimStatusTotal]


class PDFParsedTransaction(BaseModel):
    index: int
    post_date: Date
    transaction_date: Date
    description: str
    amount: float
    currency: str = "MYR"
    is_likely_duplicate: bool = False
    duplicate_reason: str | None = None


class PDFParseResponse(BaseModel):
    project_id: int
    filename: str
    file_hash: str
    statement_date: Date | None = None
    statement_period_start: Date | None = None
    statement_period_end: Date | None = None
    candidate_count: int
    duplicate_file: bool
    transactions: list[PDFParsedTransaction]


class PDFConfirmTransaction(BaseModel):
    selected: bool = True
    post_date: Date | None = None
    transaction_date: Date
    description: str = Field(min_length=1)
    amount: float = Field(gt=0)
    currency: str = Field(default="MYR", min_length=3, max_length=3)
    category: str | None = None
    is_claimed: bool = False
    claimed_date: Date | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def clear_unclaimed_date(self) -> "PDFConfirmTransaction":
        if not self.is_claimed:
            self.claimed_date = None
        return self


class PDFConfirmRequest(BaseModel):
    project_id: int
    filename: str = Field(min_length=1, max_length=255)
    file_hash: str = Field(min_length=64, max_length=64)
    statement_date: Date | None = None
    statement_period_start: Date | None = None
    statement_period_end: Date | None = None
    candidate_count: int = Field(ge=0)
    transactions: list[PDFConfirmTransaction] = Field(min_length=1)


class PDFImportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    filename: str
    file_hash: str
    uploaded_at: datetime
    statement_period_start: Date | None = None
    statement_period_end: Date | None = None
    statement_date: Date | None = None
    candidate_count: int
    confirmed_count: int
    ignored_count: int
    status: str
    notes: str | None = None
    updated_at: datetime


class PDFConfirmResponse(BaseModel):
    pdf_import: PDFImportRead
    created_count: int
    ignored_count: int
    expenses: list[ExpenseRead]

