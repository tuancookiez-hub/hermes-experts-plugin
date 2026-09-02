/**
 * verify-pipeline.mjs — prove the download-on-demand contract pipeline.
 *
 *   node verify-pipeline.mjs
 *
 * Two proofs that the plugin's "Install / Summon fetches teams/<id>.json and
 * builds a persona" path actually works for EVERY curated team (all agents):
 *
 *   Part A  static  — read every teams/<id>.json + src/registry.json, assert
 *                     each registry member resolves to a non-empty contract and
 *                     that the persona builders yield real prose.
 *   Part B  live    — serve the repo over HTTP and fetch each payload the SAME
 *                     way the plugin does (fetch -> .json()), then re-run the
 *                     assertions on the downloaded bytes. Exercises the real
 *                     network path, not just a file read.
 *
 *   Part C  remote  — best-effort: hit the real GitHub raw URL for each team.
 *                     Skipped (warned) when the sandbox has no network; fails
 *                     when GitHub IS reachable but returns non-200 (catches a
 *                     stale/forgotten push).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'

const here = path.dirname(fileURLToPath(import.meta.url))
const registry = JSON.parse(fs.readFileSync(path.join(here, 'src', 'registry.json'), 'utf8'))
const soloTail = (fs.readFileSync(path.join(here, 'src', 'shared', 'solo-tail.md'), 'utf8').trim() + '\n\n' +
  fs.readFileSync(path.join(here, 'src', 'shared', 'capabilities.md'), 'utf8').trim() + '\n\n' +
  fs.readFileSync(path.join(here, 'src', 'shared', 'io-contract.md'), 'utf8').trim()).trim()

const fail = []
const assert = (cond, msg) => { if (!cond) fail.push(msg) }

// ── persona builders (mirror template.js exactly) ──
function soloPersona(member, tname) {
  return [
    'You are ' + member.name + ' — ' + member.role + ', a specialist on the ' + tname + ' team.',
    '',
    member.contract,
    soloTail,
  ].join('\n')
}
function leadPersona(leadHead, leadTail, members) {
  const contracts = members.map((m) => m.contract).filter(Boolean).join('\n\n')
  return [leadHead, '', '## MEMBER CONTRACTS', '', contracts, '', leadTail].join('\n')
}

function checkPayload(payload, label, team) {
  const teamId = team.id
  const memberIds = team.members.map((m) => m.id)
  console.log('\n--- ' + label + ' (' + team.name + ' / ' + teamId + ') ---')
  assert(payload && payload.id === teamId, label + ': payload.id matches team')
  assert(payload.leadHead && payload.leadHead.length > 100, label + ': leadHead present')
  assert(payload.leadTail && payload.leadTail.length > 100, label + ': leadTail present')
  const keys = Object.keys(payload.members || {})
  assert(keys.length === memberIds.length, label + ': payload has ' + memberIds.length + ' contracts (got ' + keys.length + ')')
  let missing = 0
  let short = 0
  let named = 0
  for (const m of team.members) {
    const c = (payload.members && payload.members[m.id]) || ''
    if (!c) { missing++; continue }
    if (c.length < 400) short++
    // Build the persona from the PAYLOAD contract (registry members carry none).
    const p = soloPersona({ name: m.name, role: m.role, contract: c }, team.name)
    if (p.includes(m.name) && p.length > 500) named++
  }
  assert(missing === 0, label + ': every registry member resolves to a contract (' + missing + ' missing)')
  assert(short === 0, label + ': every contract is substantial (>400 chars) (' + short + ' too short)')
  assert(named === memberIds.length, label + ': solo persona built for all ' + memberIds.length + ' (' + named + ')')
  // Phase 2 capability remap: the Hermes tool-reality map must reach BOTH the
  // solo persona (via soloTail) and the lead persona (via leadTail).
  const sampleP = soloPersona({ name: team.members[0].name, role: team.members[0].role, contract: payload.members[team.members[0].id] }, team.name)
  assert(/Tool reality in this environment/.test(sampleP), label + ': solo persona carries the Hermes capability map')
  assert(/web search toolset/.test(sampleP), label + ': capability map remaps WebSearch -> web search')
  assert(/do not reference, do not promise/.test(sampleP), label + ': capability map names the unavailable tools')
  // Phase 4 anti-slop standard: every solo agent must follow one INPUT/OUTPUT
  // contract + hard constraints + named failure traps.
  assert(/Anti-Slop Contract Standard/.test(sampleP), label + ': solo persona carries the anti-slop I/O standard')
  assert(/Named failure traps/.test(sampleP), label + ': solo persona carries the named failure traps')
  const lp = leadPersona(payload.leadHead, payload.leadTail, team.members.map((m) => ({ contract: payload.members[m.id] })))
  assert(lp.length > 2000 && lp.includes(team.lead.name), label + ': lead persona built and names the lead')
  assert(/Tool reality in this environment/.test(lp), label + ': lead persona carries the Hermes capability map')
  assert(/Anti-Slop Contract Standard/.test(lp), label + ': lead persona carries the anti-slop I/O standard')
  assert(/No fabricated evidence/.test(lp), label + ': lead persona carries the hard constraints')
  console.log('  members        :', keys.length)
  console.log('  missing/short  :', missing + ' / ' + short)
  console.log('  lead persona   :', lp.length, 'chars')
  console.log('  sample expert  :', team.members[0].name, '-> solo persona', sampleP.length, 'chars')
}

let totalAgents = 0
for (const t of registry) totalAgents += t.members.length

// ══ Part A: static files ══
for (const team of registry) {
  const p = JSON.parse(fs.readFileSync(path.join(here, 'teams', team.id + '.json'), 'utf8'))
  checkPayload(p, 'Part A — static teams/' + team.id + '.json', team)
}

// ══ Part B: live HTTP fetch (same mechanism the plugin uses) ══
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  const file = path.join(here, url)
  if (!file.startsWith(here) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return
  }
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(fs.readFileSync(file))
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port
const base = 'http://127.0.0.1:' + port + '/'

for (const team of registry) {
  try {
    const res = await fetch(base + 'teams/' + team.id + '.json')
    assert(res.ok, 'Part B: HTTP ' + res.status + ' for teams/' + team.id + '.json')
    if (res.ok) checkPayload(await res.json(), 'Part B — fetched over HTTP (' + team.id + ')', team)
  } catch (e) {
    fail.push('Part B: fetch failed for ' + team.id + ': ' + e.message)
  }
}
server.close()

// ══ Part C: real GitHub raw URL (best-effort) ══
const GITHUB_BASE = 'https://raw.githubusercontent.com/tuancookiez-hub/hermes-experts-plugin/main/teams/'
let remoteTried = 0
let remoteOk = 0
for (const team of registry) {
  try {
    const res = await fetch(GITHUB_BASE + team.id + '.json')
    remoteTried++
    if (res.ok) {
      remoteOk++
      const payload = await res.json()
      checkPayload(payload, 'Part C — GitHub raw teams/' + team.id + '.json', team)
    } else {
      fail.push('Part C: GitHub raw HTTP ' + res.status + ' for teams/' + team.id + '.json (did you push?)')
    }
  } catch (e) {
    console.log('\n  (Part C skipped for ' + team.id + ' — no network to GitHub: ' + e.message + ')')
  }
}

console.log('\nregistry: ' + registry.length + ' teams / ' + totalAgents + ' agents')
if (remoteTried) console.log('GitHub raw: ' + remoteOk + '/' + remoteTried + ' reachable + valid')
else console.log('GitHub raw: skipped (no network in this environment)')

console.log('')
if (fail.length) {
  console.error('PIPELINE FAILURES (' + fail.length + '):')
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('  all ' + totalAgents + ' agents across ' + registry.length + ' teams download + render correctly (static + live)')
