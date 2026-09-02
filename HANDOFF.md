# Hermes Experts Plugin — Agent Handoff Brief

> Forward this to the next agent. It is self-contained: a fresh agent with no
> conversation history should be able to continue the work from here.

---

## 1. TL;DR

We are building a **download-on-demand expert catalog plugin** for **Hermes
Desktop**. The plugin ships a small registry of experts; the full persona
prose for each team lives in `teams/<id>.json` on GitHub and is fetched +
cached in `localStorage` the first time the user installs or summons that
team. Phase 1 (foundation), Phase 2 (capability remap), Phase 3 (composition into
curated sub-teams), and Phase 4 (anti-slop I/O contract standard) are **done,
verified, and pushed to GitHub**. Phases 5–6 (original signature teams, bulk
import + publish) are **done, verified, and pushed** — see §3 for the final catalog
(55 teams / 298 agents + 55 leads = 353 summonable experts, 5 of them owned
originals, payload ref pinned to `v1.0.0`).

Repo: `https://github.com/tuancookiez-hub/hermes-experts-plugin` (branch `main`)
Local copy: `C:/Users/tuanc/hermes-experts-plugin`

---

## 2. Critical context the next agent MUST know

### 2.1 Two completely different Hermes plugin systems — do NOT confuse them
- **Agent plugins (Python):** `~/.hermes/plugins/`, `plugin.yaml`,
  `hermes plugins install`, community JSON index, `hermes://` deep links.
  Documented at hermes-agent.nousresearch.com. Needs restart, no hot-reload.
- **Desktop UI plugins (THIS project):** one self-contained `plugin.js` at
  `<HERMES_HOME>/desktop-plugins/<id>/plugin.js`, loaded as a **blob URL**,
  no manifest, no relative imports. **Hot-reloads on a ~5s disk poll.**
  Profile-scoped roots also exist at `<HERMES_HOME>/profiles/<name>/desktop-plugins/`.
- The experts plugin is the **second** kind. `hermes plugins install` does NOT
  apply. Do not plan against the Python docs.
- The runtime loader (`apps/desktop/src/contrib/runtime-loader.ts`) scans with
  a naive regex and **rejects bare specifiers** outside the SDK map. The plugin
  must stay free of `import 'x'` / `from 'x'` that aren't `@hermes/plugin-sdk`
  or `react`. Our `bare-specifiers.mjs` enforces this at build time.
- **Network works from plugins** (`raw.githubusercontent.com` is CORS-open), so
  download-on-demand is viable. `localStorage` is available in the renderer.
- `HERMES_HOME` on this machine = `C:\Users\tuanc\AppData\Local\hermes` (set in
  env). The live deployed plugin is at
  `C:\Users\tuanc\AppData\Local\hermes\desktop-plugins\experts\plugin.js`.

### 2.2 Licensing — VERIFIED, do not re-litigate carelessly
- The WorkBuddy expert catalog's `expert_center.json` declares
  `source: https://github.com/msitarzewski/agency-agents, license: MIT`.
- `msitarzewski/agency-agents` is real: **MIT, ~398 agent `.md` files** across
  domain dirs (marketing, engineering, research, product, design, healthcare,
  finance, game-development, paid-media, sales, security, support, specialized,
  gis, academic, project-management, spatial-computing).
- BUT **none of the 8 WorkBuddy-derived teams we ported exist upstream** — they
  are WorkBuddy's own compositions, unattributed-licensed. So they stay
  **private/local**, never in the public repo.
- **Decision (user): "shell public, ports private."** The public repo is built
  from `agency-agents` (clean MIT, attributed) — NOT from the WorkBuddy teams.
  The 8 WorkBuddy teams remain only in the locally deployed build `.13`.
- Diagnostic scripts for provenance live in the *other* working tree
  `C:\Users\tuanc\WorkBuddy AI\2026-08-29-10-32-21\.workbuddy-ai\tmp\experts-src\`
  (`_license-check.mjs`, `_team-origin.mjs`, `_import-agency.mjs`). That tree is
  where the WorkBuddy porting happened and still holds the source of truth for
  the 8 private teams.

### 2.3 Architecture decision (the core design)
- `plugin.js` = UI + lightweight **registry** (team metadata, NO contracts).
- `teams/<id>.json` on GitHub = one team's full payload: `{ id, leadHead,
  leadTail, members: { <agentId>: contract } }`.
- On open: ALL teams are browseable (registry is bundled, works offline).
- Install / Summon → fetch `teams/<id>.json` → cache in `localStorage`
  (`experts:payloads:v1`) → runs offline afterwards.
- A `localStorage` key `experts:github-base-override` lets a fork repoint the
  plugin at a different raw base (e.g. `http://localhost:8080/teams`) without
  rebuilding — useful for local testing.
