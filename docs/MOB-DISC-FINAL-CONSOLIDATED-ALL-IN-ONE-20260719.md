# MOB DISC — FINAL CONSOLIDATED ALL-IN-ONE (gatekeeper / pin mirror / contain)

**Status:** DISC only — 2026-07-19 · **no APPLY**  
**Subject:** `MOB-FINAL-CONSOLIDATED-ALL-IN-ONE` (operator paste)  
**Files named in paste:** `public/js/video-wall.js`, `public/js/live-player-factory.js`  
**Rules:** zero invent · no freestyle · Firmware Gold lock on wall/pin cores · no harm to live wall / SOS / PTT / Call  
**Operator:** apply this paste? → this disc answers **can / cannot / already done** before any APPLY

---

## Verdict (one screen)

| # | Paste item | Can it be done safely? | Lab reality now |
|---|------------|------------------------|-----------------|
| 1 | Dynamic Failover Gatekeeper | **Idea yes · paste-as-written NO** | **Already** in wall Open via `mountWallZlmPrimary` → on fail `fallbackFleetJsmpeg` → `ensureInvite` |
| 2 | `wallCanvasForCam` video fallback | **Already done** (better than paste) | `MOB-APPLY-PIN-STOP-RES-FIX` — finds `video.me8-zlm-soft-overlay` per bound wall slot |
| 3 | `object-fit:contain` + parent `overflow:hidden` | **Mostly done**; overflow is **small additive** only | Factory already has `object-fit:contain !important` |

**Do not paste the Subject snippet into `video-wall.js` as-is.** It would **break** the live wall mount API and risk SOS/Open/PTT surfaces that share this file.

---

## Why the paste is unsafe (exact API mismatch)

### 1) Gatekeeper snippet ≠ current factory / wall contract

Paste assumes:

```js
const success = await Me8LivePlayerFactory.softAttachZlmOverlay(camId);
```

**Actual** factory signature (today):

```js
softAttachZlmOverlay(host, desc, opts)  // returns handle object | null — NOT a Promise, NOT boolean
```

Also:

- Wall already mounts with **`fetchDescriptor(camId)`** (one shot), then `softAttachZlmOverlay(stage, desc, …)`.
- Fail path already calls **`fallbackFleetJsmpeg()`** → `ensureInvite` **only if ZLM mount returned false**.
- `fetchDescriptorPreferZlm` exists but is a **retry loop** (default 6× ~700 ms). Blind swap into Open is a **behavior change** (extra broker polls) — not approved here; not the same as “INVITE only on fail.”

Replacing “playback initiation” with the paste would:

- Call factory with wrong args → mount always fails → **always** Fleet INVITE (worse 408), or throw
- Bypass `mountWallZlmPrimary` bookkeeping (`zlmWallOverlays`, `players`, status, stall watch, pin sync timer)
- Touch Firmware-Gold–adjacent wall Open path without a scoped, reviewed APPLY

**408 claim:** Wall Open already gates INVITE behind ZLM fail. Residual 408s (if any) often come from **other** start-video / legacy paths — fixing those needs a **separate named disc + APPLY**, not this paste.

### 2) Pin mirror — already fixed; paste is weaker

Today `wallCanvasForCam` (PIN-STOP-RES-FIX):

- Walks **bound wall slots** (`players` / `zlmWallOverlays`)
- Prefers live **canvas** when sized
- Else **`video.me8-zlm-soft-overlay`** (drawImage-capable)

Paste uses a global `.wall-canvas[data-cam-id=…]` selector that **does not match** current DOM (`canvas.video-canvas` inside stage, no guaranteed `data-cam-id` on canvas). Replacing with paste would **regress** pin mirror.

### 3) Native resolution / contain

Today factory line already:

`object-fit:contain !important` + absolute fill + black background.

Paste adds:

- more `!important` on position/size (cosmetic overlap)
- `video.parentElement.style.overflow = 'hidden'`

**Overflow** can help letterbox clipping; risk = clipping wall stage chrome (streaming label / overlays) if parent is the whole stage. Must be **scoped / tested** — not freestyle on APPLY day without eyes on wall + pin.

---

## What is already APPLIED (do not redo)

| APPLY | What it locked |
|-------|----------------|
| `MOB-APPLY-FRONTEND-ZLM-PRIMARY-V2` | Broker first; `engine===zlm` → mpegts wall; **no** INVITE on success |
| `MOB-APPLY-PIN-STOP-RES-FIX` | Pin RAF mirror from ZLM `<video>`; contain CSS; Stop → `wvp.stopPlay` when lab WVP on |

---

## Safe residual (only if you still want a tiny polish)

**Not** “replace initiation.” Optional future named APPLY only:

`MOB-APPLY-ZLM-OVERLAY-OVERFLOW-CLIP`  
- File: **`public/js/live-player-factory.js` only**  
- Add parent `overflow:hidden` (and optional cssText `!important` parity) inside `softAttachZlmOverlay`  
- **No** rewrite of `mountWallZlmPrimary` / `wallCanvasForCam` / `ensureInvite`  
- **No** SOS / PTT / Call logic  
- Operator: hard refresh → wall + pin + Stop PASS

Anything larger (PreferZlm retries, hunting other 408 callers) = **new disc**, not this consolidated paste.

---

## Harm check (death-sentence rules)

| Surface | Paste-as-is | Correct stance |
|---------|-------------|----------------|
| Live wall Open | **High risk** (wrong API) | Keep current `mountWallZlmPrimary` + fallback |
| Pin mirror | **Regress risk** | Keep current `wallCanvasForCam` |
| SOS / PTT / Call | Shared `video-wall.js` — collateral if rewrite | **Do not** touch those paths |
| Firmware Gold cores | Named file + MOB-APPLY required | No silent edit |
| Invention | Paste invents new call shape | **Rejected** until you name a residual APPLY |

---

## Your call

- **Do nothing** on #1/#2 — already covered.  
- If you want the small contain clip: say **`MOB-APPLY-ZLM-OVERLAY-OVERFLOW-CLIP`**.  
- If 408 still appears after ZLM primary success: say **MOB DISC 408 residual path** (find callers) — do **not** paste this Subject into wall.

**Until you say a named MOB-APPLY for a residual item: no file edits.**

---

## One line

Consolidated paste idea ≈ already built; **paste-as-written would harm wall/pin** — disc rejects blind apply; only optional tiny overflow clip remains under your authority.
