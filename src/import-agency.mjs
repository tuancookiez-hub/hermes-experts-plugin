/**
 * Import msitarzewski/agency-agents (MIT) into our agent payload files.
 *
 *   node src/import-agency.mjs engineering design     # those domains
 *   node src/import-agency.mjs --all                  # every upstream domain
 *   node src/import-agency.mjs --all --force          # re-fetch even if present
 *
 * Mechanical on purpose: hundreds of agents cannot be hand-ported, and
 * hand-editing their prose would silently launder MIT content into something
 * that looks original. We keep the text VERBATIM (MIT allows it WITH
 * attribution) and only adapt the wrapper: YAML frontmatter -> our JSON model.
 *
 * Attribution is shipped in NOTICE-agency-agents.md — do not drop it.
 *
 * Output: src/agency/<domain>/<agent>.json + src/agency/registry.json (a
 * manifest of everything currently on disk, rebuilt from a directory scan so it
 * stays complete no matter which domains you pass).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = 'msitarzewski/agency-agents'
const BRANCH = 'main'
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/`
const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.dirname(here)
// fileURLToPath, not URL.pathname — the latter yields "/C:/..." on Windows and
// path.join turns that into the nonsense path "C:\C:\Users\..." above.
const OUT_DIR = path.join(root, 'src', 'agency')

const args = process.argv.slice(2)
const all = args.includes('--all')
const force = args.includes('--force')

// Directories that are NOT agent domains. `examples` ships sample workflows,
// `strategy`/`integrations`/`scripts` ship playbooks and READMEs rather than
// standalone agent personas — importing those would put documents in the roster
// that have no name/description frontmatter and read as noise.
const SKIP_DIRS = new Set([
  'examples', 'strategy', 'integrations', 'scripts', '.github', 'docs',
])

// Docs masquerading as agents: never import these filenames. Matched as an EXACT
// stem (plus locale suffixes) — a loose /^AGENTS/ prefix test would also swallow
// real agents such as `specialized/agents-orchestrator.md`.
const DOC_STEMS = new Set([
  'readme', 'contributing', 'security', 'changelog', 'license',
  'code_of_conduct', 'code-of-conduct', 'index', 'agents',
])
function isDocFile(base) {
  const stem = base.replace(/\.md$/i, '').toLowerCase()
  if (DOC_STEMS.has(stem)) return true
  return /^(readme|contributing|changelog|license|code[-_]of[-_]conduct)([._-].*)?$/.test(stem)
}

/** Minimal frontmatter split — their files use `---` fenced YAML. */
function splitFrontmatter(md) {
  if (!md.startsWith('---')) return { fm: {}, body: md }
  const end = md.indexOf('\n---', 3)
  if (end < 0) return { fm: {}, body: md }
  const raw = md.slice(3, end).trim()
  const body = md.slice(end + 4).replace(/^\r?\n/, '')
  const fm = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Za-z_]+):\s*(.*)$/)
    if (!m) continue
    fm[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return { fm, body }
}

/** Their copy ships emoji in frontmatter and inline. This plugin has none. */
function stripEmoji(s) {
  return s
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/** Body-safe: remove the glyphs but leave whitespace alone, or code blocks break. */
function stripEmojiOnly(s) {
  return s.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu,
    ''
  )
}

