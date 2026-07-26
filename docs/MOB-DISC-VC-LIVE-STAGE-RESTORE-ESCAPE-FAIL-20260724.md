# MOB DISC — VC front page FAIL: fake expand, stuck mode, black void, silent BWC

**Date:** 2026-07-24  
**Status:** PAPER ONLY — no APPLY · no code until you name a phrase  
**Operator:** Angry FAIL. Screenshots: black void + lone blue ⤢; Live room with rooms/host tools/dock but **empty black band**, no tiles, Focus/modes feel dead, 2 BWCs online but not visible, **no toast** when calling Add to Room.

**Agent ownership:** This is on us. Stacked layout MOBs (compact → inversion → grid/void) made the Live stage worse, not nicer. Rules said one APPLY, prove PASS, then next — we still left you with a broken meeting face.

---

## One-screen truth

| Complaint | What is actually wrong |
|-----------|------------------------|
| Expand then can’t minimise | Blue **⤢** is **not** expand/collapse. It is **Pin → Focus** (or Operations for BWC/share). **No second click to exit.** Misleading icon. |
| Focus / modes “don’t work” | Mode can switch in JS, but stage stays **empty black**; feels stuck. `pinnedSid` not cleared when leaving Focus via dock. Esc only if already in Focus (and does **not** clear pin). |
| Can’t see the other BWC | Stage not painting tiles; BWC is **content/share**, not a people tile. Empty spotlight + broken strip = both BWCs invisible even if ingress OK. |
| No sign you’re calling a BWC | Add to Room success = **silent** (only `alert` on fail). No toast, no “Connecting Chin…”, no LIVE badge if tile never mounts. |
| Black patch below | Stage flex still fails: top chrome (rooms + host tools + personnel) stays; **video body is a dead black band** above the dock. |
| “8 human / cams ~6” | Code caps: **people 8**, **filmstrip 6**, **share/BWC tiles 4**. Locked in layout client — we did discuss 8 people; filmstrip 6 is the “cams-like-6” strip. Share hard-cap **4** may be tighter than you remember. |

---

## Locked caps (check — confirmed in code)

From `public/js/conference-layout.js`:

| Constant | Value | Meaning |
|----------|-------|---------|
| `MAX_PEOPLE` | **8** | Human / webcam tiles mounted |
| `FILMSTRIP_MAX` | **6** | Side strip max people under Speaker |
| `MAX_SHARE_TILES` | **4** | BWC + fixed + screen/image/video/doc content tiles |
| `POLL_VISIBLE` | 4 | Operations poll pages |

So: **8 humans**, strip shows up to **6**, content cams **up to 4** (not 6). If you wanted **6 content cams**, that was never APPLIED as a raise — say so and we paper a cap MOB later. **Do not** raise caps inside the recovery MOB below.

---

## Root causes (no sugar)

### 1. Fake “expand” (product bug)

```text
Tile button ⤢  →  pinnedSid = that track
                 →  people → Focus (spotlight-full, filmstrip hidden)
                 →  BWC/share → Operations + large
```

- Icon reads as **fullscreen expand**.  
- There is **no minimise / un-pin / restore** on the same control.  
- Disc for 3-mode said: Esc → Speaker, always-findable Leave, no trap. **Half-built:** Esc exists only for Focus → Speaker; **does not clear `pinnedSid`**; pin button never toggles off.

**First screenshot** (black + only blue ⤢): classic Focus/spotlight shell with **no video attached** — pin chrome still painted on empty void.

### 2. Layout stack made the void worse

Recent APPLYs fought each other:

1. Compact chrome → collapsed video into a bottom strip.  
2. Inversion correction → try to refill stage.  
3. Grid + void elim → fill-grid fallback + stop ops class clash.

Operator eyes: **still** a black band and no usable grid of people/BWCs. So those MOBs are **FAIL for the Live face**, regardless of cache tags.

### 3. Silent BWC ingress (ops feedback bug)

`addBwcIngress` / fixed-cam add: API + `setShareExpected(true)` — **no visible toast** on success. Failures use `alert`. Host Tools says “2 body camera online” but stage can still be black → operator cannot tell call vs layout death.

### 4. Why “2 BWC / Chin+kk” but nothing on stage

Possible together:

- Spotlight empty + gallery CSS still wrong → **nothing to see**.  
- BWC tracks are **share kinds**; if Operations/deploy/fill-grid path fails, content never lands in a visible tile.  
- People (Chin/kk) may be in roster but not remounted into spotlight/filmstrip.

This is **layout + feedback**, not “we forgot the 8-cap rule.”

---

## What we must NOT do next

- Another cosmetic CSS-only “void” MOB without a **restore / escape / toast** prove.  
- Raise caps to 10 / invent AR / User Circle while Live is unusable.  
- Park WVP / rebuild Fleet / new VC app.  
- Leave Focus with no visible **Back / Speaker** escape on-screen (Esc-only is not enough under stress).

---

## Single recommended recovery (one MOB)

**Name:** `VC-LIVE-STAGE-RESTORE-AND-ESCAPE-V1`

**Goal:** Make Live usable again for lab (2 people + 1–2 BWC). Nice grid polish later.

| Must fix | Detail |
|----------|--------|
| **A. Honest pin control** | ⤢ becomes **Focus** (label/title). Second click **or** explicit **Exit Focus** exits to Speaker and **clears `pinnedSid`**. |
| **B. Escape hatches** | Dock **Speaker** clears pin + Focus. **Esc** clears pin + Speaker. Optional on-stage **Back** when Focus. |
| **C. Kill black void** | Stage between host chrome and dock must show either (1) Speaker main + side strip, or (2) equal grid of current people, or (3) Operations content + people — **never** empty black with only a pin button. |
| **D. Two BWCs visible** | With 2 ingress BWCs: both tiles visible under Operations (or Speaker content rules) within `MAX_SHARE_TILES` (4). |
| **E. Operator feedback** | Toast or stage banner: **Adding… / LIVE · name / Failed · reason** on Add to Room / fixed cam. No silent success. |
| **F. Caps unchanged** | Keep 8 / 6 / 4 unless you later APPLY a cap change. |

**Out of this MOB:** User Circle, Map AR, APK, raising share to 6, Host Tools redesign.

**PASS (your eyes):**

1. Ctrl+F5 → Join Room 1.  
2. See Chin + kk (or self + other) as real video, **not** black band.  
3. Add BWC → **see feedback** + see that cam tile. Add second BWC → **see both**.  
4. Click Focus (dock or tile) → one big feed; click **Speaker** or Esc or Exit → **back**, strip/grid returns.  
5. No lone blue button on empty black.

**FAIL:** Any of the above still broken → stop; do not layer another layout MOB.

---

## Immediate operator unblock (no code)

Until APPLY:

1. **Leave** the room (dock Leave).  
2. **Ctrl+F5**.  
3. Join again; try **Speaker** on the dock before touching ⤢.  
4. If stuck again: avoid the blue tile ⤢ until recovery MOB lands. Use dock **Speaker · Operations · Focus** only.

If Leave itself is dead, close the browser tab and reopen dashboard.

---

## Apology / process lock

You asked for nice. We delivered confusing expand, silent BWC, and a black patch.  
Next: **one** restore MOB after you say APPLY — prove PASS — only then polish.

---

## Operator next step

1. Say **VC RESTORE DISC OK** (or change the PASS list / want share cap 6 named separately).  
2. Then: **`MOB-APPLY VC-LIVE-STAGE-RESTORE-AND-ESCAPE-V1`**.

No code until that APPLY.
