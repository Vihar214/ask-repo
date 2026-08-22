# 01 — Guest Session Bootstrap And Warning

**What to build:** Make the app enter a complete Guest Session flow on first load. A new visitor should receive a Guest Session backed by Postgres, the frontend should learn that state from `GET /session`, and the page should show the Guest Data Warning above the repository URL input whenever the user is not logged in.

Blocked by: None — can start immediately

Status: ready-for-human

- [ ] A first-time visitor receives a new Guest Session through the normal frontend bootstrap flow.
- [ ] `GET /session` returns explicit guest session state with session kind and expiry metadata.
- [ ] Guest Sessions are stored in Postgres with the session fields required by the spec.
- [ ] The frontend renders guest session state and the static Guest Data Warning above the repository URL input.
- [ ] Tests verify Guest Session bootstrap behavior through HTTP and frontend shell seams.
