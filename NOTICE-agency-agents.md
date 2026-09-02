# NOTICE — Third-party content attribution

This repository's **expert content** (the persona contracts shipped in
`teams/*.json` and the agent payloads under `src/agency/`) is derived from:

    msitarzewski/agency-agents
    https://github.com/msitarzewski/agency-agents
    License: MIT

The upstream project is licensed MIT. We import its agent definitions
**verbatim** (only the wrapper format is adapted from YAML frontmatter to our
JSON data model) and keep this attribution, as required by the MIT license:

> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.

Per-agent provenance is recorded in each payload's `_source` field
(`upstream`, `license`, `author`).

## What is NOT covered by this notice

- The **plugin code** (`plugin.js`, `src/*.mjs`, `src/template.js`) is original
  and licensed under `LICENSE` (MIT, (c) 2026 tuancookiez-hub).
- The **original signature teams** authored from scratch in later phases are
  fully original and not derived from agency-agents. They carry no `_source`
  field.

## What is deliberately excluded

The eight WorkBuddy-derived expert teams that existed in earlier local builds
are **not** included in this public repository. They remain private/local
content and are out of scope for this MIT catalog.
