/**
 * build-shell.mjs — emit the public, download-on-demand plugin.
 *
 *   node src/build-shell.mjs [--ref <git-ref>] [--out <path>]
 *
 * Reads src/registry.json (lightweight team metadata, NO contracts) and
 * src/shared/solo-tail.md, wraps them with the GitHub payload config, and
 * injects the result into src/template.js (which carries the UI + downloader)
 * at its data marker.
 *
 * The output plugin.js bundles only the registry + UI. Team contracts are
 * fetched from GitHub on install/summon and cached in localStorage — that is
 * why this file stays small no matter how many experts the catalog holds.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { bareSpecifiers } from './bare-specifiers.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.dirname(here)

const args = process.argv.slice(2)
function arg(name, fallback) {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
// Payload ref is pinned in src/release.json so the built plugin and
// verify-pipeline.mjs always prove the SAME remote. Pinned to an immutable tag,
// not a branch — a branch would let payloads change underneath installed caches.
let pinnedRef = 'main'
try {
  pinnedRef = JSON.parse(fs.readFileSync(path.join(here, 'release.json'), 'utf8')).ref || 'main'
} catch {
  pinnedRef = 'main'
}
const ref = arg('--ref', pinnedRef)
let out = arg('--out', path.join(root, 'plugin.js'))

const GITHUB = {
  owner: 'tuancookiez-hub',
  repo: 'hermes-experts-plugin',
  ref: ref,
  payloadDir: 'teams',
}

const registry = JSON.parse(fs.readFileSync(path.join(here, 'registry.json'), 'utf8'))
// Phase 2 capability remap: the shared solo tail is appended with the Hermes
// tool-reality map so EVERY solo agent knows how to actually execute (and what
// it must never promise). The agency-agents source contracts stay verbatim; the
// remap is injected at build time, not laundered into the MIT text.
const capabilities = fs.readFileSync(path.join(here, 'shared', 'capabilities.md'), 'utf8').trim()
// Phase 4 anti-slop standard: every solo agent must follow one INPUT/OUTPUT
// contract + hard constraints + named failure traps. Injected at build time, so
// the verbatim agency-agents contracts stay attribution-safe.
const ioContract = fs.readFileSync(path.join(here, 'shared', 'io-contract.md'), 'utf8').trim()
const soloTail = (fs.readFileSync(path.join(here, 'shared', 'solo-tail.md'), 'utf8').trim() + '\n\n' + capabilities + '\n\n' + ioContract).trim()
const today = new Date().toISOString().slice(0, 10)

const data = {
  build: today + '.1-shell',
  source: {
    updated: today,
    note: 'agency-agents (MIT) catalog — download-on-demand',
  },
  soloTail: soloTail,
  github: GITHUB,
  base:
    'https://raw.githubusercontent.com/' +
    GITHUB.owner + '/' + GITHUB.repo + '/' + GITHUB.ref + '/' + GITHUB.payloadDir + '/',
  registry: registry,
}

const json = JSON.stringify(data, null, 2)
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029')

const template = fs.readFileSync(path.join(here, 'template.js'), 'utf8')
const marker = '/*__DATA__*/'
if (template.indexOf(marker) < 0) throw new Error('template.js lost its /*__DATA__*/ marker')

const outSource = template.replace(marker, json)

// Reject bare specifiers the runtime loader would bounce — same rule as the
// inline build, because persona prose is JSON-escaped on the way in.
const bare = bareSpecifiers(outSource)
if (bare.size) {
  console.error('\nBUILD FAILED - plugin would be rejected by runtime-loader:')
  for (const [spec, hits] of bare) {
    console.error('  unsupported import: ' + JSON.stringify(spec))
    for (const h of hits) console.error('      line ' + h.line + ': ...' + h.around + '...')
  }
  process.exit(1)
}

fs.writeFileSync(out, outSource)
const kb = (fs.statSync(out).size / 1024).toFixed(1)
const teamCount = registry.length
const agentCount = registry.reduce((n, t) => n + t.members.length, 0)
console.log('build ' + data.build)
console.log('  teams   ' + teamCount)
console.log('  agents  ' + agentCount)
console.log('  github  ' + data.base)
console.log('  wrote   ' + out + '  (' + kb + ' KB)')
