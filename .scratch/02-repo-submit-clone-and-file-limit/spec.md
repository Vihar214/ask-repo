Status: ready-for-agent

# Repo Submit, Clone, And File Limit Spec

## Problem Statement

Ask Repo has foundation infrastructure and auth/session behavior, but a User still cannot submit a Repository URL for processing. The product also has locked Repository Limits that cannot be enforced honestly until the system can clone a Repository, count tracked files, and record whether the Repository is allowed to continue into indexing.

Without this feature, later indexing, retrieval, chat, status streaming, and source-viewer work have no real Repository or Repository Job records to build on. Private Repository Token handling also needs to be established before private Repository cloning can safely enter the pipeline.

## Solution

Add Repository submission from the frontend through the backend into a Python worker Repository Job that shallow-clones the Repository, counts tracked files with `git ls-files`, enforces the Guest User and Logged-In User file caps, records progress and failures in Postgres, and manages Temp Clone cleanup according to the processing outcome.

The User should be able to enter a GitHub Repository URL, have it normalized into the stored Repository URL, optionally mark the Repository as private and provide a Private Repository Token, consent to replacing an existing guest Active Repository or reindexing an existing logged-in Repository, and submit the Repository for clone/count processing. The feature does not make the Repository chat-ready; a successful under-limit Repository ends in `ready_for_indexing` for later indexing specs.

## User Stories

