# Ask Repo

Ask Repo is a web application for chatting with GitHub repositories using RAG, AST-based chunking, local embeddings, and LSP symbol reference resolution.

## Project Structure

This project consists of separate, decoupled runtime areas:

* `frontend/`: Vite + React + TypeScript + Yarn v4 (via Corepack).
* `backend/`: Node.js + Express + TypeScript + Kysely + Yarn v4 (via Corepack).
* `worker/`: Python Celery worker + SQLAlchemy Core + `uv`.
* `infrastructure/`: Docker Compose for Postgres (with pgvector), Redis, and Ollama.
* `migrations/`: Raw SQL migrations and Node.js migration runner (`runner.js`).
* `docs/`: Project documentation and architecture logs.

### Runtime Source Structure

Backend source is organized by owned responsibility rather than MVC:

* `backend/src/http/routes/`: Express route registration and HTTP response shape.
* `backend/src/db/`: Kysely database client and typed database schema.
* `backend/src/queues/`: Redis/Celery boundary helpers.

Frontend source keeps the app shell in `frontend/src/` for foundation.

Worker source is organized around pipeline ownership:

* `worker/src/ask_repo_worker/db/`: SQLAlchemy engine and table metadata.
* `worker/src/ask_repo_worker/queues/`: Celery task entrypoints and future queue/event adapters.
* `worker/src/ask_repo_worker/health/`: smoke and readiness-style worker checks.

---

## Quickstart & Local Setup

### 1. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 2. Infrastructure Startup

Boot local database, queue, and embedding infrastructure:

```bash
cd infrastructure
docker compose up -d
```

### 3. Database Migrations

Install backend dependencies and run raw SQL migrations:

```bash
cd backend
corepack enable
yarn install
yarn migrate
yarn migrate:verify
```

### 4. Backend Server

Run backend in development mode:

```bash
cd backend
yarn dev
```

Check health and readiness:
* `GET http://localhost:3000/health`
* `GET http://localhost:3000/ready`

### 5. Worker Service

Install worker dependencies and run tests/smoke task with `uv`:

```bash
cd worker
uv sync
uv run pytest
```

Run Celery worker process:

```bash
cd worker
uv run celery -A ask_repo_worker.celery_app worker --loglevel=info
```

### 6. Frontend Application

Run frontend dev server:

```bash
cd frontend
corepack enable
yarn install
yarn dev
```

---

## Smoke Verification

From a fresh checkout, after copying `.env.example` to `.env`, run these checks:

```bash
# 1. Start infrastructure
cd infrastructure
docker compose up -d

# 2. Apply and verify migrations
cd ../backend
corepack enable
yarn install
yarn migrate
yarn migrate:verify

# 3. Verify backend health/readiness tests
yarn test

# 4. Verify worker config and Celery smoke task
cd ../worker
uv sync
uv run pytest

# 5. Verify frontend shell rendering
cd ../frontend
corepack enable
yarn install
yarn test
```
