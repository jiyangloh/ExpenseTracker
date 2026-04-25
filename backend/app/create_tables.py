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
        project_columns = column_names(connection, "projects")
        expense_columns = column_names(connection, "expenses")
        income_columns = column_names(connection, "income")
        pdf_import_columns = column_names(connection, "pdf_imports")

        if "updated_at" not in project_columns:
            connection.execute(text("ALTER TABLE projects ADD COLUMN updated_at TIMESTAMP"))
        ensure_updated_at_values(connection, "projects")
        ensure_updated_at_triggers(connection, "projects")

        if "pdf_import_id" not in expense_columns:
            connection.execute(
                text(
                    "ALTER TABLE expenses "
                    "ADD COLUMN pdf_import_id INTEGER REFERENCES pdf_imports(id)"
                )
            )

        if "updated_at" not in expense_columns:
            connection.execute(text("ALTER TABLE expenses ADD COLUMN updated_at TIMESTAMP"))
        ensure_updated_at_values(connection, "expenses")
        ensure_updated_at_triggers(connection, "expenses")

        if "updated_at" not in income_columns:
            connection.execute(text("ALTER TABLE income ADD COLUMN updated_at TIMESTAMP"))
        ensure_updated_at_values(connection, "income")
        ensure_updated_at_triggers(connection, "income")

        pdf_import_schema_updates = {
            "project_id": "INTEGER REFERENCES projects(id)",
            "statement_period_start": "DATE",
            "statement_period_end": "DATE",
            "statement_date": "DATE",
            "candidate_count": "INTEGER NOT NULL DEFAULT 0",
            "confirmed_count": "INTEGER NOT NULL DEFAULT 0",
            "ignored_count": "INTEGER NOT NULL DEFAULT 0",
            "updated_at": "TIMESTAMP",
        }

        for column_name, column_definition in pdf_import_schema_updates.items():
            if column_name not in pdf_import_columns:
                connection.execute(
                    text(
                        f"ALTER TABLE pdf_imports "
                        f"ADD COLUMN {column_name} {column_definition}"
                    )
                )

        ensure_updated_at_values(connection, "pdf_imports")
        ensure_updated_at_triggers(connection, "pdf_imports")

        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_pdf_imports_project_id "
                "ON pdf_imports (project_id)"
            )
        )
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_expenses_pdf_import_id "
                "ON expenses (pdf_import_id)"
            )
        )


def column_names(connection, table_name: str) -> set[str]:
    return {
        row[1] for row in connection.execute(text(f"PRAGMA table_info({table_name})"))
    }


def ensure_updated_at_values(connection, table_name: str) -> None:
    connection.execute(
        text(
            f"UPDATE {table_name} "
            "SET updated_at = CURRENT_TIMESTAMP "
            "WHERE updated_at IS NULL"
        )
    )


def ensure_updated_at_triggers(connection, table_name: str) -> None:
    connection.execute(
        text(
            f"""
            CREATE TRIGGER IF NOT EXISTS set_{table_name}_updated_at_insert
            AFTER INSERT ON {table_name}
            FOR EACH ROW
            WHEN NEW.updated_at IS NULL
            BEGIN
                UPDATE {table_name}
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.id;
            END
            """
        )
    )
    connection.execute(
        text(
            f"""
            CREATE TRIGGER IF NOT EXISTS set_{table_name}_updated_at_update
            AFTER UPDATE ON {table_name}
            FOR EACH ROW
            WHEN NEW.updated_at IS OLD.updated_at
            BEGIN
                UPDATE {table_name}
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.id;
            END
            """
        )
    )


if __name__ == "__main__":
    create_tables()
    print("Database tables created.")
