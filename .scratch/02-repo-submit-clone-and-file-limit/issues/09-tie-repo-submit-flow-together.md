# 09 — Tie Repo Submit Flow Together

**What to build:** Verify and document the complete Repository submit, clone, and file-limit flow across frontend, backend, queue payloads, worker processing, database state, and cleanup rules. This ticket should make the feature coherent for the next indexing orchestration spec without adding polling or SSE.

**Blocked by:** 03 — Handle Private Repository Token Submission, 04 — Enforce Guest Active Repository Replacement, 05 — Enforce Logged-In Duplicate Reindex Consent, 07 — Enforce File Limits And Temp Clone Cleanup, 08 — Normalize Repository URLs With Toast Feedback

Status: ready-for-agent

- [ ] End-to-end smoke verification covers public Repository submission from frontend payload through queued Repository Job creation.
- [ ] End-to-end smoke verification covers private Repository submission without persisting Private Repository Tokens.
- [ ] End-to-end smoke verification covers Guest User replacement consent and Logged-In User reindex consent.
- [ ] End-to-end smoke verification covers under-limit `ready_for_indexing`, over-limit rejection, and clone/count failure states.
- [ ] Documentation explains that `ready_for_indexing` is not chat-ready and later indexing orchestration owns continuing from the Temp Clone.
- [ ] Documentation confirms this feature intentionally excludes polling status routes and SSE status streams.
- [ ] The feature can be verified from local development setup using the established test and smoke command patterns.
