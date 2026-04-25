from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import DATABASE_URL, get_db
from app.routers import expenses, income, pdf, projects


app = FastAPI(
    title="ExpenseTracker API",
    description="Backend API for project expenses, income, and claim tracking.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(expenses.router)
app.include_router(income.router)
app.include_router(pdf.router)


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
