# 05 — Enforce Logged-In Duplicate Reindex Consent

**What to build:** Enforce duplicate Repository URL handling for Logged-In Users. A Logged-In User submitting an existing Repository URL should receive a clear conflict unless they explicitly consent to reindexing; consented reindexing should create a new Repository Job on the existing Repository without deleting old index data.

**Blocked by:** 02 — Submit Public Repository Jobs

Status: ready-for-agent

- [ ] Logged-In submission detects an existing Repository with the same normalized Repository URL for the current Logged-In User.
- [ ] Duplicate Logged-In submission without `reindexExistingRepository` returns a `409` conflict with code `repository_already_exists`.
- [ ] The conflict response includes a user-safe message explaining that reindexing will replace the old index only after the new one succeeds.
- [ ] The conflict response includes a small existing Repository summary and does not expose Temp Clone paths.
- [ ] Logged-In submission with `reindexExistingRepository` creates a new Repository Job for the existing Repository.
- [ ] Consented reindexing does not delete existing Repository Index data in this feature.
- [ ] Tests cover duplicate conflict and consented reindex behavior through the `POST /repos` seam.
