# Fork Divergence Manifest & Merge Playbook

This fork tracks [voidauth/voidauth](https://github.com/voidauth/voidauth) on branch `main` and carries intentional changes on `mitch-voidauth`. This document is the authoritative list of every divergence and the procedure for absorbing upstream updates. **Update this file whenever a merge adds or retires a divergence.**

## Per-clone setup

```bash
git config merge.ours.driver true   # activates merge=ours for docs/*, SECURITY.md, issue/PR templates
git remote add upstream https://github.com/voidauth/voidauth.git
```

## Fork-only files (upstream never has these)

`Dockerfile.fork`, `compose.fork.yml`, `.github/workflows/release-fork.yml`, `.github/workflows/docs-fork.yml`, `.github/workflows/upstream-drift.yml`, `.github/README.md`, `SECURITY.md`, `CHANGELOG.md`, `AGENTS.md`, `FORK.md`, `docs/.vitepress/`, `docs/package.json`, `docs/index.md`, `docs/welcome.md`, `docs/LDAP-Sync.md`, `server/ldap/sync.ts`, `test/`, `scripts/`, `migrations/20260825000000_totp_last_used_timestep.ts`

`README.md` (root) intentionally stays upstream-clean.

## Hardening divergences (must survive every merge)

| # | File | Divergence | Re-verify |
|---|---|---|---|
| H1 | `server/util/argon2id.ts` | Argon2 verification runs in a worker-thread pool (off the event loop); upstream uses `argon2Sync` inline | `npm run fork:check` + `npm run test:totp` |
| H2 | `server/ldap/server.ts` | Bind-failure backoff (`BIND_FAILURES_BEFORE_BACKOFF`), `MAX_CONNECTIONS`, `IDLE_TIMEOUT_MS` | `npm run fork:check` |
| H3 | `shared/constants.ts` | `SESSION: 14 * DAY`, `GRANT: 90 * DAY` (upstream: 1 year); `EMAIL_LOG: 30 * DAY` retention TTL | `npm run fork:check` |
| H4 | `server/routes/user.ts` | `return` after password-strength 422; `endSessions(user.id)` after password change | `npm run fork:check` |
| H5 | `server/routes/public.ts` | `return` after password-strength 422; successful reset deletes **all** outstanding tokens for the user | `npm run fork:check` |
| H6 | `server/routes/auth.ts` | `send_verify_email` skips when account verified or an active verification exists (anti mail-bombing) | `npm run fork:check` |
| H7 | `server/db/totp.ts`, `shared/db/TOTP.ts` | `lastUsedTimestep` replay protection; enrollment promotion does not consume a timestep | `npm run test:totp` |
| H8 | `server/db/tableMaintenance.ts` | `email_log` retention purge via `TTLs.EMAIL_LOG` | `npm run fork:check` |
| H9 | `server/util/email.ts` | `redactChallenges()` strips secrets from stored email bodies | `npm run fork:check` |
| H10 | `server/routes/api.ts` | `basicAuthRateLimit` (`skipSuccessfulRequests: true`) on `/api/authz/forward-auth` and `/authz/auth-request` | `npm run fork:check` |
| H11 | `server/oidc/provider.ts` | `clientBasedCORS` restricted to registered redirect/post-logout origins (wildcards supported); case-insensitive client group matching (`LOWER(...)`) in `upsertClient` | `npm run fork:check`; **known re-apply hotspot** — upstream refactors this file heavily |
| H12 | `server/routes/interaction.ts` | `DUMMY_PASSWORD_HASH` timing equalization for unknown usernames at login | `npm run fork:check` |
| H13 | `server/cli/server.ts` | CSP `script-src` mirrored from Angular's autoCsp meta (`extractAngularScriptSrc`); `<base href>` always ends with `/`; `APP_TITLE`/`APP_LOGO`/`basePath` HTML-escaped in `modifyIndex`; asset-like unresolved paths return 404 instead of SPA index | `npm run fork:check`; **known re-apply hotspot** |
| H14 | `frontend/src/app/pages/admin/emails/emails.component.ts` | Email preview iframe `sandbox=""` | `npm run fork:check` |
| H15 | `frontend/src/app/services/auth.service.ts` | `createInteraction` treats opaque status-0 responses as success | `npm run fork:check` |
| H16 | `frontend/src/app/pages/mfa/mfa.component.ts` | MFA cancel navigates to `/` with `replaceUrl` (never `history.back()`) | `npm run fork:check` |

## Fork feature divergences

| # | File | Feature | Notes |
|---|---|---|---|
| F1 | `server/ldap/sync.ts`, `server/util/config.ts`, `docs/LDAP-Sync.md` | LDAP Directory Sync: `LDAP_SYNC_*` env vars, `LDAP_SYNC_LINK_EXISTING_USERS` opt-in linking, provenance-based admin revocation (`SYNC_ACTOR_ID`), admin-group diagnostics | `npm run test:ldap-sync` |
| F2 | Admin Settings page | `server/db/settings.ts`, `server/routes/admin.ts` settings routes, `applySettingsFromDB()` in `server/util/config.ts`, `frontend/src/app/pages/admin/settings/`, `admin.common.*` + `admin.settings.*` i18n keys | Verify i18n keys survive merges (see playbook step 5) |
| F3 | `Dockerfile.fork`, `compose.fork.yml` | Public-node deployment variant, LDAP port 3890 | Mirror any upstream `Dockerfile` stage/FROM changes (digest pins) into `Dockerfile.fork` |

## Merge playbook

1. **Pre-flight**: `git fetch upstream` → `git log --oneline <base>..upstream/main` → `git diff --stat <base>..upstream/main -- server/ shared/ frontend/src/ Dockerfile package.json`. Confirm this manifest is current.
2. **Branch**: work on an `upstream-sync` branch off `mitch-voidauth`; `git merge main`.
3. **Resolve conflicts using this manifest** — keep the fork fix AND adopt the upstream change wherever both modified the same region. Known re-apply hotspots: H11 (`provider.ts`), H13 (`cli/server.ts`), H2 (`ldap/server.ts`), F1/F2 config props.
4. **Retired divergences**: if upstream now implements something we forked (e.g. `TRUST_PROXY` → upstream `TRUSTED_PROXIES`), remove the fork version everywhere (code, switch case, docs) and delete the manifest row.
5. **i18n**: for `frontend/public/i18n/en-US.json` conflicts, take upstream's file wholesale, then re-add fork-only keys (currently the `admin.settings.*` / `admin.common.actions.save` / `app.navigation.admin.settings` trees). Watch for upstream reshaping shared keys into `{label, tooltip}` objects — those win; check no fork component still references the flat key. Then `npm run i18n:normalize`.
6. **Lockfiles**: `package.json` is a union (fork: `ldapts`, `strict-event-emitter-types`; upstream: everything else). Run `npm install --package-lock-only` in root and `frontend/`, then full `npm install` in both.
7. **Semantic sweep**: `npm run fork:check` — every row must PASS. Fix anything that silently dropped.
8. **Integration**: start Postgres per `test/README.md`, run `npm run test:totp` and `npm run test:ldap-sync` — all assertions must pass.
9. **Build**: `npx tsc && npx eslint ./ && npm run server:build`; frontend AOT build happens inside the Docker build (local Node may be below Angular's floor).
10. **Runtime smoke**: build the image and run `scripts/smoke.ps1 -Image <tag>` — all checks must pass.
11. **Post-merge**: update the upstream-base table in `CHANGELOG.md`; mirror any upstream `Dockerfile` changes into `Dockerfile.fork`; update this manifest if divergences changed; cherry-pick valuable upstream docs changes into the fork docs (they are `merge=ours`-protected, so they do not land automatically).

## History

| Upstream base | Merged on | Notes |
|---|---|---|
| `157a1a1` | 2026-07-22 | Initial fork base |
| `b34e524` | 2026-08-26 | Custom Claims, TRUSTED_PROXIES, supply-chain hardening; TRUST_PROXY retired |
