// Fork seam registry — the single source of truth for every fork change that
// lives as a small "seam" inside a file upstream also owns.
//
//   npm run seams:apply           insert any missing seams (idempotent)
//   npm run seams:apply -- --check  report only; exit 1 if seams are missing
//   npm run fork:check            validate seams + owned-file divergences
//
// All anchors/matches are plain SUBSTRINGS of a single line, matched against
// PRISTINE upstream content, so that after a merge resolves shared-file
// conflicts with `git checkout --theirs`, running seams:apply restores the
// fork behavior. A missing anchor is a STALE seam and fails loudly (upstream
// reshaped the region — update the seam by hand).
//
// When adding/removing a seam: update FORK.md.

const seams = [
  // ---------- server/cli/server.ts ----------
  {
    id: 'server-import-index-html',
    file: 'server/cli/server.ts',
    ref: 'H13',
    description: 'import fork-owned index-html module',
    applied: `from './index-html.ts'`,
    op: 'insert-after',
    anchor: `import helmet from 'helmet'`,
    lines: [
      `// fork-seam: security handling for served index.html lives in ./index-html.ts`,
      `import { assetNotFoundGuard, escapeHtmlAttr, escapeHtmlText, extractAngularScriptSrc } from './index-html.ts'`,
    ],
  },
  {
    id: 'server-csp-const',
    file: 'server/cli/server.ts',
    ref: 'H13',
    description: 'extract Angular autoCsp script-src for the CSP header',
    applied: `const angularScriptSrc = extractAngularScriptSrc`,
    op: 'insert-after',
    anchor: `const app = express()`,
    lines: [
      "  const angularScriptSrc = extractAngularScriptSrc(fs.readFileSync(path.join(FE_ROOT, './index.html'), 'utf8'))",
    ],
  },
  {
    id: 'server-csp-header',
    file: 'server/cli/server.ts',
    ref: 'H13',
    description: 'CSP script-src mirrors Angular autoCsp instead of unsafe-inline',
    applied: `'script-src': angularScriptSrc`,
    op: 'replace-line',
    match: `'script-src': [`,
    replacement: `  'script-src': angularScriptSrc,`,
  },
  {
    id: 'server-title-escape',
    file: 'server/cli/server.ts',
    ref: 'H13',
    description: 'HTML-escape APP_TITLE injected into served index',
    applied: `escapeHtmlText(appConfig.APP_TITLE)`,
    op: 'replace-line',
    match: `replace('<title>', '<title>' + appConfig.APP_TITLE)`,
    replacement: "  let index = fs.readFileSync(path.join(FE_ROOT, './index.html')).toString().replace('<title>', `<title>\${escapeHtmlText(appConfig.APP_TITLE)}`)",
  },
  {
    id: 'server-logo-href-escape',
    file: 'server/cli/server.ts',
    ref: 'H13',
    description: 'HTML-escape APP_LOGO favicon href',
    applied: `escapeHtmlAttr(logoUrl)`,
    op: 'replace-line',
    match: `index = index.replaceAll(faviconRegex,`,
    replacement: "    index = index.replaceAll(faviconRegex, `<link rel=\"icon\" href=\"\${escapeHtmlAttr(logoUrl)}\" sizes=\"any\" type=\"\${mimeType}\"/>`)",
  },
  {
    id: 'server-logo-meta-escape',
    file: 'server/cli/server.ts',
    ref: 'H13',
    description: 'HTML-escape APP_LOGO meta content',
    applied: `name="logoUri" content="\${escapeHtmlAttr(logoUrl)}"`,
    op: 'replace-line',
    match: `index = index.replace(/<meta[^>]*name="logoUri"[^>]*>/g,`,
    replacement: "    index = index.replace(/<meta[^>]*name=\"logoUri\"[^>]*>/g, `<meta name=\"logoUri\" content=\"\${escapeHtmlAttr(logoUrl)}\"/>`)",
  },
  {
    id: 'server-asset-404-guard',
    file: 'server/cli/server.ts',
    ref: 'H13',
    description: 'asset-like unresolved paths return 404 instead of SPA index',
    applied: `app.use(assetNotFoundGuard())`,
    op: 'insert-before',
    anchor: `// Unresolved GET requests should return index if they start with basePath`,
    lines: [
      `  // fork-seam: asset-like unresolved paths 404 instead of returning SPA index`,
      `  app.use(assetNotFoundGuard())`,
      ``,
    ],
  },

  // ---------- server/oidc/provider.ts ----------
  {
    id: 'provider-import-cors',
    file: 'server/oidc/provider.ts',
    ref: 'H11',
    description: 'import fork-owned CORS policy',
    applied: `from '../util/cors'`,
    op: 'insert-after',
    anchor: `import { getCurrentProviderConfig, setCurrentProviderConfig } from './configuration'`,
    lines: [
      `import { corsForClient } from '../util/cors'`,
    ],
  },
  {
    id: 'provider-cors-seam',
    file: 'server/oidc/provider.ts',
    ref: 'H11',
    description: 'clientBasedCORS restricted to registered client origins',
    applied: `clientBasedCORS: corsForClient`,
    op: 'region-replace',
    start: `clientBasedCORS: (_ctx, origin, client) => {`,
    end: `findAccount: findAccount,`,
    lines: [
      `    clientBasedCORS: corsForClient,`,
    ],
  },

  // ---------- server/routes/interaction.ts ----------
  {
    id: 'interaction-import-login-timing',
    file: 'server/routes/interaction.ts',
    ref: 'H12',
    description: 'import fork-owned login timing equalization',
    applied: `from '../util/login-timing'`,
    op: 'insert-after',
    anchor: `import { argon2 } from '../util/argon2id'`,
    lines: [
      `import { timingEqualizedReject } from '../util/login-timing'`,
    ],
  },
  {
    id: 'interaction-timing-call',
    file: 'server/routes/interaction.ts',
    ref: 'H12',
    description: 'equalize login timing for unknown usernames',
    applied: `await timingEqualizedReject(password)`,
    op: 'insert-after',
    // must be the `if (!user) {` inside the /login handler, right after getUserByInput
    anchor: `const user = await getUserByInput(input)`,
    skipLines: 1,
    lines: [
      `      await timingEqualizedReject(password)`,
    ],
  },

  // ---------- server/util/email.ts ----------
  {
    id: 'email-import-redact',
    file: 'server/util/email.ts',
    ref: 'H9',
    description: 'import fork-owned email body redaction',
    applied: `from './redact'`,
    op: 'insert-after',
    anchor: `import { TABLES } from '@shared/db'`,
    lines: [
      `import { redactChallenges } from './redact'`,
    ],
  },
  {
    id: 'email-redact-bodies',
    file: 'server/util/email.ts',
    ref: 'H9',
    description: 'redact challenges in all persisted email bodies',
    applied: `body: redactChallenges(html ?? text)`,
    op: 'replace-all-lines',
    match: `body: html ?? text,`,
    replacement: `    body: redactChallenges(html ?? text),`,
  },

  // ---------- server/routes/api.ts ----------
  {
    id: 'api-import-basic-auth-limiter',
    file: 'server/routes/api.ts',
    ref: 'H10',
    description: 'import failed-basic-auth limiter',
    applied: `from '../util/rateLimit'`,
    op: 'insert-after',
    anchor: `import { getProxyAuthWithCache } from '../db/proxyAuth'`,
    lines: [
      `import { basicAuthRateLimit } from '../util/rateLimit'`,
    ],
  },
  {
    id: 'api-forward-auth-limiter',
    file: 'server/routes/api.ts',
    ref: 'H10',
    description: 'failed-basic-auth limiter on forward-auth',
    applied: `router.get('/authz/forward-auth', basicAuthRateLimit`,
    op: 'replace-line',
    match: `router.get('/authz/forward-auth', async (req: Request, res) => {`,
    replacement: `  router.get('/authz/forward-auth', basicAuthRateLimit, async (req: Request, res) => {`,
  },
  {
    id: 'api-auth-request-limiter',
    file: 'server/routes/api.ts',
    ref: 'H10',
    description: 'failed-basic-auth limiter on auth-request',
    applied: `router.get('/authz/auth-request', basicAuthRateLimit`,
    op: 'replace-line',
    match: `router.get('/authz/auth-request', async (req: Request, res) => {`,
    replacement: `  router.get('/authz/auth-request', basicAuthRateLimit, async (req: Request, res) => {`,
  },
]

export default seams
