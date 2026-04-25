from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import DATABASE_URL, get_db


app = FastAPI(
    title="ExpenseTracker API",
    description="Backend API for project expenses, income, and claim tracking.",
    version="0.1.0",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
def database_health(db: Session = Depends(get_db)) -> dict[str, str | int]:
    result = db.execute(text("SELECT 1")).scalar_one()
    return {
        "status": "ok",
        "database": "connected",
        "result": result,
        "url": DATABASE_URL,
    }

