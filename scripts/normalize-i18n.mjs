import { readFileSync, writeFileSync } from 'node:fs'

function countKeys(obj) {
  return Object.values(obj).reduce((n, v) => n + (typeof v === 'object' && v !== null ? countKeys(v) : 1), 0)
}

// Normalizes frontend/public/i18n/en-US.json to canonical formatting
// (2-space JSON.stringify + trailing newline) so that future upstream merges
// of the file are content-only, without formatting conflicts.
//
// Usage:
//   node scripts/normalize-i18n.mjs           — rewrite in place
//   node scripts/normalize-i18n.mjs --check   — exit 1 if reformatting needed

const file = 'frontend/public/i18n/en-US.json'
const check = process.argv.includes('--check')

let parsed
try {
  parsed = JSON.parse(readFileSync(file, 'utf8'))
} catch (e) {
  console.error(`i18n: ${file} is not valid JSON: ${e.message}`)
  process.exit(1)
}

const canonical = `${JSON.stringify(parsed, null, 2)}\n`
const original = readFileSync(file, 'utf8')

// line endings vary by checkout (git autocrlf); compare content only
if (original.replace(/\r\n/g, '\n') === canonical) {
  console.log(`i18n: ${file} already normalized (${countKeys(parsed)} keys)`)
  process.exit(0)
}

if (check) {
  console.error(`i18n: ${file} needs normalization — run: npm run i18n:normalize`)
  process.exit(1)
}

writeFileSync(file, canonical)
console.log(`i18n: normalized ${file} (${countKeys(parsed)} keys)`)
