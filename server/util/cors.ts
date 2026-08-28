import { isMatch } from 'matcher'

// Fork-owned module: OIDC client CORS policy. provider.ts keeps a single
// `clientBasedCORS: corsForClient` seam (see FORK.md).

type CorsClient = {
  redirectUris?: string[]
  postLogoutRedirectUris?: string[]
}

// Only allow CORS for origins that belong to the client's registered
// redirect or post-logout URIs (wildcard patterns supported)
export function corsForClient(_ctx: unknown, origin: string, client: CorsClient): boolean {
  const originUrl = URL.parse(origin)
  if (!originUrl || !originUrl.host) {
    return false
  }

  const uris = [...(client.redirectUris ?? []), ...(client.postLogoutRedirectUris ?? [])]
  for (const uri of uris) {
    if (!uri.includes('*')) {
      const parsed = URL.parse(uri)
      if (parsed?.origin === origin && parsed.origin !== 'null') {
        return true
      }
      continue
    }

    const parsed = URL.parse(uri)
    if (parsed?.protocol === originUrl.protocol && isMatch(originUrl.host, parsed.host)) {
      return true
    }
  }

  return false
}
