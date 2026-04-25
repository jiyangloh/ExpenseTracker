# ExpenseTracker

A small project cost management system for tracking projects, expenses, income, and claim status.

The current project contains a FastAPI backend and a Lovable-exported Vite React frontend connected through the documented REST API contract.

## Project Structure

```text
backend/
  app/
    create_tables.py
    database.py
    main.py
    models.py
    schemas.py
    routers/
    services/
      pdf_parser.py
  tests/
    fixtures/
  requirements.txt
  requirements-dev.txt
frontend/
  src/
    lib/
      api.ts
      mockApi.ts
      types.ts
  .env.example
  package.json
```

The local SQLite database is generated at `backend/project.db` and is ignored by git.
The Lovable frontend export was copied into `frontend/` for repository organization. Frontend dependencies and build output are generated locally and ignored by git.

## Local Setup From Fresh Clone

Prerequisites:

- Git
- Python 3.10 or newer
- Node.js 18 or newer with npm

The app runs as two local processes:

- Backend FastAPI API: `http://127.0.0.1:8001`
- Frontend Vite app: `http://localhost:5173`

### Windows

Clone the repository and enter the project:

```powershell
git clone <repo-url>
cd ExpenseTracker
```

Set up and start the backend in Terminal 1:

```powershell
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m app.create_tables
uvicorn app.main:app --reload --port 8001
```

Set up and start the frontend in Terminal 2:

```powershell
cd ExpenseTracker\frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://127.0.0.1:8001/health`
- API docs: `http://127.0.0.1:8001/docs`

### macOS/Linux

Clone the repository and enter the project:

```bash
git clone <repo-url>
cd ExpenseTracker
```

Set up and start the backend in Terminal 1:

```bash
python3 -m venv .venv
source .venv/bin/activate
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m app.create_tables
uvicorn app.main:app --reload --port 8001
```

Set up and start the frontend in Terminal 2:

```bash
cd ExpenseTracker/frontend
npm install
cp .env.example .env
npm run dev
```

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://127.0.0.1:8001/health`
- API docs: `http://127.0.0.1:8001/docs`

### Daily Local Run

After the first setup, start the backend:

```powershell
cd backend
..\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8001
```

On macOS/Linux, activate with:

```bash
source ../.venv/bin/activate
```

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

The frontend uses `frontend/.env`:

```text
VITE_API_BASE_URL=http://127.0.0.1:8001
VITE_USE_MOCK_API=false
```

If the backend runs on a different port, update `VITE_API_BASE_URL` in `frontend/.env`.
Set `VITE_USE_MOCK_API=true` only for demo mode. Persistent project, expense, income, dashboard, and PDF import data should come from the FastAPI backend.

## Development Checks

Backend checks:

```bash
cd backend
source ../.venv/bin/activate  # macOS/Linux
pip install -r requirements-dev.txt
pytest
```

On Windows, activate the virtual environment with:

```powershell
..\.venv\Scripts\Activate.ps1
```

Frontend checks:

```bash
cd frontend
npm run test
npm run build
```

Latest verification:

```text
Backend: 17 passed
Frontend build: passed
Frontend tests: 4 passed
```

Frontend lint currently reports Lovable/shadcn template issues in `src/components/ui/command.tsx`, `src/components/ui/textarea.tsx`, and `tailwind.config.ts`, plus fast-refresh warnings for shared UI exports. These were documented instead of hidden because they came from the exported UI template.

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
- Project CRUD API
- Expense CRUD API with filters
- Income CRUD API with project filtering
- Expense claim toggle and bulk claim update APIs
- Project dashboard aggregation API
- PDF parse and confirm-save APIs
- PDF parser for structured credit card statement PDFs using `pdfplumber`
- CORS support for the local frontend development server
- Lovable-exported Vite React frontend copied into `frontend/`
- Centralized frontend API service in `frontend/src/lib/api.ts`
- Frontend API normalization for backend IDs, dashboard arrays, PDF parse, and PDF confirm responses

PDF imports are tracked in the `pdf_imports` table. Each PDF import belongs to a project, stores the uploaded filename/hash, optional statement dates, extracted/confirmed/ignored transaction counts, import status, and timestamps. Expenses imported from a PDF can link back to the upload through `expenses.pdf_import_id`, while manually entered expenses leave that field empty.

Projects, expenses, and income all store `created_at` and `updated_at` timestamps.

## API Endpoints

Open the interactive API docs at:

- `http://127.0.0.1:8001/docs`

Health:

- `GET /health`
- `GET /health/db`

Projects:

- `GET /projects`
- `POST /projects`
- `GET /projects/{project_id}`
- `PUT /projects/{project_id}`
- `DELETE /projects/{project_id}`
- `GET /projects/{project_id}/dashboard`

Expenses:

- `GET /expenses`
- `POST /expenses`
- `GET /expenses/{expense_id}`
- `PUT /expenses/{expense_id}`
- `DELETE /expenses/{expense_id}`
- `PATCH /expenses/{expense_id}/toggle-claim`
- `PATCH /expenses/bulk-claim`

Income:

- `GET /income`
- `POST /income`
- `GET /income/{income_id}`
- `PUT /income/{income_id}`
- `DELETE /income/{income_id}`

PDF import:

- `POST /pdf/parse`
- `POST /pdf/confirm`

The frontend-backend contract is documented in [frontend_backend_integration_spec.md](frontend_backend_integration_spec.md).

## Frontend Integration Notes

The backend allows local frontend requests from:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:8080`
- `http://127.0.0.1:8080`

The frontend should use `VITE_API_BASE_URL` for the backend base URL. For local development, use `http://127.0.0.1:8001`. The API service uses the real backend by default and only uses the in-memory mock API when `VITE_USE_MOCK_API=true`.

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
- `/pdf/parse` returns candidates only and does not save them.
- `/pdf/confirm` saves user-confirmed candidates as project expenses and links them to a `pdf_imports` record.
- Exact duplicate PDF file imports are rejected by file hash.

Next planned slices:

- End-to-end frontend/back-end workflow testing with real sample data
- Alembic migrations before serious GCP deployment
