from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.routers.utils import commit_and_refresh, get_income_or_404, get_project_or_404


router = APIRouter(prefix="/income", tags=["income"])


@router.get("", response_model=list[schemas.IncomeRead])
def list_income(
    project_id: int | None = None, db: Session = Depends(get_db)
) -> list[models.Income]:
    query = db.query(models.Income)
    if project_id is not None:
        query = query.filter(models.Income.project_id == project_id)
    return query.order_by(models.Income.date.desc(), models.Income.id.desc()).all()


@router.post("", response_model=schemas.IncomeRead, status_code=201)
def create_income(payload: schemas.IncomeCreate, db: Session = Depends(get_db)) -> models.Income:
    get_project_or_404(db, payload.project_id)
    income = models.Income(**payload.model_dump())
    db.add(income)
    return commit_and_refresh(db, income)


@router.get("/{income_id}", response_model=schemas.IncomeRead)
def read_income(income_id: int, db: Session = Depends(get_db)) -> models.Income:
    return get_income_or_404(db, income_id)


@router.put("/{income_id}", response_model=schemas.IncomeRead)
def update_income(
    income_id: int,
    payload: schemas.IncomeUpdate,
    db: Session = Depends(get_db),
) -> models.Income:
    income = get_income_or_404(db, income_id)
    values = payload.model_dump(exclude_unset=True)
    if "project_id" in values:
        get_project_or_404(db, values["project_id"])

    for field, value in values.items():
        setattr(income, field, value)

    return commit_and_refresh(db, income)


@router.delete("/{income_id}", status_code=204)
def delete_income(income_id: int, db: Session = Depends(get_db)) -> Response:
    income = get_income_or_404(db, income_id)
    db.delete(income)
    db.commit()
    return Response(status_code=204)

