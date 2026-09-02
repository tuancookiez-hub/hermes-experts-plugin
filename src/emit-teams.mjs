/**
 * emit-teams.mjs — turn converted agency agents into the plugin's two artifacts.
 *
 *   node src/emit-teams.mjs            # every domain under src/agency/
 *   node src/emit-teams.mjs marketing  # just one domain
 *
 * Emits:
 *   teams/<id>.json     — the heavy payload (leadHead + leadTail + member contracts)
 *   src/registry.json   — the lightweight team metadata (NO contracts) bundled into
 *                         plugin.js so the whole catalog is browseable offline.
 *
 * The split is the whole point of this repo: plugin.js stays ~80 KB no matter
 * how many experts exist, because their prose lives in teams/*.json and is
 * fetched on install/summon.
 *
 * Composition (Phase 3): a flat domain may be curated into several sub-teams
 * via src/compositions.json (keyed by domain). Each sub-team gets its own
 * specialized lead (team-lead-head.md uses {NAME}/{COUNT}/{FOCUS}) + a parameter
 * card (team-lead-tail.md) + the capability map, instead of one synthetic
 * "Domain Lead" holding the entire flat roster. Domains with no composition fall
 * back to the original one-team-per-domain behaviour (domain-lead-head/tail).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.dirname(here)
const agencyDir = path.join(here, 'agency')
const teamsDir = path.join(root, 'teams')
const sharedDir = path.join(here, 'shared')

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

// Composition map (Phase 3). null when no file / no entry for the domain.
let compositions = {}
try {
  compositions = JSON.parse(fs.readFileSync(path.join(here, 'compositions.json'), 'utf8'))
} catch {
  compositions = {}
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
  // id -> agent, for O(1) composition member resolution.
  const byId = {}
  for (const a of agents) byId[a.id] = a

  const capabilities = fs.readFileSync(path.join(sharedDir, 'capabilities.md'), 'utf8').trim()
  // Phase 4 anti-slop standard: every lead enforces one INPUT/OUTPUT contract +
  // hard constraints + named failure traps on its members. Injected at build time.
  const ioContract = fs.readFileSync(path.join(sharedDir, 'io-contract.md'), 'utf8').trim()

  const subteams = compositions[domain]
  if (Array.isArray(subteams) && subteams.length) {
    // ── Phase 3 composed path: one team per curated sub-team ──
    // Drop the old flat payload if a previous run emitted teams/<domain>.json.
    const stale = path.join(teamsDir, domain + '.json')
    if (fs.existsSync(stale)) {
      fs.rmSync(stale, { force: true })
      console.log('  removed stale flat payload teams/' + domain + '.json')
    }

    for (const sub of subteams) {
      const members = []
      for (const mid of sub.members || []) {
        const a = byId[mid]
        if (!a) {
          console.error('  ERROR: ' + domain + ' composition references unknown agent "' + mid + '"')
          process.exit(1)
        }
        members.push(a)
      }
      if (!members.length) {
        console.log('  skip sub-team ' + sub.id + ': no members resolved')
        continue
      }

      const leadHead = fs
        .readFileSync(path.join(sharedDir, 'team-lead-head.md'), 'utf8')
        .replace(/\{NAME\}/g, sub.name)
        .replace(/\{COUNT\}/g, String(members.length))
        .replace(/\{FOCUS\}/g, sub.focus || '')
        .trim()
      const leadTail = fs
        .readFileSync(path.join(sharedDir, 'team-lead-tail.md'), 'utf8')
        .trim()
      const leadTailFull = (leadTail + '\n\n' + capabilities + '\n\n' + ioContract).trim()

      const membersMap = {}
      for (const a of members) membersMap[a.id] = a.contract
      const payload = { id: sub.id, leadHead: leadHead, leadTail: leadTailFull, members: membersMap }
      fs.writeFileSync(path.join(teamsDir, sub.id + '.json'), JSON.stringify(payload, null, 2))

      const focusSentence = sub.focus.charAt(0).toUpperCase() + sub.focus.slice(1)
      registry.push({
        id: sub.id,
        name: sub.name,
        avatar: { letter: sub.name.charAt(0), tone: sub.tone || toneFor(domain, i) },
        memberTone: sub.tone || toneFor(domain, i),
        remit: focusSentence + '. Install the team to cache every contract locally, or summon any single expert on the fly.',
        startNote: 'Tell me the ' + sub.name + ' outcome you want and the channel.',
        ported: true,
        lead: {
          id: sub.id + '-lead',
          name: sub.name + ' Lead',
          role: 'Team Orchestrator',
          remit:
            'Orchestrates ' + members.length + ' ' + sub.name + ' specialists and assembles their work.',
          tags: [sub.name],
        },
        leadSkills: [],
        skills: [],
        members: members.map((a) => ({
          id: a.id,
          name: a.name,
          role: a.role,
          remit: a.remit || '',
          owns: a.owns || '',
          tags: a.tags || [],
          skills: a.skills || [],
        })),
      })

      totalAgents += members.length
      const kb = (JSON.stringify(payload).length / 1024).toFixed(1)
      console.log(
        '  ' + sub.id + ': ' + members.length + ' agents -> teams/' + sub.id + '.json (' + kb + ' KB)'
      )
    }
    return
  }

  // ── Fallback flat path: one team per domain (unchanged from Phase 2) ──
  const tone = toneFor(domain, i)
  const leadHead = fs
    .readFileSync(path.join(sharedDir, 'domain-lead-head.md'), 'utf8')
    .replace(/\{DOMAIN\}/g, titleCase(domain))
    .replace(/\{COUNT\}/g, String(agents.length))
    .trim()
  const leadTail = fs
    .readFileSync(path.join(sharedDir, 'domain-lead-tail.md'), 'utf8')
    .replace(/\{DOMAIN\}/g, titleCase(domain))
    .replace(/\{COUNT\}/g, String(agents.length))
    .trim()
  // Phase 2 capability remap: every lead gets the Hermes tool-reality map too,
  // so the orchestrator routes on what actually exists (publishing APIs, voice
  // cloning, lip sync, WorkBuddy model IDs are named as unavailable).
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
