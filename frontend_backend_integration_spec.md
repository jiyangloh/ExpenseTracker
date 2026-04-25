# Frontend and Backend Integration Specification

## 1. Title

Frontend and Backend Integration Specification

## 2. Overview

The backend should be completed or at least clearly defined before building the Lovable frontend. The frontend should be generated from a known API contract so integration is smoother and less dependent on mock assumptions.

The backend API is responsible for persistence, validation, PDF parsing, dashboard aggregation, claim logic, duplicate detection, and business rules. The frontend should not invent backend logic, should not use localStorage as the final data source, and should use the backend REST API for all persistent data.

## 3. Recommended Development Workflow

1. Build the backend route skeleton first.
2. Test all endpoints through FastAPI docs.
3. Create an API contract document.
4. Give the API contract to Lovable.
5. Generate the frontend in Lovable.
6. Export the frontend code into the GitHub repository under `/frontend`.
7. Use Codex to replace mock data with real API calls.
8. Test the full end-to-end flow.

## 4. Backend Responsibilities

The backend must handle:

- Project CRUD.
- Expense CRUD.
- Income CRUD.
- Dashboard aggregation.
- PDF parsing.
- PDF confirm-save flow.
- Claim status toggling.
- Bulk claim status updates.
- Input validation.
- HTTP error responses.
- Persistent storage.
- Duplicate detection where possible.

## 5. Frontend Responsibilities

The frontend must handle:

- Displaying project data.
- Displaying dashboard cards.
- Displaying expenses and filters.
- Displaying income records.
- Providing forms for create, edit, and delete operations.
- Uploading PDF files.
- Showing parsed PDF transactions in a preview table.
- Allowing the user to edit or remove parsed transactions before saving.
- Calling backend endpoints instead of calculating important business logic locally.

## 6. Environment Configuration

The frontend should use an environment variable for the backend base URL.

The variable name must be `VITE_API_BASE_URL`.

Local development may use `http://127.0.0.1:8000`.

Production deployment may use a GCP Cloud Run backend URL.

## 7. API Contract Overview

The frontend must know the endpoint path, HTTP method, endpoint purpose, data sent by the frontend, and data received from the backend.

The backend API is the source of truth. If frontend mock data conflicts with the backend contract, the backend contract wins.

## 8. Project Endpoints

GET `/projects`

Purpose: Fetch all projects for the project list page.

The frontend sends no body. The frontend receives a list of projects.

POST `/projects`

Purpose: Create a new project.

The frontend sends project details. The frontend receives the created project.

GET `/projects/{project_id}`

Purpose: Fetch details for one project.

The frontend sends the project ID in the path. The frontend receives one project.

PUT `/projects/{project_id}`

Purpose: Update project details.

The frontend sends updated project fields. The frontend receives the updated project.

DELETE `/projects/{project_id}`

Purpose: Delete a project.

The frontend sends the project ID in the path. The backend deletes the project and related records according to the backend data model.

Project fields:

- `id`
- `name`
- `description`
- `start_date`
- `end_date`
- `total_budget`
- `status`
- `created_at`
- `updated_at`

Allowed project statuses are `active`, `on_hold`, and `closed`.

## 9. Dashboard Endpoint

GET `/projects/{project_id}/dashboard`

Purpose: Fetch all dashboard totals for one project in a single request.

The frontend should not calculate dashboard totals by fetching every expense and income record. Dashboard aggregation must happen in the backend.

Dashboard response fields:

- `project_id`
- `project_name`
- `total_income`
- `total_expenses`
- `net_position`
- `total_claimed`
- `total_not_claimed`
- `expenses_by_category`
- `expenses_by_claim_status`

Field meanings:

- `total_income` means total manually entered income for the project.
- `total_expenses` means total expenses for the project.
- `net_position` means `total_income` minus `total_expenses`.
- `total_claimed` means total amount of expenses marked as claimed.
- `total_not_claimed` means total amount of expenses still outstanding.
- `expenses_by_category` means expense totals grouped by category.
- `expenses_by_claim_status` means expense totals grouped by claimed and not-claimed status.

## 10. Expense Endpoints

GET `/expenses`

Purpose: Fetch expenses, optionally filtered by project, date range, category, and claim status.

Supported filters:

- `project_id`
- `date_from`
- `date_to`
- `category`
- `is_claimed`

POST `/expenses`

Purpose: Create one manual expense.

The backend sets the expense source to `manual`.

GET `/expenses/{expense_id}`

