from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest
from PIL import Image

from app.services.pdf_parser import (
    PDFParserError,
    SCANNED_PDF_NOT_SUPPORTED,
    parse_credit_card_statement_pdf,
)


FIXTURE_DIR = Path(__file__).parent / "fixtures"
SAMPLE_STATEMENT = FIXTURE_DIR / "sample_credit_card_statement.pdf"


def test_parse_sample_statement_returns_expected_expense_candidates() -> None:
    result = parse_credit_card_statement_pdf(SAMPLE_STATEMENT)

    assert result.statement_date == date(2026, 3, 31)
    assert result.statement_period_start == date(2026, 3, 1)
    assert result.statement_period_end == date(2026, 3, 31)
    assert len(result.transactions) == 27

    first = result.transactions[0]
    assert first.post_date == date(2026, 3, 2)
    assert first.transaction_date == date(2026, 3, 1)
    assert first.description == "TNG EWALLET RELOAD *VIA FPX"
    assert first.amount == Decimal("150.00")
    assert first.currency == "MYR"


def test_parse_sample_statement_excludes_non_expense_rows() -> None:
    result = parse_credit_card_statement_pdf(SAMPLE_STATEMENT)
    descriptions = {transaction.description for transaction in result.transactions}

    assert "PAYMENT - JOMPAY THANK YOU" not in descriptions
    assert "Sub-Total Charges" not in descriptions
    assert "Sub-Total Payments & Credits" not in descriptions
    assert "ANNUAL FEE - WAIVED" not in descriptions
    assert "SERVICE TAX - ANNUAL FEE" not in descriptions
    assert "Previous Statement Balance" not in descriptions
    assert "Minimum Payment Due" not in descriptions


def test_parse_sample_statement_uses_rm_amount_for_overseas_transaction() -> None:
    result = parse_credit_card_statement_pdf(SAMPLE_STATEMENT)

    overseas_transaction = next(
        transaction
        for transaction in result.transactions
        if transaction.description == "AMAZON WEB SERVICES AWS USD 95.20"
    )

    assert overseas_transaction.amount == Decimal("449.72")
    assert overseas_transaction.currency == "MYR"


def test_parse_sample_statement_keeps_transaction_table_fees() -> None:
    result = parse_credit_card_statement_pdf(SAMPLE_STATEMENT)
    descriptions = {transaction.description for transaction in result.transactions}

    assert "FINANCE CHARGES" in descriptions
    assert "LATE PAYMENT CHARGE" in descriptions


def test_parse_image_only_pdf_raises_scanned_pdf_error(tmp_path: Path) -> None:
    scanned_pdf = tmp_path / "image-only.pdf"
    image = Image.new("RGB", (100, 100), "white")
    image.save(scanned_pdf, "PDF")

    with pytest.raises(PDFParserError) as error:
        parse_credit_card_statement_pdf(scanned_pdf)

    assert error.value.code == SCANNED_PDF_NOT_SUPPORTED
    assert "OCR is not enabled" in error.value.message

