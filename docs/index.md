---
layout: home

hero:
  name: "Mitch‑VoidAuth"
  text: "Enhanced VoidAuth fork"
  tagline: A fork of VoidAuth — open-source SSO for your self-hosted universe. Features LDAP Directory Sync, runtime admin configuration, multi-arch Docker builds, and all upstream VoidAuth capabilities.
  image:
    src: /favicon.svg
    alt: Mitch-VoidAuth
  actions:
    - theme: brand
      text: Get Started
      link: /Getting-Started
    - theme: alt
      text: View on GitHub
      link: https://github.com/mitchelljfranklin/mitch-voidauth

features:
  - title: LDAP Directory Sync
    details: Pull users and groups from any LDAPv3 directory into VoidAuth on a configurable schedule. Synced users authenticate via LDAP simple bind — no local password hashes.
  - title: Admin Settings
    details: Runtime configuration from the web interface. Toggle signups, set MFA requirements, change branding with a colour picker and logo upload, and adjust rate limits — no restarts needed.
  - title: OpenID Connect Provider
    details: Standards-compliant OIDC provider. Register clients via admin UI, env vars, or Docker labels. Group-based access control for each application.
  - title: LDAP Directory Server
    details: Built-in read-only LDAP server exposing VoidAuth users and groups. Standard LDAPv3 bind authentication with TLS support.
  - title: Proxy ForwardAuth
    details: Protect any HTTP app behind Caddy, nginx, or Traefik. Session cookie, Proxy-Authorization, and Trusted Header SSO support.
  - title: Passkeys & Multi-Factor Auth
    details: WebAuthn passkey support with platform and cross-platform authenticators. TOTP-based MFA with per-user and per-group enforcement.
  - title: Self-Hosted
    details: Docker Compose behind any reverse proxy. PostgreSQL or SQLite. Multi-arch images for amd64 and arm64. Deploy anywhere.
  - title: Documentation Site
    details: Searchable VitePress docs with setup guides, LDAP sync configuration examples, OIDC app guides for 25+ applications, and a troubleshooting reference.
---

## Credits

Mitch‑VoidAuth is a fork of [VoidAuth](https://voidauth.app) by [Derek Paschal](https://github.com/notquitenothing). VoidAuth is an incredible, actively maintained project — if this fork helps you, consider starring the [upstream repository](https://github.com/voidauth/voidauth).

The LDAP Directory Sync feature is built on [ldapts](https://github.com/ldapts/ldapts).

## Upstream

This fork periodically merges changes from [voidauth/voidauth](https://github.com/voidauth/voidauth) to stay current with bug fixes and new features. The fork's additions — LDAP Directory Sync, Admin Settings, multi-arch builds, and operational enhancements — are described throughout this documentation. All upstream VoidAuth documentation applies for core SSO, OIDC, ProxyAuth, and user management features. See the [Introduction](/welcome) page for the full list of fork-specific additions.
