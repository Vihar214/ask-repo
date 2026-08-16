Status: ready-for-agent

# 00 Foundation Spec

## Problem Statement

Ask Repo needs a working project foundation before product features can be built. Future tickets depend on a consistent repository layout, separate frontend/backend/worker dependency boundaries, local infrastructure, raw SQL migration support, backend health/readiness endpoints, worker smoke checks, and a minimal frontend shell.

Without this foundation, later work such as auth, repository submission, indexing, retrieval, chat streaming, and citations would each need to invent local setup, configuration, database bootstrapping, and test conventions independently.

## Solution

Create the base project structure and local development foundation for Ask Repo.

The user should be able to boot local infrastructure, apply raw SQL migrations, start each app area independently, verify backend health/readiness, run a worker smoke check, render the frontend shell, and run smoke tests. This establishes stable public seams for future specs without implementing auth, repository submission, indexing, retrieval, or chat behavior.

## User Stories

1. As a developer, I want the project split into clear frontend, backend, worker, infrastructure, migration, and docs areas, so that I can find the right ownership boundary quickly.
2. As a developer, I want frontend dependencies isolated from backend dependencies, so that UI work does not affect backend runtime setup.
3. As a developer, I want backend dependencies isolated from frontend dependencies, so that backend work can evolve independently.
4. As a developer, I want Python worker dependencies managed separately with uv, so that worker tooling stays separate from Node tooling.
5. As a developer, I want no root package workspace, so that each runtime area owns its own install and scripts.
6. As a developer, I want Yarn v4 pinned for frontend and backend, so that Node installs are reproducible.
7. As a developer, I want uv configured for the worker, so that Python dependency and task management is reproducible.
8. As a developer, I want Docker Compose to start local infrastructure, so that Postgres, Redis, and Ollama are available consistently.
9. As a developer, I want Docker Compose limited to infrastructure in foundation, so that app process startup remains explicit and easy to debug.
10. As a developer, I want Postgres to include pgvector support, so that later embedding storage can rely on the database shape.
11. As a developer, I want Redis available locally, so that later queue and pub/sub work has its required infrastructure.
12. As a developer, I want Ollama available locally, so that later local embedding work has its required endpoint.
13. As a developer, I want a backend health endpoint, so that I can tell whether the backend process is alive.
14. As a developer, I want a backend readiness endpoint, so that I can tell whether backend dependencies are reachable.
15. As a developer, I want readiness to fail honestly when Postgres is unreachable, so that broken database setup is visible.
16. As a developer, I want readiness to fail honestly when Redis is unreachable, so that queue/pub-sub setup problems are visible.
17. As a developer, I want readiness to fail honestly when Ollama is unreachable, so that local embedding infrastructure problems are visible early.
18. As a developer, I want backend configuration validation, so that missing required infra config fails clearly.
19. As a developer, I want worker configuration validation, so that missing worker infra config fails clearly.
20. As a developer, I want auth and provider credentials omitted from required foundation config, so that undecided provider work is not forced early.
21. As a developer, I want a minimal `.env.example`, so that I know the required local infra variables.
22. As a developer, I want raw SQL migrations in a dedicated migrations area, so that database schema is treated as a shared contract between backend and worker.
23. As a developer, I want the migration runner script stored with migrations, so that migration behavior is discoverable beside migration files.
24. As a developer, I want backend tooling to execute the migration runner, so that no root package is needed.
25. As a developer, I want migration history tracked in the database, so that already-applied migrations are not rerun.
26. As a developer, I want the first migration to enable pgvector, so that vector support is validated before embedding work begins.
27. As a developer, I want Kysely kept as backend runtime database access, so that backend code follows the locked architecture decision.
28. As a developer, I want SQLAlchemy Core kept as worker runtime database access, so that worker code follows the locked architecture decision.
29. As a developer, I want a worker smoke check, so that the Python worker can prove configuration and Celery wiring before real indexing tasks exist.
30. As a developer, I want a frontend shell, so that frontend routing and rendering have a base for later flows.
31. As a developer, I want smoke tests for the foundation, so that later tickets can detect if the base app stops booting.
32. As a future agent, I want foundation behavior tested through public seams, so that later refactors do not depend on implementation details.

