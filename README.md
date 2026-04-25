# ExpenseTracker

A small project cost management system for tracking projects, expenses, income, and claim status.

This first slice contains the Python backend foundation only: FastAPI, SQLite, SQLAlchemy models, database table creation, and health checks.

## Project Structure

```text
backend/
  app/
    create_tables.py
    database.py
    main.py
    models.py
  tests/
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

PDF imports are tracked in the `pdf_imports` table. Expenses imported from a PDF can link back to the upload through `expenses.pdf_import_id`, while manually entered expenses leave that field empty.

Next planned slices:

- CRUD endpoints for projects, expenses, and income
- Claim toggle endpoints
- Dashboard aggregation endpoint
- PDF transaction extraction and preview/confirm flow
- Lovable-exported frontend integration
