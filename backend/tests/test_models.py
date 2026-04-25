from app.models import Expense, PDFImport


def test_pdf_import_model_tracks_uploaded_statement() -> None:
    columns = PDFImport.__table__.columns

    assert "filename" in columns
    assert "file_hash" in columns
    assert "uploaded_at" in columns
    assert "status" in columns


def test_expense_can_link_to_pdf_import() -> None:
    columns = Expense.__table__.columns

    assert "pdf_import_id" in columns
    assert Expense.pdf_import.property.mapper.class_ is PDFImport

