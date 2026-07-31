# MOB DISC — Analytics engine health = System OK pill style

**Date:** 2026-07-30  
**Status:** **APPLIED** via `ANALYTICS-ENGINE-HEALTH-PILL-V1` (2026-07-30)  
**Search:** FR Engine OK, ANPR Engine, header-system-health, healthPlain  
**Operator:** Plain text “FR Engine — OK” is all white / too big — hard to notice. Want the same **small green pill** look as header **System OK**.  
**Related:** `MOB-DISC-ANALYTICS-ENGINE-HEALTH-PILL-V1-APPLIED.md` · `MOB-DISC-ANALYTICS-ENGINE-HEALTH-PLAIN-V1-APPLIED.md` · `public/js/system-health-plain.js`

---

## Plain English

1. **Agreed.** Capability health should read as a **compact status badge**, not a large white hint line.  
2. Reference already in product: header `#header-system-health` — mint/green border + green text for OK; red for bad.  
3. Keep wording plain (**FR Engine — OK** / **ANPR Engine — OK**) — still **no** OSS engine names.  
4. Smaller type; pill outline so OK vs Not available is obvious at a glance.

---

## Reference (existing)

| Piece | Detail |
|-------|--------|
| Markup | `<span id="header-system-health" class="header-system-health ok">System OK</span>` |
| CSS | `.header-system-health` + `.ok` / `.bad` / `.warn` in `index.html` (font ~11px, padding, border-radius, green `#86efac`) |
| Paint | `system-health-plain.js` toggles `ok` / `bad` |

Reuse that visual language (shared class or twin CSS in `global.css` for Analytics).

---

## Desired operator look

| State | Badge text | Style |
|-------|------------|--------|
| Ready | **FR Engine — OK** / **ANPR Engine — OK** | Green pill (like System OK) |
| Down | **FR Engine — Not available** / **ANPR Engine — Not available** | Red/bad pill |
| Not licensed | **… — Not licensed** | Warn (amber) or bad — pick one in APPLY |
| Checking | **Checking…** | Neutral / muted (optional) |

Surfaces: `#ax-fr-sidecar-status` (Verify 1:1) · `#ax-anpr-status` (ANPR). Same badge treatment on both.

**Do not:** put OSS names in the badge · enlarge the Face live chrome · change header System OK behavior.

---

## Recommended MOB (one path)

### `ANALYTICS-ENGINE-HEALTH-PILL-V1`

| # | Change |
|---|--------|
| 1 | Style status nodes as compact pills (reuse `.header-system-health` classes or `ax-engine-health` twin in `global.css`) |
| 2 | On refresh: set text + class `ok` / `bad` / `warn` from health result |
| 3 | Font size ~11px (match header), not large hint body text |
| 4 | Cache-bust `analytics-hub.js` |

**Do not:** move badge onto Face unless separate APPLY `ANALYTICS-ENGINE-HEALTH-VISIBLE-ON-FACE-V1`.

---

## PASS / FAIL

| Check | PASS |
|-------|------|
| Verify 1:1 when FR up | Small green pill **FR Engine — OK** (noticeable, not plain white block) |
| ANPR when up | Same for **ANPR Engine — OK** |
| Down / not licensed | Red or amber pill — not white-only |
| Words | Still plain capability labels |

---

## Operator decide

When ready:

- **`MOB-APPLY ANALYTICS-ENGINE-HEALTH-PILL-V1`**

**No code in this disc.**

---

## Lock record

| Item | Decision |
|------|----------|
| Match System OK pill look | **Accepted** |
| Smaller than current hint line | **Accepted** |
| Not licensed | **Warn** (amber) |
| MOB | **`ANALYTICS-ENGINE-HEALTH-PILL-V1` APPLIED** — see APPLIED disc |
