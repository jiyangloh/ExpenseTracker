from sqlalchemy import create_engine, text

from app import create_tables as table_setup


def test_existing_sqlite_updated_at_values_and_triggers(tmp_path, monkeypatch) -> None:
    engine = create_engine(f"sqlite:///{tmp_path / 'legacy.db'}")

    with engine.begin() as connection:
        connection.execute(
            text(
                "CREATE TABLE projects ("
                "id INTEGER PRIMARY KEY, "
                "name TEXT NOT NULL, "
                "updated_at TIMESTAMP)"
            )
        )
        connection.execute(
            text("CREATE TABLE expenses (id INTEGER PRIMARY KEY, updated_at TIMESTAMP)")
        )
        connection.execute(
            text("CREATE TABLE income (id INTEGER PRIMARY KEY, updated_at TIMESTAMP)")
        )
        connection.execute(
            text("CREATE TABLE pdf_imports (id INTEGER PRIMARY KEY, updated_at TIMESTAMP)")
        )
        connection.execute(text("INSERT INTO projects (id, name) VALUES (1, 'Legacy')"))

    monkeypatch.setattr(table_setup, "engine", engine)
    table_setup.ensure_existing_sqlite_schema()

    with engine.begin() as connection:
        legacy_updated_at = connection.execute(
            text("SELECT updated_at FROM projects WHERE id = 1")
        ).scalar_one()
        assert legacy_updated_at is not None

        connection.execute(text("INSERT INTO projects (id, name) VALUES (2, 'Trigger')"))
        trigger_updated_at = connection.execute(
            text("SELECT updated_at FROM projects WHERE id = 2")
        ).scalar_one()
        assert trigger_updated_at is not None
