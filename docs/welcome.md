# Introduction

## What is Mitch‑VoidAuth

Mitch‑VoidAuth is a fork of [VoidAuth](https://voidauth.app) — an open-source SSO authentication and user management platform built by [Derek Paschal](https://github.com/notquitenothing). VoidAuth is a mature, actively maintained SSO provider that stands guard in front of your self-hosted applications.

This fork builds on VoidAuth with several enhancements:

- **LDAP Directory Sync** — automatic user and group synchronisation from external LDAP directories (Active Directory, OpenLDAP, 389 DS, FreeIPA, LLDAP, and more). Synced users authenticate via LDAP simple bind against the remote directory.
- **Admin Settings page** — configure app behaviour from the web interface without editing environment variables. Toggle signups, set MFA requirements, change branding (colour picker + logo upload), adjust rate limits — changes take effect immediately.
- **Multi-architecture Docker images** — native builds for both `linux/amd64` and `linux/arm64`, compatible with cloud VMs, Raspberry Pi, and Portainer deployments.
- **VitePress documentation** — a fully searchable docs site at [auth.mitchforge.com](https://auth.mitchforge.com) with setup guides, LDAP sync configuration examples, OIDC app guides for 25+ applications, and a troubleshooting reference.
- **Enhanced CI/CD** — automated multi-arch Docker builds via GitHub Actions, triggered on published releases.

## Why a fork

VoidAuth already ships a built-in LDAP server — it serves directory data to LDAP client applications. But if your organisation already has an LDAP directory that is the source of truth for users and groups, you need the reverse: LDAP as a *source*, syncing identities *into* VoidAuth.

Mitch‑VoidAuth bridges that gap with LDAP Directory Sync — the primary reason this fork exists. Beyond that, the Admin Settings page and operational enhancements make day-to-day administration smoother without waiting on upstream.

## Features

All upstream VoidAuth features are included:

- OpenID Connect (OIDC) Provider
- LDAP Directory Server
- LDAP Directory Sync
- Proxy ForwardAuth
- User and Groups Management
- User Self-Registration and Invitations
- Customizable branding (logo, title, theme, email templates)
- Multi-factor Authentication, Passkeys, and Passkey-Only Accounts
- Secure Password Reset with Email Verification
- Encryption-at-Rest with Postgres or SQLite

## Upstream Credits

Mitch‑VoidAuth is built on [VoidAuth](https://github.com/voidauth/voidauth) by [Derek Paschal](https://github.com/notquitenothing). The enhancements listed above are built on VoidAuth's foundation — all core SSO, OIDC, ProxyAuth, and user management features are VoidAuth.

This fork periodically merges changes from upstream to stay current. See the [Getting Started](/Getting-Started) page for setup instructions, or jump to [LDAP Sync](/LDAP-Sync) for directory integration details.
