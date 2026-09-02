/**
 * render-check.mjs — DEEP render of the DEPLOYED experts plugin.
 *
 * harness-detail.mjs captures the page render fn but never CALLS it, so it
 * cannot catch check 5 (the page renders, invisibly). This one executes the
 * whole tree — class components via `new` + `render()`, function components
 * via a direct call — then prints the ROOT STYLE and the collected text.
 *
 * The root style is the whole point: a page with no height, no opaque
 * background, or no explicit colour is a blank pane that passes every other
 * check.
 *
 * Each pass gets a FRESH stub module + a FRESH plugin copy, because a
 * module-level useState hook counter is shared across renders (see the
 * skill's gotcha) — a cached stub silently yields DEFAULT state.
 *
 *   PASS=n  name of the scenario to run (default | modal | selected)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { bareSpecifiers } from './src/bare-specifiers.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
// Default is the repo's built plugin.js. Override with PLUGIN_PATH.
const deployed = process.env.PLUGIN_PATH || path.join(here, 'plugin.js')
const code = fs.readFileSync(deployed, 'utf8')

// ---- host stub shared with the sdk stub via global ------------------------
globalThis.__HERMES_HOST__ = {
  state: {
    focusedSessionId: { get: () => 'sess-focus' },
    activeSessionId: { get: () => 'sess-active' },
    cwd: { get: () => '/work' },
  },
  navigate: () => {},
  notify: () => {},
  request: async () => ({ ok: true, result: {} }),
  openSession: async () => true,
}

// ---- per-pass stub modules -------------------------------------------------
const workDir = path.join(here, '.render-work')
fs.rmSync(workDir, { recursive: true, force: true })
fs.mkdirSync(workDir, { recursive: true })

const STUB_REACT = (exportName) => `
export const forces = new Map()
let counter = 0
export function resetHooks() { counter = 0 }
// Real React's Component assigns this.props in the constructor — a stub that
// does not leaves this.props undefined inside a class render() (Boundary).
// NOTE: no backticks in here — this lives inside a template literal.
const Component = function (props) { this.props = props }
function makeEl(type, props, ...children) {
  const p = { ...(props || {}) }
  if (children.length && p.children === undefined) p.children = children.length === 1 ? children[0] : children
  return { __el: true, type, props: p }
}
function useState(init) {
  const i = counter++
  const base = typeof init === 'function' ? init() : init
  return [forces.has(i) ? forces.get(i) : base, () => {}]
}
function useEffect() { return undefined }
export { Component, useState, useEffect, makeEl as jsx, makeEl as createElement }
export default { Component, useState, useEffect, jsx: makeEl, createElement: makeEl }
`

// ---- deep renderer ---------------------------------------------------------
const MAX = 100000

function render(node, out, depth) {
  if (node == null || node === false || node === true) return
  if (Array.isArray(node)) {
    for (const n of node) render(n, out, depth)
    return
  }
  if (typeof node === 'string' || typeof node === 'number') {
    out.texts.push(String(node))
    return
  }
  if (!node.__el) return
  if (out.count++ > MAX) throw new Error('render budget exceeded — runaway tree')

  const { type, props } = node

  if (typeof type === 'string') {
    if (!out.root) out.root = node
    // Capture dialogs so a pass can assert on the modal alone. The cards keep
    // rendering BEHIND the modal, so page-wide text contains the card's
    // truncated "+ N more" even when the modal roster is uncapped.
    if (props && props.role === 'dialog') {
      if (!out.dialogs) out.dialogs = []
      out.dialogs.push(node)
    }
    if (type === 'button' && props && typeof props.onClick === 'function') {
      out.buttons.push({ label: textOf(props.children), onClick: props.onClick })
    }
    render(props && props.children, out, depth + 1)
    return
  }

  if (typeof type === 'function') {
    let res
    if (type.prototype && typeof type.prototype.render === 'function') {
      const inst = new type(props)
      if (typeof inst.render === 'function') res = inst.render()
    } else {
      res = type(props)
    }
    render(res, out, depth + 1)
    return
  }

  // Fragment / unknown object type — descend into children only.
  render(props && props.children, out, depth + 1)
}

function textOf(node) {
  const out = { texts: [], buttons: [], count: 0, root: null }
  render(node, out, 0)
  return out.texts.join(' ').trim().slice(0, 70)
}

/** Import a FRESH copy of the plugin wired to a FRESH react stub. */
async function freshPlugin(passName) {
  const stubPath = path.join(workDir, `stub-react-${passName}.mjs`)
  fs.writeFileSync(stubPath, STUB_REACT(passName))

  const stubSdkSrc = fs.readFileSync(path.join(here, 'src', 'stub-sdk.mjs'), 'utf8')
  fs.writeFileSync(path.join(workDir, `stub-sdk-${passName}.mjs`), stubSdkSrc)

  const rewritten = code
    .replace(/from ['"]@hermes\/plugin-sdk['"]/g, `from './stub-sdk-${passName}.mjs'`)
    .replace(/from ['"]react\/jsx-runtime['"]/g, `from './stub-react-${passName}.mjs'`)
    .replace(/from ['"]react['"]/g, `from './stub-react-${passName}.mjs'`)

  const pluginPath = path.join(workDir, `plugin-${passName}.mjs`)
  fs.writeFileSync(pluginPath, rewritten)

  const mod = await import(
    pathToFileURL(pluginPath).href + `?pass=${passName}&t=${Date.now()}`
  )
  // Same URL the plugin uses — NO cache-busting query. A query makes this a
  // DIFFERENT module instance, so `forces` would be set on a copy the plugin
  // never sees and the pass would silently render default state.
  const stub = await import(pathToFileURL(stubPath).href)

  let captured = null
  mod.default.register({
    registerMany(list) {
      for (const item of list) if (item.id === 'page' && item.render) captured = item.render
    },
  })

  return { render: captured, stub, plugin: mod.default }
}

// ---- assertions ------------------------------------------------------------
const fail = []
const assert = (cond, msg) => {
  if (!cond) fail.push(msg)
}

console.log('\n=== render-check: ' + path.basename(deployed) + ' ===')
console.log('  bytes       :', code.length)
console.log('  bare specs  :', bareSpecifiers(code).size === 0 ? 'CLEAN' : [...bareSpecifiers(code)].join(','))

// PASS 1 — default state -----------------------------------------------------
const p1 = await freshPlugin('default')
const out1 = { texts: [], buttons: [], count: 0, root: null }
render(p1.render(), out1, 0)

const style = (out1.root && out1.root.props && out1.root.props.style) || {}
console.log('\n--- PASS 1: default state ---')
console.log('  host elements :', out1.count)
console.log('  root tag      :', out1.root && out1.root.type)
console.log('  root style    :', JSON.stringify(style))
console.log('  buttons       :', out1.buttons.length)
console.log('  text sample   :', out1.texts.slice(0, 14).join(' | '))

assert(!!out1.root, 'page rendered a host element')
assert(out1.count > 50, 'tree has real content (got ' + out1.count + ' host elements)')

const height = style.height
const minHeight = style.minHeight
const bg = style.background
const fg = style.color
assert(!!height || !!minHeight, 'root has a definite height or minHeight')
assert(!!bg, 'root has an explicit background')
assert(!!fg, 'root has an explicit color')
if (bg) assert(!/transparent/.test(String(bg)) && String(bg) !== 'inherit', 'root background is opaque-looking (' + bg + ')')

// Expert names must actually appear.
const joined = out1.texts.join(' ~ ')
assert(/Experts/.test(joined), 'header "Experts" rendered')
assert(joined.includes('Expert Teams'), 'tab "Expert Teams" rendered')
assert(joined.includes('Show all'), 'toggle renders (default label "Show all")')
assert(joined.includes('download on use'), 'solo expert card shows "download on use" (not yet cached)')

// PASS 2 — a card is selected (composer pill) --------------------------------
// hook order in ExpertsPage: 0 tab, 1 query, 2 installedOnly, 3 bumpInstalled,
// 4 installingId, 5 modal, 6 selected, 7 text, 8 busy. Force 6 = selected.
const p2 = await freshPlugin('selected')
const EXPERTS = p2.plugin.__EXPERTS__ || null
let selected = null
try {
  // EXPERTS is module-private; recover one entry from the DATA literal instead.
  const dm = code.match(/const DATA = (\{[\s\S]*\}\n)\nconst BUILD =/)
  const DATA = (0, eval)('(' + dm[1] + ')')
  const first = DATA.registry[0]
  // Mirrors the EXPERTS derivation in the plugin (avatar/letter, avatar/tone,
  // remit, startNote). A fixture missing `avatar` throws inside Composer.
  selected = {
    id: first.lead.id,
    name: first.lead.name + ' — ' + first.lead.role,
    teamId: first.id,
    teamName: first.name,
    avatar: { letter: (first.lead.name || '?').charAt(0), tone: first.avatar.tone },
    remit: first.lead.remit || 'Leads the ' + first.name + ' team.',
    ported: true,
    startNote: first.startNote,
    run: { kind: 'lead', team: first.id },
    tags: (first.lead && first.lead.tags) || [],
    skills: first.leadSkills || [],
  }
} catch (e) {
  assert(false, 'could not build a selected-expert fixture: ' + e.message)
}

if (selected) {
  p2.stub.forces.set(6, selected)
  p2.stub.forces.set(7, 'do the thing')
  const out2 = { texts: [], buttons: [], count: 0, root: null }
  render(p2.render(), out2, 0)
  const t2 = out2.texts.join(' ~ ')
  console.log('\n--- PASS 2: expert selected ---')
  console.log('  host elements :', out2.count)
  console.log('  buttons       :', out2.buttons.length)
  console.log('  text sample   :', out2.texts.slice(0, 14).join(' | '))
  assert(/Send/.test(t2), 'composer Send button rendered when an expert is selected')
  assert(t2.includes('Starts with:'), 'composer shows the startNote hint')
}

// PASS 3 — Teams tab: the card must NAME the experts in the team ------------
// The whole point of build .12. A team card used to show only its lead.
const dm3 = code.match(/const DATA = (\{[\s\S]*\}\n)\nconst BUILD =/)
const DATA3 = (0, eval)('(' + dm3[1] + ')')
const team0 = DATA3.registry[0]
const rosterSize = team0.members.length + (team0.lead ? 1 : 0)
const shownOnCard = Math.min(3, rosterSize)
const hiddenOnCard = rosterSize - shownOnCard

const p3 = await freshPlugin('teams')
p3.stub.forces.set(0, 'teams') // hook 0 = tab
const out3 = { texts: [], buttons: [], count: 0, root: null }
render(p3.render(), out3, 0)
const t3 = out3.texts.join(' ~ ')
console.log('\n--- PASS 3: Teams tab (roster on card) ---')
console.log('  host elements :', out3.count)
console.log('  team          :', team0.name, '| roster', rosterSize, '| shown', shownOnCard)
console.log('  text sample   :', out3.texts.slice(0, 22).join(' | '))

assert(t3.includes('Team · ' + rosterSize), 'team card shows "Team · ' + rosterSize + '"')
assert(t3.includes('Install'), 'team card shows an Install button (download-on-demand)')
for (const m of team0.members.slice(0, shownOnCard - 1)) {
  assert(t3.includes(m.name), 'roster names member "' + m.name + '" on the card')
  assert(t3.includes(m.role), 'roster shows role "' + m.role + '" on the card')
}
assert(t3.includes(team0.lead.name), 'roster names the lead "' + team0.lead.name + '"')
assert(t3.includes('Lead'), 'lead row carries the Lead pill')
if (hiddenOnCard > 0) {
  assert(t3.includes('+ ' + hiddenOnCard + ' more'), 'card overflow shows "+ ' + hiddenOnCard + ' more"')
}

// PASS 4 — modal: the FULL roster, with what each member owns ---------------
const p4 = await freshPlugin('modal')
p4.stub.forces.set(0, 'teams')  // hook 0 = tab
p4.stub.forces.set(5, team0)    // hook 5 = modal (the TEAMS entry)
const out4 = { texts: [], buttons: [], count: 0, root: null }
render(p4.render(), out4, 0)
const t4 = out4.texts.join(' ~ ')
console.log('\n--- PASS 4: modal (full roster + owns) ---')
console.log('  host elements :', out4.count)
console.log('  text sample   :', out4.texts.slice(0, 26).join(' | '))

// Assert on the DIALOG subtree only — the card grid renders behind it, so
// page-wide text would show the card's capped roster and hide a failure here.
const dialog = (out4.dialogs || [])[0]
assert(!!dialog, 'modal rendered a role=dialog subtree')
const out4d = { texts: [], buttons: [], count: 0, root: null, dialogs: [] }
if (dialog) render(dialog, out4d, 0)
const td = out4d.texts.join(' ~ ')
console.log('  dialog text   :', out4d.texts.slice(0, 30).join(' | '))

assert(td.includes('Team · ' + rosterSize + ' experts'), 'modal shows "Team · ' + rosterSize + ' experts"')
assert(!/\+ \d+ more/.test(td), 'modal roster is NOT capped (no "+ N more")')
for (const m of team0.members) {
  assert(td.includes(m.name), 'modal names member "' + m.name + '"')
  assert(td.includes(m.owns), 'modal shows what "' + m.name + '" owns')
}

// PASS 5 — "Installed only" toggle filters to cached teams (none yet) -------
const p5 = await freshPlugin('installedOnly')
p5.stub.forces.set(2, true) // hook 2 = installedOnly
const out5 = { texts: [], buttons: [], count: 0, root: null }
render(p5.render(), out5, 0)
const t5 = out5.texts.join(' ~ ')
console.log('\n--- PASS 5: Installed only (nothing cached yet) ---')
console.log('  host elements :', out5.count)
console.log('  text sample   :', out5.texts.slice(0, 18).join(' | '))
assert(t5.includes('Installed only'), 'toggle flips to "Installed only" label')
assert(/Nothing here yet|not installed yet/.test(t5), 'with nothing installed, the grid shows the empty state')

fs.rmSync(workDir, { recursive: true, force: true })

console.log('')
if (fail.length) {
  console.error('FAILURES (' + fail.length + '):')
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('  all render assertions passed')
