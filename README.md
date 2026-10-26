# LegalCase AI

Case management for Indian advocates (cases, hearings calendar, evidence vault) with a RAG-based legal assistant.

- **Frontend** – Next.js 14 (App Router) + Prisma + PostgreSQL, port 3000
- **Backend** – FastAPI + LangChain + ChromaDB (AI assistant only), port 8000
- Both share one secret (`NEXTAUTH_SECRET` = `JWT_SECRET`): the frontend issues the login JWT, the backend verifies it.

> The AI assistant is informational only and is **not legal advice**.

## Prerequisites (Windows 10/11, PowerShell)

| Tool | Version | Check |
|------|---------|-------|
| Python | **3.11** | `py -3.11 --version` |
| Node.js | 18.18+ (20 LTS recommended) | `node -v` |
| PostgreSQL | 14+ running locally | `psql --version` |
| OpenAI API key | needed only for AI *answers* | – |

Keep the project **outside OneDrive** (e.g. `C:\dev\legalcase`). OneDrive breaks `.next` builds (see Troubleshooting).

## 1. Database

Create an empty database once:

```powershell
psql -U postgres -c "CREATE DATABASE legal_case_db;"
```

## 2. Environment files

```powershell
Copy-Item "frontend\.env.example" "frontend\.env"
Copy-Item "backend\.env.example"  "backend\.env"
```

Generate one random secret and put the **same value** in both files:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

| Variable | File | Meaning |
|----------|------|---------|
| `DATABASE_URL` | frontend | `postgresql://USER:URL_ENCODED_PASSWORD@localhost:5432/legal_case_db?schema=public` |
| `NEXTAUTH_SECRET` | frontend | Random 32+ byte value. Signs login tokens. Required – there is no fallback. |
| `NEXTAUTH_URL` | frontend | `http://localhost:3000` |
| `BACKEND_URL` | frontend | `http://localhost:8000` – server-side only, used by the `/api/backend/*` proxy |
| `JWT_SECRET` | backend | **Must equal `NEXTAUTH_SECRET`.** Required – the backend refuses to start without it. |
| `OPENAI_API_KEY` | backend | Needed for AI answers. If empty, `/api/chat` returns a clear 503. |
| `CHROMA_PERSIST_DIR` | backend | Vector store folder. Relative paths are resolved against `backend\`. Default `./chroma_db` |
| `FRONTEND_URL` | backend | CORS origin, `http://localhost:3000` |
| `BACKEND_PORT` | backend | `8000` |

Never commit `.env` files (they are git-ignored).

## 3. Backend setup

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
pip install --only-binary=:all: -r requirements.txt
```

`--only-binary=:all:` forbids source builds, so no C/C++ compiler (GCC) is needed.

### Ingest the legal dataset

```powershell
# Option A – SAMPLE data (about 20 Q&A pairs, for testing the pipeline only; NOT a legal source)
python -m app.ai.ingest --sample

# Option B – the real dataset
#   Put the Alpie-core Indian law JSON at backend\data\indian_law.json, then:
python -m app.ai.ingest              # everything
python -m app.ai.ingest --limit 500  # first 500 records only
```

Re-running ingestion replaces the collection (no duplicate vectors). The first run downloads the `all-MiniLM-L6-v2` embedding model (about 90 MB). `--sample` refuses to overwrite a real `data\indian_law.json`.

Check it: `Invoke-RestMethod http://localhost:8000/api/chat/health` → `status: ready`, `vectors: N`.

## 4. Frontend setup

```powershell
cd frontend
npm ci
npx prisma generate
npx prisma db push
```

## 5. Run (two terminals)

Terminal 1 – backend:

```powershell
cd backend; .\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

Terminal 2 – frontend:

```powershell
cd frontend; npm run dev
```

Open <http://localhost:3000>, create an account at `/signup`, sign in.

## Checks

```powershell
cd backend;  .\.venv\Scripts\python.exe -m pytest -q
cd frontend; npx tsc --noEmit; npm run lint; npm run build
# with both servers running:
node scripts\e2e-smoke.mjs
```

`scripts/e2e-smoke.mjs` registers two throw-away users, exercises cases / hearings / evidence / AI chat, checks cross-user isolation (user B cannot read, edit, delete or attach to user A's data), then deletes its test data.

## Where things live

- Evidence files: `frontend/uploads/<lawyerId>/…` on local disk (git-ignored, 25 MB max, allow-listed types). Back this folder up together with the database.
- Vector index: `backend/chroma_db/` (git-ignored). Dataset: `backend/data/` (git-ignored).
- AI requests go browser → `/api/backend/chat` (Next.js rewrite, with the Bearer token) → FastAPI `/api/chat`.

## Troubleshooting

**`pip install` fails building NumPy / "no C compiler / GCC"**
You are on a Python without prebuilt wheels (3.12+/3.13) or pip is compiling from source. Use Python **3.11**, recreate the venv (`py -3.11 -m venv .venv`) and install with `pip install --only-binary=:all: -r requirements.txt`. NumPy is pinned `<2` for chromadb.

**`EINVAL: invalid argument, readlink '...\.next\...'` or random `.next` errors**
The project is inside OneDrive (or another synced folder). Move it out of OneDrive, then:
```powershell
cd frontend; Remove-Item -Recurse -Force .next, node_modules; npm ci
```

**Prisma `P1000 Authentication failed` / `P1013 invalid port` / URL parse errors**
Special characters in the DB password must be URL-encoded in `DATABASE_URL`: `@`→`%40`, `#`→`%23`, `:`→`%3A`, `/`→`%2F`, `%`→`%25`, `?`→`%3F`. Example: password `p@ss#1` → `p%40ss%231`.

**Backend exits with "Invalid backend configuration: JWT_SECRET…"**
Set `JWT_SECRET` in `backend\.env` to the same value as `NEXTAUTH_SECRET`.

**Every AI request returns 401**
`JWT_SECRET` ≠ `NEXTAUTH_SECRET`, or you are not signed in (log in again).

**AI assistant says "dataset has not been indexed" (503)**
Run the ingest step (section 3). **"OPENAI_API_KEY is not configured"** → add it to `backend\.env` and restart uvicorn.

**AI assistant says it cannot reach the backend**
Start uvicorn on port 8000 and make sure `BACKEND_URL` in `frontend\.env` matches. Restart `npm run dev` after editing `.env`.
