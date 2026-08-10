# MOB DISC — SOS-OPS-STRIP-ACTIONS-V1 APPLY (2026-08-09)

**Status:** APPLIED.  
**APPLY:** `MOB-APPLY SOS-OPS-STRIP-ACTIONS-V1`

## Landed

| Item | Result |
|------|--------|
| Title | **SOS cases** (not Log) |
| Meta | **Updated {date/time}** only |
| Hint “Last 7 days” | Removed from face |
| Actions | 2-tab: **Open case** · **Clear strip** |
| CSV / Refresh / Open files | Removed from Ops strip |
| Chart | Unit+cap scale (1 alarm ≠ full tower) |
| List scroll | Grow with rows; **scroll after ~4** (`max-height: calc(4 * 52px)`) |
| Open case | Resolves `SO-` via `/api/ops-cases/by-sos/:id` → Evidence → Cases |

## Scroll disc

`MOB-DISC-SOS-OPS-STRIP-LIST-SCROLL-4-20260809.md` — already had scroll; now locked to ~4 rows.

## Note

Case-on-raise (`SOS-CASE-ON-RAISE-V1`) not in this APPLY — Open case works when case exists (after Ack today). Raise APPLY still next for empty-before-Ack Cases.

## Operator check

1. Restart / hard refresh Ops.  
2. Strip title SOS cases; only Updated line; two buttons.  
3. Chart: one Sunday SOS = short bar.  
4. 5+ rows → list scrolls inside box.  
5. Select row → Open case → Evidence Cases.
