/**
 * emit-teams.mjs — turn converted agency agents into the plugin's two artifacts.
 *
 *   node src/emit-teams.mjs            # every domain under src/agency/
 *   node src/emit-teams.mjs marketing  # just one domain
 *
 * Emits:
 *   teams/<domain>.json   — the heavy payload (leadHead + leadTail + member contracts)
 *   src/registry.json     — the lightweight team metadata (NO contracts) bundled into
 *                           plugin.js so the whole catalog is browseable offline.
 *
 * The split is the whole point of this repo: plugin.js stays ~80 KB no matter
 * how many experts exist, because their prose lives in teams/*.json and is
 * fetched on install/summon.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.dirname(here)
const agencyDir = path.join(here, 'agency')
const teamsDir = path.join(root, 'teams')

const TONE_BY_DOMAIN = {
  marketing: 'sky',
  design: 'violet',
  engineering: 'emerald',
  finance: 'amber',
  'game-development': 'rose',
  gis: 'indigo',
  healthcare: 'emerald',
  'paid-media': 'rose',
  product: 'indigo',
  'project-management': 'sky',
  research: 'violet',
  sales: 'amber',
  security: 'rose',
  'spatial-computing': 'indigo',
  specialized: 'sky',
  support: 'emerald',
  academic: 'violet',
}

function titleCase(s) {
  return s
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function toneFor(domain, i) {
  return TONE_BY_DOMAIN[domain] || ['indigo', 'emerald', 'sky', 'rose', 'amber', 'violet'][i % 6]
}

const args = process.argv.slice(2)
const want = args.length ? args : null

const domains = fs
  .readdirSync(agencyDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && (!want || want.includes(d.name)))
  .map((d) => d.name)

if (!domains.length) {
  console.error('no agency domains found under src/agency/')
  process.exit(1)
}

fs.mkdirSync(teamsDir, { recursive: true })

const registry = []
let totalAgents = 0

domains.forEach((domain, i) => {
  const dir = path.join(agencyDir, domain)
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
  if (!files.length) {
    console.log('  skip ' + domain + ': no agents')
    return
  }

  const agents = files
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
    .sort((a, b) => a.name.localeCompare(b.name))

  const tone = toneFor(domain, i)
  const leadHead = fs
    .readFileSync(path.join(here, 'shared', 'domain-lead-head.md'), 'utf8')
    .replace(/\{DOMAIN\}/g, titleCase(domain))
    .replace(/\{COUNT\}/g, String(agents.length))
    .trim()
  const leadTail = fs
    .readFileSync(path.join(here, 'shared', 'domain-lead-tail.md'), 'utf8')
    .replace(/\{DOMAIN\}/g, titleCase(domain))
    .replace(/\{COUNT\}/g, String(agents.length))
    .trim()
  // Phase 2 capability remap: every lead gets the Hermes tool-reality map too,
  // so the orchestrator routes on what actually exists (publishing APIs, voice
  // cloning, lip sync, WorkBuddy model IDs are named as unavailable).
  const capabilities = fs.readFileSync(path.join(here, 'shared', 'capabilities.md'), 'utf8').trim()
  const leadTailFull = (leadTail + '\n\n' + capabilities).trim()

  // ── payload (the heavy file fetched on install) ──
  const membersMap = {}
  for (const a of agents) membersMap[a.id] = a.contract
  const payload = { id: domain, leadHead: leadHead, leadTail: leadTailFull, members: membersMap }
  fs.writeFileSync(path.join(teamsDir, domain + '.json'), JSON.stringify(payload, null, 2))

  // ── registry entry (lightweight, bundled) ──
  const remit =
    'Browse and run ' +
    agents.length +
    ' ' +
    titleCase(domain) +
    ' experts. Install the team to cache every contract locally, or summon any single expert on the fly.'
  registry.push({
    id: domain,
    name: titleCase(domain),
    avatar: { letter: titleCase(domain).charAt(0), tone: tone },
    memberTone: tone,
    remit: remit,
    startNote: 'Brief me on the ' + titleCase(domain).toLowerCase() + ' outcome you want and the channel.',
    ported: true,
    lead: {
      id: domain + '-lead',
      name: titleCase(domain) + ' Lead',
      role: 'Domain Orchestrator',
      remit: 'Orchestrates ' + agents.length + ' ' + titleCase(domain) + ' specialists and assembles their work.',
      tags: [titleCase(domain)],
    },
    leadSkills: [],
    skills: [],
    members: agents.map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      remit: a.remit || '',
      owns: a.owns || '',
      tags: a.tags || [],
      skills: a.skills || [],
    })),
  })

  totalAgents += agents.length
  const kb = (JSON.stringify(payload).length / 1024).toFixed(1)
  console.log(
    '  ' + domain + ': ' + agents.length + ' agents -> teams/' + domain + '.json (' + kb + ' KB)'
  )
})

// Sort the registry so the catalog order is stable across runs.
registry.sort((a, b) => a.name.localeCompare(b.name))
fs.writeFileSync(path.join(here, 'registry.json'), JSON.stringify(registry, null, 2))

console.log('\nregistry: ' + registry.length + ' teams / ' + totalAgents + ' agents')
console.log('wrote src/registry.json + teams/*.json')
