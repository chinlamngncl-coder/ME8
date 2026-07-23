# MOB DISC — Panel wall 5+3 pages + tabs + auto-rotate (NO APPLY)

**Status:** APPLIED — 2026-07-19 · `MOB-APPLY-PANEL-WALL-5-PLUS-3-PAGES` (keep-live tabs; contain; 8 slots)  
**Subject:** `MOB-DISC-PANEL-WALL-5-PLUS-3-PAGES`  
**Open point locked:** hidden bank **keeps live** (no bandwidth save; max 8).  
**Why now:** Cover crop FAIL vs pin; 16:9×6 forced scroll. Need **taller visible slots** (closer to full frame) without dumping capacity.  
**Related:** `MOB-DISC-PANEL-COVER-VS-PIN-FAIL-20260719.md`

---

## What you mean (confirmed)

1. **Show 5 panels** on the right rail (not 6) so each stage is **taller** → with `contain`, framing closer to the pin (less side bars / less need to crop).
2. **Still have more than 5 cameras:** add a **second bank** = panels **6–8** (3 panels).
3. **Two small tabs** (top or bottom of the rail):
   - On bank A (1–5): tab label **“Next Panels 6–8”** → click flips to bank B.
   - On bank B (6–8): tab label **“Next Panels 1–5”** → click flips back.
4. **Every panel keeps full chrome** — play / stop / mute / call / PTT / Vid Popout / status — same as today. No stripped “mini” tiles.
5. **Two ways to work the extra cams (freestyle):**
   - **Manual:** click the tab when you want to **see** bank 6–8 (or back to 1–5).
   - **Auto-rotate:** if you **don’t** want to sit on the tab, **Auto-rotate** can still **cycle videos on those 3 panels** (and any rotating slots) on a timer — freestyle: use tab, or rotate, or both.

Yes — that reading matches.

---

## Today (facts)

| Item | Current |
|------|---------|
| Visible slots | **6** (`SLOT_COUNT = 6` in `video-wall.js`) |
| Max live | `MAX_LIVE_STREAMS = 8` (already) |
| Auto-rotate | Checkbox `#video-wall-poll`; per-slot timer when Video Config channel is **rotating mode** — cycles cam queue **into that slot** |
| Fit policy | After cover FAIL → prefer **`contain`** (full frame) |

Header comment today: panels 1–4 fixed-ish; 5–6 used for poll/rotate extras. That mental model would **move** under 5+3.

---

## Proposed product shape (DISC)

```
#video-wall (272px, no scroll)
├── [optional] tab row:  [ Next Panels 6–8 ]   ← or bottom
├── visible stage stack
│     Bank A: Panel 1..5   (flex equal, taller than old 1..6)
│     Bank B: Panel 6..8   (flex equal; only 3 → even taller)
└── (hidden bank stays in DOM or paused — see open points)
```

| Bank | Panels | Visible at once | Purpose |
|------|--------|-----------------|---------|
| A | 1–5 | 5 | Primary ops watch (taller = better contain vs pin) |
| B | 6–8 | 3 | Overflow / rotate pool / manual inspect |

**Total logical panels = 8** (aligns with existing `MAX_LIVE_STREAMS = 8`).

---

## Manual tab (your “Next Panels …”)

- One control (or two tiny tabs) — **not** a scrollbar.
- Flip = **page switch** of which bank is shown in the rail.
- Labels swap as you said:
  - Viewing 1–5 → **Next Panels 6–8**
  - Viewing 6–8 → **Next Panels 1–5**
- All panel buttons stay; pin popup / Open All / SOS assignment rules need a clear map to slot index 0–7 (see open points).

---

## Auto-rotate + freestyle (your second question)

**Yes — we can keep Auto-rotate without forcing the operator onto the tab.**

How it fits:

| Mode | Behavior |
|------|----------|
| **Manual tab** | Operator chooses **which bank is on screen**. Live/chrome on panels unchanged. |
| **Auto-rotate ON** | For any slot in **rotating** Video Config mode (especially useful on **6–8**), timer **swaps which cam** is playing **in that panel** — same as today’s rotate, just more slots. |
| **Freestyle** | Leave Auto-rotate on for bank B queues while watching bank A; click tab only when you want to **look at** 6–8. Or turn rotate off and assign cams fixed + use tab only. Or both. |

So: **tab = which panels you see**; **auto-rotate = which cams play inside rotating panels**. They are complementary, not either/or.

What auto-rotate does **not** do by itself: it does **not** replace the tab if the cam is only assigned to a **hidden** bank panel — you still need the tab (or a future “bring rotating cam onto visible bank” rule) to **see** it. Disc should lock that expectation so nobody thinks rotate alone shows bank B on bank A’s screen.

Optional later (not this MOB unless you ask): “rotate overflow into a visible A slot” — different product; say so if you want it.

---

## Why this helps the pin framing problem

- 5 visible in same rail height → each stage **~20% taller** than 6.  
- Bank B with only 3 → stages **much taller** (closer to 16:9 at 272px width).  
- With **`contain`**: full frame like pin; bars shrink as stages get taller.  
- **No cover crop**; **no 16:9 scroll stack**.

---

## Open points (must lock before APPLY)

1. **Hidden bank streams**  
   - **Keep live** when flipped away (instant tab, up to 8 concurrent — matches max live), or  
   - **Pause/stop** hidden bank (saves bandwidth; tab costs reconnect).  
   Recommend default for disc debate: **keep live** if already under max-8; pause only if load hurts.

2. **Open All / SOS / pin → wall slot**  
   Today assumes 6 slots. Need rules for slots 6–7 (panels 7–8) and whether SOS prefers bank A.

3. **Video Config UI**  
   Config rows today = 6 channels → extend to **8**; mark which are bank A vs B.

4. **Tab placement**  
   Top of `#video-wall` vs bottom — your call; top is easier to see without scrolling panels.

5. **Empty bank B**  
   Three idle “Select a device” panels OK; rotate only when channel mode = rotating + queue length > 1.

6. **Contain vs cover**  
   This layout assumes we **stay on contain** (cover FAIL). Confirm in APPLY.

---

## Out of scope unless named

- Command Wall matrix pages  
- Changing pin size  
- Firmware Gold pin-mirror internals  
- Re-introducing panel scroll or cover

---

## Suggested APPLY name (when ready)

**`MOB-APPLY-PANEL-WALL-5-PLUS-3-PAGES`**

Rough scope (for later APPLY only):

1. `SLOT_COUNT` 6 → **8**; visible page size **5** vs **3**.  
2. Tab UI + i18n labels (Next Panels 6–8 / 1–5).  
3. Keep per-panel chrome; hide non-active bank with CSS (`hidden` / `display`) — prefer not destroy players on flip if we lock “keep live”.  
4. Auto-rotate continues per rotating slot (including 6–8).  
5. Panel fit: **`contain`**.  
6. Cache-bust wall + index; no SOS/PTT logic freestyle.

---

## Status

**DISC only.** Waiting for your lock on open points (especially hidden-bank keep-live vs pause) + **MOB-APPLY-…** before any edit.