1. As a User, I want to submit a GitHub Repository URL, so that Ask Repo can begin preparing the Repository for indexing.
2. As a User, I want the Repository URL normalized before submission, so that duplicate detection and display use one stable URL form.
3. As a User, I want the URL input to visibly update when normalization changes it, so that I know which Repository URL will be submitted.
4. As a User, I want to see a reusable toast when my Repository URL is normalized, so that the change is noticeable without blocking my flow.
5. As a User, I want invalid GitHub URLs rejected before processing, so that I can fix mistakes quickly.
6. As a User, I want token-in-URL forms rejected, so that secrets are not accidentally leaked through URLs.
7. As a User, I want SSH GitHub URLs rejected in v0, so that the product keeps one supported clone path.
8. As a User, I want branch URLs, file URLs, and repository subpaths rejected in v0, so that Ask Repo only accepts whole repositories.
9. As a User, I want non-GitHub hosts rejected, so that the product scope stays clear.
10. As a User, I want to mark a Repository as private, so that I can provide a Private Repository Token when needed.
11. As a User, I want the Private Repository Token field hidden until I mark the Repository private, so that public Repository submission stays simple.
12. As a User, I want the Private Repository Token field to have show/hide behavior, so that I can verify or hide the token while typing.
13. As a User, I want token helper text saying the token is used only for this clone and is not stored, so that I understand the privacy boundary.
14. As a User, I want private submission to fail before the API call when the token field is empty, so that I do not submit incomplete work.
15. As a User, I want public submission to reject accidental token input, so that token handling stays explicit.
16. As a Guest User, I want Ask Repo to enforce the 500-file Repository Limit, so that I get a clear failure instead of a slow partial index.
17. As a Logged-In User, I want Ask Repo to enforce the 10,000-file Repository Limit, so that large Repository behavior stays predictable.
18. As a User, I want over-limit errors to include the actual file count and my current limit, so that I understand why processing stopped.
19. As a Guest User, I want the over-limit message to say guest repositories are limited to 500 files for now, so that the current product boundary is clear.
20. As a Logged-In User, I want the over-limit message to say logged-in repositories are limited to 10,000 files for now, so that the current product boundary is clear.
21. As a Guest User, I want to have only one Active Repository, so that guest data stays temporary and bounded.
22. As a Guest User, I want a second Repository submission to require explicit replacement consent, so that I do not lose the current Active Repository by accident.
23. As a Guest User, I want consented replacement to keep my old Active Repository usable until the replacement Repository passes clone/count, so that a failed replacement does not leave me with no working Repository.
24. As a Logged-In User, I want duplicate submission of the same Repository URL to warn me before reindexing, so that I do not overwrite existing Repository work by accident.
25. As a Logged-In User, I want consented reindexing to create a new Repository Job on the existing Repository, so that the Repository identity remains stable.
26. As a Logged-In User, I want the old Repository Index to remain usable until a future reindex succeeds, so that a failed reindex does not destroy existing usable data.
27. As a User, I want clone failures to show a useful failure reason, so that I know whether to check the URL, token, access, or provider limits.
28. As a User submitting without a token, I want auth-like clone failures to suggest retrying with a Private Repository Token, so that private Repository recovery is discoverable.
29. As a User submitting with a token, I want auth-like clone failures to say the token may lack access, so that I know what to fix.
30. As a developer, I want Repository records stored separately from Repository Job attempts, so that identity and processing history are not conflated.
31. As a developer, I want the Repository URL stored as the normalized `url`, so that raw submitted URLs and accidental secrets are not persisted.
32. As a developer, I want Repository ownership to point to exactly one Logged-In User or Guest Session, so that data ownership is unambiguous.
33. As a developer, I want a database invariant enforcing one Active Repository per Guest Session, so that concurrent requests cannot bypass the Active Repository rule while replacement attempts are allowed to run inactive.
34. As a developer, I want a database invariant enforcing one Repository URL per Logged-In User, so that duplicate detection is reliable.
35. As a developer, I want Repository Jobs to record detailed job status, so that later status streaming can expose real progress.
36. As a developer, I want Repositories to record coarse current status, so that later UI surfaces can list Repository state without reading every job.
37. As a developer, I want Repository Jobs to store file count and file limit outcomes, so that over-limit errors and debugging have stable data.
38. As a developer, I want Repository Jobs to store sanitized failure code, user-safe failure message, and sanitized failure detail, so that UI and debugging needs are both covered.
39. As a developer, I want raw git stderr hidden from users, so that tokens, local paths, and noisy internals do not leak.
40. As a developer, I want the backend to require the existing Session CSRF Token for `POST /repos`, so that cookie-authenticated state changes remain protected.
41. As a developer, I want the backend to pass any Private Repository Token only through the Redis job payload, so that the token is available to the worker without being persisted in Postgres.
42. As a developer, I want the worker to use `git clone --depth=1`, so that v0 follows the locked shallow clone strategy.
43. As a developer, I want the worker to use temporary `GIT_ASKPASS` or an equivalent temporary credential helper for tokens, so that tokens are not placed into clone URLs.
44. As a developer, I want the worker to drop the Private Repository Token after clone, so that later pipeline steps do not carry secret material.
45. As a developer, I want the worker to count files immediately after clone and before indexing work, so that over-limit Repositories are rejected early.
46. As a developer, I want submodules counted only as tracked gitlink entries in v0, so that file counting does not recurse into extra repositories.
47. As a developer, I want over-limit Temp Clones deleted immediately, so that rejected Repositories do not leave working copies behind.
48. As a developer, I want failed clone/count Temp Clones deleted when present, so that failures do not accumulate temporary files.
49. As a developer, I want under-limit Temp Clones kept for the later indexing pipeline, so that later specs do not need to clone the Repository again.
50. As a developer, I want Temp Clone paths stored only as transient Repository Job state, so that the stored Repository still points to database/index data rather than a clone path.
51. As a developer, I want Temp Clone paths never returned by API responses, so that local filesystem structure is not exposed.
52. As a developer, I want Temp Clone directories under a known hard-coded root using the Repository Job id, so that later cleanup and handoff are predictable.
53. As a developer, I want path collisions to fail the job instead of deleting an existing directory, so that duplicate dispatch bugs do not erase another in-progress attempt.
54. As a developer, I want no automatic clone/count retries in v0, so that failure semantics stay simple and the User can resubmit or reindex intentionally.
55. As a future agent, I want `ready_for_indexing` to mean clone and file-count checks passed but chat is not ready, so that later specs know exactly where to continue.

## Implementation Decisions

