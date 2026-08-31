import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

// Records a new upstream base in FORK.md (history table) and CHANGELOG.md
// (upstream base table). Run as the final step of an upstream merge.
//
// Usage:
//   npm run base:set                                  — sha from git (upstream/main), today's date
//   npm run base:set -- <sha> [date] [notes]          — explicit values
//
// Idempotent: skips if the sha is already recorded.

const argSha = process.argv[2]
const argDate = process.argv[3]
const argNotes = process.argv[4]

let sha = argSha
if (!sha) {
  sha = execSync('git rev-parse --short upstream/main').toString().trim()
}
const date = argDate ?? new Date().toISOString().slice(0, 10)
const notes = argNotes ?? ''

for (const [file, tableMarker, columnCount] of [
  ['FORK.md', '| Upstream base | Merged on | Notes |', 3],
  ['CHANGELOG.md', '| Upstream base | Merged on |', 2],
]) {
  if (!existsSync(file)) {
    console.error(`base:set: ${file} not found`)
    process.exit(1)
  }
  const content = readFileSync(file, 'utf8')

  if (content.includes(`\`${sha}\``)) {
    console.log(`base:set: ${file} already records ${sha}`)
    continue
  }

  const lines = content.split(/\r?\n/)
  const headerIdx = lines.findIndex(l => l.trim() === tableMarker)
  if (headerIdx === -1) {
    console.error(`base:set: table header not found in ${file}: ${tableMarker}`)
    process.exit(1)
  }
  // first row after the header and its separator is the newest base; insert above it
  let insertIdx = -1
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('|--') || lines[i].startsWith('| -')) {
      continue
    }
    if (lines[i].startsWith('|')) {
      insertIdx = i
      break
    }
  }
  if (insertIdx === -1) {
    insertIdx = headerIdx + 2
  }

  const row = columnCount === 3
    ? `| \`${sha}\` | ${date} | ${notes} |`
    : `| \`${sha}\` | ${date} |`
  lines.splice(insertIdx, 0, row)
  writeFileSync(file, lines.join('\n'))
  console.log(`base:set: ${file} now records ${sha} (${date})`)
}
