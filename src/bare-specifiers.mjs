/**
 * bare-specifiers.mjs — one implementation of the Desktop runtime-loader's
 * import rejection rule, shared by build.mjs (hard gate) and the harnesses
 * (verification). Two copies of this regex would drift, and drift is how the
 * bug it guards against survives a "fix".
 *
 * Mirrors apps/desktop/src/contrib/runtime-loader.ts:57 and :72-86.
 *
 * WHY THIS EXISTS (read before touching the wording of any plugin text)
 *
 *   The loader scans the ENTIRE plugin source — comments AND string literals —
 *   with:
 *       /(from\s*|import\s*\(\s*|import\s+)(['"])([^'"]+)\2/g
 *   and refuses to evaluate the plugin if it finds a bare specifier outside the
 *   SDK map. It is not anchored to a statement start, and `from\s*` allows ZERO
 *   spaces, so prose like `import fs from 'fs'` inside a comment trips it.
 *
 *   This has already happened once: a header comment documenting the
 *   "unsupported import: fs" failure contained the literal pattern, so every
 *   subsequent build re-triggered the very bug it described. The plugin
 *   rejected itself for a week.
 *
 *   Note that persona prose is JSON-escaped on the way into plugin.js, so
 *   double quotes become \" and stop matching. SINGLE quotes are NOT escaped by
 *   JSON.stringify, so `from 'fs'` inside a persona contract still trips it.
 *   That is why the check must run on the GENERATED output, never the sources.
 */

/** Specifiers the loader can resolve (apps/desktop/src/sdk/runtime.ts:45). */
export const SDK_MAP = {
  '@hermes/plugin-sdk': 1,
  'react/jsx-dev-runtime': 1,
  'react/jsx-runtime': 1,
  react: 1,
}

const IMPORT_SPECIFIER_RE = () => /(from\s*|import\s*\(\s*|import\s+)(['"])([^'"]+)\2/g

/**
 * @returns {Map<string, Array<{line:number, around:string}>>} spec -> hits
 */
export function bareSpecifiers(src, maxHitsPerSpec = 3) {
  const found = new Map()
  for (const m of String(src).matchAll(IMPORT_SPECIFIER_RE())) {
    const spec = m[3]
    if (spec && !/^[./]/.test(spec) && !/^[a-z][a-z0-9+.-]*:/i.test(spec) && !SDK_MAP[spec]) {
      if (!found.has(spec)) found.set(spec, [])
      const hits = found.get(spec)
      if (hits.length < maxHitsPerSpec) {
        hits.push({
          line: src.slice(0, m.index).split('\n').length,
          around: src.slice(Math.max(0, m.index - 70), m.index + 70).replace(/\n/g, ' '),
        })
      }
    }
  }
  return found
}
