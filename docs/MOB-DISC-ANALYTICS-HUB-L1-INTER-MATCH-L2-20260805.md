# MOB DISC — Hub L1 must use Inter like the old L2 tabs (2026-08-05)

**Status:** PASS `ANALYTICS-HUB-L1-INTER-MATCH-L2-V1` (operator 2026-08-05).  
**Scope:** Analytics hub tab type only (FR / ANPR / Weapons + Live / Snapshot / Offline Match / FR sub). No engine. Offline Matching... label stays.

## Confirm: I understand

Last font MOB went the **wrong way**. You do **not** want the fugly first-row face on the second row.

You want:

- **Same font as the old 2nd-row tabs** (Inter — the rest of Axiom)
- First row (FR / ANPR / Weapons) **a bit larger** is OK
- Not `system-ui` / Segoe on L1

## Why it looks wrong

Page UI font is **Inter** (`body` + `--font-ui`).

Old L2 tabs used `font-family: inherit` → Inter, 11px. That is the clean face.

L1 was forced to `system-ui !important` + letter-spacing. On Windows that is usually **Segoe UI**, not Inter. Looks chunky / almost serif next to Inter.

Last APPLY copied that Segoe stack onto L2. Wrong direction.

## Fix (one MOB)

1. Drop `system-ui` on L1 and L2.
2. Both rows: `font-family: inherit` / `var(--font-ui)` (Inter).
3. L2 back to **11px**, weight 400 (old 2nd row).
4. L1 same Inter, **13px**, weight 500 — a bit larger only. No extra letter-spacing.

ANPR Live / Snapshot / Offline Match / … and FR Live Watch / … both stay on that Inter 11px row.

## One next APPLY

**`MOB-APPLY ANALYTICS-HUB-L1-INTER-MATCH-L2-V1`**

## Operator pass

Hard-refresh Analytics (FR and ANPR).

- FR / ANPR / Weapons look like Inter, same family as Live / Snapshot / Offline Match.
- First row a bit larger, not a different typeface.
- No Segoe / fugly L1 face.
