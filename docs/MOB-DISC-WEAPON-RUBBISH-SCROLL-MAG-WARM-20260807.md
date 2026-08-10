# MOB DISC — Weapon rubbish hits + Recent scroll/mag + warm without refresh (2026-08-07)

**Status:** disc only. No code until named `MOB-APPLY`.  
**Operator:** Recent shows “gun · kk” on YouTube / captions / screen UI (not a weapon). Recent does not scroll usefully. No clear magnifying glass. Must refresh page after Weapon sidecar warms even if started first.

---

## Confirm (you are right)

Not operator error. Four separate product gaps / regressions stacked.

### 1) Rubbish “gun” on screen / words / captions

What you see (TV / YouTube chrome, pink bar, captions, mouse cursor, no firearm) is a **false positive**, then the sidecar saves a **wide context crop** of that frame — so Recent looks like “screen capture of a video player,” not a weapon.

Why now:

- Lab is on **pistol smoke** weights (`checkpoint_pistol_smoke.pth`): **1 class = gun**, trained on **40 pistol stills**, **0 negatives**, **auto inset boxes** (smoke, not hand-labeled).
- That head will fire “gun” on many non-gun shapes. Screen text / UI / hands / remotes are classic trash for a no-negative smoke.
- Threat knife path is **off** while smoke weights are loaded — everything that fires is labeled **gun**.

This is **not** “hardcoded OK.” It is expected smoke weakness until negatives + better labels + live test on different video.

### 2) Recent “can’t scroll”

CSS has `overflow-y: auto` on `#ax-wd-detect-grid`, but the rail only has **4 fixed slots** in HTML. Server keeps up to **20** hits; UI paints ~4–12 into those **4** boxes only.

So: no real scrollable Recent history (unlike a growing FR-style list). If 4 tall cards fill the rail, scrollbar never appears or feels broken. **Not forgotten on purpose as “no scroll forever”** — CONTEXT-MAG added click-open; it did **not** grow Recent into a scrollable stack.

### 3) Magnifying glass

`WEAPON-RECENT-CONTEXT-MAG-V1` added **click slot → lightbox** (big image). It did **not** add the FR/ANPR **visible magnifier control** or hover-zoom (`is-zooming`) on the rail card.

If you never click the slot, it feels like “no magnify.” Magnifier chrome is still incomplete vs FR/ANPR.

### 4) Must refresh while engine warms

`refreshWeaponStatus()` in `analytics-hub.js` runs **once** when the Weapon panel shows. If sidecar is still loading weights → “Warming…” / not ready, it **does not keep polling** until OK.

So: start Weapon bat first, open Analytics Weapon, wait — badge can stay stuck until **manual refresh**. That is stupid for customers. Detect poll can also sit on a not-ready engine until the page is re-entered.

---

## Recommendation (one path — do not park)

Fix **operator trust first** (warm + Recent UX), then **cut rubbish** with data (not more threshold theater alone).

| Order | MOB | Why |
|-------|-----|-----|
| 1 | `WEAPON-ENGINE-WARM-AUTO-V1` | While panel open: poll health every ~2s until `ready`; flip Warming → OK **without refresh**. Detect uses engine as soon as ready. |
| 2 | `WEAPON-RECENT-SCROLL-MAG-V1` | Recent = scrollable list (many cards, rail scrolls). Each hit: clear mag icon + click lightbox; lightbox hover-zoom parity with ANPR. |
| 3 | `WEAPON-FINETUNE-NEGATIVES-AND-GATE-V1` | Operator drops **negative** stills (empty hands, phones, TV/YouTube UI, captions-only, no weapon). Rebuild COCO + retrain. Raise smoke conf floor until negatives land. Optional: drop Threat back as default until smoke passes live, **only if** you order that in APPLY. |

Do **not** “fix” rubbish by hardcoding class names or banning words on screen. Do **not** declare smoke PASS from train mAP on the same 40 pics.

---

## Operator stills (for MOB 3)

Add into `weapon-finetune-dataset/negative/` (your method):

- Same room / same TV YouTube pages **with no pistol**
- Close-ups of captions / progress bars / remote / phone
- Empty hands, pointing, bags

Keep pistols in `gun_pistol/`. Do not delete the 40.

---

## Honest product note

Until negatives + retrain, expect **more** false guns on screen-watching BWCs with the pistol-smoke head. That matches what you photographed.

---

## APPLY when ready (one at a time)

1. `MOB-APPLY WEAPON-ENGINE-WARM-AUTO-V1`  
2. then `MOB-APPLY WEAPON-RECENT-SCROLL-MAG-V1`  
3. then (after you drop negatives) `MOB-APPLY WEAPON-FINETUNE-NEGATIVES-AND-GATE-V1`