- This feature merges the previously discussed repository-submit/file-limit work and clone/cleanup work. The feature name is `02-repo-submit-clone-and-file-limit`.
- This feature creates the Repository submission path, the clone/count worker behavior, Repository Limit enforcement, and Temp Clone handoff/cleanup rules.
- This feature does not include parsing, chunking, embeddings, vector storage, symbol/reference resolution, retrieval, chat generation, source viewing, frontend status timelines, polling status endpoints, or SSE status streams.
- The frontend owns first-pass Repository URL normalization for user experience. It normalizes on blur and on submit.
- If frontend normalization changes the visible value, the frontend updates the input and shows a reusable toast notice with copy such as “URL normalized to GitHub repository format.”
- The reusable toast system should be built as a general frontend primitive, but this feature should only use it for the Repository URL normalization notice.
- The backend also normalizes and validates the Repository URL. Frontend normalization is not trusted as the source of truth.
- The stored Repository URL column is named `url` and stores only the normalized GitHub HTTPS Repository URL.
- The system does not store raw submitted URLs.
- Supported URL input forms are GitHub HTTPS repository root URLs with or without a `.git` suffix.
- The normalized Repository URL strips `.git`, trailing slash, query, and hash. Duplicate comparison treats GitHub owner and repo names case-insensitively while storing a clean normalized URL.
- SSH URLs, token-in-URL forms, non-GitHub hosts, branch URLs, file URLs, and repository subpaths are rejected in v0.
- Repository submission uses `POST /repos`.
- `POST /repos` requires the existing Session CSRF Token through `X-CSRF-Token`.
- The request body includes `url`, `isPrivate`, `privateRepositoryToken`, `replaceActiveRepository`, and `reindexExistingRepository`.
- `isPrivate` is explicit because the system cannot reliably know whether a Repository is private from the URL before cloning.
- If `isPrivate` is true, a Private Repository Token is required.
- If `isPrivate` is false, a Private Repository Token must be absent. Accidental public submissions with token material are rejected.
- Basic Private Repository Token validation checks presence when required and a maximum length of 512 characters. GitHub API token validation is not part of this feature; clone is the source of truth.
- Private Repository Tokens are never persisted in Postgres and never logged.
- Private Repository Tokens may live briefly in the Redis/Celery job payload so the worker can clone a private Repository.
- The worker must not include the Private Repository Token in clone URLs. It uses temporary `GIT_ASKPASS` or an equivalent temporary credential helper.
- Token-in-URL clone forms are rejected because they are already locked out by the decision log.
- The backend creates Repository and Repository Job records, then enqueues a Celery-compatible clone/count job through Redis.
- The clone/count job payload contains Repository Job id, Repository id, normalized Repository URL, `isPrivate`, and a nullable Private Repository Token.
- Public Repository job payloads use `privateRepositoryToken: null` to keep the contract stable.
- Python owns clone/count processing and updates Postgres directly.
- Node does not receive a worker completion callback in this feature.
- The worker performs `git clone --depth=1`.
- The worker counts tracked files with `git ls-files` immediately after clone.
- File caps count all tracked files from `git ls-files`, including files that future indexing may skip.
- Submodules are counted as tracked gitlink entries only; v0 does not recursively clone or count submodules.
- Guest Users have a 500-file Repository Limit.
- Logged-In Users have a 10,000-file Repository Limit.
- Over-limit Guest User message is “Guest repositories are limited to 500 files for now. This repository has <file_count> files.”
- Over-limit Logged-In User message is “Logged-in repositories are limited to 10,000 files for now. This repository has <file_count> files.”
- The failure reason code set is `invalid_url`, `unsupported_url`, `token_in_url_rejected`, `clone_auth_failed`, `clone_not_found`, `clone_rate_limited`, `clone_failed`, `file_limit_exceeded`, and `worker_failed`.
- User-facing failure messages are mapped from failure codes and do not expose raw git stderr.
- Sanitized failure detail may be stored for developer/debug use. It must not contain Private Repository Tokens, raw token-bearing URLs, or local Temp Clone paths intended only for internal use.
- Repository records store ownership, normalized URL, GitHub owner, GitHub repo, user-declared `is_private`, coarse current status, and timestamps.
- Repository ownership is exactly one of Logged-In User or Guest Session. The database enforces this with a check constraint.
- Guest Users can have only one Active Repository. The database enforces one active guest Repository per Guest Session while allowing inactive replacement attempts to coexist until they succeed or fail.
- Logged-In Users can have only one Repository for a given normalized Repository URL. The database enforces uniqueness for logged-in Repository URL ownership.
- A Guest User submitting a new Repository while an Active Repository exists receives a conflict unless `replaceActiveRepository` is true.
- The guest replacement conflict response uses code `active_repository_exists`, includes a user-safe message that submitting a new Repository will delete the current guest Repository, and includes a small current Repository summary.
- When `replaceActiveRepository` is true, the backend creates a replacement Repository and Repository Job without deleting the existing Active Repository immediately.
- The replacement Repository remains inactive until its clone/count job reaches `ready_for_indexing`.
- When a guest replacement Repository reaches `ready_for_indexing`, the worker deletes the old guest Repository and dependent Repository Jobs, then marks the replacement Repository as the Active Repository.
- If the replacement clone/count job fails or is rejected, the old guest Active Repository remains in place.
- A Logged-In User submitting a Repository URL that already exists receives a conflict unless `reindexExistingRepository` is true.
- The logged-in duplicate conflict response uses code `repository_already_exists`, includes a user-safe message that reindexing will replace the old index after the new one succeeds, and includes a small existing Repository summary.
- When `reindexExistingRepository` is true, the backend creates a new Repository Job for the existing Repository rather than creating a new Repository row.
- Later indexing work replaces the old Repository Index only after the new index succeeds. This feature records the reindex intent and creates the new Repository Job; it does not delete any existing index.
- Repository Job records store Repository id, detailed status, file count, file limit, failure code, failure message, sanitized failure detail, transient Temp Clone path, started timestamp, ready-for-indexing timestamp, finished timestamp, and timestamps.
- Repository Job status values for this feature are `queued`, `cloning`, `counting_files`, `ready_for_indexing`, `rejected_file_limit`, and `failed`.
- Repository status values for this feature are `queued`, `processing`, `ready_for_indexing`, `rejected_file_limit`, and `failed`.
- The database uses `TEXT CHECK` constraints for Repository and Repository Job status values.
- `repository_jobs.repository_id` uses `ON DELETE CASCADE`.
- `started_at` is set when worker processing begins.
- `finished_at` is set for terminal job states such as `rejected_file_limit` and `failed`.
- `ready_for_indexing_at` is set when clone/count succeeds and the Repository is under the applicable file cap.
- `ready_for_indexing` means clone and file-count checks passed, the Repository is not yet chat-ready, and later indexing orchestration must continue processing.
- Temp Clone root is hard-coded as `<project-root>/tmp/ask-repo-clones`.
- Temp Clone directory naming is `<project-root>/tmp/ask-repo-clones/<repository_job_id>`.
- If the Temp Clone directory already exists for a Repository Job id, the worker marks the job failed with `worker_failed` rather than deleting the directory.
- If clone fails or the Repository is over the applicable file cap, the worker deletes the Temp Clone when present.
- If clone/count succeeds and the Repository is under the file cap, the worker keeps the Temp Clone and stores its path on the Repository Job for later indexing orchestration.
- Temp Clone paths are not returned from API responses.
- This feature has no automatic clone/count retry policy. The User can resubmit, replace the guest Active Repository, or reindex an existing logged-in Repository intentionally.
- No ADR is needed for this feature because the major architectural decisions are already locked in the decision log; the remaining decisions are feature-level contract details.

