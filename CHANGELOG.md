# Changelog

## Upstream base

This fork tracks [voidauth/voidauth](https://github.com/voidauth/voidauth).

| Upstream base | Merged on |
|---|---|
| `157a1a1` | 2026-07-22 |

## Fork changes

### [Unreleased]

#### Security

Security hardening release based on a full audit. Highlights:

- **Fixed**: missing `return` after password-strength rejection allowed weak passwords to be silently stored during self-service password change (`PATCH /api/user/password`) and unauthenticated reset (`POST /api/public/reset_password`)
- **Hardened**: embedded LDAP server — per-source bind-failure backoff (5 consecutive failures → exponential block up to 15 min), max 64 concurrent connections, 5-minute idle timeout; argon2 verification moved off the event loop into a worker-thread pool so bind floods can no longer stall HTTP/OIDC
- **Changed**: default OIDC session TTL reduced from 1 year to 14 days, grant TTL from 1 year to 90 days (existing sessions keep their original expiry until they lapse)
- **Changed**: changing your password now signs out all other sessions for that account
- **Changed**: email log bodies are stored with secret challenges redacted, and `email_log` rows are now purged after 30 days
- **Changed**: successful password reset now invalidates *all* outstanding reset tokens for the account
- **Changed**: `send_verify_email` no longer re-sends while an active verification exists or the account is already verified (prevents mail-bombing via user UUID)
- **Added**: TOTP replay protection — an accepted code cannot be reused within its validity window
- **Changed**: LDAP sync no longer links matching local accounts by default; new opt-in `LDAP_SYNC_LINK_EXISTING_USERS` flag (admin accounts are never linked). LDAP-synced users removed from the configured LDAP admin group lose the built-in admin group automatically
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
