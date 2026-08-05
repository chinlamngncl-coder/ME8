# MOB DISC — FR Watchlist form align + meta fonts + list scroll (2026-08-05)

**Status:** APPLIED `FR-WATCHLIST-FORM-ALIGN-META-FONT-V1` (2026-08-05).  
**Scope:** FR Watchlist chrome only. Live Watch / Verify / ANPR / engine unchanged.

## Confirm: I understand

Watchlist looks messy:

1. **Saved 10:11:24** and **1 / 5000 active** look like a different font than labels / buttons. If they need to stand out, **bold only** — same type and size.
2. **Notes (optional)** box does not line up — empty space to the right.
3. **Photo** row: no alignment — big / small / mid buttons side by side.
4. List (face / name / grade): will it **scroll** when long?

## Honest answers

### 1) Fonts

Those two strings use the generic `.hint` class. Buttons/labels use Inter. Hints look thinner / odd next to them.

**Fix:** same Inter, same size as toolbar text (~12px). **Bold** only. No new typeface.

### 2) Notes

Enroll row is wrap + fixed field widths (~200px). Notes is 280px and stops. Leftover gap to the right.

**Fix:** Notes grows to fill the rest of that row (label + box stretch east to the card edge). Other fields stay capped.

### 3) Photo

Photo file box + Crop & check + Add to watchlist + Add recent snapshots sit in the **same wrap** as the form fields. Heights differ (`btn-sm` vs `btn-action` vs tall file chrome).

**Fix:** Photo is its **own full-width row**. One line: file picker + three actions. Same height, same gap, vertical center. No other Watchlist logic change.

### 4) List scroll

Table sits in `.ax-bl-table-wrap` with `overflow: auto` inside the Watchlist panel (flex column). **Yes — long lists scroll inside that box**, header row stays sticky. Enroll + toolbar stay put.

MOB will also freeze enroll/toolbar so they do not eat the list height.

## One next APPLY

**`MOB-APPLY FR-WATCHLIST-FORM-ALIGN-META-FONT-V1`**

## Operator pass

Hard-refresh → FR → Watchlist.

- Saved time + 1/5000 = same Inter as the rest, just bold.
- Notes box reaches the right edge of that row.
- Photo row: one even line of controls.
- Add enough people that the list is long → scroll inside the table, not the whole Analytics page.
