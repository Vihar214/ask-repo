# 01 — Persist Repository And Repository Job Records

**What to build:** Add the persistent Repository and Repository Job data model needed for Repository submission and clone/count processing. A future submit flow should be able to store a normalized Repository URL, unambiguous Guest Session or Logged-In User ownership, coarse Repository status, detailed Repository Job status, file-count outcomes, sanitized failure details, and transient Temp Clone handoff state.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Repository records store exactly one owner: either a Guest Session or a Logged-In User.
- [ ] Repository records store normalized `url`, GitHub owner, GitHub repo, user-declared private status, coarse status, and timestamps.
- [ ] Repository Job records store Repository id, detailed status, file count, file limit, failure code, user-safe failure message, sanitized failure detail, transient Temp Clone path, started timestamp, ready-for-indexing timestamp, finished timestamp, and timestamps.
- [ ] Database constraints enforce one guest Repository per Guest Session and one normalized Repository URL per Logged-In User.
- [ ] Repository Job records cascade when their Repository is deleted.
- [ ] Status values are constrained to the spec's Repository and Repository Job status sets.
- [ ] Migration tests verify ownership, uniqueness, status, and cascade behavior through the database seam.
