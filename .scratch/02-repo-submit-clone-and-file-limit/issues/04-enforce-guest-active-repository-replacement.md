# 04 — Enforce Guest Active Repository Replacement

**What to build:** Enforce the Guest User one Active Repository rule during Repository submission. A Guest User submitting another Repository should receive a clear conflict unless they explicitly consent to replacing the Active Repository; consented replacement should delete old guest Repository data and create the new Repository Job.

**Blocked by:** 02 — Submit Public Repository Jobs

**Status:** ready-for-agent

- [ ] Guest submission detects an existing Active Repository for the current Guest Session.
- [ ] Guest submission without `replaceActiveRepository` returns a `409` conflict with code `active_repository_exists`.
- [ ] The conflict response includes a user-safe message explaining that submitting a new Repository will delete the current guest Repository.
- [ ] The conflict response includes a small current Repository summary and does not expose Temp Clone paths.
- [ ] Guest submission with `replaceActiveRepository` deletes the existing guest Repository and dependent Repository Jobs before creating the new Repository and Repository Job.
- [ ] Tests cover conflict and consented replacement behavior through the `POST /repos` seam.