## Testing Decisions

- Tests should verify external behavior and public seams rather than internal helper implementation details.
- The primary backend seam is HTTP behavior for `POST /repos`.
- Backend HTTP tests should cover successful guest Repository submission, successful logged-in Repository submission, CSRF rejection, invalid URL rejection, unsupported URL rejection, token-in-URL rejection, public submission with accidental token rejection, private submission without token rejection, and accepted private submission.
- Backend HTTP tests should cover Guest User Active Repository conflicts and the `replaceActiveRepository` consent path.
- Backend HTTP tests should cover Logged-In User duplicate Repository conflicts and the `reindexExistingRepository` consent path.
- Backend HTTP tests should verify user-safe conflict response shapes for `active_repository_exists` and `repository_already_exists`.
- Backend HTTP tests should verify the created Repository and Repository Job states after submission without depending on lower-level route helper internals.
- Database migration tests should verify `repositories` and `repository_jobs` schema, status check constraints, ownership check constraints, guest single-Repository enforcement, logged-in unique Repository URL enforcement, and `ON DELETE CASCADE` from Repository to Repository Jobs.
- Queue contract tests should verify the Celery-compatible clone/count job payload shape, including nullable Private Repository Token behavior for public Repository submissions.
- Queue contract tests should verify that Private Repository Tokens are not written to Repository or Repository Job database fields.
- Worker tests should cover clone/count behavior through the worker task seam, using local temporary git repositories where possible.
- Worker tests should verify shallow clone command behavior without asserting incidental command construction details beyond the locked clone strategy and token safety.
- Worker tests should verify `git ls-files` file counting, over-limit rejection, under-limit `ready_for_indexing`, submodule counting as a gitlink entry, and cleanup behavior for failure/rejection.
- Worker tests should verify clone failure mapping to stable failure codes and sanitized failure messages.
- Worker tests should verify Temp Clone path creation under `<project-root>/tmp/ask-repo-clones/<repository_job_id>` and collision handling as `worker_failed`.
- Frontend tests should cover Repository URL normalization on blur and submit, visible value replacement, reusable toast display, private Repository toggle behavior, token show/hide control, client-side empty-token validation, and submission payload shape.
- Frontend tests should verify that public submissions do not send token material.
- Tests should reuse existing prior art from auth HTTP tests, auth migration tests, frontend shell/session tests, worker smoke tests, and Redis/Celery contract-style testing established in foundation.
- This feature does not include tests for polling status routes or SSE status streams because those routes are out of scope here.
- This feature does not include live GitHub network integration tests. Clone behavior should be tested with local repositories and mocked failing clone outcomes where needed.

