# Licensing — code vs. content

This repository mixes two kinds of material with **two different licenses**.
Keep them straight.

## Code — MIT

Everything under:

- `plugin.js` (the built, installable plugin)
- `src/*.mjs`, `src/template.js` (the generator and runtime)
- `README.md`, build tooling

is original work by tuancookiez-hub, licensed under `LICENSE` (MIT).

## Expert content — MIT, attributed

The **persona contracts** in `teams/*.json` and the agent payloads in
`src/agency/` are adapted from **msitarzewski/agency-agents**, which is MIT
licensed. We redistribute them under the same MIT terms and preserve
attribution in `NOTICE-agency-agents.md`. You may reuse, remix, and ship them
subject to that notice.

## Original signature teams — all rights reserved to the author

Teams authored from scratch in later phases (no upstream source) are original
and not subject to the agency-agents MIT grant. They are published here for use
with this plugin; contact the author for any other use.

## Why the split

A single "everything is MIT" claim would be false: the WorkBuddy-derived teams
that predate this repo are third-party, unattributed content and are excluded
entirely. Keeping the clean MIT catalog (agency-agents) separate from private
content is what makes this repository safe to fork and redistribute.
