# Changelog

## Upstream base

This fork tracks [voidauth/voidauth](https://github.com/voidauth/voidauth).

| Upstream base | Merged on |
|---|---|
| `157a1a1` | 2026-07-22 |

## Fork changes

### [Unreleased]

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
