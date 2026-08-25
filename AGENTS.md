## Agent skills

### Read order

Before planning or coding, read:

1. `docs/CONTEXT.md` for project vocabulary.
2. `docs/overview.md` for product scope.
3. `docs/architecture.md` for system design.
4. `docs/decisions.md` for locked/deferred/open decisions.
5. For frontend work, `docs/agents/frontend.md` for frontend structure rules.
6. The relevant `.scratch/<feature>/spec.md` and ticket file before implementation.

### Issue tracker

Issues and specs live as local Markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Use single-context domain docs: `docs/CONTEXT.md` plus `docs/adr/`. See `docs/agents/domain.md`.

### Frontend rules

For frontend implementation or refactors, follow `docs/agents/frontend.md`.

### Workflow

Use this flow for feature work:

1. `/grill-with-docs`
2. `/to-spec`
3. `/to-tickets`
4. `/implement`
5. `/tdd`
6. `/code-review`

Keep `/grill-with-docs`, `/to-spec`, and `/to-tickets` in one continuous context when possible. Start a fresh implementation context per ticket.

### Build rules

- Build only the current ticket scope.
- Do not implement deferred v2 items unless the ticket explicitly reopens them.
- Keep Node and Python separated by Redis/Postgres boundaries.
- Do not persist GitHub private repository tokens.
- Delete temp clones after indexing succeeds or fails.
- Use tests at agreed public seams before implementation.
