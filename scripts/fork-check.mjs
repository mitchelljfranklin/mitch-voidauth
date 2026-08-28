import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'

const failures = []

function read(path) {
  if (!existsSync(path)) {
    failures.push(`MISSING FILE: ${path}`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

// [file, pattern, description]
const checks = [
  ['server/cli/server.ts', /base href="\$\{escapeHtmlAttr\(basePath\(\)\)\}\/">/, 'H13 base href always ends with /'],
  ['server/cli/server.ts', /function extractAngularScriptSrc/, 'H13 CSP script-src extractor exists'],
  ['server/cli/server.ts', /'script-src': angularScriptSrc/, 'H13 CSP header mirrors Angular policy'],
  ['server/cli/server.ts', /\.\[a-z0-9\]\+\$\/i\.test/, 'H13 asset-like paths return 404'],
  ['server/util/argon2id.ts', /runInPool/, 'H1 argon2 verification worker pool'],
  ['server/ldap/server.ts', /BIND_FAILURES_BEFORE_BACKOFF/, 'H2 ldap bind-failure backoff'],
  ['server/ldap/server.ts', /MAX_CONNECTIONS/, 'H2 ldap connection cap'],
  ['server/ldap/server.ts', /IDLE_TIMEOUT_MS/, 'H2 ldap idle timeout'],
  ['server/ldap/sync.ts', /LDAP_SYNC_LINK_EXISTING_USERS/, 'F1 ldap linking opt-in flag'],
  ['server/ldap/sync.ts', /SYNC_ACTOR_ID/, 'F1 provenance-based admin revocation'],
  ['server/ldap/sync.ts', /was not found among the synced groups/, 'F1 admin-group typo diagnostic'],
  ['server/ldap/sync.ts', /memberOf attribute/, 'F1 memberOf diagnostic'],
  ['server/util/config.ts', /LDAP_SYNC_LINK_EXISTING_USERS: boolean = false/, 'F1 linking config default false'],
  ['server/util/config.ts', /TRUSTED_PROXIES: string \| boolean/, 'upstream TRUSTED_PROXIES present'],
  ['shared/constants.ts', /SESSION: 14 \* DAY/, 'H3 session TTL 14 days'],
  ['shared/constants.ts', /GRANT: 90 \* DAY/, 'H3 grant TTL 90 days'],
  ['shared/constants.ts', /EMAIL_LOG: 30 \* DAY/, 'H3 email_log retention TTL'],
  ['server/routes/user.ts', /endSessions\(user\.id\)/, 'H4 password change ends sessions'],
  ['server/routes/public.ts', /delete\(\)\.where\(\{ userId: user\.id \}\)/, 'H5 reset invalidates all user tokens'],
  ['server/routes/auth.ts', /await getEmailVerification\(user\.id\)/, 'H6 send_verify_email gating'],
  ['server/db/totp.ts', /lastUsedTimestep/, 'H7 totp replay protection'],
  ['server/db/totp.ts', /totp\.expiresAt != null \? null : timestep/, 'H7 enrollment does not burn timestep'],
  ['server/db/tableMaintenance.ts', /TTLs\.EMAIL_LOG/, 'H8 email_log purge'],
  ['server/util/email.ts', /function redactChallenges/, 'H9 email body challenge redaction'],
  ['server/routes/api.ts', /skipSuccessfulRequests: true/, 'H10 failed-basic-auth limiter'],
  ['server/oidc/provider.ts', /Only allow CORS for origins/, 'H11 tightened clientBasedCORS'],
  ['server/oidc/provider.ts', /LOWER\("name"\) IN/, 'H11 case-insensitive client group matching'],
  ['server/routes/interaction.ts', /DUMMY_PASSWORD_HASH/, 'H12 login timing equalization'],
  ['frontend/src/app/pages/admin/emails/emails.component.ts', /sandbox=""/, 'H14 email preview iframe sandbox'],
  ['frontend/src/app/services/auth.service.ts', /e\.status === 0/, 'H15 opaque redirect handled as success'],
  ['frontend/src/app/pages/mfa/mfa.component.ts', /replaceUrl: true/, 'H16 deterministic MFA cancel'],
]

// must NOT appear anywhere in these trees
const negativeChecks = [
  ['TRUST_PROXY', 'retired TRUST_PROXY must not reappear'],
  ['window.history.back()', 'mfa cancel must not use history.back()'],
]

const ignoreDirs = new Set(['node_modules', 'dist', 'dist-browser', '.angular', '.vitepress'])

function walkTree(dir) {
  const files = []
  let entries = []
  try {
    entries = readdirSync(dir)
  } catch {
    return files
  }
  for (const entry of entries) {
    if (ignoreDirs.has(entry)) continue
    const full = `${dir}/${entry}`
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      files.push(...walkTree(full))
    } else if (/\.(ts|html|md|json)$/.test(entry)) {
      files.push(full)
    }
  }
  return files
}

for (const [file, pattern, description] of checks) {
  if (!pattern.test(read(file))) {
    failures.push(`FAIL: ${description} — pattern not found in ${file}`)
  }
}

for (const tree of ['server', 'shared', 'docs', 'frontend/src']) {
  for (const file of walkTree(tree)) {
    const content = read(file)
    for (const [pattern, description] of negativeChecks) {
      if (content.includes(pattern)) {
        failures.push(`FAIL: ${description} — found '${pattern}' in ${file}`)
      }
    }
  }
}

// Dockerfile.fork must carry the same non-dhi.io FROM lines (digest pins) as Dockerfile
function fromLines(path) {
  return read(path)
    .split('\n')
    .filter(l => l.startsWith('FROM ') && !l.includes('dhi.io'))
    .map(l => l.trim())
}
const upstreamFroms = fromLines('Dockerfile')
const forkFroms = new Set(fromLines('Dockerfile.fork'))
for (const from of upstreamFroms) {
  if (!forkFroms.has(from)) {
    failures.push(`FAIL: Dockerfile.fork missing upstream FROM line: ${from}`)
  }
}

if (failures.length) {
  failures.forEach(f => console.error(f))
  console.error(`fork-check: ${failures.length} FAILURE(S)`)
  process.exit(1)
}
console.log(`fork-check: all ${checks.length} divergence checks pass ✓`)
