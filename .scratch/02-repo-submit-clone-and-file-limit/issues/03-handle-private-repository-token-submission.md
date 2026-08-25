# 03 — Handle Private Repository Token Submission

**What to build:** Add explicit private Repository submission support. A User should be able to mark a Repository as private, provide a Private Repository Token, submit it through the same Repository submission flow, and have the token passed only to the clone/count job without being stored in Postgres.

**Blocked by:** 02 — Submit Public Repository Jobs

**Status:** ready-for-agent

- [ ] The frontend exposes a private Repository toggle that reveals a Private Repository Token field.
- [ ] The Private Repository Token field has show/hide behavior and helper copy saying it is used only for this clone and is not stored.
- [ ] Client-side validation rejects private submission with an empty token.
- [ ] Backend validation requires a token when `isPrivate` is true and rejects tokens over the agreed maximum length.
- [ ] Private Repository submission creates or reuses the same Repository and Repository Job flow as public submission.
- [ ] The clone/count payload includes the Private Repository Token only for private submissions.
- [ ] Tests verify Private Repository Tokens are never persisted in Repository or Repository Job database fields.
