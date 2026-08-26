# 02 — Submit Public Repository Jobs

**What to build:** Let a User submit a public GitHub Repository URL through `POST /repos`. The backend should require the existing Session CSRF Token, normalize and validate the Repository URL, reject unsupported URL forms, create Repository and Repository Job records, and enqueue a clone/count Repository Job payload with no Private Repository Token.

**Blocked by:** 01 — Persist Repository And Repository Job Records

Status: ready-for-agent

- [ ] `POST /repos` rejects requests without a valid Session CSRF Token.
- [ ] Public Repository submission accepts supported GitHub HTTPS Repository URL forms and stores only the normalized Repository URL.
- [ ] Unsupported, invalid, SSH, token-in-URL, non-GitHub, branch, file, and subpath URL forms are rejected with stable failure codes.
- [ ] Public submissions reject accidental Private Repository Token input.
- [ ] Successful public submission creates a Repository and queued Repository Job owned by the current Guest Session or Logged-In User.
- [ ] Successful public submission enqueues a clone/count payload with `privateRepositoryToken` set to `null`.
- [ ] Backend tests verify HTTP behavior and queue payload shape without relying on route helper internals.
