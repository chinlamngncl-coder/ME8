# MOB DISC — Case Files list: V4 FAIL — horizontal scroll, Detail off-screen, box-in-box

**Status:** PASS — operator 2026-07-22  
**Date:** 2026-07-22  
**Trigger:** Operator screenshot after `CASE-FILES-LIST-DETAIL-COL-FIT-V4` — **must scroll right** to see Detail; header **“De”** clipped; fat empty columns; grey **horizontal scrollbar**; “box in box” for Open/Delete again.  
**Search:** `min-width 11em`, `overflow-x auto`, `COL-FIT-V4`, `ss-evidence-table-wrap`, horizontal scroll  
**Related:** V2 · V3 · V4 all FAIL — `MOB-APPLIED-CASE-FILES-LIST-DETAIL-COL-FIT-V4`

---

## Straight answer

**You should not scroll right.** Four rows, seven columns, normal laptop width — **everything must fit in one view.**

We broke that on purpose in code:

1. **`min-width: 11em`** on column 7 forces the table **wider than the panel**
2. **`overflow-x: auto`** on `#cf-table-wrap` (added in V3) **adds the scrollbar** instead of fixing fit
3. **`table-layout: fixed`** + **86% on cols 1–6** + **em floor on col 7** = columns fight; Detail loses
4. **Layered MOBs** (LIST-ACTIONS → COL-FIT V2→V4) stacked rules without tearing down the bad ones

**Not 1000 reasons — 4 code mistakes and we kept repeating them.**

---

## What your screenshot shows

```
[ Case ID | Title | Officer | Status | Evidence | Updated | De… ]  → scroll →
                                                              Open · Delete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ← horizontal scrollbar
```

| You see | Cause |
|---------|--------|
| **“De”** not “Detail” | Detail column **off the right edge** of the viewport |
| Must **scroll right** for Open | Same — col 7 pushed past fold |
| Officer / Status / Evidence **wide but empty** | Fixed **%** too generous on low-content cols |
| **Box in box** | `#cf-table-wrap.ss-evidence-table-wrap` (bordered scroll shell) **inside** list panel **inside** Evidence hub — plus per-cell borders |
| Open/Delete fiddled “multiple times” | LIST-ACTIONS-V2 + COL-FIT V2/V3/V4 — **same cell**, never one clean pass |

---

## MOB history (all wrong angle)

| MOB | Tried to fix | Actually did | Your result |
|-----|--------------|--------------|-------------|
| **V2** | Ghost col 8 | `width: 1%` only | **Clip** Op/De |
| **V3** | Clip | `width: 10%` | **Void** inside Detail |
| **V4** | Void | `1%` + **`min-width: 11em`** + kept **`overflow-x: auto`** | **Scroll** + Detail off-screen |

We optimized **one column** in isolation. We never enforced: **table ≤ panel width, zero horizontal scroll.**

---

## Why horizontal scroll exists (the real math)

```css
/* V4 — conflicting intent */
#ev-panel-case-files .evidence-table { table-layout: fixed; width: 100%; }
/* cols 1–6 sum to 86% of table */
/* col 7 */
width: 1%; min-width: 11em;   /* ← browser: table ≥ 11em for col7 PLUS 86% — often > 100% of wrap */
#ev-panel-case-files #cf-table-wrap:not(.cf-list-empty) {
    overflow-x: auto;        /* ← we ADDED scroll instead of removing overflow cause */
}
```

**`min-width` in em on one column under `table-layout: fixed` does not “shrink” — it sets a floor that can exceed the wrapper.**  
**`overflow-x: auto` then happily shows a scrollbar.** That is why you scroll.

---

## What PASS looks like (one view, once)

| Rule | Detail |
|------|--------|
| **No horizontal scrollbar** | Ever, on Case Files list at normal width |
| **Detail + Open · Delete visible** | Without scrolling |
| **One table, one border** | List table fills panel; no nested scroll-x shell for 4 rows |
| **Fat cols trimmed** | Officer / Status / Evidence only as wide as needed |
| **Title / Case ID** | Ellipsis; they absorb slack |
| **Plain links in `<td>`** | No flex-on-`td`, no inner box, no ghost col 8 |

---

## Recommended MOB — one clean pass

**Name:** `CASE-FILES-LIST-TABLE-ONE-VIEW-V5`

Stop COL-FIT whack-a-mole. **Replace** the case-files list table width block with a single coherent layout.

### In scope

1. **Remove** `#ev-panel-case-files #cf-table-wrap { overflow-x: auto }` — revert to **`overflow-x: hidden`** (or clip) so table **must** fit.
2. **Remove** `min-width: 11em` (and any em floor) on col 7 — it causes overflow.
3. **Case Files list only** — `table-layout: fixed; width: 100%; max-width: 100%`.
4. **Column budget — sums to 100%, Detail gets real share:**

   | Col | % | Notes |
   |-----|---|--------|
   | Case ID | 14% | ellipsis / break-all |
   | Title | 30% | ellipsis |
   | Officer | 9% | |
   | Status | 7% | |
   | Evidence | 6% | |
   | Updated | 14% | |
   | Detail | **20%** | fits **Open · Delete** without scroll |

   (Tune in APPLY; point is **Detail in the 100% budget**, not em hack.)

5. **Detail cell** — plain `table-cell`, inline links only; **delete** list `display:flex` on `td.cf-list-actions` and duplicate COL-FIT rules.
6. **Few rows** — `#cf-table-wrap.cf-few-rows`: no min-height 220px stretch if it contributes to box-in-box feel; table height = rows only.
7. **Optional:** drop inner wrap border on few-row list (`border` on `#cf-table-wrap` when `.cf-few-rows`) so one visual frame — only if operator still sees box-in-box after width fix.

### Out of scope

- Detail pane (field report) — separate
- Redacted exports table

### Risk

**Low** — CSS only; delete conflicting COL-FIT V2–V4 rules for case list in same edit.

### Verify

| # | Test | Pass |
|---|------|------|
| 1 | 4 case files — **full table visible**, no horizontal scroll | ☐ |
| 2 | **Detail** header + **Open · Delete** without scrolling | ☐ |
| 3 | No void inside Detail cell | ☐ |
| 4 | No 8th column | ☐ |
| 5 | Resize narrower — Title ellipsizes; **still** no h-scroll until phone width (acceptable) | ☐ |

---

## Agent pick

**`CASE-FILES-LIST-TABLE-ONE-VIEW-V5`** — not V5 “col fit tweak”. **Tear down** V2–V4 list table CSS + **`overflow-x: auto`** + **em min-width**; one **100% width budget** so Detail stays on screen.

---

## Ask

**`MOB-APPLY CASE-FILES-LIST-TABLE-ONE-VIEW-V5`**
