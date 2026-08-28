# AGENTS.md

Fork of [voidauth/voidauth](https://github.com/voidauth/voidauth) — an SSO/OIDC provider. Express 5 + TypeScript ESM backend in `server/`, serving an Angular 22 SPA built from `frontend/` (separate npm install). Shared types live in `shared/`, imported by both sides via the `@shared/*` path alias. Knex over PostgreSQL or SQLite. Fork additions: LDAP Directory Sync (`server/ldap/`) and DB-backed runtime Admin Settings.

## Branch structure (fork)

- **`main`** — clean mirror of `upstream/main`. No fork-specific files here.
- **`mitch-voidauth`** — fork deployment branch and repo default. LDAP sync and fork-only CI/config live here.
- Upstream-bound features branch off `main`; fork-only features branch off `mitch-voidauth`.

Upstream sync:

```bash
git checkout main
git pull upstream main
git push origin main
git checkout mitch-voidauth
git merge main
```

When upstream's `Dockerfile` changes, mirror it into `Dockerfile.fork` (only the `FROM dhi.io/...` line differs).

`.gitattributes` marks `docs/*`, `SECURITY.md`, `.github/ISSUE_TEMPLATE/*`, and the PR template as `merge=ours` — these were rewritten for the fork and must survive upstream merges.

## Fork-specific files (never upstream)

- `Dockerfile.fork` — public `node:24-alpine3.22` instead of private `dhi.io/node:24-alpine3.22`
- `.github/workflows/release-fork.yml` — multi-arch build/push to `ghcr.io/mitchelljfranklin/mitch-voidauth`
- `.github/workflows/docs-fork.yml` — VitePress build → GitHub Pages (triggers on any push to `mitch-voidauth` touching `docs/**`)
- `compose.fork.yml` — fork GHCR image, exposes LDAP port 3890
- `.github/README.md` (fork landing page; root `README.md` stays upstream-clean), `SECURITY.md`, issue templates, PR template
- `docs/.vitepress/`, `docs/index.md`, `docs/welcome.md`, `docs/package.json` (VitePress replaces upstream Docsify)
- `CHANGELOG.md`

CI note: upstream workflows (`release.yml`, `test.yml`) need `DOCKERHUB_TOKEN` / `dhi.io` logins this fork lacks — ignore their failures; use `release-fork.yml`.

## Setup & commands

First-time dev setup (per CONTRIBUTING):

```bash
npm install                       # root deps; add --ignore-scripts if husky isn't in PATH
cd frontend && npm install        # frontend deps are a separate install
cp .example.env .env              # fill in STORAGE_KEY etc.; all example vars are required
docker compose up -d voidauth-db  # local Postgres for dev
npm start                         # backend + frontend watch, localhost:3000
```

Migrations run automatically at startup (`db.migrate.latest()` in `server/db/connection.ts`). Create new ones with `npx knex migrate:make <name>` → timestamped `.ts` file in `migrations/`.

```bash
npm run lint          # eslint (root tsconfig covers server/, shared/, migrations/, test/)
npx tsc               # typecheck
npm run server:build  # madge circular check (any cycle aborts), then esbuild → dist/index.mjs
cd frontend && npm run build   # Angular production build
```

Fork tooling:

- `npm run fork:check` — asserts every intentional fork divergence (see `FORK.md`) is still present; run after every upstream merge.
- `npm run seams:apply` — re-inserts fork seams (single-line hooks in upstream-owned files) after resolving shared-file conflicts with `git checkout --theirs`; registry lives in `scripts/fork-seams.mjs`.
- `npm run i18n:normalize [--check]` — canonicalizes `en-US.json` formatting to prevent merge conflicts.
- `npm run test:totp` / `npm run test:ldap-sync` — integration harnesses in `test/` (need the throwaway Postgres from `test/README.md`).
- `scripts/smoke.ps1 -Image <tag>` — runtime smoke test of a built image.

## Upstream merges

Follow the playbook in `FORK.md`: it lists every intentional fork divergence (hardening fixes H1-H16, fork features F1-F3), the known re-apply hotspots, and the post-merge verification steps. Required per clone: `git config merge.ours.driver true`.

### Verification reality check

- There are **no unit tests** anywhere (zero spec files; `ng test` has nothing to run). The CI "Test" workflow is just a multi-arch Docker build whose Dockerfile runs `npx tsc`, `npx eslint ./`, and both production builds.
- Local equivalent: `npx tsc && npx eslint ./` plus `npm run server:build`; add `cd frontend && npm run build` for frontend changes.
- **Run `npx tsc` before pushing server changes.** `server:build` bundles via esbuild and skips strict type checks — type errors only surface later in Dockerfile CI.
- Circular imports under `server/` abort the build (madge step in `esbuild.config.ts`).

## Quality gates

- No stubs, TODOs, dead or commented-out code. Intentional empty states must be clearly labelled.
- Types explicit: no `any` at exported boundaries (use `unknown` + narrowing). Validate all external input with zod.
- Documentation stays current for user-visible/fork changes: `.github/README.md`, `docs/welcome.md`, `docs/index.md`, `docs/Configuration.md`, `CHANGELOG.md`.

## Code style

- No comments unless explicitly requested; when asked, explain *why*, not *what*.
- ESLint runs `strictTypeChecked` with `@stylistic/max-len` 140 — match each module's existing conventions rather than introducing new patterns.
- Descriptive names, early returns over nesting, named constants over magic values, no speculative abstractions.

## Gotchas

- `npm ci` fails if a dependency isn't in the lockfile — after adding deps run `npm install --package-lock-only` first (root and/or `frontend/`).
- `postinstall` runs husky; pre-commit hook runs lint-staged (prettier + eslint --fix) on staged files.
- Upstream `Dockerfile` requires a `dhi.io` login — build locally with `Dockerfile.fork`.
- Releases must be multi-arch `linux/amd64,linux/arm64` (ARM64/Portainer deployments).
- `server/index.ts` is a yargs CLI (`serve` default, `migrate` for cross-DB moves, `generate password-reset|random`). It sets env vars *before* dynamically importing express/oidc-provider — don't convert those dynamic imports to static ones in that file.
- `server/oidc/provider.ts` exports `provider` as a **factory function** — call `provider()`, never `provider.proxy`/`provider.Client` on the import itself. Client-secrets, sessions and TOTP secrets are AES-256-GCM encrypted at rest; `TRUSTED_PROXIES` (upstream) configures per-proxy trust for rate limiting.

## Frontend gotchas

- Shared `MaterialModule` (`frontend/src/app/material-module.ts`) exports a curated subset of Material modules. Using one not listed there (e.g. `MatSlider`, `MatProgressSpinner`) means adding its module there or importing it directly.
- `SpinnerService` uses `show()` / `hide()` — not start/stop.
- No hardcoded user-facing strings; localize into `frontend/public/i18n/en-US.json`.
- Angular AOT production build is the gatekeeper: template errors that `tsc` and eslint miss only appear in `ng build --configuration production`.

## Persisted settings (Admin Settings page)

- Runtime settings live in the `flag` table with names like `SETTING_<KEY>`; DB flag value overrides the env-var default.
- Booleans stored as `'true'`/`'false'` strings, parsed with `zod.stringbool()`. Upserts use `.onConflict(['name']).merge(['value', 'updatedAt'])`.
- Settings load during the first maintenance run inside `doMaintenance()` (`server/cli/server.ts`), after `createInitialAdmin()`; updates go through settings routes in `admin.ts` calling `applySettingsFromDB()`.
- After changing appearance settings (`APP_COLOR`, `APP_FONT`, `APP_LOGO`) call `generateTheme()` (`server/util/theme.ts`). Theme CSS is rendered server-side at runtime with sass + Angular schematics — this is also why `@angular/material` is an esbuild `external`.

## Config class quirks (`server/util/config.ts`)

- `Config` is not a real class — typed property defaults on an object; `assignConfigValue()` is a standalone function.
- **Every new Config property needs a matching case in `assignConfigValue()`'s switch.** The `default` case assigns via `stringOnly()` and only type-checks for string-typed properties.
- `ADMIN_EMAILS` and `DEFAULT_USER_EXPIRES_IN` have custom parsing — pass raw strings through `assignConfigValue()`, never assign directly.
- `config.ts` cannot import from `server/db/` (circular dependency). Use the injected-function pattern: config exports functions taking data, callers read the DB and pass values in.

## Logo uploads

Express body parsers drain the request stream before handlers run — never read raw bodies on routes behind `express.json()`. Logos arrive as JSON `{ dataUrl, mimeType }`, built client-side via `FileReader.readAsDataURL()` (see logo route in `admin.ts`).

## DB backend portability (PostgreSQL + SQLite)

- Use Knex schema builder — raw SQL only behind a `knex.client.config.client === 'pg'` / `'sqlite3'` guard.
- Boolean columns typed `boolean | number`; date columns `Date | number`, always `{ useTz: true }`.
- Foreign keys use `.references().inTable().onDelete('CASCADE')`.
- New non-nullable columns: add nullable → backfill → drop nullable (3-step migration).
- Query logic differing per backend must work on both — test against both if in doubt.
