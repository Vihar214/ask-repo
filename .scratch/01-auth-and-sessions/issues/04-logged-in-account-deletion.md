# 04 — Logged-In Account Deletion

**What to build:** Let a Logged-In User permanently delete their account from the app. Account Deletion should remove the Logged-In User row and all user-owned persistent data, clear active Sessions, and return the browser to signed-out guest behavior after deletion.

**Blocked by:** 02 — GitHub OAuth Login And Logged-In Session

**Status:** ready-for-human

- [ ] Logged-In Users have an account-deletion path in the auth surface.
- [ ] Account Deletion permanently deletes the Logged-In User and all user-owned repositories, repository indexes, file records, chunks, embeddings, symbols, references, skipped file records, chats, stored generation outputs tied to those chats, and active Sessions.
- [ ] Account Deletion is distinct from logout and does not leave partial account-owned data behind.
- [ ] After account deletion, the browser returns to signed-out guest behavior.
- [ ] Tests verify the deleted data set and post-deletion guest state through backend HTTP and frontend seams.