Purpose: Fetch details for one expense.

PUT `/expenses/{expense_id}`

Purpose: Update one expense.

DELETE `/expenses/{expense_id}`

Purpose: Delete one expense.

PATCH `/expenses/{expense_id}/toggle-claim`

Purpose: Toggle one expense between claimed and not-claimed, or explicitly set the claim status.

PATCH `/expenses/bulk-claim`

Purpose: Update the claim status of multiple expenses at once.

Expense fields:

- `id`
- `project_id`
- `pdf_import_id`
- `transaction_date`
- `post_date`
- `description`
- `amount`
- `currency`
- `category`
- `is_claimed`
- `claimed_date`
- `notes`
- `source`
- `source_file`
- `created_at`
- `updated_at`

The `source` field can be `manual` or `pdf`.

The `currency` field defaults to `MYR`.

The `claimed_date` field is optional. If `is_claimed` is false, `claimed_date` may be empty and should not be required by the frontend.

## 11. Income Endpoints

GET `/income`

Purpose: Fetch income records, optionally filtered by project.

Supported filter:

- `project_id`

POST `/income`

Purpose: Create a new income record manually.

GET `/income/{income_id}`

Purpose: Fetch details for one income record.

PUT `/income/{income_id}`

Purpose: Update one income record.

DELETE `/income/{income_id}`

Purpose: Delete one income record.

Income fields:

- `id`
- `project_id`
- `date`
- `source`
- `amount`
- `currency`
- `notes`
- `created_at`
- `updated_at`

Income is always manually entered by the user. Income must never be extracted from the credit card statement PDF.

## 12. PDF Parsing Endpoints

POST `/pdf/parse`

Purpose: Accept a credit card statement PDF and return a list of candidate expense transactions.

This endpoint does not save transactions permanently. It only extracts and returns preview data.

The frontend sends:

- Selected project ID.
- Uploaded PDF file.

The frontend receives:

- Project ID.
- Filename.
- File hash.
- Statement date if detected.
- Statement period if detected.
- Candidate transaction count.
- Whether the exact PDF file was already imported.
- Candidate transactions for preview.
- Duplicate hints for likely already-saved expenses.

POST `/pdf/confirm`

Purpose: Accept user-confirmed transactions and save them as expenses under the selected project.

The frontend sends:

- Project ID.
- Filename.
- File hash returned by `/pdf/parse`.
- Statement metadata returned by `/pdf/parse`.
- Candidate count.
- User-confirmed transactions.

The frontend receives:

- PDF import record.
- Number of created expenses.
- Number of ignored transactions.
- Saved expense records.

Required PDF flow:

1. User selects a project.
2. User uploads a PDF.
3. Frontend sends the PDF to the backend parse endpoint.
4. Backend extracts candidate transactions.
5. Backend returns parsed transactions to the frontend.
6. Frontend displays a preview table.
7. User reviews, edits, removes, or selects transactions.
8. User confirms.
9. Frontend sends confirmed transactions to the backend.
10. Backend saves confirmed transactions as expenses.

## 13. PDF Parser Rules

The parser must:

- Extract posting date.
- Extract transaction date.
- Extract merchant or description.
- Extract amount in RM.
- Treat all valid parsed rows as expenses.
- Ignore Account Summary rows.
- Ignore Previous Balance.
- Ignore Payments or Credits summary values.
- Ignore New Purchases or Charges summary values.
- Ignore Minimum Payment Due.
- Ignore Total Outstanding Balance.
- Ignore subtotal rows.
- Ignore rows marked with `CR` because they are credits or payments, not expenses.
- Ignore Sub-Total Charges.
- Ignore Sub-Total Payments & Credits.
- Handle zero amount rows carefully.
- Handle overseas transactions using the RM amount as the primary stored amount.

Overseas transaction details may include the original foreign amount and exchange rate, but the main expense amount should be the converted RM amount because the system base currency is MYR.

The current parser uses text extraction through `pdfplumber`. Scanned PDFs, image-only PDFs, and photos of statements are not supported because OCR is not enabled.

## 14. PDF Preview Table Behavior

After parsing the PDF, the frontend should display a preview table with:

- Checkbox or selection state.
- Posting date.
- Transaction date.
- Description.
- Amount.
- Currency.
- Category.
- Claim status.
- Notes.

The user should be able to:

- Edit the description.
- Edit the category.
- Edit the claim status.
- Remove unwanted rows.
- Confirm selected rows.
- Cancel the import.

