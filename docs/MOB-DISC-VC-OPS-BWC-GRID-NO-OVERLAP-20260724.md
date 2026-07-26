# MOB DISC — VC Operations: 2+ share tiles overlap (BWC + fixed camera)

**Date:** 2026-07-24  
**Status:** DISC only — **no code** until `MOB-APPLY VC-OPS-BWC-GRID-NO-OVERLAP-V1` (name draft; covers fixed cams too)  
**Operator:** Opened **2 BWCs** on **Operations** → overlap. Speaker / Focus / other layouts OK.  
**Clarification (same day):** Fix is **not BWC-only** — Operations top grid must show **all share/ingress tiles**: **BWC and fixed cameras** (and other share kinds already in that grid path). Same absolute-stack bug hits any second tile in `.vc-spotlight-inner`.

---

## Understanding

- **Scope:** **Operations** mission only (tactical grid on top + human strip bottom).  
- **Tiles in the top grid:** **BWC + fixed camera** (+ screen/image/video/doc shares if present in Operations share pane). Operator must see **each** as its **own grid cell**, not stacked.  
- **Symptom:** Multiple shares active in host chrome, but stage shows **one** picture / labels fighting in one black area.  
- **Out of scope:** Speaker, Focus, Gallery (unless Dual needs the same absolute override — optional follow-up). No LiveKit/join/cap changes.

---

## Root cause (code fact)

Speaker / Focus full-bleed:

```css
.vc-stage.vc-client-v1 .vc-spotlight-inner .vc-tile {
    position: absolute;
    inset: 0;
    width: 100% !important;
    height: 100% !important;
}
```

Operations mounts **many** share tiles (BWC **and** fixed) into the same `.vc-spotlight-inner` with a CSS grid, but absolute `inset: 0` still applies → **all** those tiles stack → overlap.

---

## Recommended APPLY (when you say go)

**Name:** `VC-OPS-BWC-GRID-NO-OVERLAP-V1`  
*(Name keeps BWC for history; behavior = **all Operations spotlight share tiles**, including fixed cams.)*

**Only:**

1. Under Operations layout classes, spotlight tiles = **normal grid children** (`position: relative`, clear `inset`, cell-sized 16:9 contain) — applies to **every** `.vc-tile` in that grid (BWC, fixed, other shares).  
2. `.vc-spotlight-inner` stays **`display: grid`** with `applyFitShareGrid` for 1–6 share slots.  
3. Do **not** special-case “BWC only” in CSS — fix the container/tile positioning for the whole Operations share grid.  
4. Leave Speaker/Focus absolute full-bleed alone.

**Do not:** change dock, caps, WebRTC, or human strip logic.

---

## Operator PASS

1. VC → Ctrl+F5 → Join → **Operations**.  
2. Add **2 BWCs** → two separate cells, both visible.  
3. Add **1–2 fixed cameras** (alone or with BWC) → each fixed cam its **own** cell; no overlap with BWC or each other.  
4. Speaker / Focus still one clean main stage.

---

## Confirm

Say **VC OPS GRID OVERLAP DISC OK** (BWC + fixed), then when ready:

`MOB-APPLY VC-OPS-BWC-GRID-NO-OVERLAP-V1`

Until APPLY — **zero file edits**.
