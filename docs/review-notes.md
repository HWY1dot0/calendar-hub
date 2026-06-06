# Plugin review notes

Responses to the automated Obsidian plugin review for Calendar Hub. The hard
build-verification failure has been fixed; the remaining items are
Recommendations / Warnings that ask the author to verify, and are addressed
below.

## Build verification — fixed

The previous failure (`/bin/sh: 1: rollup: not found`, exit 127) had two causes:

1. `obsidian` was declared as a **git** dependency (`obsidianmd/obsidian-api#master`).
   The lockfile resolved it over `git+ssh://git@github.com/...`, which cannot be
   cloned in a keyless CI environment, so dependency installation aborted before
   `rollup` was ever placed in `node_modules/.bin`.
2. The Rollup + `@rollup/plugin-typescript` + TypeScript 4.2.3 toolchain can no
   longer parse the current `obsidian` type definitions (e.g. interface getters
   such as `get file(): TFile | null`), so the TypeScript plugin silently stopped
   transforming `.ts` files.

Fixes:

- `obsidian` is now a **devDependency** on the published npm package, and an
  npm `overrides` entry forces the transitive `obsidian` required by
  `obsidian-calendar-ui` / `obsidian-daily-notes-interface` onto the same npm
  package. No git/ssh resolution remains in the lockfile.
- The bundler was migrated to **esbuild** (the official Obsidian build system),
  which strips types syntactically and never parses `obsidian.d.ts`. Build is now
  reproducible: `npm ci && npm run build` succeeds in a clean environment and
  emits a valid CJS plugin (`module.exports.default` extends `Plugin`).
- A committed `package-lock.json` replaces the stale `yarn.lock`.

## Releases — artifact attestation

`.github/workflows/release.yml` now builds in CI and runs
`actions/attest-build-provenance` over `main.js` and `styles.css`, so future
release assets carry a verifiable GitHub artifact attestation. (Existing releases
predate the workflow; the next tagged release will be attested.)

## Behavior — Local Storage (read-only)

The plugin's own data uses the Obsidian data API (`loadData` / `saveData`); see
`src/main.ts`. The single `localStorage` access in the bundle is
`localStorage.getItem("language")` inside the `obsidian-calendar-ui` dependency,
used to detect Obsidian's display language for calendar localization. The bundle
contains **no** `localStorage.setItem` / `sessionStorage` writes — nothing is
persisted to web storage; it only reads Obsidian's own `language` key.

## Behavior — Vault Enumeration (required by design)

Calendar Hub's purpose is to surface every note created on a given day,
regardless of folder, so it enumerates notes by default. It uses the narrowest
API that serves this — `vault.getMarkdownFiles()` (see `src/ui/stores.ts`), which
returns only Markdown notes, never `getFiles()` (which would also expose images,
PDFs and other attachments). Users can narrow the scope with the "Folders to
scan" setting, or turn off cross-folder indexing entirely with the "Detect notes
in all folders" toggle. No file contents leave the vault — the plugin performs no
network egress (the only `http://` strings in the bundle are
`http://www.w3.org/2000/svg` namespace declarations).

## Dependencies — svelte / moment warnings

- **moment**: not bundled. The plugin uses Obsidian's global `window.moment`; the
  removed `@types/moment` was a deprecated stub (moment ships its own types). No
  `moment` runtime code ships in `main.js`.
- **svelte**: the calendar UI is provided by `obsidian-calendar-ui@0.3.12`, which
  is built for Svelte 3, so the bundle is compiled with Svelte 3.59.2 (the final
  3.x release). The flagged advisories target Svelte's SSR / server rendering
  paths; this plugin ships only client-side compiled DOM output and renders no
  SSR, so they are not reachable. Moving to Svelte 4/5 would require replacing
  `obsidian-calendar-ui`, which is tracked as separate future work.

## Code quality — type-aware lint

Once the build was fixed, the review surfaced ~150 `@typescript-eslint`
type-aware findings (`no-unsafe-*`, `require-await`, `no-floating-promises`,
`unbound-method`) inherited from the original calendar plugin's loose typing.
These have all been resolved: untyped Obsidian internals are now declared in
`src/obsidian-augment.d.ts`, event handlers are bound via class-field arrow
properties, and promises are awaited or explicitly voided. The project's own
`.eslintrc.js` now extends `plugin:@typescript-eslint/recommended-requiring-type-checking`
so `npm run lint` enforces the same rules going forward; it reports zero
problems.
