# Product Specification: Project Expense and Claim Tracker

## 1. Product Name

Project Expense and Claim Tracker

## 2. Purpose

Build a small but realistic web application that helps a team manage project costs, project income, and project expense claims.

The product replaces a manual spreadsheet-based workflow where users currently copy expense rows from Malaysian bank credit card PDF statements into spreadsheets. The system should allow users to manage projects, import credit card statement expenses, manually enter income, track whether expenses have been claimed, and view financial summaries per project.

The product should prioritize correctness, clear structure, maintainability, and thoughtful trade-offs over visual polish.

## 3. Required Technology Direction

### Frontend

The initial frontend must be created in Lovable or a preferred AI frontend software if necessary. The expected workflow is:

1. Design and build the user interface in Lovable.
2. Export or sync the generated frontend code.
3. Place the exported frontend code inside the project repository.
4. Modify and integrate the exported frontend code with the Python backend API.

The final submission must show both the Lovable-built user interface and the integrated codebase.

### Backend

The backend must be a Python REST API.

FastAPI is preferred

The backend must provide persistent storage using either SQLite or PostgreSQL.

### Base Currency

The base currency of the system is Malaysian Ringgit, shown as RM or MYR.

## 4. Main Business Context

The user’s team runs multiple projects.

Each project can have:

- Expenses, such as travel, equipment, meals, software, utilities, subscriptions, fees, or other project-related spending.
- Income, such as client payments, project funding, or other money received for the project.

Some expenses are later claimed back or reimbursed. Some expenses remain unclaimed.

The business needs to know, at any time:

- How much income a project has received.
- How much has been spent on a project.
- The net position of a project.
- How much expense value has already been claimed.
- How much expense value is still outstanding and not claimed.

## 5. Important Product Rule: Expenses Versus Income

Expenses and income must be handled separately.

### Expenses

Expenses can enter the system in two ways:

1. Manually entered by the user.
2. Imported from a Malaysian bank credit card statement PDF.

Every expense must belong to one project.

Every imported PDF transaction that is accepted by the user must be saved as an expense.

### Income

Income must only be entered manually by the user.

Income must never be derived from the credit card PDF.

Credit card PDF statements are only a source of expenses, not income.

Payments or credits inside the credit card statement must not be treated as income.

## 6. Core Entities

The system must support three primary business entities:

1. Project
2. Expense
3. Income

An optional fourth internal entity, PDF Upload or Import Batch, may be used for traceability and duplicate detection.

## 7. Project Entity Requirements

A project represents a business project that can contain expenses and income.

Each project must support the following data:

- Project name.
- Project description.
- Start date.
- End date.
- Total budget in RM.
- Project status.

The allowed project statuses are:

- Active.
- On hold.
- Closed.

The system must allow users to:

- Create a project.
- View a list of projects.
- View details of one project.
- Edit a project.
- Delete a project if appropriate.
- See project-level financial totals.

A project detail view should make it easy to see related expenses, related income, and dashboard summary information.

## 8. Expense Entity Requirements

An expense represents money spent for a specific project.

Each expense must support the following data:

- Related project.
- Expense date.
- Vendor or transaction description.
- Amount.
- Currency.
- Category.
- Claimed status.
- Claimed date.
- Notes.
- Source reference.

The claimed status must be a simple true or false value.

If an expense is claimed, the user may optionally record the claimed date.

The system does not need to model who the expense was claimed from.

The system does not need to model approval workflows.

The system does not need to model multi-stage reimbursement processes.

The system must allow users to:

- Create an expense manually.
- View expenses.
- Filter expenses.
- Edit an expense.
- Delete an expense.
- Toggle an expense between claimed and not claimed.
- Bulk toggle multiple expenses between claimed and not claimed if supported.
- Import expenses from a PDF after user confirmation.

### Expense Source

Each expense should indicate how it entered the system.

Suggested source types:

- Manual entry.
- PDF import.

For PDF-imported expenses, the system should store enough source information to identify which statement or upload created the expense.

## 9. Income Entity Requirements

Income represents money received for a specific project.

Each income record must support the following data:

- Related project.
- Income date.
- Source.
- Amount.
- Currency.
- Notes.

The system must allow users to:

- Create income manually.
- View income records.
- Edit income records.
- Delete income records.

