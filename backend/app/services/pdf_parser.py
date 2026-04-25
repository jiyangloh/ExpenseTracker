from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from pathlib import Path
import re
from typing import BinaryIO

import pdfplumber


SCANNED_PDF_NOT_SUPPORTED = "scanned_pdf_not_supported"
UNSUPPORTED_STATEMENT_FORMAT = "unsupported_statement_format"
NO_TRANSACTIONS_FOUND = "no_transactions_found"

MONTHS = {
    "JAN": 1,
    "FEB": 2,
    "MAR": 3,
    "APR": 4,
    "MAY": 5,
    "JUN": 6,
    "JUL": 7,
    "AUG": 8,
    "SEP": 9,
    "OCT": 10,
    "NOV": 11,
    "DEC": 12,
}

STATEMENT_DATE_RE = re.compile(
    r"Statement Date:\s*(?P<day>\d{1,2})\s+"
    r"(?P<month>[A-Z]{3})\s+(?P<year>\d{4})",
    re.IGNORECASE,
)
STATEMENT_PERIOD_RE = re.compile(
    r"Statement Period:\s*(?P<start_day>\d{1,2})\s+"
    r"(?P<start_month>[A-Z]{3})\s+(?P<start_year>\d{4})\s+to\s+"
    r"(?P<end_day>\d{1,2})\s+(?P<end_month>[A-Z]{3})\s+"
    r"(?P<end_year>\d{4})",
    re.IGNORECASE,
)
TRANSACTION_ROW_RE = re.compile(
    r"^(?P<post_date>\d{2}/\d{2})\s+"
    r"(?P<transaction_date>\d{2}/\d{2})\s+"
    r"(?P<description>.+?)\s+"
    r"(?P<amount>\d[\d,]*\.\d{2})(?P<credit>\s+CR)?$"
)


@dataclass(frozen=True)
class ParsedTransaction:
    post_date: date
    transaction_date: date
    description: str
    amount: Decimal
    currency: str = "MYR"


@dataclass(frozen=True)
class ParsedPDFResult:
    transactions: list[ParsedTransaction]
    statement_date: date | None = None
    statement_period_start: date | None = None
    statement_period_end: date | None = None


class PDFParserError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


PDFSource = str | Path | BinaryIO


def parse_credit_card_statement_pdf(pdf_source: PDFSource) -> ParsedPDFResult:
    page_texts = extract_pdf_text(pdf_source)

    if not page_texts or not any(text.strip() for text in page_texts):
        raise PDFParserError(
            SCANNED_PDF_NOT_SUPPORTED,
            "This PDF does not contain extractable text. Scanned or image-only "
            "documents are not supported because OCR is not enabled. Please upload "
            "the original text-based bank statement PDF.",
        )

    full_text = "\n".join(page_texts)
    statement_date = parse_statement_date(full_text)
    statement_period_start, statement_period_end = parse_statement_period(full_text)

    year_source = statement_date or statement_period_end
    if year_source is None:
        raise PDFParserError(
            UNSUPPORTED_STATEMENT_FORMAT,
            "Could not detect the statement year. Please upload the supported "
            "structured credit card statement PDF.",
        )

    transaction_lines = extract_transaction_section_lines(page_texts)
    if not transaction_lines:
        raise PDFParserError(
            UNSUPPORTED_STATEMENT_FORMAT,
            "Could not find a Transaction Details section in this PDF.",
        )

    transactions = [
        transaction
        for line in transaction_lines
        if (transaction := parse_transaction_line(line, year_source.year)) is not None
    ]

    if not transactions:
        raise PDFParserError(
            NO_TRANSACTIONS_FOUND,
            "No importable expense transactions were found in this PDF.",
        )

    return ParsedPDFResult(
        transactions=transactions,
        statement_date=statement_date,
        statement_period_start=statement_period_start,
        statement_period_end=statement_period_end,
    )


def extract_pdf_text(pdf_source: PDFSource) -> list[str]:
    try:
        with pdfplumber.open(pdf_source) as pdf:
            return [page.extract_text() or "" for page in pdf.pages]
    except PDFParserError:
        raise
    except Exception as exc:
        raise PDFParserError(
            UNSUPPORTED_STATEMENT_FORMAT,
            "Could not read this PDF. Please upload a valid structured credit card "
            "statement PDF.",
        ) from exc


def extract_transaction_section_lines(page_texts: list[str]) -> list[str]:
    in_transaction_details = False
    lines: list[str] = []

    for page_text in page_texts:
        for raw_line in page_text.splitlines():
            line = normalize_space(raw_line)
            if not line:
                continue

            if line == "Transaction Details":
                in_transaction_details = True
                continue

            if line.startswith("Post Date Trans Date Transaction Description"):
                in_transaction_details = True
                continue

            if not in_transaction_details:
                continue

            if (
                line.startswith("Sub-Total")
                or line == "Overseas Transaction Details"
                or line == "Important Notes"
            ):
                in_transaction_details = False
                continue

            lines.append(line)

    return lines


def parse_transaction_line(line: str, statement_year: int) -> ParsedTransaction | None:
    match = TRANSACTION_ROW_RE.match(line)
    if match is None:
        return None

    if match.group("credit"):
        return None

    amount = Decimal(match.group("amount").replace(",", ""))
    if amount == Decimal("0.00"):
        return None

    return ParsedTransaction(
        post_date=parse_day_month(match.group("post_date"), statement_year),
        transaction_date=parse_day_month(match.group("transaction_date"), statement_year),
        description=normalize_space(match.group("description")),
        amount=amount,
    )


def parse_statement_date(text: str) -> date | None:
    match = STATEMENT_DATE_RE.search(text)
    if match is None:
        return None

    return date(
        int(match.group("year")),
        month_number(match.group("month")),
        int(match.group("day")),
    )


def parse_statement_period(text: str) -> tuple[date | None, date | None]:
    match = STATEMENT_PERIOD_RE.search(text)
    if match is None:
        return None, None

    start = date(
        int(match.group("start_year")),
        month_number(match.group("start_month")),
        int(match.group("start_day")),
    )
    end = date(
        int(match.group("end_year")),
        month_number(match.group("end_month")),
        int(match.group("end_day")),
    )
    return start, end


def parse_day_month(value: str, statement_year: int) -> date:
    day_text, month_text = value.split("/", maxsplit=1)
    return date(statement_year, int(month_text), int(day_text))


def month_number(month: str) -> int:
    return MONTHS[month.upper()]


def normalize_space(value: str) -> str:
    return " ".join(value.split())

