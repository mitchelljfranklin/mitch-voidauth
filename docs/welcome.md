# Introduction

## What is Mitch‑VoidAuth

Mitch‑VoidAuth is a fork of [VoidAuth](https://voidauth.app) — an open-source SSO authentication and user management platform built by [Derek Paschal](https://github.com/notquitenothing). VoidAuth is a mature, actively maintained SSO provider that stands guard in front of your self-hosted applications.

This fork adds **LDAP Directory Sync**: automatic user and group synchronisation from external LDAP directories (Active Directory, OpenLDAP, 389 DS, FreeIPA, LLDAP, and more).

## Why a fork

VoidAuth already ships a built-in LDAP server — it serves directory data to LDAP client applications. But if your organisation already has an LDAP directory that is the source of truth for users and groups, you need the reverse: LDAP as a *source*, syncing identities *into* VoidAuth.

Mitch‑VoidAuth bridges that gap. Configure a few environment variables, and users and groups flow into VoidAuth automatically. No manual user import. No double-entry of group memberships. LDAP-synced users log in with their existing directory credentials.

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

Mitch‑VoidAuth is built on [VoidAuth](https://github.com/voidauth/voidauth) by [Derek Paschal](https://github.com/notquitenothing). The LDAP Directory Sync feature is the only addition — everything else is VoidAuth.

This fork periodically merges changes from upstream to stay current. See the [Getting Started](/Getting-Started) page for setup instructions, or jump to the [LDAP Sync](/LDAP-Sync) page for the LDAP integration details.
