Status: ready-for-agent

# Auth And Sessions Spec

## Problem Statement

Ask Repo currently has foundation infrastructure and a minimal frontend shell, but it does not yet have authentication or session behavior. A user cannot continue across browser restarts with a Logged-In Session, cannot sign in with GitHub OAuth, cannot log out, cannot delete their account, and cannot tell whether the app sees them as a Guest User or a Logged-In User.

This also leaves the product with no defined behavior for temporary guest usage. The app needs a clear Guest Session model, a clear Logged-In Session model, and honest user-facing behavior around the fact that guest-created data is temporary and will be lost if the user logs in later.

## Solution

Add v0 authentication and session support with GitHub OAuth for login, Postgres-backed Sessions, logged-in account deletion, and a minimal frontend auth surface.

The user should be able to open the app, see whether they are a Guest User or a Logged-In User, log in with GitHub, log out, delete their Logged-In User account, and return later with a persistent Logged-In Session until they choose deletion. A Guest User should see a warning above the repository URL input that guest-created data is temporary and will be lost. The backend should expose a small auth/session API, manage signed HTTP-only cookies, create fresh Guest Sessions when needed, return explicit session state to the frontend, and permanently remove user-owned data when account deletion is confirmed.

## User Stories

1. As a Guest User, I want the app to create a Guest Session for me, so that I can use Ask Repo without logging in first.
2. As a Guest User, I want to see that I am using the app as a guest, so that I understand my current session state.
3. As a Guest User, I want to see a warning above the repository URL input, so that I know guest-created data is temporary.
4. As a Guest User, I want the warning to appear without extra clicks or acknowledgements, so that the temporary-data rule is obvious.
5. As a Guest User, I want to log in with GitHub OAuth, so that I can start using a persistent Logged-In Session.
6. As a Logged-In User, I want my session to persist across browser restarts, so that I do not need to log in every time.
7. As a Logged-In User, I want my session to roll forward while I actively use the app, so that normal usage does not sign me out unexpectedly.
8. As a Logged-In User, I want to log out explicitly, so that I can end my current browser session.
9. As a Logged-In User, I want logout to delete only my active Logged-In Session, so that my stored repositories and chats are not deleted.
10. As a Logged-In User, I want to delete my account, so that I can permanently remove my Ask Repo presence and stored data.
11. As a Logged-In User, I want account deletion to remove my repositories, chats, indexes, embeddings, symbols, references, skipped files, and Sessions, so that my user-owned data does not remain behind.
12. As a returning user, I want Ask Repo to recognize my GitHub identity, so that the app can attach me to the same user account on later logins.
13. As a developer, I want Session state returned from one bootstrap endpoint, so that the frontend can initialize from a single source of truth.
14. As a developer, I want Guest Sessions and Logged-In Sessions stored in Postgres, so that session lifecycle is explicit and queryable.
15. As a developer, I want Session rows to carry expiry and last-seen metadata, so that rolling expiry and later cleanup work have a clear foundation.
16. As a developer, I want GitHub OAuth handled by the backend, so that secrets, callback validation, and cookie mutation stay on the server.
17. As a developer, I want OAuth state tied to a Session, so that callback validation is bound to the browser that started login.
18. As a developer, I want CSRF protection tied to a Session, so that future cookie-authenticated state-changing routes have a clear protection seam.
19. As a user with an expired Session, I want the app to tell me my session expired, so that the fresh Guest Session behavior is not silent or confusing.
20. As a user with an invalid or deleted Session, I want the app to recover into a fresh Guest Session, so that I can continue using the product instead of getting stuck.
21. As a user who denies GitHub OAuth or hits an OAuth failure, I want to remain a Guest User, so that a failed login attempt does not break my current session state.
22. As a user who is already logged in, I want a repeated GitHub login flow to refresh my authenticated state, so that re-authentication still works.
23. As a developer, I want minimal user identity data stored from GitHub OAuth, so that v0 can recognize returning users without building profile-editing features.
24. As a developer, I want the frontend auth surface to stay small, so that auth can ship without pulling in dashboard or repository-submission implementation.
25. As a future agent, I want auth behavior tested through HTTP and frontend bootstrap seams, so that later refactors do not depend on storage internals.
26. As a future contributor, I want guest-data-loss behavior to be explicit in the spec, so that later work does not silently invent migration or merge logic.
27. As a future contributor, I want account-deletion behavior to list exactly which user-owned data is deleted, so that later features do not leave partial user data behind.

## Implementation Decisions

- GitHub OAuth is the only v0 login mechanism.
- GitHub OAuth is used for account identity only. It is not used for private repository access.
- The backend owns GitHub OAuth start, callback handling, Session mutation, OAuth state validation, and redirects back to the frontend root.
- The backend API surface for this feature is:
  - `GET /session`
  - `GET /auth/github/start`
  - `GET /auth/github/callback`
  - `POST /auth/logout`
  - `DELETE /account`
- `GET /session` is the frontend bootstrap seam for auth/session state. It will return an explicit session shape rather than forcing the frontend to infer state from nullable user data alone.
- Session responses will include at least session kind, expiry metadata, and whether the current browser recovered from an expired Session into a new Guest Session.
- The frontend will render immediately, then reconcile auth/session state after the `GET /session` bootstrap completes.
- The frontend auth surface in scope is minimal:
  - visible session state
  - `Log in with GitHub`
  - `Log out`
  - repository URL input shell
  - static Guest Data Warning text above the repository URL input when the user is not logged in
