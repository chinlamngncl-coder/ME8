# MOB-APPLIED — Task 3.2 Code Protection & Production Packaging

**Date:** 2026-07-25  
**Execute:** Task 3.2 (user redefined from “entitlements enforce” → packaging / code protection)  
**Status:** Ready for operator review (dry-run PASS)

## Goal

Bundle server + `lib/*` (including `licenseManager`) so a customer pack does not ship readable `server.js` / `lib/*.js`, while keeping static assets and native deps outside the JS blob. Prove boot still hits `validateOnBoot()` and dies with `LICENSE EXPIRED OR INVALID` when `license.lic` is missing.

## What landed

| Piece | Path |
|-------|------|
| Build | `scripts/build-ship-protected.js` |
| npm | `npm run build:ship` → stages `ship-build/protected/` |
| Verify | `npm run verify:ship-protected` |
| Fresh vault fix | `lib/serverSecrets.js` — `loadSecrets` always `normalizeSecrets` on env bootstrap (smtp/tech shape) so empty ship storage reaches license gate |
| gitignore | `ship-build/` |

### Bundling strategy (this MOB)

- **esbuild** `--bundle --platform=node --target=node22 --packages=external --minify`
- Local modules (license validation, settings, SIP, …) **inlined** into one `run.js`
- npm packages stay **external** (`node_modules` next to `run.js`) — same model as PH-KR packs
- Optional second pass: `FM_SHIP_OBFUSCATE=1` → `javascript-obfuscator` (conservative string-array)
- **Not** `@yao-pkg/pkg` in this MOB — native bindings (`pg`, `ioredis`, optional `node-llama-cpp`, etc.) remain beside the blob

## Distribution layout (after `npm run build:ship`)

```
ship-build/protected/
  run.js              ← minified blob (licenseManager inside; no lib/)
  package.json        ← "start": "node run.js"
  public/             ← UI assets (separate)
  keys/               ← license-public.pem only (never private)
  storage/            ← license.lic + site data (not compiled)
  MANIFEST.json
  ASSETS.md
```

**Not in pack:** `server.js`, `lib/`, `tools/generate-license.js`, `license-private.pem`

**Full customer zip still adds (outside blob):** `node_modules/`, `docker/` (ZLM/WVP), `vendor/` binaries, ship `.env` template, Start bats — via existing `BUILD-ME8-CUSTOMER` / PH-KR pack scripts (wire-up next when you open pack automation).

## Dry-run (PASS)

```
npm run build:ship
npm run verify:ship-protected
```

Verify asserts:

1. No `server.js` / `lib/` under `ship-build/protected/`
2. Bundle contains `LICENSE EXPIRED OR INVALID` and no `require("./lib/licenseManager")`
3. Spawn `node run.js` with `FM_AIRGAP_LICENSE_REQUIRED=1`, seeded storage, **no** `license.lic` → exit ≠ 0 and prints the fatal string

## Operator notes

- Lab source tree is unchanged for day-to-day: still `node server.js` / `LAB-CONSOLE-START`
- Ship / protected dry-run: `node run.js` from the staged folder (or full pack Start bat)
- Rebuild after any server/lib change before packing: `npm run build:ship`
- Stronger obfuscation when packing for hostile review: set `FM_SHIP_OBFUSCATE=1` then rebuild

## Explicitly NOT this MOB

- Task **3.3** license-aware UI grey-out
- Old roadmap “3.2 entitlements / feature flags” (deferred; grey-out story remains later)
- Wiring `build:ship` into every PH-KR zip path (review first)
- Full single-file `.exe` via pkg

## Review gate

Wait for operator PASS / comments before Phase 3 wrap or Task 3.3.
