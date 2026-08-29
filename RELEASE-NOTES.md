# 🛡️ Mitch-VoidAuth v2026.09.0 — Security Hardening Release

> **TL;DR** — A full security audit of the fork produced **30+ fixes and hardening changes**, an **OWASP ZAP penetration scan** came back clean (zero high-severity findings), and a **52-commit upstream sync** brings the Custom Claims feature, per-proxy trust (`TRUSTED_PROXIES`), and supply-chain hardening. Sessions are now 14 days, TOTP codes can't be replayed, and every fork behaviour is enforced by an automated seam + verification system.

---

## 📋 At a Glance

| Area | Summary |
|---|---|
| 🔒 Security fixes | 30+ changes from a full code audit |
| 🧪 Penetration testing | OWASP ZAP scan — 0 high-severity findings; all mediums triaged (fixed or documented as accepted trade-offs) |
| ⬆️ Upstream sync | 52 commits absorbed, including the **Custom Claims** feature |
| 🐛 Regression fixes | 6 user-facing bugs found and fixed during hardening |
| 🧰 Tooling | Automated fork-verification, 3 integration harnesses, runtime smoke suite, upstream drift monitor |

---

## 🛡️ Security Hardening

### Authentication & Sessions
- **Session lifetime reduced** from 1 year → **14 days** (grants 90 days). Existing sessions keep their old expiry until they lapse naturally
- **Changing your password now signs out every session** for that account
- **TOTP replay protection** — a one-time code can no longer be reused within its validity window; confirming MFA enrolment no longer "burns" the current code
- Password-strength policy is now actually enforced — a missing `return` allowed weak passwords to be silently stored during password change and reset *(upstream bug)*
- A successful password reset now invalidates **all** outstanding reset tokens
- Login responses take equal time for unknown usernames and valid ones (no username oracle)

### LDAP (Directory Sync & Embedded Server)
- **Bind-failure backoff** — 5 consecutive failed binds from one source triggers exponential blocking (30 s → 15 min), invisible to the attacker
- **Connection caps + idle timeouts** — max 64 concurrent connections, 5-minute idle disconnect
- **Argon2 verification moved to a worker pool** — login floods can no longer stall the whole SSO
- **Synced-account linking is now opt-in** (`LDAP_SYNC_LINK_EXISTING_USERS`, default off) — directory entries can no longer silently claim same-named local accounts
- **Admin rights are provenance-aware** — sync-granted admins are demoted when they leave the LDAP admin group; manually assigned admins are never touched
- New diagnostics warn when the configured LDAP admin group is missing from the directory or invisible via `memberOf`

### Transport, Headers & Web Security
- **CSP `script-src` is now `strict-dynamic` + per-build hashes** — mirrored from Angular's own build policy; blanket `unsafe-inline` is gone
- **`worker-src` pinned**, index responses sent **`Cache-Control: no-store`**, VCS probe paths (`._darcs`, `.git`, …) return 404
- Admin-set logo/title are HTML-escaped; the admin email preview iframe is sandboxed
- **CORS for OIDC endpoints** restricted to each client's registered origins (previously any HTTPS origin)
- Failed Basic-auth attempts on ProxyAuth endpoints are now rate limited
- `TRUST_PROXY` replaced by upstream's **`TRUSTED_PROXIES`** (per-proxy/CIDR trust with safety warnings)

### Data Protection
- Secret challenges (password resets, invites, verifications) are **redacted from stored email logs**
- Email logs now **purge after 30 days**
- `send_verify_email` no longer enables mailbox-bombing via user UUID

---

## ✨ New From Upstream (52 commits)

- **Custom Claims** — attach name/value claims (strings, numbers, objects, arrays) to users, groups, and invitations; calculated per-user and included in every OIDC token and user-info response. Manage from the new **Admin → Claims** page
- **`TRUSTED_PROXIES`** environment variable — trust specific proxy IPs/CIDRs instead of blanket trust
- **Supply-chain hardening** — GitHub Actions pinned to commit SHAs, Docker base images digest-pinned, Dependabot enabled
- Prototype-pollution fix, COOP adjustments for popup OIDC flows, ru-RU locale, Angular 22 alignment

---

## 🐛 Bug Fixes

| Fix | Symptom you may have seen |
|---|---|
| Deep-link base href | White screen + MIME-type console errors after logout redirects |
| MFA cancel loop | Cancelling from the MFA screen bounced straight back with a stuck loading spinner |
| TOTP enrolment | Valid code rejected as "invalid" right after confirming setup |
| LDAP admin demotion | Manually assigned admins lost rights after an LDAP sync |
| CSP header regression | Inline scripts blocked behind reverse proxies |
| Weak password storage | Password policy reported rejection but stored the weak password anyway |

---

## 🧰 Maintenance & Tooling

- **`FORK.md`** — authoritative manifest of every fork divergence (29 seams + 22 owned-file behaviours) with an upstream-merge playbook
- **`npm run seams:apply`** — after a merge, shared-file conflicts resolve by taking upstream's side and re-inserting fork seams in one command (stale anchors fail loudly)
- **`npm run fork:check`** — verifies every divergence survived a merge
- **Integration harnesses** — `test:totp`, `test:ldap-sync`, `test:ldap-guard` (55 assertions against real dependencies)
- **`scripts/smoke.ps1`** — 15-assertion runtime smoke suite (`-Ldap` includes the embedded LDAP listener)
- **Upstream drift monitor** — weekly check that opens an issue when upstream moves
- `npm run i18n:normalize` — keeps locale files merge-friendly

---

## 📦 Dependencies

- All security advisories resolved (backend and frontend) via lockfile-only updates — including DOMPurify (XSS) and the `ip-address` chain inside rate limiting
- Supply chain protected: npm refuses packages published less than 7 days ago

---

## ⚠️ Upgrade Notes

1. **Remove `TRUST_PROXY` from your environment** if you ever set it — replaced by upstream's `TRUSTED_PROXIES` (the default trusts private ranges, which suits typical reverse-proxy setups)
2. **Sessions are shorter now** — expect re-login after 14 days; nothing else required
3. **LDAP sync linking is opt-in** — if you relied on same-named local accounts being claimed by LDAP, set `LDAP_SYNC_LINK_EXISTING_USERS=true`
4. **LDAP admins** — membership granted by sync is revoked when users leave the LDAP admin group; manual assignments are permanent
5. Schema migration runs automatically on first start (TOTP replay tracking + custom claims)

---

## ✅ Verification Performed

- Full source audit with every finding fixed or explicitly accepted (see `FORK.md` → *Accepted scanner findings*)
- OWASP ZAP authenticated-surface scan: **0 high-severity findings**; all mediums fixed or documented as design trade-offs
- 55 integration assertions across 3 harnesses · 15-assertion runtime smoke suite · `tsc` + `eslint` + circular-dependency checks clean
- Multi-arch image built via `Dockerfile.fork`

**Full change details:** [CHANGELOG.md](CHANGELOG.md) · **Fork divergence manifest:** [FORK.md](FORK.md)

<sub>Neither VoidAuth nor this fork has been independently audited. Use at your own risk.</sub>
