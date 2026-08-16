# 04 — Expose Backend Health And Readiness

**What to build:** Make the backend start with validated infrastructure configuration and expose separate health and readiness routes. Health should prove the process is alive. Readiness should honestly report whether Postgres, Redis, and Ollama are reachable.

**Blocked by:** 01 — Create Separate Project Skeleton, 02 — Boot Local Infrastructure

**Status:** ready-for-agent

- [ ] Backend validates required foundation environment configuration at startup.
- [ ] Backend health route returns success when the process is alive.
- [ ] Backend readiness route checks Postgres, Redis, and Ollama reachability.
- [ ] Backend readiness returns failure when any required dependency is unavailable.
- [ ] Backend uses Kysely for runtime database access.
- [ ] Tests cover health success, readiness success, and readiness failure behavior.
