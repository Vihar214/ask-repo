# 02 — GitHub OAuth Login And Logged-In Session

**What to build:** Let a Guest User or returning user log in with GitHub OAuth and land back in the app with a persistent Logged-In Session. The backend should handle OAuth start and callback, create or reuse the Logged-In User, establish the Logged-In Session, and return the frontend to a logged-in state after redirecting to `/`.

**Blocked by:** 01 — Guest Session Bootstrap And Warning

**Status:** ready-for-human

- [ ] GitHub OAuth start and callback routes work end to end through the backend-owned login flow.
- [ ] OAuth state is tied to the current Session and validated on callback.
- [ ] Successful OAuth creates or reuses the Logged-In User keyed by GitHub user id.
- [ ] Successful OAuth creates a persistent Logged-In Session with rolling expiry behavior.
- [ ] The frontend reloads into logged-in state after the backend redirects to `/`.
- [ ] Tests verify successful login, returning-user login, and OAuth failure fallback using mocked GitHub responses.
