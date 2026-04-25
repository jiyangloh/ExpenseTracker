from fastapi import APIRouter, Depends, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.routers.utils import commit_and_refresh, get_project_or_404


router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[schemas.ProjectRead])
def list_projects(db: Session = Depends(get_db)) -> list[models.Project]:
    return db.query(models.Project).order_by(models.Project.created_at.desc()).all()


@router.post("", response_model=schemas.ProjectRead, status_code=201)
def create_project(
    payload: schemas.ProjectCreate, db: Session = Depends(get_db)
) -> models.Project:
    project = models.Project(**payload.model_dump())
    db.add(project)
    return commit_and_refresh(db, project)


@router.get("/{project_id}", response_model=schemas.ProjectRead)
def read_project(project_id: int, db: Session = Depends(get_db)) -> models.Project:
    return get_project_or_404(db, project_id)


@router.put("/{project_id}", response_model=schemas.ProjectRead)
def update_project(
    project_id: int,
    payload: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
) -> models.Project:
    project = get_project_or_404(db, project_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    return commit_and_refresh(db, project)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)) -> Response:
    project = get_project_or_404(db, project_id)
    db.delete(project)
    db.commit()
    return Response(status_code=204)


@router.get("/{project_id}/dashboard", response_model=schemas.ProjectDashboard)
def project_dashboard(
    project_id: int, db: Session = Depends(get_db)
) -> schemas.ProjectDashboard:
    project = get_project_or_404(db, project_id)

    total_income = scalar_sum(
        db.query(func.coalesce(func.sum(models.Income.amount), 0.0)).filter(
            models.Income.project_id == project_id
        )
    )
    total_expenses = scalar_sum(
        db.query(func.coalesce(func.sum(models.Expense.amount), 0.0)).filter(
            models.Expense.project_id == project_id
        )
    )
    total_claimed = scalar_sum(
        db.query(func.coalesce(func.sum(models.Expense.amount), 0.0)).filter(
            models.Expense.project_id == project_id,
            models.Expense.is_claimed.is_(True),
        )
    )
    total_not_claimed = scalar_sum(
        db.query(func.coalesce(func.sum(models.Expense.amount), 0.0)).filter(
            models.Expense.project_id == project_id,
            models.Expense.is_claimed.is_(False),
        )
    )

    category_rows = (
        db.query(models.Expense.category, func.coalesce(func.sum(models.Expense.amount), 0.0))
        .filter(models.Expense.project_id == project_id)
        .group_by(models.Expense.category)
        .all()
    )
    claim_status_rows = (
        db.query(
            models.Expense.is_claimed,
            func.coalesce(func.sum(models.Expense.amount), 0.0),
        )
        .filter(models.Expense.project_id == project_id)
        .group_by(models.Expense.is_claimed)
        .all()
    )

    return schemas.ProjectDashboard(
        project_id=project.id,
        project_name=project.name,
        total_income=total_income,
        total_expenses=total_expenses,
        net_position=total_income - total_expenses,
        total_claimed=total_claimed,
        total_not_claimed=total_not_claimed,
        expenses_by_category=[
            schemas.DashboardCategoryTotal(
                category=category or "Uncategorized", total=float(total or 0)
            )
            for category, total in category_rows
        ],
        expenses_by_claim_status=[
            schemas.DashboardClaimStatusTotal(
                is_claimed=bool(is_claimed), total=float(total or 0)
            )
            for is_claimed, total in claim_status_rows
        ],
    )


def scalar_sum(query) -> float:
    return float(query.scalar() or 0)