Income must always be scoped to a project.

There must be no PDF-based income import.

## 10. Dashboard Requirements

The dashboard must show financial totals per project.

For each project, the dashboard must show:

- Total income.
- Total expenses.
- Net position.
- Total claimed expenses.
- Total not-claimed expenses.

The net position must represent total income minus total expenses.

Total claimed expenses must represent the sum of expenses where the claimed status is true.

Total not-claimed expenses must represent the sum of expenses where the claimed status is false.

The dashboard should also support breakdowns by:

- Category.
- Claim status.

The backend must calculate the dashboard totals.

The frontend must not calculate dashboard totals by fetching every expense and income row.

The frontend should request aggregated dashboard data from the backend in a single request per project.

## 11. Frontend Page Requirements

The frontend should contain the following major screens.

### Dashboard Page

The dashboard page should allow the user to see project financial summaries.

It should show, per project:

- Total income.
- Total expenses.
- Net position.
- Total claimed expenses.
- Total not-claimed expenses.

It may also show category breakdowns and claim status breakdowns.

### Project List Page

The project list page should show all projects.

Each project item should display useful summary information such as:

- Project name.
- Status.
- Budget.
- Date range.
- High-level financial summary if available.

The user should be able to open a project detail page from this list.

### Project Detail Page

The project detail page should show:

- Project information.
- Project dashboard summary.
- Related expenses.
- Related income.
- Actions to edit the project.
- Actions to add expenses.
- Actions to add income.
- Actions to upload a PDF statement for the project.

### Expense List Page

The expense list page should show expenses in a table or structured list.

The user must be able to filter expenses by:

- Project.
- Date range.
- Category.
- Claim status.

The user should be able to toggle claimed and not-claimed status directly from the list or detail view.

The user should be able to create, edit, and delete expenses.

### Income List Page

The income list page should show income records scoped to a project.

The user must be able to:

- Create income.
- Edit income.
- Delete income.

Income creation should require selecting or being inside a specific project.

### PDF Upload Page

The PDF upload page is one of the most important pages.

The user must be able to:

1. Select a project.
2. Upload a Malaysian bank credit card statement PDF.
3. Send the PDF to the backend for parsing.
4. View extracted candidate transactions before saving them.
5. Edit extracted transaction details if necessary.
6. Select or deselect transactions if necessary.
7. Confirm the transactions.
8. Save confirmed transactions as expenses under the selected project.

The PDF upload flow must not directly save transactions without user review.

The preview and confirmation step is required.

## 12. PDF Ingestion Requirements

PDF ingestion is a key feature and should be treated as a priority.

The backend must accept a credit card statement PDF.

The backend must parse the PDF and return a structured list of candidate expense transactions.

The parsed transaction data should include:

- Posting date.
- Transaction date.
- Merchant or description.
- Amount in RM.

The PDF parser must handle the provided sample Malaysian bank credit card statement correctly.

### Text-Based PDF Requirement

The first parser implementation should use `pdfplumber` to extract text from structured PDFs.

OCR is not part of the initial parser scope.

Users must be told clearly that scanned PDFs, image-only PDFs, and photos of statements will not parse correctly because they do not contain extractable text.

If a scanned or image-only PDF is uploaded, the backend should return a clear error explaining that OCR is not enabled and that the user should upload the original text-based bank statement PDF.

## 13. PDF Parser Rules

The parser must identify valid transaction rows from the transaction details section.

The parser must ignore non-transaction areas.

### Must Extract

The parser must extract each valid transaction row containing:

- Posting date.
- Transaction date.
- Description.
- Amount in RM.

### Must Ignore Account Summary

The parser must ignore the Account Summary section at the top of the statement.

The following types of rows are statement-level totals and must not be imported as expenses:

- Previous statement balance.
- Payments or credits.
- New purchases or charges.
- Cash advance.
- Fees and charges.
- Finance charges summary.
- Total outstanding balance.
- Minimum payment due.

### Must Ignore Payments and Credits

The parser must ignore rows where the amount ends with the local credit suffix.

The credit suffix indicates a payment or credit.

These rows are not expenses and must not be imported.

A payment or credit row must not be saved as income.

### Must Ignore Subtotal Rows

