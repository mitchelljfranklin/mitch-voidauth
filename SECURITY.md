# Security Policy

## Supported versions

Mitch‑VoidAuth is a self‑hosted fork. Only the latest commit on the `mitch-voidauth`
branch receives security patches. We do not backport fixes to older commits.

| Branch            | Supported          |
| ----------------- | ------------------ |
| `mitch-voidauth`  | :white_check_mark: |
| main (upstream)   | See [voidauth/voidauth](https://github.com/voidauth/voidauth) |

## Reporting a vulnerability

**Do not open a public issue.** Instead, report vulnerabilities privately via:

- [GitHub Security Advisory](https://github.com/mitchelljfranklin/mitch-voidauth/security/advisories) (preferred)
- Email the maintainer directly

Include:

- Steps to reproduce
- Affected version / commit hash
- Potential impact
- Any suggested fix (optional)

We will acknowledge receipt within **72 hours** and aim to publish a fix
within **14 days**, depending on severity. Reporters will be credited
unless they request anonymity.

> **Upstream vulnerabilities:** If the vulnerability exists in upstream VoidAuth
> (not specific to this fork's LDAP sync), report it to
> [voidauth/voidauth](https://github.com/voidauth/voidauth) instead.

### What qualifies

- Authentication bypass or privilege escalation
- Session hijacking or JWT forgery
- LDAP bind authentication bypass or credential exposure
- LDAP sync injection or unauthorised directory access
- Encryption‑at‑rest weakness (`STORAGE_KEY`)
- Cryptographic weakness (predictable token, missing verification)
- Exposure of secrets (LDAP bind credentials, SMTP password, OIDC client secrets)
- Cross‑site scripting via stored content or query parameters
- Server‑side request forgery via user‑supplied URLs
- Insecure direct object reference exposing other users' data

### What does not qualify

- Missing HTTP security headers already covered by the reverse‑proxy
  deploy model (HSTS, X‑Frame‑Options — these belong on the proxy)
- Clickjacking on unauthenticated pages
- Self‑XSS (paste‑into‑console attacks)
- Denial‑of‑service via unbounded requests — rate limiting is
  in‑memory and sized for single‑container deployment
- Brute‑force on passwords protected by Argon2id hashing
- LDAP server exposure on port 3890 without TLS — the LDAP server is
  intended for trusted networks only; deployers should configure
  `LDAP_TLS_CERT_FILE` / `LDAP_TLS_KEY_FILE` if exposing externally
- Exhaustion of LDAP sync connections — the sync runs on a configurable
  schedule; if directory rate‑limiting is needed, configure it on the
  LDAP server side

---

## Security model

### Authentication

**Local users** authenticate with passwords hashed via **Argon2id** with
configurable memory, parallelism, and iteration parameters. No plaintext
passwords are stored.

**LDAP‑synced users** authenticate via LDAP simple bind against the
remote directory through `ldapts`. The LDAP bind password is sent over
the wire — TLS (`ldaps://`) should be used in production. A failed LDAP
bind falls through to the local Argon2id check (which also fails since
synced users have no local hash), so the result is always correct.

**MFA** is enforced via TOTP (time‑based one‑time password) and
WebAuthn passkeys. Per‑user and per‑group MFA requirements are
configurable.

**Sessions** use encrypted JWTs managed by `oidc‑provider`. Cookies are
HTTP‑only, Secure, and SameSite=Lax.

### Authorization

- **OIDC clients** can be restricted to specific user groups. Users not
  in the permitted groups cannot authenticate to those clients.
- **ProxyAuth** enforces domain‑level and group‑based access control at
  the reverse‑proxy boundary.
- **LDAP server** bind operations enforce user lookup and password
  verification. Search and compare operations verify authentication
  before returning results.
- **Admin panel** access requires the `auth_admins` group membership or
  equivalent.

### Encryption at rest

- **`STORAGE_KEY`** — a 32‑character string used for database‑level
  encryption. Critical for protecting all stored data.
- Secrets stored in the database (OIDC client secrets, SMTP password)
  are encrypted.
- LDAP sync bind password is read from environment variables only —
  never written to the database.

### LDAP sync security

- The sync bind DN and password are used **only** to search the directory
  and perform user bind verification. They should be a dedicated low‑
  privilege service account.
- `LDAP_SYNC_SKIP_CERT_VERIFICATION` defaults to `false`. Only set it to
  `true` in development or with self‑signed certificates.
- All `FILE__*` environment variable variants are supported for secrets
  (e.g. `FILE__LDAP_SYNC_BIND_PASSWORD`), avoiding credentials in
  plaintext compose files.

### Rate limiting

In‑memory rate limiting is applied to:
- Login endpoint
- API endpoints
- Password reset

The limiter is per‑process and correct for single‑container Docker
Compose deployment.

### Content Security Policy

Helmet applies security headers with configurable CSP. The default
policy restricts inline scripts and external resources.

---

## Deployment security checklist

1. **Set `STORAGE_KEY`** to a 32‑character random string — this
   encrypts all sensitive data at rest.
2. **Set `LDAP_SYNC_BIND_PASSWORD`** via Docker secrets or
   `FILE__LDAP_SYNC_BIND_PASSWORD` — never hardcode in compose files.
3. **Use `ldaps://`** for `LDAP_SYNC_URL` in production to encrypt
   directory traffic.
4. **Run behind a reverse proxy** (Caddy/nginx) that handles TLS
   termination, HSTS, and X‑Frame‑Options.
5. **Do not expose port 3000** directly to the internet.
6. **Only expose port 3890** (LDAP server) on trusted internal networks.
   Configure TLS if exposing beyond localhost.
7. **Rotate `STORAGE_KEY` periodically.** Note that rotating the storage
   key requires re‑encrypting the database.
8. **Keep the container image updated** — this fork merges upstream
   security fixes periodically.
