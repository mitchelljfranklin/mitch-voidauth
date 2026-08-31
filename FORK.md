# Fork Divergence Manifest & Merge Playbook

This fork tracks [voidauth/voidauth](https://github.com/voidauth/voidauth) on branch `main` and carries intentional changes on `mitch-voidauth`. This document is the authoritative list of every divergence and the procedure for absorbing upstream updates. **Update this file whenever a merge adds or retires a divergence.**

## Per-clone setup

```bash
git config merge.ours.driver true   # activates merge=ours for docs/*, SECURITY.md, issue/PR templates
git remote add upstream https://github.com/voidauth/voidauth.git
```

## Fork-only files (upstream never has these)

`Dockerfile.fork`, `compose.fork.yml`, `.github/workflows/release-fork.yml`, `.github/workflows/docs-fork.yml`, `.github/workflows/upstream-drift.yml`, `.github/README.md`, `SECURITY.md`, `CHANGELOG.md`, `AGENTS.md`, `FORK.md`, `docs/.vitepress/`, `docs/package.json`, `docs/index.md`, `docs/welcome.md`, `docs/LDAP-Sync.md`, `server/ldap/sync.ts`, `server/ldap/hardening.ts`, `server/cli/index-html.ts`, `server/util/cors.ts`, `server/util/login-timing.ts`, `server/util/redact.ts`, `test/`, `scripts/`, `migrations/20260825000000_totp_last_used_timestep.ts`

`README.md` (root) intentionally stays upstream-clean.

## Hardening divergences (must survive every merge)

| # | File | Divergence | Re-verify |
|---|---|---|---|
| H1 | `server/util/argon2id.ts` | Argon2 verification runs in a worker-thread pool (off the event loop); upstream uses `argon2Sync` inline | `npm run fork:check` + `npm run test:totp` |
| H2 | `server/ldap/hardening.ts` | Bind-failure backoff (`BIND_FAILURES_BEFORE_BACKOFF`), `MAX_CONNECTIONS`, `IDLE_TIMEOUT_MS`; `server.ts` keeps seams (import, connection guard, blocked check, 5 record calls) | `npm run fork:check` + `npm run test:ldap-guard` |
| H3 | `shared/constants.ts` | `SESSION: 14 * DAY`, `GRANT: 90 * DAY` (upstream: 1 year); `EMAIL_LOG: 30 * DAY` retention TTL | `npm run fork:check` |
| H4 | `server/routes/user.ts` | `return` after password-strength 422; `endSessions(user.id)` after password change | `npm run fork:check` |
| H5 | `server/routes/public.ts` | `return` after password-strength 422; successful reset deletes **all** outstanding tokens for the user | `npm run fork:check` |
| H6 | `server/routes/auth.ts` | `send_verify_email` skips when account verified or an active verification exists (anti mail-bombing) | `npm run fork:check` |
| H7 | `server/db/totp.ts`, `shared/db/TOTP.ts` | `lastUsedTimestep` replay protection; enrollment promotion does not consume a timestep | `npm run test:totp` |
| H8 | `server/db/tableMaintenance.ts` | `email_log` retention purge via `TTLs.EMAIL_LOG` | `npm run fork:check` |
| H9 | `server/util/redact.ts` | `redactChallenges()` strips secrets from stored email bodies; `email.ts` keeps `body: redactChallenges(...)` seams | `npm run fork:check` |
| H10 | `server/util/rateLimit.ts` | `basicAuthRateLimit` (`skipSuccessfulRequests: true`); `api.ts` keeps seams on `/api/authz/forward-auth` and `/authz/auth-request` | `npm run fork:check` |
| H11 | `server/util/cors.ts` | `clientBasedCORS` restricted to registered redirect/post-logout origins (wildcards supported); `provider.ts` keeps a one-line seam. Case-insensitive client group matching (`LOWER(...)`) in `upsertClient` | `npm run fork:check` |
| H12 | `server/util/login-timing.ts` | `timingEqualizedReject` equalizes login timing for unknown usernames; `interaction.ts` keeps a one-line seam | `npm run fork:check` |
| H13 | `server/cli/index-html.ts` | HTML-escaping helpers, CSP `script-src` mirror (`extractAngularScriptSrc`), asset-404 guard; `server.ts` keeps seams (title/logo escaping, CSP header, guard). Note: base-href trailing slash **retired** — upstream fixed it | `npm run fork:check` |
| H14 | `frontend/src/app/pages/admin/emails/emails.component.ts` | Email preview iframe `sandbox=""` | `npm run fork:check` |
| H15 | `frontend/src/app/services/auth.service.ts` | `createInteraction` treats opaque status-0 responses as success | `npm run fork:check` |
| H16 | `frontend/src/app/pages/mfa/mfa.component.ts` | MFA cancel navigates to `/` with `replaceUrl` (never `history.back()`) | `npm run fork:check` |

## Fork feature divergences

| # | File | Feature | Notes |
|---|---|---|---|
| F1 | `server/ldap/sync.ts`, `server/util/config.ts`, `docs/LDAP-Sync.md` | LDAP Directory Sync: `LDAP_SYNC_*` env vars, `LDAP_SYNC_LINK_EXISTING_USERS` opt-in linking, provenance-based admin revocation (`SYNC_ACTOR_ID`), admin-group diagnostics. `server.ts` keeps seams for the sync import + interval scheduling | `npm run test:ldap-sync` |
| F2 | Admin Settings page | `server/db/settings.ts`, `server/routes/admin.ts` settings routes, `applySettingsFromDB()` in `server/util/config.ts`, `frontend/src/app/pages/admin/settings/`, `admin.common.*` + `admin.settings.*` i18n keys. `server.ts` keeps a seam for the settings load in `doMaintenance` (the `APP_LOGO` injection block is also a seam) | Verify i18n keys survive merges (see playbook step 5) |
| F3 | `Dockerfile.fork`, `compose.fork.yml` | Public-node deployment variant, LDAP port 3890 | Mirror any upstream `Dockerfile` stage/FROM changes (digest pins) into `Dockerfile.fork` |

## Merge playbook

1. **Pre-flight**: `git fetch upstream` → `git log --oneline <base>..upstream/main` → `git diff --stat <base>..upstream/main -- server/ shared/ frontend/src/ Dockerfile package.json`. Confirm this manifest is current.
2. **Branch**: work on an `upstream-sync` branch off `mitch-voidauth`; `git merge main`.
3. **Resolve shared-file conflicts by taking upstream's side wholesale**: for any conflicted file listed in `scripts/fork-seams.mjs` run `git checkout --theirs <file>`, then `npm run seams:apply` re-inserts all fork seams. A `STALE` result means upstream reshaped a seam region — re-apply that seam by hand and update its anchor in `scripts/fork-seams.mjs`. Non-seam files (fork-owned files, and the owned-file divergences below) resolve manually.
4. **Retired divergences**: if upstream now implements something we forked, remove the fork version everywhere (code, switch case, docs) and delete the manifest row. Retired so far: `TRUST_PROXY` (superseded by upstream `TRUSTED_PROXIES`), base-href trailing slash (upstream fixed).
5. **i18n**: for `frontend/public/i18n/en-US.json` conflicts, take upstream's file wholesale, then re-add fork-only keys (currently the `admin.settings.*` / `admin.common.actions.save` / `app.navigation.admin.settings` trees). Watch for upstream reshaping shared keys into `{label, tooltip}` objects — those win; check no fork component still references the flat key. Then `npm run i18n:normalize`.
6. **Lockfiles**: `package.json` is a union (fork: `ldapts`, `strict-event-emitter-types`; upstream: everything else). Run `npm install --package-lock-only` in root and `frontend/`, then full `npm install` in both.
7. **Semantic sweep**: `npm run fork:check` — every seam and owned-file divergence must be present. Fix anything that silently dropped.
8. **Integration**: start Postgres per `test/README.md`, run `npm run test:totp` and `npm run test:ldap-sync` — all assertions must pass.
9. **Build**: `npx tsc && npx eslint ./ && npm run server:build`; frontend AOT build happens inside the Docker build (local Node may be below Angular's floor).
10. **Runtime smoke**: build the image and run `scripts/smoke.ps1 -Image <tag>` — all checks must pass.
11. **Post-merge**: run `npm run base:set` (or `node scripts/set-base.mjs <sha> <date> <notes>`) to record the new upstream base in FORK.md and CHANGELOG.md; mirror any upstream `Dockerfile` changes into `Dockerfile.fork`; update this manifest if divergences changed; cherry-pick valuable upstream docs changes into the fork docs (they are `merge=ours`-protected, so they do not land automatically).

## History

| Upstream base | Merged on | Notes |
|---|---|---|
| `157a1a1` | 2026-07-22 | Initial fork base |
| `b34e524` | 2026-08-26 | Custom Claims, TRUSTED_PROXIES, supply-chain hardening; TRUST_PROXY retired |
| `b577ba9` | 2026-08-30 | ProxyAuth overmatching security fix, TOTP account lockout, oidc-provider readonly-metadata fix, passkey wording |

## Accepted scanner findings

The deployment is regularly scanned with OWASP ZAP. The following Medium-level
CSP findings are **accepted design trade-offs** — do not re-litigate them on
future scans without revisiting the reasoning:

| Finding | Why accepted |
|---|---|
| `form-action 'self' https:` | An OIDC provider must form-post responses to arbitrary client redirect URIs; origins are per-deployment dynamic and cannot be enumerated statically |
| `img-src 'self' data: https:` | Consent-page client logos come from client-configured `https:` URIs (dynamic per deployment) |
| `style-src 'unsafe-inline'` | Angular injects critical styles at bootstrap; removal requires restructuring style delivery for marginal gain (script execution is hash-pinned via `strict-dynamic`) |
| Loosely scoped session cookies (`domain=<base domain>`) | Inherent to cross-subdomain SSO — `SESSION_DOMAIN` must cover all SSO subdomains |

Fixed as a result of the first scan: `worker-src` pinned to `'self'`,
`Cache-Control` on served index responses, VCS probe paths (`._darcs`,
`.git`, …) now 404 instead of receiving the SPA index.
