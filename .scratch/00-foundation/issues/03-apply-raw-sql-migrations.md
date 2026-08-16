# 03 — Apply Raw SQL Migrations

**What to build:** Add a raw SQL migration path where the migration runner lives with the migrations and is executed through backend tooling. The first migration should enable pgvector and migration history should prevent already-applied migrations from rerunning.

**Blocked by:** 01 — Create Separate Project Skeleton, 02 — Boot Local Infrastructure

**Status:** ready-for-agent

- [ ] Migration runner applies ordered raw SQL migration files.
- [ ] Backend tooling can run the migration runner without adding a root package workspace.
- [ ] Migration history is stored in a `schema_migrations` table with version, name, and applied timestamp.
- [ ] The first migration enables the pgvector extension.
- [ ] Re-running migrations is idempotent for already-applied migrations.
- [ ] Tests or smoke verification prove pgvector is enabled and migration history is recorded.
