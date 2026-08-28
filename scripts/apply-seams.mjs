import seams from './fork-seams.mjs'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

// Inserts fork seams into upstream-owned files. Idempotent: applied seams are
// skipped, missing anchors fail loudly as STALE (upstream reshaped the region
// and the seam must be updated by hand — see FORK.md).
//
// Usage:
//   npm run seams:apply              apply missing seams
//   npm run seams:apply -- --check   report only; exit 1 if seams missing
//
// All anchors/matches are plain substrings of a single line (see fork-seams.mjs).

const check = process.argv.includes('--check')
const results = { applied: [], present: [], stale: [] }

function findLine(lines, needle) {
  return lines.findIndex(l => l.includes(needle))
}

for (const seam of seams) {
  if (!existsSync(seam.file)) {
    results.stale.push({ seam, reason: 'file missing' })
    continue
  }

  const content = readFileSync(seam.file, 'utf8')
  if (content.includes(seam.applied)) {
    results.present.push(seam)
    continue
  }

  const eol = content.includes('\r\n') ? '\r\n' : '\n'
  const lines = content.split(eol)

  if (seam.op === 'insert-after' || seam.op === 'insert-before') {
    const idx = findLine(lines, seam.anchor)
    if (idx === -1) {
      results.stale.push({ seam, reason: `anchor not found: ${seam.anchor}` })
      continue
    }
    let target = seam.op === 'insert-after' ? idx + 1 : idx
    if (seam.skipLines) {
      target += seam.skipLines
    }
    lines.splice(target, 0, ...seam.lines)
    writeFileSync(seam.file, lines.join(eol))
    results.applied.push(seam)
    continue
  }

  if (seam.op === 'replace-line') {
    const idx = findLine(lines, seam.match)
    if (idx === -1) {
      results.stale.push({ seam, reason: `match not found: ${seam.match}` })
      continue
    }
    lines[idx] = seam.replacement
    writeFileSync(seam.file, lines.join(eol))
    results.applied.push(seam)
    continue
  }

  if (seam.op === 'replace-all-lines') {
    let count = 0
    const updated = lines.map(l => {
      if (l.includes(seam.match)) {
        count++
        return seam.replacement
      }
      return l
    })
    if (count === 0) {
      results.stale.push({ seam, reason: `match not found: ${seam.match}` })
      continue
    }
    writeFileSync(seam.file, updated.join(eol))
    results.applied.push(seam)
    continue
  }

  if (seam.op === 'region-replace') {
    const startIdx = findLine(lines, seam.start)
    if (startIdx === -1) {
      results.stale.push({ seam, reason: `start anchor not found: ${seam.start}` })
      continue
    }
    const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes(seam.end))
    if (endIdx === -1) {
      results.stale.push({ seam, reason: `end anchor not found: ${seam.end}` })
      continue
    }
    lines.splice(startIdx, endIdx - startIdx, ...seam.lines)
    writeFileSync(seam.file, lines.join(eol))
    results.applied.push(seam)
    continue
  }

  results.stale.push({ seam, reason: `unknown op: ${seam.op}` })
}

for (const { seam } of results.present) {
  console.log(`present: ${seam.id} (${seam.description})`)
}
for (const { seam } of results.applied) {
  console.log(`applied: ${seam.id} (${seam.description})`)
}
for (const { seam, reason } of results.stale) {
  console.error(`STALE: ${seam.id} in ${seam.file} — ${reason}`)
  console.error(`  update the seam by hand, then adjust its anchor in scripts/fork-seams.mjs (FORK.md ${seam.ref})`)
}

console.log(`seams: ${results.applied.length} applied, ${results.present.length} already present, ${results.stale.length} stale`)

if (results.stale.length > 0 || (check && results.applied.length > 0)) {
  process.exit(1)
}
