import * as OTPAuth from 'otpauth'

process.env.DB_ADAPTER = 'postgres'
process.env.DB_HOST = 'localhost'
process.env.DB_PORT = '5433'
process.env.DB_PASSWORD = 'testpass123'
process.env.DB_USER = 'postgres'
process.env.DB_NAME = 'postgres'
process.env.STORAGE_KEY = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
process.env.APP_URL = 'http://localhost:3000'

const { createTOTP, validateTOTP } = await import('../server/db/totp.ts')
const { db } = await import('../server/db/db.ts')
const { decryptString } = await import('../server/db/util.ts')

let failures = 0
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} (got ${String(actual)}, want ${String(expected)})`)
}

async function createUser(): Promise<string> {
  const id = crypto.randomUUID()
  await db().table('user').insert({
    id,
    username: `harness_${id.slice(0, 8)}`,
    passwordHash: '',
    approved: true,
    emailVerified: true,
    mfaRequired: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  return id
}

type TotpRow = {
  secret: string
  lastUsedTimestep: number | null
  expiresAt: Date | number | null
}

async function getTotpRow(userId: string): Promise<TotpRow | undefined> {
  return (await db().table('totp').where({ userId }).first()) as TotpRow | undefined
}

async function pendingSecret(userId: string): Promise<string> {
  const row = await getTotpRow(userId)
  return row ? (decryptString(row.secret, [process.env.STORAGE_KEY]) ?? '') : ''
}

// ---- scenario 1: enrollment then immediate login in the same window ----
const realNow = Date.now
const user1 = await createUser()
const { secret } = await createTOTP(user1, 'tester99')
const totp = new OTPAuth.TOTP({ secret })
console.log('period:', totp.period, '| secret parses:', !!secret)

const code0 = totp.generate({ timestamp: realNow() })
check('enrollment confirm accepts current code', await validateTOTP(user1, code0), true)

const row1a = await getTotpRow(user1)
check('promotion does not consume timestep', row1a?.lastUsedTimestep, null)
check('promotion makes TOTP permanent', row1a?.expiresAt, null)

check('immediate login same window accepted', await validateTOTP(user1, code0), true)
const row1b = await getTotpRow(user1)
check('login records timestep', typeof row1b?.lastUsedTimestep, 'number')

check('same-window login replay rejected', await validateTOTP(user1, code0), false)

// ---- scenario 2: next window accepts fresh code, rejects reuse ----
Date.now = () => realNow() + 31_000
const code1 = totp.generate({ timestamp: Date.now() })
check('next-window fresh code accepted', await validateTOTP(user1, code1), true)
Date.now = () => realNow() + 32_000
check('previous-window replay rejected', await validateTOTP(user1, code1), false)

// ---- scenario 3: one-window-old code on first use still accepted (clock skew tolerance) ----
const user2 = await createUser()
await createTOTP(user2, 'late-user')
Date.now = () => realNow() + 62_000
const prevWindowCode = new OTPAuth.TOTP({ secret: await pendingSecret(user2) }).generate({ timestamp: realNow() + 31_000 })
check('one-window-old code accepted on first use', await validateTOTP(user2, prevWindowCode), true)

Date.now = realNow
await db().destroy()
console.log(failures === 0 ? 'ALL PASS' : `${String(failures)} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
