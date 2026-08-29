import { EventEmitter } from 'node:events'
import type { Socket } from 'node:net'
import { admitConnection, isBindBlocked, recordBindFailure, recordBindSuccess } from '../server/ldap/hardening.ts'

let failures = 0
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} (got ${String(actual)}, want ${String(expected)})`)
}

type MockSocket = Socket & { lastTimeout?: number }

function mockSocket(address: string): MockSocket {
  const s = new EventEmitter() as unknown as MockSocket
  Object.defineProperty(s, 'remoteAddress', { value: address })
  let lastTimeout: number | undefined
  s.setTimeout = (ms: number) => {
    lastTimeout = ms
    return s
  }
  s.destroy = () => s
  Object.defineProperty(s, 'lastTimeout', { get: () => lastTimeout })
  return s
}

// ---- bind failure backoff: threshold, exponential growth, cap, reset ----
const realNow = Date.now
const attacker = mockSocket('10.0.0.99')

for (let i = 1; i <= 4; i++) {
  recordBindFailure(attacker)
  check(`attempt ${String(i)} below threshold not blocked`, isBindBlocked(attacker), false)
}

// consecutive failures (expiring each window) grow the backoff exponentially,
// capped at 15 minutes: failure 5 → 30s, 6 → 60s, 7 → 120s, ... capped at 900s
let elapsed = 0
let prevWindowS = 30
for (let count = 6; count <= 11; count++) {
  const failureNumber = count - 1
  elapsed += prevWindowS + 2
  Date.now = () => realNow() + elapsed * 1000
  check(`window expired before failure ${String(failureNumber)}`, isBindBlocked(attacker), false)

  recordBindFailure(attacker)
  const thisWindowS = Math.min(30 * 2 ** (failureNumber - 5), 15 * 60)

  Date.now = () => realNow() + (elapsed + thisWindowS - 1) * 1000
  check(`failure ${String(failureNumber)} blocked for ~${String(thisWindowS)}s (active at ${String(elapsed + thisWindowS - 1)}s)`, isBindBlocked(attacker), true)

  Date.now = () => realNow() + (elapsed + thisWindowS + 1) * 1000
  check(`failure ${String(failureNumber)} window expired after ${String(elapsed + thisWindowS + 1)}s`, isBindBlocked(attacker), false)

  prevWindowS = thisWindowS
}
Date.now = realNow

// ---- other clients unaffected + success resets state ----
const victim = mockSocket('10.0.0.100')
check('other source addresses unaffected', isBindBlocked(victim), false)

const flipper = mockSocket('10.0.0.101')
for (let i = 0; i < 6; i++) {
  recordBindFailure(flipper)
}
check('blocked after repeated failures', isBindBlocked(flipper), true)
recordBindSuccess(flipper)
check('successful bind clears failure state', isBindBlocked(flipper), false)

// ---- connection guard: cap, idle timeout registration, close frees slot ----
const sockets: MockSocket[] = []
let rejected = 0
for (let i = 0; i < 70; i++) {
  const s = mockSocket(`192.168.1.${String(i)}`)
  sockets.push(s)
  if (!admitConnection(s)) {
    rejected++
  }
}
check('connection cap admits exactly 64', rejected, 6)
const first = sockets[0] as MockSocket
check('idle timeout registered at 5 minutes', first.lastTimeout, 5 * 60 * 1000)

first.emit('close')
const late = mockSocket('192.168.1.200')
check('closed connection frees a slot', admitConnection(late), true)

console.log(failures === 0 ? 'ALL PASS' : `${String(failures)} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