- Granularity: **per-team install, but browseable per-expert.** Summoning one
  expert installs its whole team (installing a partial team would break
  lead↔member delegation).

---

## 3. Current state (Phase 3 complete)

Files in the repo (`C:/Users/tuanc/hermes-experts-plugin`):

- `plugin.js` — **built artifact, ~472 KB** (registry + UI; contracts stay on GitHub). Pinned to
  `v1.0.0` via `src/release.json`. The installable plugin. Pushed.
- `src/template.js` — the runtime UI + downloader. `DATA` is injected at the
  `/*__DATA__*/` marker. Key functions: `ensurePayload`, `augmentTeam`,
  `isInstalled`, `installTeam`, `uninstallTeam`, `exportCache`, `importCache`.
  Run path: `runSolo`/`runLead` call `ensurePayload` then `augmentTeam` before
  building personas.
- `src/registry.json` — the lightweight bundled registry (team metadata only).
  One entry per domain/team. `DATA.registry` in the built plugin.
- `src/emit-teams.mjs` — reads `src/agency/<domain>/*.json`, writes
  `teams/<id>.json` (payload) + `src/registry.json`. Run: `node src/emit-teams.mjs`
  (optionally `marketing` to limit to one domain). **Phase 3:** if `src/compositions.json`
  has an entry for the domain, it emits ONE sub-team per curated group (using
  `team-lead-head.md`/`team-lead-tail.md` + capability map); otherwise it falls
  back to the original flat one-team-per-domain behaviour (`domain-lead-head/tail`).
- `src/build-shell.mjs` — reads `src/registry.json` + `src/shared/solo-tail.md`,
  injects into `src/template.js` → `plugin.js`. Run:
  `node src/build-shell.mjs [--ref <git-ref>] [--out <path>]`.
- `src/agency/<domain>/*.json` — the converted upstream MIT agents (source of
  payloads). All 18 converted domains now present (academic, design, engineering,
  finance, game-development, gis, healthcare, marketing, paid-media, product,
  project-management, research, sales, security, specialized, support, testing,
  spatial-computing). Each has `{ id, name, role, remit, owns, tags, skills, contract, _source }`.
- `src/original/<team>/team.json` + members — **owned-IP** teams. emit-teams Phase 5 reads
  this layout and sets `original:true` (the ONLY path that does). 5 teams: build-ship,
  second-brain, shipit, founderstory, firstrevenue (15 agents). Authored via
  `scripts/author-original.mjs`. Do NOT route these through `src/agency/` or `compositions.json`.
- `src/release.json` — **single source of truth for the payload ref** (`ref:"v1.0.0"`).
  build-shell.mjs bakes it into `DATA.github.ref`/`DATA.base`; verify-pipeline.mjs Part C
  proves the SAME immutable tag over the network.
- `src/shared/domain-lead-head.md` + `domain-lead-tail.md` — generic synthetic
  domain-orchestrator lead (WorkBuddy-style iron rules / parameter card /
  routing / quality bar). `emit-teams.mjs` fills `{DOMAIN}`/`{COUNT}`. Used by the
  flat (non-composed) fallback path.
- `src/shared/team-lead-head.md` + `team-lead-tail.md` — **Phase 3** specialized
  COMPOSED-team lead. `team-lead-head.md` uses `{NAME}`/`{COUNT}`/`{FOCUS}` (a
  focused team lead instead of the flat domain-lead); `team-lead-tail.md` is the
  parameter card. Consumed when a domain has a `src/compositions.json` entry.
- `src/compositions.json` — **Phase 3** curated sub-team map keyed by domain. Each
  entry lists `id` / `name` / `focus` / `tone` (one of the 6 UI tones) / `members[]`
  (agent ids). Domains with no entry fall back to flat.
- `src/shared/solo-tail.md` — shared tail appended to every solo persona.
- `src/shared/capabilities.md` — **Phase 2** Hermes tool-reality map, injected into
  every persona (soloTail + leadTail) at build time.
- `src/shared/io-contract.md` — **Phase 4** anti-slop standard (INPUT/OUTPUT contract
  + hard constraints + named failure traps), injected into every persona alongside
  `capabilities.md` at build time.