## Out of Scope

- Parsing repository files.
- Chunking repository content.
- Embedding chunks.
- Writing vectors to pgvector.
- Building file records, chunk records, symbols, references, skipped file records, or Repository Index data.
- LSP-backed symbol/reference resolution.
- Retrieval.
- Chat message creation.
- Hosted LLM generation.
- Chat answer streaming.
- Source viewer and citations.
- Frontend status timeline.
- `GET /repos/:repoId/status` polling route.
- `GET /repos/:repoId/status/stream` SSE route.
- Repository dashboard/history beyond the minimal submit surface needed for this feature.
- Automatic clone/count retries.
- Temp Clone sweeper or retention cleanup worker.
- Deleting logged-in Repository Index data during reindex. Later indexing work owns replacement after successful reindex.
- Full observability, queue depth dashboards, and rate limiting.
- CI hardening beyond tests needed for this feature.

## Further Notes

This feature intentionally ends at `ready_for_indexing` for successful under-limit Repositories. That intermediate state is acceptable because Ask Repo becomes useful only after later indexing, retrieval, chat, and frontend flow specs are complete.

The Temp Clone is transient pipeline state. It may remain after this feature while waiting for later indexing orchestration, but the stored Repository must not treat the clone path as its source of truth. Later indexing orchestration consumes the Repository Job Temp Clone path and owns final cleanup after indexing succeeds or fails.

The feature uses the existing auth/session CSRF seam rather than defining a new CSRF mechanism. It also follows the existing locked boundary where Node owns HTTP/session/job orchestration and Python owns clone/count worker behavior.