The parser must ignore subtotal rows at the bottom of the transaction list.

Rows such as subtotal charges and subtotal payments or credits must not be saved as expenses.

### Must Handle Overseas Transaction Details

The sample statement includes an overseas transaction.

The main transaction list already contains the converted RM amount.

The Overseas Transaction Details section provides the foreign amount and exchange rate.

The implementation must decide and document how overseas transaction information is stored.

The recommended approach for this assessment is to store the RM amount as the primary expense amount because MYR is the base currency.

Optional additional metadata may store:

- Original foreign currency amount.
- Foreign currency code.
- Exchange rate.
- Original overseas description.

If the optional metadata is not implemented, the README should explain that the RM amount is stored because the system’s base currency is MYR.

### Must Handle Zero-Amount Rows

The sample statement includes zero-amount waived fee rows.

The implementation must decide whether zero-amount rows are ignored or stored.

The recommended approach is to ignore zero-amount rows because they do not affect expenses, claimed totals, or dashboard calculations.

This decision should be documented.

### Must Handle Finance and Late Payment Charges

Finance charges and late payment charges inside the transaction details section are transaction rows.

They may be treated as expenses unless explicitly filtered out by the user during the preview step.

The user should be able to review and remove unwanted rows before confirmation.

### Must Support Review Before Save

Parsing and saving are separate steps.

The PDF ingestion endpoint must return candidate transactions.

The confirmation step must save selected or confirmed candidate transactions as expenses.

## 14. Duplicate Detection Requirements

The system should include duplicate detection when re-uploading a statement that overlaps a previous upload.

The duplicate detection does not need to be perfect, but it should be reasonable.

A practical duplicate check can compare a combination of:

- Project.
- Transaction date.
- Posting date.
- Description.
- Amount.
- Source statement.

If a likely duplicate is detected, the system should avoid saving it automatically or should warn the user during preview.

The duplicate detection behavior should be documented.

## 15. Backend API Requirements

The backend must expose REST API capabilities for the frontend.

The API must support operations for:

- Projects.
- Expenses.
- Income.
- Dashboard aggregation.
- PDF ingestion.
- Expense claim toggling.

### Project API Behavior

The backend must allow the frontend to:

- Create projects.
- Read projects.
- Read one project.
- Update projects.
- Delete projects.

### Expense API Behavior

The backend must allow the frontend to:

- Create manual expenses.
- Read expenses.
- Filter expenses.
- Read one expense.
- Update expenses.
- Delete expenses.
- Toggle one expense between claimed and not claimed.
- Toggle multiple expenses between claimed and not claimed if bulk support is implemented.
- Save confirmed PDF transactions as expenses.

### Income API Behavior

The backend must allow the frontend to:

- Create income records.
- Read income records.
- Read income records scoped to a project.
- Update income records.
- Delete income records.

### Dashboard API Behavior

The backend must provide aggregated financial summaries for a project.

The backend should return all required dashboard totals in one response per project.

The dashboard response should include:

- Total income.
- Total expenses.
- Net position.
- Total claimed.
- Total not claimed.
- Category breakdown.
- Claim status breakdown.

### PDF API Behavior

The backend must allow the frontend to upload a PDF statement.

The backend must parse the PDF.

The backend must return candidate transactions.

The backend must not save parsed candidates until the user confirms them.

The backend must support saving confirmed transactions as project expenses.

## 16. Validation Requirements

The backend must validate input data and return sensible error responses.

The system should avoid returning bare internal server errors for normal user mistakes.

Examples of validation expectations:

- Project name should be required.
- Expense amount should be valid.
- Income amount should be valid.
- Expense must belong to an existing project.
- Income must belong to an existing project.
- Uploaded file must be a PDF.
- PDF parsing should return a meaningful message if no transactions are found.
- Claimed date should be optional.
- Claimed date should only be relevant when an expense is claimed.

## 17. Error Handling Requirements

The system should return clear errors for common failure cases.

Examples include:

- Project not found.
- Expense not found.
- Income not found.
- Invalid PDF file.
- No valid transactions found in PDF.
- Duplicate transaction detected.
- Invalid date.
- Invalid amount.
- Missing required field.

Errors should be consistent in shape and wording.

The frontend should display user-friendly error messages where possible.

