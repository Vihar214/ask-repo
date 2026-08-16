# 08 — Organize Runtime Source Structure

**What to build:** Refactor the current backend and worker source files into small ownership-based folders so future feature tickets have obvious homes. This should be a structure-only change and should not add auth, repository submission, indexing, retrieval, chat, or CI behavior.

**Blocked by:** 01 — Create Separate Project Skeleton

**Status:** ready-for-human

- [x] Backend HTTP routes live under a clear HTTP routes area.
- [x] Backend database and queue helpers live under ownership-specific folders.
- [x] Backend avoids premature controller/model/middleware folders.
- [x] Worker database helpers live under a database folder.
- [x] Worker Celery task entrypoints live under a queue/task folder.
- [x] Worker smoke behavior lives under a health folder.
- [x] Imports and tests are updated with no behavior changes.
- [x] Documentation explains the runtime source structure.
