# 02 — Boot Local Infrastructure

**What to build:** Make local infrastructure bootable for development with Postgres including pgvector support, Redis, and Ollama. This should provide the dependency base that backend readiness, worker smoke checks, and migrations can use.

**Blocked by:** 01 — Create Separate Project Skeleton

**Status:** ready-for-agent

- [ ] Local infrastructure starts with Postgres, Redis, and Ollama.
- [ ] Postgres image or setup supports the pgvector extension.
- [ ] Redis is reachable from local app processes.
- [ ] Ollama is reachable from local app processes.
- [ ] Infrastructure startup is documented without requiring frontend, backend, or worker containers.