## 18. Automated Testing Requirements

The backend must include basic automated tests.

At minimum, tests must cover:

- PDF parser behavior.
- Dashboard aggregation logic.

### PDF Parser Tests

PDF parser tests should verify that:

- Valid transaction rows are extracted.
- Payment or credit rows are ignored.
- Account summary rows are ignored.
- Subtotal rows are ignored.
- Overseas transactions are handled using the RM amount.
- Zero-amount rows follow the documented decision.
- The parser returns structured transaction candidates.

### Dashboard Aggregation Tests

Dashboard aggregation tests should verify that:

- Total income is calculated correctly.
- Total expenses are calculated correctly.
- Net position is calculated correctly.
- Claimed expenses are summed correctly.
- Not-claimed expenses are summed correctly.
- Category breakdown is calculated correctly if implemented.
- Claim status breakdown is calculated correctly.

### Testing Before Moving Forward

Every meaningful implementation slice must be tested before moving to the next feature.

This means each new backend feature, database schema change, API endpoint, parser change, dashboard calculation, or frontend integration should include relevant automated tests when practical.

If automated tests are not practical for a small slice, the implementation must include a documented manual verification step.

Bug fixes should include regression tests when practical so the same issue is less likely to return.

Documentation-only changes may be verified by reviewing the changed file instead of adding automated tests.

Each completed slice summary should state what was tested and whether the tests passed before the next slice begins.

## 19. Repository and Submission Requirements

The submission should be a single GitHub repository or a hosted GCP deployment with source code.

### Repository Structure

The repository should contain:

- A backend folder for the Python API.
- A frontend folder for the Lovable-exported frontend code.
- A top-level README.

### Backend Folder Requirements

The backend folder should include:

- Python API source.
- Dependency file.
- Database schema or migration setup.
- Tests.
- Backend setup instructions.

### Frontend Folder Requirements

The frontend folder should include:

- Lovable-exported code.
- Any modifications made for backend integration.
- Frontend setup instructions if needed.

### Top-Level README Requirements

The top-level README must explain:

- The tier or scope targeted.
- Architecture overview.
- How to run the backend locally.
- How to run the frontend locally.
- Required environment variables.
- Database choice.
- PDF parsing approach.
- How expenses and income are handled.
- Trade-offs made.
- What would be improved with one more week.
- How AI assistance was used, if applicable.
- Any limitations or incomplete features.

The local setup should be simple enough for a reviewer to clone the repository and run the app quickly.

### README Maintenance Rule

For every meaningful new implementation, the README must be updated in the same work slice.

This includes changes to:

- Setup or installation commands.
- Dependencies.
- Environment variables.
- Database schema or migration steps.
- API endpoints.
- Backend or frontend run commands.
- Implemented features.
- Known limitations or trade-offs.
- Testing commands or test coverage.
- Manual verification steps.
- Test results from the completed implementation slice.
- Deployment notes.

Small internal refactors that do not change setup, behavior, APIs, or reviewer-facing information do not require README changes.

## 20. Optional GCP Deployment Requirements

If deploying to Google Cloud Platform, the submission should include:

- Working frontend URL.
- Working backend API URL.
- Source code in a repository or attached archive.
- README notes explaining the GCP services used.
- README notes explaining how to redeploy.

Cloud Run is a straightforward option for the Python backend.

Frontend hosting options may include Firebase Hosting, Cloud Run, App Engine, or Google Cloud Storage with Cloud CDN.

GCP deployment is preferred but not strictly required if the GitHub repository has clear local setup instructions.

### Planned GCP Hosting Direction

If this project is hosted on GCP, the preferred setup is:

- Backend: FastAPI deployed to Cloud Run.
- Database: PostgreSQL hosted on Cloud SQL.
- Frontend: Lovable-exported frontend hosted with Firebase Hosting, Cloud Run, App Engine, or Cloud Storage plus Cloud CDN.
- Configuration: Use the existing `DATABASE_URL` environment variable so local development can keep using SQLite while the deployed backend uses PostgreSQL.
- Secrets: Store database credentials in Cloud Run environment variables or Secret Manager.

This means SQLite is used for local development only. The GCP deployment should use PostgreSQL instead of trying to deploy the local `project.db` SQLite file.

