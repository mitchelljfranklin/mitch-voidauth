import { argon2Sync, randomBytes, timingSafeEqual } from 'node:crypto'
import { Worker } from 'node:worker_threads'
import { availableParallelism } from 'node:os'

const ARGON2_ALGORITHMS = ['argon2d', 'argon2i', 'argon2id'] as const

type Argon2Algorithm = typeof ARGON2_ALGORITHMS[number]

type Argon2Params = {
  m?: number
  t?: number
  p?: number
}

function parseHash(hash: string): {
  alg: Argon2Algorithm
  params: Argon2Params
  salt: Buffer
  storedHash: Buffer
} {
  // Split the hash string: $[alg]$v=[version]$m=[mem],t=[iter],p=[parallel]$[salt]$[hash]
  const parts = hash.split('$')
  if (parts.length !== 6) {
    throw new Error('Invalid Argon2 PHC string format.')
  }

  const alg = parts[1]
  if (!alg || !ARGON2_ALGORITHMS.includes(alg as Argon2Algorithm)) {
    throw new Error(`Unsupported hash algorithm: ${String(alg)}`)
  }

  const paramStr = parts[3]
  const saltBase64 = parts[4]
  const hashBase64 = parts[5]
  if (!paramStr || !saltBase64 || !hashBase64) {
    throw new Error('Invalid Argon2 PHC string format.')
  }

  const params: Argon2Params = {}
  paramStr.split(',').forEach((p: string) => {
    const [k, v] = p.split('=')
    if (typeof k !== 'string' || typeof v !== 'string') {
      return
    }
    const iv = Number.parseInt(v)
    if (!Number.isInteger(iv)) {
      return
    }
    if (k !== 'm' && k !== 't' && k !== 'p') {
      return
    }
    params[k] = iv
  })

  if (!params.m || !params.t || !params.p) {
    throw new Error(`Argon2 hash missing parameters.`)
  }

  return {
    alg: alg as Argon2Algorithm,
    params,
    salt: Buffer.from(saltBase64, 'base64'),
    storedHash: Buffer.from(hashBase64, 'base64'),
  }
}

// Argon2 hashing is CPU and memory intensive; running it on the main event loop
// allows any unthrottled authentication path to stall the whole server.
// Verification therefore runs inside a small pool of worker threads.
const WORKER_SRC = `
const { argon2Sync } = require('node:crypto');
const { parentPort } = require('node:worker_threads');
parentPort.on('message', (job) => {
  try {
    parentPort.postMessage({ id: job.id, value: argon2Sync(job.alg, job.options).toString('base64') });
  } catch (_e) {
    parentPort.postMessage({ id: job.id, error: true });
  }
});
`

const WORKER_COUNT = Math.max(1, Math.min(3, availableParallelism() - 1))
const MAX_PENDING_JOBS = 64

type PoolWorker = {
  worker: Worker
  inflight: number
}

type PendingJob = {
  resolve: (value: Buffer) => void
  reject: () => void
  worker: PoolWorker
}

const pool: PoolWorker[] = []
const pendingJobs = new Map<number, PendingJob>()
let nextJobId = 0

function createPoolWorker(): PoolWorker {
  const poolWorker: PoolWorker = {
    worker: new Worker(WORKER_SRC, { eval: true }),
    inflight: 0,
  }

  poolWorker.worker.on('message', (msg: { id: number, value?: string, error?: boolean }) => {
    const job = pendingJobs.get(msg.id)
    if (!job) {
      return
    }
    pendingJobs.delete(msg.id)
    poolWorker.inflight -= 1
    if (typeof msg.value === 'string' && !msg.error) {
      job.resolve(Buffer.from(msg.value, 'base64'))
    } else {
      job.reject()
    }
  })

  poolWorker.worker.on('error', () => {
    failPoolWorker(poolWorker)
  })

  poolWorker.worker.on('exit', () => {
    failPoolWorker(poolWorker)
  })

  return poolWorker
}

function failPoolWorker(poolWorker: PoolWorker) {
  for (const [id, job] of pendingJobs) {
    if (job.worker === poolWorker) {
      pendingJobs.delete(id)
      job.reject()
    }
  }
  const index = pool.indexOf(poolWorker)
  if (index >= 0) {
    pool.splice(index, 1)
  }
}

function runInPool(alg: Argon2Algorithm, options: {
  message: string
  nonce: Buffer
  parallelism: number
  memory: number
  passes: number
  tagLength: number
}): Promise<Buffer> {
  if (pendingJobs.size >= MAX_PENDING_JOBS) {
    return Promise.reject(new Error('Argon2 worker queue is full.'))
  }

  let poolWorker = pool.filter(w => w.inflight < MAX_PENDING_JOBS).sort((a, b) => a.inflight - b.inflight)[0]
  if (!poolWorker && pool.length < WORKER_COUNT) {
    poolWorker = createPoolWorker()
    pool.push(poolWorker)
  }
  if (!poolWorker) {
    const leastLoaded = [...pool].sort((a, b) => a.inflight - b.inflight)[0]
    if (!leastLoaded) {
      return Promise.reject(new Error('No argon2 workers available.'))
    }
    poolWorker = leastLoaded
  }

  const id = nextJobId++
  return new Promise<Buffer>((resolve, reject) => {
    pendingJobs.set(id, { resolve, reject, worker: poolWorker })
    poolWorker.inflight += 1
    poolWorker.worker.postMessage({ id, alg, options })
  })
}

async function verify(hash: string, password: string): Promise<boolean> {
  let parsed: ReturnType<typeof parseHash>
  try {
    parsed = parseHash(hash)
  } catch (_e) {
    return false
  }

  let passwordHashValue: Buffer
  try {
    passwordHashValue = await runInPool(parsed.alg, {
      message: password,
      nonce: parsed.salt,
      parallelism: parsed.params.p as number,
      memory: parsed.params.m as number,
      passes: parsed.params.t as number,
      tagLength: parsed.storedHash.length,
    })
  } catch (_e) {
    return false
  }

  // timingSafeEqual requires both Buffers to be the same length
  if (passwordHashValue.length !== parsed.storedHash.length) return false

  return timingSafeEqual(passwordHashValue, parsed.storedHash)
}

function hash(password: string): string {
  const options = {
    memory: 65536,
    passes: 3,
    parallelism: 4,
    tagLength: 32,
    nonce: randomBytes(16),
  }

  // create hash from password
  const hashBuffer = argon2Sync('argon2id', {
    message: password,
    ...options,
  })

  // Convert parameters to string format: m=mem,t=iter,p=parallel
  const paramsStr = `m=${String(options.memory)},t=${String(options.passes)},p=${String(options.parallelism)}`
  const saltBase64 = options.nonce.toString('base64')
  const hashBase64 = hashBuffer.toString('base64')

  // Format the full hash string
  return `$argon2id$v=19$${paramsStr}$${saltBase64}$${hashBase64}`
}

export const argon2 = {
  verify,
  hash,
}
