from app import models  # noqa: F401
from app.database import Base, engine
from sqlalchemy import text


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_existing_sqlite_schema()


def ensure_existing_sqlite_schema() -> None:
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as connection:
        expense_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info(expenses)"))
        }

        if "pdf_import_id" not in expense_columns:
            connection.execute(
                text(
                    "ALTER TABLE expenses "
                    "ADD COLUMN pdf_import_id INTEGER REFERENCES pdf_imports(id)"
                )
            )


if __name__ == "__main__":
    create_tables()
    print("Database tables created.")
