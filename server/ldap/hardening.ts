import type { Socket } from 'node:net'
import { logger } from '../util/logger'

// Fork-owned module: brute-force and connection hygiene hardening for the
// embedded LDAP server. Upstream's server/ldap/server.ts keeps only small
// seams calling into this module (see FORK.md H2).

const MAX_CONNECTIONS = 64
const IDLE_TIMEOUT_MS = 5 * 60 * 1000
const BIND_FAILURES_BEFORE_BACKOFF = 5
const BIND_BACKOFF_BASE_MS = 30 * 1000
const BIND_BACKOFF_MAX_MS = 15 * 60 * 1000

// Per-client bind-failure tracking to slow online password guessing.
// After BIND_FAILURES_BEFORE_BACKOFF consecutive failed binds from one source
// address, further binds are refused (with a generic invalidCredentials result)
// for an exponentially growing window up to BIND_BACKOFF_MAX_MS.
const bindFailures = new Map<string, { failures: number, blockedUntil: number }>()

const activeConnections = new Set<Socket>()

function clientAddress(socket: Socket): string {
  return socket.remoteAddress ?? 'unknown'
}

function startFailureCleanup() {
  // in unref'd so it cannot keep the process alive
  const cleanup = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of bindFailures) {
      if (entry.blockedUntil < now) {
        bindFailures.delete(key)
      }
    }
  }, 10 * 60 * 1000)
  cleanup.unref()
}

export function isBindBlocked(socket: Socket): boolean {
  const entry = bindFailures.get(clientAddress(socket))
  return !!entry && entry.blockedUntil > Date.now()
}

export function recordBindFailure(socket: Socket) {
  if (bindFailures.size === 0) {
    startFailureCleanup()
  }
  const key = clientAddress(socket)
  const entry = bindFailures.get(key) ?? { failures: 0, blockedUntil: 0 }
  entry.failures += 1
  if (entry.failures >= BIND_FAILURES_BEFORE_BACKOFF) {
    const backoffMs = Math.min(
      BIND_BACKOFF_BASE_MS * (2 ** (entry.failures - BIND_FAILURES_BEFORE_BACKOFF)),
      BIND_BACKOFF_MAX_MS,
    )
    entry.blockedUntil = Date.now() + backoffMs
  }
  bindFailures.set(key, entry)
}

export function recordBindSuccess(socket: Socket) {
  bindFailures.delete(clientAddress(socket))
}

/**
 * Gate a newly accepted socket through the connection limits. Returns false
 * (after destroying the socket) when the concurrent connection cap is hit.
 * Registers the idle timeout and close-tracking on admitted sockets.
 */
export function admitConnection(socket: Socket): boolean {
  if (activeConnections.size >= MAX_CONNECTIONS) {
    logger({ level: 'debug', message: 'LDAP connection rejected; too many active connections' })
    socket.destroy()
    return false
  }

  activeConnections.add(socket)
  socket.setTimeout(IDLE_TIMEOUT_MS)

  socket.once('timeout', () => {
    logger({ level: 'debug', message: 'LDAP client connection idle timeout; closing connection' })
    socket.destroy()
  })
  socket.once('close', () => {
    activeConnections.delete(socket)
  })

  return true
}
