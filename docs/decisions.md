# Decision Log

This file records project decisions that future agents and contributors should treat as settled unless a later decision explicitly changes them.

Status values:

- **Locked**: use this unless the user reopens the decision.
- **Deferred**: intentionally not part of v0.
- **Open**: not decided yet.

## Locked Decisions

### Product Mode: Guest And Logged-In Users

**Status:** Locked

v0 supports both guest users and GitHub-authenticated users.

Earlier architecture notes described a no-login ephemeral-only product. That has been superseded. Guest mode still exists, but logged-in users are now part of v0.

### Auth Provider

**Status:** Locked

Logged-in users authenticate with GitHub OAuth.

GitHub OAuth is used for account identity only in v0. It is not used for private repo read access.

### Private Repo Tokens

**Status:** Locked

Private repo access uses a pasted GitHub token per clone.

The token is used only during clone/indexing, is never persisted, and must not be logged.

Token-in-URL clone forms are rejected because they can leak through process lists, shell history, git config, logs, and error output. Use temporary `GIT_ASKPASS` or a temporary credential helper instead.

### Session Identity

**Status:** Locked

Guest users use a signed HTTP-only session cookie.

Logged-in users use server-side session storage with a signed cookie id.

### Retention

**Status:** Locked

Guest sessions expire when the browser session ends or after 24 hours, whichever comes first.

Logged-in repo indexes and chats persist until the user deletes them.

TTL/session cleanup deletes repo data, vectors, symbols, references, skipped files, and chats.

### Repository Limits

**Status:** Locked

Guest users can index repositories up to 500 files.

Logged-in users can index repositories up to 10,000 files.

The limit counts all tracked files from `git ls-files`, including files that are later skipped from indexing.

### Repository Processing Flow

**Status:** Locked

Guest and logged-in users use the same indexing pipeline:

1. Clone repository into a temp folder.
2. Count files.
3. Parse and chunk files.
4. Embed chunks.
5. Build symbol/reference data.
6. Store index data in Postgres/pgvector.
7. Delete temp clone after success or failure.

The stored repo points to DB/index data, not a clone path.

### Clone Strategy

**Status:** Locked

Use shallow clone: `git clone --depth=1`.

Do not use full history in v0.

### Indexing Skips

**Status:** Locked

Skip `.git`, binaries, common vendor/dependency/build directories, and files over 5 MB.

Store skipped file records in the database and show users which files were skipped.

### Retrieval Approach

**Status:** Locked

Use retrieval-augmented generation.

Do not stuff the full repository into the LLM context.

Do not rely on agentic file exploration as the primary answer path.

### Embedding Model

**Status:** Locked

Use local `qwen3-embedding:0.6b` through Ollama.

Reject `nomic-embed-text` for v0. Earlier notes mentioned it in the decision log, but the chosen model is `qwen3-embedding:0.6b`.

Store embedding model and dimension with indexed repos. If the query embedding model differs from the indexed model, block the query and require re-indexing.

### Generation Model

**Status:** Locked

Use hosted LLM generation through a provider adapter.

Local generation is rejected for v0 because expected hardware/concurrency constraints make it a poor fit.

### Model Logic Ownership

**Status:** Locked

Python owns embeddings, retrieval, and hosted LLM generation.

Node owns HTTP APIs, session/auth orchestration, chat message creation, job enqueueing, and SSE relay.

### Service Boundary

**Status:** Locked

Node and Python communicate through Redis queues and Redis pub/sub.

They must not import each other's code or share in-process state.

### Queue And Streaming

**Status:** Locked

Use Redis for job queueing and pub/sub.

Use Celery on the Python side.

Use a plain Redis client from Node to enqueue Celery-compatible payloads.

Frontend streaming uses SSE to Node. Node relays worker stream events from Redis pub/sub.

### Database

**Status:** Locked

Use one Postgres database with pgvector for app data, repo metadata, chunks, vectors, symbols, references, skipped files, chats, and job state.

