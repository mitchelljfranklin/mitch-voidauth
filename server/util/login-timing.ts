import { argon2 } from './argon2id'

// Fork-owned module: login response timing equalization. interaction.ts keeps
// a single call seam (see FORK.md).

// Hash of an unusable password, verified against when the submitted username
// does not exist so that response timing does not reveal valid usernames
const DUMMY_PASSWORD_HASH = argon2.hash('voidauth-timing-equalization')

export async function timingEqualizedReject(password: string): Promise<void> {
  await argon2.verify(DUMMY_PASSWORD_HASH, password)
}
