# Hermes Experts Plugin

A **download-on-demand** expert catalog for [Hermes Desktop](https://hermes-agent.nousresearch.com).
Instead of bundling every expert's full persona into the plugin, the plugin
ships a lightweight **registry** (names, roles, tags) and fetches each team's
full contract from this repository the moment you install or summon it. That
keeps `plugin.js` small (~80 KB) no matter how many experts the catalog grows
to.

- Browse the whole catalog **offline** (registry is bundled).
- **Install** a team → its contracts are fetched from GitHub and cached in
  `localStorage`, so it works with no network afterwards.
- **Summon** an expert even if you have not installed its team → the plugin
  fetches and runs it on the fly, then caches it.
- **Export / Import** your installed cache as a JSON file (handy because
  clearing app data wipes `localStorage`).

## Install

The plugin is a single file: `plugin.js`. Copy it into your Hermes Desktop
plugin folder (the folder name **must** be `experts`):

    # default / unset profile
    <HERMES_HOME>/desktop-plugins/experts/plugin.js

    # named profile
    <HERMES_HOME>/profiles/<name>/desktop-plugins/experts/plugin.js

`HERMES_HOME` is normally `%LOCALAPPDATA%\hermes` on Windows
(`/Users/<you>/.hermes` on macOS/Linux) — or the value of the `HERMES_HOME`
env var if it is set.

Hermes hot-reloads Desktop plugins on a short disk poll, so just drop the file
in and open **Experts** from the left rail. No restart needed.

> The plugin fetches team payloads from
> `https://raw.githubusercontent.com/tuancookiez-hub/hermes-experts-plugin/<ref>/teams/`.
> If you fork the repo, change `DATA.github` in `src/template.js` (or set the
> `experts:github-base-override` `localStorage` key) to point at your fork.

## How it works

```
plugin.js  ──bundled registry──▶  all teams browseable offline
     │
     └─ Install / Summon ──fetch──▶  teams/<teamId>.json (this repo)
                                        │
                                        └─ cache in localStorage ──▶ runs offline
```

- `teams/<teamId>.json` — one file per team: `leadHead`, `leadTail`, and a
  `members` map of `{ id: contract }`.
- `src/agency/<domain>/*.json` — the converted upstream agents (source of the
  payloads). `src/emit-teams.mjs` turns these into `teams/*.json` + the
  bundled registry.
- `src/build-shell.mjs` — injects the registry into `src/template.js` to
  produce `plugin.js`.

## Rebuild

    node src/emit-teams.mjs            # regenerates teams/*.json + src/registry.json
    node src/build-shell.mjs           # regenerates plugin.js from src/template.js

## Licensing

- **Code:** MIT — see `LICENSE`.
- **Expert content:** MIT, adapted from `msitarzewski/agency-agents` with
  attribution — see `NOTICE-agency-agents.md` and `CONTENT-LICENSE.md`.
- **Original signature teams:** authored from scratch; see `CONTENT-LICENSE.md`.