### Local-First Then GCP Migration Strategy

The implementation plan is to get the full project working locally first before migrating it to GCP.

Local development should remain simple for fast iteration and reviewer setup, but the codebase should be structured so migration to GCP is straightforward later.

Local-first means:

- Backend runs locally with FastAPI.
- Database runs locally with SQLite during early development.
- Frontend runs locally from the Lovable-exported code.
- README instructions prioritize simple local setup first.
- Features should be proven locally before deployment work begins.

Migration-ready means:

- Database access must go through SQLAlchemy instead of SQLite-specific raw queries.
- Database configuration must use `DATABASE_URL`.
- Local-only paths such as `backend/project.db` must not be hardcoded into feature code.
- Environment-specific values must be configurable through environment variables.
- Dependencies should be listed clearly so Cloud Run can install them later.
- README updates should document both local setup and future GCP changes when relevant.
- Database schema changes should be easy to convert into Alembic migrations before deployment.

The goal is not to deploy to GCP immediately. The goal is to avoid local implementation decisions that would make the later Cloud Run and Cloud SQL migration painful.

The current backend is already partly prepared for this because it uses SQLAlchemy and has a `DATABASE_URL` override. The main backend changes needed for GCP would be:

- Add a PostgreSQL driver dependency, such as `psycopg`.
- Set the deployed `DATABASE_URL` to the Cloud SQL PostgreSQL database.
- Create the Cloud SQL PostgreSQL instance and database.
- Connect the Cloud Run service to Cloud SQL.
- Run table creation or migrations against PostgreSQL.
- Verify deployed `/health`, `/health/db`, and `/docs` endpoints.

Estimated effort:

- Basic working Cloud Run plus Cloud SQL deployment: 2 to 4 hours.
- Assessment-ready deployment with clean docs and verification: 4 to 8 hours.
- More complete setup with migrations, secrets, testing, and frontend hosting: 1 to 2 days.

Before a serious GCP deployment, the project should ideally add Alembic migrations so database schema changes are versioned instead of relying only on SQLAlchemy `create_all`.

## 21. Minimum Viable Scope

The minimum acceptable implementation should include:

- Project creation and viewing.
- Expense creation and viewing.
- Income creation and viewing.
- Expense claimed or not-claimed toggling.
- Project dashboard totals.
- PDF upload and parsing.
- Preview of parsed transactions.
- Manual confirmation before saving parsed transactions.
- Basic backend tests for PDF parsing and dashboard aggregation.
- Clear README.

## 22. Stronger Scope If Time Allows

If time allows, add:

- Full project edit and delete.
- Full expense edit and delete.
- Full income edit and delete.
- Expense filters.
- Category breakdown.
- Claim status breakdown.
- Bulk claim toggling.
- Duplicate detection.
- Better PDF import batch tracking.
- Better error display in the frontend.
- Hosted GCP deployment.
- More complete test coverage.

## 23. Out of Scope

The product does not need to support:

- User authentication.
- Multiple user roles.
- Approval workflows.
- Reimbursement workflow stages.
- Modeling who an expense was claimed from.
- Extracting income from the PDF.
- Complex accounting rules.
- Multi-currency accounting beyond storing the RM value and optional overseas metadata.
- Real bank integrations.
- Real payment processing.
- OCR for scanned documents unless implemented as an optional extension.
- Perfect enterprise-level security.
- A fully polished production user interface.

## 24. Recommended Product Flow

### New Project Flow

The user creates a project with project name, description, dates, budget, and status.

The user can then add income, add manual expenses, or upload a PDF statement for that project.

### Manual Expense Flow

The user selects a project.

The user adds an expense with date, description, amount, category, claimed status, optional claimed date, notes, and currency.

The expense is saved under the selected project.

The dashboard updates based on backend aggregation.

### Manual Income Flow

The user selects a project.

The user adds an income record with date, source, amount, currency, and notes.

The income is saved under the selected project.

The dashboard updates based on backend aggregation.

### PDF Import Flow

The user selects a project.

The user uploads the credit card statement PDF.

The backend extracts candidate transaction rows.

The backend excludes credits, payments, account summary rows, subtotal rows, and other non-expense rows.

The frontend displays extracted candidates in a preview screen.

