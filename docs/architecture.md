# Ask Repo Architecture

Ask Repo is a GitHub repository chat tool. Users submit a repository URL, the system clones and indexes the repository, and users chat with the indexed codebase through a streaming UI.

v0 supports guest users and GitHub-authenticated users. Both modes use the same indexing pipeline. They differ only in repository limits and retention behavior.

## Service Boundaries

The system has three main runtime areas:

- **Frontend**: Vite, React, React Router, TanStack Query, and shadcn/ui.
- **Backend**: Node.js, TypeScript, Express, Kysely, and Zod.
- **Workers**: Python, uv, Celery, SQLAlchemy Core, Tree-sitter, LSP servers, local embedding calls, retrieval, and hosted LLM generation.

Node owns HTTP APIs, GitHub OAuth, session cookies, user/session records, repo submission, chat orchestration, and SSE connections.

Python owns repository cloning jobs, file counting, parsing, chunking, embeddings, vector writes, symbol/reference extraction, retrieval, and LLM generation through provider adapters.

Node and Python communicate through Redis queues and Redis pub/sub. They do not import each other's code or share in-process state.

## Infrastructure

Local development uses Docker Compose for:

- Postgres with pgvector
- Redis
- Ollama

Ollama is used only for local embeddings. Generation uses a hosted LLM provider.

Secrets live in environment variables only. `.env.example` documents required names.

## Auth And Sessions

Guest users are identified by a signed HTTP-only session cookie. Guest sessions expire when the browser session ends or after 24 hours, whichever comes first.

Logged-in users authenticate with GitHub OAuth. The app stores the GitHub user id, username, avatar URL, email, and timestamps. The app does not persist GitHub OAuth access tokens in v0.

Private repository access uses a pasted GitHub token per clone. The token is used for clone/indexing work only, is never persisted, and must not be logged.

## Repository Limits

Guest users can index repositories with up to 500 files.

Logged-in users can index repositories with up to 10,000 files.

File caps count all tracked files from `git ls-files`, including files that may later be skipped from indexing.

If a guest submits a repository above the 500-file cap, the app rejects it after the file count scan and before indexing.

## Repository Processing

Repository processing follows one pipeline for both guest and logged-in users:

1. Node receives `POST /repos`.
2. Node creates the repo/job records.
3. Node enqueues a Python clone/index job through Redis.
4. Python performs a shallow clone with `git clone --depth=1` into a temp directory.
5. Python counts tracked files with `git ls-files`.
6. Python rejects repos over the applicable file cap before indexing.
7. Python skips `.git`, binaries, common vendor/dependency/build directories, and files over 5 MB.
8. Python stores skipped file records in the database so the frontend can show which files were skipped.
9. Python parses supported files with Tree-sitter.
10. Python chunks files around function/class/module boundaries, with bounded text chunk fallback.
11. Python embeds chunks with local `qwen3-embedding:0.6b` through Ollama.
12. Python writes files, chunks, chunk embeddings, symbols, references, and skipped file data to Postgres.
13. Python resolves references after all files are parsed, using a repo-level barrier before reference resolution.
14. Python deletes the temp clone after indexing succeeds or fails.
15. Python marks the repo ready or failed.

The stored repository points to database/index data, not to a cloned repo path.

## Parsing, Chunking, And Embeddings

AST-based chunking is the default for supported code files. Chunk units are functions, classes, module-level sections, or comparable syntax boundaries.

Fallback text chunking is used for unsupported text files. Fallback chunks may use a small overlap. AST chunks should not be overlapped by default.

The database stores both chunk text and embedding vectors. This is required for prompt construction, citations, and the source viewer after the temp clone has been deleted.

Embedding metadata stores the embedding model and dimension. If a query uses a different embedding model than the indexed repo, the query is blocked and the repo must be re-indexed.

Embeddings are batched with a configurable batch size. Failed embedding batches are retried a limited number of times; if they still fail, the repo indexing job fails.

## Symbol And Reference Resolution

