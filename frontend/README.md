# ExpenseTracker Frontend

Lovable-exported Vite React app connected to the FastAPI backend through `src/lib/api.ts`.

## Local Setup

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Default API settings:

```text
VITE_API_BASE_URL=http://127.0.0.1:8001
VITE_USE_MOCK_API=false
```

Use `VITE_USE_MOCK_API=true` only for demo mode. The backend API is the source of truth for persistent data.

## Checks

```powershell
npm run build
npm run test
```

Current status:

- `npm run build` passes.
- `npm run test` passes with 1 test.
- `npm run lint` still reports Lovable/shadcn template lint issues documented in the root README.
