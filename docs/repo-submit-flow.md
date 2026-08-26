# Repository Submit, Clone, and File Limit Flow

This document verifies the end-to-end flow for submitting a GitHub repository for processing.

## Current Scope

This feature (`02-repo-submit-clone-and-file-limit`) builds the initial repository ingestion up to file counting. It intentionally stops at `ready_for_indexing` and does **not** include:
- Polling status routes (`GET /repos/:repoId/status`)
- SSE status streams
- Real chat or indexing functionality (parsing, chunking, embeddings, pgvector writes)

**Important:** The `ready_for_indexing` status means the clone and file-count checks passed, but the repository is **not** chat-ready. Later indexing orchestration owns continuing the pipeline from the Temp Clone.

## Flow Details

1. **Frontend Submit:**
   - The user inputs a GitHub URL in the frontend.
   - The frontend normalizes the URL (e.g., stripping `.git` and trailing slashes) on blur and on submit, showing a toast notice if changed.
   - If the repository is marked private, the user must provide a Private Repository Token. The token is never stored.
   - The frontend calls `POST /repos` with the normalized URL, `isPrivate`, `privateRepositoryToken`, and replacement/reindex consent flags.

2. **Backend HTTP & Database:**
   - The backend validates the Session CSRF Token.
   - Rejects unsupported URLs (e.g. SSH, subpaths, non-GitHub hosts) and accidental tokens for public repos.
   - Validates Guest Active Repository and Logged-In User URL uniqueness. If conflicts exist, returns 409 requesting consent.
   - Creates a `Repository` row and a `RepositoryJob` row with status `queued`.
   - Enqueues a clone/count job to the Python worker via Redis. The token is passed *only* through this ephemeral payload.

3. **Worker Processing (Clone & Count):**
   - The Python worker receives the payload.
   - For private repositories, a temporary credential helper (`GIT_ASKPASS`) is used so the token is not leaked in the clone URL.
   - Performs a shallow clone (`--depth=1`) into `<project-root>/tmp/ask-repo-clones/<repository_job_id>`.
   - Runs `git ls-files` to count tracked files (submodules are counted as gitlinks in v0).
   
4. **Limits and Cleanup:**
   - Checks against the Repository Limit (500 files for Guests, 10,000 for Logged-In Users).
   - If **over-limit**:
     - Marks the `Repository` and `RepositoryJob` as `rejected_file_limit`.
     - Deletes the Temp Clone immediately.
   - If **clone fails**:
     - Maps to a user-safe failure code (e.g. `clone_auth_failed`, `clone_not_found`).
     - Marks as `failed` and deletes the Temp Clone immediately.
   - If **under-limit (Success)**:
     - Marks as `ready_for_indexing`.
     - Leaves the Temp Clone on disk for later indexing specs.
     - The path is stored in the database but never exposed via API responses.
     - For guest replacement, deletes the previous Active Repository only after the replacement Repository reaches this state.

## Verification

The flow is verified through a combination of:
- **Frontend tests** (`RepositoryUrlField.test.tsx`) for UI validation, token handling, and URL normalization.
- **Backend tests** (`repositories.test.ts`) for HTTP validations, duplicate checking, queue contract, and private token handling.
- **Worker tests** (`test_clone_and_count.py`) for clone mechanics, file limits, failure mapping, credential sanitization, and Temp Clone cleanup.
- **Worker smoke tests** (`test_smoke.py`) ensuring local development configurations can correctly run Celery tasks.
