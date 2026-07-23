# MOB DISC — Redacted Detail: no box-in-box, full line, spread links

**Status:** APPLIED 2026-07-22 — awaiting operator PASS/FAIL  
**APPLY:** `MOB-APPLY REDACTED-DETAIL-NO-CELL-BOX-SPREAD-V1`

---

## Understand (locked)

| Want | Not want |
|------|----------|
| Plain text links: **Download** …… **Open source** | Little bordered box hugging the text |
| Horizontal **rule line to the end** of the Detail column / row | Nested rectangle around each pair |
| More space between the two links | Tight `Download · Open source` jammed left |

Same actions as today — **Download** + **Open source** only. No Delete.

---

## Draw-out (what you should see)

### NOW (wrong — your screenshot)

```
┌─ Detail ──────────────────────────────────────┐  ← outer table wrap
│ ┌─────────────────┐                           │
│ │ Download · Open │                           │  ← CELL border = “box in a box”
│ │ source          │                           │
│ └─────────────────┘                           │
│ ┌─────────────────┐                           │
│ │ Download · Open │                           │
│ │ source          │                           │
│ └─────────────────┘                           │
│ …                                             │
└───────────────────────────────────────────────┘
```

### TARGET (this MOB)

```
┌─ Detail ──────────────────────────────────────┐
│ Detail                                        │
│───────────────────────────────────────────────│  ← one full-width line under header
│ Download                    Open source       │  ← no inner box; links spread
│───────────────────────────────────────────────│  ← line to the end
│ Download                    Open source       │
│───────────────────────────────────────────────│
│ Download                    Open source       │
│───────────────────────────────────────────────│
│ …                                             │
└───────────────────────────────────────────────┘
```

**Spread rule (locked):** in the Detail cell, `justify-content: space-between`  
→ **Download** left edge · **Open source** right edge. Drop the middle `·` if it fights the spread (or keep a faint mid separator only if it still looks clean — default **no ·**, just two ends).

**Line rule (locked):** Detail column uses **bottom border only** (hairline `#334155`), full cell width — **no** left/right/top box on that cell (and no mini card around the links).

---

## Why it still looks boxed after HUB-UI

Global evidence table CSS:

```css
.evidence-table th, .evidence-table td { border: 1px solid #334155; }
```

That draws a **full rectangle per cell**. Outer wrap also has a border → **box in a box**.  
Detail width was also capped (~168px), so the rectangle sits as a small left blob.

---

## Recommended MOB

**Name:** `REDACTED-DETAIL-NO-CELL-BOX-SPREAD-V1`

### In scope (CSS only — Redacted exports Detail)

1. `#ev-panel-redacted-exports td.ev-rx-actions` — **no full cell box**; only `border-bottom` full width.  
2. `.ev-rx-actions` — `display: flex; width: 100%; justify-content: space-between;`  
3. Widen Detail enough for spread (drop tight `max-width: 220px` / give column more share).  
4. Links stay underline blue; **not** ghost buttons; **not** Delete.

### Out of scope

- Case Files Delete  
- Load trace theme (already done)  
- Fit pins / VC / Chin video  

### Risk

**Low** — one panel CSS.

### PASS (one look)

| # | Pass |
|---|------|
| 1 | No small rectangle around each Download/Open source pair |
| 2 | Horizontal line runs **to the end** under each Detail row |
| 3 | Download left · Open source right (spread) |
| 4 | Both still clickable |

---

## APPLY phrase

**`MOB-APPLY REDACTED-DETAIL-NO-CELL-BOX-SPREAD-V1`**

Until then: disc only — this mockup is the contract. No more inventing alternate Detail chrome.
