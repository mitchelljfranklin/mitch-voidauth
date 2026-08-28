import type { Entry } from 'ldapts'

process.env.DB_ADAPTER = 'postgres'
process.env.DB_HOST = 'localhost'
process.env.DB_PORT = '5433'
process.env.DB_PASSWORD = 'testpass123'
process.env.DB_USER = 'postgres'
process.env.DB_NAME = 'postgres'
process.env.STORAGE_KEY = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
process.env.APP_URL = 'http://localhost:3000'
process.env.LDAP_SYNC_ADMIN_GROUP_NAME = 'voidadmins'

const { assignAdminGroupToAdminLDAPUsers } = await import('../server/ldap/sync.ts')
const { db } = await import('../server/db/db.ts')

const ZERO = '00000000-0000-0000-0000-000000000000'
const ALICE_DN = 'uid=alice,ou=people,dc=voidauth,dc=test'
const BOB_DN = 'uid=bob,ou=people,dc=voidauth,dc=test'

let failures = 0
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} (got ${String(actual)}, want ${String(expected)})`)
}

async function createUser(username: string, dn: string): Promise<string> {
  const id = crypto.randomUUID()
  await db().table('user').insert({
    id,
    username,
    passwordHash: '',
    approved: true,
    emailVerified: true,
    mfaRequired: false,
    ldapSource: 'ldap',
    ldapExternalId: dn,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  return id
}

async function isAdmin(userId: string): Promise<boolean> {
  const row = (await db().table('user_group').where({ userId }).first()) as { userId: string } | undefined
  return !!row
}

// bootstrap: auth_admins group + an acting admin whose id represents a UI assigner
const adminGroupId = crypto.randomUUID()
await db().table('group').insert({
  id: adminGroupId,
  name: 'auth_admins',
  mfaRequired: false,
  autoAssign: false,
  createdBy: ZERO,
  updatedBy: ZERO,
  createdAt: new Date(),
  updatedAt: new Date(),
})
const uiAdminId = crypto.randomUUID()
await db().table('user').insert({
  id: uiAdminId,
  username: 'ui_admin',
  passwordHash: '',
  approved: true,
  emailVerified: true,
  mfaRequired: false,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const alice = await createUser('alice', ALICE_DN)
const bob = await createUser('bob', BOB_DN)

// pre-state: alice's membership was sync-granted; bob's was assigned in the UI
async function grant(user: string, creator: string) {
  await db().table('user_group').insert({
    userId: user,
    groupId: adminGroupId,
    createdBy: creator,
    updatedBy: creator,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}
await grant(alice, ZERO)
await grant(bob, uiAdminId)

const voidadminsGroup: Entry = { dn: 'cn=voidadmins,ou=groups,dc=voidauth,dc=test' }
const aliceEntry: Entry = { dn: ALICE_DN, memberOf: ['cn=voidadmins,ou=groups,dc=voidauth,dc=test'] }
const bobEntry: Entry = { dn: BOB_DN }

// ---- cycle 1: alice in LDAP admin group ----
console.log('--- cycle 1 (alice member) ---')
await assignAdminGroupToAdminLDAPUsers([aliceEntry, bobEntry], [voidadminsGroup])
check('sync-granted admin kept while member', await isAdmin(alice), true)
check('manually assigned admin survives (the fix)', await isAdmin(bob), true)

// ---- cycle 2: alice leaves the LDAP admin group ----
console.log('--- cycle 2 (alice removed) ---')
await assignAdminGroupToAdminLDAPUsers([bobEntry], [voidadminsGroup])
check('sync-granted admin revoked after leaving group', await isAdmin(alice), false)
check('manually assigned admin still survives', await isAdmin(bob), true)

// ---- diagnostics: configured group missing from directory ----
console.log('--- diagnostics: group missing (expect warning above) ---')
await assignAdminGroupToAdminLDAPUsers([bobEntry], [])
check('no memberships changed when group missing', await isAdmin(bob), true)

// ---- diagnostics: group exists but no user lists it in memberOf ----
console.log('--- diagnostics: no memberOf match (expect warning above) ---')
await assignAdminGroupToAdminLDAPUsers([bobEntry], [voidadminsGroup])
check('no memberships changed without memberOf matches', await isAdmin(bob), true)

await db().destroy()
console.log(failures === 0 ? 'ALL PASS' : `${String(failures)} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
