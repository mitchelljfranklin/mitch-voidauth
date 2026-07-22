# Mitch‑VoidAuth

[![Build](https://img.shields.io/github/actions/workflow/status/mitchelljfranklin/mitch-voidauth/release-fork.yml?label=build)](https://github.com/mitchelljfranklin/mitch-voidauth/actions)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-orange)](LICENSE)

> An enhanced fork of VoidAuth — SSO for your self-hosted universe, with LDAP Directory Sync, runtime admin configuration, multi-arch Docker images, and all upstream features.

---

## What is Mitch‑VoidAuth

Mitch‑VoidAuth is a fork of [VoidAuth](https://voidauth.app) — an open-source SSO authentication and user management platform built by [Derek Paschal](https://github.com/notquitenothing). This fork enhances VoidAuth with several features while keeping all upstream capabilities:

- **LDAP Directory Sync** — the headline feature. Pull users and groups from Active Directory, OpenLDAP, 389 DS, LLDAP, and any LDAPv3 directory into VoidAuth on a configurable schedule.
- **Admin Settings** — configure app behaviour from the web interface. Toggle signups, set MFA requirements, change branding (colour picker + logo upload), adjust rate limits, and more — no environment variable edits or restarts needed.
- **Multi-architecture Docker images** — native builds for both `linux/amd64` and `linux/arm64`, making it compatible with everything from cloud VMs to Raspberry Pi and Portainer deployments.
- **VitePress documentation** — a searchable docs site at [auth.mitchforge.com](https://auth.mitchforge.com) covering setup, configuration, LDAP sync, OIDC guides, and more.

All upstream features are included and this fork periodically merges changes from [voidauth/voidauth](https://github.com/voidauth/voidauth) to stay current.

---

## Why Mitch‑VoidAuth

VoidAuth is an excellent SSO platform, but it has no built-in mechanism to consume identities from an existing directory. If your users and groups already live in Active Directory, OpenLDAP, or FreeIPA, you either maintain duplicate accounts or do without SSO.

Mitch‑VoidAuth fills that gap with **LDAP Directory Sync** — the primary reason this fork exists. Beyond that, it layers on operational improvements that make day-to-day administration smoother: a settings page in the admin panel, multi-arch images for diverse hardware, and comprehensive documentation.

It is intended for:

- Small IT teams managing a mixed environment of self-hosted apps behind VoidAuth who want SSO without duplicating user accounts
- Homelab operators running an LDAP directory for network auth who want a single identity source for their services
- Anyone who wants the VoidAuth experience with their existing directory infrastructure

---

## Quick Start

```yaml
# compose.yml
services:
  voidauth:
    image: ghcr.io/mitchelljfranklin/mitch-voidauth:latest
    restart: unless-stopped
    volumes:
      - ./voidauth/config:/app/config
    ports:
      - "3000:3000"
      - "3890:3890"
    environment:
      APP_URL: https://auth.example.com         # required
      STORAGE_KEY: your-storage-key             # required
      DB_PASSWORD: your-db-password             # required
      DB_HOST: voidauth-db

      # LDAP Sync (optional — enable to sync users/groups from external LDAP)
      # LDAP_SYNC_ENABLED: "true"
      # LDAP_SYNC_URL: ldap://ldap.example.com
      # LDAP_SYNC_BIND_DN: cn=admin,dc=example,dc=com
      # LDAP_SYNC_BIND_PASSWORD: adminpassword
      # LDAP_SYNC_BASE_DN: dc=example,dc=com
    depends_on:
      voidauth-db:
        condition: service_healthy

  voidauth-db:
    image: postgres:18
    restart: unless-stopped
    environment:
      POSTGRES_PASSWORD: your-db-password
    volumes:
      - db:/var/lib/postgresql/18/docker
    healthcheck:
      test: "pg_isready -U postgres -h localhost"

volumes:
  db:
```

```bash
docker compose up -d
# Find the initial admin password reset link in the logs:
docker compose logs voidauth
```

> [!IMPORTANT]
> After first start, grab the password reset link from the logs, create your admin account, and change the default username. See [Getting Started](docs/Getting-Started.md) for full setup details.

---

## Features

### LDAP Directory Sync
- Syncs users and groups from any standards-compliant LDAPv3 directory
- Configurable sync interval (default 3600 seconds, set via `LDAP_SYNC_TIME`)
- Attribute mapping for username, email, first/last name, and unique identifier
- Group membership sync with configurable member attribute
- Admin group promotion — members of a designated LDAP group become VoidAuth admins
- TLS support with optional certificate verification skip for self-signed certs
- Disabled-user handling: keep (set approved=false) or delete when removed from LDAP
- Works with Active Directory, OpenLDAP, 389 DS, FreeIPA, LLDAP, and others

### OpenID Connect (OIDC) Provider
- Standards-compliant OIDC provider for any self-hosted application
- Client registration via admin UI, environment variables, or Docker labels
- Group-based access control for OIDC clients — restrict apps to specific user groups
- Support for authorization code flow with PKCE, client credentials, and refresh tokens
- Back-channel logout support

### LDAP Directory Server
- Built-in read-only LDAP server exposing VoidAuth users and groups as directory entries
- Standard LDAPv3 bind authentication with password and admin bind DN support
- Search and compare operations with scope filtering
- TLS support for encrypted LDAP connections
- Compatible with any LDAP client (Jellyfin, Proxmox, etc.)

### Proxy ForwardAuth
- Protect any HTTP application behind a reverse proxy with VoidAuth authentication
- Works with Caddy, nginx, Traefik, and any proxy supporting forward auth
- Session cookie, Proxy-Authorization header, and Authorization header support
- Domain-level and group-based access control
- Trusted Header SSO for applications that consume `Remote-User` or similar headers

### User & Groups Management
- Admin panel for creating, editing, and deactivating users
- Security groups with MFA requirement and auto-assign options
- User profiles with email, display name, and profile picture
- Configurable password strength requirements

### Self-Registration & Invitations
- Invitation-based user creation with expiring, single-use invite links
- Optional self-registration flow with admin approval
- Email verification for new accounts
- Configurable user expiry for time-limited access

### Customization
- Custom logo, title, and theme colour
- Branding managed via Admin → Settings page (colour picker, logo upload)
- Configurable email templates via EJS files
- Dark/light mode support

### Multi-Factor Authentication & Passkeys
- TOTP (time-based one-time password) MFA
- WebAuthn passkey support with platform and cross-platform authenticators
- Passkey-only accounts (no password required)
- Per-user and per-group MFA enforcement

### Security
- Argon2id password hashing for local accounts
- Encryption-at-rest with configurable storage key
- Rate limiting on login, API, and password reset endpoints
- Helmet security headers with configurable CSP
- Docker container runs as non-root (forward compatibility layer)

---

## LDAP Sync Configuration

All LDAP sync settings are environment variables. When `LDAP_SYNC_ENABLED` is `true`, the following are required:

| Variable | Required | Default | Description |
|---|---|---|---|
| `LDAP_SYNC_ENABLED` | yes | `false` | Enable LDAP directory sync |
| `LDAP_SYNC_URL` | yes | — | LDAP server URL (ldap:// or ldaps://) |
| `LDAP_SYNC_BIND_DN` | yes | — | DN to bind with for searching |
| `LDAP_SYNC_BIND_PASSWORD` | yes | — | Password for bind DN |
| `LDAP_SYNC_BASE_DN` | yes | — | Base DN for user and group searches |
| `LDAP_SYNC_TIME` | no | `3600` | Sync interval in seconds |
| `LDAP_SYNC_SKIP_CERT_VERIFICATION` | no | `false` | Skip TLS certificate verification |
| `LDAP_SYNC_KEEP_DISABLED_USERS` | no | `false` | Keep removed users (set approved=false) |
| `LDAP_SYNC_ADMIN_GROUP_NAME` | no | — | LDAP group whose members become VoidAuth admins |

See [`docs/LDAP-Sync.md`](docs/LDAP-Sync.md) for full attribute mapping options and example configurations for Active Directory, OpenLDAP, 389 DS, and LLDAP.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Express 5 + TypeScript (ESM) |
| Frontend | Angular 21 |
| Database | PostgreSQL or SQLite via Knex |
| LDAP Client | ldapts |
| Bundler | esbuild |
| Password Hashing | Argon2id |
| Email | Nodemailer + EJS templates |
| Deployment | Docker (multi-arch: amd64 + arm64) |

---

<details>
<summary><strong>Reverse Proxy Configuration</strong></summary>

VoidAuth is designed to run behind a TLS-terminating reverse proxy (Caddy, nginx, Traefik, etc.).

**Your proxy must forward:**
- `Host` — public hostname
- `X-Forwarded-Proto` — `https`
- `X-Forwarded-For` — client IP (for rate limiting)

**Required configuration:**
- Set `APP_URL` to your public HTTPS URL

**Caddy** (`Caddyfile`):
```caddy
auth.example.com {
    reverse_proxy voidauth:3000
}
```

**nginx**:
```nginx
server {
    listen 443 ssl;
    server_name auth.example.com;
    location / {
        proxy_pass http://voidauth:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

</details>

---

## Operations

### Database Migration

```bash
docker compose exec voidauth node ./dist/index.mjs migrate
```

### Password Reset for Admin

```bash
docker compose exec voidauth node ./dist/index.mjs generate password-reset admin
```

### Backup

```bash
# Configuration
tar czf voidauth-config-$(date +%F).tar.gz -C voidauth/config .

# Database (Postgres)
docker compose exec voidauth-db pg_dump -U postgres > voidauth-db-$(date +%F).sql
```

> Do not run `docker compose down -v` unless you intend to wipe data.

---

## Documentation

| Document | Description |
|---|---|
| [Getting Started](docs/Getting-Started.md) | Initial setup and configuration |
| [Configuration](docs/Configuration.md) | Complete environment variable reference |
| [LDAP Sync](docs/LDAP-Sync.md) | LDAP directory sync setup and attribute mapping |
| [LDAP Server](docs/LDAP-Server.md) | Built-in LDAP server configuration |
| [LDAP Client Guides](docs/LDAP-Guides.md) | Connecting LDAP clients |
| [OIDC App Setup](docs/OIDC-Setup.md) | Registering OIDC applications |
| [OIDC App Guides](docs/OIDC-Guides.md) | Per-application OIDC setup guides |
| [ProxyAuth](docs/ProxyAuth-and-Trusted-Header-SSO-Setup.md) | Proxy forward auth and header SSO |
| [User Management](docs/User-Management.md) | Invitations, registration, and user admin |
| [Security Groups](docs/Security-Groups.md) | Group-based access control |
| [Email Templates](docs/Email-Templates.md) | Customising system emails |
| [CLI Commands](docs/CLI-Commands.md) | CLI reference |
| [Database Migration](docs/DB-Migration.md) | Migrating between database backends |
| [Troubleshooting](docs/Troubleshooting.md) | Common issues and solutions |

---

## Credits

Mitch‑VoidAuth is a fork of [VoidAuth](https://github.com/voidauth/voidauth) by [Derek Paschal](https://github.com/notquitenothing). VoidAuth is an incredible project — if this fork helps you, consider starring the [upstream repository](https://github.com/voidauth/voidauth).

LDAP sync integration built on [ldapts](https://github.com/ldapts/ldapts).

---

## Disclaimer

Neither VoidAuth nor this fork has been independently audited. Both use third-party packages for much of their functionality. Use at your own risk.