- The repository URL input added here is shell-only. It does not implement real repository submission behavior.
- Sessions will be stored in Postgres, not Redis and not signed-cookie payloads.
- Sessions will use a single table with explicit session kind rather than separate guest and logged-in tables.
- Session rows will include an explicit kind for `guest` or `logged_in`, a nullable user reference for Logged-In Sessions, `expires_at`, `last_seen_at`, and timestamps needed for lifecycle tracking.
- Guest Session cookies will be browser-session cookies with no persistent max age. The server will still enforce a hard 24-hour Session expiry.
- Logged-In Session cookies will be persistent cookies with a 30-day max age. The backend will roll forward logged-in Session expiry on active use.
- If the backend receives an expired, invalid, or deleted Session id, it will treat the request as anonymous, create a fresh Guest Session on the next `GET /session`, and surface that recovery to the frontend so the user can be informed.
- Logout deletes only the current Logged-In Session. It does not delete user-owned repositories, chats, indexes, symbols, references, vectors, or other persistent logged-in data.
- Account deletion is in scope for this feature.
- Account deletion is only available to a Logged-In User.
- Account deletion permanently deletes the Logged-In User row and all user-owned persistent data, including repositories, repository indexes, file records, chunks, embeddings, symbols, references, skipped file records, chats, stored generation outputs tied to those chats, and active Sessions.
- Account deletion is distinct from logout. Logout deletes only the active Logged-In Session; Account Deletion deletes the account and all user-owned data.
- If a Guest User logs in or signs up, guest-created data is lost. This feature does not migrate guest-created data into a Logged-In User account.
- The Guest Data Warning is static visible text, not an acknowledgement flow, not a modal, and not a separate API endpoint.
- GitHub OAuth failure, denied consent, or invalid callback state returns the browser to Guest Session behavior rather than creating a partial Logged-In Session.
- User accounts will store only the minimal GitHub identity snapshot needed for v0:
  - GitHub user id
  - GitHub username
  - nullable avatar URL
  - nullable email
  - created and updated timestamps
  - `last_login_at`
- User identity uniqueness is keyed by GitHub user id.
- Existing user login in v0 updates `last_login_at` but does not refresh the stored GitHub username, avatar URL, or email snapshot.
- The backend will request only minimal GitHub OAuth identity scope. It will not request repository access scope.
- OAuth state is tied to the current Session so callback verification is bound to the browser that initiated login.
- CSRF protection will be established as part of the Session model so future state-changing cookie-authenticated routes have a defined seam. This feature does not need a separate acknowledgement flow for the guest warning.
- Post-auth success redirects return the browser to `/`, where the frontend reloads session state from `GET /session`.
- Re-authentication while already logged in is allowed in v0. The resulting successful GitHub identity becomes the active Logged-In Session for that browser.
- The frontend auth surface will include an account-deletion affordance for a Logged-In User, but not profile-editing behavior.

## Testing Decisions

- Tests should verify external behavior and public seams rather than implementation details such as cookie helper internals, ORM query structure, or frontend component state wiring.
- The primary backend seam is HTTP behavior for `GET /session`, `GET /auth/github/start`, `GET /auth/github/callback`, `POST /auth/logout`, and `DELETE /account`.
- Backend tests should verify Guest Session creation, Logged-In Session bootstrap state, logout behavior, account-deletion behavior, expired-session recovery, OAuth failure fallback to guest behavior, and cookie/session expiry rules.
- Backend tests should verify that logged-in logout deletes only the active Session and does not delete persistent logged-in data.
- Backend tests should verify that account deletion removes the user-owned data set defined by this spec and clears active Sessions.
- Database-oriented tests should verify the auth/session schema and migration behavior, including user identity uniqueness, Session kind shape, expiry metadata, and any OAuth state / CSRF persistence required by the backend contract.
- Frontend tests should verify the minimal auth shell behavior: session-state rendering, guest warning visibility, repo-input shell rendering, and login/logout affordances based on bootstrap state.
- Frontend tests should verify the logged-in account-deletion affordance and the post-deletion signed-out state.
- GitHub OAuth tests should use mocked provider responses and mocked callback inputs. Live GitHub network integration tests are out of scope for v0.
- Existing prior art in this repo is the foundation-style HTTP and shell tests. Auth should extend those public seams instead of inventing lower-level test-only abstractions.

## Out of Scope

- Repository submission behavior.
- Private repository token handling.
- Guest data migration or Guest Data Transfer into a Logged-In User account.
- Repository dashboard/history features.
- Account settings or profile editing.
- Multi-account browser management beyond replacing the current active Logged-In Session.
- Cleanup workers that delete expired Guest Sessions or their data.
- Retention-job implementation for guest TTL cleanup or logged-in deletion flows.
- Hosted LLM generation, indexing, retrieval, source viewing, or any repository-processing behavior.
- Live Playwright or real GitHub OAuth end-to-end tests.

## Further Notes

This feature is intentionally small in UI scope but foundational in backend scope. It establishes the product's identity model for both Guest Users and Logged-In Users and locks in the rule that guest-created data is temporary.

Later repository-submission work should consume this auth/session model instead of redefining identity or guest-warning behavior. In particular, later features should not silently introduce guest-data migration without explicitly reopening this spec.
