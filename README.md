# ExpenseTracker

A small project cost management system for tracking projects, expenses, income, and claim status.

The current backend contains the FastAPI foundation, SQLite/SQLAlchemy models, database table creation, health checks, and a structured PDF parser for credit card statement expense candidates.

## Project Structure

```text
backend/
  app/
    create_tables.py
    database.py
    main.py
    models.py
    services/
      pdf_parser.py
  tests/
    fixtures/
  requirements.txt
  requirements-dev.txt
```

The local SQLite database is generated at `backend/project.db` and is ignored by git.

## Backend Setup On Windows

From a fresh clone:

```powershell
cd backend
py -3.10 -m venv ..\.venv
..\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m app.create_tables
uvicorn app.main:app --reload
```

Then open:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/health/db`
- `http://127.0.0.1:8000/docs`

## Backend Setup On macOS/Linux

From a fresh clone:

```bash
cd backend
python3 -m venv ../.venv
source ../.venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m app.create_tables
uvicorn app.main:app --reload
```

## Development Checks

Install the optional development dependencies:

```bash
pip install -r requirements-dev.txt
pytest
```

Latest verification:

```text
10 passed
```

## Database Configuration

By default, the backend uses:

```text
sqlite:///backend/project.db
```

To use a different database path or engine, set `DATABASE_URL` before running commands:

```powershell
$env:DATABASE_URL = "sqlite:///custom.db"
```

## Current Scope

Implemented:

- FastAPI application scaffold
- SQLite connection setup
- SQLAlchemy models for projects, expenses, income, and PDF imports
- Table creation command
- API health checks
- PDF parser for structured credit card statement PDFs using `pdfplumber`

PDF imports are tracked in the `pdf_imports` table. Each PDF import belongs to a project, stores the uploaded filename/hash, optional statement dates, extracted/confirmed/ignored transaction counts, import status, and timestamps. Expenses imported from a PDF can link back to the upload through `expenses.pdf_import_id`, while manually entered expenses leave that field empty.

Projects, expenses, and income all store `created_at` and `updated_at` timestamps.

## PDF Parser

The backend includes a parser function:

```python
parse_credit_card_statement_pdf(pdf_source)
```

The parser uses `pdfplumber` to extract text from structured, text-based credit card statement PDFs. It does not use OCR.

Supported:

- Text-based PDF statements where transaction text can be selected/copied.
- The provided Malaysian credit card statement sample.
- Transaction candidate extraction for preview before saving.
- RM amount extraction as the primary expense amount.

Not supported:

- Scanned PDFs.
- Image-only PDFs.
- Photos of statements.
- PDFs where transaction text cannot be extracted.

If a scanned or image-only PDF is provided, the parser raises a clear error explaining that OCR is not enabled and that the user should upload the original text-based bank statement PDF.

Current parser behavior:

- Extracts transaction date, post date, description, amount, and currency.
- Skips payment/credit rows ending in `CR`.
- Skips account summary rows.
- Skips subtotal rows.
- Skips zero-amount rows.
- Keeps finance charges and late payment charges from the transaction table for user review.
- Returns candidates only; saving to the database will be implemented in a later upload/confirm slice.

Next planned slices:

- CRUD endpoints for projects, expenses, and income
- Claim toggle endpoints
- Dashboard aggregation endpoint
- PDF upload API and preview/confirm save flow
- Lovable-exported frontend integration