v0 attempts full-scope reference resolution for supported code languages:

- TypeScript / JavaScript
- Python
- Go
- Rust

Markdown, JSON, and YAML are indexed semantically. They may expose lightweight heading/key symbols, but they do not support full "where used" references.

Reference resolution uses language servers where available. Language servers run inside the Python worker container/process supervision. The worker uses strict per-language resolver timeouts, defaulting to 60 seconds. If LSP resolution fails or times out, indexing continues with degraded symbol accuracy instead of failing the repository.

The UI must show when symbol accuracy is degraded. Reference rows store `resolver_kind`, such as `lsp`, `tree_sitter_name`, or `fallback_text`.

## Chat And Retrieval

Chat generation is queued through Redis. Node creates the user message, enqueues a chat job, and keeps an SSE connection open to the frontend.

The chat job payload contains `session_id`, `repo_id`, and `user_message_id`. Python fetches all required data from Postgres.

Python performs retrieval against pgvector and symbol/reference tables. Question routing starts with simple heuristics:

- Symbol-style questions use the symbol/reference index.
- Semantic questions use vector retrieval.
- Some questions may use both.

Python builds the prompt from retrieved repository chunks, file/line citations, recent chat history, and the user message.

Chat history is stored in Postgres. v0 uses last-N chat messages in the prompt and does not embed chat history. Chat-RAG and summarization are deferred.

Generation uses hosted LLM providers through a Python provider adapter. Provider selection and API keys come from environment variables such as `LLM_PROVIDER`, `GROQ_API_KEY`, or `OPENROUTER_API_KEY`.

All providers implement one streaming contract. Python publishes answer stream events to a Redis pub/sub channel per chat message. Node relays those events to the frontend over SSE.

Transient generation failures are retried. If retries are exhausted, the chat displays an error.

## HTTP Route Shape

Core v0 routes:

- `POST /repos`: submit a GitHub repo URL and optional private repo token.
- `GET /repos/:repoId/status`: poll indexing status as fallback.
- `GET /repos/:repoId/status/stream`: stream indexing status with SSE.
- `POST /repos/:repoId/messages`: create a chat message and queued answer.
- `GET /messages/:messageId/stream`: stream answer events with SSE.

Indexing status includes stage details such as cloning, counting, parsing, embedding, resolving, ready, failed, and degraded warnings.

Chat citations use `path:start-end` in v0. The source viewer renders stored chunk text for cited chunks.

## Data Ownership

Postgres with pgvector stores app data, repo metadata, file records, chunks, embeddings, symbols, references, skipped files, chats, and job state.

Raw SQL migration files define schema changes.

Node uses Kysely for runtime database access.

Python uses SQLAlchemy Core for runtime database access.

Suggested ownership:

- Node writes users, sessions, repos, chats, and job orchestration records.
- Python writes files, chunks, chunk embeddings, symbols, references, skipped files, indexing status details, and generation outputs.

## Retention And Deletion

Guest TTL deletion removes all guest repo data, vectors, symbols, references, skipped files, and chats.

Logged-in users can delete individual chats, repositories, or their account.

Deleting a repository removes its index data and chats. Deleting an account removes the user, repos, indexes, symbols, references, skipped files, and chats.

Temp clone folders are always deleted after indexing succeeds or fails.

## Rate Limits And Observability

Rate limits apply by guest session, logged-in user id, and IP fallback.

v0 observability includes structured logs, job durations, failure reasons, and queue depth.

The frontend should show queue/status information honestly instead of hiding slow indexing or provider rate limits.

## Testing And CI

Development uses full test-driven development. Each ticket should define public test seams before implementation.

Test stack:

- Vitest for backend and frontend behavior.
- pytest for Python workers.
- Schema/fixture contract tests for Redis job payloads and stream events.

Playwright end-to-end tests are not part of v0.

CI uses GitHub Actions for linting, typechecking, and tests.

Formatting and linting:

- ESLint and Prettier for TypeScript.
- Ruff for Python.
