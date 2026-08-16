# Ask Repo Overview

Ask Repo is a web tool for chatting with GitHub repositories.

The user pastes a GitHub repo URL, optionally provides a token for private repo access, waits for indexing, then asks questions about the codebase in a chat UI. Answers should cite files and line numbers when using repository context, say when retrieved context is weak, and distinguish semantic explanations from best-effort symbol lookups.

## Target User

The first target user is a solo developer exploring an unfamiliar repository.

The docs should still be clear enough for future agents, project owners, and human contributors to understand the product direction and boundaries.

## Product Scope

v0 supports both guest and logged-in usage.

Guest users can index one active repository at a time. Guest sessions expire when the browser session ends or after 24 hours, whichever comes first. When the session expires, all related repo data, vectors, symbols, and chats are deleted.

Logged-in users authenticate with GitHub OAuth. Logged-in users can keep a repo history/dashboard, and their repo indexes and chats persist until they delete them. GitHub OAuth is only for account login in v0; private repo access still uses a separately pasted GitHub token.

## Repository Limits

Guest users can use repositories with up to 500 files.

Logged-in users can use repositories with up to 10,000 files.

File limits count all files in the repository. If a guest submits a repo above the 500-file limit, the app rejects it upfront after a file count scan instead of indexing a partial repo.

## v0 Success Criteria

v0 is working when a user can:

- Submit a GitHub repo URL
- Provide a token for private repo access when needed
- See indexing status
- Chat with the indexed repo
- Receive answers with file and line citations
- Ask symbol-style questions such as "where is X used?"
- Use a streaming chat UI

## Technical Shape

The system uses retrieval-augmented generation rather than stuffing the full repository into the model context.

Repository files are parsed and indexed in the background. The technical design uses AST-aware chunking, embeddings, a vector store, and LSP-backed reference resolution for supported languages, with labelled fallback when exact resolution is unavailable. Detailed implementation choices live in `docs/architecture.md` and decision history lives in `docs/decisions.md`.

## Non-Goals

Ask Repo is not a GitHub Copilot replacement.

It is not a code-editing agent.

It is not only an ephemeral no-account toy; v0 includes logged-in users for larger and persistent repos.

It is not a guaranteed compiler-grade "where used" analyzer for every repository. The system attempts exact reference resolution for supported languages, but falls back when language-server resolution is unavailable, times out, or cannot understand the repo without dependency installation.

## Known Risks

Symbol lookup can degrade when LSP-backed reference resolution is unavailable or times out.

Hosted LLM providers can rate-limit generation calls.

Large repositories may index slowly, even when they are within the allowed file cap.
