# MOB DISC — License generator vs Basic / Command Tactical

**Date:** 2026-07-26  
**Status:** **LOCKED** — answer before / with `LICENSE-TACTICAL-BASIC-COMMAND-V1`  
**Operator ask:** Do we rebuild the generator, or update it? Don’t invent a second tool.

---

## Short answer (read this)

| Question | Answer |
|----------|--------|
| New generator from scratch? | **No.** Keep `tools/generate-license.js`. |
| Update that generator? | **Yes — small, required.** Add Basic/Command fields it can already sign. |
| Touch `licenseManager` canonical payload? | **Yes — carefully.** Pin live cap is a **number**, not a boolean feature. |
| Separate MOB only for generator? | **No.** Same APPLY as product entitlements — one signed contract. |

---

## Why (think, don’t freestyle)

### What already exists

| Piece | Role |
|-------|------|
| `tools/generate-license.js` | Offline signer (Ubitron desk only). Already has `--feature tacticalOverwatch`, `--max-fixed-cams`, `--max-bwc`. |
| `lib/licenseManager.js` | Verifies `.lic`; `canonicalPayload()` is what gets **signed**. |
| Task 3.4 UI | Reads `GET /api/license/entitlements` — greys nav from `features`. |

### Trap if we are stupid

`canonicalPayload()` does this today:

```text
features[k] = !!features[k]   // ALWAYS boolean
```

So putting `tacticalPinLiveCap: 8` **inside `features`** becomes `true` — **loses 8 vs 16**.  
Pin cap must be a **top-level numeric** field on the payload (like `maxFixedCameras`), **optional** so old `.lic` files still verify.

### What Basic / Command need in the signed file

| Field | Basic | Command Tactical |
|-------|-------|------------------|
| `tacticalPinLiveCap` | `8` | `16` |
| `features.tacticalOverwatch` | `false` / omit | `true` |

Both plans **have** the Tactical tab. Overwatch is the upsell, not the whole Tactical module.

### Bug today (must fix in same APPLY)

UI greys **entire** Tactical nav when `tacticalOverwatch` is missing.  
That treats Basic as “no Tactical” — **wrong**. Fix: Tactical stays; **Overwatch** greys / locks.

---

## Generator changes (yes — update, don’t reinvent)

Add to **existing** `tools/generate-license.js`:

| Flag | Meaning |
|------|---------|
| `--tactical-pin-live-cap <8\|16>` | Writes top-level `tacticalPinLiveCap` |
| `--tactical-plan basic\|command` | Convenience: Basic → cap 8, no Overwatch · Command → cap 16 + `tacticalOverwatch` |

Do **not**:

- Create `generate-tactical-license.js`
- Put pin cap in `features{}`
- Change Ed25519 / HWID / expiry flow
- Force `tacticalPinLiveCap` into every old license (optional field only)

Example Command issue:

```text
node tools/generate-license.js ... --tactical-plan command --out storage/license.lic
```

Example Basic:

```text
node tools/generate-license.js ... --tactical-plan basic --out storage/license.lic
```

---

## Runtime (same MOB)

| Piece | Change |
|-------|--------|
| `canonicalPayload` | Optional `tacticalPinLiveCap` when present (finite number) |
| `getPublicEntitlements` | Expose `tacticalPinLiveCap` + derived `tacticalPlan` |
| Lab open | Fail-open: Overwatch on; pin cap **null** (unlimited until enforce MOB) |
| Entitlements UI | Stop locking whole Tactical on Overwatch; lock Overwatch control; show pin cap on banner when licensed |

**Not this MOB:** wiring `CIRCLE_OPEN_CAP` in `fleet-ui.js` — that is **`TACTICAL-PIN-LIVE-CAP-FROM-LICENSE-V1`** (next).

---

## Recommendation (locked)

1. **Update** the existing generator + canonical payload (numeric pin cap).  
2. **Fix** Overwatch vs Tactical grey-out.  
3. **Defer** live open-cap enforcement to the next named MOB.  
4. **Never** ship a second generator.

**Floor plan genre:** PASS (operator 2026-07-26).

APPLY that follows this disc: `LICENSE-TACTICAL-BASIC-COMMAND-V1`.