## 15. Claim Status Behavior

Every expense has a claimed or not-claimed status.

The user can freely toggle the status.

If an expense is marked claimed, the user may optionally provide a claimed date.

If an expense is not claimed, it should be counted as outstanding.

The dashboard should show total claimed and total not-claimed amounts.

## 16. Filtering Behavior

The expense list should support filters:

- Project.
- Date range.
- Category.
- Claim status.

The frontend should pass filter values to the backend when possible.

## 17. CORS Requirements

The backend must allow requests from the frontend development server.

The local frontend may run on `http://localhost:5173`.

The local backend may run on `http://127.0.0.1:8000`.

The backend must also allow the deployed frontend URL if the project is deployed.

## 18. Frontend API Service Layer

All frontend API calls should be centralized in one service layer.

The frontend should not scatter fetch calls randomly across many components.

The API service layer should use the `VITE_API_BASE_URL` environment variable.

The frontend pages and components should call this service layer.

## 19. Mock Data Rule

Lovable may generate mock data during initial UI generation.

After export, mock data should be replaced with real API calls.

Mock data can remain only as fallback demo data if clearly documented, but it must not be the main source of truth.

## 20. Page Requirements

Project List Page:

- Shows all projects.
- Allows user to create a new project.
- Allows user to open project details.

Project Detail Page:

- Shows project information.
- Shows dashboard cards.
- Shows project-specific expenses.
- Shows project-specific income.
- Provides navigation to add expenses, add income, and upload PDF.

Dashboard Page or Section:

- Shows total income.
- Shows total expenses.
- Shows net position.
- Shows total claimed.
- Shows total not-claimed.
- Shows breakdown by category.
- Shows breakdown by claim status.

Expense List Page:

- Shows expenses in a table.
- Supports filters.
- Allows edit, delete, and claim toggle.

Manual Expense Form:

- Allows user to manually create or edit an expense.

Income List Page:

- Shows income records.
- Allows create, edit, and delete.
- Income is scoped to a project.

PDF Upload Page:

- Allows project selection.
- Allows PDF upload.
- Shows parsed transaction preview.
- Allows edit and selection.
- Allows confirm save.

## 21. Error Handling Behavior

The frontend should show clear error messages when:

- Backend is unavailable.
- PDF parsing fails.
- Validation fails.
- Project is missing.
- Expense save fails.
- Income save fails.
- Dashboard data cannot load.

The backend should return sensible HTTP errors and should not expose raw internal server errors for normal validation issues.

## 22. Testing Checklist

- Create a project.
- View project in project list.
- Open project detail.
- Add manual income.
- Add manual expense.
- Toggle expense claimed.
- Confirm dashboard totals update.
- Upload sample credit card statement PDF.
- Preview parsed expenses.
- Confirm selected parsed expenses.
- Confirm expenses are saved to selected project.
- Confirm CR rows are not imported.
- Confirm subtotal rows are not imported.
- Confirm dashboard updates after import.
- Edit income.
- Delete income.
- Edit expense.
- Delete expense.
- Test expense filters.

## 23. Instructions for Codex

Codex should review the backend routes and OpenAPI schema first.

Codex should update the frontend so all persistent data comes from the backend API.

Codex should keep all API requests centralized in a frontend API service file.

Codex should use `VITE_API_BASE_URL` for the backend base URL.

Codex should ensure the dashboard uses the backend dashboard endpoint instead of calculating totals on the frontend.

Codex should ensure the PDF upload flow follows parse, preview, confirm, and save.

Codex should remove or replace mock data after API integration.

Codex should not change the backend API contract unless necessary.

## 24. Suggested Lovable Prompt

Build a frontend for a Project Expense & Claim Tracker.

The backend already exists as a FastAPI REST API.

Do not create backend logic.

Do not rely on localStorage as the final data source.

Use REST API calls through a centralized API service layer.

Use `VITE_API_BASE_URL` as the backend base URL.

The app needs these pages:

1. Project list page.
2. Project detail page with dashboard cards.
3. Expense list page with filters.
4. Manual expense form.
5. Income list and form.
6. PDF upload page with parsed transaction preview and confirm step.

The PDF upload flow must be:

Select project, upload PDF, backend parses PDF, frontend previews transactions, user edits or selects rows, user confirms, backend saves expenses.

The dashboard must use backend aggregation and should not calculate totals by fetching all rows.

The goal is to make the Lovable-generated frontend align with the backend API contract from the beginning, so final integration is smooth and predictable.