function titleCase(s) {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

function toPayload(id, domain, md, relPath) {
  const { fm, body } = splitFrontmatter(md)
  const name = stripEmoji(fm.name || titleCase(id.replace(/-/g, ' ')))
  const description = stripEmoji(fm.description || '')
  // `remit` is one line on the card; take the first sentence, not the whole blurb.
  const remit = description.split(/(?<=\.)\s/)[0] || description
  const tags = [titleCase(domain)]
  if (fm.vibe) tags.push('Agentic')
  return {
    id: 'aa-' + id,
    name: name,
    role: name,
    remit: remit,
    owns: stripEmoji(fm.vibe || remit),
    tags: tags,
    skills: [
      { label: 'Work with me', task: `Adopt the ${name} role and tell me what you need to start.` },
      { label: 'What do you own?', task: 'State your remit, your hard rules, and what you refuse to do.' },
      { label: 'Take this on', task: description || `Take this task as the ${name}.` },
    ],
    contract: stripEmojiOnly(body).trim(),
    _source: {
      upstream: `https://github.com/${REPO}/blob/${BRANCH}/${domain}/${relPath}`,
      license: 'MIT',
      author: fm.author || null,
    },
  }
}

/**
 * One git-tree call lists the WHOLE upstream repo. Unauthenticated GitHub allows
 * ~60 requests/hour, so calling the contents API per domain would risk 403s for
 * no reason. Falls back to per-domain contents calls if the tree fails.
 *
 * Returns domain -> [{ rel, base }] where `rel` is the path after the domain
 * (may contain a subdir, e.g. godot/godot-shader-developer.md) and `base` is
 * the bare filename. Nested files count: several domains keep real agents in
 * subdirectories (game-development/godot, game-development/blender) — skipping
 * depth>1 would silently drop them.
 */
async function fileIndex() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`)
    if (!res.ok) return null
    const tree = await res.json()
    const map = {}
    for (const item of tree.tree || []) {
      if (item.type !== 'blob' || !item.path.endsWith('.md')) continue
      const parts = item.path.split('/')
      const domain = parts[0]
      if (SKIP_DIRS.has(domain)) continue
      const rel = parts.slice(1).join('/')
      const base = parts[parts.length - 1]
      if (isDocFile(base)) continue
      ;(map[domain] = map[domain] || []).push({ rel, base })
    }
    return map
  } catch {
    return null
  }
}

async function listDomainContents(domain) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${domain}`)
  if (!res.ok) throw new Error(`${domain}: ${res.status}`)
  const items = await res.json()
  return items
    .filter((i) => i.type === 'file' && i.name.endsWith('.md') && !isDocFile(i.name))
    .map((i) => ({ rel: i.name, base: i.name }))
}

const index = await fileIndex()
const upstreamDomains = index ? Object.keys(index) : null

const domains = all
  ? upstreamDomains ||
    ['academic', 'design', 'engineering', 'finance', 'game-development', 'gis',
     'healthcare', 'marketing', 'paid-media', 'product', 'project-management',
     'research', 'sales', 'security', 'spatial-computing', 'specialized',
     'support', 'testing']
  : args.filter((a) => !a.startsWith('--'))

if (!domains.length) {
  console.error('usage: node src/import-agency.mjs <domain> [domain...] | --all')
  process.exit(1)
}

let fetched = 0
let skipped = 0
for (const domain of domains) {
  let entries
  try {
    entries = index ? index[domain] || [] : await listDomainContents(domain)
  } catch (e) {
    console.log(`  skip ${domain}: ${e.message}`)
    continue
  }
  if (!entries.length) {
    console.log(`  skip ${domain}: no .md files upstream`)
    continue
  }

  const dir = path.join(OUT_DIR, domain)
  fs.mkdirSync(dir, { recursive: true })

  let n = 0
  for (const { rel, base } of entries) {
    const id = base.replace(/\.md$/, '')
    const dest = path.join(dir, id + '.json')
    if (!force && fs.existsSync(dest)) { skipped++; n++; continue }
    const res = await fetch(RAW + domain + '/' + rel)
    if (!res.ok) { console.log(`  miss ${domain}/${rel}: ${res.status}`); continue }
    const md = await res.text()
    const payload = toPayload(id, domain, md, rel)
    if (!payload.contract) { console.log(`  empty body: ${id}`); continue }
    fs.writeFileSync(dest, JSON.stringify(payload, null, 2))
    n += 1
    fetched += 1
  }
  console.log(`  ${domain}: ${n} agents`)
}

// Rebuild the manifest from a DIRECTORY SCAN, so it stays complete regardless of
// which domains were passed (marketing stays listed even if not re-fetched).
const manifest = []
const onDisk = fs
  .readdirSync(OUT_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort()
for (const domain of onDisk) {
  const dir = path.join(OUT_DIR, domain)
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const a = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
    manifest.push({
      id: a.id,
      name: a.name,
      domain: domain,
      remit: a.remit,
      tags: a.tags,
      file: `src/agency/${domain}/${f}`,
      bytes: a.contract.length,
    })
  }
}
fs.writeFileSync(
  path.join(OUT_DIR, 'registry.json'),
  JSON.stringify({ domains: onDisk, count: manifest.length, experts: manifest }, null, 2)
)

console.log(`\nfetched ${fetched} new agents (${skipped} already present, use --force to refetch)`)
console.log(`registry: ${onDisk.length} domains / ${manifest.length} agents`)
