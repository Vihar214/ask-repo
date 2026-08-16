# 07 — Tie Foundation Smoke Verification Together

**What to build:** Provide the final foundation verification path so a developer or future agent can prove infrastructure, migrations, backend, worker, and frontend all work together through documented smoke commands.

**Blocked by:** 03 — Apply Raw SQL Migrations, 04 — Expose Backend Health And Readiness, 05 — Add Worker Smoke Check, 06 — Render Frontend Shell

**Status:** ready-for-agent

- [ ] Documentation lists the local commands for infrastructure, migrations, backend, worker, frontend, and smoke checks.
- [ ] Foundation smoke verification covers migrations, backend health/readiness, worker smoke behavior, and frontend shell rendering.
- [ ] Verification does not require auth, repository submission, indexing, retrieval, chat, or CI-only tooling.
- [ ] The foundation can be verified from a fresh checkout after dependency installation and environment setup.
- [ ] Any remaining foundation setup assumptions are documented clearly.
