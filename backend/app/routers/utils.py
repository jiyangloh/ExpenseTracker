from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import models


def get_project_or_404(db: Session, project_id: int) -> models.Project:
    project = db.get(models.Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


def get_expense_or_404(db: Session, expense_id: int) -> models.Expense:
    expense = db.get(models.Expense, expense_id)
    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found.")
    return expense


def get_income_or_404(db: Session, income_id: int) -> models.Income:
    income = db.get(models.Income, income_id)
    if income is None:
        raise HTTPException(status_code=404, detail="Income not found.")
    return income


def commit_and_refresh(db: Session, instance):
    db.commit()
    db.refresh(instance)
    return instance

