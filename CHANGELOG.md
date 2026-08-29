# Changelog

## Upstream base

This fork tracks [voidauth/voidauth](https://github.com/voidauth/voidauth).

| Upstream base | Merged on |
|---|---|
| `b34e524` | 2026-08-26 |

## Fork changes

### [Unreleased]

#### Upstream sync

- Merged 52 upstream commits: **Custom Claims** feature (users/groups/invitations, new admin page, `custom_claims` migration), **`TRUSTED_PROXIES`** environment variable (per-proxy/CIDR trust replacing the fork's `TRUST_PROXY` boolean — remove `TRUST_PROXY` from your environment when upgrading; the default `loopback, linklocal, uniquelocal` covers typical reverse-proxy setups), supply-chain hardening (GitHub Actions pinned to SHAs, base image digest-pinned, dependabot), prototype-pollution fix, COOP disabled for popup OIDC flows, and ru-RU locale
- Angular dependency pins aligned with upstream's Angular 22 line

#### Developer tooling

- **Fork logic extracted into fork-owned modules** — `server/cli/index-html.ts` (escaping, CSP mirror, asset-404 guard), `server/util/cors.ts`, `server/util/login-timing.ts`, `server/util/redact.ts`, `server/ldap/hardening.ts` (bind backoff, connection cap, idle timeout) — so upstream-hot files (`server.ts`, `provider.ts`, `interaction.ts`, `email.ts`, `api.ts`, `ldap/server.ts`) carry only single-line seams
- `scripts/fork-seams.mjs` + `npm run seams:apply` — after a merge, shared-file conflicts resolve with `git checkout --theirs` + one command that re-inserts all fork seams (idempotent; stale anchors fail loudly)
- `FORK.md` — authoritative fork-divergence manifest (H1-H16 hardening fixes, F1-F3 fork features) and upstream merge playbook
- `npm run fork:check` — post-merge semantic sweep asserting all divergences are still present (also catches `Dockerfile.fork` drift from upstream `Dockerfile` changes)
- `npm run i18n:normalize [--check]` — canonicalizes `en-US.json` formatting to keep i18n merges content-only
- `npm run test:totp` / `npm run test:ldap-sync` — integration harnesses in `test/` (real DB; they previously caught the weak-password and `user_group.id` bugs)
- `scripts/smoke.ps1` — runtime smoke test of a built image (base href, CSP mirroring, gated routes, migrations)
- `.github/workflows/upstream-drift.yml` — weekly check that opens an issue when upstream `main` gains commits, to keep syncs small and frequent

#### Security

Security hardening release based on a full audit. Highlights:

- **Dependencies**: applied all available security fixes via lockfile-only updates (`npm audit fix`) — resolves 7 advisories in backend tooling/runtime chains (incl. `fast-uri`, `ip-address` used by express-rate-limit) and 10 in frontend (incl. DOMPurify XSS hardening for the admin email preview); zero `package.json` version changes

- **Fixed**: missing `return` after password-strength rejection allowed weak passwords to be silently stored during self-service password change (`PATCH /api/user/password`) and unauthenticated reset (`POST /api/public/reset_password`)
- **Hardened**: embedded LDAP server — per-source bind-failure backoff (5 consecutive failures → exponential block up to 15 min), max 64 concurrent connections, 5-minute idle timeout; argon2 verification moved off the event loop into a worker-thread pool so bind floods can no longer stall HTTP/OIDC
- **Changed**: default OIDC session TTL reduced from 1 year to 14 days, grant TTL from 1 year to 90 days (existing sessions keep their original expiry until they lapse)
- **Changed**: changing your password now signs out all other sessions for that account
- **Changed**: email log bodies are stored with secret challenges redacted, and `email_log` rows are now purged after 30 days
- **Changed**: successful password reset now invalidates *all* outstanding reset tokens for the account
- **Changed**: `send_verify_email` no longer re-sends while an active verification exists or the account is already verified (prevents mail-bombing via user UUID)
- **Added**: TOTP replay protection — an accepted code cannot be reused within its validity window
- **Changed**: LDAP sync no longer links matching local accounts by default; new opt-in `LDAP_SYNC_LINK_EXISTING_USERS` flag (admin accounts are never linked). Admin rights *granted by the sync* are revoked when a user leaves the configured LDAP admin group; manually assigned admin rights on synced accounts are never touched. Warns when the configured admin group is absent from the directory or no synced user's `memberOf` lists it
- **Fixed**: CSP `script-src` now mirrors the per-build `strict-dynamic` + hash policy that Angular's autoCsp emits as a meta tag, instead of a blanket `'self'` that blocked Angular's inline bootstrap scripts; scripts stay protected at the header level even for cached copies of the page
- **Added**: `TRUST_PROXY` setting (default `true`) controlling whether `X-Forwarded-*` headers are trusted for rate-limit identity
- **Changed**: CORS for OIDC endpoints now restricted to origins of each client's registered redirect / post-logout URIs instead of any HTTPS origin
- **Changed**: failed Basic-auth attempts on ProxyAuth endpoints (`/api/authz/*`) are now additionally rate limited
- **Changed**: admin-set logo/title values are HTML-escaped when injected into the served index page
- **Hardened**: admin email preview iframe is sandboxed
- **Fixed**: served `index.html` had an empty `<base href>` on root-path deployments, so deep links (e.g. `/logout/<secret>`) resolved JS/CSS assets under the route path and rendered a white page with MIME-type console errors; the base now always ends with `/`
- **Fixed**: TOTP enrollment confirmation consumed the current timestep, so logging in immediately afterwards with the still-displayed code was rejected as a replay until the 30 s window rolled over; enrollment no longer burns a timestep and replay protection still applies to real logins
- **Changed**: unresolved asset-like paths (`.js`, `.css`, fonts, images) now return 404 instead of falling through to the SPA index page
- **Fixed**: cancelling from the MFA screen used browser history to go back, but reaching that screen involves a chain of server redirects — going back re-entered the OIDC flow and bounced straight back to MFA with a stuck loading overlay; cancel now exits deterministically to the home page, logged out
- **Changed**: the frontend no longer logs a large error object after creating an OIDC interaction; browsers report the intentional manual redirect as an opaque status-0 response, which is now handled as success
- Login responses now take equal time for unknown usernames and wrong passwords
- **Hardened from OWASP ZAP scan**: CSP `worker-src` pinned to `'self'`; served index responses now sent with `Cache-Control: no-store` (also prevents stale-index deploy issues); version-control probe paths (`._darcs`, `.git`, `.svn`, `.hg`) return 404 instead of the SPA index. Remaining scan findings are documented as accepted trade-offs in `FORK.md`

#### Added
- **Admin Settings page** — DB-backed runtime config (Admin → Settings)
  - General: APP_TITLE, DEFAULT_REDIRECT, CONTACT_EMAIL
  - Security toggles: SIGNUP, SIGNUP_REQUIRES_APPROVAL, EMAIL_VERIFICATION, MFA_REQUIRED
  - Access: PASSWORD_STRENGTH (0-4 slider), API_RATELIMIT, ADMIN_EMAILS (dropdown), DEFAULT_USER_EXPIRES_IN
  - Appearance: APP_COLOR (colour picker), APP_FONT, logo upload (SVG + PNG, stored as base64)
  - Email: SMTP_FROM
- LDAP Directory Sync — pull users and groups from external LDAP directories (Active Directory, OpenLDAP, 389 DS, LLDAP)
- VitePress documentation site at [auth.mitchforge.com](https://auth.mitchforge.com) (replaces upstream Docsify)
- Multi-arch Docker builds (amd64 + arm64) via `release-fork.yml`
- Fork-specific GitHub Actions workflows (`release-fork.yml`, `docs-fork.yml`)
- Fork-specific issue templates (YAML forms with LDAP sync fields)
- Fork-specific `SECURITY.md` (reporting scope, security model, deployment checklist)
- Fork-specific `AGENTS.md` (developer operating guide)
- Fork-specific `CHANGELOG.md` (this file)
- `Dockerfile.fork` — uses public `node:24-alpine3.22` instead of private `dhi.io/node:24-alpine3.22`
- `compose.fork.yml` — points to `ghcr.io/mitchelljfranklin/mitch-voidauth`, enables LDAP port 3890
- `.github/README.md` — fork-specific README (root `README.md` kept as upstream mirror)
- `docs/package.json` — separate VitePress dependency to avoid merge conflicts with root `package.json`

#### Changed
- Docker image: `voidauth/voidauth:latest` → `ghcr.io/mitchelljfranklin/mitch-voidauth:latest`
- Docker base image: `dhi.io/node:24-alpine3.22` → `node:24-alpine3.22` (public) in `Dockerfile.fork`
- Documentation URLs: `voidauth.app` → `auth.mitchforge.com`
- GitHub URLs: `voidauth/voidauth` → `mitchelljfranklin/mitch-voidauth`
- Issue templates: Markdown → YAML forms with LDAP sync fields and pre-submission checklists
- PR template: added lint, build, multi-arch, and fork-file checklists
- `checkPasswordHash()` in `server/db/user.ts` — extended with LDAP bind auth fallback
- `server/util/config.ts` — extended with `LDAP_SYNC_*` environment variables and DB-backed settings
- `server/ldap/directory.ts` — updated to use upstream's renamed `getLDAPUserIdByDN`
- `server/ldap/server.ts` — integrated upstream's ALS context, logging, and error handling improvements
- `eslint.config.js` — added `docs/**` and `.github/**` to ignore list
- `.gitignore` — added VitePress cache directory
- `shared/db/Flag.ts` — added `updatedAt` column
- `docs/Configuration.md` — added Admin Settings section

#### Removed
- Docsify documentation site (`docs/index.html`, `docs/_sidebar.md`, `docs/CNAME`)
- Docker Hub publishing (no credentials for `voidauth/voidauth` registry)
- `dhi.io` private registry dependency (only in `Dockerfile.fork`)
