# 05 — Add Worker Smoke Check

**What to build:** Make the Python worker validate foundation configuration and expose a Celery smoke or health task. This should prove worker wiring without implementing repository cloning, indexing, retrieval, or generation.

**Blocked by:** 01 — Create Separate Project Skeleton, 02 — Boot Local Infrastructure

**Status:** ready-for-agent

- [ ] Worker validates required foundation environment configuration.
- [ ] Worker uses uv for dependency and task management.
- [ ] Worker config includes Celery wiring against Redis.
- [ ] Worker keeps SQLAlchemy Core as runtime database access.
- [ ] A smoke or health task can run without indexing behavior.
- [ ] Tests or smoke verification prove worker config and health task behavior.
