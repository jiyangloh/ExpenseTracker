from app.models import Expense, Income, PDFImport, Project


def test_primary_models_include_created_and_updated_timestamps() -> None:
    for model in (Project, Expense, Income):
        columns = model.__table__.columns

        assert "created_at" in columns
        assert "updated_at" in columns


def test_pdf_import_model_tracks_uploaded_statement() -> None:
    columns = PDFImport.__table__.columns

    assert "project_id" in columns
    assert "filename" in columns
    assert "file_hash" in columns
    assert "uploaded_at" in columns
    assert "statement_period_start" in columns
    assert "statement_period_end" in columns
    assert "statement_date" in columns
    assert "candidate_count" in columns
    assert "confirmed_count" in columns
    assert "ignored_count" in columns
    assert "status" in columns
    assert "updated_at" in columns
    assert PDFImport.project.property.mapper.class_ is Project


def test_expense_can_link_to_pdf_import() -> None:
    columns = Expense.__table__.columns

    assert "pdf_import_id" in columns
    assert Expense.pdf_import.property.mapper.class_ is PDFImport