The user reviews, edits, selects, or deselects candidate rows.

The user confirms the import.

The confirmed rows are saved as expenses for the selected project.

The imported expenses default to not claimed unless the user changes them.

The dashboard updates based on backend aggregation.

### Claim Toggle Flow

The user views the expense list.

The user toggles an expense from not claimed to claimed, or from claimed to not claimed.

If claimed, the user may optionally provide a claimed date.

The backend updates the expense.

The dashboard recalculates totals.

## 25. Suggested Data Fields

### Project Fields

- Unique project identifier.
- Name.
- Description.
- Start date.
- End date.
- Total budget in RM.
- Status.
- Created timestamp.
- Updated timestamp.

### Expense Fields

- Unique expense identifier.
- Project identifier.
- Expense date.
- Posting date if imported from PDF.
- Vendor or description.
- Amount.
- Currency.
- Category.
- Claimed status.
- Claimed date.
- Notes.
- Source type.
- Source reference.
- Created timestamp.
- Updated timestamp.

### Income Fields

- Unique income identifier.
- Project identifier.
- Income date.
- Source.
- Amount.
- Currency.
- Notes.
- Created timestamp.
- Updated timestamp.

### PDF Upload or Import Batch Fields

This entity is optional but recommended for traceability.

- Unique upload identifier.
- Project identifier.
- File name.
- Upload timestamp.
- Statement period if detected.
- Statement date if detected.
- Number of candidate transactions extracted.
- Number of transactions confirmed.
- Number of transactions ignored.
- Import status.

## 26. Acceptance Criteria

The implementation is acceptable when:

- A reviewer can run the backend and frontend locally.
- The frontend can communicate with the backend.
- Projects can be created and viewed.
- Expenses can be created and viewed.
- Income can be created and viewed.
- Expenses can be toggled between claimed and not claimed.
- Dashboard totals are returned by the backend.
- A PDF statement can be uploaded.
- Valid expense transactions are extracted from the sample PDF.
- Credit or payment rows are excluded.
- Account summary rows are excluded.
- Subtotal rows are excluded.
- The user can preview extracted transactions before saving.
- Confirmed PDF transactions are saved as expenses under a selected project.
- Income is never imported from the PDF.
- Basic tests exist for the parser and dashboard aggregation.
- The latest implemented slice has been tested before moving to the next slice.
- Documentation-only changes have been reviewed for correctness.
- The README explains setup, architecture, trade-offs, and next steps.

## 27. Design Priorities

The implementation should prioritize:

- Correct business logic.
- Clear separation between frontend, backend, database, and parser.
- Reliable PDF parsing for the provided sample statement.
- Simple and understandable API design.
- Backend-based dashboard aggregation.
- Clear README documentation.
- Reasonable handling of incomplete or imperfect features.

The implementation should not over-prioritize visual polish at the expense of core functionality.

## 28. Key Product Decisions to Document

The README should document the following decisions:

- Why the chosen backend framework was used.
- Why the chosen database was used.
- How PDF parsing works.
- Why income is manual only.
- How credit rows are handled.
- How overseas transactions are handled.
- How zero-amount rows are handled.
- How duplicate detection works, if implemented.
- What was completed within the time limit.
- What would be improved with one more week.
- Any newly implemented feature that changes setup, behavior, API usage, database schema, tests, or deployment steps.

## 29. Expected Reviewer Focus

The reviewer is likely to evaluate:

- Whether the PDF parsing works on the sample statement.
- Whether the app correctly separates expenses from income.
- Whether claimed and not-claimed tracking is implemented simply and correctly.
- Whether dashboard totals are calculated by the backend.
- Whether the codebase is organized.
- Whether the README clearly explains trade-offs.
- Whether the frontend was created through Lovable and then integrated.
- Whether the system can be run and reviewed easily.

## 30. Final Summary

Build a full-stack project expense and claim tracker.

The system must allow users to manage projects, manually enter income, manually enter expenses, import credit card PDF expenses, review parsed PDF transactions before saving, track claimed versus not-claimed expenses, and view per-project financial dashboard summaries.

The most important feature is reliable PDF ingestion for the provided Malaysian credit card statement, especially correctly ignoring credits, statement summary rows, and subtotal rows.

The product should be simple, practical, and clearly documented.
