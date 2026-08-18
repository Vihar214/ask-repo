# 03 — Logout To Fresh Guest Flow

**What to build:** Let a Logged-In User log out and return to the normal first-visit guest bootstrap flow. Logout should delete only the active Logged-In Session, clear the cookie, return the browser to `/`, and let the frontend create a brand new Guest Session through the existing bootstrap path without deleting logged-in account data.

**Blocked by:** 02 — GitHub OAuth Login And Logged-In Session

**Status:** ready-for-human

- [ ] Logout deletes only the active Logged-In Session and does not delete logged-in repositories, chats, indexes, embeddings, symbols, references, skipped files, or other persistent account data.
- [ ] After logout, the browser follows the normal guest bootstrap path and receives a brand new Guest Session.
- [ ] The frontend returns to guest session state and shows the Guest Data Warning after logout.
- [ ] Expired or invalid session ids encountered during session bootstrap result in a new Guest Session rather than reuse of dead session state.
- [ ] Tests verify logout behavior and stale-session replacement through public HTTP and frontend seams.