- `verify-render.mjs`, `verify-pipeline.mjs` — the two verification harnesses
  (see §5).
- `LICENSE` (MIT for code), `NOTICE-agency-agents.md`, `CONTENT-LICENSE.md`,
  `README.md`, `.gitignore`.
- `assets/` — `hero-banner.png` (README hero, academic-infographic style),
  `demo-expert-center.png` (Hermes Desktop Experts view). The folder is
  committed; keep it lean.
- `.github/workflows/verify.yml` — runs `verify-render.mjs` and
  `verify-pipeline.mjs` on every push to `main` and on PRs. Catches a
  broken `template.js` or `emit-teams.mjs` before merge.

First catalog entry: **Marketing** is now 6 curated sub-teams (agency-agents MIT,
36 agents total) instead of one flat blob — `search-aeo` (6), `western-social` (8),
`china-social` (8), `media-production` (5), `ecommerce` (4), `content-comms` (5).
Each payload is 54–97 KB; all 36 contracts non-empty. Defined in `src/compositions.json`.

**Phase 2 (capability remap, #6) DONE:** a Hermes tool-reality map lives in
`src/shared/capabilities.md` and is injected into **every** solo persona (via
`soloTail`) and lead persona (via `leadTail`) at build time. It maps Claude-Code
tools (WebSearch/WebFetch/Read/Write/Edit/Task/Bash) to Hermes equivalents and
names the unavailable tools (publishing APIs, WorkBuddy model IDs, voice cloning,
lip sync, 3D gen). The agency-agents source contracts stay **verbatim** — the
remap is injected, not laundered into the MIT text.

**Phase 4 (anti-slop I/O standard, #8) DONE:** `src/shared/io-contract.md` defines a
universal INPUT/OUTPUT contract + hard constraints + named failure traps, injected
into **every** solo persona (`build-shell.mjs` → `soloTail`) and lead persona
(`emit-teams.mjs` → `leadTail`) at build time — the same pattern as Phase 2. It
stops confident slop: fabricated stats/citations, unkeepable promises (viral/#1/
guaranteed), off-language output, and hidden tool gaps. The agency-agents source
contracts stay **verbatim** — the standard is injected, not laundered. `verify-pipeline.mjs`
asserts the standard reaches both solo + lead personas (Part A static + Part B local
HTTP); Part C is structural-only because raw.githubusercontent.com is CDN-lagged.
plugin.js ~117 → ~120 KB.

**FINAL RELEASE STATE (2026-09-02, all phases done):** `v1.0.0` tagged + pushed
(commit `d56d2b1`). Catalog = **55 teams / 298 member agents + 55 team leads = 353
summonable experts** across 18 MIT domains + 5 owned original teams. `plugin.js` ~472 KB.
Both harnesses GREEN: `verify-render.mjs` (5 passes, bare-spec CLEAN) and
`verify-pipeline.mjs` (static + local HTTP + GitHub raw @ `v1.0.0` = 55/55). To add a
domain later, run `src/import-agency.mjs`, drop the JSON into `src/agency/<domain>/`,
add a `compositions.json` entry if large, then `emit-teams.mjs` + `build-shell.mjs` +
both verifies; commit `plugin.js` + `teams/` + `src/registry.json` together.

**Local build `.13` is untouched** (413 KB, 8 WorkBuddy teams / 53 experts at
`desktop-plugins/experts/plugin.js`). Do not overwrite it unless the user asks.

---

## 4. How to rebuild / verify

```bash
cd C:/Users/tuanc/hermes-experts-plugin
node src/emit-teams.mjs        # regenerates teams/*.json + src/registry.json
node src/build-shell.mjs       # regenerates plugin.js from src/template.js
node verify-render.mjs         # mounts the page (stub host); 5 passes; bare-spec CLEAN
node verify-pipeline.mjs       # all agents resolve + build valid personas (static + live HTTP)
```

`verify-pipeline.mjs` proves every agent (static + local HTTP) AND that every
payload is live on GitHub. Part C is structural-only (existence + valid shape) — it
is skipped when there is no network and fails on a 404 (catches a forgotten push);
it does NOT content-assert the raw URL because raw.githubusercontent.com is CDN-cached
and lags behind a push. The deep content checks (capability map + anti-slop standard)
run on the local files in Part A/B, which are authoritative. Always run both verifies
after changing `src/template.js`, `emit-teams.mjs`, `src/compositions.json`, the
shared lead/contract files, or the agency data.

To add a new domain from agency-agents: run `_import-agency.mjs <domain>` in the
*other* tree (`.../experts-src/`), copy the resulting `experts/<domain>/*.json`
into `src/agency/<domain>/`, copy `experts/registry.json` if needed, then
`emit-teams.mjs` + `build-shell.mjs` + verifies.

---

## 5. Open work (Phases 5–6)

Phases 1–4 are DONE and pushed. Tasks #9–#10 remain. Each phase should end in
working software.

- **#6 Capability remap (Phase 2) — DONE.** See §3. The pattern to reuse: add a
  `src/shared/<topic>.md` and inject it into `soloTail` (build-shell.mjs) and
  `leadTail` (emit-teams.mjs). Keep agency-agents contracts verbatim.
- **#7 Composition (Phase 3) — DONE.** Marketing is no longer one flat 36-agent
  blob: `src/compositions.json` curates it into 6 focused sub-teams, each with a
  specialized lead (`team-lead-head.md` {NAME}/{COUNT}/{FOCUS}) + parameter card
  (`team-lead-tail.md`) + the capability map. `emit-teams.mjs` emits one payload +
  registry entry per sub-team; domains with no composition fall back to flat. The
  stale `teams/marketing.json` was deleted. To compose another domain, add an
  entry to `src/compositions.json` and re-run emit + build + verifies.
- **#8 Contracts / anti-slop standard (Phase 4) — DONE.** Every agent follows a
  universal INPUT/OUTPUT contract + hard constraints + named failure traps via
  `src/shared/io-contract.md`, injected at build time (see §3). The standard is
  generic across agents; per-agent bespoke contracts remain a possible deeper cut.
- **#9 Original signature teams (Phase 5):** **DONE.** 5 owned-original teams
  (build-ship, second-brain, shipit, founderstory, firstrevenue) authored via
  `scripts/author-original.mjs` into `src/original/<team>/team.json` + members; emit flags
  them `original:true`. 15 new agents across shipit/founderstory/firstrevenue.
- **#10 Bulk import + publish (Phase 6):** **DONE.** All 18 MIT domains imported
  (~283 converted agents), composed into 52 sub-teams + 3 flat, verify-pipeline hardened
  (Part C structural-only for CDN lag), `src/release.json` pins `v1.0.0`, built + tagged +
  pushed. 55 teams / 298 agents total. The 8 WorkBuddy teams stayed out permanently.

Standing rules:
- Public repo = agency-agents MIT catalog only. Never add the 8 WorkBuddy teams.
- Keep `plugin.js` buildable from `src/`; commit both `plugin.js` and `teams/`.
- Re-run both verify scripts before any push.
- Append a note to `C:\Users\tuanc\WorkBuddy AI\2026-08-31-14-18-22\.workbuddy-ai\memory\YYYY-MM-DD.md`
  and update `.../memory/MEMORY.md` after substantive work.

---

## 6. Gotchas that already bit us (save time)
- `build-shell.mjs` / `emit-teams.mjs` comments must not contain `/*__DATA__*/`
  inside a block comment — the inner `/*` closes the outer `/** */` and breaks
  the file. Write "data marker" instead.
- The render harness (`verify-render.mjs`) depends on React hook *order* in
  `ExpertsPage`. If you add/remove a `useState` there, update the `forces.set(...)`
  indices in the harness (PASS2 uses 6=selected, 7=text; PASS4 uses 5=modal;
  PASS5 uses 2=installedOnly).
- Window paths in Node: use `fileURLToPath(import.meta.url)`, never
  `new URL(import.meta.url).pathname` (yields `/C:/...` → `C:\C:\...`).
- `DATA.teams` no longer exists — it is `DATA.registry` (lightweight, no
  contracts). Contracts live in the fetched payload and are merged at runtime by
  `augmentTeam`.
- The plugin is a blob-evaluated module: jsx only, no JSX syntax, no relative
  imports, no bare specifiers.

---

## 7. One-line restart for the next agent

"All phases (1–6) of the Hermes Experts plugin are DONE and pushed to
`tuancookiez-hub/hermes-experts-plugin` @ `v1.0.0` — a complete MIT catalog
(55 teams / 298 agents + 55 leads, 5 owned originals). To change anything, read
`HANDOFF.md` + `MEMORY.md` first, edit under `src/`, then run
`node src/emit-teams.mjs && node src/build-shell.mjs && node verify-render.mjs &&
node verify-pipeline.mjs` to confirm green, bump `src/release.json` + tag, and push."