## Implementation Decisions

- The top-level project layout will use separate directories for frontend, backend, worker, infrastructure, migrations, and docs.
- The project will not use a root monorepo workspace.
- The frontend will use Vite, React, React Router, TanStack Query, shadcn/ui, TypeScript, and Yarn v4 through Corepack.
- The backend will use Node.js, TypeScript, Express, Zod, Kysely, and Yarn v4 through Corepack.
- The worker will use Python, uv, Celery, and SQLAlchemy Core.
- Backend development will use `tsx`; backend build/typecheck will use `tsc`.
- Local Docker Compose foundation will include Postgres with pgvector, Redis, and Ollama.
- Docker Compose will run infrastructure only in foundation. Frontend, backend, and worker processes will be started separately.
- Backend `GET /health` will be process-only and return success when the backend process is alive.
- Backend `GET /ready` will check Postgres, Redis, and Ollama reachability.
- Backend readiness will return failure status when any required dependency is unavailable.
- Backend and worker will both validate environment configuration.
- Foundation `.env.example` will include only infrastructure and embedding defaults: database URL, Redis URL, session secret, Ollama base URL, and embedding model.
- Auth and hosted generation provider keys are out of foundation and will be introduced by their owning specs.
- Raw SQL migrations will remain the database schema mechanism.
- The migration runner will live in the migrations area.
- The backend will own the dependency/script command that runs the migration runner.
- Migration files will use ordered names such as `0001_enable_vector.sql`.
- The first migration will enable the pgvector extension.
- Migration history will be tracked in a `schema_migrations` table with version, name, and applied timestamp.
- Prisma will not be used for migrations or runtime database access.
- Kysely remains the backend runtime database access tool.
- SQLAlchemy Core remains the worker runtime database access tool.
- No auth, repository submission, cloning, indexing, retrieval, chat generation, source viewer, retention cleanup, rate limiting, or CI hardening behavior will be implemented in foundation.

## Testing Decisions

- Tests should verify external behavior and public seams rather than internal implementation details.
- Backend tests should exercise HTTP behavior for `GET /health` and `GET /ready`.
- Backend readiness tests should verify success when dependencies are reachable and failure when one is unavailable.
- Migration tests should run the migration command against test Postgres and verify that pgvector is enabled and migration history is recorded.
- Worker tests should verify configuration validation and the Celery health/smoke seam without requiring real indexing behavior.
- Frontend tests should verify that the app shell renders and routing can initialize.
- Infrastructure verification should prove that local Postgres, Redis, and Ollama can boot sufficiently for backend readiness.
- Existing prior art is limited because this is the first implementation spec; these foundation seams become the prior art for later specs.

## Out of Scope

- GitHub OAuth and session behavior.
- Private repository token handling.
- Repository URL submission.
- Repository file count limits.
- Cloning and temp clone cleanup.
- Indexing job orchestration.
- Parsing, chunking, embeddings, symbols, references, and retrieval.
- Hosted LLM generation and streaming.
- Source viewer and citation UI.
- Guest TTL cleanup and logged-in deletion flows.
- Full observability, queue depth dashboards, and rate limits.
- CI quality gates beyond local smoke test commands.
- Playwright end-to-end tests.
- Prisma migrations or Prisma Client.

## Further Notes

This foundation spec respects the locked service boundary: backend and worker communicate through infrastructure contracts, not shared code or in-process imports.

The database schema is a shared contract between backend and worker. Raw SQL migrations are intentionally kept separate from runtime database clients so pgvector-specific DDL and future vector queries remain straightforward.

The foundation should stay small. It should prove that the project can boot and that the chosen boundaries work, without pulling in behavior owned by later feature specs.