Do not introduce a separate vector database in v0.

### Migrations And DB Clients

**Status:** Locked

Use raw SQL migration files.

Use Kysely for Node runtime database access.

Use SQLAlchemy Core for Python runtime database access.

### Chunk Storage

**Status:** Locked

Store chunk text, file path, line ranges, and embeddings.

Do not keep temp clones as the source of truth for citations or source viewing.

### Chat History Context

**Status:** Locked

Store all chat messages in Postgres.

At answer time, include last-N recent messages in the prompt.

Do not embed chat history in v0.

### Symbol And Reference Resolution

**Status:** Locked

v0 attempts full-scope reference resolution for TypeScript/JavaScript, Python, Go, and Rust.

Use LSP servers where available. If LSP resolution fails or times out, fall back to degraded symbol accuracy and show that to the user.

Store resolver source, such as `lsp`, `tree_sitter_name`, or `fallback_text`.

Markdown, JSON, and YAML support semantic indexing and lightweight heading/key symbols, not full "where used" references.

### LSP Runtime

**Status:** Locked

Run language servers inside Python worker container/process supervision.

Use strict per-language timeouts. Default timeout is 60 seconds.

Do not install repository dependencies during indexing in v0.

### Frontend Stack

**Status:** Locked

Use Vite, React, React Router, TanStack Query, and shadcn/ui.

Do not use Next.js unless a concrete future requirement needs it.

### Backend Stack

**Status:** Locked

Use Node.js, TypeScript, Express, and Zod.

Fastify is not needed for v0 because the bottlenecks are indexing, embeddings, LLM generation, and database work, not HTTP routing.

### Python Tooling

**Status:** Locked

Use `uv` for Python dependency/tooling management.

### HTTP Route Shape

**Status:** Locked

Core v0 routes:

- `POST /repos`
- `GET /repos/:repoId/status`
- `GET /repos/:repoId/status/stream`
- `POST /repos/:repoId/messages`
- `GET /messages/:messageId/stream`

### Source Viewer And Citations

**Status:** Locked

Use citation format `path:start-end`.

v0 includes a source viewer that renders stored chunk text for cited chunks.

### Testing

**Status:** Locked

Use full test-driven development.

Each ticket should define public test seams before implementation.

Use Vitest for Node/frontend tests and pytest for Python worker tests.

Use schema/fixture contract tests for Redis job payloads and stream events.

Do not include Playwright end-to-end tests in v0.

### CI And Formatting

**Status:** Locked

Use GitHub Actions for linting, typechecking, and tests.

Use ESLint and Prettier for TypeScript.

Use Ruff for Python.

### Observability

**Status:** Locked

v0 includes structured logs, job durations, failure reasons, and queue depth.

Do not introduce a full tracing/metrics stack in v0.

### Secrets

**Status:** Locked

Use environment variables for secrets.

Document required variables in `.env.example`.

Do not store provider API keys or GitHub tokens in the database in v0.

## Deferred Decisions

### Chat-RAG

**Status:** Deferred

Embedding chat history and retrieving relevant old turns is deferred. Use last-N chat context in v0.

### Summarized Chat Memory

**Status:** Deferred

Do not summarize chat history in v0. Small-model summarization can degrade context.

### Local LLM Generation

**Status:** Deferred

Hosted LLM generation is v0. Local generation may be revisited if hardware and concurrency constraints change.

### Dependency Installation For LSP Accuracy

**Status:** Deferred

Workers do not install repository dependencies during indexing in v0. This may be revisited for logged-in users with explicit approval.

### Separate Vector Database

**Status:** Deferred

pgvector is enough for v0. Dedicated vector databases are deferred until scale requires them.

### Go Worker Rewrite

**Status:** Deferred

Python workers are v0. Go may be considered only if profiling proves Python parsing/workers are the bottleneck.

### Playwright End-To-End Tests

**Status:** Deferred

Playwright E2E tests are outside v0.

## Open Decisions

No open decisions recorded yet.
