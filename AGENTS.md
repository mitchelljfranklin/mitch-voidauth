# AGENTS.md

## Branch structure (fork)

- **`main`** — clean mirror of `upstream/main` (voidauth/voidauth). No fork-specific files here.
- **`mitch-voidauth`** — the fork's deployment branch. Contains LDAP sync code and fork-specific CI/config. Set this as the default branch on GitHub so issue templates and CI workflows run from the fork.
- All new features intended for upstream: branch off `main`.
- All fork-only features: branch off `mitch-voidauth`.

## Fork-specific files (only on `mitch-voidauth`, never upstream)

- `Dockerfile.fork` — uses public `node:24-alpine3.22` instead of private `dhi.io/node:24-alpine3.22`
- `.github/workflows/release-fork.yml` — builds & pushes to `ghcr.io/mitchelljfranklin/mitch-voidauth`
- `.github/workflows/docs-fork.yml` — builds VitePress docs and deploys to GitHub Pages
- `compose.fork.yml` — points to fork's GHCR image, enables LDAP port 3890
- `.github/README.md` — fork's custom README with LDAP sync info. Root `README.md` is upstream's (kept clean for syncing).
- `.github/ISSUE_TEMPLATE/` — fork-specific issue templates (YAML forms with LDAP sync fields)
- `.github/PULL_REQUEST_TEMPLATE.md` — fork-specific PR template
- `SECURITY.md` — fork-specific security policy (reporting, scope, deployment checklist)
- `docs/.vitepress/` — VitePress documentation site config (replaces upstream's Docsify)
- `docs/package.json` — VitePress dependency (separate from root package.json to avoid merge conflicts)
- `docs/index.md` — VitePress home page (fork-specific, credits upstream)
- `docs/welcome.md` — fork introduction page

## Upstream sync routine

```bash
git checkout main
git pull upstream main
git push origin main
git checkout mitch-voidauth
git merge main
```

When upstream's `Dockerfile` changes, mirror the change into `Dockerfile.fork` (only the `FROM dhi.io/...` line differs).

## Commands

```bash
npm run server:build   # esbuild bundles server/index.ts → dist/index.mjs (also runs tsc + madge circular check)
npm run lint           # eslint
npm run start          # dev server (backend + Angular frontend concurrently)

cd frontend
npm run build          # Angular production build
npm run test           # Angular tests (ng test)
```

## Quality gates

Before considering work done:

- **No stubs.** No `TODO`/`FIXME`, no empty/throwing function bodies, no dead or commented-out code. Intentional empty states must be clearly labelled.
- **Lint + build clean.** `npm run lint` and `npm run server:build` pass. For frontend changes, `cd frontend && npm run build` also passes.
- **Circular imports must not exist.** `esbuild.config.ts` runs madge first — any circular dependency in `server/` aborts.
- **Types are explicit.** No `any` at exported boundaries (use `unknown` + narrowing). Validate all external input with zod.

## Code style

- **No comments unless explicitly requested.** Clarity comes from names and structure, not comments. When a comment is requested, explain *why*, not *what*.
- **Full descriptive names.** `calculateWeightedScore`, not `calcWS`. Variables are noun phrases, functions are verb phrases. Single-letter variables only in trivial loop indices (`i`, `j`).
- **One thought per line.** Break chained operations into intermediate variables with descriptive names. No dense one-liners.
- **Early returns over deep nesting.** Use guard clauses. Functions should read top-to-bottom like a story.
- **No magic values.** Replace literal numbers and strings with named constants or enums. `3600` tells you nothing; `SYNC_INTERVAL_SECONDS` does.
- **No over-engineered abstractions.** Don't create a helper for a two-line check used twice in the same file. Every abstraction must reduce total cognitive load.
- **Duplicate code is noise.** If logic appears in two places, extract it into a shared location.
- **Match existing conventions.** When editing a file, mimic its import style, error handling pattern, and naming. Don't introduce a different pattern in the same module.
- **Human-readable output.** Generated code should look like a human wrote it — clean formatting, logical grouping, descriptive names, and no mechanical boilerplate patterns. If it looks generated, it needs more polish.

### Avoid these patterns

| Pattern | Problem | Do instead |
|---|---|---|
| `+!!foo` or `~~foo` | Implicit coercion no one reads fluently | `Number(foo)` / `Math.floor(foo)` |
| `const { data } = await fn()` — generic destructure | Loses what `data` actually is | `const { data: vendors }` or named result |
| `Array.reduce()` for side-effects or building objects | `reduce` signals fold/accumulate | `for...of` when mutating; `reduce` only for pure accumulation |
| `fn(data, true, false)` — boolean trap | Caller can't tell what arguments mean | Options object: `fn(data, { skipValidation: true })` |
| Mutation of function parameters | Surprises the caller | Clone or return a new value |
| Implicit `any` from untyped catch | Hides type errors until runtime | Type catch as `unknown` |
| Variables declared far from use | Forces reader to scroll and remember | Declare at point of first use |

### Code should look human-written

Good code reads like a human wrote it for another human to maintain. Avoid
patterns that require the reader to hold complex state in their head:

- **Prefer clarity over cleverness.** A 5-line `if/else if/else` chain is
  better than a nested ternary or a `switch/case` that requires decoding
  each branch. No one should squint at a line to understand it.
- **Pass the "read aloud" test.** If you cannot read a line out loud and
  have it sound like a plain-English instruction, rename the variables
  until you can.
- **Errors should be specific.** Match on the actual error type or code.
  Re-throw what you cannot handle. A generic "something went wrong"
  tells the caller nothing.
- **No mechanical boilerplate.** Avoid patterns that look copy-pasted
  across files — extract the commonality. Repeated `try/catch` wrapping,
  identical guard clauses, or cookie-cutter component shells are a
  signal that an abstraction is missing.
- **One thought per line in practice.** A line like
  `.filter().map().sort().slice()` chains four unrelated operations in a
  single breath — break them into named intermediate variables.
- **Side effects should be visible.** Never hide mutation inside getters
  or property access (`obj.foo` looks pure). If something changes state,
  make it an explicit method call (`obj.getFoo()` or `obj.fetchFoo()`).

## Gotchas

- **`npm ci` is strict.** If `package.json` lists a dependency not in `package-lock.json`, it fails. Run `npm install --package-lock-only` to sync the lockfile after adding deps.
- **postinstall runs husky.** If `husky` isn't in PATH locally, use `--ignore-scripts` when running `npm install`.
- **Pre-commit hooks** run `npx lint-staged` which triggers prettier + eslint on staged files.
- **Original Dockerfile** requires `dhi.io` login (private hardened node image). Fork builds use `Dockerfile.fork` which avoids this.
- **Multi-arch** (`linux/amd64,linux/arm64`) is needed for ARM64/Portainer deployments.
- **`release.yml`** is upstream's workflow — it needs `DOCKERHUB_TOKEN` secret your fork doesn't have. Ignore its failures; use `release-fork.yml` instead.
