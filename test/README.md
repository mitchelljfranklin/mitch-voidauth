# Integration Harnesses

On-demand integration tests that exercise real fork behavior against a real
database. These exist because the codebase has no unit test suite; they are the
regression net for fork changes across upstream merges (see `FORK.md`).

## Prerequisites

A throwaway Postgres on localhost:5433:

```bash
docker run -d --name voidauth-test-db -p 5433:5432 -e POSTGRES_PASSWORD=testpass123 postgres:18
```

## Run

From the repo root (both scripts create and clean up their own fixtures):

```bash
npm run test:totp        # TOTP enrollment/replay semantics (server/db/totp.ts)
npm run test:ldap-sync   # LDAP sync admin-group provenance + diagnostics (server/ldap/sync.ts)
```

Each script exits 0 only when all assertions pass. Tear the database down when done:

```bash
docker rm -f voidauth-test-db
```

## What they cover

- **totp-harness**: enrollment confirm accepts the current code without consuming a
  timestep; immediate same-window login accepted; replay after a real login rejected;
  next-window codes accepted; previous-window codes rejected; one-window-old code
  accepted on first use (clock-skew tolerance).
- **admin-sync-harness**: sync-granted `auth_admins` membership survives while the
  user is in the configured LDAP admin group and is revoked when they leave it;
  manually assigned memberships are never touched; both `LDAP_SYNC_ADMIN_GROUP_NAME`
  diagnostics (group missing from directory; no `memberOf` match) fire.

These import real server modules (database layer, crypto, LDAP sync logic), so they
catch wiring and SQL regressions that type checking cannot.
