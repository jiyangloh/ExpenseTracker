from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.routers.utils import commit_and_refresh, get_expense_or_404, get_project_or_404


router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("", response_model=list[schemas.ExpenseRead])
def list_expenses(
    project_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    category: str | None = None,
    is_claimed: bool | None = None,
    db: Session = Depends(get_db),
) -> list[models.Expense]:
    query = db.query(models.Expense)

    if project_id is not None:
        query = query.filter(models.Expense.project_id == project_id)
    if date_from is not None:
        query = query.filter(models.Expense.transaction_date >= date_from)
    if date_to is not None:
        query = query.filter(models.Expense.transaction_date <= date_to)
    if category:
        query = query.filter(models.Expense.category == category)
    if is_claimed is not None:
        query = query.filter(models.Expense.is_claimed == is_claimed)

    return query.order_by(models.Expense.transaction_date.desc(), models.Expense.id.desc()).all()


@router.post("", response_model=schemas.ExpenseRead, status_code=201)
def create_expense(
    payload: schemas.ExpenseCreate, db: Session = Depends(get_db)
) -> models.Expense:
    get_project_or_404(db, payload.project_id)
    expense = models.Expense(**payload.model_dump(), source="manual")
    db.add(expense)
    return commit_and_refresh(db, expense)


@router.patch("/bulk-claim", response_model=schemas.BulkClaimResponse)
def bulk_update_claim_status(
    payload: schemas.BulkClaimRequest, db: Session = Depends(get_db)
) -> schemas.BulkClaimResponse:
    expenses = (
        db.query(models.Expense)
        .filter(models.Expense.id.in_(payload.expense_ids))
        .order_by(models.Expense.id)
        .all()
    )
    found_ids = {expense.id for expense in expenses}
    missing_ids = [expense_id for expense_id in payload.expense_ids if expense_id not in found_ids]
    if missing_ids:
        raise HTTPException(
            status_code=404,
            detail=f"Expense IDs not found: {', '.join(str(item) for item in missing_ids)}.",
        )

    for expense in expenses:
        expense.is_claimed = payload.is_claimed
        expense.claimed_date = payload.claimed_date if payload.is_claimed else None

    db.commit()
    for expense in expenses:
        db.refresh(expense)

    return schemas.BulkClaimResponse(updated_count=len(expenses), expenses=expenses)


@router.get("/{expense_id}", response_model=schemas.ExpenseRead)
def read_expense(expense_id: int, db: Session = Depends(get_db)) -> models.Expense:
    return get_expense_or_404(db, expense_id)


@router.put("/{expense_id}", response_model=schemas.ExpenseRead)
def update_expense(
    expense_id: int,
    payload: schemas.ExpenseUpdate,
    db: Session = Depends(get_db),
) -> models.Expense:
    expense = get_expense_or_404(db, expense_id)
    values = payload.model_dump(exclude_unset=True)
    if "project_id" in values:
        get_project_or_404(db, values["project_id"])

    for field, value in values.items():
        setattr(expense, field, value)

    if expense.is_claimed is False:
        expense.claimed_date = None

    return commit_and_refresh(db, expense)


@router.delete("/{expense_id}", status_code=204)
def delete_expense(expense_id: int, db: Session = Depends(get_db)) -> Response:
    expense = get_expense_or_404(db, expense_id)
    db.delete(expense)
    db.commit()
    return Response(status_code=204)


@router.patch("/{expense_id}/toggle-claim", response_model=schemas.ExpenseRead)
def toggle_expense_claim(
    expense_id: int,
    payload: schemas.ClaimToggleRequest,
    db: Session = Depends(get_db),
) -> models.Expense:
    expense = get_expense_or_404(db, expense_id)
    next_status = payload.is_claimed
    if next_status is None:
        next_status = not expense.is_claimed

    expense.is_claimed = next_status
    expense.claimed_date = payload.claimed_date if next_status else None
    return commit_and_refresh(db, expense)

