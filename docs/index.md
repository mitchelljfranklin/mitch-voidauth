---
layout: home

hero:
  name: "Mitch‑VoidAuth"
  text: "VoidAuth with LDAP Directory Sync"
  tagline: A fork of VoidAuth — open-source SSO for your self-hosted universe. Automatically sync users and groups from Active Directory, OpenLDAP, 389 DS, FreeIPA, and more.
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
---

## Credits

Mitch‑VoidAuth is a fork of [VoidAuth](https://voidauth.app) by [Derek Paschal](https://github.com/notquitenothing). VoidAuth is an incredible, actively maintained project — if this fork helps you, consider starring the [upstream repository](https://github.com/voidauth/voidauth).

The LDAP Directory Sync feature is built on [ldapts](https://github.com/ldapts/ldapts).

## Upstream

This fork periodically merges changes from [voidauth/voidauth](https://github.com/voidauth/voidauth) to stay current with bug fixes and new features. All upstream VoidAuth documentation applies — this fork adds only the LDAP Sync integration described in the [LDAP Sync guide](/LDAP-Sync).
