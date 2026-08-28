import type { NextFunction, Request, Response } from 'express'

// Fork-owned module: security handling for the served index.html and static
// assets. Upstream refactors server/cli/server.ts regularly, so this logic
// lives here and server.ts only keeps small seams (see FORK.md).

export function escapeHtmlText(v: string): string {
  return v
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function escapeHtmlAttr(v: string): string {
  return escapeHtmlText(v)
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
}

// Angular's autoCsp build feature emits a Content-Security-Policy meta tag in
// index.html whose script-src ('strict-dynamic' + per-build hashes) authorizes
// the inline bootstrap scripts it injects. Extract those sources so the
// response header can carry the identical policy: header and meta CSPs are
// enforced together (intersection), so the two must agree, and carrying the
// policy in the header keeps scripts protected even if the served HTML is a
// cached copy from before the meta tag existed.
export function extractAngularScriptSrc(indexHtml: string): string[] | null {
  const metaTag = indexHtml.match(/<meta\b[^>]*>/gi)?.find(t => /http-equiv=["']Content-Security-Policy["']/i.test(t))
  if (!metaTag) {
    return null
  }

  // bound the content value by its opening quote via backreference; CSP source
  // values themselves contain single quotes ('strict-dynamic', hashes)
  const contentMatch = metaTag.match(/content\s*=\s*(["'])([\s\S]*?)\1/i)
  if (!contentMatch?.[2]) {
    return null
  }

  for (const directive of contentMatch[2].split(';')) {
    const [name, ...values] = directive.trim().split(/\s+/)
    if (name?.toLowerCase() === 'script-src' && values.length) {
      return values
    }
  }

  return null
}

// Missing asset-like paths (js, css, fonts, etc.) must not fall through to the
// SPA index; returning HTML for them causes confusing MIME-type failures.
export function assetNotFoundGuard(): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      next()
      return
    }

    if (/\.[a-z0-9]+$/i.test(new URL(req.originalUrl, 'http://localhost').pathname)) {
      res.status(404).send({
        message: 'File not found.',
      })
      return
    }

    next()
  }
}
