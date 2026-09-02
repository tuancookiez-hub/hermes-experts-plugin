# Hermes Experts Plugin — Agent Handoff Brief

> Forward this to the next agent. It is self-contained: a fresh agent with no
> conversation history should be able to continue the work from here.

---

## 1. TL;DR

We are building a **download-on-demand expert catalog plugin** for **Hermes
Desktop**. The plugin ships a small registry of experts; the full persona
prose for each team lives in `teams/<id>.json` on GitHub and is fetched +
cached in `localStorage` the first time the user installs or summons that
team. Phase 1 (the foundation: repo scaffold + build split + downloader) is
**done, verified, and pushed to GitHub**. Phases 2–6 (capability remap, richer
teams, output contracts, original signature teams, bulk import of the rest of
the catalog) are still open.

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

## 3. Current state (Phase 1 complete)

Files in the repo (`C:/Users/tuanc/hermes-experts-plugin`):

- `plugin.js` — **built artifact, 110 KB.** The installable plugin. Pushed.
- `src/template.js` — the runtime UI + downloader. `DATA` is injected at the
  `/*__DATA__*/` marker. Key functions: `ensurePayload`, `augmentTeam`,
  `isInstalled`, `installTeam`, `uninstallTeam`, `exportCache`, `importCache`.
  Run path: `runSolo`/`runLead` call `ensurePayload` then `augmentTeam` before
  building personas.
- `src/registry.json` — the lightweight bundled registry (team metadata only).
  One entry per domain/team. `DATA.registry` in the built plugin.
- `src/emit-teams.mjs` — reads `src/agency/<domain>/*.json`, writes
  `teams/<id>.json` (payload) + `src/registry.json`. Run: `node src/emit-teams.mjs`
  (optionally `marketing` to limit to one domain).
- `src/build-shell.mjs` — reads `src/registry.json` + `src/shared/solo-tail.md`,
  injects into `src/template.js` → `plugin.js`. Run:
  `node src/build-shell.mjs [--ref <git-ref>] [--out <path>]`.
- `src/agency/<domain>/*.json` — the converted upstream agents (source of
  payloads). Currently only `marketing/` (36 agents). Each has
  `{ id, name, role, remit, owns, tags, skills, contract, _source }`.
- `src/shared/domain-lead-head.md` + `domain-lead-tail.md` — generic synthetic
  domain-orchestrator lead (WorkBuddy-style iron rules / parameter card /
  routing / quality bar). `emit-teams.mjs` fills `{DOMAIN}`/`{COUNT}`.
- `src/shared/solo-tail.md` — shared tail appended to every solo persona.
- `verify-render.mjs`, `verify-pipeline.mjs` — the two verification harnesses
  (see §5).
- `LICENSE` (MIT for code), `NOTICE-agency-agents.md`, `CONTENT-LICENSE.md`,
  `README.md`, `.gitignore`.

First catalog entry: **Marketing** = 1 synthetic lead + 36 agents (agency-agents
MIT). `teams/marketing.json` = 467 KB, all 36 contracts non-empty.

**Phase 2 (capability remap, #6) DONE:** a Hermes tool-reality map lives in
`src/shared/capabilities.md` and is injected into **every** solo persona (via
`soloTail`) and lead persona (via `leadTail`) at build time. It maps Claude-Code
tools (WebSearch/WebFetch/Read/Write/Edit/Task/Bash) to Hermes equivalents and
names the unavailable tools (publishing APIs, WorkBuddy model IDs, voice cloning,
lip sync, 3D gen). The agency-agents source contracts stay **verbatim** — the
remap is injected, not laundered into the MIT text.

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

`verify-pipeline.mjs` also confirms the REAL GitHub raw URL
(`https://raw.githubusercontent.com/tuancookiez-hub/hermes-experts-plugin/main/teams/marketing.json`)
returns HTTP 200. Always run both verifies after changing `src/template.js`,
`emit-teams.mjs`, the shared lead files, or the agency data.

To add a new domain from agency-agents: run `_import-agency.mjs <domain>` in the
*other* tree (`.../experts-src/`), copy the resulting `experts/<domain>/*.json`
into `src/agency/<domain>/`, copy `experts/registry.json` if needed, then
`emit-teams.mjs` + `build-shell.mjs` + verifies.

---

## 5. Open work (Phases 3–6)

Tasks exist in the tracker: #7–#10 (Phase 2 / #6 is DONE). Each phase should end
in working software.

- **#6 Capability remap (Phase 2) — DONE.** See §3. The pattern to reuse: add a
  `src/shared/<topic>.md` and inject it into `soloTail` (build-shell.mjs) and
  `leadTail` (emit-teams.mjs). Keep agency-agents contracts verbatim.
- **#7 Composition (Phase 3):** Audit Hermes's actual toolsets and rewrite
  the Claude-Code tool names the agency agents reference (WebSearch / WebFetch /
  Read / Write / Edit / Task / Bash) into Hermes equivalents. Add explicit
  "what you CANNOT execute here" sections. Hermes has: `image_generate`,
  `video_generate`, `vision_analyze` (images only), ffmpeg/whisper via terminal.
  NOT available: WorkBuddy model IDs, publishing APIs, voice cloning, lip sync.
- **#7 Composition (Phase 3):** Curate the flat solo agents into richer multi-
  member teams with real leads + parameter cards (go beyond the synthetic
  domain-lead). This is where the catalog becomes a *product*, not a dump.
- **#8 Contracts (Phase 4):** Give every agent an INPUT/OUTPUT contract + hard
  constraints + named failure traps (the anti-slop persona standard).
- **#9 Original signature teams (Phase 5):** Author a few fully-original teams
  from scratch (no upstream source) — owned IP, the "signature" differentiator.
- **#10 Bulk import + publish (Phase 6):** Import the remaining ~16 domains
  (~362 agents), verify, **pin a release tag** and point `DATA.github.ref` at it,
  publish. Keep the 8 WorkBuddy teams out permanently.

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

"Continue the Hermes Experts plugin (download-on-demand catalog). Phases 1–2 are
done and pushed to `tuancookiez-hub/hermes-experts-plugin`. Next: pick up at
Task #7 (composition) — read `HANDOFF.md` and `MEMORY.md` in the repo/memory
first, then run `node src/emit-teams.mjs && node src/build-shell.mjs && node
verify-render.mjs && node verify-pipeline.mjs` to confirm green before changing
anything."
