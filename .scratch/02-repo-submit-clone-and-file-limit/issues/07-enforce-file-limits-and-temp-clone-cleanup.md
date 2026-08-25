# 07 — Enforce File Limits And Temp Clone Cleanup

**What to build:** Apply Guest User and Logged-In User Repository Limits after clone/count and manage Temp Clone cleanup or handoff. Over-limit and failed jobs should clean up their Temp Clone; under-limit jobs should keep the Temp Clone under the known handoff path for later indexing orchestration.

**Blocked by:** 06 — Clone And Count Repository Jobs

**Status:** ready-for-agent

- [ ] Guest Repository Jobs enforce the 500-file Repository Limit.
- [ ] Logged-In Repository Jobs enforce the 10,000-file Repository Limit.
- [ ] Over-limit jobs store file count, file limit, `file_limit_exceeded`, and the correct user-safe message including actual file count.
- [ ] Over-limit jobs mark the Repository Job `rejected_file_limit` and the Repository `rejected_file_limit`.
- [ ] Over-limit and failed jobs delete the Temp Clone when present.
- [ ] Under-limit jobs keep the Temp Clone at `/tmp/ask-repo-clones/<repository_job_id>` and store the path on the Repository Job.
- [ ] Temp Clone paths are never exposed in API responses.
- [ ] Existing Temp Clone path collisions fail as `worker_failed` rather than deleting the directory.
- [ ] Worker tests verify file-limit outcomes, cleanup behavior, handoff path behavior, and collision handling.
