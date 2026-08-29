# Runtime smoke test for a built mitch-voidauth image.
# Usage: .\scripts\smoke.ps1 [-Image mitch-voidauth:local] [-Port 3002] [-Ldap]
# Boots a throwaway Postgres + app container pair on a docker network, asserts
# the fork's security-relevant runtime behavior, then cleans up.
# -Ldap additionally boots the embedded LDAP server and asserts it listens.

param(
  [string]$Image = 'mitch-voidauth:local',
  [int]$Port = 3002,
  [switch]$Ldap
)

$ErrorActionPreference = 'Stop'
$net = 'smoke-test'
$app = 'smoke-app'
$db = 'smoke-db'
$storageKey = 'a' * 43

function Assert($name, $ok) {
  if ($ok) { Write-Host "PASS $name" } else { Write-Host "FAIL $name"; $script:failed++ }
  if (-not $ok) { $script:failed++ }
}

$script:failed = 0

# native docker errors (container/network does not exist) must not trip EAP=Stop
$ErrorActionPreference = 'SilentlyContinue'
docker network create $net | Out-Null
docker rm -f $app $db | Out-Null
$ErrorActionPreference = 'Stop'

try {
  docker run -d --name $db --network $net -e POSTGRES_PASSWORD=smokepass postgres:18 | Out-Null
  Start-Sleep -Seconds 6
  $ldapEnv = @()
  $ldapPortArgs = @()
  if ($Ldap) {
    $ldapEnv = @('-e', 'LDAP_ENABLED=true', '-e', 'LDAP_BIND_PASSWORD=smokepass')
    $ldapPortArgs = @('-p', '3890:3890')
  }
  docker run -d --name $app --network $net -p "${Port}:3000" @ldapPortArgs `
    -e APP_URL="http://localhost:${Port}" `
    -e STORAGE_KEY=$storageKey `
    -e DB_HOST=$db -e DB_PASSWORD=smokepass `
    @ldapEnv `
    $Image | Out-Null

  # wait for healthcheck
  $healthy = $false
  foreach ($i in 1..30) {
    Start-Sleep -Seconds 2
    try {
      $r = Invoke-WebRequest -Uri "http://localhost:${Port}/healthcheck" -UseBasicParsing -TimeoutSec 2
      if ($r.StatusCode -eq 200) { $healthy = $true; break }
    } catch { }
  }
  Assert 'healthcheck responds 200' $healthy
  if (-not $healthy) { throw 'app never became healthy; aborting' }

  $index = Invoke-WebRequest -Uri "http://localhost:${Port}/" -UseBasicParsing
  Assert 'index serves 200' ($index.StatusCode -eq 200)

  # base href must end with '/' (deep-link fix)
  $base = [regex]::Match($index.Content, '<base[^>]*>').Value
  Assert "base href ends with / ($base)" ($base -match 'href="[^"]*/"')

  # CSP: header script-src must mirror Angular's strict-dynamic meta policy (no bare 'self')
  $csp = $index.Headers['Content-Security-Policy']
  $headerScript = ($csp -split ';') | Where-Object { $_ -match '^script-src' }
  Assert 'CSP script-src carries strict-dynamic' ($headerScript -match 'strict-dynamic')
  Assert 'CSP script-src not bare self' (-not ($headerScript -match "^script-src 'self'$"))

  # meta CSP present in served html
  Assert 'Angular autoCsp meta present' ($index.Content -match 'http-equiv="Content-Security-Policy"')

  # worker-src pinned and index not cacheable
  Assert 'CSP worker-src pinned to self' ($csp -match "worker-src 'self'")
  Assert 'index served with no-store' ($index.Headers['Cache-Control'] -match 'no-store|no-cache')

  # gated admin routes exist (401 = auth-gated, route present)
  foreach ($route in @('/api/admin/settings', '/api/admin/claims', '/api/user/me')) {
    try {
      Invoke-WebRequest -Uri "http://localhost:${Port}$route" -UseBasicParsing | Out-Null
      Assert "route $route gated (unexpected 2xx)" $false
    } catch {
      $code = [int]$_.Exception.Response.StatusCode
      Assert "route $route exists and is gated (got $code)" ($code -in 401, 403)
    }
  }

  # migrations ran
  $logs = docker logs $app 2>&1 | Out-String
  Assert 'database schema updated (migrations ran)' ($logs -match 'Database schema updated')
  Assert 'no server error in logs' (-not ($logs -match '"level":"error"'))

  if ($Ldap) {
    Assert 'embedded LDAP server listening' ($logs -match 'LDAP Server listening')
    Assert 'LDAP enabled in logs' ($logs -match 'LDAP')
  }

  if ($script:failed -eq 0) {
    Write-Host "SMOKE OK - all checks passed against $Image"
  } else {
    Write-Host "SMOKE FAILED - $script:failed check(s) failed against $Image"
    exit 1
  }
} finally {
  $ErrorActionPreference = 'SilentlyContinue'
  docker rm -f $app $db | Out-Null
  docker network rm $net | Out-Null
  $ErrorActionPreference = 'Stop'
}
