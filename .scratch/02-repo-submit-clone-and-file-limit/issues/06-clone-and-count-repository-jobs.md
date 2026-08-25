# 06 — Clone And Count Repository Jobs

**What to build:** Make the Python worker consume clone/count Repository Job payloads, shallow-clone public and private Repositories, count tracked files with `git ls-files`, update Repository and Repository Job status, and map clone/count failures to stable user-safe failure reasons.

**Blocked by:** 02 — Submit Public Repository Jobs, 03 — Handle Private Repository Token Submission

Status: ready-for-agent

- [ ] The worker accepts the clone/count Repository Job payload shape produced by the backend.
- [ ] Public Repository Jobs clone without a Private Repository Token.
- [ ] Private Repository Jobs clone with temporary credential handling that does not put the token in the clone URL.
- [ ] The worker performs a shallow clone with the locked v0 clone strategy.
- [ ] The worker counts tracked files with `git ls-files` immediately after clone.
- [ ] Submodules are counted only as tracked gitlink entries in v0.
- [ ] Successful under-limit clone/count work marks the Repository Job `ready_for_indexing` and the Repository `ready_for_indexing`.
- [ ] Clone/count failures are mapped to stable failure codes and user-safe messages without raw git stderr exposure.
- [ ] Worker tests cover local clone/count behavior and mocked failure mapping through the worker task seam.
