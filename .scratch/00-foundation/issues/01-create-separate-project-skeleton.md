# 01 — Create Separate Project Skeleton

**What to build:** Create the base Ask Repo project skeleton with separate frontend, backend, worker, infrastructure, migration, and docs areas. Each runtime area should own its own dependency setup, with no root monorepo workspace.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Frontend, backend, worker, infrastructure, and migration areas exist with clear ownership.
- [ ] Frontend and backend use separate Yarn v4 project setup through Corepack.
- [ ] Worker uses uv project setup.
- [ ] No root package workspace or shared dependency manifest is introduced.
- [ ] The project documents how each runtime area should install and start locally.
