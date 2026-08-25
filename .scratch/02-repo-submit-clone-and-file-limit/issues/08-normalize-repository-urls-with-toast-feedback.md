# 08 — Normalize Repository URLs With Toast Feedback

**What to build:** Add the frontend Repository URL normalization experience. The User should be able to type or paste a supported GitHub Repository URL, have it normalized on blur and submit, see the visible input update, and receive a reusable toast notice when normalization changes the value.

**Blocked by:** 02 — Submit Public Repository Jobs

Status: ready-for-agent

- [ ] Repository URL normalization runs on blur and on submit.
- [ ] Supported GitHub HTTPS Repository URLs are normalized to the stored Repository URL form.
- [ ] If normalization changes the URL, the visible input value is updated.
- [ ] If normalization changes the URL, a reusable toast notice is shown.
- [ ] The toast system is implemented as a reusable frontend primitive, not one-off text tied only to this field.
- [ ] Frontend submission sends the normalized Repository URL to the backend.
- [ ] Frontend tests cover blur normalization, submit normalization, visible value replacement, toast display, and submission payload shape.
